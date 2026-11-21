// 종합 판정: 항목 충족률, "N / 10 항목 충족", 법 위반 소지 N건, 영역별 충족 수
export default function ScoreCard({ summary }) {
  const { score, passedCount, total, criticalCount, tone, groupSummary } = summary;
  return (
    <div className="verdict">
      <div>
        <p className="score-label">항목 충족률</p>
        <p className={`score ${tone}`}>{score}<span>%</span></p>
        <span className="count">{passedCount} / {total} 항목 충족</span>
        {criticalCount > 0 && <p className="critical-note">법 위반 소지 항목 {criticalCount}건 (점수와 별도 표시)</p>}
      </div>
      <div className="groups">
        {groupSummary.map((g) => (
          <div key={g.group} className={g.allPassed ? 'g-ok' : 'g-bad'}>
            <p>{g.group} {g.ok}/{g.total}</p>
            <small>{g.allPassed ? '모두 충족' : `${g.total - g.ok}개 미충족`}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
