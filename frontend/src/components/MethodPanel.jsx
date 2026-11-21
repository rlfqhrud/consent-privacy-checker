import { useState } from 'react';
import { CHECKS } from '../lib/checks.js';
import Chevron from './Chevron.jsx';

// "점수는 왜 이렇게 계산하나요?" 접이식 패널
export default function MethodPanel({ engine }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="panel">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span>점수는 왜 이렇게 계산하나요?</span>
        <Chevron open={open} size={14} color="#5F7787" />
      </button>
      {open && (
        <div className="panel-body">
          <h4>계산 방법</h4>
          <p>점검 항목 10개를 각각 "충족 / 미충족" 두 가지로만 판정하고, 충족한 항목 수 ÷ 10 × 100을 점수로 씁니다. 같은 문구를 넣으면 항상 같은 점수가 나옵니다.</p>
          <h4>항목마다 가중치를 다르게 주지 않는 이유</h4>
          <p>항목은 모두 개인정보보호법 조항에서 가져왔습니다. 그중 제15조·제16조·제22조 위반의 법정 과태료 상한은 모두 3천만원 이하로 같은 등급이라, 법으로는 어느 항목이 더 중요하다고 가를 근거가 없습니다. 그래서 임의 배점과 부분 점수(0.5점), 등급 구간(예: 90점 이상 적합)은 쓰지 않았습니다.</p>
          <h4>판정 기준과 근거 조항</h4>
          <div className="criteria">
            {CHECKS.map((m) => (
              <div key={m.id}>
                <b>{m.group} · {m.label}</b>
                <span>{m.criteria}</span>
                <small>근거: {m.legal}</small>
              </div>
            ))}
          </div>
          <h4>"법 위반 소지" 표시</h4>
          <p>민감·고유식별정보 수집(제23·24조)과 강제 동의(제22조제5항)는 점수와 별개로 따로 표시합니다. 다른 항목보다 중요하다고 점수를 더 깎는 대신, 눈에 띄게 알려주기만 합니다.</p>
          <h4>알아둘 점</h4>
          <p>{engine === 'llm' ? 'AI(OpenAI GPT)가 관련 법 조항을 검색해 참고하면서 위 기준으로 판정합니다. 라벨 없이 문장으로 쓴 동의서도 읽을 수 있지만 판정이 틀릴 수 있으니 근거 문구를 함께 확인하세요. 같은 문구는 저장된 결과를 다시 보여줘 점수가 바뀌지 않습니다.' : '규칙 기반 분석은 문구 속 표현을 정해진 규칙으로 찾는 방식이라 라벨 없이 문장으로 쓴 동의서는 놓칠 수 있습니다.'} 이 점수는 참고용 점검 결과이며 법률 의견이 아닙니다.</p>
        </div>
      )}
    </div>
  );
}
