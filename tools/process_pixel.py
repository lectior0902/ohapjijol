"""오합지졸 도트 에셋 정리: 원본(_원본) → 게임용(assets/pixel)"""
import os, sys
from PIL import Image
import numpy as np

ROOT = sys.argv[1]
SRC = os.path.join(ROOT, 'assets', 'pixel', '_원본')
DST = os.path.join(ROOT, 'assets', 'pixel')
G = lambda k: os.path.join(SRC, f'Gemini_Generated_Image_{k}.png')

from scipy import ndimage
LOG = []

def clean_logo(a):
    # Gemini 로고(✦): 오른쪽 아래 구석에서 주변 배경보다 밝고 채도가 낮은 점들 → 주변 중앙값으로 메움
    h, w, _ = a.shape
    bh, bw = max(220, int(h * .14)), max(220, int(w * .14))
    c = a[h - bh:, w - bw:].astype(np.int16)
    med = np.stack([ndimage.median_filter(c[..., i], size=41) for i in range(3)], axis=2)
    lum, mlum = c.mean(axis=2), med.mean(axis=2)
    sat = c.max(axis=2) - c.min(axis=2)
    mask = ((lum - mlum) > 14) & (sat < 60)
    lab, n = ndimage.label(mask)
    keep = np.zeros_like(mask)
    for i in range(1, n + 1):
        ys, xs = np.nonzero(lab == i)
        if len(ys) < 25: continue
        # 로고는 오른쪽 아래 구석 근처의 작은 덩어리
        if ys.max() - ys.min() > bh * .6 or xs.max() - xs.min() > bw * .6: continue
        if ys.mean() < bh * .35 or xs.mean() < bw * .35: continue
        keep |= lab == i
    if keep.any():
        ys, xs = np.nonzero(keep)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        py, px = int((y1 - y0) * .45) + 6, int((x1 - x0) * .45) + 6
        y0, y1 = max(0, y0 - py), min(bh, y1 + py)
        x0, x1 = max(0, x0 - px), min(bw, x1 + px)
        a = a.copy()
        Y0, X0 = h - bh + y0, w - bw + x0
        hh, ww = y1 - y0, x1 - x0
        # 후보(왼쪽·위·더 왼쪽·더 위) 중 가장 평평한(무늬가 적은) 영역을 복사
        cands = []
        for dy, dx in [(0, -(ww + 4)), (-(hh + 4), 0), (0, -2 * (ww + 4)), (-2 * (hh + 4), 0), (-(hh + 4), -(ww + 4))]:
            sy, sx = Y0 + dy, X0 + dx
            if sy < 0 or sx < 0 or sy + hh > h or sx + ww > w: continue
            patch = a[sy:sy + hh, sx:sx + ww]
            cands.append((patch.mean(axis=2).std(), sy, sx))
        _, sy, sx = min(cands)
        a[Y0:Y0 + hh, X0:X0 + ww] = a[sy:sy + hh, sx:sx + ww].copy()
        LOG.append((ww, hh))
    return a

def load(k):
    a = np.asarray(Image.open(G(k)).convert('RGB')).astype(np.int16)
    return clean_logo(a)

# ── 격자 축소: 각 칸의 가운데 영역 중앙값 색 ──
def best_phase(a, b, axis):
    d = np.abs(np.diff(a, axis=axis)).sum(axis=2)
    prof = d.sum(axis=0 if axis == 1 else 1).astype(float)
    pos = np.arange(len(prof))
    best = (0, -1)
    for off in np.arange(0, b, 0.25):
        ph = (pos + 0.5 - off) % b
        s = prof[np.minimum(ph, b - ph) < 0.8].sum()
        if s > best[1]: best = (off, s)
    return best[0]

def reduce(a, nx, ny):
    h, w, _ = a.shape
    bx, by = w / nx, h / ny
    ox, oy = best_phase(a, bx, 1) % bx, best_phase(a, by, 0) % by
    # 위상이 칸 중앙을 벗어나지 않게 보정
    out = np.zeros((ny, nx, 3), np.uint8)
    for j in range(ny):
        y0 = oy + j * by - by * (1 if oy > by / 2 else 0)
        for i in range(nx):
            x0 = ox + i * bx - bx * (1 if ox > bx / 2 else 0)
            cx0, cx1 = int(max(0, x0 + bx * .25)), int(min(w, x0 + bx * .75))
            cy0, cy1 = int(max(0, y0 + by * .25)), int(min(h, y0 + by * .75))
            if cx1 <= cx0 or cy1 <= cy0:
                cx0, cx1 = int(min(w - 1, max(0, (i + .5) * bx))), int(min(w, max(1, (i + .5) * bx + 1)))
                cy0, cy1 = int(min(h - 1, max(0, (j + .5) * by))), int(min(h, max(1, (j + .5) * by + 1)))
            blk = a[cy0:cy1, cx0:cx1].reshape(-1, 3)
            out[j, i] = np.median(blk, axis=0)
    return out

