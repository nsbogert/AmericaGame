import {VOICE_VISEMES} from './assets/audio/voice-visemes.js';
export const CLOSED_VISEMES = Object.freeze({jawOpen:0,mouthWide:0,mouthRound:0});
const SHAPES = {closed:[0,0,0],AA:[1,.18,0],EE:[.38,1,0],OO:[.5,0,1],FV:[.12,.42,0],MBP:[0,.08,.08]};
export function sampleViseme(clip,time) {
  const data=VOICE_VISEMES.clips[clip];
  if (!data || !Number.isFinite(time) || time<0 || time>=data.duration) return {viseme:'closed',amount:0,visemes:{...CLOSED_VISEMES}};
  const position=time/data.step, index=Math.floor(position), fraction=position-index;
  const left=data.envelope[index]||0, right=data.envelope[index+1]||0;
  // Do not interpolate speech energy into a measured silent frame.
  const amount=left===0?0:left+(right-left)*fraction;
  const cue=data.cues.find(c=>time>=c[0]&&time<c[1]);
  const viseme=amount>.04&&cue?cue[2]:'closed', shape=SHAPES[viseme]||SHAPES.closed;
  return {viseme,amount:viseme==='closed'?0:amount,visemes:{jawOpen:shape[0]*amount,mouthWide:shape[1]*amount,mouthRound:shape[2]*amount}};
}
export function getClipData(clip) { return VOICE_VISEMES.clips[clip]||null; }
