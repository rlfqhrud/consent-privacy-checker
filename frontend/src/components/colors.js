// 판정 색 (docs/Main.dc.html 과 동일)
export const PASS = { color: '#1E8E3E', bg: '#E8F5E9' };
export const FAIL = { color: '#D70015', bg: '#FCE9E9' };
export const WARN = { color: '#B25E09', bg: '#FEF3E7' };

// scoring.summarize()의 tone → 점수 색
export const TONE = { ok: PASS, warn: WARN, critical: FAIL };