def box(a, w, h):
    return np.asarray(Image.fromarray(a.astype(np.uint8)).resize((w, h), Image.BOX))

def quantize(a, n):
    im = Image.fromarray(a.astype(np.uint8)).quantize(colors=n, method=Image.MEDIANCUT, dither=Image.NONE)
    return np.asarray(im.convert('RGB'))

# ── Gemini 로고(✦) 지우기: 오른쪽 아래 구석의 밝은 무채색 칸을 왼쪽 이웃 색으로 ──
def unspark(a, alpha=None, frac=.16, thr=150):
    h, w, _ = a.shape
    y0, x0 = int(h * (1 - frac)), int(w * (1 - frac))
    for y in range(y0, h):
        for x in range(w - 1, x0 - 1, -1):
            r, g, b = [int(v) for v in a[y, x]]
            if min(r, g, b) > thr and max(r, g, b) - min(r, g, b) < 40:
                # 왼쪽으로 가장 가까운 '로고 아닌' 칸의 색
                xx = x - 1
                while xx > x0 - w * .1:
                    rr, gg, bb = [int(v) for v in a[y, xx]]
                    if not (min(rr, gg, bb) > thr and max(rr, gg, bb) - min(rr, gg, bb) < 40): break
                    xx -= 1
                a[y, x] = a[y, max(xx, 0)]
                if alpha is not None: alpha[y, x] = alpha[y, max(xx, 0)]
    return a

def save(a, name, alpha=None):
    a = a.astype(np.uint8)
    if alpha is not None:
        im = Image.fromarray(np.dstack([a, alpha.astype(np.uint8)]), 'RGBA')
    else:
        im = Image.fromarray(a, 'RGB')
    im.save(os.path.join(DST, name), optimize=True)
    print(f'{name:38s} {im.size[0]}x{im.size[1]}  {os.path.getsize(os.path.join(DST, name)) // 1024}KB')

