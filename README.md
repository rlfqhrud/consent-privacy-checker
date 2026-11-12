# LLM 기반 설문 동의서 개인정보 컴플라이언스 체커

설문·연구 동의서 문구를 개인정보보호법 기준으로 점검해 항목별 충족/미충족, 항목 충족률, 문제 조항 원문과 수정 제안, 법적 근거를 보여주는 웹앱입니다.

현재 단계는 **프론트엔드 데모 v1.1(6주차)을 React + Vite 구조로 옮긴 상태**입니다. 분석은 규칙 기반 목업(`mockAnalyzer.js`)이 하고 있으며, LLM·백엔드·링크 자동 분석은 9주차 이후에 붙입니다.

## 실행 방법

Node.js 20 이상이 필요합니다.

```bash
cd frontend
npm install       # 처음 한 번
npm run dev       # 개발 서버 → http://localhost:5173
npm test          # 회귀 테스트 (Vitest)
npm run build     # 배포용 빌드 → frontend/dist
```

> Windows에서 `Cannot find native binding` 오류가 나면 `node_modules`와 `package-lock.json`을 지우고 `npm install`을 다시 실행하세요. (npm의 optional dependency 버그)

## 폴더 구조

```
생성형/
├─ docs/                          # 원본 자료 (수정하지 않음)
│  ├─ Main.dc.html                # 6주차 단일 파일 데모 (이전 원본)
│  ├─ 생성형AI캡스톤_주차별보고서_길보경.docx
│  └─ 정확도_검증표.xlsx           # 샘플 25종 · 항목별 정답
├─ frontend/                      # React + Vite
│  ├─ index.html, package.json, vite.config.js
│  ├─ src/
│  │  ├─ main.jsx, App.jsx        # 화면 상태: 입력 → 분석 중 → 결과
│  │  ├─ styles.css               # 공통 스타일 (데모 <style> 그대로)
│  │  ├─ pages/
│  │  │  ├─ InputPage.jsx         # URL / 텍스트 탭, 입력 검증, 샘플 불러오기, 링크 안내
│  │  │  ├─ LoadingPage.jsx       # 분석 중
│  │  │  └─ ResultPage.jsx        # 결과 화면 조립
│  │  ├─ components/
│  │  │  ├─ ScoreCard.jsx         # 항목 충족률 N% · N / 10 항목 충족 · 법 위반 소지 N건 · 그룹 칩
│  │  │  ├─ Checklist.jsx         # 점검 항목 10개 (근거 조항)
│  │  │  ├─ MethodPanel.jsx       # "점수는 왜 이렇게 계산하나요?"
│  │  │  ├─ IssueCard.jsx         # 수정 제안 카드 (원문 → 수정 문구, 접기식 설명·법적 근거)
│  │  │  ├─ Chevron.jsx, colors.js
│  │  ├─ lib/                     # UI와 분리된 순수 로직
│  │  │  ├─ checks.js             # 점검 항목 10개 · 판정 기준 · 근거 조항 · 그룹 · 법 위반 소지 항목
│  │  │  ├─ mockAnalyzer.js       # analyze(text) → { credits, cards } (백엔드 연동 시 API 호출로 교체)
│  │  │  └─ scoring.js            # 항목 충족률 · 법 위반 소지 건수 · 그룹별 요약
│  │  └─ data/samples/demo.js     # 1주차 [X] 예시 (샘플 불러오기)
│  └─ tests/
│     ├─ fixtures/accuracy_samples.json   # 검증표 25종 (원문 · 정답 · 검증표 당시 시스템 판정)
│     ├─ analyzer.test.js         # 25종 × 10항목 회귀 테스트
│     ├─ scoring.test.js          # 점수 계산
│     └─ ui.test.jsx              # 화면 렌더링
├─ tools/
│  ├─ extract_consent.py          # 폼 링크에서 동의 문구 추출 (Playwright)
│  └─ xlsx_to_fixture.py          # 검증표 → 테스트 fixture 변환
└─ README.md
```

### 보고서 구성안(5주차 4장 "목표 구성")과 다른 점

| 구성안 | 현재 | 이유 |
|---|---|---|
| `consent-checker/` 최상위 폴더 | `생성형/` 폴더가 그 역할 | 작업 폴더를 그대로 사용 |
| `backend/` (rag, analysis, api, eval) | 만들지 않음 | 9주차 이후 범위 |
| `lib/scoring.js`: 배점 · 치명 항목 · 등급 계산 | 항목 충족률 · 법 위반 소지 건수만 | 6주차에 배점·부분 점수·등급 구간을 없앤 개정을 따름 |
| (없음) | `lib/checks.js` | 점검 항목 상수를 분석기·점수·화면이 함께 쓰도록 분리 |
| 정확도 평가는 `backend/eval/` | `frontend/tests/` | 분석기가 아직 프론트엔드에 있어 Vitest로 바로 검증 |

