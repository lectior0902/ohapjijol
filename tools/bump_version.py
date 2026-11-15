"""배포 전에 실행: 빌드 번호를 갱신해 브라우저·GitHub Pages 캐시가 예전 파일을 쓰지 않게 한다.

사용: python tools/bump_version.py
- index.html의 window.BUILD, importmap, CSS·JS 주소의 ?v= 값을 새 빌드 번호로 바꾼다.
- CSS 안의 이미지 주소(url(...png?v=...))도 함께 바꾼다.
이미지·데이터 주소는 코드가 window.BUILD를 읽어 붙인다.
"""
import os, re, sys, time

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
build = sys.argv[1] if len(sys.argv) > 1 else time.strftime('%Y%m%d%H%M')

p = os.path.join(root, 'index.html')
s = open(p, encoding='utf-8').read()
s = re.sub(r"window\.BUILD = '[^']*'", f"window.BUILD = '{build}'", s)
s = re.sub(r'\?v=[0-9A-Za-z]+', f'?v={build}', s)
open(p, 'w', encoding='utf-8', newline='\n').write(s)

for name in os.listdir(os.path.join(root, 'css')):
    if not name.endswith('.css'): continue
    cp = os.path.join(root, 'css', name)
    c = open(cp, encoding='utf-8').read()
    c2 = re.sub(r'(\.png)(\?v=[0-9A-Za-z]+)?\)', rf'\1?v={build})', c)
    if c2 != c: open(cp, 'w', encoding='utf-8', newline='\n').write(c2)

print('BUILD =', build)
