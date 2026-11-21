# LLM 기반 설문 동의서 개인정보 컴플라이언스 체커

설문·연구 동의서 문구(또는 폼 링크)를 넣으면 개인정보 보호법 기준으로 점검 항목 10개의 충족/미충족, 항목 충족률, 문제 조항 원문과 수정 제안, 법적 근거를 보여주는 웹앱입니다.

```
[입력: 텍스트 / 폼 링크]
        │  (링크면) POST /api/extract ── Playwright로 폼을 열어 동의 문구만 추출
        ▼
POST /api/analyze ── 법령 지식베이스 검색(RAG) → GPT 판정(JSON 스키마) → 검증 → 캐시
        │  실패(API 키 없음·연결 오류 등)
        └──────────────▶ 프론트엔드 규칙 기반 분석기로 대체 (화면에 "규칙 기반 분석" 표시)
        ▼
[결과: 항목 충족률 · 10개 항목 · 수정 제안 카드 · 참고한 법 조항]
```

## 실행 방법

Node.js 20 이상, Python 3.10 이상이 필요합니다.

### 1) 백엔드 (FastAPI)

```bash
cd backend
pip install -r requirements.txt
playwright install chromium          # 링크 자동 읽기용 브라우저 (처음 한 번)
copy .env.example .env               # macOS/Linux: cp .env.example .env
# .env 의 OPENAI_API_KEY= 뒤에 키를 넣는다
uvicorn api.main:app --reload --port 8000
```

- API 키가 없어도 서버는 뜹니다. 이때 화면은 자동으로 규칙 기반 분석을 씁니다.
- 명세: [docs/API.md](docs/API.md), 서버 실행 후 http://localhost:8000/docs

### 2) 프론트엔드 (React + Vite)

```bash
cd frontend
npm install       # 처음 한 번
npm run dev       # http://localhost:5173  (/api 요청은 8000번 백엔드로 프록시)
```

### 시연용: 서버 하나로 실행

```bash
cd frontend && npm run build
cd ../backend && uvicorn api.main:app --port 8000
# http://localhost:8000 에서 화면과 API를 함께 제공
```

> Windows에서 `Cannot find native binding` 오류가 나면 `node_modules`와 `package-lock.json`을 지우고 `npm install`을 다시 실행하세요.

### 테스트

```bash
cd frontend && npm test        # 화면·규칙 분석기 회귀(검증표 25종)·API 연동 로직
cd backend  && pytest          # RAG 검색·LLM 응답 검증·캐시·API·링크 추출 (API 키 불필요, 모델은 가짜로 대체)
```

## 폴더 구조

```
생성형/
├─ docs/
│  ├─ Main.dc.html                 # 6주차 단일 파일 데모 (원본, 수정하지 않음)
│  ├─ 생성형AI캡스톤_주차별보고서_길보경.docx
│  ├─ 정확도_검증표.xlsx            # 샘플 25종 · 항목별 정답
│  ├─ API.md                       # API 명세
│  └─ eval/llm_eval.md, .json      # 정량 평가 결과 (python -m eval.run_eval)
├─ backend/                        # 9~13주차
│  ├─ api/main.py                  # FastAPI: /api/health, /api/analyze, /api/extract (+ 빌드된 화면 제공)
│  ├─ rag/
│  │  ├─ law_articles.json         # 법령 지식베이스: 개인정보 보호법 조항·PIPC 안내서 요지 15개
│  │  └─ retriever.py              # 글자 2-gram TF-IDF 검색 (외부 벡터DB 없이)
│  ├─ analysis/
│  │  ├─ checks.py                 # 점검 항목 10개 (frontend/src/lib/checks.js 와 동일, 테스트로 동기화 확인)
│  │  ├─ prompt.py                 # 시스템 프롬프트 · 출력 JSON 스키마 · PROMPT_VERSION
│  │  └─ llm_analyzer.py           # OpenAI 호출 · 응답 검증 · 결과 캐시
│  ├─ crawl/extractor.py           # 폼 링크 → 동의 문구 (Playwright, 내부망 주소 차단)
│  ├─ eval/run_eval.py             # 검증표 25종으로 LLM vs 규칙 정확도·정밀도·재현율
│  ├─ tests/test_backend.py
│  ├─ requirements.txt, .env.example, pytest.ini
├─ frontend/
│  ├─ src/
│  │  ├─ App.jsx                   # 입력 → (링크 읽기) → 분석 중 → 결과
│  │  ├─ pages/                    # InputPage, LoadingPage, ResultPage
│  │  ├─ components/               # ScoreCard, Checklist, MethodPanel, IssueCard …
│  │  ├─ lib/
│  │  │  ├─ api.js                 # 백엔드 호출, 실패 시 규칙 기반으로 대체
│  │  │  ├─ checks.js              # 점검 항목 10개 · 판정 기준 · 근거 조항
│  │  │  ├─ mockAnalyzer.js        # 규칙 기반 분석기 (오프라인 대체용)
│  │  │  └─ scoring.js             # 항목 충족률 · 법 위반 소지 건수 · 그룹별 요약
│  │  └─ data/samples/demo.js
│  └─ tests/                       # analyzer(25종 회귀) · scoring · ui · api
└─ tools/
   ├─ extract_consent.py           # 링크 추출 명령줄 버전 (backend/crawl 재사용)
   └─ xlsx_to_fixture.py           # 검증표 → 테스트 fixture
```

