// 효과음: WebAudio로 합성 (오디오 파일 없음). 음소거 설정은 브라우저에 저장.
const KEY = 'ohapjijol-sound';
let ctx = null;
let ringTimer = null;
let muted = false;
try { muted = localStorage.getItem(KEY) === 'off'; } catch (e) { /* 무시 */ }

export const isMuted = () => muted;
export function setMuted(v) {
  muted = v;
  try { localStorage.setItem(KEY, v ? 'off' : 'on'); } catch (e) { /* 무시 */ }
  if (v) stopRing();
}

function ac() {
  if (muted) return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch (e) { return null; }
  return ctx;
}

function tone(freq, start, dur, { type = 'sine', vol = .12, slide = 0 } = {}) {
  const a = ac(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, a.currentTime + start);
  if (slide) o.frequency.linearRampToValueAtTime(freq + slide, a.currentTime + start + dur);
  g.gain.setValueAtTime(0, a.currentTime + start);
  g.gain.linearRampToValueAtTime(vol, a.currentTime + start + .01);
  g.gain.exponentialRampToValueAtTime(.0001, a.currentTime + start + dur);
  o.connect(g).connect(a.destination);
  o.start(a.currentTime + start); o.stop(a.currentTime + start + dur + .02);
}

function noise(start, dur, vol = .15, hp = 1200) {
  const a = ac(); if (!a) return;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = a.createBufferSource(); s.buffer = buf;
  const f = a.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
  const g = a.createGain(); g.gain.value = vol;
  s.connect(f).connect(g).connect(a.destination);
  s.start(a.currentTime + start);
}

export const sfx = {
  notify() { tone(1318, 0, .12, { vol: .08 }); tone(1760, .09, .18, { vol: .07 }); },
  message() { tone(880, 0, .08, { vol: .07, type: 'triangle' }); tone(1175, .07, .14, { vol: .07, type: 'triangle' }); },
  vibrate() { for (let i = 0; i < 2; i++) tone(70, i * .28, .2, { type: 'square', vol: .05 }); },
  pin() { tone(520, 0, .06, { type: 'square', vol: .05 }); tone(780, .05, .1, { type: 'triangle', vol: .07 }); },
  shutter() { noise(0, .05, .2, 2500); noise(.07, .06, .15, 1800); },
  key() { tone(1200, 0, .03, { type: 'square', vol: .025 }); },
  wrong() { tone(220, 0, .12, { type: 'square', vol: .05 }); tone(180, .1, .16, { type: 'square', vol: .05 }); },
  unlock() { tone(660, 0, .08, { vol: .06 }); tone(990, .06, .12, { vol: .06 }); },
  confess() { tone(196, 0, .9, { type: 'triangle', vol: .07 }); tone(233, .15, .9, { type: 'triangle', vol: .05 }); },
  print() { for (let i = 0; i < 10; i++) noise(i * .07, .05, .06, 600); tone(110, .75, .4, { type: 'triangle', vol: .06 }); },
};

export function startRing() {
  stopRing();
  const once = () => { tone(784, 0, .35, { vol: .07 }); tone(988, .4, .35, { vol: .07 }); sfx.vibrate(); };
  once();
  ringTimer = setInterval(once, 1600);
}
export function stopRing() { clearInterval(ringTimer); ringTimer = null; }
