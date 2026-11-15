// 폰 화면: 잠금화면, 홈, 앱 6종, 기사 페이지
import { G, S, app, pin, addFlag, save } from './state.js';
import { h } from './ui.js';
import { sceneSrc } from './pixel.js';
import { sfx } from './sound.js';

const ME = '임주연';
const fmtDay = (d) => { const p = d.split('-').map(Number); return p.length === 3 ? `${p[0]}년 ${p[1]}월 ${p[2]}일` : `${p[0]}월 ${p[1]}일`; };
const go = (route) => { S.ui.phone = route; app.render(); };

function header(title, back, extra, cls = '') {
  return h('div', { class: 'app-head ' + cls },
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
      onclick: () => { if (pin(id)) sfx.pin(); app.afterChange(); app.render(); },
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
    sfx.key();
    if (d === 'del') { entered = entered.slice(0, -1); app.render(); return; }
    if (entered.length >= 4) return;
    entered += d;
    if (entered.length === 4) {
      if (entered === G.data.meta.passcode) {
        S.unlocked = true; entered = ''; S.ui.keypad = false;
        app.toast(L.unlockToast, 5200); sfx.unlock();
        save(); app.render();
      } else {
        S.failCount++; entered = ''; sfx.wrong();
        document.querySelector('.pin-dots')?.classList.add('shake');
        setTimeout(() => app.render(), 380);
        save();
      }
      return;
    }
    app.render();
  };
  if (S.ui.keypad) {
    return h('div', { class: 'lock keypad-mode' },
      h('div', { class: 'keypad-wrap' },
        h('div', { class: 'lock-ic' }, '🔒'),
        h('div', { class: 'lock-prompt' }, '암호 입력'),
        dots,
        h('div', { class: 'lock-hint' }, hint),
        h('div', { class: 'keypad' },
          ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map(d =>
            d === '' ? h('span') :
            h('button', { class: 'key' + (d === 'del' ? ' del' : ''), onclick: () => press(d) }, d === 'del' ? '⌫' : d))),
        h('button', { class: 'lock-cancel', onclick: () => { S.ui.keypad = false; entered = ''; app.render(); } }, '취소')));
  }
  return h('div', { class: 'lock' },
    h('div', { class: 'lock-top' },
      h('div', { class: 'lock-ic' }, '🔒'),
      h('div', { class: 'lock-date' }, G.data.meta.gameDate),
      h('div', { class: 'lock-clock' }, G.data.meta.gameClock),
      h('div', { class: 'lock-wall' }, L.wallpaperText)),
    h('div', { class: 'notif-stack' }, L.notifications.map(n =>
      h('div', { class: 'notif' + (n.strong ? ' strong' : '') },
        h('span', { class: 'n-icon n-' + (NOTIF_IC[n.app] || ['', ''])[0] }, (NOTIF_IC[n.app] || ['', '•'])[1]),
        h('div', { class: 'n-main' },
          h('div', { class: 'notif-top' }, h('b', null, n.app), h('span', null, n.ts)),
          h('div', { class: 'notif-text' }, n.text))))),
    h('button', { class: 'unlock-hint', onclick: () => { S.ui.keypad = true; app.render(); } },
      h('span', { class: 'bar' }), '눌러서 잠금 해제'));
}
const NOTIF_IC = { '전화': ['call', '✆'], '문자': ['msg', '💬'], '띵동캠': ['cam', '🔔'], '메일': ['mail', '✉'], '보안': ['sec', '🛡'] };

