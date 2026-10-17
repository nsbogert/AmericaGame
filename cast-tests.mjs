import assert from 'node:assert/strict';
import{createGame,tick,stations,interact,distract,prompt}from'./sim.js';
import{TIERS,tierConfig}from'./difficulty.js';
import{playerSlow,schemingCount}from'./cast.js';
import{scoreShift,SAVE_CAP}from'./score.js';
import{play}from'./tools/autopilot.mjs';

const S=id=>stations.find(s=>s.id===id);
const advance=(g,t,input={})=>{for(let n=0;n<Math.ceil(t/.05);n++)tick(g,.05,input);};
const press=g=>{tick(g,.05,{work:true});tick(g,.05,{});};
const warp=(g,p)=>{g.player.x=p.x;g.player.y=p.y;};
const finishJob=(g,id)=>{g.tasks[id].done=true;g.tasks[id].stage=9;};
const bench=g=>{for(const m of Object.values(g.cast)){m.next=1e9;m.thankCd=1e9;m.shoveCd=1e9;}return g;};
const freezeTrump=g=>{g.trump.phase='distracted';g.distraction=1e9;g.trump.target='applause';};

// Hard gate: an attentive player can win every tier.
for(const tier of Object.keys(TIERS))for(const seed of[1,7,23,99]){
 const g=play(seed,tier,'expert');
 assert.equal(g.mode,'won',`${tier} seed ${seed}: ${g.lossReason}`);
 assert.deepEqual(play(seed,tier,'expert').elapsed,g.elapsed,'autopilot replays deterministically');
}

// Tier data reaches the rules and stays plain data.
{const g=createGame(180,3,'fourthTerm');assert.equal(g.tier.maxLoose,3);assert.deepEqual(structuredClone(g.tier),g.tier);
 assert.equal(createGame(180,3,'nonsense').tier.id,'firstDay');assert.notEqual(tierConfig('firstDay').livePushups,tierConfig('firstDay').livePushups);}

// Same seed, same shift: full state matches with the whole cast running.
{const a=createGame(180,42,'fourthTerm'),b=createGame(180,42,'fourthTerm');for(const g of[a,b])advance(g,120,{right:true});assert.deepEqual(a,b);}

// Saves: a setup-phase speech interrupted by applause is not a save (no farming); a live one is.
{const g=bench(createGame(180,12));g.trump.phase='talking';distract(g,'applause');assert.equal(g.stats.saves,0);g.cooldown=0;g.show.phase='live';g.trump.phase='talking';distract(g,'applause');assert.equal(g.stats.saves,1);}

// Luring Vance off you starts his thank-you cooldown, so he can't re-latch the moment the couch wears off.
{const g=bench(createGame(180,13));const v=g.cast.vance;v.phase='latched';g.latch='vance';v.thankCd=0;distract(g,'couch');assert.equal(g.latch,null);assert(v.thankCd>0);}

// The cast draws from its own stream, so Trump's seeded schedule is identical with or without cast activity.
{const a=createGame(180,5),b=bench(createGame(180,5));advance(a,40);advance(b,40);assert.equal(a.rng,b.rng);}

// Hegseth: telegraph → approach → countdown → undoes a finished job; shoo during the countdown is a save.
{const g=createGame(180,2);freezeTrump(g);finishJob(g,'cards');const h=g.cast.hegs;h.next=0;
 advance(g,.1);assert.equal(h.phase,'noticing');assert.equal(h.scheme.id,'cards');assert(g.castWarnings.some(w=>w.who==='hegs'&&w.stationId==='cards'));
 for(let i=0;i<400&&h.phase!=='acting';i++)tick(g,.05,{});assert.equal(h.phase,'acting');
 warp(g,h);assert.match(prompt(g),/SHOO HEGSETH/);press(g);assert.equal(h.phase,'wander');assert.equal(g.stats.saves,1);assert(g.tasks.cards.done);
 h.next=0;g.castDirector=0;for(let i=0;i<600&&g.tasks.cards.done;i++)tick(g,.05,{});
 assert.equal(g.tasks.cards.done,false);assert.equal(g.tasks.cards.displacedBy,'hegseth');assert.equal(g.stats.damages,1);}

// Lures: walking to a lure station and pressing E sends that character away and recharges.
{const g=createGame(180,4);freezeTrump(g);finishJob(g,'flags');const h=g.cast.hegs;h.next=0;advance(g,.1);assert.equal(h.phase,'noticing');
 warp(g,S('soldiers'));assert.match(prompt(g),/TOY SOLDIERS · lure HEGSETH/);press(g);assert.equal(h.phase,'lured-approach');assert(g.lureCooldowns.soldiers>0);
 assert.match(prompt(g),/recharges/);press(g);assert.equal(h.phase,'lured-approach','recharging lure does nothing');
 advance(g,20);assert.equal(h.phase,'wander');assert(distract(g,'couch'));assert.equal(g.cast.vance.phase,'lured-approach');
 // Applause/ribbon keep their existing contract.
 assert(distract(g,'applause'));assert(g.cooldown>0);assert.equal(g.trump.phase,'distracted-approach');}

