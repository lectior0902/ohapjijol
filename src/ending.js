// 증거함, 기사 쓰기(보도 프레임), 엔딩 판정과 화면
import { G, S, app, save, evidenceById, personName, resetGame } from './state.js';
import { h, modal, toast } from './ui.js';
import { sfx } from './sound.js';

const testimonyText = (id) => {
  const sus = G.data.suspects.find(s => s.interrogation.result === id);
  const I = sus.interrogation;
  if (I.mode !== 'partial') return I.resultText;
  return S.suspects.park.full ? I.combine.text : I.combine.partialText;
};
const parkFull = () => S.testimony.includes('C-park') && S.suspects.park.full;
const outsideOf = (id) => ((evidenceById(id) || {}).proves || []).filter(p => p.outside).map(p => p.who);

function evCard(id) {
  const ev = evidenceById(id);
  const isT = id.startsWith('C-');
  const tags = (ev.tags || []).map(personName);
  return h('div', { class: 'ev-card' + (isT ? ' testimony' : '') + (ev.start ? ' start' : '') },
    h('div', { class: 'ev-head' },
      h('span', { class: 'ev-id' }, isT ? '증언' : id),
      h('b', null, ev.title + (id === 'C-park' && !S.suspects.park.full ? ' (일부 인정)' : '')),
      S.marks[id] ? h('span', { class: 'mark' }, S.marks[id]) : null),
    h('div', { class: 'ev-desc' }, isT ? testimonyText(id) : ev.desc),
    tags.length ? h('div', { class: 'ev-tags' }, tags.map(t => h('span', { class: 'tag' }, t))) : null);
}

export function evidenceView() {
  if (S.ui.ev === 'form') return formView();
  const pinCount = S.pinned.filter(x => !evidenceById(x).start).length;
  const order = G.data.evidence.map(e => e.id).filter(id => S.pinned.includes(id));
  return h('div', { class: 'app evidence' },
    h('div', { class: 'app-head' }, h('span', { class: 'back-sp' }), h('div', { class: 'app-title' }, '증거함'), h('span', { class: 'back-sp' })),
    h('div', { class: 'ev-body' },
      h('div', { class: 'ev-count' }, `핀 ${pinCount}/12 · 증언 카드 ${S.testimony.length}/4`),
      order.map(evCard),
      S.testimony.map(evCard),
      pinCount === 0 ? h('div', { class: 'empty' }, '폰 안의 기록에서 📌를 눌러 증거를 모은다.') : null,
      h('button', { class: 'write-btn', onclick: () => { S.ui.ev = 'form'; S.ui.scrollTop = 0; app.render(); } }, '📰 기사 쓰기')));
}

// ───────── 기사 쓰기 ─────────
function formView() {
  const F = G.data.form;
  S.ui.form = S.ui.form || { q1: 0, q2: 0 };
  const D = S.ui.form;
  const slotIds = F.slots.map(s => s.id);
  const pool = [...G.data.evidence.map(e => e.id).filter(id => S.pinned.includes(id) && !evidenceById(id).start), ...S.testimony];
  const parkSt = S.suspects.park;

  const radio = (key, q) => h('fieldset', { class: 'fq' },
    h('legend', null, q.label),
    q.options.map((o, i) => {
      const n = i + 1;
      const hints = [];
      if (key === 'q1' && n === 2) {
        if (S.events.forensic) hints.push('국과수 근거');
        if (parkFull()) hints.push('자백 근거');
      }
      return h('label', { class: 'opt' + (D[key] === n ? ' on' : '') },
        h('input', { type: 'radio', name: key, checked: D[key] === n, onchange: () => { D[key] = n; save(); app.render(); } }),
        h('span', null, `${n}. ${o}`),
        hints.map(t => h('span', { class: 'hint' }, t)));
    }));

  const slot = (s) => h('label', { class: 'slot' },
    h('span', { class: 'slot-label' }, s.label),
    h('select', { onchange: (e) => { D[s.id] = e.target.value; save(); } },
      h('option', { value: '' }, '— 증거 선택 —'),
      pool.map(id => h('option', { value: id, selected: D[s.id] === id }, `${id.startsWith('C-') ? '증언' : id} · ${evidenceById(id).title}`))));

  const ready = D.q1 && D.q2 && slotIds.every(k => D[k]);
  const group = (g, legend, note) => h('fieldset', { class: 'fq' },
    h('legend', null, legend), F.slots.filter(s => s.group === g).map(slot), note ? h('div', { class: 'sub' }, note) : null);
  return h('div', { class: 'app evidence form' },
    h('div', { class: 'app-head' },
      h('button', { class: 'back', onclick: () => { S.ui.ev = 'list'; app.render(); } }, '‹'),
      h('div', { class: 'app-title' }, '기사 쓰기'), h('span', { class: 'back-sp' })),
    h('div', { class: 'ev-body' },
      h('div', { class: 'rule' }, '당신이 쓰는 것은 범인이 아니라 보도 프레임이다. 제출하면 1판이 인쇄된다.'),
      radio('q1', F.q1),
      radio('q2', F.q2),
      group('a', '③-a 그날 밤 방 안에 있던 손', F.aNote),
      group('b', '③-b 폭로를 발주한 구조'),
      group('c', '③-c 방 밖에서 밀어 넣은 손들', F.cNote),
      h('button', { class: 'write-btn', onclick: () => {
        if (!(D.q1 && D.q2 && slotIds.every(k => D[k]))) return toast('모든 칸을 채워야 1판에 넣을 수 있다.');
        confirmSubmit();
      } }, ready ? '송고한다' : '송고한다 (빈칸 있음)')));
}