## 분석 방식

### 점검 항목·점수 (6주차 체계 유지)

- 점검 항목 10개(1a 1b 1c 2a 2b 2c 3a 3b 4a 4b)를 충족/미충족으로만 판정
- **점수 = round(충족 항목 수 ÷ 10 × 100)**, 가중치·부분 점수·등급 구간 없음
- 3b(민감·고유식별정보), 4b(강제 동의)는 "법 위반 소지 항목 N건"으로 따로 표시
- AI 분석과 규칙 분석 모두 같은 판정 기준(`checks.js` / `checks.py`)을 쓰고, 점수 계산은 화면의 `scoring.js` 하나로 합니다.

### AI 분석 (backend)

1. **RAG 검색**: 점검 항목마다 (항목 설명 + 판정 기준 + 동의서 앞부분)으로 법령 지식베이스를 검색해 관련 조항을 모읍니다.
2. **판정**: OpenAI GPT(기본 `gpt-5.5`)에 판정 기준과 검색된 조항을 주고, 라벨이 없는 문장형 동의서도 목적·항목·기간을 찾아 10개 항목을 판정하게 합니다. 결과는 JSON 스키마(구조화 출력)로 받습니다.
3. **검증**: 10개 항목이 다 있는지, 충족 항목에 카드가 붙지 않았는지 확인하고, 목적이 없는데 "목적 표현 충족" 같은 모순은 규칙으로 바로잡습니다. 법적 근거는 검색된 조항만 인용하게 합니다.
4. **재현성**: 같은 문구는 저장된 결과를 돌려줘 점수가 바뀌지 않습니다. 모델·프롬프트를 바꾸면(`PROMPT_VERSION`) 캐시가 새로 쌓입니다.
5. **개인정보**: 동의서 원문은 서버 로그에 남기지 않습니다(길이만 기록). AI 분석 시 문구가 OpenAI API로 전송된다는 안내를 입력 화면에 표시합니다.

설정(`backend/.env`): `OPENAI_API_KEY`, `CONSENT_LLM_MODEL`(기본 `gpt-5.5`), `CONSENT_LLM_EFFORT`(추론 강도, 기본 `low`. gpt-4o처럼 추론 모델이 아니면 빈 값으로).

### 규칙 기반 분석 (frontend, 대체용)

6주차 분석기 그대로입니다. 서버가 없거나 API 키가 없을 때 쓰이며, 결과 화면 위에 "규칙 기반 분석"과 그 이유가 표시됩니다.

## 정량 평가

```bash
cd backend
python -m eval.run_eval --rules-only   # 비용 없음: 규칙 기반 기준선만
python -m eval.run_eval                # LLM 평가: API 호출 25회 (gpt-5.5 기준 약 4분, 캐시된 샘플은 무료)
python -m eval.run_eval --only R03     # 일부 샘플만
```

결과는 `docs/eval/llm_eval.md`에 표로 저장됩니다. '미충족'을 양성(문제 탐지)으로 보고 정밀도·재현율을 함께 계산합니다.

| 방식 | 항목 일치 | 완전 일치 | 정밀도 | 재현율 | 불일치 |
|---|---|---|---|---|---|
| 규칙 기반 | 244/250 = 97.6% | 24/25 | 0.806 | 1.0 | R03(라벨 없는 서술문) |
| LLM + RAG (gpt-5.5) | 248/250 = 99.2% | 23/25 | 0.96 | 0.96 | H02(2c) H14(2a) |

- LLM은 규칙 분석이 못 읽던 문장형 동의서(R03)를 10개 항목 모두 맞혔습니다. 대신 실행할 때마다 1~2개 항목이 흔들립니다. 1차 실행(프롬프트 v1)은 246/250이었고, 틀린 4건이 모두 2a(목록에 없는 "서비스 제공", "당첨 안내"까지 모호하다고 판정)였습니다. 프롬프트에 "목록에 있는 표현만"이라고 명시한 2차 실행(v2)이 위 수치입니다. 같은 샘플을 보고 프롬프트를 고쳤으므로 이 수치도 과대평가일 수 있습니다. 그래서 아래 새 샘플로 다시 쟀습니다.
- 정답은 직접 법 조항과 대조해 작성했고 전문가 검수는 거치지 않았습니다.
- 규칙 기반 수치는 같은 샘플로 규칙을 고친 결과라 과대평가 가능성이 있습니다. LLM은 이 샘플로 학습·조정하지 않았지만, 프롬프트의 "운영 규칙"은 검증표 정답 기준에 맞춰 적었습니다.

