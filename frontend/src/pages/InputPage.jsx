import { DEMO_TEXT } from '../data/samples/demo.js';

const tabStyle = (active) => ({
  padding: '9px 18px',
  border: 'none',
  borderRadius: 8,
  background: active ? '#ffffff' : 'transparent',
  color: active ? '#1D1D1F' : '#86868B',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'inherit',
  boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
});

const labelStyle = { display: 'block', fontSize: 13, fontWeight: 500, color: '#86868B', marginBottom: 8 };
const linkButton = { padding: 0, border: 'none', background: 'none', fontWeight: 500, color: '#0071E3', cursor: 'pointer', fontFamily: 'inherit' };

export default function InputPage({ mode, urlValue, textValue, errorMessage, urlNotice, onModeChange, onUrlChange, onTextChange, onLoadSample, onSubmit }) {
  const isUrl = mode === 'url';
  return (
    <>
      <h1 style={{ margin: '0 0 10px', fontSize: 32, lineHeight: 1.25, fontWeight: 600, letterSpacing: '-0.02em', color: '#1D1D1F', textAlign: 'center' }}>동의서, 놓친 부분은 없을까요</h1>
      <p style={{ margin: '0 0 40px', fontSize: 17, lineHeight: 1.5, color: '#86868B', textAlign: 'center', maxWidth: 420 }}>설문·연구 동의서를 분석해 누락된 항목과 모호한 표현을 짚어드립니다</p>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ display: 'inline-flex', padding: 3, background: '#F5F5F7', borderRadius: 10, marginBottom: 24 }}>
          <button onClick={() => onModeChange('url')} style={tabStyle(isUrl)}>URL 입력</button>
          <button onClick={() => onModeChange('text')} style={tabStyle(!isUrl)}>텍스트 붙여넣기</button>
        </div>

        <div style={{ width: '100%', marginBottom: 8 }}>
          {isUrl ? (
            <>
              <label htmlFor="url-field" style={labelStyle}>네이버폼 링크</label>
              <input
                id="url-field"
                type="text"
                value={urlValue}
                onChange={(e) => onUrlChange(e.target.value)}
                placeholder="https://form.naver.com/..."
                style={{ width: '100%', height: 52, padding: '0 16px', fontSize: 16, color: '#1D1D1F', background: '#ffffff', border: '1px solid #D2D2D7', borderRadius: 12, outline: 'none', fontFamily: 'inherit' }}
              />
            </>
          ) : (
            <>
              <label htmlFor="text-field" style={labelStyle}>수집 목적 · 수집 항목 · 보유 및 파기 기한</label>
              <textarea
                id="text-field"
                value={textValue}
                onChange={(e) => onTextChange(e.target.value)}
                placeholder={'수집 목적: 설문조사 응답자 기프티콘 보상\n수집 항목: 이름, 휴대폰 전화번호\n보유 및 이용 기간: 입력일로부터 6개월 후 파기'}
                style={{ width: '100%', height: 160, padding: '14px 16px', fontSize: 16, lineHeight: 1.5, color: '#1D1D1F', background: '#ffffff', border: '1px solid #D2D2D7', borderRadius: 12, outline: 'none', resize: 'none', fontFamily: 'inherit', whiteSpace: 'pre-wrap' }}
              />
              <p style={{ margin: '8px 0 0', fontSize: 13, color: '#AEAEB2' }}>동의서에 적힌 수집 목적, 수집 항목, 보유기간(파기일)을 그대로 옮겨 적어주세요</p>
              <button onClick={() => onLoadSample(DEMO_TEXT)} style={{ ...linkButton, marginTop: 8, fontSize: 13 }}>샘플 불러오기</button>
            </>
          )}
        </div>

        {errorMessage && (
          <p style={{ width: '100%', margin: '0 0 8px', fontSize: 13, color: '#D70015', textAlign: 'left' }}>{errorMessage}</p>
        )}

        {urlNotice && (
          <div style={{ width: '100%', margin: '8px 0 0', padding: 16, background: '#F5F5F7', borderRadius: 12 }}>
            <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 600, color: '#1D1D1F' }}>링크 안의 동의서는 아직 자동으로 읽어 올 수 없어요</p>
            <p style={{ margin: '0 0 12px', fontSize: 13, lineHeight: 1.5, color: '#6E6E73' }}>네이버폼 내용을 가져오는 기능은 서버 연동 단계에서 추가될 예정이에요. 지금은 동의서의 수집 목적, 수집 항목, 보유기간 문구를 복사해서 붙여넣으면 바로 분석해 드려요.</p>
            <button onClick={() => onModeChange('text')} style={{ ...linkButton, fontSize: 14 }}>텍스트로 붙여넣기 →</button>
          </div>
        )}

        <button onClick={onSubmit} style={{ width: '100%', height: 52, marginTop: 16, background: '#0071E3', color: '#ffffff', fontSize: 17, fontWeight: 500, border: 'none', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit' }}>분석 시작하기</button>

        <p style={{ margin: '16px 0 0', fontSize: 13, color: '#AEAEB2', textAlign: 'center' }}>입력하신 내용은 필수항목 누락 · 모호한 표현 · 과도한 정보 수집 여부를 검토하는 데 사용돼요</p>
      </div>
    </>
  );
}
