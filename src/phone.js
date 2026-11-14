// 폰 화면: 잠금화면, 홈, 앱 6종
import { G, S, app, pin, addFlag, save } from './state.js';
import { h } from './ui.js';

const ME = '임주연';
const go = (route) => { S.ui.phone = route; S.ui.scrollTop = 0; app.render(); };

function header(title, back, extra) {
  return h('div', { class: 'app-head' },
    back ? h('button', { class: 'back', onclick: () => go(back), 'aria-label': '뒤로' }, '‹') : h('span', { class: 'back-sp' }),
    h('div', { class: 'app-title' }, title),
    extra || h('span', { class: 'back-sp' }));
}

export function pinBar(id) {
  const ev = G.data.evidence.find(e => e.id === id);
  const done = S.pinned.includes(id);
  return h('div', { class: 'pinbar' + (done ? ' done' : '') },
    h('button', {
      class: 'pin-btn', disabled: done,
      onclick: () => { pin(id); app.afterChange(); app.render(); },
    }, done ? '📌 고정됨' : '📌 증거함에 고정'),
    h('span', { class: 'pin-label' }, `${id} · ${ev.title}`));
}

// ───────── 잠금화면 ─────────
let entered = '';
export function lockScreen() {
  const L = G.data.lockscreen;
  const dots = h('div', { class: 'pin-dots' }, [0, 1, 2, 3].map(i => h('span', { class: i < entered.length ? 'on' : '' })));
  const hint = S.failCount >= 3 ? `${L.hints.after1}  ${L.hints.after3}` : S.failCount >= 1 ? L.hints.after1 : '';
  const press = (d) => {
    if (d === 'del') { entered = entered.slice(0, -1); app.render(); return; }
    if (entered.length >= 4) return;
    entered += d;
    if (entered.length === 4) {
      if (entered === G.data.meta.passcode) {
        S.unlocked = true; entered = '';
        app.toast(L.unlockToast, 5200);
        save(); app.render();
      } else {
        S.failCount++; entered = '';
        document.querySelector('.pin-dots')?.classList.add('shake');
        setTimeout(() => app.render(), 380);
        save();
      }
      return;
    }
    app.render();
  };
  return h('div', { class: 'lock' },
    h('div', { class: 'lock-clock' }, G.data.meta.gameClock),
    h('div', { class: 'lock-date' }, G.data.meta.gameDate),
    h('div', { class: 'lock-wall' }, L.wallpaperText),
    h('div', { class: 'notif-stack' }, L.notifications.map(n =>
      h('div', { class: 'notif' + (n.strong ? ' strong' : '') },
        h('div', { class: 'notif-top' }, h('b', null, n.app), h('span', null, n.ts)),
        h('div', { class: 'notif-text' }, n.text)))),
    h('div', { class: 'keypad-wrap' },
      h('div', { class: 'lock-prompt' }, '암호 입력'),
      dots,
      h('div', { class: 'lock-hint' }, hint),
      h('div', { class: 'keypad' },
        ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map(d =>
          d === '' ? h('span') :
          h('button', { class: 'key', onclick: () => press(d) }, d === 'del' ? '⌫' : d)))));
}

// ───────── 홈 ─────────
const APPS = [
  { id: 'sms', name: '문자', icon: '💬', color: '#3ecf6e' },
  { id: 'tg', name: '텔레그램', icon: '✈', color: '#2aa3e0' },
  { id: 'notes', name: '메모', icon: '📝', color: '#f2c94c' },
  { id: 'gallery', name: '갤러리', icon: '🖼', color: '#bb6bd9' },
  { id: 'sns', name: 'SNS', icon: '◎', color: '#eb5757' },
  { id: 'browser', name: '인터넷', icon: '🌐', color: '#5b8def' },
];

export function home() {
  const unread = smsUnread();
  return h('div', { class: 'home' },
    h('div', { class: 'home-clock' }, G.data.meta.gameClock),
    h('div', { class: 'home-wall' }, G.data.lockscreen.wallpaperText),
    h('div', { class: 'app-grid' }, APPS.map(a =>
      h('button', { class: 'app-icon', onclick: () => go(a.id) },
        h('span', { class: 'icon', style: `background:${a.color}` }, a.icon,
          a.id === 'sms' && unread ? h('i', { class: 'badge' }, unread) : null),
        h('span', { class: 'icon-name' }, a.name)))));
}

