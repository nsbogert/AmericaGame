// Hegseth, RFK Jr. and Vance as wandering schemers. Same grammar as Trump:
// wander → notice (telegraph) → approach → act (countdown) → effect. Counters: E nearby (shoo) or their lure.
import{at,say,rand,moveToward,canDamage,damageTarget,sabotageTargets}from'./core.js';

export const CAST_IDS=['hegs','rfk','vance'];
export const LURES={
 applause:{who:'trump',hold:9,recharge:20},
 ribbon:{who:'trump',hold:7,recharge:16},
 soldiers:{who:'hegs',hold:8,recharge:18,line:'HEGSETH: “Pew pew! Flank them!” He is busy winning a war on the carpet.'},
 couch:{who:'vance',hold:8,recharge:18,line:'VANCE: “Oh, that is a VERY comfortable couch.” He needs a moment.'},
 roadkill:{who:'rfk',hold:8,recharge:18,line:'RFK JR: “Still fresh. I’ll put it in the car.”'}};
const NAMES={hegs:'HEGSETH',rfk:'RFK JR',vance:'VANCE'};
const SPEAKER={hegs:'hegseth',rfk:'rfk-jr',vance:'vance'};
const CULPRIT={hegs:'hegseth',rfk:'rfk',vance:'vance'};
const ROUTES={hegs:[[270,420],[460,380],[300,215],[630,510],[440,670]],rfk:[[1000,380],[920,610],[760,400],[1040,560]],vance:[[760,400],[630,510],[700,250],[460,380]]};
// Puddle spots sit on busy routes but at least 90px from every station, the exit and the camera.
const PUDDLE_SPOTS=[[760,400],[460,380],[630,510],[270,420],[540,280]];
const PUSHUP_SPOT={rfk:{x:700,y:520},hegs:{x:830,y:525}};
const PUSHUP_AT={rfk:8,hegs:14};
const SCHEMING=['noticing','approach','acting'];
const SHOO_RANGE=75,SHOVE_RANGE=28,LATCH_RANGE=50;

export function createCast(seed){
 const member=(who,x,y)=>({who,x,y,phase:'wander',timer:0,wp:0,next:14+seed%5+CAST_IDS.indexOf(who)*7,scheme:null,pushupsDone:false});
 return{hegs:{...member('hegs',305,500),shoveCd:0},rfk:member('rfk',1120,410),vance:{...member('vance',660,355),thankCd:12,flipsLeft:0}};
}

const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const members=g=>CAST_IDS.map(id=>g.cast[id]);
export const schemingCount=g=>members(g).filter(m=>SCHEMING.includes(m.phase)).length+(['approach-station','tampering'].includes(g.trump.phase)?1:0);

function pickScheme(g,m){
 if(m.who==='hegs'){
  const jobs=sabotageTargets(g).filter(t=>t.roomJob);
  if(!jobs.length||!canDamage(g,'hegseth'))return null;
  const t=jobs.find(j=>j.id==='cards')||jobs[Math.floor(rand(g,'castRng')*jobs.length)];
  return{kind:'leak',id:t.id,x:t.target.x,y:t.target.y-35,label:t.label};
 }
 if(m.who==='rfk'){
  if(g.puddles.length>=g.tier.maxPuddles)return null;
  const free=PUDDLE_SPOTS.filter(([x,y])=>!g.puddles.some(p=>p.x===x&&p.y===y));
  const [x,y]=free[Math.floor(rand(g,'castRng')*free.length)];
  return{kind:'milk',x,y,label:'RAW MILK'};
 }
 const open=g.deliveries.filter(d=>!d.done&&d.id!==g.carry);
 if(m.flipsLeft<=0||open.length<2)return null;
 const sign=at('sign');
 return{kind:'flip',x:sign.x+30,y:sign.y,label:'DIRECTIONS'};
}

const SCHEME_LINES={leak:(m,s)=>`HEGSETH is eyeing ${s.label}. He wants to post it to the group chat.`,milk:()=>'RFK JR is uncorking a jug of raw milk. Mind the floor.',flip:()=>'VANCE is heading for the sign. He is reconsidering everything.'};

