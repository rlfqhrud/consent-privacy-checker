import { useState } from 'react';
import Chevron from './Chevron.jsx';

// 소견 한 건: 문제 원문 → 수정 제안, 펼치면 이유와 법적 근거
export default function IssueCard({ card }) {
  const [open, setOpen] = useState(false);
  return (
    <article className="finding">
      <h3>{card.title}</h3>
      <p className="row-label">현재 문구</p>
      <p className="before">{card.original}</p>
      <p className="row-label">수정 제안</p>
      <p className="after">{card.suggestion}</p>
      <button type="button" className="toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span>왜 문제인가요? · 법적 근거</span>
        <Chevron open={open} size={12} color="currentColor" />
      </button>
      {open && (
        <div className="more">
          <p>{card.problem}</p>
          <p className="row-label">법적 근거</p>
          <p>{card.legal}</p>
        </div>
      )}
    </article>
  );
}
