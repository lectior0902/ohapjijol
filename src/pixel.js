// 픽셀 아트 엔진: 인물 초상(48×48, 표정 3종), 갤러리 장면, 취재 장소 배경
// 외부 이미지 없이 캔버스로 그리고 dataURL로 캐시한다. 표시할 때는 image-rendering: pixelated.

const cache = new Map();

class P {
  constructor(g, w, h) { this.g = g; this.w = w; this.h = h; }
  r(x, y, w, h, c) { if (!c) return; this.g.fillStyle = c; this.g.fillRect(x, y, w, h); }
  p(x, y, c) { this.r(x, y, 1, 1, c); }
  ell(cx, cy, rx, ry, c, y0 = -1e9, y1 = 1e9) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      if (y < y0 || y > y1) continue;
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + .5 - cx) / rx, dy = (y + .5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.p(x, y, c);
      }
    }
  }
  vgrad(x, y, w, h, cols) { // 띠 그라데이션
    const n = cols.length;
    for (let i = 0; i < h; i++) this.r(x, y + i, w, 1, cols[Math.min(n - 1, Math.floor(i / h * n))]);
  }
  dots(x, y, w, h, c, seed, density = .12) {
    let s = seed;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      if ((s % 1000) / 1000 < density) this.p(x + i, y + j, c);
    }
  }
}

function make(key, w, h, draw) {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(new P(g, w, h));
  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}

// ───────────────── 인물 초상 ─────────────────
const SK = '#f3cdab', SKS = '#dcab86', LIP = '#c4606a', EYE = '#2a1d1a', BLUSH = '#f0a9a0';

const CHAR = {
  ju:   { bg: ['#2b2d33', '#33363d'], hair: '#3a2820', hairS: '#2a1c16', cloth: '#6c7077', clothS: '#55595f' },
  park: { bg: ['#3a3229', '#453b30'], hair: '#18181b', hairS: '#0d0d0f', cloth: '#cdb58e', clothS: '#ad9670' },
  chae: { bg: ['#101410', '#181d18'], hair: '#d4ccbd', hairS: '#a69c8b', cloth: '#161616', clothS: '#0b0b0b' },
  sung: { bg: ['#1b2333', '#222c40'], hair: '#141418', hairS: '#08080a', cloth: '#1f2a44', clothS: '#172036' },
  jung: { bg: ['#3a3a28', '#444430'], hair: '#6e4b2f', hairS: '#55381f', cloth: '#6b7a3a', clothS: '#56632d' },
};

function face(p, o = {}) {
  // 목·얼굴
  p.r(21, 27, 6, 6, SKS); p.r(21, 27, 6, 4, SK);
  p.ell(24, 19.5, 8.6, 10.2, SK);
  p.ell(24, 19.5, 8.6, 10.2, null);
  p.r(15, 19, 1, 3, SKS); p.r(32, 19, 1, 3, SKS); // 귀 그림자
  // 눈
  const dx = o.look || 0;
  if (o.smileEyes) {
    for (const ex of [19, 27]) { p.p(ex - 1, 20, EYE); p.r(ex, 19, 2, 1, EYE); p.p(ex + 2, 20, EYE); }
  } else {
    for (const ex of [19, 27]) {
      p.r(ex, 19, 3, 3, '#ffffff');
      p.r(ex + 1 + dx, 19, 2, 3, EYE);
      p.p(ex + 1 + dx, 19, o.ring ? '#ffffff' : '#5a463e');
      p.p(ex - 1, 18, EYE); p.p(ex + 3, 18, EYE); // 속눈썹
      p.r(ex, 18, 3, 1, EYE);
    }
  }
  // 눈썹
  p.r(18, 16, 4, 1, o.brow || '#5a3d30'); p.r(26, 16, 4, 1, o.brow || '#5a3d30');
  if (o.worry) { p.p(21, 15, o.brow || '#5a3d30'); p.p(26, 15, o.brow || '#5a3d30'); }
  // 코·볼
  p.p(24, 22, SKS); p.p(23, 23, SKS);
  p.p(18, 23, BLUSH); p.p(30, 23, BLUSH);
  // 입
  const m = o.mouth || 'line';
  if (m === 'smile') { p.p(21, 25, LIP); p.r(22, 26, 4, 1, LIP); p.p(26, 25, LIP); }
  else if (m === 'open') { p.r(22, 25, 4, 2, '#7a2a33'); p.r(22, 25, 4, 1, LIP); }
  else if (m === 'thin') { p.r(22, 26, 4, 1, '#a24a54'); }
  else if (m === 'bite') { p.r(22, 25, 4, 1, LIP); p.r(23, 26, 2, 1, '#ffffff'); }
  else if (m === 'small') { p.r(23, 26, 2, 1, LIP); }
  else { p.r(22, 26, 4, 1, LIP); }
}

