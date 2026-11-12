import { PASS, FAIL } from './colors.js';

// 점검 항목 10개: 충족/미충족과 근거 조항
export default function Checklist({ items }) {
  return (
    <div style={{ width: '100%', border: '1px solid #D2D2D7', borderRadius: 18, padding: 8, marginBottom: 20 }}>
      {items.map((item) => (
        <div key={item.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', borderRadius: 12 }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: item.passed ? PASS.bg : FAIL.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 12 }}>
            {item.passed ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 13L9.5 17.5L19 7" stroke="#1E8E3E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 6L18 18M18 6L6 18" stroke="#D70015" strokeWidth="2.5" strokeLinecap="round" /></svg>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 15, color: '#1D1D1F' }}>{item.label}</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#AEAEB2' }}>{item.group} · {item.legal.split(' (')[0]}</p>
          </div>
          <span style={{ fontSize: 13, color: '#86868B' }}>{item.passed ? '충족' : '미충족'}</span>
        </div>
      ))}
    </div>
  );
}
