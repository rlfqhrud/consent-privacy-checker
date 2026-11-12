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
const result = (text) => renderToStaticMarkup(<ResultPage analysis={analyze(text)} onReset={noop} />);

describe('입력 화면', () => {
  it('URL / 텍스트 탭', () => {
    const html = input();
    expect(html).toContain('URL 입력');
    expect(html).toContain('텍스트 붙여넣기');
    expect(html).toContain('네이버폼 링크');
  });

  it('링크 제출 시 가짜 결과 대신 안내와 텍스트 탭 전환 버튼', () => {
    const html = input({ urlNotice: true });
    expect(html).toContain('링크 안의 동의서는 아직 자동으로 읽어 올 수 없어요');
    expect(html).toContain('텍스트로 붙여넣기 →');
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

  it('문제가 없으면 안내 문구', () => {
    const html = result(samples.find((s) => s.id === 'H01').text);
    expect(html).toContain('10 / 10 항목 충족');
    expect(html).toContain('수정이 필요한 부분이 발견되지 않았어요');
  });
});
