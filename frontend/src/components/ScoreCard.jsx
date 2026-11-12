import { PASS, FAIL, TONE } from './colors.js';

// 점수 "항목 충족률 N%", "N / 10 항목 충족", 법 위반 소지 N건, 그룹별 요약 칩
export default function ScoreCard({ summary }) {
  const { score, passedCount, total, criticalCount, tone, groupSummary } = summary;
  const { color, bg } = TONE[tone];
  return (
    <div style={{ width: '100%', padding: 32, border: '1px solid #D2D2D7', borderRadius: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
      <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 500, color: '#86868B' }}>항목 충족률</p>
      <p style={{ margin: '0 0 6px', fontSize: 56, fontWeight: 600, letterSpacing: '-0.02em', color }}>
        {score}<span style={{ fontSize: 22, color: '#AEAEB2', fontWeight: 500 }}>%</span>
      </p>
      <p style={{ margin: 0, padding: '4px 14px', borderRadius: 100, fontSize: 13, fontWeight: 500, background: bg, color }}>{passedCount} / {total} 항목 충족</p>
      {criticalCount > 0 && (
        <p style={{ margin: '10px 0 0', fontSize: 12, color: '#D70015' }}>법 위반 소지 항목 {criticalCount}건 (점수와 별도 표시)</p>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 16 }}>
        {groupSummary.map((g) => {
          const c = g.allPassed ? PASS : FAIL;
          return (
            <span key={g.group} style={{ padding: '4px 10px', borderRadius: 100, fontSize: 12, fontWeight: 500, background: c.bg, color: c.color }}>
              {g.group} {g.ok}/{g.total}
            </span>
          );
        })}
      </div>
    </div>
  );
}