// ───────── 홈 ─────────
const APPS = [
  { id: 'sms', name: '메시지', icon: '💬', color: 'linear-gradient(#5fe07f,#25b44a)' },
  { id: 'tg', name: '텔레그램', icon: '✈', color: 'linear-gradient(#45b6ee,#1f8fd1)' },
  { id: 'notes', name: '메모', icon: '📝', color: 'linear-gradient(#ffe27a,#f2b705)' },
  { id: 'gallery', name: '갤러리', icon: '🖼', color: 'linear-gradient(#d38cf0,#8f4fd8)' },
  { id: 'sns', name: 'SNS', icon: '◎', color: 'linear-gradient(#ff7a85,#e0245e)' },
  { id: 'browser', name: '인터넷', icon: '🌐', color: 'linear-gradient(#7aa7ff,#3a6fe0)' },
  { id: 'mail', name: '메일', icon: '✉', color: 'linear-gradient(#6fb8ff,#2a7de1)' },
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

// ───────── 메시지(문자) ─────────
// 게임 중 새로 오는 연락은 기자의 '내 휴대폰'(취재 수첩 > 내 폰)으로 간다. 주연의 폰에는 사건 당시 기록만.
function smsThreads() {
  return G.data.apps.sms.threads.map(t => ({ ...t, messages: [...t.messages] }));
}
function smsUnread() { return 0; }

function bubble(m, opts = {}) {
  const mine = m.from === ME;
  const color = opts.colors ? opts.colors[m.from] : null;
  return h('div', { class: 'msg ' + (mine ? 'me' : 'them') },
    !mine && opts.showName ? h('div', { class: 'msg-name', style: color ? `color:${color}` : null }, m.from) : null,
    m.image ? thumbnail(m.image) : null,
    m.text ? h('div', { class: 'msg-bubble' + (m.forward ? ' fwd' : '') }, m.text,
      m.file ? h('div', { class: 'msg-file' }, h('span', { class: 'file-ic' }, 'PDF'), m.file) : null,
      opts.inlineTs && m.ts ? h('span', { class: 'in-ts' }, m.ts) : null) : null,
    !opts.inlineTs && m.ts ? h('div', { class: 'msg-ts' }, m.ts) : null);
}

function thumbnail(img) {
  return h('div', { class: 'thumb' },
    h('div', { class: 'thumb-img' },
      h('div', { class: 'thumb-title' }, img.title),
      h('div', { class: 'thumb-mosaic' }),
      h('div', { class: 'thumb-capture' }, img.readout)),
    h('div', { class: 'thumb-desc' }, img.desc + ' 모자이크 틈으로 한 줄이 읽힌다.'));
}

export function sms(route) {
  const threads = smsThreads();
  if (route === 'calls') {
    if (addFlag('seen:calls', true)) { save(); app.afterChange(); }
    const open = S.ui.vmOpen || '';
    return h('div', { class: 'app light sms-app' },
      header('최근 통화', 'sms', null, 'light'),
      h('div', { class: 'list' }, G.data.apps.sms.callLog.map(c => {
        const key = `vm:${c.contact}:${c.ts}`;
        const isOpen = open === key;
        return h('div', { class: 'call-wrap' },
          h('div', { class: 'row call ' + (c.type === '부재중' ? 'missed' : '') },
            h('span', { class: 'call-ic' }, c.type === '발신' ? '↗' : '↙'),
            h('div', { class: 'row-main' }, h('b', null, c.contact), h('span', { class: 'sub' }, c.type + (c.duration ? ` · ${c.duration}` : '') + (c.vm ? ' · 음성 메시지' : ''))),
            c.vm ? h('button', { class: 'vm-btn' + (isOpen ? ' on' : ''), 'aria-label': '음성 메시지', onclick: () => {
              S.ui.vmOpen = isOpen ? '' : key;
              if (!isOpen && addFlag(key, true)) { save(); app.afterChange(); }
              if (!isOpen) sfx.message();
              app.render();
            } }, isOpen ? '❚❚' : '▶') : null,
            h('div', { class: 'row-ts' }, c.ts)),
          isOpen ? h('div', { class: 'vm-box' },
            h('div', { class: 'vm-wave' }, Array.from({ length: 28 }, (_, i) => h('i', { style: `height:${4 + ((i * 7) % 13)}px` }))),
            h('div', { class: 'vm-meta' }, `음성 메시지 · ${c.vm.len}`),
            h('div', { class: 'vm-text' }, '“' + c.vm.text + '”'),
            h('div', { class: 'vm-note' }, '받아쓰기 (자동 변환)')) : null);
      })));
  }
  const m = route.match(/^sms:(\d+)$/);
  if (m) {
    const t = threads[+m[1]];
    const out = [];
    let day = null;
    for (const x of t.messages) {
      const dd = (x.ts || '').split(' ')[0];
      if (dd !== day) { out.push(h('div', { class: 'day' }, fmtDay(dd))); day = dd; }
      out.push(bubble({ ...x, ts: (x.ts || '').split(' ')[1] || '' }));
    }
    return h('div', { class: 'app light sms-app' },
      header(t.contact, 'sms', null, 'light'),
      h('div', { class: 'chat' + (t.spam ? ' spam' : '') },
        t.spam ? h('div', { class: 'spam-tag' }, '⚠ 스팸으로 의심되는 메시지입니다') : null,
        out),
      t.pinGroup ? pinBar(t.pinGroup) : null);
  }
  return h('div', { class: 'app light sms-app' },
    header('메시지', 'home', h('button', { class: 'head-btn', onclick: () => go('calls') }, '통화'), 'light'),
    h('div', { class: 'list' }, threads.map((t, i) => {
      const last = t.messages[t.messages.length - 1];
      const unread = t.messages.some(x => x.at && !x.read);
      return h('button', { class: 'row' + (unread ? ' unread' : ''), onclick: () => go('sms:' + i) },
        h('span', { class: 'avatar' }, t.spam ? '!' : t.contact.slice(0, 1)),
        h('div', { class: 'row-main' }, h('b', null, t.contact), h('span', { class: 'sub' }, last.text)),
        h('div', { class: 'row-ts' }, last.ts));
    })));
}

// ───────── 텔레그램 ─────────
const TG_COLORS = { '박지영': '#e3a96b', '전채은': '#7ee07e', '성지인': '#6ab3f3', '정가연': '#ee7aae', '임주연': '#ffffff' };

function chatWithDays(messages, showName, { pinRuns = false } = {}) {
  const out = [];
  let day = null, ts = null, run = null;
  const flush = () => { if (run) { out.push(pinBar(run)); run = null; } };
  messages.forEach((m, i) => {
    if (pinRuns && (m.pin || null) !== run) flush();
    if (m.d !== day) { out.push(h('div', { class: 'day' }, fmtDay(m.d))); day = m.d; ts = null; }
    if (m.sys) out.push(h('div', { class: 'sysline' }, m.sys));
    else out.push(bubble({ ...m, ts: m.ts || '' }, { showName, colors: TG_COLORS, inlineTs: true }));
    if (pinRuns && m.pin) run = m.pin;
    if (i === messages.length - 1) flush();
  });
  return out;
}

export function telegram(route) {
  const T = G.data.apps.telegram;
  if (route === 'tg:g0') {
    const g = T.groups[0];
    if (addFlag('seen:tg-group', true)) { save(); app.afterChange(); }
    return h('div', { class: 'app tg' },
      header(g.name, 'tg', h('span', { class: 'tg-members' }, `멤버 ${g.members.length}`), 'tg-head'),
      h('div', { class: 'chat' },
        h('div', { class: 'group-info' },
          h('div', null, g.desc),
          h('div', { class: 'sub' }, g.members.join(' · '))),
        chatWithDays(g.messages, true, { pinRuns: true })));
  }
  const m = route.match(/^tg:dm(\d+)$/);
  if (m) {
    const dm = T.dms[+m[1]];
    return h('div', { class: 'app tg' },
      header(dm.contact, 'tg', h('span', { class: 'tg-members' }, '오래 전 접속'), 'tg-head'),
      h('div', { class: 'chat' }, chatWithDays(dm.messages, false)),
      dm.pinGroup ? pinBar(dm.pinGroup) : null);
  }
  const g = T.groups[0];
  const lastOf = (arr) => arr[arr.length - 1];
  const preview = (x) => x.text ? x.text.split('\n')[0] : '사진';
  return h('div', { class: 'app tg' },
    header('Telegram', 'home', null, 'tg-head'),
    h('div', { class: 'list' },
      h('button', { class: 'row', onclick: () => go('tg:g0') },
        h('span', { class: 'avatar grp' }, '五'),
        h('div', { class: 'row-main' }, h('b', null, g.name), h('span', { class: 'sub' }, h('span', { style: `color:${TG_COLORS[lastOf(g.messages).from]}` }, lastOf(g.messages).from + ': '), preview(lastOf(g.messages)))),
        h('div', { class: 'row-ts' }, lastOf(g.messages).d.slice(5).replace('-', '/'))),
      T.dms.map((dm, i) => h('button', { class: 'row', onclick: () => go('tg:dm' + i) },
        h('span', { class: 'avatar', style: `background:${TG_COLORS[dm.contact]}33;color:${TG_COLORS[dm.contact]}` }, dm.contact.slice(0, 1)),
        h('div', { class: 'row-main' }, h('b', null, dm.contact), h('span', { class: 'sub' }, preview(lastOf(dm.messages)))),
        h('div', { class: 'row-ts' }, lastOf(dm.messages).d.slice(5).replace('-', '/'))))));
}

// ───────── 메모 ─────────
export function notes(route) {
  const N = G.data.apps.notes;
  const m = route.match(/^notes:(\d+)$/);
  if (m) {
    const n = N[+m[1]];
    if (addFlag('note:' + n.title, true)) save();
    return h('div', { class: 'app notes' },
      header('메모', 'notes', null, 'notes-head'),
      h('div', { class: 'note-page' },
        h('h2', null, n.title),
        h('div', { class: 'note-meta' }, `수정 ${n.updated}`),
        h('div', { class: 'note-body' }, n.body)),
      n.pinGroup ? pinBar(n.pinGroup) : null);
  }
  return h('div', { class: 'app notes' },
    header('메모', 'home', null, 'notes-head'),
    h('div', { class: 'list' }, N.map((n, i) =>
      h('button', { class: 'row', onclick: () => go('notes:' + i) },
        h('div', { class: 'row-main' }, h('b', null, n.title), h('span', { class: 'sub' }, n.body.split('\n')[0])),
        h('div', { class: 'row-ts' }, n.updated)))));
}

// ───────── 갤러리 ─────────
function pixelArt(g) {
  if (g.frames) return h('div', { class: 'frames' }, g.frames.map(f => pixelArt({ ...g, frames: null, pixel: f.pixel, ts: f.ts })));
  const src = sceneSrc(g.pixel);
  const cam = g.kind === 'cam', sec = g.kind === 'security';
  return h('div', { class: 'art pix ' + (cam ? 'pix-cam' : sec ? 'pix-sec' : 'pix-photo') },
    h('img', { src, alt: g.scene || g.title, class: 'pix-img' }),
    cam ? h('div', { class: 'pix-overlay' }, h('span', null, '● REC'), h('span', null, g.ts)) : null,
    sec ? h('div', { class: 'pix-overlay' }, h('span', null, '보안 · 전면 카메라'), h('span', null, g.ts)) : null,
    cam ? h('div', { class: 'pix-foot' }, '띵동캠 · 현관') : null,
    g.caption ? h('div', { class: 'pix-caption' }, g.caption) : null);
}

export function galleryArt(g) {
  if (g.pixel) return h('div', null, pixelArt(g), g.scene ? h('div', { class: 'scene-desc' }, g.scene) : null);
  switch (g.kind) {
    case 'cake':
      return h('div', { class: 'art cake' }, h('div', { class: 'cake-brand' }, g.lines[0]), h('div', { class: 'cake-ok' }, '✓ ' + g.lines[1]),
        g.lines.slice(2).map(l => h('div', { class: 'cake-line' }, l)));
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
    case 'article': {
      const a = articleById(g.article);
      return h('div', { class: 'art shot' }, h('div', { class: 'shot-bar' }, '📶 ' + a.outlet), articleBody(a, true));
    }
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
      header(`${g.album} · ${g.ts}`, 'gallery', null, 'gal-head'),
      h('div', { class: 'gal-view' }, h('div', { class: 'gal-title' }, g.title), galleryArt(g)),
      g.pinGroup ? pinBar(g.pinGroup) : null);
  }
  const albums = [...new Set(items.map(x => x.album))];
  return h('div', { class: 'app gallery' },
    header('갤러리', 'home', null, 'gal-head'),
    h('div', { class: 'gal-scroll' }, albums.map(a => [
      h('div', { class: 'album' }, a),
      h('div', { class: 'gal-grid' }, items.filter(x => x.album === a).map(g =>
        h('button', { class: 'gal-tile k-' + g.kind + (g.pixel ? ' has-pix' : '') + (g.daily ? ' daily' : ''), onclick: () => go('gallery:' + g.id),
          style: g.pixel ? `background-image:url(${sceneSrc(g.pixel)})` : null },
          h('span', { class: 'tile-kind' }, g.title),
          h('span', { class: 'tile-ts' }, g.ts)))),
    ])));
}

