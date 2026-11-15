import sys, os
from PIL import Image
import numpy as np
root = sys.argv[1]
src = open(os.path.join(root, 'tools', 'process_pixel.py'), encoding='utf-8').read()
src = src.split("P = {}")[0].replace("ROOT = sys.argv[1]", f"ROOT = r'{root}'")
exec(src)

def loadf(name):
    a = np.asarray(Image.open(os.path.join(SRC, name)).convert('RGB')).astype(np.int16)
    return clean_logo(a)

N = 'Gemini_Generated_Image_821ukd821ukd821u'
# 의혹 제기 / 배드 ①: 격자 그대로
for f, out in [(f'{N} (1).png', 'screen_ending_partial.png'), (f'{N} (2).png', 'screen_ending_bad1.png')]:
    raw = np.asarray(Image.open(os.path.join(SRC, f)).convert('RGB')).astype(np.int16)
    # 로고가 있는 오른쪽·아래 가장자리를 같은 비율로 잘라냄(약 9%)
    raw = raw[:1396, :2504]
    save(reduce(raw, 219, 122), out)
# 배드 ④: 어두운 스튜디오(후보 A)
save(unspark(reduce(loadf('Gemini_Generated_Image_yff4syff4syff4sy.png'), 240, 131).copy()), 'screen_ending_bad4.png')
# 트루 마지막 장면: 왼쪽 패널(로고 없음) → 휴대전화 중심 16:9
a = np.asarray(Image.open(os.path.join(SRC, f'{N}.png')).convert('RGB')).astype(np.int16)
panel = a[:, :1350]
h = round(1350 * 9 / 16)
y0 = 420
crop = panel[y0:y0 + h]
nx = round(1350 / 11.45); ny = round(h / 11.45)
save(reduce(crop, nx, ny), 'screen_ending_invite.png')
# 배드 ③: 사진 → 가운데 영역만, 저해상도·제한 팔레트
a = loadf(f'{N} (3).png')
c = a[:, 862:1848]
hh = round(986 * 9 / 16)
y0 = 760
c = c[y0:y0 + hh]
small = box(c, 120, 67)
save(quantize(small, 24), 'screen_ending_bad3.png')
print('endings done')
