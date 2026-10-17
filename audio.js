import {sampleViseme,getClipData,CLOSED_VISEMES} from './lip-sync.js';
import {VOICE_CATALOG} from './assets/audio/voice-catalog.js';
const ROOT = new URL('./assets/audio/', import.meta.url);
// Cast events carry an explicit speaker (`who`); caption parsing is only a fallback for older event shapes.
export const castSpeakerOf=event=>{if(event?.who)return event.who;const t=String(event?.text||'');return /HEGSETH/.test(t)?'hegseth':/RFK/.test(t)?'rfk-jr':/VANCE/.test(t)?'vance':null;};
// Each lure gets its own effect plus a line from a context that already holds that speaker's clips.
const LURE_SFX={hegseth:'pew',vance:'thump','rfk-jr':'roadkill'},LURE_VOICE={hegseth:'briefing',vance:'vance','rfk-jr':'lunch'};
export class AudioDirector {
  constructor() {
    this.musicVolume = .3; this.sfxVolume = .65; this.muted = false; this.active = false;
    this.music = new Audio(new URL('paperwork-parade-loop.mp3', ROOT));
    this.music.loop = true; this.music.preload = 'none'; this.music.volume = this.musicVolume;
    this.voiceVolume = .65; this.voiceEnabled = true; this.voice = null; this.lastVoice = -10000; this.deliveryCount = 0; this.ducked = false;
    this.voiceBags=new Map();this.lastByContext=new Map();this.voiceQueue=[];this.lastEvent = 0; this.cooldowns = new Map(); this.samples = new Map();
    // Suno one-shots; the lure takes are trimmed AAC (tools/trim-audio.swift). A failed play falls back to synthesis.
    for (const [type, file] of Object.entries({stamp:'stamp.mp3', applause:'applause.mp3', goose:'goose.mp3', pew:'pew.m4a', thump:'couch.m4a', roadkill:'roadkill.m4a'})) {
      const sample = new Audio(new URL(file, ROOT)); sample.preload = 'none';
      this.samples.set(type, sample);
    }
  }
  async init() { return this.resume(); }
  async resume() {
    this.active = true;
    try { this.context ||= new (window.AudioContext || window.webkitAudioContext)(); await this.context.resume(); } catch {}
    this.applyVolumes();
    if (!this.muted && this.musicVolume > 0) { try { await this.music.play(); } catch {} }
  }
  pause() { this.voiceQueue=[];this.active = false; this.music.pause(); for (const a of this.samples.values()) a.pause(); this.stopVoice(); }
  setMusicVolume(value) { this.musicVolume = Math.max(0, Math.min(1, Number(value) || 0)); this.applyVolumes(); if (this.active && !this.muted && this.musicVolume) this.music.play().catch(() => {}); }
  setSfxVolume(value) { this.sfxVolume = Math.max(0, Math.min(1, Number(value) || 0)); this.applyVolumes(); }
  setVoiceVolume(value) { this.voiceVolume = Math.max(0, Math.min(1, Number(value) || 0)); if (!this.voiceVolume) {this.voiceQueue=[];this.stopVoice();} if (this.voice) this.voice.volume = this.muted ? 0 : this.voiceVolume; }
  setVoiceEnabled(value) { this.voiceEnabled = !!value; if (!value) {this.voiceQueue=[];this.stopVoice();} }
  setVolume(value) { this.setMusicVolume(value); this.setSfxVolume(value); }
  setMuted(value) { this.muted = !!value; this.applyVolumes(); if (this.muted) { this.voiceQueue=[];this.music.pause(); this.stopVoice(); } else if (this.active) this.music.play().catch(() => {}); }
  applyVolumes() { this.music.volume = this.muted ? 0 : this.musicVolume * (this.ducked ? .25 : 1); for (const a of this.samples.values()) a.volume = this.muted ? 0 : this.sfxVolume; if (this.voice) this.voice.volume = this.muted ? 0 : this.voiceVolume; }
  stopVoice() {
    const voice=this.voice; this.voice=null; this.voiceClip=null; this.voiceReady=false; this.voicePreview=false;
    if (voice) { voice.onplaying=voice.onwaiting=voice.onstalled=voice.onended=voice.onerror=voice.onpause=null; voice.pause(); try { voice.currentTime=0; } catch {} }
    this.ducked=false; this.applyVolumes();
  }
  stopMicSpeech() { if(this.voiceClip==='trump-mic-ramble'&&!this.voicePreview)this.stopVoice(); }
  syncGame(game) {
    // A preview is independent of the simulation. In-game speech is owned by the live mic.
    if(!game)return;
    if(game.mode!=='playing'||!game.micOn||game.trump?.phase!=='talking'||game.distraction>0)this.stopMicSpeech();
  }
  startMicSpeech() { this.voiceQueue=[]; return this.playVoice('trump-mic-ramble',{force:true}); }
  getVoiceState() {
    const v=this.voice, data=getClipData(this.voiceClip);
    const playing=!!(v&&data&&this.voiceReady&&!v.paused&&!v.ended&&!v.error&&!this.muted&&this.voiceEnabled&&this.voiceVolume>0&&(this.active||this.voicePreview));
    const time=playing&&Number.isFinite(v.currentTime)?v.currentTime:0;
    const entry=VOICE_CATALOG.find(e=>e.id===this.voiceClip);return {playing,speaker:playing?(entry?.speaker||'trump'):null,sourceUrl:playing?entry?.sourceUrl:null,text:playing?(entry?.text||data.label):'',clip:playing?this.voiceClip:null,label:playing?data.label:'',time,duration:playing?(Number.isFinite(v.duration)?v.duration:data.duration):0,...(playing?sampleViseme(this.voiceClip,time):{viseme:'closed',amount:0,visemes:{...CLOSED_VISEMES}})};
  }
  playVoice(name,{force=false,preview=false}={}) {
    const entry=VOICE_CATALOG.find(e=>e.id===name);if (!entry||!getClipData(name)||(!this.active&&!preview)||this.muted||!this.voiceEnabled||!this.voiceVolume||(!force&&(performance.now()-this.lastVoice<8000||(this.voice&&!this.voice.paused)))) return;
    this.stopVoice(); this.lastVoice=performance.now(); this.voiceClip=name; this.voicePreview=preview; this.voiceReady=false;
    const voice=this.voice=new Audio(new URL(entry.src, ROOT));
    this.ducked = true; this.applyVolumes();
    const release=()=>{if(this.voice===voice)this.stopVoice();};
    voice.onplaying=()=>{if(this.voice===voice)this.voiceReady=true;};
    voice.onwaiting=voice.onstalled=()=>{if(this.voice===voice)this.voiceReady=false;};
    voice.onended=voice.onerror=voice.onpause=release;
    try { const result=voice.play(); if(result?.catch)result.catch(release); } catch { release(); }return true;
  }
  listVoices(speaker) { return VOICE_CATALOG.filter(e=>!speaker||e.speaker===speaker); }
  chooseVoice(speaker,context) {
    let category=context,entries=this.listVoices(speaker).filter(e=>(e.contexts||[]).includes(context));
    if(!entries.length){entries=this.listVoices(speaker).filter(e=>(e.contexts||[]).includes('general'));category='general';}
    if(!entries.length)return null;
    const key=speaker+':'+category;let bag=this.voiceBags.get(key);
    if(!bag?.length){bag=entries.map(e=>e.id);for(let i=bag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}if(bag.length>1&&bag[bag.length-1]===this.lastByContext.get(key))[bag[0],bag[bag.length-1]]=[bag[bag.length-1],bag[0]];this.voiceBags.set(key,bag);}
    const id=bag.pop();this.lastByContext.set(key,id);return id;
  }
  requestVoice(speaker,context,priority=1) {
    if(!this.active||this.muted||!this.voiceEnabled||!this.voiceVolume)return;
    const now=performance.now();if(!this.voice&&now-this.lastVoice>=8000&&!this.voiceQueue.length){const id=this.chooseVoice(speaker,context);if(id)this.playVoice(id);return;}
    // Two short introductions can wait their turn; ordinary quips never form a backlog.
    if(priority<2)return;
    if(!this.voiceQueue.some(q=>q.speaker===speaker)){this.voiceQueue.push({speaker,context,priority,expires:now+22000});this.voiceQueue.sort((a,b)=>b.priority-a.priority);this.voiceQueue=this.voiceQueue.slice(0,2);}
  }
  tick(){this.drainVoices();}
  drainVoices(){const now=performance.now();this.voiceQueue=this.voiceQueue.filter(q=>q.expires>now);if(this.active&&!this.voice&&now-this.lastVoice>=8000&&this.voiceQueue.length){const q=this.voiceQueue.shift(),id=this.chooseVoice(q.speaker,q.context);if(id)this.playVoice(id);}}
  play(type = 'stamp') {
    if (!this.active || this.muted || !this.sfxVolume) return;
    const now = performance.now(); if (now - (this.cooldowns.get(type) || -1000) < 150) return;
    this.cooldowns.set(type, now);
    const sample = this.samples.get(type);
    if (sample) { sample.currentTime = 0; sample.play().catch(() => this.synthesize(type)); }
    else this.synthesize(type);
  }
  synthesize(type) {
    const c = this.context; if (!c || c.state !== 'running') return;
    const now = c.currentTime, amp = this.sfxVolume * .12;
    const tone = (f, delay, duration, wave = 'sine', end = f) => {
      const o = c.createOscillator(), g = c.createGain(); o.type = wave;
      o.frequency.setValueAtTime(f, now + delay); o.frequency.exponentialRampToValueAtTime(Math.max(30, end), now + delay + duration);
      g.gain.setValueAtTime(0, now + delay); g.gain.linearRampToValueAtTime(amp, now + delay + .008); g.gain.exponentialRampToValueAtTime(.0001, now + delay + duration);
      o.connect(g); g.connect(c.destination); o.start(now + delay); o.stop(now + delay + duration + .01);
    };
    if(type==='mic-feedback'){tone(2350,0,.22,'sine',1400);tone(3100,.035,.16,'sine',1900);}
    else if (type === 'win' || type === 'applause') [523,659,784,1047].forEach((f,i)=>tone(f,i*.09,.22,'triangle'));
    else if (type === 'lose') [440,349,261,196].forEach((f,i)=>tone(f,i*.12,.25,'triangle'));
    else if (type === 'alert' || type === 'hit') { tone(660,0,.11,'square',440); tone(660,.16,.13,'square',330); }
    else if (type === 'goose') { tone(330,0,.18,'sawtooth',190); tone(290,.19,.2,'sawtooth',170); }
    else if (type === 'dash') tone(180,0,.15,'triangle',800);
    else if (type === 'pew') { tone(1400,0,.12,'square',380); tone(1250,.15,.14,'sawtooth',300); }
    else if (type === 'thump') { tone(95,0,.24,'sine',40); tone(160,.02,.12,'triangle',60); }
    else if (type === 'pickup') { tone(620,0,.1,'triangle'); tone(930,.07,.16,'triangle'); }
    else { tone(115,0,.09,'triangle',45); tone(1000,.025,.055,'sine',400); }
  }
  updateGameEvents(events) {
    const list = Array.isArray(events) ? events : [events];
    for (const event of list) {
      if (!event) continue;
      const id = typeof event === 'object' ? event.id ?? event.eventId : null;
      if (typeof id === 'number') { if (id <= this.lastEvent) continue; this.lastEvent = id; }
      const type = typeof event === 'object' ? event.type : '';
      const effects = {'job-stage':'stamp','job-complete':'stamp','mic-cutoff':'mic-feedback',win:'win',lose:'lose',lunch:'goose',catch:'goose',damage:'alert',tamper:'alert',warning:'alert',briefing:'alert',vance:'alert',resolve:'stamp',delivery:'stamp',pickup:'pickup',drop:'stamp',dash:'dash',mic:'pickup',broadcast:'alert',blocked:'alert','cast-warning':'alert','cast-effect':'stamp','cast-shove':'stamp','shoo-cast':'stamp','cast-latch':'alert','cast-thanks':'pickup'};
      if(['mic-cutoff','distraction','shoo','lose','win'].includes(type))this.stopMicSpeech();
      const lureSpeaker = type === 'lure' ? castSpeakerOf(event) : null;
      if (type === 'lure') this.play(LURE_SFX[lureSpeaker] || 'stamp');
      else if (type === 'distraction') this.play(String(event.text || '').toLowerCase().includes('applause') || String(event.text || '').includes('noise') ? 'applause' : 'stamp');
      else if (effects[type]) this.play(effects[type]);
      if(type==='lose'){this.voiceQueue=[];this.stopVoice();}
      else if(lureSpeaker)this.requestVoice(lureSpeaker,LURE_VOICE[lureSpeaker]);
      else if(type==='lunch')this.requestVoice('rfk-jr','lunch',3);
      else if(type==='vance')this.requestVoice('vance','vance',3);
      else if(type==='briefing')this.requestVoice('hegseth','briefing',3);
      else if(type==='distraction')this.requestVoice('trump','distraction');
      else if(type==='delivery'&&++this.deliveryCount%3===0)this.requestVoice('trump','delivery');
      else if(type==='win'){this.voiceQueue=[];this.requestVoice('trump','win',4);}
      else if(type==='speech')this.startMicSpeech();
      else if(type==='shoo')this.requestVoice('trump','shoo');
      else if(type==='damage')this.requestVoice('trump','damage',2);
    }
    this.drainVoices();
  }
  resetEvents() { this.voiceQueue=[];this.voiceBags.clear();this.lastByContext.clear();this.lastEvent = 0; this.deliveryCount = 0; this.stopVoice(); this.lastVoice=-10000; }
}
export default AudioDirector;