// ───────── SNS ─────────
function snsPrivate(acc) {
  return h('div', { class: 'sns-x' },
    h('div', { class: 'x-profile' },
      h('div', { class: 'x-cover' }),
      h('span', { class: 'x-avatar' }, '주'),
      h('div', { class: 'x-name' }, acc.name, ' ', h('span', { class: 'lock-ic' }, '🔒')),
      h('div', { class: 'sub' }, '@' + acc.account + ' · ' + acc.label)),
    acc.posts.map(p => p.draft
      ? h('div', { class: 'x-draft' },
          h('div', { class: 'x-draft-tag' }, `임시저장 · ${p.ts}`),
          h('div', { class: 'x-text' }, p.text),
          h('div', { class: 'x-draft-btn' }, '게시하지 않음'))
      : h('div', { class: 'x-post' + (p.daily ? ' daily' : '') },
          h('span', { class: 'x-avatar sm' }, '주'),
          h('div', { class: 'x-body' },
            h('div', null, h('b', null, acc.name), h('span', { class: 'sub' }, ` @${acc.account} · ${p.ts}`)),
            h('div', { class: 'x-text' }, p.text),
            h('div', { class: 'x-actions' }, h('span', null, '💬 0'), h('span', null, '↻ 0'), h('span', null, `♡ ${p.likes}`))))));
}