// ───────── 문자 ─────────
function deliveredExtra() {
  const now = Date.now();
  return S.extraSms.filter(m => m.at <= now);
}
function smsThreads() {
  const base = G.data.apps.sms.threads.map(t => ({ ...t, messages: [...t.messages] }));
  for (const m of deliveredExtra()) {
    let t = base.find(x => x.contact === m.contact);
    if (!t) { t = { contact: m.contact, messages: [], extra: true }; base.unshift(t); }
    t.messages.push(m);
  }
  return base;
}
function smsUnread() {
  return deliveredExtra().filter(m => !m.read).length;
}

function bubble(m, opts = {}) {
  const mine = m.from === ME;
  return h('div', { class: 'msg ' + (mine ? 'me' : 'them') + (m.sys ? ' sys' : '') },
    !mine && opts.showName ? h('div', { class: 'msg-name' }, m.from) : null,
    m.image ? thumbnail(m.image) : null,
    m.text ? h('div', { class: 'msg-bubble' + (m.forward ? ' fwd' : '') }, m.text,
      m.file ? h('div', { class: 'msg-file' }, '📎 ' + m.file) : null) : null,
    h('div', { class: 'msg-ts' }, m.ts || ''));
}

function thumbnail(img) {
  return h('div', { class: 'thumb' },
    h('div', { class: 'thumb-title' }, img.title),
    h('div', { class: 'thumb-mosaic' }),
    h('div', { class: 'thumb-desc' }, img.desc),
    h('div', { class: 'thumb-capture' }, h('span', null, '캡처 판독'), img.readout));
}

export function sms(route) {
  const threads = smsThreads();
  if (route === 'calls') {
    return h('div', { class: 'app' },
      header('통화 기록', 'sms'),
      h('div', { class: 'list' }, G.data.apps.sms.callLog.map(c =>
        h('div', { class: 'row call ' + (c.type === '부재중' ? 'missed' : '') },
          h('div', { class: 'row-main' }, h('b', null, c.contact), h('span', { class: 'sub' }, c.type + (c.duration ? ` · ${c.duration}` : ''))),
          h('div', { class: 'row-ts' }, c.ts)))));
  }
  const m = route.match(/^sms:(\d+)$/);
  if (m) {
    const t = threads[+m[1]];
    t.messages.forEach(x => { if (x.at) x.read = true; });
    S.extraSms.forEach(x => { if (x.contact === t.contact && x.at <= Date.now()) x.read = true; });
    save();
    return h('div', { class: 'app' },
      header(t.contact, 'sms'),
      h('div', { class: 'chat' + (t.spam ? ' spam' : '') },
        t.spam ? h('div', { class: 'spam-tag' }, '스팸으로 분류된 메시지') : null,
        t.messages.map(x => bubble(x))),
      t.pinGroup ? pinBar(t.pinGroup) : null);
  }
  return h('div', { class: 'app' },
    header('문자', 'home', h('button', { class: 'head-btn', onclick: () => go('calls') }, '통화')),
    h('div', { class: 'list' }, threads.map((t, i) => {
      const last = t.messages[t.messages.length - 1];
      const unread = t.messages.some(x => x.at && !x.read);
      return h('button', { class: 'row' + (unread ? ' unread' : ''), onclick: () => go('sms:' + i) },
        h('div', { class: 'row-main' }, h('b', null, t.contact), h('span', { class: 'sub' }, last.text)),
        h('div', { class: 'row-ts' }, last.ts));
    })));
}

// ───────── 텔레그램 ─────────
function chatWithDays(messages, showName, { pinRuns = false } = {}) {
  const out = [];
  let day = null, ts = null, run = null;
  const flush = () => { if (run) { out.push(pinBar(run)); run = null; } };
  messages.forEach((m, i) => {
    if (pinRuns && (m.pin || null) !== run) flush();
    if (m.d !== day || (m.ts && m.ts !== ts)) {
      out.push(h('div', { class: 'day' }, m.d + (m.ts ? ' ' + m.ts : '')));
      day = m.d; ts = m.ts;
    }
    if (m.sys) out.push(h('div', { class: 'sysline' }, m.sys));
    else out.push(bubble({ ...m, ts: '' }, { showName }));
    if (pinRuns && m.pin) run = m.pin;
    if (i === messages.length - 1) flush();
  });
  return out;
}

