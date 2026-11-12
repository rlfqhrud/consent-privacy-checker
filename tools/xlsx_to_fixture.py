#!/usr/bin/env python3
"""
정확도 검증표(엑셀)를 회귀 테스트용 JSON으로 바꾼다.

사용법
  pip install openpyxl
  python tools/xlsx_to_fixture.py

검증표의 '항목별 비교' 시트(정답·시스템 판정)와 '샘플 원문' 시트를 읽어
frontend/tests/fixtures/accuracy_samples.json 에 저장한다.
검증표의 정답(파란 칸)을 고친 뒤 다시 실행하면 테스트 기준도 함께 바뀐다.
"""
import json
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "docs" / "정확도_검증표.xlsx"
OUT = ROOT / "frontend" / "tests" / "fixtures" / "accuracy_samples.json"
IDS = ["1a", "1b", "1c", "2a", "2b", "2c", "3a", "3b", "4a", "4b"]


def main() -> None:
    wb = openpyxl.load_workbook(SRC, data_only=True)
    texts = {r[1].value: r[2].value for r in wb["샘플 원문"].iter_rows(min_row=2) if r[1].value}
    samples = []
    for r in wb["항목별 비교"].iter_rows(min_row=2):
        name = r[1].value
        if not name:
            continue
        samples.append({
            "round": r[0].value,
            "id": name.split()[0],
            "name": name,
            "text": texts[name],
            "expected": {k: r[2 + i].value for i, k in enumerate(IDS)},
            "system": {k: r[12 + i].value for i, k in enumerate(IDS)},
        })
    OUT.write_text(json.dumps(samples, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(samples)}종 저장: {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
