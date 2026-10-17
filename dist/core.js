// Shared rule primitives used by sim.js (Trump, props, jobs) and cast.js (Hegseth, RFK, Vance).
export const W=1200,H=760;
export const roomJobs=[
{id:'teleprompter',label:'FIX TELEPROMPTER',color:'#7ed7da',stages:[{label:'Tune the scrolling speed',duration:1.2},{label:'Approve “Welcome, everyone.”',duration:1}]},
{id:'flags',label:'STRAIGHTEN FLAGS',color:'#e8b854',stages:[{label:'Untangle and straighten the flags',duration:2}]},
{id:'cards',label:'SORT BRIEFING CARDS',color:'#c5a4e5',stages:[{label:'Sort the cards into order',duration:1.5},{label:'Stamp the approved stack',duration:.8}]}];
export const stations=[
{id:'teleprompter',name:'Fix teleprompter',short:'TELEPROMPTER',x:455,y:155},
{id:'flags',name:'Straighten flags',short:'FLAGS',x:1020,y:240},
{id:'cards',name:'Sort briefing cards',short:'BRIEFING CARDS',x:420,y:525},
{id:'supply',name:'Pick up next delivery',short:'PROP SUPPLY',x:130,y:385},
{id:'west',name:'Deliver west setup',short:'WEST SETUP',x:330,y:290},
{id:'east',name:'Deliver east setup',short:'EAST SETUP',x:900,y:300},
{id:'camera',name:'Deliver camera stand',short:'CAMERA SETUP',x:760,y:585},
{id:'podium',name:'Toggle live microphone',short:'MICROPHONE',x:600,y:170},
{id:'applause',name:'Trigger applause',short:'APPLAUSE',x:130,y:640},
{id:'ribbon',name:'Begin ribbon ceremony',short:'RIBBON',x:1060,y:640},
{id:'catering',name:'Collect animal bait',short:'BAIT CRATE',x:900,y:470},
{id:'exit',name:'Escort animals / deliver packet',short:'SERVICE EXIT',x:1100,y:460},
{id:'briefing',name:'Pick up briefing packet',short:'BRIEFING DESK',x:305,y:565},
{id:'sign',name:'Correct the directions',short:'VANCE’S SIGN',x:610,y:360},
{id:'broadcast',name:'Start the 30-second broadcast',short:'GO LIVE',x:590,y:650},
{id:'soldiers',name:'Set out toy soldiers',short:'TOY SOLDIERS',x:170,y:190},
{id:'couch',name:'Fluff the cozy couch',short:'COZY COUCH',x:790,y:160},
{id:'roadkill',name:'Present the roadkill',short:'ROADKILL',x:920,y:670}];
export const at=id=>stations.find(s=>s.id===id);
export function say(g,text,type='quip',who){if(text)g.event=text;g.eventId++;g.events.push(who?{id:g.eventId,type,text,who}:{id:g.eventId,type,text});if(g.events.length>24)g.events.shift();}
// Separate streams keep Trump's seeded behaviour identical when the cast draws numbers too.
export const rand=(g,stream='rng')=>{g[stream]=(Math.imul(1664525,g[stream])+1013904223)>>>0;return g[stream]/4294967296;};
export function moveToward(p,x,y,speed,dt){const d=Math.hypot(x-p.x,y-p.y);if(d<4)return true;const step=Math.min(d,speed*dt);p.x+=(x-p.x)/d*step;p.y+=(y-p.y)/d*step;return false;}
export function canDamage(g,culprit){return g.damageCooldown<=0&&[...g.deliveries,...roomJobs.map(j=>g.tasks[j.id])].filter(d=>d.displacedBy).length<(g.tier?.maxLoose??2)&&![...g.deliveries,...roomJobs.map(j=>g.tasks[j.id])].some(d=>d.displacedBy===culprit);}
export function knockLoose(g,id,culprit){const d=g.deliveries.find(d=>d.id===id);if(!d?.done||!canDamage(g,culprit))return false;d.done=false;d.displacedBy=culprit;d.x=d.target.x+45;d.y=d.target.y+38;g.tasks[d.target.id].done=false;g.damageCooldown=g.tier?.damageSpacing??12;g.stats&&g.stats.damages++;say(g,(culpritLine[culprit]||culprit.toUpperCase()+': unauthorized redesign. ')+d.label+' knocked loose! E to recover and re-deliver it.','damage');return true;}
export function sabotageTargets(g){return [...g.deliveries.filter(d=>d.done),...roomJobs.filter(j=>g.tasks[j.id].done).map(j=>({id:j.id,label:j.label,target:at(j.id),done:true,roomJob:true}))];}
export function undoRoomJob(g,id,culprit){const job=roomJobs.find(j=>j.id===id),state=g.tasks[id];if(!job||!state.done||!canDamage(g,culprit))return false;Object.assign(state,{done:false,progress:0,stage:0,displacedBy:culprit});g.damageCooldown=g.tier?.damageSpacing??12;g.stats&&g.stats.damages++;say(g,(culpritLine[culprit]||'')+job.label+' disrupted! Hold E at its station to repair it.','damage');return true;}
export function damageTarget(g,id,culprit){return roomJobs.some(j=>j.id===id)?undoRoomJob(g,id,culprit):knockLoose(g,id,culprit);}
const culpritLine={trump:'TRUMP: “I improved it.” ',hegseth:'HEGSETH: posted it to the group chat. ',rfk:'RFK JR: “Too processed.” ',raccoon:'RACCOON: unauthorized redesign. ',goose:'GOOSE: unauthorized redesign. '};