function snsChannel(acc) {
  return h('div', { class: 'sns-yt' },
    h('div', { class: 'yt-banner' }, h('span', null, 'CHAE-ON')),
    h('div', { class: 'yt-head' },
      h('span', { class: 'yt-avatar' }, '채'),
      h('div', null, h('div', { class: 'yt-name' }, acc.account), h('div', { class: 'sub' }, `${acc.handle} · ${acc.label}`)),
      h('span', { class: 'yt-sub' }, '구독중')),
    h('div', { class: 'yt-tabs' }, h('span', null, '홈'), h('span', null, '동영상'), h('span', { class: 'on' }, '커뮤니티')),
    acc.posts.map(p => p.kind === 'community'
      ? h('div', { class: 'yt-card' },
          h('div', { class: 'yt-card-head' }, h('span', { class: 'yt-avatar sm' }, '채'), h('b', null, acc.account), h('span', { class: 'sub' }, ' · ' + p.ts)),
          h('div', { class: 'yt-text' }, p.text),
          h('div', { class: 'yt-actions' }, h('span', null, `👍 ${p.likes}`), h('span', null, '👎'), h('span', null, `💬 ${p.commentCount}`)),
          h('div', { class: 'yt-comments' },
            h('div', { class: 'sub' }, `댓글 ${p.commentCount}개 · 인기순`),
            p.comments.map(c => h('div', { class: 'yt-comment' },
              h('span', { class: 'c-avatar' }, c.user.slice(1, 2).toUpperCase()),
              h('div', null,
                h('div', { class: 'c-user' }, c.user, c.ts ? h('span', { class: 'sub' }, ' · ' + c.ts) : null),
                h('div', null, c.text),
                h('div', { class: 'sub' }, `👍 ${c.likes}`))))))
      : h('div', { class: 'yt-video' },
          h('div', { class: 'yt-thumb' + (p.titleChange ? ' red' : '') }, h('span', { class: 'yt-dur' }, p.titleChange ? '14:02' : '11:37')),
          h('div', { class: 'yt-vinfo' },
            p.titleChange
              ? [h('div', { class: 'yt-vtitle' }, p.titleChange.to),
                 h('div', { class: 'retitle' }, `제목 변경됨 (${p.titleChange.ts}) · 이전 제목: ${p.text}`)]
              : h('div', { class: 'yt-vtitle' }, p.text),
            h('div', { class: 'sub' }, `조회수 ${p.views} · ${p.ts}`),
            p.note ? h('div', { class: 'sub' }, p.note) : null,
            p.pinnedComment ? h('div', { class: 'yt-pinned' }, '📌 고정 댓글 · 채온: ' + p.pinnedComment) : null))));
}