function body(p, c, opts = {}) {
  p.ell(24, 50, 19, 16, c.clothS, 33);
  p.ell(24, 50, 17.5, 15, c.cloth, 33);
  if (opts.v) { // V넥 셔츠
    for (let i = 0; i < 6; i++) p.r(22 - Math.floor(i / 2), 33 + i, 4 + Math.floor(i / 2) * 2, 1, opts.v);
  }
}

function bg(p, c) {
  p.vgrad(0, 0, 48, 48, c.bg);
  p.dots(0, 0, 48, 48, 'rgba(255,255,255,.035)', 7, .08);
}

const DRAW = {
  ju(p, e) {
    const c = CHAR.ju; bg(p, c);
    p.ell(24, 24, 11, 13, c.hairS, 10, 36); p.r(13, 22, 22, 13, c.hairS);
    body(p, c);
    p.r(17, 33, 14, 3, c.clothS); // 후드 깃
    p.r(21, 36, 1, 5, '#e6e6e6'); p.r(26, 36, 1, 5, '#e6e6e6'); // 끈
    face(p, { mouth: 'small' });
    p.ell(24, 15, 10, 7.5, c.hair, 0, 16);
    p.r(14, 14, 3, 20, c.hair); p.r(31, 14, 3, 20, c.hair);
    p.p(24, 8, c.hairS); p.p(24, 9, c.hairS);
    p.r(19, 22, 3, 1, '#c9a08f'); p.r(27, 22, 3, 1, '#c9a08f'); // 다크서클
    p.p(33, 19, '#cfd6de'); p.p(33, 21, '#cfd6de'); p.p(33, 23, '#cfd6de'); // 피어싱
  },
  park(p, e) {
    const c = CHAR.park; bg(p, c);
    body(p, c, { v: '#f7f4ee' });
    p.r(14, 36, 6, 12, c.clothS); p.r(28, 36, 6, 12, c.clothS); // 라펠
    const glasses = e !== '자백';
    face(p, { mouth: e === '기본' ? 'smile' : 'line', worry: e !== '기본' });
    p.ell(24, 15, 10, 7.5, c.hair, 0, 16);
    p.r(14, 14, 4, 15, c.hair); p.r(30, 14, 4, 15, c.hair);
    p.p(17, 29, c.hair); p.p(30, 29, c.hair); p.r(15, 29, 3, 1, c.hairS); p.r(30, 29, 3, 1, c.hairS);
    if (glasses) {
      const F = 'rgba(240,236,228,.6)';
      for (const gx of [17, 26]) { p.r(gx, 17, 6, 1, F); p.r(gx, 22, 6, 1, F); p.r(gx, 18, 1, 4, F); p.r(gx + 5, 18, 1, 4, F); p.p(gx + 4, 18, 'rgba(255,255,255,.7)'); }
      p.r(23, 19, 3, 1, F);
    }
    if (e === '동요') { p.r(9, 15, 6, 18, c.clothS); p.ell(14, 11, 4, 4, SK); p.r(13, 8, 4, 2, SK); }
    if (e === '자백') {
      p.ell(24, 44, 6, 3, SK);
      const F = 'rgba(235,230,220,.95)';
      p.r(17, 40, 6, 4, null); for (const gx of [17, 25]) { p.r(gx, 40, 6, 1, F); p.r(gx, 43, 6, 1, F); p.r(gx, 40, 1, 4, F); p.r(gx + 5, 40, 1, 4, F); }
      p.r(23, 41, 2, 1, F);
    }
  },
  chae(p, e) {
    const c = CHAR.chae; bg(p, c);
    for (let y = 12; y < 47; y++) { const w = (Math.floor(y / 3) % 2) ? 1 : 0; p.r(12 + w, y, 24 - w * 2, 1, c.hair); p.p(12 + w, y, c.hairS); p.p(35 - w, y, c.hairS); }
    for (let y = 30; y < 46; y += 5) { p.p(14, y, c.hairS); p.p(33, y + 2, c.hairS); }
    body(p, c);
    p.r(19, 40, 10, 2, '#39ff14'); p.p(20, 39, '#39ff14'); p.p(27, 39, '#39ff14'); // 네온 로고
    face(p, { mouth: e === '기본' ? 'open' : 'small', look: e === '동요' ? 1 : 0, ring: true });
    p.ell(24, 15, 10, 7.5, c.hair, 0, 16);
    p.r(14, 14, 3, 18, c.hair); p.r(31, 14, 3, 18, c.hair);
    p.p(15, 20, c.hairS); p.p(32, 24, c.hairS);
    if (e !== '자백') { // 목에 건 헤드셋
      p.r(17, 32, 14, 2, '#39ff14'); p.r(15, 30, 3, 5, '#2fd10f'); p.r(30, 30, 3, 5, '#2fd10f');
    } else {
      p.ell(38, 42, 5, 4, SK); p.r(33, 37, 10, 2, '#39ff14'); p.r(33, 37, 2, 5, '#2fd10f'); p.r(41, 37, 2, 5, '#2fd10f');
    }
  },
  sung(p, e) {
    const c = CHAR.sung; bg(p, c);
    p.r(31, 24, 3, 11, c.hairS); // 포니테일
    body(p, c, { v: '#d3d6db' });
    p.r(16, 36, 5, 12, c.clothS); p.r(27, 36, 5, 12, c.clothS);
    p.r(28, 33, 1, 5, '#2f80ed'); p.r(27, 38, 5, 6, '#f2f4f7'); p.r(28, 40, 3, 1, '#2f80ed'); p.r(28, 42, 3, 1, '#2f80ed'); // 사원증
    face(p, { mouth: 'thin', look: e === '동요' ? -1 : 0, worry: e === '동요' });
    p.ell(24, 15, 9.5, 7, c.hair, 0, 16);
    p.r(15, 13, 2, 8, c.hair); p.r(31, 13, 2, 8, c.hair);
    p.r(17, 10, 14, 1, '#2a2a33'); // 윤기
    if (e !== '자백') { p.r(33, 20, 2, 2, '#f4f4f4'); }
    else { p.ell(11, 42, 4, 3, SK); p.r(10, 40, 2, 2, '#f4f4f4'); }
  },
  jung(p, e) {
    const c = CHAR.jung; bg(p, c);
    body(p, c);
    p.ell(24, 52, 12, 15, '#f3ead3', 36); // 앞치마
    p.r(17, 33, 2, 6, '#e8dcc0'); p.r(29, 33, 2, 6, '#e8dcc0');
    p.r(27, 39, 1, 5, '#e2b13c'); p.p(27, 39, '#3a3a3a'); // 연필
    face(p, { mouth: e === '동요' ? 'bite' : e === '자백' ? 'line' : 'smile', smileEyes: e === '기본', worry: e !== '기본' });
    p.ell(24, 15, 10, 8, c.hair, 0, 17);
    p.r(15, 13, 3, 10, c.hair); p.r(30, 13, 3, 10, c.hair);
    p.r(18, 12, 6, 2, c.hairS);
    if (e === '자백') { p.ell(19, 41, 3, 3, SK); p.ell(29, 41, 3, 3, SK); p.r(18, 44, 2, 1, '#c9643b'); p.r(28, 44, 2, 1, '#3aa0a0'); }
  },
};

