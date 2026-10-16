"""Build delivery copies, retaining every mesh, skin, animation and accessor."""
import io,json,struct
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'game/assets/models';OUT.mkdir(parents=True,exist_ok=True)
report=[]
for char in ['staffer','trump','vance','rfk-jr','hegseth']:
    folder=ROOT/'assets/characters'/char
    # A rigged GLB may be supplied later. Prefer it while preserving the raw export.
    rigs=list((folder/'rigged').glob('*.glb')) if (folder/'rigged').exists() else []
    src=(rigs or list((folder/'optimized').glob('*.glb')))[0]
    data=src.read_bytes();jlen=struct.unpack_from('<I',data,12)[0]
    doc=json.loads(data[20:20+jlen]);off=20+jlen
    blen=struct.unpack_from('<I',data,off)[0];binary=data[off+8:off+8+blen]
    replacements={}
    for img in doc.get('images',[]):
        if 'bufferView' not in img:continue
        v=doc['bufferViews'][img['bufferView']];b=binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]
        im=Image.open(io.BytesIO(b));im.thumbnail((1024,1024),Image.Resampling.LANCZOS)
        out=io.BytesIO()
        # Use JPEG for color only; normal/packed maps retain linear channels losslessly.
        if img.get('name')=='texture_0':im.convert('RGB').save(out,'JPEG',quality=88,optimize=True);img['mimeType']='image/jpeg'
        else:im.save(out,'PNG',optimize=True)
        replacements[img['bufferView']]=out.getvalue()
    chunks=[];cursor=0
    for i,v in enumerate(doc.get('bufferViews',[])):
        b=replacements.get(i,binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']])
        pad=(-cursor)%4
        if pad:chunks.append(b'\0'*pad);cursor+=pad
        v['byteOffset']=cursor;v['byteLength']=len(b);chunks.append(b);cursor+=len(b)
    blob=b''.join(chunks);doc['buffers'][0]['byteLength']=len(blob)
    jb=json.dumps(doc,separators=(',',':')).encode();jb+=b' '*((-len(jb))%4);blob+=b'\0'*((-len(blob))%4)
    final=struct.pack('<III',0x46546c67,2,12+8+len(jb)+8+len(blob))+struct.pack('<II',len(jb),0x4e4f534a)+jb+struct.pack('<II',len(blob),0x004e4942)+blob
    dest=OUT/f'{char}.glb';dest.write_bytes(final)
    report.append({'id':char,'url':f'./assets/models/{char}.glb','bytes':len(final),'sourceBytes':len(data),'rigged':bool(doc.get('skins')),'animations':[a.get('name','clip') for a in doc.get('animations',[])]})
(OUT/'manifest.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
