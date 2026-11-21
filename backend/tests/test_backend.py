"""백엔드 테스트 — API 키 없이 돈 안 드는 범위만 (모델 호출은 가짜로 바꿔 끼움)."""
import json
import re
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from analysis import llm_analyzer
from analysis.checks import CHECK_IDS, CHECKS
from crawl.extractor import ExtractError, check_public_url, find_consent_block
from rag.retriever import get_retriever, retrieve_for_checks

ROOT = Path(__file__).resolve().parents[2]


# ------------------------------------------------------------ 점검 항목 동기화
def test_check_ids_match_frontend():
    js = (ROOT / "frontend" / "src" / "lib" / "checks.js").read_text(encoding="utf-8")
    assert re.findall(r"id: '(\w+)'", js) == CHECK_IDS


# ------------------------------------------------------------ RAG 검색
@pytest.mark.parametrize(
    "query, expected",
    [
        ("주민등록번호 수집", "PIPA-24-2"),
        ("건강 병력 민감정보 별도 동의", "PIPA-23-1"),
        ("동의하지 않으면 참여할 수 없습니다 강제 동의", "PIPA-22-5"),
        ("보유기간 필요시까지 파기 시점", "PIPC-GUIDE-PERIOD"),
        ("수집 목적 마케팅 서비스 개선 모호", "PIPC-GUIDE-PURPOSE"),
    ],
)
def test_retriever_top3(query, expected):
    ids = [a.id for a, _ in get_retriever().search(query, k=3)]
    assert expected in ids, ids


def test_retrieve_for_checks_covers_core_articles():
    ids = {a.id for a in retrieve_for_checks(CHECKS, "수집 목적: 설문 보상\n수집 항목: 이름, 연락처")}
    assert {"PIPA-15-2", "PIPA-16-1", "PIPA-23-1", "PIPA-22-5"} <= ids


# ------------------------------------------------------------ LLM 분석 (가짜 모델)
def fake_output(failed=("2b", "2c"), cards=None):
    return json.dumps(
        {
            "fields": {"purpose": "기프티콘 보상", "items": "이름, 휴대폰 전화번호 등", "period": "필요시까지"},
            "checks": [{"id": i, "passed": i not in failed, "evidence": "", "reason": "r"} for i in CHECK_IDS],
            "cards": cards
            if cards is not None
            else [
                {"check_ids": ["2b"], "title": "수집 항목 표현 모호", "original": "수집 항목: 이름, 휴대폰 전화번호 등",
                 "problem": "p", "suggestion": "수집 항목: 이름, 휴대폰 전화번호", "legal": "", "article_ids": ["PIPA-15-2"]},
                {"check_ids": ["2c"], "title": "보유기간 표현 모호", "original": "보유 및 이용 기간: 필요시까지",
                 "problem": "p", "suggestion": "6개월 후 파기", "legal": "제15조제2항", "article_ids": []},
                {"check_ids": ["1a"], "title": "충족 항목 카드(버려져야 함)", "original": "", "problem": "", "suggestion": "",
                 "legal": "", "article_ids": []},
            ],
        },
        ensure_ascii=False,
    )


@pytest.fixture
def llm(monkeypatch, tmp_path):
    monkeypatch.setenv("OPENAI_API_KEY", "test")
    monkeypatch.setattr(llm_analyzer, "CACHE_PATH", tmp_path / "cache.json")
    calls = []

    def install(output):
        def fake(system, user):
            calls.append(user)
            return output

        monkeypatch.setattr(llm_analyzer, "_call_model", fake)
        return calls

    return install


def test_analyze_llm_shape_and_card_filter(llm):
    llm(fake_output())
    r = llm_analyzer.analyze_llm("수집 목적: 기프티콘 보상\n수집 항목: 이름 등")
    assert r["engine"] == "llm"
    assert r["credits"]["2b"] == 0 and r["credits"]["1a"] == 1
    assert [c["title"] for c in r["cards"]] == ["수집 항목 표현 모호", "보유기간 표현 모호"]
    # legal 이 비어 있으면 인용한 조항으로 채운다
    assert "제15조제2항" in r["cards"][0]["legal"]
    assert r["sources"]


