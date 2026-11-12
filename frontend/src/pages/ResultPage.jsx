import { summarize } from '../lib/scoring.js';
import ScoreCard from '../components/ScoreCard.jsx';
import Checklist from '../components/Checklist.jsx';
import MethodPanel from '../components/MethodPanel.jsx';
import IssueCard from '../components/IssueCard.jsx';

// analysis: mockAnalyzer.analyze()의 반환값 { credits, cards }
export default function ResultPage({ analysis, onReset }) {
  const summary = summarize(analysis.credits);
  const { cards } = analysis;

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <ScoreCard summary={summary} />
      <Checklist items={summary.checklist} />

      <p style={{ width: '100%', margin: '-8px 0 20px', fontSize: 12, lineHeight: 1.5, color: '#AEAEB2', textAlign: 'center' }}>충족률 = 충족한 항목 수 ÷ 전체 10개 항목 × 100 · 가중치와 부분 점수 없음</p>

      <MethodPanel />

      {cards.length > 0 ? (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 8 }}>
          {cards.map((card, i) => <IssueCard key={i} card={card} />)}
        </div>
      ) : (
        <p style={{ margin: '8px 0 0', fontSize: 15, color: '#1E8E3E' }}>수정이 필요한 부분이 발견되지 않았어요</p>
      )}

      <p style={{ margin: '12px 0 0', fontSize: 12, lineHeight: 1.5, color: '#AEAEB2', textAlign: 'center' }}>이 점수는 참고용 점검 결과이며 법률 의견이나 법 준수 확인이 아닙니다</p>

      <button onClick={onReset} style={{ marginTop: 20, padding: 0, border: 'none', background: 'none', fontSize: 15, fontWeight: 500, color: '#0071E3', cursor: 'pointer', fontFamily: 'inherit' }}>다시 분석하기</button>
    </div>
  );
}