function snsOfficial(acc) {
  return h('div', { class: 'sns-off' },
    h('div', { class: 'off-head' },
      h('span', { class: 'off-logo' }, acc.account.slice(0, 1)),
      h('div', null, h('div', { class: 'off-name' }, acc.account, h('span', { class: 'verified' }, '✔')), h('div', { class: 'sub' }, `${acc.handle} · ${acc.label}`))),
    acc.posts.map(p => h('div', { class: 'off-post' },
      h('div', { class: 'off-date' }, p.ts),
      h('div', { class: 'off-title' }, p.title),
      h('div', { class: 'off-text' }, p.text),
      h('div', { class: 'sub' }, `♡ ${p.likes}`))));
}

function snsInsta(acc) {
  return h('div', { class: 'sns-ig' },
    h('div', { class: 'ig-head' },
      h('span', { class: 'ig-avatar' }, '책'),
      h('div', null, h('b', null, acc.account), h('div', { class: 'sub' }, acc.name + ' · ' + acc.label))),
    acc.posts.map(p => h('div', { class: 'ig-post' },
      h('div', { class: 'ig-img' }, h('div', { class: 'shutter' }), h('span', null, p.image)),
      h('div', { class: 'ig-actions' }, '♡  💬  ➤'),
      h('div', null, h('b', null, `좋아요 ${p.likes}개`)),
      h('div', { class: 'ig-cap' }, h('b', null, acc.account + ' '), p.text),
      h('div', { class: 'sub' }, p.ts))));
}

