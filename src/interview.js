// 취재 수첩: 용의자 목록, 질문(루트 A/B, 심화), 추궁(단일/부분 자백), 메모 기록
import { G, S, app, save, spend, remaining, budgetTotal, anyOf, grant, addTestimony, evidenceById, memo, personName } from './state.js';
import { cond, addFlag } from './state.js';
import { h, modal, portrait, toast } from './ui.js';
import { portraitSrc, placeSrc } from './pixel.js';
import { sfx } from './sound.js';

const goBook = (r) => { S.ui.book = r; S.ui.scrollTop = 0; app.render(); };
const susById = (id) => G.data.suspects.find(s => s.id === id);

export function budgetPill() {
  const r = remaining();
  return h('span', { class: 'budget' + (r <= 5 ? ' low' : '') }, `질문 ${r}/${budgetTotal()}`);
}

// ───────── 수첩 첫 화면 ─────────
function memoLog() {
  const icon = { contra: '⚠', testi: '🗣', kw: '#', pin: '📌', intuition: '💡', event: '✉', note: '·' };
  return h('div', { class: 'memo-log' },
    h('div', { class: 'sec-title' }, '수첩 기록'),
    S.memos.length === 0 ? h('div', { class: 'empty' }, '아직 적은 것이 없다.') :
      S.memos.map(m => h('div', { class: 'memo m-' + m.kind }, h('span', { class: 'memo-icon' }, icon[m.kind] || '·'), h('span', null, m.text))));
}

function suspectCard(s) {
  const st = S.suspects[s.id];
  const asked = Object.keys(st.asked).length;
  const status = st.done ? '증언 확보' : asked ? `질문 ${asked}개` : '미취재';
  return h('button', { class: 'sus-card', onclick: () => goBook('sus:' + s.id) },
    portrait(s, st.expr, 'sm'),
    h('div', { class: 'sus-main' },
      h('b', null, s.name), h('span', { class: 'sub' }, `${s.role} · ${s.age}`),
      h('span', { class: 'sub place' }, s.place)),
    h('span', { class: 'sus-status' + (st.done ? ' done' : '') }, status));
}


// ───────── 타임라인 ─────────
function timelineView() {
  const T = G.data.timeline;
  const known = T.filter(e => anyOf(e.when)).length;
  return h('div', { class: 'tl' },
    h('div', { class: 'tl-head' }, `11월 6일 밤 — 확인한 시각 ${known}/${T.length}`),
    h('div', { class: 'sub tl-help' }, '증거를 모으면 칸이 채워진다. “??”는 아직 모르는 시간대.'),
    h('div', { class: 'tl-list' }, T.map(e => {
      const ok = anyOf(e.when);
      return h('div', { class: 'tl-item' + (ok ? ' on' : '') },
        h('div', { class: 'tl-t' }, e.t),
        h('div', { class: 'tl-dot' }),
        h('div', { class: 'tl-text' }, ok ? e.text : '??'));
    })));
}

