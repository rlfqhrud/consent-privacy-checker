import { describe, it, expect } from 'vitest';
import { summarize } from '../src/lib/scoring.js';
import { analyze } from '../src/lib/mockAnalyzer.js';
import { CHECK_IDS } from '../src/lib/checks.js';
import { DEMO_TEXT } from '../src/data/samples/demo.js';
import samples from './fixtures/accuracy_samples.json';

const allPass = () => Object.fromEntries(CHECK_IDS.map((id) => [id, 1]));
const sample = (id) => samples.find((s) => s.id === id).text;

describe('항목 충족률 점수', () => {
  it('충족 항목 수 ÷ 10 × 100 (가중치 없음: 어느 항목이 빠져도 같은 점수)', () => {
    expect(summarize(allPass()).score).toBe(100);
    for (const id of CHECK_IDS) {
      const r = summarize({ ...allPass(), [id]: 0 });
      expect(r.score).toBe(90);
      expect(r.passedCount).toBe(9);
    }
    expect(summarize({}).score).toBe(0);
  });

  it('법 위반 소지(3b, 4b)는 점수와 별도로 건수만 센다', () => {
    const r = summarize({ ...allPass(), '3b': 0, '4b': 0 });
    expect(r.score).toBe(80);
    expect(r.criticalCount).toBe(2);
    expect(r.tone).toBe('critical');
    expect(summarize({ ...allPass(), '2a': 0 }).tone).toBe('warn');
    expect(summarize(allPass()).tone).toBe('ok');
  });

  it('그룹별 요약 칩: ① 3개 · ② 3개 · ③ 2개 · ④ 2개', () => {
    const g = summarize({ ...allPass(), '2b': 0, '2c': 0 }).groupSummary;
    expect(g.map((x) => `${x.group} ${x.ok}/${x.total}`)).toEqual([
      '① 필수항목 3/3', '② 표현 1/3', '③ 과도한 수집 2/2', '④ 동의 절차 2/2'
    ]);
    expect(g.map((x) => x.allPassed)).toEqual([true, false, true, true]);
  });

  it('6주차 보고서 예시와 같은 결과', () => {
    // 1주차 [X] 예시("등", "필요시까지") → 80%, 8 / 10
    const demo = summarize(analyze(DEMO_TEXT).credits);
    expect([demo.score, demo.passedCount, demo.criticalCount]).toEqual([80, 8, 0]);
    // 항목 누락 + 강제 동의 샘플 → 60%, 법 위반 소지 1건
    const h12 = summarize(analyze(sample('H12')).credits);
    expect([h12.score, h12.criticalCount]).toEqual([60, 1]);
    // 과도 수집 + 종교 → 80%, 법 위반 소지 1건
    const r05 = summarize(analyze(sample('R05')).credits);
    expect([r05.score, r05.criticalCount]).toEqual([80, 1]);
  });
});