export function telegram(route) {
  const T = G.data.apps.telegram;
  if (route === 'tg:g0') {
    const g = T.groups[0];
    return h('div', { class: 'app tg' },
      header(g.name, 'tg'),
      h('div', { class: 'chat' },
        h('div', { class: 'group-info' },
          h('div', null, g.desc),
          h('div', { class: 'sub' }, `멤버 ${g.members.length}: ${g.members.join(', ')}`)),
        chatWithDays(g.messages, true, { pinRuns: true })));
  }
  const m = route.match(/^tg:dm(\d+)$/);
  if (m) {
    const dm = T.dms[+m[1]];
    return h('div', { class: 'app tg' },
      header(dm.contact, 'tg'),
      h('div', { class: 'chat' }, chatWithDays(dm.messages, false)),
      dm.pinGroup ? pinBar(dm.pinGroup) : null);
  }
  const g = T.groups[0];
  const lastOf = (arr) => arr[arr.length - 1];
  return h('div', { class: 'app tg' },
    header('텔레그램', 'home'),
    h('div', { class: 'list' },
      h('button', { class: 'row', onclick: () => go('tg:g0') },
        h('span', { class: 'avatar grp' }, '五'),
        h('div', { class: 'row-main' }, h('b', null, `[${g.name}]`), h('span', { class: 'sub' }, `${lastOf(g.messages).from}: ${lastOf(g.messages).text}`)),
        h('div', { class: 'row-ts' }, lastOf(g.messages).d.slice(5))),
      T.dms.map((dm, i) => h('button', { class: 'row', onclick: () => go('tg:dm' + i) },
        h('span', { class: 'avatar' }, dm.contact.slice(0, 1)),
        h('div', { class: 'row-main' }, h('b', null, dm.contact), h('span', { class: 'sub' }, lastOf(dm.messages).text || '사진')),
        h('div', { class: 'row-ts' }, lastOf(dm.messages).d.slice(5))))));
}

// ───────── 메모 ─────────
export function notes(route) {
  const N = G.data.apps.notes;
  const m = route.match(/^notes:(\d+)$/);
  if (m) {
    const n = N[+m[1]];
    if (addFlag('note:' + n.title, true)) save();
    return h('div', { class: 'app notes' },
      header('메모', 'notes'),
      h('div', { class: 'note-page' },
        h('h2', null, n.title),
        h('div', { class: 'note-meta' }, `수정 ${n.updated}`),
        h('div', { class: 'note-body' }, n.body)),
      n.pinGroup ? pinBar(n.pinGroup) : null);
  }
  return h('div', { class: 'app notes' },
    header('메모', 'home'),
    h('div', { class: 'list' }, N.map((n, i) =>
      h('button', { class: 'row', onclick: () => go('notes:' + i) },
        h('div', { class: 'row-main' }, h('b', null, n.title), h('span', { class: 'sub' }, n.body.split('\n')[0])),
        h('div', { class: 'row-ts' }, n.updated)))));
}

