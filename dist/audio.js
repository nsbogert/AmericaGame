const ROOT = new URL('./assets/audio/', import.meta.url);
export class AudioDirector {
  constructor() {
    this.musicVolume = .3; this.sfxVolume = .65; this.muted = false; this.active = false;
    this.music = new Audio(new URL('paperwork-parade-loop.mp3', ROOT));
    this.music.loop = true; this.music.preload = 'none'; this.music.volume = this.musicVolume;
    this.voiceVolume = .65; this.voiceEnabled = true; this.voice = null; this.lastVoice = -10000; this.deliveryCount = 0; this.ducked = false;
    this.lastEvent = 0; this.cooldowns = new Map(); this.samples = new Map();
    for (const type of ['stamp', 'applause', 'goose']) {
      const sample = new Audio(new URL(`${type}.mp3`, ROOT)); sample.preload = 'none';
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
  pause() { this.active = false; this.music.pause(); for (const a of this.samples.values()) a.pause(); if (this.voice) this.voice.pause(); this.ducked = false; this.applyVolumes(); }
  setMusicVolume(value) { this.musicVolume = Math.max(0, Math.min(1, Number(value) || 0)); this.applyVolumes(); if (this.active && !this.muted && this.musicVolume) this.music.play().catch(() => {}); }
  setSfxVolume(value) { this.sfxVolume = Math.max(0, Math.min(1, Number(value) || 0)); this.applyVolumes(); }
  setVoiceVolume(value) { this.voiceVolume = Math.max(0, Math.min(1, Number(value) || 0)); if (this.voice) this.voice.volume = this.muted ? 0 : this.voiceVolume; }
  setVoiceEnabled(value) { this.voiceEnabled = !!value; if (!value && this.voice) { this.voice.pause(); this.ducked = false; this.applyVolumes(); } }
  setVolume(value) { this.setMusicVolume(value); this.setSfxVolume(value); }
  setMuted(value) { this.muted = !!value; this.applyVolumes(); if (this.muted) this.music.pause(); else if (this.active) this.music.play().catch(() => {}); }
  applyVolumes() { this.music.volume = this.muted ? 0 : this.musicVolume * (this.ducked ? .25 : 1); for (const a of this.samples.values()) a.volume = this.muted ? 0 : this.sfxVolume; if (this.voice) this.voice.volume = this.muted ? 0 : this.voiceVolume; }
  playVoice(name) {
    if (!this.active || this.muted || !this.voiceEnabled || !this.voiceVolume || performance.now() - this.lastVoice < 8000 || (this.voice && !this.voice.paused)) return;
    this.lastVoice = performance.now(); this.voice = new Audio(new URL(`trump-clips/${name}.mp3`, ROOT));
    this.ducked = true; this.applyVolumes();
    const release = () => { this.ducked = false; this.applyVolumes(); };
    this.voice.onended = release; this.voice.onerror = release; this.voice.play().catch(release);
  }
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
    if (type === 'win' || type === 'applause') [523,659,784,1047].forEach((f,i)=>tone(f,i*.09,.22,'triangle'));
    else if (type === 'lose') [440,349,261,196].forEach((f,i)=>tone(f,i*.12,.25,'triangle'));
    else if (type === 'alert' || type === 'hit') { tone(660,0,.11,'square',440); tone(660,.16,.13,'square',330); }
    else if (type === 'goose') { tone(330,0,.18,'sawtooth',190); tone(290,.19,.2,'sawtooth',170); }
    else if (type === 'dash') tone(180,0,.15,'triangle',800);
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
      const effects = {win:'win',lose:'lose',lunch:'goose',catch:'goose',damage:'alert',tamper:'alert',warning:'alert',briefing:'alert',vance:'alert',resolve:'stamp',delivery:'stamp',pickup:'pickup',drop:'stamp',dash:'dash',mic:'pickup',broadcast:'alert',blocked:'alert'};
      if (type === 'distraction') this.play(String(event.text || '').toLowerCase().includes('applause') || String(event.text || '').includes('noise') ? 'applause' : 'stamp');
      else if (effects[type]) this.play(effects[type]);
      if (type === 'distraction') this.playVoice('thank-you');
      else if (type === 'delivery' && ++this.deliveryCount % 3 === 0) this.playVoice('pretty-amazing');
      else if (type === 'win') this.playVoice('a-record');
      else if (type === 'speech') this.playVoice('whats-going-on');
    }
  }
  resetEvents() { this.lastEvent = 0; this.deliveryCount = 0; }
}
export default AudioDirector;
