import { useState } from 'react';
import InputPage from './pages/InputPage.jsx';
import LoadingPage from './pages/LoadingPage.jsx';
import ResultPage from './pages/ResultPage.jsx';
import { analyze } from './lib/mockAnalyzer.js';

// 화면 흐름: 입력(edit) → 분석 중(loading) → 결과(result) → "다시 분석하기"로 입력 복귀
export default function App() {
  const [screen, setScreen] = useState('edit');
  const [mode, setMode] = useState('url');
  const [urlValue, setUrlValue] = useState('');
  const [textValue, setTextValue] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [urlNotice, setUrlNotice] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const changeMode = (next) => {
    setMode(next);
    setErrorMessage('');
    setUrlNotice(false);
  };

  const onUrlChange = (v) => {
    setUrlValue(v);
    setUrlNotice(false);
  };

  const loadSample = (text) => {
    setTextValue(text);
    setErrorMessage('');
  };

  const onSubmit = () => {
    if (mode === 'url') {
      const v = (urlValue || '').trim();
      if (!v) {
        setErrorMessage('URL을 입력해 주세요');
        return;
      }
      if (!/^https?:\/\//i.test(v)) {
        setErrorMessage('http:// 또는 https:// 로 시작하는 URL을 입력해 주세요');
        return;
      }
      // 링크 안의 동의서는 서버가 대신 읽어 와야 해서(백엔드 단계) 가짜 결과를 보여주지 않는다
      setUrlNotice(true);
      setErrorMessage('');
      return;
    }
    const v = (textValue || '').trim();
    if (v.length < 10) {
      setErrorMessage('동의서 내용을 입력해 주세요');
      return;
    }
    setScreen('loading');
    setErrorMessage('');
    setAnalysis(analyze(textValue || ''));
    setTimeout(() => setScreen('result'), 1600);
  };

  const reset = () => {
    setScreen('edit');
    setErrorMessage('');
  };

  return (
    <div style={{ width: '100%', minHeight: 900, background: '#ffffff', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '96px 24px 120px' }}>
      <div style={{ width: '100%', maxWidth: 560, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Logo />
        {screen === 'edit' && (
          <InputPage
            mode={mode}
            urlValue={urlValue}
            textValue={textValue}
            errorMessage={errorMessage}
            urlNotice={mode === 'url' && urlNotice}
            onModeChange={changeMode}
            onUrlChange={onUrlChange}
            onTextChange={setTextValue}
            onLoadSample={loadSample}
            onSubmit={onSubmit}
          />
        )}
        {screen === 'loading' && <LoadingPage />}
        {screen === 'result' && analysis && <ResultPage analysis={analysis} onReset={reset} />}
      </div>
    </div>
  );
}

function Logo() {
  return (
    <div style={{ width: 44, height: 44, borderRadius: 12, background: '#1D1D1F', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 4H14L19 9V20C19 20.5523 18.5523 21 18 21H6C5.44772 21 5 20.5523 5 20V5C5 4.44772 5.44772 4 6 4Z" stroke="#ffffff" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M14 4V9H19" stroke="#ffffff" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M8.5 13.5L10.5 15.5L15 11" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
