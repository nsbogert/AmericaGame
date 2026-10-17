"""Build delivery copies of the Meshy lure props (toy soldiers, couch, roadkill bear) and the manifest the renderer reads.
Only props with a delivered GLB are listed, so the game never requests a missing file."""
import hashlib,json
from pathlib import Path
from glb_tools import shrink_textures
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'game/assets/models/props';OUT.mkdir(parents=True,exist_ok=True)
report=[];manifest=[]
# How each prop sits on its station: footprint in metres; the bear is laid on its back, squashed and set on code-built asphalt.
PLACEMENT={'soldiers':{'footprint':.78},'couch':{'footprint':1.0},'roadkill':{'footprint':.62,'rotateX':-1.5708,'squashY':.32,'lift':.045,'asphalt':True}}
for prop in ['soldiers','couch','roadkill']:
    sources=sorted((ROOT/'assets/props'/prop/'source').glob('*.glb'))
    if not sources:print(f'skip {prop}: no source GLB in assets/props/{prop}/source');continue
    data=sources[-1].read_bytes();final,doc=shrink_textures(data)
    (OUT/f'{prop}.glb').write_bytes(final)
    manifest.append({'id':prop,'url':f'./assets/models/props/{prop}.glb',**PLACEMENT[prop]})
    report.append({'id':prop,'source':str(sources[-1].relative_to(ROOT)),'bytes':len(final),'sourceBytes':len(data),'sha256':hashlib.sha256(final).hexdigest(),'meshes':len(doc.get('meshes',[])),'images':len(doc.get('images',[]))})
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(report,indent=2))