// ───────────────── 완성 도트 에셋(assets/pixel) ─────────────────
const A = 'assets/pixel/';
const WHO = { ju: 'juyeon', park: 'jiyoung', chae: 'chaeun', sung: 'jiin', jung: 'gayeon' };
const EXPR = { '기본': 'base', '동요': 'shaken', '자백': 'confess' };
const HAVE_EXPR = { ju: ['base', 'shaken'] };   // 임주연은 기본·동요만
const SCENE_FILE = {
  cam1: 'scene_g4_1_doorbell', cam2: 'scene_g4_2_departure', cam3: 'scene_g4_3a_visitors_arrive', cam3b: 'scene_g4_3b_visitors_leave',
  security: 'scene_g5_security_selfie', club: 'scene_g7_school_photo', bookshop: 'scene_g10_bookstore_opening', sunrise: 'scene_g12_sunrise',
};
const PLACE_FILE = { park: 'bg_interview_park', chae: 'bg_interview_chaeun', sung: 'bg_interview_sung', jung: 'bg_interview_gayeon' };
export const screenSrc = (name) => A + 'screen_' + name + '.png';
export function avatarSrc(id) { return WHO[id] ? A + 'avatar_' + WHO[id] + '.png' : null; }

export function portraitSrc(id, expr = '기본') {
  if (WHO[id]) {
    let e = EXPR[expr] || 'base';
    const have = HAVE_EXPR[id];
    if (have && !have.includes(e)) e = have.includes('shaken') && e === 'confess' ? 'shaken' : 'base';
    return A + 'portrait_' + WHO[id] + '_' + e + '.png';
  }
  return codePortrait(id, expr);
}

