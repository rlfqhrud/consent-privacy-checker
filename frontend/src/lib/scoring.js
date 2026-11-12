// 점수 계산 (6주차 항목 충족률 방식)
// 점수 = round(충족 항목 수 / 10 × 100). 가중치·부분 점수·등급 구간 없음.
// 법 위반 소지 항목(CRITICAL)은 점수와 별도로 건수만 센다.
import { CHECKS, GROUPS, CRITICAL } from './checks.js';

export function summarize(credits) {
  const passedCount = CHECKS.filter((c) => credits[c.id] === 1).length;
  const total = CHECKS.length;
  const failedCount = total - passedCount;
  const score = Math.round((passedCount / total) * 100);
  const criticalCount = CRITICAL.filter((id) => credits[id] !== 1).length;

  // 점수 색: 법 위반 소지가 있으면 critical, 미충족이 있으면 warn, 모두 충족이면 ok
  const tone = criticalCount > 0 ? 'critical' : failedCount > 0 ? 'warn' : 'ok';

  // 유형별 요약: 그룹별 충족 수 (가중치 없이 개수만)
  const groupSummary = GROUPS.map((group) => {
    const list = CHECKS.filter((c) => c.group === group);
    const ok = list.filter((c) => credits[c.id] === 1).length;
    return { group, ok, total: list.length, allPassed: ok === list.length };
  });

  const checklist = CHECKS.map((c) => ({ ...c, passed: credits[c.id] === 1 }));

  return { score, passedCount, failedCount, total, criticalCount, tone, groupSummary, checklist };
}
