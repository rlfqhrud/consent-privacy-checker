#!/usr/bin/env python3
"""
설문 폼 링크에서 개인정보 수집·이용 동의 문구를 뽑아 주는 명령줄 도구.
화면의 URL 탭과 같은 코드(backend/crawl/extractor.py)를 쓴다.

사용법
  pip install playwright
  playwright install chromium
  python tools/extract_consent.py "https://form.naver.com/response/..."          # 화면에 출력
  python tools/extract_consent.py "https://naver.me/xxxx" --out consent.txt      # 파일로 저장

로그인이 필요한 폼, 비공개 폼은 읽을 수 없습니다. 결과를 눈으로 확인하세요.
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from crawl.extractor import ExtractError, extract_consent  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser(description="설문 폼 링크에서 개인정보 동의 문구 추출")
    ap.add_argument("url")
    ap.add_argument("--out", help="결과를 저장할 파일 경로")
    ap.add_argument("--timeout", type=int, default=20000, help="페이지 로딩 제한(ms)")
    args = ap.parse_args()

    try:
        block = extract_consent(args.url, args.timeout, check_url=False)
    except ExtractError as e:
        print(f"[오류] {e}", file=sys.stderr)
        return 1

    if args.out:
        Path(args.out).write_text(block + "\n", encoding="utf-8")
        print(f"저장했어요: {args.out}")
    print(block)
    return 0


if __name__ == "__main__":
    sys.exit(main())
