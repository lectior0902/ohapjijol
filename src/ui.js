// 작은 DOM 헬퍼
import { portraitSrc, avatarSrc } from './pixel.js';
export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style') el.style.cssText = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'html') el.innerHTML = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

let toastTimer = null;
export function toast(text, ms = 2600) {
  const el = document.getElementById('toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

// 화면 위쪽 푸시 배너
export function banner(title, text, onclick) {
  const host = document.getElementById('banners');
  const el = h('div', { class: 'banner', onclick: () => { el.remove(); onclick && onclick(); } },
    h('div', { class: 'banner-app' }, title),
    h('div', { class: 'banner-text' }, text));
  host.append(el);
  setTimeout(() => el.classList.add('show'), 20);
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, 9000);
}

// 모달(폰 화면 위 시트)
export function modal(content, { dismissable = true, cls = '' } = {}) {
  const host = document.getElementById('modal');
  host.innerHTML = '';
  const close = () => { host.innerHTML = ''; host.classList.remove('open'); };
  const sheet = h('div', { class: 'sheet ' + cls });
  sheet.append(typeof content === 'function' ? content(close) : content);
  const back = h('div', { class: 'scrim', onclick: () => dismissable && close() });
  host.append(back, sheet);
  host.classList.add('open');
  return close;
}

export const isModalOpen = () => document.getElementById('modal').classList.contains('open');

// 초상 플레이스홀더 (픽셀 아트는 2차 작업)
export function portrait(sus, expr, size = 'lg') {
  const [c1, c2, c3] = sus.palette;
  return h('div', { class: `portrait ${size}`, style: `--c1:${c1};--c2:${c2};--c3:${c3}` },
    h('img', { class: 'portrait-img', src: size === 'lg' ? portraitSrc(sus.id, expr) : (avatarSrc(sus.id) || portraitSrc(sus.id, expr)), alt: `${sus.name} · ${expr}` }),
    size === 'lg' ? h('div', { class: 'portrait-expr' }, `${expr} · ${sus.expressions[expr]}`) : null);
}