function codePortrait(id, expr) {
  const fn = DRAW[id];
  if (!fn) return null;
  return make(`p:${id}:${expr}`, 48, 48, (p) => fn(p, expr));
}

// ───────────────── 작은 인물(장면용) ─────────────────
function mini(p, x, y, o) { // x,y = 머리 왼쪽 위. 높이 약 22px
  const skin = o.skin || SK;
  if (o.back) {
    p.r(x, y, 7, 7, o.hair);
    if (o.long) p.r(x, y + 6, 7, 4, o.hair);
  } else {
    if (o.long) p.r(x - 1, y + 2, 9, 9, o.hair);
    p.r(x + 1, y + 1, 5, 6, skin);
    p.r(x, y, 7, 2, o.hair); p.r(x, y, 1, o.bob ? 6 : 4, o.hair); p.r(x + 6, y, 1, o.bob ? 6 : 4, o.hair);
    if (o.glasses) { p.p(x + 2, y + 3, '#ffffff'); p.p(x + 4, y + 3, '#ffffff'); }
    else { p.p(x + 2, y + 3, EYE); p.p(x + 4, y + 3, EYE); }
  }
  p.r(x - 1, y + 7, 9, 10, o.cloth);
  p.r(x, y + 17, 3, 5, o.leg || '#2a2a30'); p.r(x + 4, y + 17, 3, 5, o.leg || '#2a2a30');
  if (o.v) { p.r(x - 3, y + 2, 2, 6, o.cloth); p.p(x - 3, y + 1, skin); p.p(x - 2, y, skin); }
  if (o.band) p.r(x - 1, y + 9, 2, 2, '#ffffff');
}

// ───────────────── 갤러리 장면 ─────────────────
const GREEN = ['#0c130e', '#15211a', '#1f3025', '#2d4434', '#466a50', '#7fae86', '#c8f0cc'];

function camBase(p) {
  p.vgrad(0, 0, 80, 60, [GREEN[2], GREEN[2], GREEN[1]]);
  p.r(0, 42, 80, 18, GREEN[1]); p.r(0, 42, 80, 1, GREEN[3]); // 바닥
  p.r(56, 8, 16, 34, GREEN[1]); p.r(57, 9, 14, 33, GREEN[0]); p.p(68, 26, GREEN[4]); // 맞은편 문
  p.r(6, 6, 30, 2, GREEN[3]); // 천장 등
  p.r(6, 8, 30, 1, GREEN[4]);
}
function vignette(p, w, h, col = 'rgba(0,0,0,.55)') {
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (x - w / 2) / (w / 2), dy = (y - h / 2) / (h / 2);
    if (dx * dx + dy * dy > 1.05) p.p(x, y, col);
  }
}