// ───────── 갤러리 ─────────
export function galleryArt(g) {
  switch (g.kind) {
    case 'receipt':
      return h('div', { class: 'art receipt' }, g.lines.map(l => h('div', null, l)));
    case 'doc':
      return h('div', { class: 'art doc' }, h('div', { class: 'letterhead' }, g.letterhead),
        g.lines.map((l, i) => h('div', { class: i === 0 ? 'doc-title' : 'doc-line' }, l)));
    case 'contract':
      return h('div', { class: 'art doc' }, g.lines.map((l, i) => h('div', { class: i === 0 ? 'doc-title' : 'doc-line' }, l)),
        h('div', { class: 'stamp' }, 'PREVIEW'));
    case 'note':
      return h('div', { class: 'art note' },
        g.top.map(l => h('div', { class: 'hand' }, l)),
        h('div', { class: 'fold' }, '— 접힌 선 —'),
        g.bottom.map(l => h('div', { class: 'hand small' }, l)));
    case 'cam':
      return h('div', { class: 'art cam' },
        h('div', { class: 'cam-top' }, h('span', null, '● REC'), h('span', null, g.ts)),
        h('div', { class: 'cam-scene' }, g.scene),
        h('div', { class: 'cam-bottom' }, '띵동캠 · 현관'));
    case 'security':
      return h('div', { class: 'art security' },
        h('div', { class: 'cam-top' }, h('span', null, '보안 · 전면 카메라'), h('span', null, g.ts)),
        h('div', { class: 'sec-scene' }, g.scene));
    case 'group':
      return h('div', { class: 'art group' },
        h('div', { class: 'five' }, [0, 1, 2, 3, 4].map(i => h('span', { class: 'kid k' + i }))),
        h('div', { class: 'caption' }, g.caption));
    case 'article':
      return h('div', { class: 'art article' }, h('div', { class: 'press' }, '뉴스'), g.lines.map(l => h('div', { class: 'art-headline' }, l)));
    case 'pill':
      return h('div', { class: 'art pill' }, g.lines.map(l => h('div', null, l)), h('div', { class: 'warn' }, g.warning));
  }
  return h('div', { class: 'art' }, g.title);
}

export function gallery(route) {
  const items = G.data.apps.gallery;
  const m = route.match(/^gallery:(.+)$/);
  if (m) {
    const g = items.find(x => x.id === m[1]);
    return h('div', { class: 'app gallery' },
      header(`${g.album} · ${g.ts}`, 'gallery'),
      h('div', { class: 'gal-view' }, h('div', { class: 'gal-title' }, g.title), galleryArt(g)),
      g.pinGroup ? pinBar(g.pinGroup) : null);
  }
  const albums = [...new Set(items.map(x => x.album))];
  return h('div', { class: 'app gallery' },
    header('갤러리', 'home'),
    h('div', { class: 'gal-scroll' }, albums.map(a => [
      h('div', { class: 'album' }, a),
      h('div', { class: 'gal-grid' }, items.filter(x => x.album === a).map(g =>
        h('button', { class: 'gal-tile k-' + g.kind, onclick: () => go('gallery:' + g.id) },
          h('span', { class: 'tile-kind' }, g.title),
          h('span', { class: 'tile-ts' }, g.ts)))),
    ])));
}

// ───────── SNS ─────────
export function sns() {
  return h('div', { class: 'app sns' },
    header('SNS', 'home'),
    h('div', { class: 'feed' }, G.data.apps.sns.map(acc =>
      h('section', { class: 'acct' },
        h('div', { class: 'acct-head' }, h('b', null, acc.account), h('span', { class: 'sub' }, acc.label)),
        acc.posts.map(p => h('div', { class: 'post' + (p.draft ? ' draft' : '') },
          h('div', { class: 'post-ts' }, (p.draft ? '[임시저장] ' : '') + (p.video ? '▶ 영상 · ' : '') + p.ts),
          p.titleChange
            ? h('div', { class: 'post-text' }, h('s', null, p.text), h('div', { class: 'retitle' }, `${p.titleChange.ts} 제목 변경 → ${p.titleChange.to}`))
            : h('div', { class: 'post-text' }, p.text),
          p.views ? h('div', { class: 'sub' }, `조회수 ${p.views}`) : null,
          p.note ? h('div', { class: 'sub' }, p.note) : null,
          p.pinnedComment ? h('div', { class: 'comment pinned' }, '📌 채온: ' + p.pinnedComment) : null,
          p.comments ? h('div', { class: 'comments' }, p.comments.map(c => h('div', { class: 'comment' }, (c.ts ? c.ts + '  ' : '') + c.text))) : null))))));
}

// ───────── 인터넷 ─────────
const norm = (s) => s.replace(/\s+/g, '').toLowerCase();

export function searchKeyword(q) {
  const nq = norm(q);
  if (!nq) return null;
  return G.data.apps.browser.keywords.find(k => k.match.some(m => nq.includes(norm(m)))) || null;
}

