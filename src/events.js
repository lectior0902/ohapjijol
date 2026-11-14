// 돌발 이벤트 3종: 국과수 속보, 기습 착신 전화, 편집국장 독촉
import { G, S, app, save, spend, remaining, memo, addFlag } from './state.js';
import { h, banner, modal, isModalOpen, toast } from './ui.js';
import { parkCombineCheck } from './interview.js';
import { articleBody, articleById } from './phone.js';

const E = () => G.data.events;
const pinned = (id) => S.pinned.includes(id);

export function queueSms(contact, text, delayMs = 0) {
  const at = Date.now() + delayMs;
  S.extraSms.push({ contact, from: contact, text, ts: '11-13 21:' + String(14 + S.extraSms.length).padStart(2, '0'), at });
  save();
  scheduleDelivery(contact, text, delayMs);
}

function scheduleDelivery(contact, text, delayMs) {
  setTimeout(() => {
    banner(`문자 · ${contact}`, text, () => { S.ui.tab = 'phone'; S.ui.phone = 'sms'; app.render(); });
    app.render();
  }, Math.max(0, delayMs));
}

// 새로고침 뒤 아직 도착하지 않은 문자 재예약
export function resumePending() {
  const now = Date.now();
  S.extraSms.filter(m => m.at > now).forEach(m => scheduleDelivery(m.contact, m.text, m.at - now));
}

let checking = false;
export function checkTriggers() {
  if (checking || !S.started || S.ending) return;
  if (isModalOpen()) { setTimeout(checkTriggers, 700); return; }
  checking = true;
  try {
    if (!S.events.forensic && (pinned('E08') || pinned('E12') || S.spent >= 6)) {
      fireForensic();
    }
    if (!S.events.call && (S.spent >= 10 || pinned('E03') || pinned('E05'))) {
      fireCall(pinned('E03') || pinned('E05') ? 'park' : 'sung');
      return;
    }
    if (!S.events.editor && remaining() <= 5) {
      fireEditor();
      return;
    }
  } finally { checking = false; }
}

// ── 5.1 국과수 속보 ──
function fireForensic() {
  const F = E().forensic;
  S.events.forensic = true;
  memo(`[잠신일보 속보] 국과수 결과. 메모: ${F.memo}`, 'event');
  save();
  const open = () => modal((close) => h('div', { class: 'news-sheet' },
    articleBody(articleById(F.article)),
    h('div', { class: 'intuition' }, '수첩: ' + F.memo),
    h('div', { class: 'sheet-actions' }, h('button', { class: 'primary', onclick: close }, '닫기'))));
  setTimeout(() => banner('잠신일보 속보', F.banner.replace('[잠신일보 속보] ', ''), open), 600);
}

// ── 5.2 기습 착신 전화 ──
function fireCall(who) {
  const C = E().call[who];
  const name = who === 'park' ? '박지영' : '성지인';
  S.events.call = who;
  save();
  setTimeout(() => {
    modal((close) => {
      const box = h('div', { class: 'call' });
      const finish = () => { close(); save(); app.render(); setTimeout(checkTriggers, 500); };

      const ringing = () => {
        box.replaceChildren(
          h('div', { class: 'call-label' }, '수신 전화'),
          h('div', { class: 'call-name' }, name),
          h('div', { class: 'call-sub' }, '휴대전화'),
          h('div', { class: 'call-actions' },
            h('button', { class: 'call-btn decline', onclick: refuse }, '거절'),
            h('button', { class: 'call-btn accept', onclick: answer }, '받기')));
      };
      const refuse = () => {
        S.events.callChoice = 3;
        if (who === 'park') { addFlag('park-refused', true); S.suspects.park.expr = '동요'; }
        queueSms(name, C.refuseSms, 1500);
        finish();
      };
      const answer = () => {
        box.replaceChildren(
          h('div', { class: 'call-label' }, '통화 중 · ' + name),
          h('div', { class: 'call-script' }, `“${C.script}”`),
          h('div', { class: 'call-choices' },
            h('button', { class: 'choice', onclick: listen }, '① 듣기만 한다'),
            h('button', { class: 'choice', disabled: remaining() < 1, onclick: press }, `② 추궁: “${C.pressLine}”`, h('span', { class: 'cost' }, '−1')),
            h('button', { class: 'choice ghost', onclick: refuse }, '③ 끊는다')));
      };
      const listen = () => {
        S.events.callChoice = 1;
        memo(C.listenMemo, 'event');
        if (who === 'park') addFlag('call-park-listen', true);
        else S.marks.E04 = '‼';
        box.replaceChildren(
          h('div', { class: 'call-label' }, '통화 종료'),
          h('div', { class: 'intuition' }, '수첩: ' + C.listenMemo),
          h('button', { class: 'primary', onclick: finish }, '확인'));
      };
      const press = () => {
        if (!spend(1)) return toast('남은 질문이 없다.');
        S.events.callChoice = 2;
        if (who === 'park') {
          const st = S.suspects.park;
          if (!st.partials.includes('P1')) st.partials.push('P1');
          memo('박지영 부분 자백 P1: 잠금 시도 (전화)', 'testi');
          queueSms(name, C.pressSms, 15000);
          parkCombineCheck();
        } else {
          addFlag('call-sung-press', true);
          memo('성지인(전화): “' + C.pressResult + '”', 'testi');
        }
        box.replaceChildren(
          h('div', { class: 'call-label' }, who === 'park' ? '통화 종료' : '통화 중 · ' + name),
          h('div', { class: 'call-player' }, `“${C.pressLine}”`),
          h('div', { class: 'call-script' }, who === 'park' ? C.pressResult : `“${C.pressResult}”`),
          h('button', { class: 'primary', onclick: finish }, '확인'));
      };
      ringing();
      return box;
    }, { dismissable: false, cls: 'call-sheet' });
  }, 700);
}

// ── 5.3 편집국장 독촉 ──
function fireEditor() {
  const D = E().editor;
  S.events.editor = true;
  S.extraSms.push({ contact: D.from, from: D.from, text: D.text, ts: '11-13 22:00', at: Date.now(), read: true });
  save();
  setTimeout(() => {
    modal((close) => {
      const finish = (c) => {
        S.events.editorChoice = c.id;
        if (c.id === 1) { S.bonus += G.data.meta.budgetBonusMax; memo('국장: “2판까지다.” 질문 +2', 'event'); }
        if (c.id === 2) memo('국장: 자살 후속 기사를 내렸다. 그 자리는 공란.', 'event');
        if (c.id !== 3) S.extraSms.push({ contact: D.from, from: '임주연', text: c.text, ts: '11-13 22:01', at: Date.now(), read: true });
        if (c.id === 3) queueSms(D.from, c.reply, (c.delay || 10) * 1000);
        else queueSms(D.from, c.reply, 1200);
        close(); save(); app.render(); setTimeout(checkTriggers, 500);
      };
      return h('div', { class: 'editor' },
        h('div', { class: 'call-label' }, '문자 · ' + D.from),
        h('div', { class: 'msg them' }, h('div', { class: 'msg-bubble' }, D.text)),
        h('div', { class: 'call-choices' }, D.choices.map((c, i) => {
          const ok = !c.requires || c.requires.some(r => pinned(r.split(':')[1]));
          return h('button', { class: 'choice', disabled: !ok, onclick: () => finish(c) },
            `${'①②③'[i]} ${c.text}`, !ok ? h('span', { class: 'sub' }, ' (보낼 증거가 없다)') : null);
        })));
    }, { dismissable: false, cls: 'editor-sheet' });
  }, 600);
}