// ───────── 관계도 ─────────
const allOf = (list) => list.every(cond);
export function relationLevel(edge) {
  let hit = null;
  for (const lv of edge.levels) if (allOf(lv.all)) hit = lv;
  return hit;
}
function mapView() {
  const R = G.data.relations;
  const pos = Object.fromEntries(R.nodes.map(n => [n.id, n]));
  const W = 340, H = 420;
  const px = (n) => [n.x / 100 * W, n.y / 100 * H];
  const lines = [], labels = [];
  let found = 0;
  R.edges.forEach((e, i) => {
    const lv = relationLevel(e);
    if (!lv) return;
    found++;
    let [x1, y1] = px(pos[e.from]), [x2, y2] = px(pos[e.to]);
    if (e.night) { x1 += 20; x2 += 20; }
    if (e.offset) { y1 += e.offset; y2 += e.offset; }
    // 노드 원 가장자리에서 끝나게
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, r = 24;
    const sx = x1 + dx / L * r, sy = y1 + dy / L * r, ex = x2 - dx / L * (r + 4), ey = y2 - dy / L * (r + 4);
    lines.push(`<line x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}" class="${e.night ? 'night' : ''}" marker-end="url(#arr${e.night ? 'n' : ''})"/>`);
    const t = e.lp ?? .5;
    labels.push(h('div', { class: 'rel-label' + (e.night ? ' night' : ''), style: `left:${(sx + (ex - sx) * t) / W * 100}%;top:${(sy + (ey - sy) * t) / H * 100}%` }, lv.label));
  });
  const svg = `<svg viewBox="0 0 ${W} ${H}" class="rel-svg"><defs>
    <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#c9b56a"/></marker>
    <marker id="arrn" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#e5484d"/></marker>
    </defs>${lines.join('')}</svg>`;
  const nodeImg = (id) => {
    const src = portraitSrc(id === 'ju' ? 'ju' : id, '기본');
    return src ? h('img', { src, alt: '' }) : h('span', { class: 'rel-q' }, id === 'kim' ? '?' : '오');
  };
  return h('div', { class: 'rel' },
    h('div', { class: 'tl-head' }, `관계도 — 확인한 연결 ${found}/${R.edges.length}`),
    h('div', { class: 'sub tl-help' }, '증거와 증언으로 확인된 관계만 선으로 그린다. 판정에는 영향이 없다.'),
    h('div', { class: 'rel-box', html: svg },
      R.nodes.map(n => h('div', { class: 'rel-node n-' + n.id, style: `left:${n.x}%;top:${n.y}%` },
        nodeImg(n.id), h('span', null, n.name))),
      labels));
}

export function bookView() {
  const r = S.ui.book || 'list';
  if (r.startsWith('sus:')) return interview(susById(r.slice(4)));
  const tab = S.ui.bookTab || 'sus';
  const tabs = [['sus', '취재 대상'], ['time', '타임라인'], ['map', '관계도'], ['log', '기록']];
  let body;
  if (tab === 'time') body = timelineView();
  else if (tab === 'map') body = mapView();
  else if (tab === 'log') body = memoLog();
  else body = [
    h('div', { class: 'rule' }, '질문 1회 = 1 소진. 루트 선택·전환은 무료. 추궁은 증거 1건 제시 = 1 소진.'),
    h('div', { class: 'sec-title' }, '취재 대상'),
    G.data.suspects.map(suspectCard)];
  return h('div', { class: 'app book' },
    h('div', { class: 'app-head' }, h('span', { class: 'back-sp' }), h('div', { class: 'app-title' }, '취재 수첩'), budgetPill()),
    h('div', { class: 'book-tabs' }, tabs.map(([id, name]) =>
      h('button', { class: 'book-tab' + (tab === id ? ' on' : ''), onclick: () => { S.ui.bookTab = id; app.render(); } }, name))),
    h('div', { class: 'book-body' }, body));
}

// ───────── 인터뷰 ─────────
function deepAvailable(q) { return q.requires && anyOf(q.requires); }

function ask(sus, q, deep) {
  if (!spend(1)) { toast('남은 질문이 없다.'); return; }
  const st = S.suspects[sus.id];
  st.asked[q.id] = deep ? 'deep' : 'basic';
  grant(q.grants);
  if (deep) grant(q.grantsDeep);
  save(); app.afterChange(); app.render();
}

function questionCard(sus, q) {
  const st = S.suspects[sus.id];
  const asked = st.asked[q.id];
  const deepOk = deepAvailable(q);
  const qText = (deepOk && q.textDeep) ? q.textDeep : q.text;
  if (!asked) {
    return h('div', { class: 'q' },
      h('button', { class: 'q-btn', disabled: remaining() < 1, onclick: () => ask(sus, q, deepOk) },
        h('span', { class: 'q-id' }, q.id),
        h('span', { class: 'q-text' }, qText),
        deepOk && q.answerDeep ? h('span', { class: 'deep' }, '심화') : null,
        h('span', { class: 'cost' }, '−1')));
  }
  const isDeep = asked === 'deep';
  const shownQ = isDeep && q.textDeep ? q.textDeep : q.text;
  return h('div', { class: 'q asked' },
    h('div', { class: 'q-line' }, h('span', { class: 'q-id' }, q.id), shownQ),
    h('div', { class: 'a-line' }, isDeep && q.answerDeep ? q.answerDeep : q.answer),
    !isDeep && deepOk && q.answerDeep
      ? h('button', { class: 'q-btn small', disabled: remaining() < 1, onclick: () => ask(sus, q, true) },
          h('span', { class: 'deep' }, '심화'), h('span', { class: 'q-text' }, '다시 묻는다 — ' + (q.textDeep || q.text)), h('span', { class: 'cost' }, '−1'))
      : null);
}