export function sns() {
  const accs = G.data.apps.sns;
  const i = Math.min(S.ui.snsAcc || 0, accs.length - 1);
  const acc = accs[i];
  if (addFlag('seen:sns', true)) { save(); app.afterChange(); }
  const render = { private: snsPrivate, channel: snsChannel, official: snsOfficial, insta: snsInsta }[acc.style];
  return h('div', { class: 'app sns sns-' + acc.style },
    header('SNS', 'home', null, 'sns-head'),
    h('div', { class: 'acc-tabs' }, accs.map((a, k) =>
      h('button', { class: 'acc-tab' + (k === i ? ' on' : ''), onclick: () => { S.ui.snsAcc = k; app.render(); } }, a.name || a.account))),
    render(acc));
}

// ───────── 기사 ─────────
export const articleById = (id) => G.data.articles.find(a => a.id === id);

export function articleBody(a, compact = false) {
  return h('article', { class: 'news b-' + a.brand + (compact ? ' compact' : '') },
    h('div', { class: 'news-mast' }, h('span', { class: 'news-logo' }, a.outlet), h('span', { class: 'news-menu' }, '☰')),
    h('div', { class: 'news-sec' }, a.section),
    h('h1', { class: 'news-title' }, a.title),
    a.sub ? h('div', { class: 'news-sub' }, a.sub) : null,
    h('div', { class: 'news-by' }, h('span', null, a.reporter), h('span', null, '입력 ' + a.date)),
    a.photo && !compact ? h('figure', { class: 'news-photo' }, h('div', { class: 'ph' }), h('figcaption', null, a.photo)) : null,
    (compact ? a.body.slice(0, 1) : a.body).map(p => h('p', null, p)),
    a.footer && !compact ? h('div', { class: 'news-foot' }, a.footer) : null,
    !compact ? h('div', { class: 'news-copy' }, `© ${a.outlet} 무단 전재 및 재배포 금지`) : null);
}

function articlePage(id) {
  const a = articleById(id);
  return h('div', { class: 'app light' },
    header(a.outlet, S.ui.articleBack || 'browser', null, 'light'),
    articleBody(a));
}

// ───────── 인터넷 ─────────
const norm = (s) => s.replace(/\s+/g, '').toLowerCase();

export function searchKeyword(q) {
  const nq = norm(q);
  if (!nq) return null;
  return G.data.apps.browser.keywords.find(k => k.match.some(m => nq.includes(norm(m)))) || null;
}

const TYPE_LABEL = { news: '뉴스', community: '커뮤니티', archive: '아카이브', ad: '광고', blog: '블로그', service: '서비스', info: '지식백과', company: '기업정보', site: '웹사이트', video: '동영상', channel: '채널', gen: '웹문서' };

