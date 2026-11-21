"""LLM(OpenAI GPT) 기반 동의서 분석 모듈.

흐름: 법령 검색(RAG) → 프롬프트 구성 → GPT 구조화 출력(JSON 스키마) → 검증·정리 → 캐시
반환 형식은 프론트엔드 mockAnalyzer.analyze() 와 같다: { credits, cards } (+ 부가 정보)
"""
from __future__ import annotations

import hashlib
import json
import os
import threading
from pathlib import Path

import openai

from rag.retriever import retrieve_for_checks

from .checks import CHECKS, CHECK_IDS
from .prompt import OUTPUT_SCHEMA, PROMPT_VERSION, SYSTEM_PROMPT, build_user_message

MODEL = os.environ.get("CONSENT_LLM_MODEL", "gpt-5.5")
EFFORT = os.environ.get("CONSENT_LLM_EFFORT", "low")  # 추론 강도 (minimal/low/medium/high, 빈 값이면 보내지 않음)
MAX_TEXT_CHARS = 20000
CACHE_PATH = Path(os.environ.get("CONSENT_CACHE_PATH", Path(__file__).resolve().parents[1] / ".cache" / "analysis.json"))


class LLMUnavailable(Exception):
    """API 키가 없거나 호출이 실패해 LLM 분석을 할 수 없음 (프론트엔드는 규칙 기반으로 대체)."""


class LLMBadOutput(Exception):
    """모델 응답이 스키마·검증을 통과하지 못함."""


def llm_configured() -> bool:
    return bool(os.environ.get("OPENAI_API_KEY"))


# ---------------------------------------------------------------- 캐시
# 같은 문구 → 같은 결과 (6주차 "재현 가능" 원칙). 모델·프롬프트 버전이 바뀌면 키가 달라진다.
_cache_lock = threading.Lock()


def _cache_key(text: str) -> str:
    return hashlib.sha256(f"{MODEL}|{EFFORT}|{PROMPT_VERSION}|{text}".encode("utf-8")).hexdigest()


def _cache_load() -> dict:
    try:
        return json.loads(CACHE_PATH.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def _cache_get(key: str):
    with _cache_lock:
        return _cache_load().get(key)


def _cache_put(key: str, value: dict) -> None:
    with _cache_lock:
        data = _cache_load()
        data[key] = value
        CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
        CACHE_PATH.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")


# ---------------------------------------------------------------- 호출
_client: openai.OpenAI | None = None


def _get_client() -> openai.OpenAI:
    global _client
    if _client is None:
        _client = openai.OpenAI(timeout=120.0, max_retries=2)
    return _client


def _call_model(system: str, user: str) -> str:
    """OpenAI 모델을 호출해 JSON 문자열을 돌려준다. 테스트에서는 이 함수를 바꿔 끼운다."""
    kwargs = dict(
        model=MODEL,
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
        # 구조화 출력: 응답이 OUTPUT_SCHEMA 를 반드시 따르게 한다
        response_format={
            "type": "json_schema",
            "json_schema": {"name": "consent_review", "strict": True, "schema": OUTPUT_SCHEMA},
        },
    )
    if EFFORT:
        kwargs["reasoning_effort"] = EFFORT  # 추론 모델(gpt-5 계열)만. 다른 모델이면 .env 에서 비워 둔다
    try:
        resp = _get_client().chat.completions.create(**kwargs)
    except openai.AuthenticationError as e:
        raise LLMUnavailable("API 키가 올바르지 않아요") from e
    except openai.PermissionDeniedError as e:
        raise LLMUnavailable("API 키에 이 모델 사용 권한이 없어요") from e
    except openai.RateLimitError as e:
        raise LLMUnavailable("요청이 많거나 API 사용 한도를 넘었어요") from e
    except openai.APIStatusError as e:
        raise LLMUnavailable(f"AI 분석 서버 오류 ({e.status_code})") from e
    except openai.APIConnectionError as e:
        raise LLMUnavailable("AI 분석 서버에 연결하지 못했어요") from e

    choice = resp.choices[0]
    if getattr(choice.message, "refusal", None):
        raise LLMBadOutput("모델이 이 요청에 답하지 않았어요")
    if choice.finish_reason == "length":
        raise LLMBadOutput("응답이 길어 중간에 잘렸어요")
    if not choice.message.content:
        raise LLMBadOutput("응답에 결과가 없어요")
    return choice.message.content


# ---------------------------------------------------------------- 검증·정리
def _normalize(raw: dict, articles) -> dict:
    by_id = {c["id"]: c for c in raw.get("checks", []) if c.get("id") in CHECK_IDS}
    missing = [i for i in CHECK_IDS if i not in by_id]
    if missing:
        raise LLMBadOutput(f"점검 항목 누락: {', '.join(missing)}")

    credits = {i: 1 if by_id[i]["passed"] else 0 for i in CHECK_IDS}

    # 논리적으로 불가능한 조합은 규칙으로 바로잡는다 (목적이 없는데 목적 표현이 충족일 수는 없음)
    for need, dep in (("1a", "2a"), ("1b", "2b"), ("1c", "2c")):
        if credits[need] == 0:
            credits[dep] = 0

    known = {a.id: a for a in articles}
    failed = {i for i, v in credits.items() if v == 0}
    cards = []
    for c in raw.get("cards", []):
        ids = [i for i in c.get("check_ids", []) if i in CHECK_IDS]
        if ids and not (set(ids) & failed):
            continue  # 충족한 항목에 대한 카드는 버린다
        cited = [known[a] for a in c.get("article_ids", []) if a in known]
        legal = c.get("legal", "").strip() or "; ".join(a.citation for a in cited)
        cards.append(
            {
                "title": c["title"].strip(),
                "original": c["original"].strip(),
                "problem": c["problem"].strip(),
                "suggestion": c["suggestion"].strip(),
                "legal": legal,
                "checkIds": ids,
            }
        )
    if failed and not cards:
        raise LLMBadOutput("미충족 항목이 있는데 수정 제안이 없어요")

    details = {
        i: {"evidence": by_id[i].get("evidence", "").strip(), "reason": by_id[i].get("reason", "").strip()}
        for i in CHECK_IDS
    }
    return {
        "credits": credits,
        "cards": cards,
        "details": details,
        "fields": raw.get("fields", {}),
        "sources": [{"id": a.id, "citation": a.citation} for a in articles],
    }


def analyze_llm(text: str, use_cache: bool = True) -> dict:
    text = (text or "").strip()
    if len(text) > MAX_TEXT_CHARS:
        raise ValueError(f"동의서가 너무 길어요 ({len(text)}자). {MAX_TEXT_CHARS}자 이하로 나눠서 넣어 주세요.")

    key = _cache_key(text)
    if use_cache and (hit := _cache_get(key)):
        return {**hit, "cached": True}

    if not llm_configured():
        raise LLMUnavailable("OPENAI_API_KEY 가 설정되지 않았어요")

    articles = retrieve_for_checks(CHECKS, text)
    raw_text = _call_model(SYSTEM_PROMPT, build_user_message(text, articles))
    try:
        raw = json.loads(raw_text)
    except json.JSONDecodeError as e:
        raise LLMBadOutput("응답 JSON 을 읽지 못했어요") from e

    result = {**_normalize(raw, articles), "engine": "llm", "model": MODEL, "promptVersion": PROMPT_VERSION}
    _cache_put(key, result)
    return {**result, "cached": False}
