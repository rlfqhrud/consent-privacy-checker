"""프론트엔드 연동 API (FastAPI).

실행:  cd backend && uvicorn api.main:app --reload --port 8000
명세:  docs/API.md, 또는 서버 실행 후 http://localhost:8000/docs
"""
from __future__ import annotations

import logging
import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from analysis.llm_analyzer import MODEL, LLMBadOutput, LLMUnavailable, analyze_llm, llm_configured
from crawl.extractor import ExtractError, extract_consent, playwright_available


def _load_dotenv(path: Path) -> None:
    """backend/.env 의 KEY=VALUE 를 환경변수로 (이미 설정된 값은 덮어쓰지 않음)."""
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


BACKEND_DIR = Path(__file__).resolve().parents[1]
_load_dotenv(BACKEND_DIR / ".env")

log = logging.getLogger("consent")
app = FastAPI(title="동의서 컴플라이언스 체커 API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=10, max_length=20000, description="동의서 문구")


class ExtractRequest(BaseModel):
    url: str = Field(..., min_length=8, max_length=2000)


@app.get("/api/health")
def health():
    return {"ok": True, "llm": llm_configured(), "model": MODEL, "extract": playwright_available()}


@app.post("/api/analyze")
def analyze(req: AnalyzeRequest):
    # 동의서 원문은 개인정보가 섞일 수 있어 로그에 남기지 않는다 (길이만 기록)
    log.info("analyze request: %d chars", len(req.text))
    try:
        return analyze_llm(req.text)
    except LLMUnavailable as e:
        raise HTTPException(503, detail={"code": "llm_unavailable", "message": str(e)})
    except LLMBadOutput as e:
        raise HTTPException(502, detail={"code": "llm_bad_output", "message": str(e)})
    except ValueError as e:
        raise HTTPException(413, detail={"code": "too_long", "message": str(e)})


@app.post("/api/extract")
def extract(req: ExtractRequest):
    try:
        return {"text": extract_consent(req.url.strip())}
    except ExtractError as e:
        raise HTTPException(e.status, detail={"code": "extract_failed", "message": str(e)})


# 빌드된 프론트엔드가 있으면 같은 서버에서 제공 (npm run build 후 서버 하나로 시연 가능)
DIST = BACKEND_DIR.parent / "frontend" / "dist"
if DIST.exists():
    app.mount("/", StaticFiles(directory=DIST, html=True), name="frontend")