function partialPanel(sus) {
  const I = sus.interrogation;
  if (I.mode !== 'partial') return null;
  const st = S.suspects[sus.id];
  return h('div', { class: 'partials' },
    Object.entries(I.partialLabels).map(([k, label]) =>
      h('span', { class: 'ptag' + (st.partials.includes(k) ? ' on' : '') }, `${k} ${st.partials.includes(k) ? label : '???'}`)),
    h('div', { class: 'sub' }, `부분 자백 ${st.partials.length}/4 · 2개 이상 모이면 전체 인정`));
}

function interview(sus) {
  const st = S.suspects[sus.id];
  const introText = (sus.id === 'park' && S.flags.includes('park-refused')) ? sus.introVariants.refused : sus.intro;
  const routeNames = { A: '루트 A · 자본·청부', B: '루트 B · 콘텐츠·유포' };
  return h('div', { class: 'app book interview' },
    h('div', { class: 'app-head' },
      h('button', { class: 'back', onclick: () => goBook('list'), 'aria-label': '뒤로' }, '‹'),
      h('div', { class: 'app-title' }, sus.name), budgetPill()),
    h('div', { class: 'iv-body' },
      h('div', { class: 'iv-top' },
        h('div', { class: 'iv-stage', style: `background-image:url(${placeSrc(sus.id)})` }, portrait(sus, st.expr, 'lg')),
        h('div', { class: 'iv-meta' },
          h('b', null, `${sus.name} (${sus.age})`), h('div', { class: 'sub' }, sus.role),
          h('div', { class: 'sub place' }, sus.place), h('div', { class: 'place-line' }, sus.placeLine))),
      h('div', { class: 'intro-bubble' }, introText),
      h('div', { class: 'routes' }, ['A', 'B'].map(k =>
        h('button', { class: 'route' + (st.route === k ? ' on' : ''), onclick: () => { st.route = k; save(); app.render(); } }, routeNames[k]))),
      h('div', { class: 'qs' }, sus.routes[st.route].map(q => questionCard(sus, q))),
      h('div', { class: 'press' },
        h('div', { class: 'sec-title' }, '추궁'),
        partialPanel(sus),
        st.log.map(l => h('div', { class: 'press-entry' + (l.kind ? ' ' + l.kind : '') },
          l.q ? h('div', { class: 'q-line' }, l.q) : null,
          h('div', { class: 'a-line' }, l.a))),
        st.done && sus.interrogation.mode !== 'partial'
          ? h('div', { class: 'done-note' }, `증언 카드 확보 — 증거함에 추가됨`)
          : h('button', { class: 'press-btn', disabled: remaining() < 1 && !freePending(sus), onclick: () => openPicker(sus) }, '증거 제시하기'),
        st.done && sus.interrogation.mode === 'partial'
          ? h('div', { class: 'done-note' }, '증언 카드 확보 — 남은 부분 자백도 더 받아낼 수 있다') : null)));
}

function freePending(sus) {
  // 전화로 먼저 받은 P1은 대면 추궁 시 비용 0
  const st = S.suspects[sus.id];
  return sus.id === 'park' && st.partials.includes('P1') && !st.heard?.includes('P1');
}