// Director: at most tier.maxScheming threats at once (Trump's sabotage counts).
for(const tier of Object.keys(TIERS)){const g=createGame(180,9,tier);for(const id of['cards','flags','teleprompter'])finishJob(g,id);g.deliveries.forEach(d=>{d.done=true;});
 let peak=0;for(let i=0;i<2400;i++){tick(g,.05,{});peak=Math.max(peak,schemingCount(g));}
 assert(peak<=g.tier.maxScheming,`${tier} peak ${peak} (Trump included)`);}

// RFK: raw milk halves walking speed; slows never stack and dashing ignores them.
{const g=bench(createGame(180,6));freezeTrump(g);g.puddles.push({x:g.player.x,y:g.player.y,r:50,t:20});assert.equal(playerSlow(g),.5);g.latch='vance';assert.equal(playerSlow(g),.4);
 g.latch=null;const x=g.player.x;tick(g,.1,{right:true});assert.equal(Math.round(g.player.x-x),Math.round(270*.5*.1));
 const x2=g.player.x;tick(g,.1,{dash:true,right:true});assert(g.player.x-x2>60,'dash ignores slow');advance(g,25);assert.equal(g.puddles.length,0);}

// Vance: latches, slows you, E thanks him (only when no station is in reach); flips swap two undelivered targets.
{const g=bench(createGame(180,8));freezeTrump(g);g.elapsed=20;const v=g.cast.vance;v.thankCd=0;warp(g,{x:700,y:450});v.x=705;v.y=450;tick(g,.05,{});
 assert.equal(v.phase,'latched');assert.equal(g.latch,'vance');assert.match(prompt(g),/thank you/);press(g);assert.equal(g.latch,null);assert.equal(g.stats.thanks,1);assert.equal(v.phase,'wander');
 const [a,b]=g.deliveries,ta=a.target.id,tb=b.target.id;v.flipsLeft=1;v.next=0;g.castDirector=0;for(let i=0;i<600&&v.flipsLeft;i++)tick(g,.05,{});
 assert.equal(a.target.id,tb);assert.equal(b.target.id,ta);assert.equal(g.vance.phase,'active');}

// Hegseth shoves on contact but never makes you drop what you carry.
{const g=bench(createGame(180,10));freezeTrump(g);const h=g.cast.hegs;h.shoveCd=0;g.carry='chairs';warp(g,{x:500,y:400});h.x=510;h.y=400;h.wp=0;tick(g,.05,{});
 assert(Math.hypot(g.player.x-500,g.player.y-400)>30);assert.equal(g.carry,'chairs');}

// Live push-ups block clean footage until they time out (easier tiers) or are countered.
for(const [tier,expectEnd]of[['firstDay',true],['fourthTerm',false]]){const g=createGame(180,11,tier);freezeTrump(g);for(const d of g.deliveries)d.done=true;for(const id of['cards','flags','teleprompter'])finishJob(g,id);
 g.lunch.triggered=g.briefing.triggered=true;g.show.phase='live';g.show.time=30;g.micOn=true;advance(g,9);const r=g.cast.rfk;
 for(let i=0;i<200&&r.phase!=='pushups';i++)tick(g,.05,{});assert.equal(r.phase,'pushups');const before=g.show.progress;advance(g,1);assert.equal(g.show.progress,before,'push-ups block the shot');
 advance(g,6.5);assert.equal(r.phase!=='pushups',expectEnd,tier);}

// Ratings: deterministic, saves capped, never negative, loss is CANCELLED.
{const g=createGame(180,1,'secondTerm');g.mode='won';g.show.progress=20;g.patience=80;g.stats={saves:20,damages:0,catches:0,thanks:0,liveAt:90};
 const s=scoreShift(g);assert.deepEqual(scoreShift(g),s);assert.equal(s.base,2000+720+SAVE_CAP*150+800);assert.equal(s.points,Math.round(s.base*1.5));assert.equal(s.grade,'A');
 g.stats.damages=40;assert.equal(scoreShift(g).points,0);g.mode='lost';assert.equal(scoreShift(g).grade,'CANCELLED');}

console.log('PASS: every tier winnable by routed play (4 seeds), deterministic autopilot, tier plumbing, separate cast RNG, Hegseth leak/shoo/save/damage, lures + recharge + applause contract, scheme director cap, milk slow (non-stacking, dash exempt), Vance latch/thanks/flip, shove keeps carry, live push-ups by tier, ratings.');
