// 회귀 테스트: 정확도 검증표(docs/정확도_검증표.xlsx) 25종 × 10항목
// 분석기(src/lib/mockAnalyzer.js)를 고칠 때마다 이 테스트가 통과해야 한다.
// 검증표를 고쳤다면 `python tools/xlsx_to_fixture.py`로 fixture를 다시 만든다.
import { describe, it, expect } from 'vitest';
import { analyze } from '../src/lib/mockAnalyzer.js';
import { CHECK_IDS } from '../src/lib/checks.js';
import samples from './fixtures/accuracy_samples.json';

// 알려진 한계: 정답과 달라도 실패로 보지 않는 샘플
// (it.fails 로 표시 — 규칙이 바뀌어 정답과 일치하게 되면 이 목록에서 빼라고 알려준다)
const KNOWN_LIMITATIONS = {
  R03: '라벨 없이 문장으로만 쓴 동의서. 규칙 기반으로는 읽지 못하는 구조적 한계 (LLM 단계에서 해결 예정)'
};

// 6주차 보고서 기준 수치 (25종 × 10항목 = 250)
const BASELINE = { matchedItems: 244, fullMatchSamples: 24 };

const pick = (credits) => Object.fromEntries(CHECK_IDS.map((id) => [id, credits[id]]));

describe('정확도 검증표 25종 — 항목별 정답 비교', () => {
  it('샘플 25종이 모두 들어 있다', () => {
    expect(samples).toHaveLength(25);
  });

  for (const s of samples) {
    const reason = KNOWN_LIMITATIONS[s.id];
    if (reason) {
      it.fails(`[알려진 한계] ${s.name} — ${reason}`, () => {
        expect(pick(analyze(s.text).credits)).toEqual(s.expected);
      });
    } else {
      it(s.name, () => {
        expect(pick(analyze(s.text).credits)).toEqual(s.expected);
      });
    }
  }

  it(`전체 일치율이 기준(${BASELINE.matchedItems}/250, 완전 일치 ${BASELINE.fullMatchSamples}/25) 이상이다`, () => {
    let matched = 0;
    let full = 0;
    const misses = [];
    for (const s of samples) {
      const credits = analyze(s.text).credits;
      const wrong = CHECK_IDS.filter((id) => credits[id] !== s.expected[id]);
      matched += CHECK_IDS.length - wrong.length;
      if (wrong.length === 0) full++;
      else misses.push(`${s.id}(${wrong.join(',')})`);
    }
    const total = samples.length * CHECK_IDS.length;
    console.log(
      `[정확도] 항목 일치 ${matched}/${total} = ${((matched / total) * 100).toFixed(1)}% · ` +
      `완전 일치 ${full}/${samples.length} · 불일치: ${misses.join(' ') || '없음'}`
    );
    expect(matched).toBeGreaterThanOrEqual(BASELINE.matchedItems);
    expect(full).toBeGreaterThanOrEqual(BASELINE.fullMatchSamples);
  });
});