const SCENES = {
  cam1: [80, 60, (p) => {
    camBase(p);
    mini(p, 30, 14, { hair: GREEN[0], cloth: GREEN[4], skin: GREEN[5], bob: true, glasses: true, leg: GREEN[1] });
    p.r(38, 22, 10, 2, GREEN[4]); p.r(47, 21, 2, 3, GREEN[5]); // 벨 누르는 손
    p.r(32, 22, 2, 6, GREEN[3]); // 트렌치 단추선
    p.dots(0, 0, 80, 60, 'rgba(200,240,204,.06)', 11, .1); vignette(p, 80, 60);
  }],
  cam2: [80, 60, (p) => {
    camBase(p);
    mini(p, 34, 16, { hair: GREEN[0], cloth: GREEN[4], back: true, leg: GREEN[1] });
    p.r(34, 23, 1, 1, GREEN[0]); for (let i = 0; i < 8; i++) p.p(34 + i, 23 + i, GREEN[0]); // 가방끈
    p.r(41, 30, 8, 6, GREEN[0]); p.r(42, 31, 6, 1, GREEN[3]); // 노트북 가방
    p.dots(0, 0, 80, 60, 'rgba(200,240,204,.06)', 12, .1); vignette(p, 80, 60);
  }],
  cam3: [80, 60, (p) => {
    camBase(p);
    mini(p, 22, 15, { hair: GREEN[0], cloth: GREEN[0], skin: GREEN[4], leg: GREEN[0] });
    p.r(28, 16, 2, 5, GREEN[3]); // 통화 중
    mini(p, 44, 16, { hair: GREEN[0], cloth: GREEN[0], skin: GREEN[4], leg: GREEN[0] });
    p.r(41, 26, 6, 4, GREEN[5]); // 서류 봉투
    p.dots(0, 0, 80, 60, 'rgba(200,240,204,.06)', 13, .1); vignette(p, 80, 60);
  }],
  security: [60, 80, (p) => {
    p.vgrad(0, 0, 60, 80, ['#0b0b0e', '#121217', '#0d0d10']);
    p.r(0, 58, 60, 22, '#16161b'); p.r(4, 52, 52, 8, '#1d1d24'); // 소파
    p.ell(30, 36, 13, 16, '#1a1a1f'); // 머리 실루엣
    p.r(17, 34, 4, 16, '#0a0a0c'); p.r(39, 34, 4, 16, '#0a0a0c'); // 단발 옆선
    p.ell(30, 26, 13, 9, '#0a0a0c', 0, 28);
    p.r(22, 36, 5, 3, '#2a2a33'); p.r(33, 36, 5, 3, '#2a2a33'); // 안경
    p.p(24, 37, '#e8e8f0'); p.p(35, 37, '#e8e8f0'); // 렌즈 반사 두 점
    p.dots(0, 0, 60, 80, 'rgba(180,180,200,.12)', 21, .18);
    vignette(p, 60, 80, 'rgba(0,0,0,.6)');
  }],
  club: [80, 56, (p) => {
    p.vgrad(0, 0, 80, 56, ['#e8e0cc', '#ddd3bb']);
    p.r(0, 40, 80, 16, '#a88b62'); p.r(0, 40, 80, 1, '#8a6f4a');
    p.r(18, 4, 44, 9, '#b8322e'); p.r(20, 6, 40, 5, '#cf4a43'); // 현수막
    for (let i = 0; i < 6; i++) p.r(24 + i * 6, 7, 3, 3, '#f6e7c8');
    p.r(64, 10, 12, 10, '#2b2b2b'); p.r(66, 12, 8, 6, '#4a6a8a'); // 방송실 모니터
    const kids = [
      { hair: '#18181b', bob: true },
      { hair: '#3a2820', band: true },
      { hair: '#5a3d26', long: true },
      { hair: '#141418' },
      { hair: '#6e4b2f' },
    ];
    kids.forEach((k, i) => mini(p, 8 + i * 14, 18, { ...k, cloth: '#2a3550', leg: '#3a3a44', v: i === 2 }));
  }],
  bookshop: [80, 56, (p) => {
    p.vgrad(0, 0, 80, 56, ['#cfe3f0', '#e6eef2']);
    p.r(6, 6, 68, 40, '#efe6d2'); p.r(6, 6, 68, 8, '#6b7a3a'); // 간판
    for (let i = 0; i < 9; i++) p.r(14 + i * 6, 9, 3, 2, '#f3ead3');
    p.r(10, 16, 60, 4, '#9aa0a6'); // 말아 올린 셔터
    for (let i = 0; i < 6; i++) { p.r(30, 22 + i * 4, 36, 3, ['#c9643b', '#3a6ea5', '#e2b13c', '#5a8a5a', '#8a4a6a', '#c9643b'][i]); } // 책장
    p.ell(14, 30, 7, 7, '#e86a8a'); p.ell(14, 30, 4, 4, '#f6c4d0'); p.r(13, 37, 2, 9, '#5a8a5a'); // 화환
    p.r(0, 46, 80, 10, '#b7b0a2');
    mini(p, 34, 26, { hair: '#3a2820', cloth: '#6c7077', v: true });
    mini(p, 48, 26, { hair: '#6e4b2f', cloth: '#f3ead3', v: true });
  }],
  sunrise: [80, 56, (p) => {
    p.vgrad(0, 0, 80, 34, ['#2a2550', '#5a3a6a', '#b85a5a', '#f08a4a', '#f7c06a']);
    p.ell(40, 34, 9, 9, '#ffe2a0', 0, 33);
    p.vgrad(0, 34, 80, 10, ['#4a5a8a', '#3a4a78', '#2e3c66']);
    for (let i = 0; i < 6; i++) p.r(30 + (i % 3) * 7, 36 + i, 6, 1, '#f2b46a');
    p.r(0, 44, 80, 12, '#1a1a22');
    mini(p, 22, 30, { hair: '#2a2a2a', cloth: '#3a3a44', back: true });
    mini(p, 36, 28, { hair: '#1f1a18', cloth: '#2c2c36', back: true, long: true });
    mini(p, 50, 29, { hair: '#3a2820', cloth: '#55595f', back: true, long: true });
  }],
};

