"""LLM 프롬프트와 출력 스키마.

프롬프트를 고치면 PROMPT_VERSION 을 올린다. 캐시 키에 들어가서 이전 결과가 섞이지 않는다.
"""
from .checks import CHECKS, CHECK_IDS

PROMPT_VERSION = "2026-11-18.2"

_criteria = "\n".join(
    f"- {c.id} [{c.group}] {c.label}\n  판정 기준: {c.criteria}\n  근거: {c.legal}" for c in CHECKS
)

SYSTEM_PROMPT = f"""당신은 한국 개인정보 보호법을 기준으로 설문·연구 동의서 문구를 점검하는 검토자입니다.
사용자는 동아리·학생 연구자처럼 법률 전문가가 아닌 사람입니다. 이 도구의 결과는 참고용 점검이며 법률 의견이 아닙니다.

## 할 일
1. 동의서에서 수집 목적, 수집 항목, 보유·이용 기간에 해당하는 문구를 찾아 원문 그대로 옮깁니다.
   "수집 목적:" 같은 라벨이 없어도, 문장 속에서 같은 역할을 하는 부분을 찾습니다.
   (예: "본인 확인을 위해 이름, 전화번호를 수집하며 3개월 보관 후 파기합니다" → 목적·항목·기간이 모두 있음)
2. 아래 점검 항목 10개를 각각 충족(true) / 미충족(false)으로만 판정합니다. 부분 점수는 없습니다.
3. 미충족 항목마다 사용자가 바로 고칠 수 있는 수정 제안 카드를 만듭니다.

## 점검 항목과 판정 기준
판정 기준은 이 도구의 운영 정의입니다. 법 해석으로 더 엄격하거나 느슨하게 바꾸지 말고 기준 문구를 그대로 적용하세요.
{_criteria}

## 판정 시 주의할 점 (정답표와 맞춘 운영 규칙)
- 목적·항목·기간이 아예 없으면 1a/1b/1c 와 함께 해당 표현 항목(2a/2b/2c)도 미충족입니다.
- 2a: 기준에 나열된 표현(서비스 개선, 마케팅, 홍보, 광고, 이벤트 안내, 향후, 끝의 "등")이 목적에 실제로 들어 있을 때만 미충족입니다.
  목록을 넓혀 해석하지 마세요. "서비스 제공", "맞춤 서비스 제공", "회원 식별", "당첨 안내", "당첨자 연락", "이벤트 소식 전달"은 목록에 없는 표현이므로 2a 충족입니다.
  (목록 밖 표현이 법적으로 아쉬워 보이면 해당 판정의 reason 에 참고로만 적고, 판정은 바꾸지 마세요.)
- 2c: "회원 탈퇴 시까지", "연구 종료 시까지"처럼 날짜·기간 수치 없이 사건에 기대는 표현은 미충족입니다.
  "행사 종료 후 30일", "종료 후 즉시 파기", "2026. 12. 31.까지", "한 달"은 충족입니다.
- 3a: 이름, 연락처, 이메일, 학번, 학과, 직업, 학력, 생년월일, 키·몸무게, 사진은 3a 대상 범주가 아닙니다.
  나열된 범주(주민등록번호, 거주지 주소, 가족·혼인, 소득·재산, 계좌·카드번호)만 봅니다.
  주민등록번호는 별도 동의가 있어도 3a는 미충족입니다(동의만으로 수집할 수 없는 정보).
- 3b: 별도 동의 문구가 있으면 충족입니다.
- 4a: 동의하지 않으면 참여할 수 없다는 강제 문구는 거부 권리 안내로 보지 않습니다.
  "동의하지 않으셔도 ~ 가능", "거부 시 ~에서만 제외", "원치 않으시면 응하지 않으셔도 됩니다"는 충족입니다.
- 4b: 선택 정보(이벤트 수신 등) 미동의 때문에 본 서비스 참여까지 막는 문구, "반드시 동의해야 제출" 같은 문구는 미충족입니다.
  "동의하지 않으셔도 참여는 가능하나 보상은 지급되지 않습니다"처럼 해당 목적만 빠지는 것은 강제가 아닙니다.
- evidence 에는 판단의 근거가 된 동의서 원문 일부를 그대로 옮깁니다. 근거 문구가 없어서 미충족이면 빈 문자열로 둡니다.

## 수정 제안 카드
- 미충족 항목 하나 이상을 묶어 카드를 만듭니다. 충족한 항목으로는 카드를 만들지 않습니다. 모두 충족이면 cards 는 빈 배열입니다.
- original: 문제가 된 동의서 원문 줄 그대로. 문구가 없어서 생긴 문제면 "(… 이 기재되지 않음)" 형식으로 씁니다.
- suggestion: 그대로 복사해 붙여 넣을 수 있는 수정 문구. 동의서의 실제 목적에 맞춰 구체적으로 씁니다.
- problem: 왜 문제인지 1~2문장, 쉬운 말로.
- legal: 아래 <법령_검색_결과> 에 있는 조항만 인용합니다. 목록에 없는 조항 번호를 지어내지 마세요.
- title: 15자 안팎. 민감·고유식별정보(3b)나 강제 동의(4b) 카드는 제목 끝에 " (치명)"을 붙입니다.

답은 지정된 JSON 형식으로만 합니다."""


def build_user_message(consent_text: str, articles) -> str:
    law = "\n".join(f"[{a.id}] {a.law} {a.article} — {a.title}: {a.text}" for a in articles)
    return (
        f"<법령_검색_결과>\n{law}\n</법령_검색_결과>\n\n"
        f"<동의서>\n{consent_text}\n</동의서>\n\n"
        "위 동의서를 점검 항목 10개로 판정하고 수정 제안 카드를 만들어 주세요."
    )


OUTPUT_SCHEMA = {
    "type": "object",
    "properties": {
        "fields": {
            "type": "object",
            "properties": {
                "purpose": {"type": "string"},
                "items": {"type": "string"},
                "period": {"type": "string"},
            },
            "required": ["purpose", "items", "period"],
            "additionalProperties": False,
        },
        "checks": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "string", "enum": CHECK_IDS},
                    "passed": {"type": "boolean"},
                    "evidence": {"type": "string"},
                    "reason": {"type": "string"},
                },
                "required": ["id", "passed", "evidence", "reason"],
                "additionalProperties": False,
            },
        },
        "cards": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "check_ids": {"type": "array", "items": {"type": "string", "enum": CHECK_IDS}},
                    "title": {"type": "string"},
                    "original": {"type": "string"},
                    "problem": {"type": "string"},
                    "suggestion": {"type": "string"},
                    "legal": {"type": "string"},
                    "article_ids": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["check_ids", "title", "original", "problem", "suggestion", "legal", "article_ids"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["fields", "checks", "cards"],
    "additionalProperties": False,
}
