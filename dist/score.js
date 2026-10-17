// Pure end-of-shift ratings. No storage, no DOM: app.js owns persistence.
export const SAVE_CAP=8;
const GRADES=[
 {grade:'S',min:5200,headline:'RECORD RATINGS. He is calling it the greatest broadcast in the history of broadcasting, possibly ever.'},
 {grade:'A',min:4600,headline:'Huge numbers. He has already taken credit for them twice.'},
 {grade:'B',min:3600,headline:'Watchable. Cable news describes it as “a broadcast.”'},
 {grade:'C',min:2600,headline:'A modest audience, mostly staff and two confused raccoons.'},
 {grade:'D',min:0,headline:'Technically aired. Legally, that counts.'}];

export function scoreShift(g){
 const s=g.stats||{},won=g.mode==='won';
 const breakdown=[
  {label:'Clean airtime',value:Math.round((g.show?.progress||0)*100)},
  {label:'Time to spare at GO LIVE',value:(s.liveAt||0)*8},
  {label:`Saves (${Math.min(s.saves||0,SAVE_CAP)}${(s.saves||0)>SAVE_CAP?' max':''})`,value:Math.min(s.saves||0,SAVE_CAP)*150},
  {label:'Presidential patience',value:Math.round(Math.max(0,g.patience||0)*10)},
  {label:`Damage (${s.damages||0})`,value:-(s.damages||0)*200}];
 const base=Math.max(0,breakdown.reduce((n,b)=>n+b.value,0));
 const multiplier=g.tier?.multiplier||1;
 const points=Math.round(base*multiplier);
 if(!won)return{points,base,multiplier,grade:'CANCELLED',headline:'The network has replaced you with a test pattern.',breakdown};
 const tier=GRADES.find(t=>base>=t.min);
 return{points,base,multiplier,grade:tier.grade,headline:tier.headline,breakdown};
}