export function sceneSrc(id) {
  if (SCENE_FILE[id]) return A + SCENE_FILE[id] + '.png';
  const s = SCENES[id];
  if (!s) return null;
  return make('s:' + id, s[0], s[1], s[2]);
}

// ───────────────── 취재 장소 배경 ─────────────────
const PLACES = {
  park: (p) => {
    p.vgrad(0, 0, 120, 48, ['#d9d2c4', '#cfc6b6']);
    p.r(8, 4, 60, 30, '#8fa7bd'); // 유리창
    for (let i = 0; i < 9; i++) p.r(10 + i * 6, 14 + (i * 7) % 12, 5, 20 - (i * 7) % 12, '#6d8399');
    p.r(8, 4, 60, 1, '#ffffff'); p.r(37, 4, 1, 30, '#e8e8e8');
    p.r(76, 6, 36, 22, '#e9e3d6'); p.r(78, 8, 32, 2, '#c9bfae'); // 화이트보드
    p.r(0, 34, 120, 14, '#7a5c43'); p.r(0, 34, 120, 2, '#8e6d51'); // 테이블
    p.r(100, 22, 8, 12, '#4f7a4f'); p.ell(104, 20, 7, 6, '#5d8f5a'); // 화분
  },
  chae: (p) => {
    p.vgrad(0, 0, 120, 48, ['#0b0b0b', '#141414']);
    for (let y = 0; y < 48; y += 6) for (let x = (y / 6) % 2 * 6; x < 120; x += 12) p.r(x, y, 6, 6, '#181818');
    p.ell(26, 22, 16, 16, '#f6f6f6'); p.ell(26, 22, 12, 12, '#0f0f0f'); // 링라이트
    p.r(25, 38, 2, 10, '#333');
    p.r(60, 10, 46, 3, '#39ff14'); p.r(60, 16, 30, 2, '#d0021b'); // 네온
    p.r(96, 26, 16, 14, '#1d1d1d'); p.r(98, 28, 12, 9, '#2a5a2a'); // 모니터
  },
  sung: (p) => {
    p.vgrad(0, 0, 120, 48, ['#9fb6d6', '#bcd0e6', '#d6e2ef']);
    for (let i = 0; i < 12; i++) { const h = 10 + (i * 13) % 18; p.r(i * 10, 34 - h, 8, h, ['#7d93b2', '#6d83a3', '#8ea3c0'][i % 3]); }
    for (let x = 0; x < 120; x += 24) p.r(x, 0, 2, 34, '#e8eef5');
    p.r(0, 34, 120, 14, '#2b2f3a'); p.r(0, 34, 120, 2, '#3a3f4c');
    p.r(96, 22, 8, 12, '#1f2a44'); p.r(97, 17, 6, 6, SK); p.r(96, 16, 8, 3, '#2a2a2a'); // 동석한 법무팀 직원
  },
  jung: (p) => {
    p.vgrad(0, 0, 120, 48, ['#5a4632', '#6e5840']);
    for (let s = 0; s < 3; s++) {
      p.r(4, 8 + s * 12, 112, 2, '#3e2f20');
      for (let x = 6; x < 114; x += 4) p.r(x, s * 12 - 1 + 8 - 8 + 1, 3, 8, ['#c9643b', '#3a6ea5', '#e2b13c', '#5a8a5a', '#8a4a6a', '#d8c9a8'][(x + s * 3) % 6]);
    }
    p.r(0, 0, 120, 10, '#9aa0a6'); for (let y = 0; y < 10; y += 2) p.r(0, y, 120, 1, '#7d8287'); // 반쯤 내린 셔터
    p.r(0, 38, 120, 10, '#8a6a4a'); p.r(84, 30, 10, 8, '#e8e0d0'); p.r(86, 26, 6, 4, '#7a5a3a'); // 드립 서버
  },
};

export function placeSrc(id) {
  if (PLACE_FILE[id]) return A + PLACE_FILE[id] + '.png';
  const f = PLACES[id];
  if (!f) return null;
  return make('bg:' + id, 120, 48, f);
}
