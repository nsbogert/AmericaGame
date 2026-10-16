import * as THREE from 'three';
/** Mesh-local measurements on the actual 1.7m Meshy exports, not reference images. */
export const FACE_CALIBRATION={
 trump:{mouthY:1.343,mouthZ:.276,eyeY:1.468,eyeX:.080,browY:1.510,width:.072,chin:1.115,eyeWidth:.046},
 staffer:{mouthY:1.272,mouthZ:.205,eyeY:1.405,eyeX:.061,browY:1.468,width:.057,chin:1.185,eyeWidth:.048},
 vance:{mouthY:1.287,mouthZ:.268,eyeY:1.418,eyeX:.078,browY:1.468,width:.068,chin:1.105,eyeWidth:.047},
 'rfk-jr':{mouthY:1.294,mouthZ:.274,eyeY:1.420,eyeX:.073,browY:1.465,width:.064,chin:1.105,eyeWidth:.046},
 hegseth:{mouthY:1.302,mouthZ:.249,eyeY:1.434,eyeX:.077,browY:1.475,width:.073,chin:1.105,eyeWidth:.045}
};
const clamp=THREE.MathUtils.clamp;
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const bell=(x,y,cx,cy,wx,wy)=>Math.exp(-2*((x-cx)/wx)**2-2*((y-cy)/wy)**2);
export const FACE_TARGETS=['AA','EE','OO','FV','MBP','smile','scowl','surprise','worried','blink'];
/** Pure builder also used by the geometry integrity check. Relative deltas only. */
export function buildFaceMorphs(geometry,id){
 const cal=FACE_CALIBRATION[id]||FACE_CALIBRATION.trump,base=geometry.getAttribute('position');geometry.computeBoundingBox();const height=geometry.boundingBox.max.y-geometry.boundingBox.min.y,s=height/1.7,origin=geometry.boundingBox.min.y;
 const c={...cal};for(const k of Object.keys(c))c[k]*=s;c.mouthY+=origin;c.eyeY+=origin;c.browY+=origin;c.chin+=origin;
 const arrays=Object.fromEntries(FACE_TARGETS.map(n=>[n,new Float32Array(base.count*3)]));let affected=0;
 for(let i=0;i<base.count;i++){
  const x=base.getX(i),y=base.getY(i),z=base.getZ(i);if(y<c.chin-.025*s||y>c.browY+.075*s||Math.abs(x)>.245*s||z<.055*s)continue;
  const front=smooth(.055*s,.15*s,z),jaw=(1-smooth(c.mouthY-.015*s,c.mouthY+.025*s,y))*smooth(c.chin-.025*s,c.chin+.025*s,y)*Math.exp(-2*(x/(.19*s))**4)*front;
  const mouth=bell(x,y,0,c.mouthY,.14*s,.078*s)*front,corner=Math.exp(-2*((Math.abs(x)-c.width)/(.048*s))**2-2*((y-c.mouthY)/(.045*s))**2)*front;
  const eye=bell(x,y,Math.sign(x)*c.eyeX,c.eyeY,c.eyeWidth,.045*s)*front;
  const brow=bell(x,y,Math.sign(x)*c.eyeX,c.browY,.064*s,.038*s)*front;
  const cheek=bell(x,y,Math.sign(x)*.12*s,c.mouthY+.05*s,.065*s,.075*s)*front;
  if(jaw+mouth+eye+brow+cheek<.0001)continue;affected++;
  function put(name,dx,dy,dz){const a=arrays[name],o=i*3;a[o]=dx;a[o+1]=dy;a[o+2]=dz;}
  put('AA',x*.035*mouth,(-.048*jaw+.010*mouth*smooth(c.mouthY,c.mouthY+.045*s,y))*s,.008*jaw*s);
  put('EE',x*.19*mouth,(-.013*jaw+.008*corner)*s,-.003*mouth*s);
  put('OO',-x*.30*mouth,-.028*jaw*s,.022*mouth*s);
  put('FV',x*.05*mouth,(-.007*jaw+.011*mouth*(y<c.mouthY?1:0))*s,.009*mouth*s);
  put('MBP',-x*.08*mouth,(y-c.mouthY)*-.18*mouth,.017*mouth*s);
  put('smile',x*.13*corner,(.026*corner+.010*cheek-.004*eye)*s,.005*cheek*s);
  put('scowl',-Math.sign(x)*.008*brow*s,(-.021*brow*(Math.abs(x)<c.eyeX?1.1:.4)-.017*corner)*s,.004*brow*s);
  put('surprise',x*.025*mouth,(.031*brow+.012*eye-.010*jaw)*s,-.004*eye*s);
  put('worried',Math.sign(x)*.004*brow*s,(.025*brow*(Math.abs(x)<c.eyeX?1:.25)-.012*corner)*s,.002*brow*s);
  put('blink',0,-(y-c.eyeY)*.94*eye,-.009*eye*s);
 }
 const attrs=FACE_TARGETS.map(name=>new THREE.Float32BufferAttribute(arrays[name],3));
 return{calibration:c,attributes:attrs,arrays,affected,vertexCount:base.count,scale:s};
}
const VISEMES={closed:{w:1,h:0,jaw:0,teeth:0},AA:{w:1,h:.041,jaw:1,teeth:.65},EE:{w:1.22,h:.019,jaw:.30,teeth:1},OO:{w:.53,h:.034,jaw:.67,teeth:0},FV:{w:.91,h:.010,jaw:.15,teeth:1},MBP:{w:.88,h:0,jaw:0,teeth:0}};
export function attachFace(model,id){
 model.updateMatrixWorld(true);let mesh=null,head=null;model.traverse(o=>{if(o.isSkinnedMesh&&!mesh)mesh=o;if(o.isBone&&/Head$/.test(o.name))head=o;});if(!mesh){model.traverse(o=>{if(o.isMesh&&!mesh)mesh=o;});}if(!mesh)return{update(){},head:model,headCenter:new THREE.Vector3(0,1.3,0),headWorld:t=>model.getWorldPosition(t),dispose(){},available:false};
 head ||= model;const original=mesh.geometry,geometry=original.clone();mesh.geometry=geometry;const built=buildFaceMorphs(geometry,id),c=built.calibration,s=built.scale;
 geometry.morphTargetsRelative=true;geometry.morphAttributes.position=built.attributes;
 // Compute normals once per target, never per frame. Body normals remain untouched.
 const base=geometry.getAttribute('position'),normalBase=geometry.getAttribute('normal'),normalTargets=[];
 for(const attr of built.attributes){const temp=geometry.clone();temp.morphAttributes={};const p=base.clone();for(let i=0;i<p.array.length;i++)p.array[i]+=attr.array[i];temp.setAttribute('position',p);temp.computeVertexNormals();const n=temp.getAttribute('normal'),delta=new Float32Array(n.array.length);for(let i=0;i<delta.length;i++){const o=Math.floor(i/3)*3;const moved=Math.abs(attr.array[o])+Math.abs(attr.array[o+1])+Math.abs(attr.array[o+2])>1e-7;delta[i]=moved?n.array[i]-normalBase.array[i]:0;}normalTargets.push(new THREE.Float32BufferAttribute(delta,3));temp.dispose();}
 geometry.morphAttributes.normal=normalTargets;mesh.updateMorphTargets();for(let i=0;i<FACE_TARGETS.length;i++)mesh.morphTargetDictionary[FACE_TARGETS[i]]=i;
 const uniforms={uFaceMouth:{value:new THREE.Vector3(0,c.mouthY,c.mouthZ)},uFaceRadius:{value:new THREE.Vector2(c.width,.001*s)},uFaceOpen:{value:0}};
 const originals=Array.isArray(mesh.material)?mesh.material:[mesh.material];const materials=originals.map(m=>{const mat=m.clone();mat.onBeforeCompile=shader=>{Object.assign(shader.uniforms,uniforms);shader.vertexShader='varying vec3 vPuppetFace;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <morphtarget_vertex>','#include <morphtarget_vertex>\nvPuppetFace = transformed;');shader.fragmentShader='varying vec3 vPuppetFace;\nuniform vec3 uFaceMouth;\nuniform vec2 uFaceRadius;\nuniform float uFaceOpen;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
if(uFaceOpen>0.001 && vPuppetFace.z>uFaceMouth.z-${(.105*s).toFixed(6)}){vec2 f=(vPuppetFace.xy-uFaceMouth.xy)/uFaceRadius;if(dot(f,f)<1.0) discard;}`);};mat.customProgramCacheKey=()=>`puppet-face-v3-${id}`;mat.needsUpdate=true;return mat;});mesh.material=Array.isArray(mesh.material)?materials:materials[0];
 // This transform converts original mesh coordinates into the head bone's bind frame.
 const oral=new THREE.Group();oral.name='Procedural oral cavity';oral.matrixAutoUpdate=false;oral.matrix.copy(new THREE.Matrix4().copy(head.matrixWorld).invert().multiply(mesh.matrixWorld));head.add(oral);
 const dark=new THREE.MeshStandardMaterial({color:0x351219,roughness:1,side:THREE.DoubleSide}),tooth=new THREE.MeshStandardMaterial({color:0xffecd0,roughness:.58}),pink=new THREE.MeshStandardMaterial({color:0xb95158,roughness:.85});
 const cavity=new THREE.Mesh(new THREE.SphereGeometry(1,32,20),dark);oral.add(cavity);
 const teeth=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),tooth);oral.add(teeth);
 const tongue=new THREE.Mesh(new THREE.SphereGeometry(1,20,12),pink);oral.add(tongue);
 cavity.visible=teeth.visible=tongue.visible=false;for(const o of[cavity,teeth,tongue]){o.castShadow=false;o.receiveShadow=false;}
 const headCenter=mesh.localToWorld(new THREE.Vector3(0,(c.eyeY+c.mouthY)*.5,c.mouthZ-.07*s));head.worldToLocal(headCenter);
 let expression='neutral',currentViseme='closed',mouthAmount=0,nextBlink=2.3+(id.length%3),blinkClock=-1,disposed=false;const weights=Object.fromEntries(FACE_TARGETS.map(n=>[n,0]));
 function update(state={}){
  if(disposed)return;const dt=clamp(Number(state.dt)||.016,0,.1),time=Number(state.time)||0;expression=state.expression||'neutral';let v=String(state.viseme||state.visemes?.viseme||'closed');if(!VISEMES[v])v='closed';const speaking=state.playing!==false&&v!=='closed';const target=speaking?clamp(state.amount??state.visemes?.amount??1,0,1):0;mouthAmount=THREE.MathUtils.damp(mouthAmount,target,target>mouthAmount?23:32,dt);currentViseme=v;
  let blink=Number(state.blink);if(!Number.isFinite(blink)){if(time>=nextBlink&&blinkClock<0){blinkClock=0;nextBlink=time+2.7+(Math.sin(time*8.1)+1)*1.4;}if(blinkClock>=0){blinkClock+=dt;blink=blinkClock<.18?Math.sin(blinkClock/.18*Math.PI):0;if(blinkClock>=.18)blinkClock=-1;}else blink=0;}
  const expr={smile:0,scowl:0,surprise:0,worried:0};if(expression in expr)expr[expression]=1;else if(['smug','gleeful','relieved','smirk','happy'].includes(expression))expr.smile=expression==='smirk'?.5:.9;else if(['annoyed','angry','serious'].includes(expression))expr.scowl=.9;else if(['panicked','surprised'].includes(expression))expr.surprise=1;else if(['exhausted','nervous'].includes(expression))expr.worried=.8;
  for(const name of FACE_TARGETS){let goal=name==='blink'?clamp(blink,0,1):name in expr?expr[name]:(name===v?mouthAmount:0);if(['AA','EE','OO','FV','MBP'].includes(name)&&v==='closed')goal=0;weights[name]=THREE.MathUtils.damp(weights[name],goal,name==='blink'?35:18,dt);mesh.morphTargetInfluences[mesh.morphTargetDictionary[name]]=weights[name];}
  const shape=VISEMES[v],open=shape.h*mouthAmount*s;const width=c.width*shape.w*(.82+.18*mouthAmount),centerY=c.mouthY-shape.jaw*.011*s*mouthAmount;uniforms.uFaceMouth.value.set(0,centerY,c.mouthZ);uniforms.uFaceRadius.value.set(width,Math.max(.001*s,open));uniforms.uFaceOpen.value=open>.0018*s?1:0;
  cavity.visible=open>.0018*s;teeth.visible=cavity.visible&&shape.teeth>0;tongue.visible=cavity.visible&&v==='AA';cavity.position.set(0,centerY,c.mouthZ-.056*s);cavity.scale.set(width*1.18,Math.max(.002*s,open*1.23),.052*s);teeth.position.set(0,centerY+open*.48,c.mouthZ-.026*s);teeth.scale.set(width*1.50,Math.min(open*.35,.014*s),.025*s);tongue.position.set(0,centerY-open*.61,c.mouthZ-.026*s);tongue.scale.set(width*.64,open*.22,.018*s);
 }
 update({dt:.1,time:0,viseme:'closed',playing:false});
 return{available:true,head,headCenter,mesh,oral,calibration:c,stats:{affectedVertices:built.affected,totalVertices:built.vertexCount,targets:FACE_TARGETS.length},update,
  headWorld(target=new THREE.Vector3()){head.updateWorldMatrix(true,false);return target.copy(headCenter).applyMatrix4(head.matrixWorld);},
  get state(){return{expression,viseme:currentViseme,amount:mouthAmount};},
  dispose(){if(disposed)return;disposed=true;head.remove(oral);oral.traverse(o=>{if(o.isMesh)o.geometry.dispose();});dark.dispose();tooth.dispose();pink.dispose();geometry.dispose();mesh.geometry=original;for(const m of materials)m.dispose();mesh.material=Array.isArray(mesh.material)?originals:originals[0];mesh.updateMorphTargets();}
 };
}
export class FacialRig{constructor(model,options={}){return attachFace(model,typeof options==='string'?options:options.id||'trump');}}
