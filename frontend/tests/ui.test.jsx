// 화면 렌더링 확인 (추가 패키지 없이 react-dom/server 로 HTML을 만들어 문구를 확인)
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import InputPage from '../src/pages/InputPage.jsx';
import ResultPage from '../src/pages/ResultPage.jsx';
import { analyze } from '../src/lib/mockAnalyzer.js';
import { DEMO_TEXT } from '../src/data/samples/demo.js';
import samples from './fixtures/accuracy_samples.json';

const noop = () => {};
const input = (props) => renderToStaticMarkup(
  <InputPage mode="url" urlValue="" textValue="" errorMessage="" urlNotice={false}
    onModeChange={noop} onUrlChange={noop} onTextChange={noop} onLoadSample={noop} onSubmit={noop} {...props} />
);
const result = (text, extra = {}) => renderToStaticMarkup(<ResultPage analysis={{ ...analyze(text), ...extra }} onReset={noop} />);

describe('입력 화면', () => {
  it('URL / 텍스트 탭', () => {
    const html = input();
    expect(html).toContain('URL 입력');
    expect(html).toContain('텍스트 붙여넣기');
    expect(html).toContain('네이버폼 링크');
  });

  it('링크를 못 읽으면 가짜 결과 대신 이유와 텍스트 탭 전환 버튼', () => {
    const html = input({ urlNotice: '폼에서 개인정보 동의 문구를 찾지 못했어요.' });
    expect(html).toContain('링크에서 동의서를 읽어 오지 못했어요');
    expect(html).toContain('폼에서 개인정보 동의 문구를 찾지 못했어요.');
    expect(html).toContain('텍스트로 붙여넣기 →');
  });

  it('AI 분석 시 외부 API 전송 안내', () => {
    expect(input()).toContain('OpenAI API로 전송');
  });

  it('텍스트 탭에 샘플 불러오기 버튼', () => {
    const html = input({ mode: 'text' });
    expect(html).toContain('샘플 불러오기');
    expect(html).not.toContain('네이버폼 링크');
  });

  it('오류 문구 표시', () => {
    expect(input({ errorMessage: 'URL을 입력해 주세요' })).toContain('URL을 입력해 주세요');
  });
});

describe('결과 화면', () => {
  it('1주차 예시: 80% · 8 / 10 항목 충족 · 그룹 칩 · 체크리스트 10개 · 카드 2개', () => {
    const html = result(DEMO_TEXT);
    expect(html).toContain('항목 충족률');
    expect(html).toMatch(/>80<span/);
    expect(html).toContain('8 / 10 항목 충족');
    expect(html).not.toContain('법 위반 소지 항목');
    for (const chip of ['① 필수항목 3/3', '② 표현 1/3', '③ 과도한 수집 2/2', '④ 동의 절차 2/2']) expect(html).toContain(chip);
    expect(html.match(/>(충족|미충족)<\/span>/g)).toHaveLength(10);
    expect(html).toContain('수집 항목 표현 모호');
    expect(html).toContain('보유기간 표현 모호');
    expect(html).toContain('점수는 왜 이렇게 계산하나요?');
    // 아코디언·패널은 처음엔 접혀 있다
    expect(html).not.toContain('법적 근거</p>');
    expect(html).not.toContain('계산 방법');
  });

  it('법 위반 소지 N건 표시 (H12: 강제 동의)', () => {
    const html = result(samples.find((s) => s.id === 'H12').text);
    expect(html).toContain('6 / 10 항목 충족');
    expect(html).toContain('법 위반 소지 항목 1건 (점수와 별도 표시)');
  });

  it('AI 분석 결과: 배지 · 미충족 항목 이유 · 참고 조항', () => {
    const html = result(DEMO_TEXT, {
      engine: 'llm',
      details: { '2b': { evidence: '이름, 휴대폰 전화번호 등', reason: '항목이 "등"으로 끝나 범위가 열려 있어요' } },
      sources: [{ id: 'PIPA-15-2', citation: '개인정보 보호법 제15조제2항(동의를 받을 때 알려야 할 사항)' }]
    });
    expect(html).toContain('AI 분석 · 법 조항 검색(RAG)');
    expect(html).toContain('항목이 &quot;등&quot;으로 끝나 범위가 열려 있어요');
    expect(html).toContain('참고한 법 조항</p><ul><li>개인정보 보호법 제15조제2항');
  });

  it('규칙 기반으로 대체되면 이유 표시', () => {
    const html = result(DEMO_TEXT, { engine: 'rules', fallbackReason: '분석 서버에 연결하지 못했어요' });
    expect(html).toContain('규칙 기반 분석');
    expect(html).toContain('AI 분석을 쓸 수 없어 규칙으로 점검했어요 (분석 서버에 연결하지 못했어요)');
  });

  it('링크로 분석하면 읽어 온 문구 패널', () => {
    expect(result(DEMO_TEXT, { source: 'url', sourceText: DEMO_TEXT })).toContain('링크에서 읽어 온 동의 문구');
  });

  it('문제가 없으면 안내 문구', () => {
    const html = result(samples.find((s) => s.id === 'H01').text);
    expect(html).toContain('10 / 10 항목 충족');
    expect(html).toContain('수정이 필요한 부분이 발견되지 않았어요');
  });
});
