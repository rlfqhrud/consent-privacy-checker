"""설문 폼 링크에서 개인정보 수집·이용 동의 문구를 뽑는다.

네이버폼·구글폼은 자바스크립트로 화면을 그리므로 헤드리스 브라우저(Playwright)로 열어
화면에 보이는 글자(innerText)를 읽은 뒤, '개인정보 … 동의' 근처 줄만 잘라낸다.
로그인이 필요한 폼, 비공개 폼은 읽을 수 없다.
"""
from __future__ import annotations

import ipaddress
import re
import socket
from urllib.parse import urlparse

START = re.compile(r"개인정보.*(?:수집|이용|동의)|(?:수집|이용).*개인정보|Personal\s+(?:Information|data)", re.I)
RELEVANT = re.compile(r"수집|보유|이용|목적|항목|기간|동의|거부|불이익|제한|파기|제공|Purpose|Retention|Items", re.I)
MAX_WINDOW = 40


class ExtractError(Exception):
    def __init__(self, message: str, status: int = 422):
        super().__init__(message)
        self.status = status


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
    # (라디오 버튼이 한 줄에 붙어 "동의합니다동의하지 않습니다"로 읽히는 경우 포함)
    block = [ln for ln in block if not re.fullmatch(r"(?:(?:동의함|동의합니다|동의하지\s*않(?:음|습니다))\.?\s*)+", ln)]
    return "\n".join(block)


def check_public_url(url: str) -> None:
    """서버가 대신 여는 주소이므로 내부망(localhost, 사설 IP 등)은 막는다 (SSRF 방지)."""
    p = urlparse(url)
    if p.scheme not in ("http", "https") or not p.hostname:
        raise ExtractError("http:// 또는 https:// 로 시작하는 주소만 읽을 수 있어요", 400)
    try:
        infos = socket.getaddrinfo(p.hostname, p.port or (443 if p.scheme == "https" else 80))
    except socket.gaierror as e:
        raise ExtractError("주소를 찾을 수 없어요. 링크를 다시 확인해 주세요", 400) from e
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
            raise ExtractError("내부망 주소는 읽을 수 없어요", 400)


def playwright_available() -> bool:
    try:
        import playwright.sync_api  # noqa: F401
    except ImportError:
        return False
    return True


def fetch_visible_text(url: str, timeout_ms: int = 20000) -> str:
    from playwright.sync_api import Error as PWError
    from playwright.sync_api import sync_playwright

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            try:
                page = browser.new_page(viewport={"width": 1280, "height": 1800})
                page.goto(url, wait_until="networkidle", timeout=timeout_ms)
                page.wait_for_timeout(800)  # 늦게 그려지는 문항 대비
                return page.evaluate("document.body.innerText")
            finally:
                browser.close()
    except PWError as e:
        if "Executable doesn't exist" in str(e):
            raise ExtractError("서버에 링크 읽기용 브라우저가 설치되지 않았어요 (playwright install chromium)", 501) from e
        raise ExtractError("폼 페이지를 열지 못했어요 (시간 초과 또는 접속 실패)", 502) from e


def extract_consent(url: str, timeout_ms: int = 20000, check_url: bool = True) -> str:
    if not playwright_available():
        raise ExtractError("서버에 링크 읽기 기능(Playwright)이 설치되어 있지 않아요", 501)
    if check_url:
        check_public_url(url)
    block = find_consent_block(fetch_visible_text(url, timeout_ms))
    if not block:
        raise ExtractError("폼에서 개인정보 동의 문구를 찾지 못했어요. 로그인이 필요한 폼이거나 동의 문항이 없는지 확인해 주세요", 422)
    return block