function applyScheme(g,m){
 const s=m.scheme;
 if(s.kind==='leak'){if(g.tasks[s.id]?.done&&canDamage(g,'hegseth'))damageTarget(g,s.id,'hegseth');}
 else if(s.kind==='milk'){g.puddles.push({x:s.x,y:s.y,r:50,t:20});say(g,'RFK JR: “Unpasteurized. Very healthy.” Raw milk on the floor — it slows you down.','cast-effect','rfk-jr');}
 else if(s.kind==='flip'){
  const open=g.deliveries.filter(d=>!d.done&&d.id!==g.carry);
  if(open.length>=2){const [a,b]=open;const t=a.target;a.target={...b.target};b.target={...t};m.flipsLeft--;g.vance.phase='active';g.vance.delivery=a.id;say(g,'VANCE: “I agree with the other direction now.” Two targets swapped. Check the colors!','vance','vance');}
 }
}

function startWander(g,m,gap){m.phase='wander';m.scheme=null;m.next=gap??g.tier.schemeGap*(.8+rand(g,'castRng')*.4);}

export function tickCast(g,dt){
 g.castDirector=Math.max(0,g.castDirector-dt);
 for(const p of g.puddles)p.t-=dt;
 g.puddles=g.puddles.filter(p=>p.t>0);
 for(const [id,cd]of Object.entries(g.lureCooldowns))g.lureCooldowns[id]=Math.max(0,cd-dt);
 const live=g.show.phase==='live',liveElapsed=30-g.show.time;
 for(const m of members(g)){
  if(m.who==='hegs')m.shoveCd=Math.max(0,m.shoveCd-dt);
  if(m.who==='vance')m.thankCd=Math.max(0,m.thankCd-dt);
  // Live push-ups preempt wandering and scheming, never a lure already in progress.
  if(live&&g.tier.livePushups.includes(m.who)&&!m.pushupsDone&&liveElapsed>=PUSHUP_AT[m.who]&&!m.phase.startsWith('lured')){
   m.pushupsDone=true;if(m.phase==='latched')g.latch=null;m.scheme=null;m.phase='pushup-approach';
   say(g,`${NAMES[m.who]}: “Push-up contest. On camera.” He is blocking the shot — E nearby or use his lure!`,'cast-warning',SPEAKER[m.who]);
  }
  if(m.phase==='wander'){
   const route=ROUTES[m.who],[wx,wy]=route[m.wp%route.length];
   if(moveToward(m,wx,wy,m.who==='hegs'?95:70,dt))m.wp=(m.wp+1+Math.floor(rand(g,'castRng')*2))%route.length;
   m.next-=dt;
   if(m.next<=0&&g.castDirector<=0&&schemingCount(g)<g.tier.maxScheming){
    const s=pickScheme(g,m);
    if(s){m.scheme=s;m.phase='noticing';m.timer=2;g.castDirector=g.tier.telegraphGap;say(g,SCHEME_LINES[s.kind](m,s),'cast-warning',SPEAKER[m.who]);}
    else m.next=3;
   }
   if(m.who==='hegs'&&m.shoveCd<=0&&g.dashTime<=0&&dist(m,g.player)<SHOVE_RANGE)shove(g,m);
   if(m.who==='vance'&&m.thankCd<=0&&!g.latch&&g.dashTime<=0&&g.elapsed>10&&dist(m,g.player)<LATCH_RANGE){m.phase='latched';m.timer=7;g.latch='vance';say(g,'VANCE: “Have you said thank you? Even once?” He will not let you leave. E to thank him.','cast-latch','vance');}
  }
  else if(m.phase==='noticing'){m.timer-=dt;if(m.timer<=0)m.phase='approach';}
  else if(m.phase==='approach'){if(moveToward(m,m.scheme.x,m.scheme.y,100,dt)){m.phase='acting';m.timer=m.scheme.kind==='milk'?1.5:g.tier.castAct;}}
  else if(m.phase==='acting'){m.timer-=dt;g.patience-=dt*.25;if(m.timer<=0){applyScheme(g,m);startWander(g,m);}}
  else if(m.phase==='lured-approach'){const s=at(m.lure);if(moveToward(m,s.x,s.y-35,150,dt)){m.phase='lured';m.timer=LURES[m.lure].hold;}}
  else if(m.phase==='lured'){m.timer-=dt;if(m.timer<=0)startWander(g,m);}
  else if(m.phase==='pushup-approach'){const s=PUSHUP_SPOT[m.who];if(moveToward(m,s.x,s.y,140,dt)){m.phase='pushups';m.timer=g.tier.pushupSeconds;}}
  else if(m.phase==='pushups'){g.patience-=dt*.1;m.timer-=dt;if(!live||m.timer<=0)startWander(g,m);}
  else if(m.phase==='latched'){m.timer-=dt;m.x=g.player.x-26;m.y=g.player.y+8;if(m.timer<=0)releaseLatch(g,m,false);}
 }
 g.castWarnings=members(g).filter(m=>SCHEMING.includes(m.phase)||m.phase==='pushups'||m.phase==='pushup-approach'||m.phase==='latched').map(m=>({who:m.who,phase:m.phase,kind:m.phase.startsWith('pushup')?'pushups':m.phase==='latched'?'latch':m.scheme.kind,stationId:m.scheme?.kind==='leak'?m.scheme.id:m.scheme?.kind==='flip'?'sign':null,x:m.scheme?.x??m.x,y:m.scheme?.y??m.y,timer:m.phase==='acting'?m.timer:null,max:m.phase!=='acting'?null:m.scheme.kind==='milk'?1.5:g.tier.castAct}));
}

