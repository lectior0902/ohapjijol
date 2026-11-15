// 진입점: 데이터 로드, 렌더 루프, 하단 네비
import { G, S, app, loadData, save, resetGame, remaining } from './state.js';
import { h, toast, modal } from './ui.js';
import { phoneView } from './phone.js';
import { bookView } from './interview.js';
import { evidenceView, endingView } from './ending.js';
import { checkTriggers, resumePending } from './events.js';
import { screenSrc } from './pixel.js';
import { isMuted, setMuted, sfx } from './sound.js';

app.toast = toast;
app.afterChange = () => setTimeout(checkTriggers, 300);

let lastKey = '';

function viewKey() {
  if (S.ending) return 'ending';
  if (!S.started) return 'intro';
  const t = S.ui.tab;
  return t + ':' + (t === 'phone' ? (S.unlocked ? S.ui.phone : 'lock') : t === 'book' ? (S.ui.book || 'list') : (S.ui.ev || 'list'));
}

function introView() {
  const M = G.data.meta;
  return h('div', { class: 'intro' },
    h('img', { class: 'intro-key', src: screenSrc('title'), alt: '' }),
    h('div', { class: 'intro-press' }, '잠신일보 디지털탐사팀'),
    h('h1', { class: 'intro-title' }, M.title),
    h('div', { class: 'intro-sub' }, M.subtitle),
    h('div', { class: 'intro-text' }, M.intro.map(p => h('p', null, p))),
    h('button', { class: 'primary big', onclick: () => {
      S.started = true; S.ui.tab = 'phone'; save(); render();
    } }, '폰을 받는다'),
    h('div', { class: 'sub center' }, `플레이타임 ${M.playtime} · 진행은 이 브라우저에 자동 저장됩니다`));
}

function nav() {
  const tabs = [['phone', '폰 화면', '📱'], ['book', '취재 수첩', '📓'], ['evidence', '증거함', '📌']];
  return h('nav', { class: 'tabs' }, tabs.map(([id, name, icon]) =>
    h('button', {
      class: 'tab' + (S.ui.tab === id ? ' on' : ''),
      onclick: () => {
        if (S.ui.tab === id) {
          // 같은 탭을 다시 누르면 첫 화면으로
          if (id === 'phone') S.ui.phone = 'home';
          if (id === 'book') S.ui.book = 'list';
          if (id === 'evidence') S.ui.ev = 'list';
        }
        S.ui.tab = id; save(); render();
      },
    }, h('span', { class: 'tab-icon' }, icon,
        id === 'book' ? h('i', { class: 'tab-badge' + (remaining() <= 5 ? ' low' : '') }, remaining()) : null),
      h('span', null, name))));
}

const SB_ICONS = '<svg width="17" height="11" viewBox="0 0 17 11"><rect x="0" y="7" width="3" height="4" rx="1"/><rect x="4.5" y="5" width="3" height="6" rx="1"/><rect x="9" y="2.5" width="3" height="8.5" rx="1"/><rect x="13.5" y="0" width="3" height="11" rx="1"/></svg>'
  + '<svg width="15" height="11" viewBox="0 0 15 11"><path d="M7.5 2.2c2.2 0 4.2.8 5.7 2.2l1.2-1.3A10 10 0 0 0 7.5.4 10 10 0 0 0 .6 3.1l1.2 1.3a8.2 8.2 0 0 1 5.7-2.2Zm0 3.5c1.2 0 2.4.5 3.3 1.3l1.2-1.3a6.6 6.6 0 0 0-9 0L4.2 7a4.8 4.8 0 0 1 3.3-1.3Zm0 3.4L9.4 7.3a2.8 2.8 0 0 0-3.8 0Z"/></svg>'
  + '<svg width="25" height="12" viewBox="0 0 25 12"><rect x=".5" y=".5" width="21" height="11" rx="3" fill="none" stroke="currentColor" opacity=".45"/><rect x="2" y="2" width="12" height="8" rx="1.6"/><rect x="22.6" y="4" width="1.6" height="4" rx=".8" opacity=".45"/></svg>';

function statusBar() {
  return h('div', { class: 'statusbar' },
    h('span', { class: 'sb-time' }, G.data.meta.gameClock),
    h('span', { class: 'sb-icons', html: SB_ICONS }));
}

function isLightScreen() {
  if (!S.started || S.ending || S.ui.tab !== 'phone' || !S.unlocked) return false;
  const r = S.ui.phone || '';
  return r === 'sms' || r === 'calls' || r.startsWith('sms:') || r === 'browser' || r.startsWith('article:') || r === 'mail' || r.startsWith('mail:');
}

export function render() {
  const view = document.getElementById('view');
  const key = viewKey();
  const keepScroll = key === lastKey ? view.scrollTop : 0;
  let content;
  if (S.ending) content = endingView();
  else if (!S.started) content = introView();
  else if (S.ui.tab === 'book') content = bookView();
  else if (S.ui.tab === 'evidence') content = evidenceView();
  else content = phoneView();

  document.getElementById('status').replaceChildren(statusBar());
  view.replaceChildren(content);
  view.scrollTop = keepScroll;
  const showNav = S.started && !S.ending;
  document.getElementById('nav').replaceChildren(showNav ? nav() : '');
  document.getElementById('phone').classList.toggle('no-nav', !showNav);
  document.getElementById('phone').classList.toggle('light-ui', isLightScreen());
  lastKey = key;
}
app.render = render;

function menu() {
  modal((close) => h('div', null,
    h('div', { class: 'sheet-title' }, '메뉴'),
    h('div', { class: 'sub' }, '진행 상황은 이 브라우저에만 저장된다.'),
    h('div', { class: 'sheet-actions col' },
      h('button', { class: 'ghost', onclick: () => { setMuted(!isMuted()); close(); menu(); if (!isMuted()) sfx.notify(); } }, isMuted() ? '🔇 효과음 켜기' : '🔊 효과음 끄기'),
      h('button', { class: 'ghost', onclick: close }, '계속하기'),
      h('button', { class: 'danger', onclick: () => { close(); resetGame(); render(); } }, '처음부터 다시 하기'))));
}

async function boot() {
  try {
    await loadData();
  } catch (e) {
    document.getElementById('view').textContent = '게임 데이터를 불러오지 못했습니다. 새로고침해 주세요.';
    return;
  }
  document.title = `${G.data.meta.title} — ${G.data.meta.subtitle}`;
  document.getElementById('menu-btn').addEventListener('click', menu);
  let scrollTimer = null;
  document.addEventListener('scroll', (e) => {
    const el = e.target;
    if (!(el instanceof HTMLElement)) return;
    el.classList.add('scrolling');
    clearTimeout(el._st);
    el._st = setTimeout(() => el.classList.remove('scrolling'), 900);
  }, true);
  render();
  if (G.staleSave) toast('게임이 업데이트되어 이전 진행 기록은 처음부터 다시 시작합니다.', 4200);
  resumePending();
  checkTriggers();
}

boot();
