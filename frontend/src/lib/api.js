// 백엔드 API 호출 + 규칙 기반 대체 분석
// 개발 중에는 vite.config.js 의 proxy 가 /api 를 http://localhost:8000 으로 넘긴다.
import { analyze as analyzeRules } from './mockAnalyzer.js';

const API_BASE = import.meta.env?.VITE_API_BASE ?? '';

async function post(path, body, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detail = data.detail;
      const message = typeof detail === 'object' && detail ? detail.message : '서버 오류가 났어요';
      const err = new Error(message);
      err.status = res.status;
      err.code = typeof detail === 'object' && detail ? detail.code : undefined;
      throw err;
    }
    return data;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('서버 응답이 너무 늦어요');
    if (e instanceof TypeError) throw new Error('분석 서버에 연결하지 못했어요');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// AI 분석을 먼저 시도하고, 서버가 없거나 실패하면 규칙 기반으로 분석한다.
// 반환: { credits, cards, engine: 'llm'|'rules', fallbackReason?, details?, sources?, model? }
export async function runAnalysis(text, { remote = post } = {}) {
  try {
    const r = await remote('/api/analyze', { text }, 120000);
    return { ...r, engine: 'llm' };
  } catch (e) {
    if (e.status === 413) throw e; // 너무 긴 입력은 규칙 분석으로 넘기지 않고 알린다
    return { ...analyzeRules(text), engine: 'rules', fallbackReason: e.message };
  }
}

// 폼 링크에서 동의 문구를 읽어 온다. 실패하면 Error(message)
export async function extractFromUrl(url, { remote = post } = {}) {
  const r = await remote('/api/extract', { url }, 45000);
  return r.text;
}
