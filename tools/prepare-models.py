"""Build delivery copies, retaining every mesh, skin, animation and accessor."""
import json
from pathlib import Path
from glb_tools import shrink_textures
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'game/assets/models';OUT.mkdir(parents=True,exist_ok=True)
report=[]
for char in ['staffer','trump','vance','rfk-jr','hegseth']:
    folder=ROOT/'assets/characters'/char
    # A rigged GLB may be supplied later. Prefer it while preserving the raw export.
    rigs=list((folder/'rigged').glob('*.glb')) if (folder/'rigged').exists() else []
    src=(rigs or list((folder/'optimized').glob('*.glb')))[0]
    data=src.read_bytes();final,doc=shrink_textures(data)
    dest=OUT/f'{char}.glb';dest.write_bytes(final)
    report.append({'id':char,'url':f'./assets/models/{char}.glb','bytes':len(final),'sourceBytes':len(data),'rigged':bool(doc.get('skins')),'animations':[a.get('name','clip') for a in doc.get('animations',[])]})
(OUT/'manifest.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
