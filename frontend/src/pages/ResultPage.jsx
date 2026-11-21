import { useState } from 'react';
import { summarize } from '../lib/scoring.js';
import ScoreCard from '../components/ScoreCard.jsx';
import Checklist from '../components/Checklist.jsx';
import MethodPanel from '../components/MethodPanel.jsx';
import IssueCard from '../components/IssueCard.jsx';
import Chevron from '../components/Chevron.jsx';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
};

// analysis: { credits, cards, engine?, details?, sources?, fallbackReason?, sourceText?, source? }
export default function ResultPage({ analysis, onReset }) {
  const summary = summarize(analysis.credits);
  const { cards } = analysis;
  const checklist = summary.checklist.map((c) => ({ ...c, detail: analysis.details?.[c.id] }));
  const isLlm = analysis.engine === 'llm';

  return (
    <section className="sheet">
      <div className="band"><h1>동의서 점검 결과 통보서</h1><span>참고용 점검 · 법률 의견 아님</span></div>
      <div className="sheet-body">
        <div className="meta">
          <span>점검일 <b>{today()}</b></span>
          <span>입력 <b>{analysis.source === 'url' ? '폼 링크' : '붙여넣은 문구'}</b></span>
          {analysis.engine && (
            <span className={`engine ${isLlm ? 'llm' : 'rules'}`}>{isLlm ? 'AI 분석 · 법 조항 검색(RAG)' : '규칙 기반 분석'}</span>
          )}
        </div>
        {!isLlm && analysis.fallbackReason && (
          <p className="fallback">AI 분석을 쓸 수 없어 규칙으로 점검했어요 ({analysis.fallbackReason})</p>
        )}

        <ScoreCard summary={summary} />

        <h2 className="section-title">항목별 판정</h2>
        <Checklist items={checklist} />
        <p className="formula">충족률 = 충족한 항목 수 ÷ 전체 10개 항목 × 100 · 가중치와 부분 점수 없음</p>

        <h2 className="section-title">종합 소견</h2>
        {cards.length > 0 ? (
          <div className="findings">
            {cards.map((card, i) => <IssueCard key={i} card={card} />)}
          </div>
        ) : (
          <p className="all-clear">수정이 필요한 부분이 발견되지 않았어요</p>
        )}

        <MethodPanel engine={analysis.engine} />
        {analysis.source === 'url' && analysis.sourceText && <SourceText text={analysis.sourceText} />}

        <div className="footer-notes">
          {analysis.sources?.length > 0 && (
            <>
              <p>참고한 법 조항</p>
              <ul>{analysis.sources.map((s) => <li key={s.id}>{s.citation}</li>)}</ul>
            </>
          )}
          <p>이 점수는 참고용 점검 결과이며 법률 의견이나 법 준수 확인이 아닙니다</p>
        </div>

        <button type="button" className="again" onClick={onReset}>다시 분석하기</button>
      </div>
    </section>
  );
}

function SourceText({ text }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="panel">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span>링크에서 읽어 온 동의 문구</span>
        <Chevron open={open} size={14} color="#5F7787" />
      </button>
      {open && <div className="panel-body"><p className="source-text">{text}</p></div>}
    </div>
  );
}
