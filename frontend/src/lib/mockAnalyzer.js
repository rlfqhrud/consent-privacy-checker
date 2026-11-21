// 규칙 기반 분석 (백엔드 AI 분석을 쓸 수 없을 때의 대체 분석기 · lib/api.js 참고)
// docs/Main.dc.html 의 analyze(text)를 동작 변경 없이 옮긴 순수 함수.
// 규칙을 고치면 tests/analyzer.test.js(정확도 검증표 25종)가 통과해야 한다.
//
// 반환값
//   credits: { '1a': 0|1, ... '4b': 0|1 }  — 점검 항목 10개 충족(1)/미충족(0)
//   cards:   [{ title, original, problem, suggestion, legal }]  — 수정 제안 카드
export function analyze(text) {
  const t = text || '';
  const grab = (re) => { const m = t.match(re); return m ? m[1].trim() : ''; };
  const lineOf = (re) => { const m = t.match(re); return m ? m[0].trim() : ''; };
  // 라벨 표기가 달라도(콜론, 탭, 줄바꿈, 표 복사) 값을 찾는다
  const LABELS = {
    purpose: '수집\\s*(?:및|·)?\\s*이용(?:하는)?\\s*(?:개인정보\\s*)?목적|수집\\s*목적|이용\\s*목적|Purpose(?:\\s*of\\s*(?:collection|use))?',
    items: '수집\\s*(?:및|·)?\\s*이용(?:하는)?\\s*개인정보\\s*항목|수집(?:하는)?\\s*(?:개인정보\\s*)?항목|개인정보\\s*항목|Items?\\s*collected|Data\\s*items?',
    period: '보유\\s*(?:및|·)?\\s*이용\\s*기간|보유\\s*기간|이용\\s*기간|Retention(?:\\s*period)?'
  };
  const extract = (key) => {
    const re = new RegExp('(?:' + LABELS[key] + ')[ \\t]*[:：]?[ \\t]*\\n?[ \\t]*([^\\n]+)', 'i');
    const m = t.match(re);
    if (!m) return { value: '', line: '' };
    const value = m[1].trim();
    if (!value || /^(?:수집|보유|이용)/.test(value)) return { value: '', line: '' };
    // 카드에 보여줄 원문 한 줄: 라벨 뒤 줄바꿈은 공백으로, 표에서 복사한 탭은 ': '로 정리
    return { value, line: m[0].replace(/\s*\n\s*/g, ' ').replace(/\t+/g, ': ').trim() };
  };
  const ex = { purpose: extract('purpose'), items: extract('items'), period: extract('period') };
  const purpose = ex.purpose.value, items = ex.items.value, period = ex.period.value;
  const purposeLine = ex.purpose.line, itemsLine = ex.items.line, periodLine = ex.period.line;

  const credits = {};
  const cards = [];
  const addCard = (c) => cards.push(c);

  // ① 필수항목 + ② 표현
  credits['1a'] = purpose ? 1 : 0;
  credits['1b'] = items ? 1 : 0;
  const vaguePeriod = /필요\s*시까지|필요한\s*기간|일정\s*기간|영구|목적\s*달성\s*시|종료\s*시|종료\s*후(?!\s*(?:\d|즉시|바로|한|두|세|네))|별도\s*고지\s*시까지/.test(period);
  const concretePeriod = /\d+\s*(?:일|주|개월|달|년)|\d{4}\s*[년.\-\/]\s*\d{1,2}|즉시\s*(?:파기|삭제)|(?:한|두|세|네|다섯|여섯|열)\s*(?:달|주|해)|(?:일|이|삼|육|십|십이)\s*개월|(?:일|이|삼|오|십)\s*년/.test(period);
  credits['1c'] = period ? 1 : 0;
  credits['2c'] = (period && !vaguePeriod && concretePeriod) ? 1 : 0;

  const purposeVague = /등\s*$|서비스\s*개선|마케팅|홍보|광고|이벤트\s*안내|향후/.test(purpose);
  const itemsVague = /(?:^|[\s,·、(])등(?=$|[\s,·、.)])/.test(items);
  credits['2a'] = !purpose ? 0 : (purposeVague ? 0 : 1);
  credits['2b'] = !items ? 0 : (itemsVague ? 0 : 1);

  // ③ 과도한 수집
  const cats = [
    [/주민\s*(?:등록\s*)?번호/, '주민등록번호'],
    [/주소|거주지/, '주소'],
    [/가족|혼인|배우자|결혼/, '가족·혼인 정보'],
    [/소득|재산|연봉|월급/, '소득·재산'],
    [/계좌\s*번호|카드\s*번호|신용\s*카드|체크\s*카드/, '금융정보']
  ];
  // "이메일 주소"는 거주지 주소가 아니므로 제외하고 판단
  const itemsForCat = items.replace(/(?:이메일|메일|e-?mail)\s*주소/gi, '');
  let hitCats = cats.filter(([re, name]) => {
    if (!re.test(itemsForCat)) return false;
    if (name === '주소' && /배송|택배|우편|발송/.test(purpose)) return false;
    if (name === '금융정보' && /환급|환불|지급|송금|입금|결제|정산|사례금/.test(purpose)) return false;
    return true;
  }).map(([, n]) => n);
  credits['3a'] = hitCats.length === 0 ? 1 : 0;
  const sensRe = /주민\s*(?:등록\s*)?번호|여권|운전\s*면허|외국인\s*등록|건강|병력|질병|질환|진단|혈압|혈당|약물|복용|처방|투약|치료|수술|입원|증상|장애|우울|임신|정신|종교|정치\s*성향|범죄|유전|생체/;
  const sensHit = (items.match(sensRe) || [''])[0];
  const sepConsent = /별도(?:의|로)?\s*동의/.test(t);
  credits['3b'] = (sensHit && !sepConsent) ? 0 : 1;

  // ④ 동의 절차
  const forcedLine = lineOf(/[^\n.]*(?:동의하셔야|동의해야|동의하지\s*않으(?:면|시면)[^\n.]*(?:없습니다|불가|제한|어렵)|동의하지\s*않(?:을\s*경우|는\s*경우|을\s*시)[^\n.]*(?:참여|진행|응답|이용|가입)[^\n.]*(?:없습니다|불가|제한|어렵)|거부\s*시[^\n.]*(?:참여|지원|진행|이용|가입)[^\n.]*(?:불가|제한|어렵))[^\n.]*/);
  const notice = /거부\s*(?:하실\s*|할\s*)?(?:권리|수\s*있)|거부(?:하셔도|해도|하더라도)|동의하지\s*(?:않으셔도|않아도|않을\s*수)|동의\s*거부\s*시|동의한\s*사람에\s*한해|동의\s*여부(?:와|에)?\s*관계\s*없이|불이익(?:은|이)?\s*없|원치\s*않|응하지\s*않으셔도/.test(t);
  credits['4b'] = forcedLine ? 0 : 1;
  credits['4a'] = notice ? 1 : 0;

  // 카드 생성
  if (!purpose) addCard({ title: '수집·이용 목적 누락', original: '(수집 목적이 기재되지 않음)', problem: '법정 필수 고지사항인 수집·이용 목적이 없습니다.', suggestion: '수집 목적: 설문조사 응답자 기프티콘 발송', legal: '개인정보보호법 제15조제2항 — 수집·이용 목적을 정보주체에게 알리고 동의를 받아야 합니다.' });
  else if (purposeVague) addCard({ title: '수집 목적 표현 모호', original: purposeLine || purpose, problem: '"서비스 개선", "마케팅", "향후", 끝의 "등" 같은 표현은 목적을 특정할 수 없고, 다른 목적이 함께 끼어들 수 있습니다.', suggestion: '수집 목적을 이번 조사에 필요한 것만 구체적으로 적고, 이벤트·홍보 안내는 선택 동의로 분리하세요.', legal: '개인정보보호법 제15조제2항(목적 고지), 제16조제1항(목적에 필요한 최소한의 수집)' });
  if (!items) addCard({ title: '수집 항목 누락', original: '(수집 항목이 기재되지 않음)', problem: '법정 필수 고지사항인 수집 항목이 없습니다.', suggestion: '수집 항목: 이름, 휴대폰 전화번호', legal: '개인정보보호법 제15조제2항 — 수집하는 개인정보의 항목을 알려야 합니다.' });
  else if (itemsVague) addCard({ title: '수집 항목 표현 모호', original: itemsLine || items, problem: '포괄적 표현("등")으로 수집 항목이 불특정합니다.', suggestion: '수집 항목: ' + items.replace(/\s*등\s*$/, '').trim() + ' (해당 항목만 수집)', legal: '개인정보보호법 제15조제2항 — 수집 항목은 구체적으로 특정해 고지해야 합니다.' });
  if (!period) addCard({ title: '보유·이용 기간 누락', original: '(보유 및 이용 기간이 기재되지 않음)', problem: '법정 필수 고지사항인 보유·이용 기간이 없고, 파기 시점도 알 수 없습니다.', suggestion: '보유 및 이용 기간: 입력일로부터 6개월 후 파기', legal: '개인정보보호법 제15조제2항(보유·이용 기간 고지), 제21조(개인정보의 파기)' });
  else if (vaguePeriod) addCard({ title: '보유기간 표현 모호', original: periodLine || period, problem: concretePeriod ? '일부 자료는 기간이 구체적이지만, "종료 시까지" 같은 표현이 하나라도 있으면 파기 시점을 특정할 수 없어 "기간이 구체적" 항목이 미충족으로 판정돼요.' : '"필요시까지" 같은 표현은 파기 시점을 특정할 수 없어 "기간이 구체적" 항목이 미충족으로 판정돼요.', suggestion: '보유 및 이용 기간: 입력일로부터 6개월 후 파기 (자료별로 기간과 파기 시점을 날짜·기간으로 적기)', legal: '개인정보보호법 제15조제2항(보유·이용 기간 고지), 제21조(개인정보의 파기) — 보유기간을 구체적으로 알리고 기간이 지나면 지체 없이 파기해야 합니다.' });
  if (hitCats.length > 0) addCard({ title: '목적과 무관한 과도한 수집', original: itemsLine || items, problem: hitCats.join(', ') + ' 항목이 수집 목적(' + (purpose || '미기재') + ')에 필요해 보이지 않습니다.', suggestion: '목적 달성에 꼭 필요한 항목만 남기고 삭제하세요. (예: 이름, 휴대폰 전화번호)', legal: '개인정보보호법 제16조제1항 — 목적에 필요한 최소한의 개인정보만 수집해야 하며, 최소 수집 입증책임은 처리자에게 있습니다.' });
  if (credits['3b'] === 0) addCard({ title: '민감·고유식별정보 수집 (치명)', original: itemsLine || items, problem: '"' + sensHit + '" 관련 정보는 민감정보 또는 고유식별정보로, 일반 동의와 분리한 별도 동의 없이 수집할 수 없습니다.', suggestion: '연구에 꼭 필요하지 않다면 삭제하고, 필요하다면 별도 동의 문항을 만들어 분리하세요.', legal: '개인정보보호법 제23조(민감정보), 제24조(고유식별정보) — 별도 동의 또는 법령 근거가 필요합니다.' });
  if (forcedLine) addCard({ title: '강제 동의 (치명)', original: forcedLine, problem: '필수 목적 외 정보까지 동의해야만 참여할 수 있게 하면 동의가 자유롭지 않습니다. 선택사항은 동의하지 않아도 서비스를 거부할 수 없습니다.', suggestion: '필수 동의(설문 진행에 꼭 필요한 항목)와 선택 동의(이벤트·후속 연락)를 분리하고, 선택 동의를 거부해도 참여할 수 있다고 적으세요.', legal: '개인정보보호법 제22조제5항 — 선택사항에 동의하지 않는다는 이유로 재화·서비스 제공을 거부해서는 안 됩니다. (과태료 3천만원 이하)' });
  else if (!notice) addCard({ title: '동의 거부권·불이익 미고지', original: '(동의 거부 권리와 불이익에 대한 안내가 없음)', problem: '동의를 거부할 권리가 있다는 사실과 거부 시 불이익을 알려야 합니다.', suggestion: '"동의하지 않으셔도 설문 참여는 가능하며, 기프티콘 발송에서만 제외됩니다."', legal: '개인정보보호법 제15조제2항 — 동의 거부 권리 및 거부에 따른 불이익이 있다면 그 내용을 알려야 합니다.' });

  return { credits, cards };
}
