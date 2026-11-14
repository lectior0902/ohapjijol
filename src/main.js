// 진입점: 데이터 로드, 렌더 루프, 하단 네비
import { G, S, app, loadData, save, resetGame } from './state.js';
import { h, toast, modal } from './ui.js';
import { phoneView } from './phone.js';
import { bookView, budgetPill } from './interview.js';
import { evidenceView, endingView } from './ending.js';
import { checkTriggers, resumePending } from './events.js';

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
    }, h('span', { class: 'tab-icon' }, icon), h('span', null, name))));
}

function statusBar() {
  return h('div', { class: 'statusbar' },
    h('span', null, G.data.meta.gameClock),
    S.started && !S.ending ? budgetPill() : h('span'));
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
  lastKey = key;
}
app.render = render;

function menu() {
  modal((close) => h('div', null,
    h('div', { class: 'sheet-title' }, '메뉴'),
    h('div', { class: 'sub' }, '진행 상황은 이 브라우저에만 저장된다.'),
    h('div', { class: 'sheet-actions col' },
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
  render();
  resumePending();
  checkTriggers();
}

boot();
