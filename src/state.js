// 게임 상태: 데이터 로드, 저장/불러오기, 조건 판정, 보상 지급
export const G = { data: null };
export const app = { render() {}, afterChange() {}, toast() {} };

const KEY = 'ohapjijol-save';
const OLD_KEYS = ['ohapjijol-save-v1'];
// 판정·저장 구조가 바뀌면 올린다. 다른 버전의 기록은 새로 시작한다.
export const SAVE_VERSION = 3;
export let S = null;

function fresh() {
  const suspects = {};
  for (const s of G.data.suspects) {
    suspects[s.id] = { route: 'A', asked: {}, log: [], expr: '기본', done: false, partials: [], cause: false };
  }
  return {
    started: false, unlocked: false, failCount: 0,
    spent: 0, bonus: 0,
    pinned: G.data.evidence.filter(e => e.start).map(e => e.id),
    testimony: [], flags: [], keywords: [],
    memos: [],
    suspects,
    events: { forensic: false, call: null, callChoice: null, editor: false, editorChoice: null },
    extraSms: [],
    marks: {},
    seen: {},
    ui: { tab: 'phone', phone: 'home', notes: 'list', overlay: null },
    ending: null,
  };
}

export async function loadData() {
  const v = (typeof window !== 'undefined' && window.BUILD) ? '?v=' + window.BUILD : '';
  const res = await fetch('data/game.json' + v, { cache: 'no-cache' });
  G.data = await res.json();
  S = fresh();
  try {
    let stale = false;
    for (const k of OLD_KEYS) if (localStorage.getItem(k)) { localStorage.removeItem(k); stale = true; }
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      if (saved && saved._v === SAVE_VERSION) {
        S = Object.assign(fresh(), saved);
        S.ui.overlay = null;
      } else {
        localStorage.removeItem(KEY);
        stale = true;
      }
    }
    G.staleSave = stale;
  } catch (e) { /* 저장소 사용 불가: 새 게임 */ }
}

export function save() {
  S._v = SAVE_VERSION;
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* 무시 */ }
}

export function resetGame() {
  try { localStorage.removeItem(KEY); } catch (e) { /* 무시 */ }
  S = fresh();
  save();
}

// ── 예산 ──
export const budgetTotal = () => G.data.meta.questionBudget + S.bonus;
export const remaining = () => budgetTotal() - S.spent;

export function spend(n) {
  if (n <= 0) return true;
  if (remaining() < n) return false;
  S.spent += n;
  return true;
}

// ── 조건 판정 ──
// "pin:E10" | "test:C-chae" | "flag:X" | "kw:X"
export function cond(c) {
  const i = c.indexOf(':');
  const k = c.slice(0, i), v = c.slice(i + 1);
  if (k === 'pin') return S.pinned.includes(v);
  if (k === 'test') return S.testimony.includes(v);
  if (k === 'flag') return S.flags.includes(v);
  if (k === 'kw') return S.keywords.includes(v);
  return false;
}
export const anyOf = (list) => !list || list.length === 0 ? true : list.some(cond);

// ── 메모 ──
export function memo(text, kind = 'note') {
  S.memos.unshift({ text, kind, n: S.memos.length + 1 });
}

export function addFlag(f, silent = false) {
  if (S.flags.includes(f)) return false;
  S.flags.push(f);
  const label = G.data.flagLabels[f];
  if (label && !silent) memo(label, f.startsWith('M') ? 'contra' : 'testi');
  return true;
}

export function addKeyword(k) {
  if (S.keywords.includes(k)) return;
  S.keywords.push(k);
  memo(`검색 키워드: ${k}`, 'kw');
}

export function grant(g) {
  if (!g) return;
  (g.flags || []).forEach(f => addFlag(f));
  (g.keywords || []).forEach(k => addKeyword(k));
}

// ── 증거 ──
export const evidenceById = (id) =>
  G.data.evidence.find(e => e.id === id) || G.data.testimony.find(t => t.id === id);

export function pin(id) {
  if (S.pinned.includes(id)) return false;
  S.pinned.push(id);
  const ev = evidenceById(id);
  memo(`📌 ${id} ${ev.title}`, 'pin');
  if (ev.intuition) {
    memo(`기자의 직감: ${ev.intuition}`, 'intuition');
    app.toast(`📌 ${ev.title}\n기자의 직감: ${ev.intuition}`, 4200);
  } else {
    app.toast(`📌 증거함에 고정: ${ev.title}`);
  }
  return true;
}

export function addTestimony(id) {
  if (S.testimony.includes(id)) return;
  S.testimony.push(id);
  const t = evidenceById(id);
  memo(`증언 카드 확보: ${t.title}`, 'pin');
}

export function personName(p) { return G.data.persons[p] || p; }
