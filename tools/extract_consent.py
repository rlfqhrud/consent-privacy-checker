#!/usr/bin/env python3
"""
설문 폼 링크에서 개인정보 수집·이용 동의 문구를 뽑아 주는 스크립트.

사용법
  pip install playwright
  playwright install chromium
  python extract_consent.py "https://form.naver.com/response/..."          # 화면에 출력
  python extract_consent.py "https://naver.me/xxxx" --out consent.txt      # 파일로 저장

출력된 문구를 결과 화면의 '텍스트 붙여넣기' 탭에 넣으면 분석됩니다.

주의
  - 브라우저로 폼을 직접 열어(자바스크립트 실행 후) 화면에 보이는 글자를 읽습니다.
  - 로그인이 필요한 폼, 비공개 폼은 읽을 수 없습니다.
  - 폼 화면 구조에 의존하지 않고 '개인정보 ... 동의' 근처 글자를 찾는 방식이라,
    동의 문항이 여러 개이거나 문구가 특이하면 일부가 빠질 수 있습니다. 결과를 눈으로 확인하세요.
"""
import argparse
import re
import sys

START = re.compile(r"개인정보.*(?:수집|이용|동의)|(?:수집|이용).*개인정보")
RELEVANT = re.compile(r"수집|보유|이용|목적|항목|기간|동의|거부|불이익|제한|파기|제공|Purpose|Retention|Items", re.I)
MAX_WINDOW = 40


def find_consent_block(text: str) -> str:
    """화면 전체 글자에서 동의 문구 블록만 잘라낸다."""
    lines = [ln.strip() for ln in text.splitlines()]
    lines = [ln for ln in lines if ln]
    start = next((i for i, ln in enumerate(lines) if START.search(ln)), None)
    if start is None:
        return ""
    last = start
    for j in range(start, min(len(lines), start + MAX_WINDOW)):
        if RELEVANT.search(lines[j]):
            last = j
        elif j - last > 3:  # 관련 없는 줄이 연속되면 블록 끝
            break
    block = lines[start : last + 1]
    # 선택지(동의합니다/동의하지 않습니다)는 분석에 필요 없으므로 제거
    block = [ln for ln in block if not re.fullmatch(r"동의합니다\.?|동의하지\s*않습니다\.?", ln)]
    return "\n".join(block)


def fetch_visible_text(url: str, timeout_ms: int = 20000) -> str:
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1280, "height": 1800})
        page.goto(url, wait_until="networkidle", timeout=timeout_ms)
        page.wait_for_timeout(800)  # 늦게 그려지는 문항 대비
        text = page.evaluate("document.body.innerText")
        browser.close()
    return text


def main() -> int:
    ap = argparse.ArgumentParser(description="설문 폼 링크에서 개인정보 동의 문구 추출")
    ap.add_argument("url")
    ap.add_argument("--out", help="결과를 저장할 파일 경로")
    ap.add_argument("--timeout", type=int, default=20000, help="페이지 로딩 제한(ms)")
    args = ap.parse_args()

    try:
        text = fetch_visible_text(args.url, args.timeout)
    except Exception as e:  # 접속 실패, 시간 초과 등
        print(f"[오류] 폼을 열지 못했어요: {e}", file=sys.stderr)
        return 2

    block = find_consent_block(text)
    if not block:
        print("[알림] 동의 문구를 찾지 못했어요. 폼에 개인정보 동의 문항이 있는지, 로그인이 필요한 폼은 아닌지 확인하세요.", file=sys.stderr)
        return 1

    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(block + "\n")
        print(f"저장했어요: {args.out}")
    print(block)
    return 0


if __name__ == "__main__":
    sys.exit(main())
