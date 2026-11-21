# API 명세 (backend/api/main.py)

기본 주소: `http://localhost:8000` · 서버 실행 후 `/docs`에서 직접 호출해 볼 수 있습니다(FastAPI 자동 문서).
모든 요청·응답은 UTF-8 JSON입니다. 오류 응답은 `{"detail": {"code": "...", "message": "사용자에게 보여줄 문구"}}` 형식입니다.

## GET /api/health

서버 상태와 사용할 수 있는 기능.

```json
{ "ok": true, "llm": true, "model": "gpt-5.5", "extract": true }
```

| 필드 | 뜻 |
|---|---|
| `llm` | API 키가 설정되어 AI 분석을 쓸 수 있는지 |
| `extract` | 링크 읽기(Playwright)가 설치되어 있는지 |

## POST /api/analyze

동의서 문구를 AI(OpenAI GPT)로 분석합니다. 법령 지식베이스에서 관련 조항을 검색(RAG)해 프롬프트에 넣고, JSON 스키마로 결과를 받습니다.

요청

```json
{ "text": "수집 목적: 설문조사 응답자 기프티콘 보상\n수집 항목: 이름, 휴대폰 전화번호 등\n보유 및 이용 기간: 필요시까지" }
```

- `text`: 10자 이상 20,000자 이하

응답 200

```json
{
  "credits": { "1a": 1, "1b": 1, "1c": 1, "2a": 1, "2b": 0, "2c": 0, "3a": 1, "3b": 1, "4a": 1, "4b": 1 },
  "cards": [
    {
      "title": "수집 항목 표현 모호",
      "original": "수집 항목: 이름, 휴대폰 전화번호 등",
      "problem": "…",
      "suggestion": "수집 항목: 이름, 휴대폰 전화번호",
      "legal": "개인정보 보호법 제15조제2항 …",
      "checkIds": ["2b"]
    }
  ],
  "details": { "2b": { "evidence": "이름, 휴대폰 전화번호 등", "reason": "…" } },
  "fields": { "purpose": "…", "items": "…", "period": "…" },
  "sources": [{ "id": "PIPA-15-2", "citation": "개인정보 보호법 제15조제2항(동의를 받을 때 알려야 할 사항)" }],
  "engine": "llm",
  "model": "gpt-5.5",
  "promptVersion": "2026-11-18.2",
  "cached": false
}
```

- `credits`·`cards`는 프론트엔드 규칙 분석기(`mockAnalyzer.analyze`)와 같은 형식이라 화면을 그대로 씁니다.
- 같은 문구(같은 모델·프롬프트 버전)는 `backend/.cache/analysis.json`에 저장된 결과를 돌려줍니다(`cached: true`). 점수가 매번 바뀌지 않게 하기 위함입니다.

오류

| 상태 | code | 상황 | 화면 동작 |
|---|---|---|---|
| 422 | (FastAPI) | 10자 미만 등 입력 형식 오류 | 규칙 기반으로 대체 |
| 413 | `too_long` | 20,000자 초과 | 오류 문구 표시 |
| 502 | `llm_bad_output` | 모델 응답이 검증을 통과하지 못함 | 규칙 기반으로 대체 |
| 503 | `llm_unavailable` | API 키 없음, 인증·요금·연결 오류 | 규칙 기반으로 대체 |

## POST /api/extract

폼 링크를 헤드리스 브라우저로 열어 개인정보 동의 문구만 잘라 옵니다.

요청 `{ "url": "https://form.naver.com/response/..." }` → 응답 200 `{ "text": "개인정보 수집 및 이용 동의\n수집 목적: …" }`

| 상태 | 상황 |
|---|---|
| 400 | http(s)가 아닌 주소, 찾을 수 없는 주소, 내부망 주소(localhost·사설 IP — SSRF 방지) |
| 422 | 페이지에 개인정보 동의 문구가 없음 (로그인 필요 폼 포함) |
| 501 | 서버에 Playwright 또는 브라우저가 설치되지 않음 |
| 502 | 시간 초과·접속 실패 |

화면은 실패하면 가짜 결과를 보여주지 않고, 이유와 함께 "텍스트로 붙여넣기" 안내를 띄웁니다.
