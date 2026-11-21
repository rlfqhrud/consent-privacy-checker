// 규칙 분석기로 판정만 뽑는다: node frontend/scripts/rules_predict.mjs < samples.json  → {id: credits}
import { analyze } from '../src/lib/mockAnalyzer.js';
let raw = '';
for await (const c of process.stdin) raw += c;
const out = {};
for (const s of JSON.parse(raw)) out[s.id] = analyze(s.text).credits;
process.stdout.write(JSON.stringify(out));
