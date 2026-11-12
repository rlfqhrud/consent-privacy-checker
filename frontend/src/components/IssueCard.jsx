import { useState } from 'react';
import Chevron from './Chevron.jsx';

// 수정 제안 카드: 문제 원문(주황) → 수정 제안(초록), 화살표를 누르면 설명과 법적 근거가 펼쳐짐
export default function IssueCard({ card }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ width: '100%', border: '1px solid #D2D2D7', borderRadius: 16, padding: 20 }}>
      <p style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 600, color: '#1D1D1F' }}>{card.title}</p>
      <div style={{ padding: '10px 12px', background: '#FEF3E7', borderRadius: 10, marginBottom: 10, fontSize: 14, lineHeight: 1.5, color: '#1D1D1F' }}>{card.original}</div>
      <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 500, color: '#86868B' }}>수정 제안</p>
      <div style={{ padding: '10px 12px', background: '#E8F5E9', borderRadius: 10, marginBottom: 8, fontSize: 14, lineHeight: 1.5, color: '#1D1D1F' }}>{card.suggestion}</div>
      <button onClick={() => setOpen(!open)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 0', border: 'none', background: 'none', fontSize: 13, fontWeight: 500, color: '#0071E3', cursor: 'pointer', fontFamily: 'inherit' }}>
        <span>왜 문제인가요? · 법적 근거</span>
        <Chevron open={open} size={12} color="#0071E3" />
      </button>
      {open && (
        <div style={{ marginTop: 6, paddingTop: 12, borderTop: '1px solid #F0F0F2' }}>
          <p style={{ margin: '0 0 12px', fontSize: 14, lineHeight: 1.5, color: '#86868B' }}>{card.problem}</p>
          <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 500, color: '#86868B' }}>법적 근거</p>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: '#6E6E73' }}>{card.legal}</p>
        </div>
      )}
    </div>
  );
}
