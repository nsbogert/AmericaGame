// Prints win rate, spare time, damage and score per tier × player profile. `node tools/balance.mjs [seeds]`
import{play,PROFILES}from'./autopilot.mjs';
import{TIERS}from'../difficulty.js';
import{scoreShift}from'../score.js';
const N=Number(process.argv[2])||60;
const avg=a=>a.length?Math.round(a.reduce((x,y)=>x+y,0)/a.length):'-';
for(const tier of Object.keys(TIERS)){
 console.log(`\n${TIERS[tier].label}`);
 for(const name of Object.keys(PROFILES)){
  const wins=[],losses={},dmg=[],pat=[],grades={};
  for(let seed=1;seed<=N;seed++){
   const g=play(seed,tier,name),s=scoreShift(g);
   if(g.won)wins.push(g.remaining);else losses[g.lossReason]=(losses[g.lossReason]||0)+1;
   dmg.push(g.stats.damages);pat.push(g.patience);if(g.won)grades[s.grade]=(grades[s.grade]||0)+1;
  }
  console.log(` ${name.padEnd(9)} win ${String(wins.length).padStart(2)}/${N}  spare ${String(avg(wins)).padStart(3)}s  dmg ${(dmg.reduce((a,b)=>a+b,0)/N).toFixed(1)}  patience ${avg(pat)}  grades ${JSON.stringify(grades)}  ${Object.entries(losses).map(([k,v])=>`${v}× ${k}`).join(' | ')}`);
 }
}
