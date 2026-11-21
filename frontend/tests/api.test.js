// 백엔드 연동 로직: AI 분석 성공 / 실패 시 규칙 기반 대체 / 링크 읽기
import { describe, it, expect } from 'vitest';
import { runAnalysis, extractFromUrl } from '../src/lib/api.js';
import { analyze } from '../src/lib/mockAnalyzer.js';
import { DEMO_TEXT } from '../src/data/samples/demo.js';

const fail = (message, status) => async () => {
  const e = new Error(message);
  e.status = status;
  throw e;
};

describe('runAnalysis', () => {
  it('서버 결과를 engine=llm 으로 돌려준다', async () => {
    const server = { credits: { '1a': 1 }, cards: [], details: {} };
    const r = await runAnalysis(DEMO_TEXT, { remote: async (path, body) => {
      expect(path).toBe('/api/analyze');
      expect(body.text).toBe(DEMO_TEXT);
      return server;
    } });
    expect(r.engine).toBe('llm');
    expect(r.credits).toEqual(server.credits);
  });

  it('API 키 없음(503)·연결 실패면 규칙 기반 결과와 이유', async () => {
    for (const remote of [fail('OPENAI_API_KEY 가 설정되지 않았어요', 503), fail('분석 서버에 연결하지 못했어요')]) {
      const r = await runAnalysis(DEMO_TEXT, { remote });
      expect(r.engine).toBe('rules');
      expect(r.credits).toEqual(analyze(DEMO_TEXT).credits);
      expect(r.fallbackReason).toBeTruthy();
    }
  });

  it('너무 긴 입력(413)은 대체하지 않고 오류', async () => {
    await expect(runAnalysis('x'.repeat(30), { remote: fail('동의서가 너무 길어요', 413) })).rejects.toThrow('너무 길어요');
  });
});

describe('extractFromUrl', () => {
  it('읽어 온 문구를 돌려준다', async () => {
    const text = await extractFromUrl('https://form.naver.com/x', { remote: async (path, body) => {
      expect(path).toBe('/api/extract');
      expect(body.url).toBe('https://form.naver.com/x');
      return { text: '수집 목적: 테스트' };
    } });
    expect(text).toBe('수집 목적: 테스트');
  });

  it('실패 메시지를 그대로 전달', async () => {
    await expect(extractFromUrl('https://x', { remote: fail('폼 페이지를 열지 못했어요', 502) })).rejects.toThrow('폼 페이지를 열지 못했어요');
  });
});

describe('규칙 분석기 카드 원문 정리', () => {
  it('라벨이 따로 한 줄이거나 탭으로 구분돼도 카드 원문은 한 줄', () => {
    const r = analyze('수집 항목\n이름, 연락처 등\n수집 목적\t경품 발송\n보유 기간\t필요시까지');
    for (const c of r.cards) {
      expect(c.original).not.toMatch(/[\n\t]/);
    }
    expect(r.cards.find((c) => c.title === '수집 항목 표현 모호').original).toBe('수집 항목 이름, 연락처 등');
  });
});
