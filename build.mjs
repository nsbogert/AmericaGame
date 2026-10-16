import {mkdir,copyFile,cp,rm} from 'node:fs/promises';
const out=new URL('./dist/',import.meta.url);await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
for(const f of ['index.html','style.css','app.js','renderer.js','sim.js','audio.js'])await copyFile(new URL(f,import.meta.url),new URL(f,out));
for(const dir of ['assets','vendor'])await cp(new URL('./'+dir+'/',import.meta.url),new URL('./'+dir+'/',out),{recursive:true});
console.log('Static 3D ballroom ready in dist/');