function resultCard(r) {
  const art = r.article ? articleById(r.article) : null;
  const open = art ? () => { S.ui.articleBack = 'browser'; go('article:' + art.id); } : null;
  return h('div', { class: 'result r-' + r.type + (art ? ' link' : ''), onclick: open },
    h('div', { class: 'r-src' }, h('span', { class: 'r-fav' }, (r.source || '·').slice(0, 1)), h('span', null, r.source), h('span', { class: 'r-type' }, TYPE_LABEL[r.type] || '')),
    r.type === 'video' ? h('div', { class: 'r-video' }, h('div', { class: 'r-vthumb' }, '▶'), h('div', { class: 'r-title' }, r.title))
      : h('div', { class: 'r-title' }, r.title || (art ? art.title : '')),
    art && !r.body ? h('div', { class: 'r-body' }, art.body[0]) : (r.body ? h('div', { class: 'r-body' }, r.body) : null),
    r.comments ? h('div', { class: 'r-comments' }, r.comments.map(c => h('div', null, '└ ' + c))) : null,
    r.pin ? h('div', { onclick: (e) => e.stopPropagation() }, pinBar(r.pin)) : null);
}

const KIM_FIRST = ['○○', '△△', '□□', '◇◇'];
const KIM_KIND = ['법률사무소', '법무법인', '블로그', '뉴스', '카페', '지식인', '변호사 검색'];
const KIM_TITLE = [
  '김○○ 변호사 — 형사 전문', '김 변호사가 알려주는 계약서 체크리스트', '“김 변호사님 덕분에” 후기', '김△△ 변호사, ○○협회 이사 선임',
  '김 변호사 상담 후기 (내돈내산)', '김□□ 법률사무소 개소', '김 모 변호사 “사실관계 다툴 것”', '김 변호사 Q&A — 명예훼손 고소 절차',
  '김◇◇ 변호사 칼럼', '김 씨 변호사 찾습니다 (지인 소개)', '김○○ 변호사 프로필', '김 변호사 유튜브 — 합의금의 모든 것',
];
function kimMore(n) {
  const out = [];
  for (let k = 0; k < n; k++) {
    out.push({ type: 'gen', source: KIM_KIND[k % KIM_KIND.length], title: KIM_TITLE[(k * 5) % KIM_TITLE.length].replace('○○', KIM_FIRST[k % 4]), body: '' });
  }
  return out;
}

export function browser() {
  const B = G.data.apps.browser;
  const q = S.ui.browserQ || '';
  const input = h('input', { class: 'search', type: 'search', value: q, placeholder: '검색어를 입력하세요', enterkeyhint: 'search' });
  const doSearch = (text) => {
    S.ui.browserQ = text; S.ui.kimMore = 0;
    const kw = searchKeyword(text);
    if (kw) addFlag('search:' + kw.id, true);
    save(); app.afterChange(); app.render();
  };
  input.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(input.value); });

  let body;
  if (!q) {
    body = h('div', null,
      h('div', { class: 'portal-logo' }, h('span', null, 'Q'), 'uest'),
      h('div', { class: 'b-sec' }, '최근 검색어'),
      B.recent.map(r => h('button', { class: 'row recent', onclick: () => doSearch(r.q) },
        h('div', { class: 'row-main' }, h('span', null, '🕘  ' + r.q)), h('div', { class: 'row-ts' }, r.ts))),
      h('details', { class: 'older' },
        h('summary', null, '이전 검색 기록'),
        (B.older || []).map(r => h('button', { class: 'row recent', onclick: () => doSearch(r.q) },
          h('div', { class: 'row-main' }, h('span', null, '🕘  ' + r.q)), h('div', { class: 'row-ts' }, r.ts)))),
      S.keywords.length ? h('div', { class: 'b-sec' }, '취재 수첩 키워드') : null,
      h('div', { class: 'chips' }, S.keywords.map(k => h('button', { class: 'chip', onclick: () => doSearch(k) }, '# ' + k))));
  } else {
    const kw = searchKeyword(q);
    if (!kw) body = h('div', { class: 'noresult' }, h('div', { class: 'nr-big' }, `‘${q}’`), B.noResultText);
    else {
      const extra = kw.endless ? kimMore((S.ui.kimMore || 0) * 12) : [];
      body = h('div', null,
        h('div', { class: 'r-tabs' }, h('span', { class: 'on' }, '통합'), h('span', null, '뉴스'), h('span', null, '블로그'), h('span', null, '동영상')),
        kw.count ? h('div', { class: 'r-count' }, kw.count) : null,
        kw.results.map(resultCard),
        extra.map(resultCard),
        kw.endless ? h('button', { class: 'more', onclick: () => { S.ui.kimMore = (S.ui.kimMore || 0) + 1; app.render(); } }, '검색결과 더보기 ⌄') : null,
        kw.footer ? h('div', { class: 'intuition' }, '기자의 직감: ' + kw.footer) : null);
    }
  }
  return h('div', { class: 'app light browser' },
    h('div', { class: 'searchbar' },
      h('button', { class: 'back', onclick: () => go('home'), 'aria-label': '뒤로' }, '‹'),
      input,
      q ? h('button', { class: 'clear', onclick: () => doSearch(''), 'aria-label': '지우기' }, '✕') : null,
      h('button', { class: 'go', onclick: () => doSearch(input.value), 'aria-label': '검색' }, '🔍')),
    h('div', { class: 'b-body' }, body));
}

