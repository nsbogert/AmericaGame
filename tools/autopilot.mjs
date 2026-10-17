// Headless player for balance checks and the every-tier-is-winnable gate.
// It only uses the real inputs (move, E, dash): it walks to lure stations and threats like a person would.
import{createGame,tick,stations,roomJobs,nearest}from'../sim.js';
import{LURES}from'../cast.js';

const S=id=>stations.find(s=>s.id===id);
export const PROFILES={
 expert:{react:.3,wobble:0,defend:true,catchAnimals:true},
 casual:{react:1,wobble:.15,defend:true,catchAnimals:true},
 oblivious:{react:1,wobble:.15,defend:false,catchAnimals:false},
 sloppy:{react:1.8,wobble:.35,defend:false,catchAnimals:true}};

// Deterministic wobble so a profile + seed always replays identically.
const noise=seed=>{let x=seed*2654435761>>>0;return()=>((x=Math.imul(x^x>>>15,2246822507)>>>0)/4294967296);};

function threatGoal(g){
 const b=g.trump,options=[];
 const trumpThreat=['approach-station','tampering'].includes(b.phase)||g.show.phase==='live'&&['approach','talking'].includes(b.phase);
 if(trumpThreat){
  if(g.cooldown<=0)options.push({...S('applause'),r:30});
  if(g.ribbonCooldown<=0)options.push({...S('ribbon'),r:30});
  if(g.shooCooldown<=0&&['approach-station','tampering'].includes(b.phase))options.push({x:b.x,y:b.y,r:45});
 }
 for(const m of Object.values(g.cast)){
  const urgent=m.phase==='acting'||m.phase==='approach'||m.phase.startsWith('pushup');
  if(!urgent)continue;
  const lure=Object.keys(LURES).find(id=>LURES[id].who===m.who);
  if(g.lureCooldowns[lure]<=0)options.push({...S(lure),r:30});
  options.push({x:m.x,y:m.y,r:45});
 }
 options.sort((a,c)=>Math.hypot(a.x-g.player.x,a.y-g.player.y)-Math.hypot(c.x-g.player.x,c.y-g.player.y));
 return options[0]||null;
}

function taskGoal(g,o){
 const carried=g.deliveries.find(d=>d.id===g.carry);
 if(carried)return{...carried.target,r:30};
 if(g.carry==='packet'||g.carry?.startsWith('animal:'))return{...S('exit'),r:30};
 if(g.carry==='bait')return{x:1110,y:460,r:10};
 if(g.lunch.phase==='active'){
  const a=g.lunch.animals.find(a=>a.phase==='roaming');
  if(o.catchAnimals&&a)return{x:a.x,y:a.y,r:40};
  return{...S('catering'),r:30};
 }
 if(g.briefing.phase==='active')return{...S('briefing'),r:30};
 const loose=g.deliveries.find(d=>!d.done);
 if(loose)return{x:loose.x,y:loose.y,r:30};
 const job=roomJobs.find(j=>!g.tasks[j.id].done);
 if(job)return{...S(job.id),r:30,hold:true};
 if(g.show.phase==='setup')return{...S('broadcast'),r:30};
 return null;
}

export function play(seed,tierId,profile){
 const o=typeof profile==='string'?PROFILES[profile]:profile,rnd=noise(seed);
 const g=createGame(180,seed,tierId),input={};
 let react=0,lastEvent=g.eventId,ePhase=false;
 while(g.mode==='playing'){
  for(const k of['up','down','left','right','dash'])input[k]=false;
  if(g.eventId!==lastEvent){if(!['dash','job-stage','job-complete','pickup','delivery','drop'].includes(g.events.at(-1)?.type))react=o.react;lastEvent=g.eventId;}
  if(react>0){react-=.05;input.work=false;ePhase=false;tick(g,.05,input);continue;}
  let goal=null;
  if(g.latch&&!nearest(g))goal={x:g.player.x,y:g.player.y,r:999};
  else if(o.defend)goal=threatGoal(g);
  goal||=taskGoal(g,o);
  if(goal){
   const dx=goal.x-g.player.x,dy=goal.y-g.player.y;
   if(Math.hypot(dx,dy)<goal.r){
    if(goal.hold)input.work=true;else{input.work=!ePhase;ePhase=!ePhase;}
   }else{
    input.work=false;ePhase=false;
    if(rnd()<o.wobble){input.left=rnd()<.5;input.right=!input.left;}
    else{input.right=dx>8;input.left=dx<-8;input.down=dy>8;input.up=dy<-8;input.dash=Math.hypot(dx,dy)>260&&g.dashCooldown<=0;}
   }
  }
  tick(g,.05,input);
 }
 return g;
}