// ───────── 증거 선택 ─────────
function openPicker(sus) {
  const chosen = new Set();
  const items = [...S.pinned, ...S.testimony].map(evidenceById);
  modal((close) => {
    const btn = h('button', { class: 'primary', disabled: true }, '제시한다 (−1)');
    const list = h('div', { class: 'pick-list' }, items.map(ev => {
      const b = h('button', { class: 'pick' },
        h('span', { class: 'pick-id' }, ev.id), h('span', null, ev.title));
      b.addEventListener('click', () => {
        if (chosen.has(ev.id)) chosen.delete(ev.id);
        else { if (chosen.size >= 2) return toast('한 번에 최대 2개까지 제시할 수 있다.'); chosen.add(ev.id); }
        b.classList.toggle('on', chosen.has(ev.id));
        btn.disabled = chosen.size === 0;
      });
      return b;
    }));
    btn.addEventListener('click', () => { close(); present(sus, [...chosen]); });
    return h('div', { class: 'picker' },
      h('div', { class: 'sheet-title' }, `${sus.name}에게 무엇을 내밀까`),
      h('div', { class: 'sub' }, '증거 1~2개를 고른다. 두 증거를 함께 내밀어야 통하는 경우도 있다.'),
      list,
      h('div', { class: 'sheet-actions' }, h('button', { class: 'ghost', onclick: close }, '취소'), btn));
  });
}

const sameSet = (a, b) => a.length === b.length && a.every(x => b.includes(x));
const evTitles = (ids) => ids.map(id => `${id} ${evidenceById(id).title}`).join(' + ');

export function parkCombineCheck() {
  const sus = susById('park');
  const st = S.suspects.park;
  const I = sus.interrogation;
  st.cause = st.partials.some(p => I.combine.causeIf.includes(p));
  if (st.partials.length < I.combine.min) return;
  if (!st.done) {
    // 2개 이상 모이면 증언 카드. P3·P4가 없으면 메일 저지·현장 편집까지만 인정한다.
    st.done = true; st.expr = '자백'; st.full = st.cause;
    st.log.push({ kind: 'combine', a: st.full ? I.combine.text : I.combine.partialText });
    sfx.confess();
    addTestimony(I.result);
    toast(st.full ? '증언 카드 확보: 박지영 전체 인정' : I.combine.partialToast, 3400);
  } else if (st.cause && !st.full) {
    st.full = true;
    st.log.push({ kind: 'combine', a: I.combine.text });
    sfx.confess();
    memo('박지영 전체 인정: 약물 투여·위험 외면까지', 'testi');
    toast(I.combine.fullToast, 3400);
  }
}

function present(sus, ids) {
  const st = S.suspects[sus.id];
  const I = sus.interrogation;
  const opt = I.options.find(o => sameSet(o.evidence, ids));
  const playerLine = opt && opt.playerLine ? `“${opt.playerLine}”` : `[증거 제시] ${evTitles(ids)}`;
  st.heard = st.heard || [];

  if (I.mode === 'partial' && opt) {
    const p = opt.partial;
    if (st.heard.includes(p)) { toast('이미 들은 이야기다.'); return; }
    const free = st.partials.includes(p); // 전화로 선취한 P1
    if (!free && !spend(1)) { toast('남은 질문이 없다.'); return; }
    st.heard.push(p);
    if (!st.partials.includes(p)) st.partials.push(p);
    addFlag(p, true);
    memo(`박지영 부분 자백 ${p}: ${I.partialLabels[p]}`, 'testi');
    st.log.push({ q: playerLine, a: opt.answer });
    if (st.expr === '기본') st.expr = '동요';
    if (st.partials.length === 1) st.log.push({ kind: 'hold', a: `(그 이상은) “${I.onlyOne}”` });
    parkCombineCheck();
  } else if (opt && !st.done) {
    if (!spend(1)) { toast('남은 질문이 없다.'); return; }
    st.log.push({ q: playerLine, a: I.resultText });
    st.done = true; st.expr = '자백';
    sfx.confess();
    addTestimony(I.result);
    toast(`증언 카드 확보: ${sus.name}`, 3000);
  } else if (opt && st.done) {
    toast('이미 들을 말은 다 들었다.');
    return;
  } else {
    if (!spend(1)) { toast('남은 질문이 없다.'); return; }
    st.log.push({ q: playerLine, a: I.deflect, kind: 'deflect' });
    if (st.expr === '기본') st.expr = '동요';
  }
  save(); app.afterChange(); app.render();
}