// ───────── 메일 ─────────
export function mail(route) {
  const M = G.data.apps.mail;
  const fname = Object.fromEntries(M.folders);
  const inFolder = (x, fid) => x.folder === fid || (fid === 'scheduled' && x.scheduled);
  const m = route.match(/^mail:item:(.+)$/);
  if (m) {
    const it = M.items.find(x => x.id === m[1]);
    if (addFlag('mail:' + it.id, true)) { save(); app.afterChange(); }
    return h('div', { class: 'app light mail-app' },
      header(fname[it.folder], 'mail:' + it.folder, null, 'light'),
      h('div', { class: 'mail-view' },
        h('h2', { class: 'mail-subj' }, it.subject),
        it.scheduled ? h('div', { class: 'mail-sched' }, `⏱ 예약 발송 완료 · 작성 ${it.written} → 발송 ${it.ts}`) : null,
        it.folder === 'drafts' ? h('div', { class: 'mail-sched draft' }, '✎ 임시 저장 · 보내지 않은 메일') : null,
        h('div', { class: 'mail-hdr' },
          h('span', { class: 'mail-av' + (it.bank ? ' bank' : '') }, (it.from || '?').slice(0, 1)),
          h('div', { class: 'mail-who' },
            h('div', null, h('b', null, it.from)),
            h('div', { class: 'sub' }, `받는 사람: ${it.to || '(비어 있음)'}`)),
          h('div', { class: 'row-ts' }, it.ts)),
        h('div', { class: 'mail-body' + (it.cut ? ' cut' : '') }, it.body),
        it.attach ? h('div', { class: 'mail-attach' }, h('span', { class: 'file-ic' }, 'PDF'), it.attach) : null));
  }
  const f = route.match(/^mail:(\w+)$/);
  if (f) {
    const list = M.items.filter(x => inFolder(x, f[1]));
    return h('div', { class: 'app light mail-app' },
      header(fname[f[1]], 'mail', null, 'light'),
      h('div', { class: 'list' }, list.map(it => {
        const who = it.folder === 'inbox' ? it.from : (it.to || '(받는 사람 없음)');
        return h('button', { class: 'row mail-row' + (it.daily ? ' daily' : ''), onclick: () => go('mail:item:' + it.id) },
          h('span', { class: 'mail-av' + (it.bank ? ' bank' : '') }, who.slice(0, 1)),
          h('div', { class: 'row-main' },
            h('b', null, who),
            h('span', { class: 'mail-s' }, it.subject),
            h('span', { class: 'sub' }, it.body.split('\n')[0])),
          h('div', { class: 'row-ts' }, it.ts));
      })));
  }
  const icon = { inbox: '📥', sent: '📤', drafts: '📝', scheduled: '⏱' };
  return h('div', { class: 'app light mail-app' },
    header('메일', 'home', null, 'light'),
    h('div', { class: 'mail-acct' }, 'jy.lim · 개인 메일'),
    h('div', { class: 'list' }, M.folders.map(([fid, name]) => h('button', { class: 'row', onclick: () => go('mail:' + fid) },
      h('span', { class: 'folder-ic' }, icon[fid]),
      h('div', { class: 'row-main' }, h('b', null, name)),
      h('div', { class: 'row-ts' }, String(M.items.filter(x => inFolder(x, fid)).length))))));
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
  if (r.startsWith('article:')) return articlePage(r.slice(8));
  if (r === 'mail' || r.startsWith('mail:')) return mail(r);
  return home();
}