## 점수 체계 (6주차)

- 점검 항목 10개(1a 1b 1c 2a 2b 2c 3a 3b 4a 4b)를 충족/미충족으로만 판정
- **점수 = round(충족 항목 수 ÷ 10 × 100)**, 가중치·부분 점수·등급 구간 없음
- 3b(민감·고유식별정보), 4b(강제 동의)는 점수와 별도로 "법 위반 소지 항목 N건"으로 표시
- 항목·판정 기준·근거 조항은 `frontend/src/lib/checks.js`

## 회귀 테스트 (정확도 검증표)

`npm test`는 `docs/정확도_검증표.xlsx`의 샘플 25종을 분석기에 넣어 항목별 정답과 비교합니다. **분석기를 고칠 때마다 통과해야 합니다.**

- 현재: 항목 일치 **244/250 = 97.6%**, 25종 중 **24종 완전 일치** (보고서 6주차 수치와 동일)
- R03(라벨 없는 서술문)은 **알려진 한계**로 `it.fails`로 표시되어 실패로 치지 않습니다. 규칙이 바뀌어 R03이 정답과 맞게 되면 테스트가 알려 주므로, 그때 `KNOWN_LIMITATIONS`에서 빼면 됩니다.
- 전체 일치율이 244/250 또는 완전 일치 24종 아래로 내려가면 실패합니다.

검증표의 정답(파란 칸)을 고쳤다면 fixture를 다시 만드세요.

```bash
pip install openpyxl
python tools/xlsx_to_fixture.py
```

## 링크에서 동의 문구 뽑기 (임시, 화면과 연결 안 됨)

화면의 URL 탭은 아직 링크 내용을 읽지 못하고 안내만 보여줍니다. 그동안은 아래 스크립트로 문구를 뽑아 **텍스트 붙여넣기** 탭에 넣으세요.

```bash
pip install playwright
playwright install chromium
python tools/extract_consent.py "<폼 주소>"
python tools/extract_consent.py "<폼 주소>" --out consent.txt   # 파일로 저장
```

로그인이 필요한 폼이나 비공개 폼은 읽지 못합니다. 실제 네이버폼에서는 아직 시험하지 않았습니다(6주차 보고서). 화면과 자동으로 연결하는 작업은 백엔드 단계에서 합니다.

## 데모(Main.dc.html)와 달라진 점

- **샘플 불러오기 버튼 추가**: 텍스트 탭 안내 문구 아래에 있습니다. 1주차 [X] 예시(`DEMO_TEXT`)를 채우고 오류 문구를 지웁니다.
- **빈 입력 시 DEMO_TEXT 대체 분석 제거**: 데모에서는 실제로 실행되지 않던 코드(텍스트는 10자 이상이어야 제출됨)라 화면 동작은 같습니다.
- **분석 시점**: 데모는 결과를 그릴 때마다 분석했고, 이번 버전은 제출할 때 한 번만 분석합니다. 결과는 같습니다.
- 그 밖의 화면 구성, 문구, 색, 여백, 1.6초 로딩, 입력 검증 메시지는 데모와 같습니다. `analyze()`는 데모 원본과 출력(credits·카드)이 같은지 25종과 추가 입력 6개로 확인했습니다.

## 알려진 문제

- **라벨 없는 문장형 동의서(R03)는 읽지 못함**: 규칙 기반의 구조적 한계이며 LLM 단계에서 다룰 예정입니다.
- **카드의 "문제 원문" 줄바꿈·탭 정리가 동작하지 않음** (`mockAnalyzer.js`의 `extract`)
  - 원인: 데모 원본 정규식 `/\\s*\\n\\s*/g`, `/\\t+/g`에 백슬래시가 두 번 들어가, 실제 줄바꿈·탭이 아닌 글자 `\n`, `\t`를 찾습니다.
  - 증상: 라벨이 따로 한 줄에 있거나 표에서 복사한 입력에서 그 조항이 문제로 잡히면, 카드 원문에 줄바꿈·탭이 그대로 남습니다.
  - 영향 범위: 점수와 판정에는 영향이 없고, 검증표 25종에서는 나타나지 않습니다.
  - 이번에는 "동작을 바꾸지 않고 옮기기" 원칙에 따라 그대로 두었습니다.
