const MESSAGES = {
  extract: ['링크에서 동의서를 읽고 있어요', '폼 페이지를 열어 개인정보 동의 문구를 찾는 중'],
  analyze: ['동의서를 분석하고 있어요', '관련 법 조항을 찾아 필수항목 · 표현 · 과도수집 · 동의절차를 확인하는 중']
};

export default function LoadingPage({ step = 'analyze' }) {
  const [title, sub] = MESSAGES[step] || MESSAGES.analyze;
  return (
    <section className="sheet" aria-live="polite" aria-busy="true">
      <div className="band"><h2>점검 진행 중</h2></div>
      <div className="loading">
        <div className="track" />
        <p className="title">{title}</p>
        <p className="sub">{sub}</p>
      </div>
    </section>
  );
}