function confirmSubmit() {
  modal((close) => h('div', null,
    h('div', { class: 'sheet-title' }, '송고하시겠습니까?'),
    h('div', { class: 'sub' }, '마감 후에는 고칠 수 없다.'),
    h('div', { class: 'sheet-actions' },
      h('button', { class: 'ghost', onclick: close }, '다시 본다'),
      h('button', { class: 'primary', onclick: () => { close(); submit(); } }, '송고'))));
}

export function judge(D) {
  const F = G.data.form;
  const same = (a, b) => a.length === b.length && a.every(x => b.includes(x));
  // ③a: 두 증거의 조합, 또는 전체 자백 카드 하나
  const aPick = [D.a1, D.a2].filter(Boolean);
  const okA = F.aRule.pairs.some(p => same(p, aPick)) || (aPick.includes(F.aRule.fullTestimony) && parkFull());
  const okB = F.slots.find(s => s.id === 'b').valid.includes(D.b);
  // ③c: 서로 다른 세 증거가 모두 방 밖의 행위를 보이고, 합쳐서 세 사람을 모두 덮어야 한다
  const cPick = [D.c1, D.c2, D.c3];
  const cOuts = cPick.map(outsideOf);
  const covered = new Set(cOuts.flat());
  const okC = new Set(cPick).size === 3 && cOuts.every(o => o.length > 0) && F.cRule.need.every(p => covered.has(p));
  const ok1 = D.q1 === F.q1.answer, ok2 = D.q2 === F.q2.answer;
  let kind;
  if (!ok1) kind = 'bad' + D.q1;
  else if (ok2 && okA && okB && okC) kind = 'true';
  else kind = 'partial';
  return { kind, ok1, ok2, okA, okB, okC };
}

function submit() {
  const r = judge(S.ui.form);
  S.ending = r;
  sfx.print();
  save(); app.render();
}

// ───────── 엔딩 화면 ─────────
export function endingView() {
  const r = S.ending;
  const EN = G.data.endings;
  let e;
  if (r.kind === 'true') e = EN.true;
  else if (r.kind === 'partial') e = EN.partial;
  else {
    const n = r.kind.slice(3);
    e = (n === '1' && S.events.editorChoice === 2) ? EN.bad['1blank'] : EN.bad[n];
  }
  const delayed = r.kind.startsWith('bad') && S.events.editorChoice === 1;
  const check = (ok, label) => h('div', { class: 'chk' + (ok ? ' ok' : '') }, (ok ? '✓ ' : '✗ ') + label);

  const share = async () => {
    const text = `오합지졸 — ${e.name}`;
    try {
      if (navigator.share) await navigator.share({ title: '오합지졸', text, url: location.href });
      else { await navigator.clipboard.writeText(`${text} ${location.href}`); toast('링크를 복사했다.'); }
    } catch (err) { /* 취소 */ }
  };

  return h('div', { class: 'ending k-' + r.kind },
    h('div', { class: 'paper' },
      h('div', { class: 'paper-top' }, h('span', null, '제18,204호'), h('span', null, '2026년 11월 14일 토요일'), h('span', null, e.section)),
      h('div', { class: 'masthead' }, '잠신일보'),
      h('div', { class: 'edition' }, 'JAMSIN ILBO · 1판'),
      e.headline ? h('h1', { class: 'headline' }, e.headline) : h('div', { class: 'blank-slot' }, '(공란)'),
      e.headline ? h('div', { class: 'paper-by' }, '디지털탐사팀') : null,
      e.headline && r.kind === 'true' ? h('div', { class: 'paper-photo' }, h('span', null, '임주연 씨의 휴대전화. 잠금 해제 실패 기록이 남아 있다.')) : null,
      e.lead ? h('p', { class: 'lead' }, e.lead) : null,
      e.misjudge ? h('div', { class: 'misjudge' }, h('span', null, `오판: ${e.misjudge}`), h('span', null, `비판 대상: ${e.target}`)) : null),
    h('div', { class: 'ending-name' }, e.name),
    h('div', { class: 'epilogues' }, e.epilogues.map((t, i) => h('div', { class: 'epi', style: `animation-delay:${0.25 + i * 0.35}s` }, t))),
    delayed ? h('div', { class: 'epi extra' }, EN.bad.delayedLine) : null,
    e.closing ? h('div', { class: 'closing' }, e.closing) : null,
    h('div', { class: 'review' },
      h('div', { class: 'sec-title' }, '데스크 검토'),
      check(r.ok1, '① 사인'), check(r.ok2, '② 구조'),
      check(r.okA, '③a 방 안의 손'), check(r.okB, '③b 발주 구조'), check(r.okC, '③c 방 밖의 세 사람')),
    h('div', { class: 'ending-actions' },
      h('button', { class: 'ghost', onclick: share }, '공유'),
      h('button', { class: 'primary', onclick: () => {
        modal((close) => h('div', null,
          h('div', { class: 'sheet-title' }, '처음부터 다시 할까요?'),
          h('div', { class: 'sub' }, '진행 기록이 모두 지워진다.'),
          h('div', { class: 'sheet-actions' },
            h('button', { class: 'ghost', onclick: close }, '취소'),
            h('button', { class: 'primary', onclick: () => { close(); resetGame(); app.render(); } }, '다시 하기'))));
      } }, '다시 하기')));
}