function shove(g,m){
 const dx=g.player.x-m.x,dy=g.player.y-m.y,len=Math.hypot(dx,dy)||1;
 g.player.x=Math.max(72,Math.min(1128,g.player.x+dx/len*45));g.player.y=Math.max(130,Math.min(690,g.player.y+dy/len*45));
 m.shoveCd=3;say(g,'HEGSETH: “Make way. Warrior ethos.” You have been shouldered aside.','cast-shove','hegseth');
}
function releaseLatch(g,m,thanked){g.latch=null;m.thankCd=22;startWander(g,m,g.tier.schemeGap*.5);if(thanked){g.stats.thanks++;say(g,'“Thank you, sir.” He accepts it as a down payment.','cast-thanks','vance');}else say(g,'VANCE wanders off to find someone more grateful.','cast-thanks','vance');}

// Slows never stack: the strongest active one wins, and dashing ignores them.
export function playerSlow(g){
 let f=1;
 if(g.puddles.some(p=>Math.hypot(p.x-g.player.x,p.y-g.player.y)<p.r))f=Math.min(f,.5);
 if(g.latch)f=Math.min(f,.4);
 return f;
}

// E near a scheming / push-up cast member sends him back to wandering. Returns true when E was used.
export function shooCast(g){
 const m=members(g).find(m=>(SCHEMING.includes(m.phase)||m.phase==='pushups'||m.phase==='pushup-approach')&&dist(m,g.player)<SHOO_RANGE);
 if(!m)return false;
 if(m.phase==='acting'||m.phase==='pushups')g.stats.saves++;
 startWander(g,m,g.tier.schemeGap*.6);
 say(g,`“${m.who==='vance'?'Mr. Vice President':'Mr. Secretary'}, the photo line is over there.” ${NAMES[m.who]} backs off.`,'shoo-cast',SPEAKER[m.who]);
 return true;
}
export function thankVance(g){if(g.latch!=='vance')return false;releaseLatch(g,g.cast.vance,true);return true;}

// Lure stations for the cast. Trump's applause/ribbon stay in sim.distract.
export function lureCast(g,id){
 const lure=LURES[id];if(!lure||lure.who==='trump')return false;
 if(g.lureCooldowns[id]>0)return false;
 const m=g.cast[lure.who];
 if(m.phase==='acting'||m.phase==='pushups')g.stats.saves++;
 if(m.phase==='latched'){g.latch=null;m.thankCd=22;}
 m.scheme=null;m.phase='lured-approach';m.lure=id;g.lureCooldowns[id]=lure.recharge;
 say(g,lure.line,'lure',SPEAKER[lure.who]);
 return true;
}

export function castBlocksCamera(g){return members(g).some(m=>m.phase==='pushups');}

export function castPrompt(g){
 const m=members(g).find(m=>(SCHEMING.includes(m.phase)||m.phase==='pushups'||m.phase==='pushup-approach')&&dist(m,g.player)<SHOO_RANGE);
 if(m)return `E: SHOO ${NAMES[m.who]} before he ${m.phase.startsWith('pushup')?'ruins the shot':m.scheme.kind==='leak'?'leaks the setup':m.scheme.kind==='milk'?'spills the milk':'flips the directions'}!`;
 return null;
}
export const latchPrompt=g=>g.latch==='vance'?'E: say “thank you” to VANCE (he is slowing you down)':null;
export const lureName=id=>({soldiers:'TOY SOLDIERS',couch:'COZY COUCH',roadkill:'ROADKILL'})[id];
export const lureTarget=id=>NAMES[LURES[id]?.who];
export{CULPRIT};
