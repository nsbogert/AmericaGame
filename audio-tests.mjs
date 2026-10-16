import assert from 'node:assert/strict';
import {sampleViseme,getClipData} from './lip-sync.js';
let clock=10000;
Object.defineProperty(globalThis,'performance',{value:{now:()=>clock},configurable:true});
class MockAudio {
  constructor(url){this.url=String(url);this.paused=true;this.ended=false;this.currentTime=0;this.duration=2;this.volume=1;}
  play(){this.paused=false;return this.rejectPlay?Promise.reject(Error('blocked')):Promise.resolve();}
  pause(){this.paused=true;this.onpause?.();}
  start(){this.onplaying?.();}
}
globalThis.Audio=MockAudio;
const {AudioDirector}=await import('./audio.js');
const a=new AudioDirector();
assert.equal(a.getVoiceState().playing,false);
assert.equal(a.music.paused,true,'constructor must not autoplay');
a.playVoice('thank-you');assert.equal(a.voice,null,'game voice requires active game');
a.playVoice('thank-you',{force:true,preview:true});
assert.equal(a.getVoiceState().playing,false,'pending play is closed');
a.voice.start();a.voice.currentTime=.25;clock+=30000;
assert.equal(a.getVoiceState().time,.25,'voice clock must come from audio, not elapsed wall clock');
assert.equal(a.music.paused,true,'preview never starts music');
assert.equal(a.getVoiceState().playing,true);
a.voice.onwaiting();assert.equal(a.getVoiceState().amount,0,'buffering closes mouth');
a.voice.start();const old=a.voice, oldEnd=old.onended;
a.playVoice('a-record',{force:true,preview:true});a.voice.start();const current=a.voice;oldEnd();
assert.equal(a.voice,current,'stale previous callbacks cannot stop replacement');
assert.equal(old.currentTime,0);assert.equal(old.paused,true);
a.setMuted(true);assert.equal(a.getVoiceState().viseme,'closed');assert.equal(a.ducked,false);assert.equal(current.paused,true);
a.setMuted(false);assert.equal(a.getVoiceState().playing,false,'unmute never resurrects old voice');
for(const operation of [()=>a.pause(),()=>a.setVoiceEnabled(false),()=>a.setVoiceVolume(0),()=>a.resetEvents()]){
 a.setVoiceEnabled(true);a.setVoiceVolume(.6);a.playVoice('thank-you',{force:true,preview:true});a.voice.start();operation();
 assert.equal(a.getVoiceState().amount,0);assert.equal(a.ducked,false);assert.equal(a.voice,null);
}
a.setVoiceEnabled(true);a.setVoiceVolume(.6);a.playVoice('thank-you',{force:true,preview:true});a.voice.start();a.voice.onended();assert.equal(a.voice,null);
a.playVoice('thank-you',{force:true,preview:true});a.voice.start();a.voice.onerror();assert.equal(a.getVoiceState().playing,false);
const original=MockAudio.prototype.play;MockAudio.prototype.play=function(){this.paused=false;return Promise.reject(Error('autoplay blocked'));};
a.playVoice('thank-you',{force:true,preview:true});await Promise.resolve();assert.equal(a.voice,null);assert.equal(a.ducked,false);MockAudio.prototype.play=original;
a.active=true;a.lastVoice=-10000;a.playVoice('thank-you');const first=a.voice;a.playVoice('a-record');assert.equal(a.voice,first,'normal voices never overlap');
a.stopVoice();a.playVoice('a-record');assert.equal(a.voice,null,'normal eight-second cooldown remains');
for(const clip of ['thank-you','pretty-amazing','a-record','whats-going-on']){
 const d=getClipData(clip);let silence=0,speech=0;
 for(let i=0;i<d.envelope.length;i++){
  const state=sampleViseme(clip,i*d.step+0.00001);
  if(d.envelope[i]===0){assert.equal(state.viseme,'closed');assert.equal(state.amount,0);silence++;}
  if(state.amount>0)speech++;
  for(const x of Object.values(state.visemes))assert.ok(x>=0&&x<=1);
 }
 assert.ok(silence>0&&speech>0,`${clip} has both measured silence and speech`);
 assert.equal(sampleViseme(clip,d.duration).amount,0);assert.equal(sampleViseme(clip,-.1).amount,0);
}
assert.equal(sampleViseme('unknown',.3).amount,0);
console.log('Audio lifecycle, preview isolation, playback clock, cooldown, stale callback and four-clip silence tests passed.');
// Expanded catalog must route real files and visemes to their own speaker.
const {VOICE_CATALOG}=await import('./assets/audio/voice-catalog.js');
const {access}=await import('node:fs/promises');
for(const speaker of ['trump','rfk-jr','vance','hegseth']){
 const entries=VOICE_CATALOG.filter(c=>c.speaker===speaker);assert(entries.length,`${speaker} has actual sourced clips`);
 for(const entry of entries){
  assert(/^https:\/\//.test(entry.sourceUrl),`${entry.id} has a source recording`);assert(entry.contexts.length);assert(entry.text||entry.label);
  await access(new URL('./assets/audio/'+entry.src,import.meta.url));
  const data=getClipData(entry.id);assert(data&&data.duration>0&&data.envelope.length>0,`${entry.id} measured visemes exist`);
 }
 a.playVoice(entries[0].id,{force:true,preview:true});a.voice.start();assert.equal(a.getVoiceState().speaker,speaker);assert.equal(a.getVoiceState().sourceUrl,entries[0].sourceUrl);assert(a.voice.url.endsWith(entries[0].src));a.stopVoice();
}
const {VOICE_VISEMES:originalFour}=await import('./assets/audio/trump-clips/visemes.js');
for(const id of ['thank-you','pretty-amazing','a-record','whats-going-on'])assert.deepEqual(getClipData(id),originalFour.clips[id],`${id} timing retained unchanged`);
// A context bag varies before refilling and cannot repeat its boundary choice.
for(const speaker of ['trump','rfk-jr','vance','hegseth']){
 const general=VOICE_CATALOG.filter(e=>e.speaker===speaker&&e.contexts.includes('general'));
 if(general.length>1){const picks=Array.from({length:general.length},()=>a.chooseVoice(speaker,'unmatched-test-context'));assert.equal(new Set(picks).size,general.length);assert.notEqual(a.chooseVoice(speaker,'unmatched-test-context'),picks.at(-1));}
}
a.resetEvents();a.active=true;clock+=100000;a.updateGameEvents([{id:1,type:'speech'}]);assert(a.voice);a.voice.start();
a.updateGameEvents([{id:2,type:'vance'},{id:3,type:'lunch'},{id:4,type:'briefing'}]);assert(a.voiceQueue.length<=2);assert(a.voiceQueue.length>0);const queued=a.voiceQueue[0].speaker;
a.voice.onended();clock+=8100;a.updateGameEvents([{id:5,type:'speech'}]);assert.equal(a.getVoiceState().playing,false);a.voice.start();assert.equal(a.getVoiceState().speaker,queued,'an introduction has priority over a new ordinary quip');
a.setMuted(true);assert.equal(a.voiceQueue.length,0);assert.equal(a.getVoiceState().speaker,null);
console.log('Expanded cast catalog, real-file provenance, speaker routing, preserved original clips, variation bags and bounded fair introduction queue passed.');

// Terminal results can finish a queued win line; loss cancels stale cast chatter.
a.setMuted(false);a.active=true;a.resetEvents();clock+=100000;a.playVoice('thank-you');a.voice.start();a.updateGameEvents([{id:1,type:'win'}]);assert.equal(a.voiceQueue.length,1);a.voice.onended();clock+=8100;a.tick();assert(a.voice,'queued win line drains even without another game event');a.voice.start();assert.equal(a.getVoiceState().speaker,'trump');a.requestVoice('vance','vance',3);assert(a.voiceQueue.length);a.updateGameEvents([{id:2,type:'lose'}]);assert.equal(a.voice,null);assert.equal(a.voiceQueue.length,0);clock+=10000;a.tick();assert.equal(a.voice,null);console.log('Terminal queued win and stale-loss cancellation passed.');