function resultCard(r) {
  return h('div', { class: 'result r-' + r.type },
    h('div', { class: 'r-src' }, r.source),
    h('div', { class: 'r-title' }, r.title),
    r.body ? h('div', { class: 'r-body' }, r.body) : null,
    r.comments ? h('div', { class: 'comments' }, r.comments.map(c => h('div', { class: 'comment' }, '└ ' + c))) : null,
    r.pin ? pinBar(r.pin) : null);
}

const KIM_FIRST = ['○○', '△△', '□□', '◇◇'];
const KIM_KIND = ['법률사무소', '법무법인', '블로그', '뉴스', '카페', '지식인', '변호사 검색'];
const KIM_TITLE = [
  '김○○ 변호사 — 형사 전문', '김 변호사가 알려주는 계약서 체크리스트', '“김 변호사님 덕분에” 후기', '김△△ 변호사, ○○협회 이사 선임',
  '김 변호사 상담 후기 (내돈내산)', '김□□ 법률사무소 개소', '김 모 변호사 “사실관계 다툴 것”', '김 변호사 Q&A — 명예훼손 고소 절차',
  '김◇◇ 변호사 칼럼', '김 씨 변호사 찾습니다 (지인 소개)', '김○○ 변호사 프로필', '김 변호사 유튜브 — 합의금의 모든 것',
];
function kimMore(n, start) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const k = start + i;
    out.push({ type: 'gen', source: KIM_KIND[k % KIM_KIND.length], title: KIM_TITLE[(k * 5) % KIM_TITLE.length].replace('○○', KIM_FIRST[k % 4]), body: '' });
  }
  return out;
}

export function browser() {
  const B = G.data.apps.browser;
  const q = S.ui.browserQ || '';
  const input = h('input', { class: 'search', type: 'search', value: q, placeholder: '검색어 입력', enterkeyhint: 'search' });
  const doSearch = (text) => {
    S.ui.browserQ = text; S.ui.kimMore = 0; S.ui.scrollTop = 0;
    const kw = searchKeyword(text);
    if (kw) { addFlag('search:' + kw.id, true); }
    save(); app.afterChange(); app.render();
  };
  input.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(input.value); });

  let body;
  if (!q) {
    body = h('div', null,
      h('div', { class: 'b-sec' }, '최근 검색'),
      B.recent.map(r => h('button', { class: 'row recent', onclick: () => doSearch(r.q) },
        h('div', { class: 'row-main' }, h('span', null, '🕘 ' + r.q)), h('div', { class: 'row-ts' }, r.ts))),
      S.keywords.length ? h('div', { class: 'b-sec' }, '취재 수첩 키워드') : null,
      h('div', { class: 'chips' }, S.keywords.map(k => h('button', { class: 'chip', onclick: () => doSearch(k) }, k))));
  } else {
    const kw = searchKeyword(q);
    if (!kw) body = h('div', { class: 'noresult' }, B.noResultText);
    else {
      const extra = kw.endless ? kimMore((S.ui.kimMore || 0) * 12, 0) : [];
      body = h('div', null,
        kw.count ? h('div', { class: 'r-count' }, kw.count) : null,
        kw.results.map(resultCard),
        extra.map(resultCard),
        kw.endless ? h('button', { class: 'more', onclick: () => { S.ui.kimMore = (S.ui.kimMore || 0) + 1; app.render(); } }, '결과 더 보기 ↓') : null,
        kw.footer ? h('div', { class: 'intuition' }, '기자의 직감: ' + kw.footer) : null);
    }
  }
  return h('div', { class: 'app browser' },
    header('인터넷', 'home'),
    h('div', { class: 'searchbar' }, input,
      h('button', { class: 'go', onclick: () => doSearch(input.value) }, '검색'),
      q ? h('button', { class: 'go ghost', onclick: () => doSearch('') }, '×') : null),
    h('div', { class: 'b-body' }, body));
}

export function phoneView() {
  if (!S.unlocked) return lockScreen();
  const r = S.ui.phone || 'home';
  if (r === 'home') return home();
  if (r === 'sms' || r === 'calls' || r.startsWith('sms:')) return sms(r);
  if (r.startsWith('tg')) return telegram(r);
  if (r.startsWith('notes')) return notes(r);
  if (r.startsWith('gallery')) return gallery(r);
  if (r === 'sns') return sns();
  if (r === 'browser') return browser();
  return home();
}
