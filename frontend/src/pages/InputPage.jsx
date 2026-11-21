import { DEMO_TEXT } from '../data/samples/demo.js';

const SCOPE = [
  ['① 필수항목', '수집 목적 · 수집 항목 · 보유기간이 적혀 있는지'],
  ['② 표현', '"등", "필요시까지", "홍보"처럼 모호한 표현이 없는지'],
  ['③ 과도한 수집', '주민등록번호 · 건강정보 등을 필요 이상 받지 않는지'],
  ['④ 동의 절차', '거부 권리를 알리고 동의를 강제하지 않는지']
];

export default function InputPage({ mode, urlValue, textValue, errorMessage, urlNotice, onModeChange, onUrlChange, onTextChange, onLoadSample, onSubmit }) {
  const isUrl = mode === 'url';
  const submit = (e) => { e.preventDefault(); onSubmit(); };
  return (
    <>
      <form className="sheet" onSubmit={submit} noValidate>
        <div className="band"><h2>동의서 점검 신청</h2><span>점검 항목 10개</span></div>
        <div className="sheet-body">
          <div className="intro">
            <h1>동의서, 놓친 부분은 없을까요</h1>
            <p>설문·연구 동의서를 분석해 누락된 항목과 모호한 표현을 짚어드립니다</p>
          </div>

          <div className="seg" role="group" aria-label="입력 방식">
            <button type="button" aria-pressed={isUrl} onClick={() => onModeChange('url')}>URL 입력</button>
            <button type="button" aria-pressed={!isUrl} onClick={() => onModeChange('text')}>텍스트 붙여넣기</button>
          </div>

          {isUrl ? (
            <>
              <label htmlFor="url-field" className="field-label">네이버폼 링크</label>
              <input id="url-field" className="field" type="url" inputMode="url" autoComplete="off" value={urlValue}
                onChange={(e) => onUrlChange(e.target.value)} placeholder="https://form.naver.com/..." />
            </>
          ) : (
            <>
              <label htmlFor="text-field" className="field-label">수집 목적 · 수집 항목 · 보유 및 파기 기한</label>
              <textarea id="text-field" className="field" value={textValue} onChange={(e) => onTextChange(e.target.value)}
                placeholder={'수집 목적: 설문조사 응답자 기프티콘 보상\n수집 항목: 이름, 휴대폰 전화번호\n보유 및 이용 기간: 입력일로부터 6개월 후 파기'} />
              <p className="hint">동의서에 적힌 수집 목적, 수집 항목, 보유기간(파기일)을 그대로 옮겨 적어주세요</p>
              <button type="button" className="linklike" style={{ marginTop: 8 }} onClick={() => onLoadSample(DEMO_TEXT)}>샘플 불러오기</button>
            </>
          )}

          {errorMessage && <p className="error" role="alert">{errorMessage}</p>}

          {urlNotice && (
            <div className="notice" role="status">
              <strong>링크에서 동의서를 읽어 오지 못했어요</strong>
              <p>{String(urlNotice).replace(/[.!?]?\s*$/, '.')} 동의서의 수집 목적, 수집 항목, 보유기간 문구를 복사해서 붙여넣으면 바로 분석해 드려요.</p>
              <button type="button" className="linklike" onClick={() => onModeChange('text')}>텍스트로 붙여넣기 →</button>
            </div>
          )}

          <button type="submit" className="primary">분석 시작하기</button>
          <p className="fine">입력하신 내용은 필수항목 누락 · 모호한 표현 · 과도한 정보 수집 여부를 검토하는 데만 사용돼요. AI 분석 시 문구가 OpenAI API로 전송되니, 실제 응답자 개인정보는 넣지 마세요.</p>
        </div>
      </form>

      <section className="scope">
        <h2>이런 항목을 점검해요</h2>
        <ul>
          {SCOPE.map(([g, d]) => <li key={g}><b>{g}</b><span>{d}</span></li>)}
        </ul>
      </section>
    </>
  );
}
