import { useState } from 'react';
import InputPage from './pages/InputPage.jsx';
import LoadingPage from './pages/LoadingPage.jsx';
import ResultPage from './pages/ResultPage.jsx';
import { runAnalysis, extractFromUrl } from './lib/api.js';

const MIN_LOADING_MS = 1200; // 너무 빨리 끝나도 분석 중 화면이 깜빡이지 않게
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// 화면 흐름: 입력(edit) → 분석 중(loading) → 결과(result) → "다시 분석하기"로 입력 복귀
export default function App() {
  const [screen, setScreen] = useState('edit');
  const [loadingStep, setLoadingStep] = useState('analyze');
  const [mode, setMode] = useState('url');
  const [urlValue, setUrlValue] = useState('');
  const [textValue, setTextValue] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [urlNotice, setUrlNotice] = useState('');
  const [analysis, setAnalysis] = useState(null);

  const changeMode = (next) => {
    setMode(next);
    setErrorMessage('');
    setUrlNotice('');
  };

  const onUrlChange = (v) => {
    setUrlValue(v);
    setUrlNotice('');
  };

  const loadSample = (text) => {
    setTextValue(text);
    setErrorMessage('');
  };

  const analyzeText = async (text, source) => {
    setLoadingStep('analyze');
    const started = Date.now();
    try {
      const result = await runAnalysis(text);
      await wait(Math.max(0, MIN_LOADING_MS - (Date.now() - started)));
      setAnalysis({ ...result, sourceText: text, source });
      setScreen('result');
    } catch (e) {
      setScreen('edit');
      setErrorMessage(e.message);
    }
  };

  const onSubmit = async () => {
    setErrorMessage('');
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
      setUrlNotice('');
      setLoadingStep('extract');
      setScreen('loading');
      let text;
      try {
        text = await extractFromUrl(v);
      } catch (e) {
        // 링크를 못 읽으면 가짜 결과 대신 이유와 텍스트 붙여넣기 안내를 보여준다
        setScreen('edit');
        setUrlNotice(e.message);
        return;
      }
      setTextValue(text);
      await analyzeText(text, 'url');
      return;
    }
    const v = (textValue || '').trim();
    if (v.length < 10) {
      setErrorMessage('동의서 내용을 입력해 주세요');
      return;
    }
    setScreen('loading');
    await analyzeText(textValue, 'text');
  };

  const reset = () => {
    setScreen('edit');
    setErrorMessage('');
  };

  return (
    <div className="app">
      <header className="topbar">
        <Logo />
        <span>동의서 점검</span>
        <small>개인정보 보호법 기준 · 참고용</small>
      </header>
      <main className="main">
        {screen === 'edit' && (
          <InputPage
            mode={mode}
            urlValue={urlValue}
            textValue={textValue}
            errorMessage={errorMessage}
            urlNotice={mode === 'url' ? urlNotice : ''}
            onModeChange={changeMode}
            onUrlChange={onUrlChange}
            onTextChange={setTextValue}
            onLoadSample={loadSample}
            onSubmit={onSubmit}
          />
        )}
        {screen === 'loading' && <LoadingPage step={loadingStep} />}
        {screen === 'result' && analysis && <ResultPage analysis={analysis} onReset={reset} />}
      </main>
    </div>
  );
}

function Logo() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect width="28" height="28" rx="7" fill="#2A9FDD" />
      <path d="M9 6.5h7l4 4V21a.5.5 0 0 1-.5.5h-10.5A.5.5 0 0 1 8.5 21V7a.5.5 0 0 1 .5-.5Z" fill="#fff" />
      <path d="M11.5 15l2 2 3.5-4" stroke="#0A7EBF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
