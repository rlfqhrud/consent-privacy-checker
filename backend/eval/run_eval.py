"""정량 평가: 정확도 검증표 25종 × 10항목에 대해 LLM 판정과 정답을 비교한다 (13주차).

  cd backend
  python -m eval.run_eval                 # LLM 평가 (API 키 필요, 25회 호출 · 캐시된 샘플은 무료)
  python -m eval.run_eval --no-cache      # 캐시 무시하고 새로 호출
  python -m eval.run_eval --rules-only    # 비용 없이 규칙 기반(검증표 당시 시스템 판정)만 집계
  python -m eval.run_eval --fixture eval/heldout_samples.json   # 새 샘플(held-out)로 평가 → docs/eval/heldout_eval.*

결과: docs/eval/llm_eval.md, docs/eval/llm_eval.json
'미충족'을 양성(문제 탐지)으로 보고 항목별 정밀도·재현율도 계산한다.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FIXTURE = ROOT / "frontend" / "tests" / "fixtures" / "accuracy_samples.json"
OUT_DIR = ROOT / "docs" / "eval"

sys.path.insert(0, str(ROOT / "backend"))
from analysis.checks import CHECK_IDS  # noqa: E402


def score(samples, preds: dict[str, dict]) -> dict:
    matched = full = 0
    per_item = {i: {"tp": 0, "fp": 0, "fn": 0, "tn": 0} for i in CHECK_IDS}
    misses = []
    for s in samples:
        p = preds.get(s["id"])
        if p is None:
            continue
        wrong = [i for i in CHECK_IDS if p[i] != s["expected"][i]]
        matched += len(CHECK_IDS) - len(wrong)
        full += not wrong
        if wrong:
            misses.append({"id": s["id"], "items": wrong})
        for i in CHECK_IDS:
            pred_bad, true_bad = p[i] == 0, s["expected"][i] == 0
            key = "tp" if pred_bad and true_bad else "fp" if pred_bad else "fn" if true_bad else "tn"
            per_item[i][key] += 1
    n = len([s for s in samples if s["id"] in preds])

    def ratio(a, b):
        return round(a / b, 3) if b else None

    tp = sum(v["tp"] for v in per_item.values())
    fp = sum(v["fp"] for v in per_item.values())
    fn = sum(v["fn"] for v in per_item.values())
    return {
        "samples": n,
        "matchedItems": matched,
        "totalItems": n * len(CHECK_IDS),
        "accuracy": ratio(matched, n * len(CHECK_IDS)),
        "fullMatch": full,
        "precision": ratio(tp, tp + fp),
        "recall": ratio(tp, tp + fn),
        "perItem": {
            i: {**v, "precision": ratio(v["tp"], v["tp"] + v["fp"]), "recall": ratio(v["tp"], v["tp"] + v["fn"])}
            for i, v in per_item.items()
        },
        "misses": misses,
    }


def rules_predict(samples) -> dict[str, dict]:
    script = ROOT / "frontend" / "scripts" / "rules_predict.mjs"
    out = subprocess.run(["node", str(script)], input=json.dumps(samples, ensure_ascii=False),
                         capture_output=True, text=True, encoding="utf-8", check=True)
    return json.loads(out.stdout)


def fmt(name: str, r: dict) -> str:
    pct = f"{r['accuracy'] * 100:.1f}%" if r["accuracy"] is not None else "-"
    return (
        f"| {name} | {r['matchedItems']}/{r['totalItems']} = {pct} | {r['fullMatch']}/{r['samples']} | "
        f"{r['precision']} | {r['recall']} | {' '.join(m['id'] + '(' + ','.join(m['items']) + ')' for m in r['misses']) or '없음'} |"
    )


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-cache", action="store_true")
    ap.add_argument("--rules-only", action="store_true")
    ap.add_argument("--only", help="쉼표로 구분한 샘플 id만 평가 (예: R03,H08)")
    ap.add_argument("--fixture", help="평가셋 JSON 경로 (기본: 정확도 검증표 25종)")
    args = ap.parse_args()

    fixture = Path(args.fixture).resolve() if args.fixture else FIXTURE
    out_name = "llm_eval" if fixture == FIXTURE else fixture.stem.replace("_samples", "") + "_eval"
    samples = json.loads(fixture.read_text(encoding="utf-8"))
    if args.only:
        keep = set(args.only.split(","))
        samples = [s for s in samples if s["id"] in keep]

    if all("system" in s for s in samples):
        rule_preds, rule_name = {s["id"]: s["system"] for s in samples}, "규칙 기반 (검증표 당시 시스템)"
    else:  # 새 평가셋: 지금 규칙 분석기(mockAnalyzer.js)를 직접 돌린다
        rule_preds, rule_name = rules_predict(samples), "규칙 기반 (mockAnalyzer)"
    rules = score(samples, rule_preds)
    results = {"fixture": str(fixture.relative_to(ROOT)), "rules": rules, "rulesPreds": rule_preds}
    rows = [fmt(rule_name, rules)]

    if not args.rules_only:
        from api.main import _load_dotenv, BACKEND_DIR  # .env 읽기
        from analysis.llm_analyzer import MODEL, PROMPT_VERSION, LLMBadOutput, LLMUnavailable, analyze_llm

        _load_dotenv(BACKEND_DIR / ".env")
        preds, errors, details = {}, {}, {}
        t0 = time.time()
        for k, s in enumerate(samples, 1):
            try:
                r = analyze_llm(s["text"], use_cache=not args.no_cache)
                preds[s["id"]] = r["credits"]
                details[s["id"]] = {"credits": r["credits"], "details": r["details"], "cached": r.get("cached")}
                tag = "캐시" if r.get("cached") else "호출"
                print(f"[{k}/{len(samples)}] {s['id']} {tag}", flush=True)
            except LLMUnavailable as e:
                print(f"LLM 을 쓸 수 없어요: {e}", file=sys.stderr)
                return 2
            except LLMBadOutput as e:
                errors[s["id"]] = str(e)
                print(f"[{k}/{len(samples)}] {s['id']} 실패: {e}", flush=True)
        llm = score(samples, preds)
        llm.update({"model": MODEL, "promptVersion": PROMPT_VERSION, "errors": errors, "seconds": round(time.time() - t0, 1)})
        results["llm"] = llm
        results["llmDetails"] = details
        rows.append(fmt(f"LLM ({MODEL}, RAG)", llm))

    header = "| 방식 | 항목 일치 | 완전 일치 | 정밀도 | 재현율 | 불일치 |\n|---|---|---|---|---|---|"
    table = header + "\n" + "\n".join(rows)
    print("\n" + table)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / f"{out_name}.json").write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    md = [
        "# 정량 평가 결과",
        "",
        f"- 평가셋: {len(samples)}종 × 10항목 (`{results['fixture']}`)",
        "- 정밀도·재현율: '미충족'을 양성(문제 탐지)으로 계산",
        "- 정답은 직접 작성했고 전문가 검수는 거치지 않음",
        ("- 규칙·프롬프트 모두 이 샘플을 보고 고친 적이 없는 held-out 평가셋" if fixture != FIXTURE
         else "- 규칙 기반 수치와 프롬프트(v2)는 같은 샘플을 보고 고친 결과라 과대평가 가능성이 있음"),
        "",
        table,
        "",
    ]
    if "llm" in results:
        md += ["## 항목별 (LLM)", "", "| 항목 | TP | FP | FN | TN | 정밀도 | 재현율 |", "|---|---|---|---|---|---|---|"]
        for i, v in results["llm"]["perItem"].items():
            md.append(f"| {i} | {v['tp']} | {v['fp']} | {v['fn']} | {v['tn']} | {v['precision']} | {v['recall']} |")
    (OUT_DIR / f"{out_name}.md").write_text("\n".join(md) + "\n", encoding="utf-8")
    print(f"\n저장: {OUT_DIR / (out_name + '.md')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