def test_analyze_llm_uses_cache(llm):
    calls = llm(fake_output())
    text = "수집 목적: 기프티콘 보상 테스트"
    assert llm_analyzer.analyze_llm(text)["cached"] is False
    assert llm_analyzer.analyze_llm(text)["cached"] is True
    assert len(calls) == 1


def test_dependent_items_forced_to_fail(llm):
    # 모델이 1b 미충족인데 2b 충족이라고 해도 2b 는 미충족이 된다
    llm(fake_output(failed=("1b",), cards=[{"check_ids": ["1b"], "title": "수집 항목 누락", "original": "(수집 항목이 기재되지 않음)",
        "problem": "p", "suggestion": "s", "legal": "l", "article_ids": []}]))
    assert llm_analyzer.analyze_llm("수집 목적: 경품 발송입니다")["credits"]["2b"] == 0


def test_missing_checks_is_bad_output(llm):
    llm(json.dumps({"fields": {"purpose": "", "items": "", "period": ""}, "checks": [], "cards": []}))
    with pytest.raises(llm_analyzer.LLMBadOutput):
        llm_analyzer.analyze_llm("수집 목적: 경품 발송입니다")


def test_no_key_is_unavailable(monkeypatch, tmp_path):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.setattr(llm_analyzer, "CACHE_PATH", tmp_path / "cache.json")
    with pytest.raises(llm_analyzer.LLMUnavailable):
        llm_analyzer.analyze_llm("수집 목적: 경품 발송입니다")


# ------------------------------------------------------------ API
@pytest.fixture
def client():
    from api.main import app

    return TestClient(app)


def test_health(client):
    body = client.get("/api/health").json()
    assert body["ok"] is True and "llm" in body and "extract" in body


def test_analyze_endpoint(client, llm):
    llm(fake_output())
    r = client.post("/api/analyze", json={"text": "수집 목적: 기프티콘 보상\n수집 항목: 이름 등"})
    assert r.status_code == 200
    assert set(r.json()["credits"]) == set(CHECK_IDS)


def test_analyze_endpoint_without_key_returns_503(client, monkeypatch, tmp_path):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.setattr(llm_analyzer, "CACHE_PATH", tmp_path / "cache.json")
    r = client.post("/api/analyze", json={"text": "수집 목적: 경품 발송입니다"})
    assert r.status_code == 503
    assert r.json()["detail"]["code"] == "llm_unavailable"


def test_analyze_endpoint_validates_length(client):
    assert client.post("/api/analyze", json={"text": "짧음"}).status_code == 422


def test_extract_blocks_internal_urls(client):
    r = client.post("/api/extract", json={"url": "http://127.0.0.1:8000/"})
    assert r.status_code in (400, 501)


# ------------------------------------------------------------ 링크 추출
def test_find_consent_block():
    page = "\n".join([
        "동아리 신입생 설문", "이름을 적어주세요", "",
        "개인정보 수집 및 이용 동의", "수집 목적: 신입생 연락", "수집 항목: 이름, 연락처",
        "보유 기간: 모집 종료 후 1개월", "동의합니다", "동의하지 않습니다",
        "다음", "제출", "Powered by form", "문의",
    ])
    block = find_consent_block(page)
    assert block.startswith("개인정보 수집 및 이용 동의")
    assert "보유 기간: 모집 종료 후 1개월" in block
    assert "동의합니다" not in block and "제출" not in block


def test_find_consent_block_strips_inline_choices():
    block = find_consent_block("개인정보 수집 동의\n수집 목적: 연락\n동의합니다동의하지 않습니다\n보유 기간: 1개월")
    assert "동의합니다" not in block and "보유 기간: 1개월" in block


def test_find_consent_block_none():
    assert find_consent_block("오늘의 메뉴\n김치찌개") == ""


@pytest.mark.parametrize("url", ["ftp://example.com", "http://localhost/", "http://10.0.0.1/"])
def test_check_public_url_rejects(url):
    with pytest.raises(ExtractError):
        check_public_url(url)
