import { useState } from 'react';
import { CHECKS } from '../lib/checks.js';
import Chevron from './Chevron.jsx';

const heading = { margin: '0 0 4px', fontSize: 12, fontWeight: 500, color: '#86868B' };
const body = { margin: '0 0 14px', fontSize: 14, lineHeight: 1.6, color: '#1D1D1F' };

// "점수는 왜 이렇게 계산하나요?" 접이식 패널
export default function MethodPanel() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ width: '100%', border: '1px solid #D2D2D7', borderRadius: 16, padding: '16px 20px', marginBottom: 20 }}>
      <button onClick={() => setOpen(!open)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 0, border: 'none', background: 'none', fontSize: 15, fontWeight: 600, color: '#1D1D1F', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
        <span>점수는 왜 이렇게 계산하나요?</span>
        <Chevron open={open} size={14} color="#86868B" />
      </button>
      {open && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #F0F0F2' }}>
          <p style={heading}>계산 방법</p>
          <p style={body}>점검 항목 10개를 각각 "충족 / 미충족" 두 가지로만 판정하고, 충족한 항목 수 ÷ 10 × 100을 점수로 씁니다. 같은 문구를 넣으면 항상 같은 점수가 나옵니다.</p>
          <p style={heading}>항목마다 가중치를 다르게 주지 않는 이유</p>
          <p style={body}>항목은 모두 개인정보보호법 조항에서 가져왔습니다. 그중 제15조·제16조·제22조 위반의 법정 과태료 상한은 모두 3천만원 이하로 같은 등급이라, 법으로는 어느 항목이 더 중요하다고 가를 근거가 없습니다. 그래서 임의 배점과 부분 점수(0.5점), 등급 구간(예: 90점 이상 적합)은 쓰지 않았습니다.</p>
          <p style={heading}>판정 기준과 근거 조항</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
            {CHECKS.map((m) => (
              <div key={m.id} style={{ padding: '10px 12px', background: '#F5F5F7', borderRadius: 10 }}>
                <p style={{ margin: '0 0 3px', fontSize: 13, fontWeight: 600, color: '#1D1D1F' }}>{m.group} · {m.label}</p>
                <p style={{ margin: '0 0 3px', fontSize: 13, lineHeight: 1.5, color: '#6E6E73' }}>{m.criteria}</p>
                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: '#86868B' }}>근거: {m.legal}</p>
              </div>
            ))}
          </div>
          <p style={heading}>"법 위반 소지" 표시</p>
          <p style={body}>민감·고유식별정보 수집(제23·24조)과 강제 동의(제22조제5항)는 점수와 별개로 따로 표시합니다. 다른 항목보다 중요하다고 점수를 더 깎는 대신, 눈에 띄게 알려주기만 합니다.</p>
          <p style={heading}>알아둘 점</p>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: '#6E6E73' }}>현재는 문구 속 표현을 규칙으로 찾는 방식이라 문장이 특이하면 놓칠 수 있습니다. 이 점수는 참고용 점검 결과이며 법률 의견이 아닙니다.</p>
        </div>
      )}
    </div>
  );
}
