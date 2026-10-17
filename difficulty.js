// Difficulty tiers are plain data so a game state stays cloneable and every seed replays exactly.
export const TIERS={
 firstDay:{id:'firstDay',label:'First Day',blurb:'Everyone is on their best behaviour. Mostly.',
  trumpSpeed:105,trumpTamper:4,animalTamper:5,damageSpacing:12,maxLoose:2,
  schemeGap:26,telegraphGap:8,maxScheming:1,castAct:4,maxPuddles:1,vanceFlips:1,livePushups:['rfk'],pushupSeconds:6,multiplier:1},
 secondTerm:{id:'secondTerm',label:'Second Term',blurb:'They have learned where the props live.',
  trumpSpeed:120,trumpTamper:3.5,animalTamper:4.5,damageSpacing:10,maxLoose:2,
  schemeGap:14,telegraphGap:5,maxScheming:1,castAct:3.2,maxPuddles:1,vanceFlips:2,livePushups:['rfk'],pushupSeconds:10,multiplier:1.5},
 fourthTerm:{id:'fourthTerm',label:'Fourth Term',blurb:'Constitutionally questionable. Logistically worse.',
  trumpSpeed:140,trumpTamper:3,animalTamper:4,damageSpacing:8,maxLoose:3,
  schemeGap:12,telegraphGap:4,maxScheming:2,castAct:3,maxPuddles:2,vanceFlips:3,livePushups:['rfk','hegs'],pushupSeconds:99,multiplier:2.2}};
export const DEFAULT_TIER='firstDay';
export const tierConfig=id=>({...(TIERS[id]||TIERS[DEFAULT_TIER]),livePushups:[...(TIERS[id]||TIERS[DEFAULT_TIER]).livePushups]});
