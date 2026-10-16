import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {buildFaceMorphs,FACE_TARGETS} from './faces.js';
function geometryFromGLB(bytes){const length=bytes.readUInt32LE(12),doc=JSON.parse(bytes.subarray(20,20+length).toString()),bin=bytes.subarray(28+length);const primitive=doc.meshes[0].primitives[0];function attribute(index){const a=doc.accessors[index],v=doc.bufferViews[a.bufferView],offset=(v.byteOffset||0)+(a.byteOffset||0),size={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type],array=new Float32Array(a.count*size);assert.equal(a.componentType,5126);const stride=v.byteStride||size*4;for(let i=0;i<a.count;i++)for(let k=0;k<size;k++)array[i*size+k]=bin.readFloatLE(offset+i*stride+k*4);return new THREE.BufferAttribute(array,size);}const g=new THREE.BufferGeometry();g.setAttribute('position',attribute(primitive.attributes.POSITION));return g;}
for(const id of ['trump','staffer','vance','rfk-jr','hegseth']){
 const data=await readFile(new URL(`./assets/models/${id}.glb`,import.meta.url)),geometry=geometryFromGLB(data),base=geometry.getAttribute('position'),result=buildFaceMorphs(geometry,id);assert(result.affected>100&&result.affected<base.count*.5,`${id}: mask must be localized`);let maximum=0;
 const counts={};for(const name of FACE_TARGETS){const a=result.arrays[name];let count=0;for(let i=0;i<base.count;i++){const x=a[i*3],y=a[i*3+1],z=a[i*3+2];assert(Number.isFinite(x)&&Number.isFinite(y)&&Number.isFinite(z),`${id}/${name}: finite values`);const d=Math.hypot(x,y,z);maximum=Math.max(maximum,d);if(d>1e-5)count++;if(base.getY(i)<1.02||base.getZ(i)<.055)assert.equal(d,0,`${id}/${name}: body/back unchanged`);}assert(count>8,`${id}/${name}: landmark must hit real vertices`);counts[name]=count;}
 assert(maximum<.085,`${id}: no explosive displacement`);assert(result.calibration.mouthY>1.2&&result.calibration.mouthY<1.4);console.log(`PASS ${id}: ${result.affected}/${base.count} localized vertices; max ${(maximum*1000).toFixed(1)}mm;`,JSON.stringify(counts));geometry.dispose();
}
console.log('PASS: all five real GLBs retain finite bounded facial deltas and untouched body/back geometry.');