# ── 초상: 마젠타 제거 → 격자 축소 → 128×128 투명 캔버스 ──
def magenta_mask(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    return (r > 170) & (b > 170) & (g < 110) & (np.abs(r - b) < 90)

def portrait(k, name, block=11.725):
    a = load(k)
    a = a[:, 10:-10] if a.shape[1] < 1500 else a   # 분할 이미지 양옆 경계선
    h, w, _ = a.shape
    ny = round(h / block); nx = round(w / block)
    small = reduce(a, nx, ny)
    key = magenta_mask(small.astype(np.int16))
    # 가장자리 반쯤 섞인 자홍 띠도 제거(마젠타 쪽으로 치우친 칸)
    s16 = small.astype(np.int16)
    fringe = (s16[..., 0] - s16[..., 1] > 70) & (s16[..., 2] - s16[..., 1] > 70)
    alpha = np.where(key | fringe, 0, 255).astype(np.uint8)
    small = unspark(small.copy(), alpha)
    # 남은 로고 조각(투명 영역 위 밝은 점) 정리
    ys, xs = np.nonzero(alpha)
    top = ys.min()
    head_rows = alpha[top:top + int(ny * .35)]
    cols = np.nonzero(head_rows.max(axis=0))[0]
    cx = (cols.min() + cols.max()) // 2
    canvas = np.zeros((128, 128, 3), np.uint8); calpha = np.zeros((128, 128), np.uint8)
    y_from = max(0, top - 3)
    x_from = cx - 64
    for y in range(128):
        sy = y_from + y
        if sy >= ny: break
        for x in range(128):
            sx = x_from + x
            if 0 <= sx < nx:
                canvas[y, x] = small[sy, sx]; calpha[y, x] = alpha[sy, sx]
    save(canvas, name, calpha)
    return canvas, calpha

P = {}
P['juyeon_base'] = portrait('wylc3rwylc3rwylc', 'portrait_juyeon_base.png')
P['juyeon_shaken'] = portrait('k0t2jck0t2jck0t2', 'portrait_juyeon_shaken.png')
for who, key in [('jiyoung', 'w5zye9w5zye9w5zy'), ('chaeun', 'p2rl0yp2rl0yp2rl'), ('jiin', 'l0inhfl0inhfl0in'), ('gayeon', '88zkqk88zkqk88zk')]:
    for i, ex in [(1, 'shaken'), (2, 'base'), (3, 'confess')]:
        P[f'{who}_{ex}'] = portrait(f'{key}{i}', f'portrait_{who}_{ex}.png')

# ── 아바타 48×48: 기본 초상의 얼굴 부분 ──
for who in ['juyeon', 'jiyoung', 'chaeun', 'jiin', 'gayeon']:
    c, al = P[f'{who}_base']
    ys, xs = np.nonzero(al[:60])
    cx = (xs.min() + xs.max()) // 2
    top = np.nonzero(al.max(axis=1))[0].min()
    x0 = max(0, min(128 - 72, cx - 36))
    crop = c[top:top + 72, x0:x0 + 72]; acrop = al[top:top + 72, x0:x0 + 72]
    im = Image.fromarray(np.dstack([crop, acrop]).astype(np.uint8), 'RGBA').resize((48, 48), Image.BOX)
    im.save(os.path.join(DST, f'avatar_{who}.png'), optimize=True)
print('avatars ok')

# ── 격자형 장면 ──
def grid_scene(k, name, nx, ny, crop=None):
    a = load(k)
    if crop: a = a[crop[1]:crop[3], crop[0]:crop[2]]
    small = reduce(a, nx, ny)
    small = unspark(small.copy())
    save(small, name)
    return small

grid_scene('tqg1cotqg1cotqg1', 'scene_g5_security_selfie.png', 120, 160)
grid_scene('t295cxt295cxt295', 'scene_g7_school_photo.png', 320, 239)
grid_scene('en0gx1en0gx1en0g', 'scene_g10_bookstore_opening.png', 320, 239)
grid_scene('xwrvkbxwrvkbxwrv', 'scene_g12_sunrise.png', 320, 239)
grid_scene('ej1o8hej1o8hej1o', 'screen_title.png', 240, 134)
grid_scene('byjytjbyjytjbyjy', 'screen_ending.png', 240, 134)
# 잠금화면: 아래쪽 UI(화살표·홈 버튼) 잘라냄
grid_scene('b9qdz9b9qdz9b9qd', 'screen_lockscreen.png', 120, 214, crop=(0, 0, 1408, 2504))

# ── 띵동캠: 왼쪽 위 글자 띠 제거 → 320 폭 → 녹색 톤 정리 ──
for k, name in [('usllkrusllkrusll1', 'scene_g4_1_doorbell.png'), ('usllkrusllkrusll2', 'scene_g4_2_departure.png'),
                ('usllkrusllkrusll3', 'scene_g4_3a_visitors_arrive.png'), ('usllkrusllkrusll4', 'scene_g4_3b_visitors_leave.png')]:
    a = load(k)
    h, w, _ = a.shape
    a = a[int(h * .115):h - 14, 14:w - 14]       # 글자 띠와 테두리 잘라냄
    h2, w2, _ = a.shape
    nh = round(320 * h2 / w2)
    s = box(a, 320, nh)
    s = unspark(s.copy(), frac=.14, thr=120)
    s = quantize(s, 16)
    save(s, name)

# ── 인터뷰 배경: 320×180, 얼굴 카드 덮기 ──
def bg(k, name, cover=None):
    a = load(k)
    s = box(a, 320, 180).copy()
    s = unspark(s, frac=.1)
    if cover:  # (x0,y0,x1,y1): 바로 오른쪽 같은 크기 영역을 복사해 덮음
        x0, y0, x1, y1 = cover
        wdt = x1 - x0
        s[y0:y1, x0:x1] = s[y0:y1, x1:x1 + wdt]
    s = quantize(s, 64)
    save(s, name)

bg('jumkz3jumkz3jumk', 'bg_interview_park.png')
bg('qmyy59qmyy59qmyy', 'bg_interview_sung.png')
bg('tp1aahtp1aahtp1a', 'bg_interview_chaeun.png', cover=(0, 128, 52, 180))
bg('yq7wb3yq7wb3yq7w', 'bg_interview_gayeon.png', cover=(0, 128, 52, 180))
print('done', LOG)
