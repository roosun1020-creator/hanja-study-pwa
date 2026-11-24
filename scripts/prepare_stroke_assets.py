#!/usr/bin/env python3
"""Bundle only the 150 user-curriculum HanziWriter stroke JSONs from npm files.
Used for fully offline order animation and stroke order tracing on GitHub Pages.
"""
import json,sys,shutil,re
from pathlib import Path
root=Path(__file__).resolve().parents[1]
node_modules=Path(sys.argv[1]).resolve()
writer=node_modules/'hanzi-writer'
data=node_modules/'hanzi-writer-data'
js=writer/'dist/hanzi-writer.min.js'
if not js.is_file():
    matches=list(writer.rglob('hanzi-writer.min.js'))
    if not matches: raise SystemExit('HanziWriter JS 파일이 패키지에 없습니다.')
    js=matches[0]
if not data.is_dir(): raise SystemExit('HanziWriter data 패키지를 찾지 못했습니다.')
chars=json.loads((root/'data/hanja.json').read_text(encoding='utf8'))
if len(chars)!=150:raise SystemExit('한자 데이터는 150자여야 합니다.')
folder=root/'strokes';folder.mkdir(exist_ok=True)
missing=[];assets=[]
for row in chars:
    ch=row['char']
    candidates=[data/(ch+'.json'),data/'data'/(ch+'.json')]
    f=next((x for x in candidates if x.is_file()),None)
    if not f:
        found=list(data.rglob(ch+'.json'))
        f=found[0] if found else None
    if not f:missing.append(ch);continue
    try:
        payload=json.loads(f.read_text(encoding='utf8'))
        if (not isinstance(payload,dict) or not isinstance(payload.get('strokes'),list) or not isinstance(payload.get('medians'),list) or len(payload['strokes'])!=len(payload['medians'])):raise ValueError('invalid stroke data')
    except (ValueError,UnicodeError) as exc:
        missing.append(ch);print(f'데이터 오류 {ch}: {exc}');continue
    (folder/(ch+'.json')).write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':')),encoding='utf8')
    assets.append('./strokes/'+ch+'.json')
(root/'vendor').mkdir(exist_ok=True)
shutil.copy2(js,root/'vendor/hanzi-writer.min.js')
for pkg,name in [(writer,'hanzi-writer'),(data,'hanzi-writer-data')]:
    for license_name in ('LICENSE','LICENSE.md','ARPHICPL.TXT','license'):
        item=pkg/license_name
        if item.is_file():shutil.copy2(item,root/'vendor'/f'{name}-{license_name}');break
sw=root/'sw.js';s=sw.read_text(encoding='utf8')
new='const STROKE_CORE='+json.dumps(['./vendor/hanzi-writer.min.js']+assets,ensure_ascii=False,separators=(',',':'))+';'
s=re.sub(r'const STROKE_CORE=\[[^;]*;',new,s)
s=s.replace("hanja-pwa-v2.0.2-1", "hanja-pwa-v2.0.2-strokes-1")
sw.write_text(s,encoding='utf8')
print(f'횡순 데이터: {len(assets)}/150 글자; 누락: {"".join(missing) or "없음"}')
if missing:print('⚠ 일부 한자 획순 데이터가 없으므로 해당 글자는 온라인 획순/오프라인 자유쓰기만 가능합니다.')
print('외부 글꼴 및 민감 데이터는 포함하지 않았습니다.')