### 새 샘플(held-out) 평가

규칙과 프롬프트를 고칠 때 보지 않은 새 샘플 15종(`backend/eval/heldout_samples.json`)으로 다시 쟀습니다. 라벨 없는 서술문, 문답형, 표 복사(낯선 라벨), 필수·선택 분리 동의서, "열흘"·"졸업 시까지"·"필요한 기간 동안" 같은 처음 보는 표현을 넣었습니다. 규칙 기반은 지금의 `mockAnalyzer.js`를 그대로 돌린 결과입니다.

```
cd backend
python -m eval.run_eval --fixture eval/heldout_samples.json   # → docs/eval/heldout_eval.md
```

| 방식 | 항목 일치 | 완전 일치 | 정밀도 | 재현율 | 불일치 |
|---|---|---|---|---|---|
| 규칙 기반 | 125/150 = 83.3% | 8/15 | 0.46 | 0.82 | N01 N02 N06 N07 N09 N12 N15 |
| LLM + RAG (gpt-5.5) | 150/150 = 100% | 15/15 | 1.0 | 1.0 | 없음 (캐시 없이 2회 실행 모두 같음) |

- 규칙 기반은 라벨이 없거나(N01·N02·N06) 낯선 라벨(N15 "수집하는 정보", "보관 기간")이면 목적·항목·기간을 못 찾고, 그 결과 2a~2c까지 연쇄로 틀립니다. "열흘"(N09), 한 줄에 필수·선택이 섞인 경우(N12), "동의한 분만 제출할 수 있습니다"(N07) 같은 강제 문구도 놓쳤습니다.
- 25종 평가(97.6%)와 새 샘플 평가(83.3%)의 차이가 규칙 기반이 검증표에 맞춰진 정도를 보여 줍니다. LLM은 두 평가셋에서 모두 99% 이상이었습니다.
- 15종은 작은 표본이고 정답은 직접 작성했습니다. 100%는 "이 샘플에서 틀린 항목이 없었다"는 뜻이지 오류가 없다는 뜻이 아닙니다.

### 회귀 테스트 (규칙 분석기)

`npm test`는 검증표 25종을 규칙 분석기에 넣어 정답과 비교합니다. 244/250, 완전 일치 24종 아래로 내려가면 실패합니다. R03은 규칙 분석기의 알려진 한계로 `it.fails` 처리되어 있습니다(AI 분석은 R03을 다룰 수 있도록 설계됨). 검증표 정답을 고쳤다면 `python tools/xlsx_to_fixture.py`로 fixture를 다시 만드세요.

## 링크 읽기

화면의 URL 탭에 폼 링크를 넣으면 서버가 헤드리스 브라우저로 폼을 열어 '개인정보 … 동의' 근처 문구만 잘라 분석합니다. 결과 화면의 "링크에서 읽어 온 동의 문구"에서 실제로 읽은 내용을 확인할 수 있습니다.

- 로그인이 필요한 폼·비공개 폼은 읽지 못합니다. 실패하면 이유와 함께 텍스트 붙여넣기를 안내합니다.
- 서버가 대신 여는 주소이므로 localhost·사설 IP는 막습니다.
- 명령줄로만 뽑으려면 `python tools/extract_consent.py "<폼 주소>" [--out consent.txt]`

## 알려진 한계

- **법령 지식베이스는 조문 요지**입니다. 원문이 아니므로 최종 확인은 국가법령정보센터에서 해야 하며, 법 개정 시 `backend/rag/law_articles.json`을 갱신해야 합니다.
- **AI 판정은 틀릴 수 있습니다.** 미충족 항목에는 이유가 표시되니 함께 확인하세요. 점수는 참고용이며 법률 의견이 아닙니다.
- **실제 네이버폼에서의 링크 추출은 폼 구조에 따라 일부 문구가 빠질 수 있습니다.** 화면 구조에 의존하지 않고 글자 패턴으로 찾는 방식입니다.

## 6주차 데모 대비 바뀐 점

- 백엔드(FastAPI) · 법령 RAG · OpenAI GPT 분석 · 링크 자동 읽기 · 정량 평가 스크립트 추가
- URL 탭이 실제로 링크를 읽음 (실패 시 이유 표시)
- 결과 화면: 분석 방식 배지, 미충족 항목 이유, 참고한 법 조항, 링크에서 읽은 문구
- 규칙 분석기의 카드 원문 줄바꿈·탭 정리 버그 수정 (`mockAnalyzer.js`의 정규식 백슬래시 중복 — 점수에는 영향 없었음)
- 분석 중 화면 최소 표시 시간 1.6초 → 1.2초 (실제 분석 시간이 생겼으므로)
