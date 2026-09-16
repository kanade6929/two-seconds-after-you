// Real follower paths only; never assign phase, power, echo or won state.
const {STEP,Follower,Game,Rules:R}=require('../core.js');
function driver(index,checkpoint){const g=new Game(index,checkpoint),f=new Follower(g.point);return {g,f,
 move(p,seconds=1.6,down=false){for(let i=0;i<Math.round(seconds/STEP)&&!g.won;i++){if(g.transition){g.update(STEP,g.point);f.reset(g.point);i--;continue;}g.update(STEP,f.update(STEP,{...p,down}));if(g.blocked)f.reset(g.point);}},
 until(predicate,p,limit=8,down=false){for(let i=0;i<limit/STEP&&!predicate();i++)this.move(p,STEP,down);if(!predicate())throw Error(`timeout ${g.level.id}: ${g.status()} phase=${g.state.phase} energy=${g.state.energy}`);},
 click(){g.update(0,{...g.point,down:true},true);},
 tap(p){this.move(p,1.4);this.click();this.move(p,.03);}
};}
function solvePuzzle(d,index){const g=d.g;
 if(index===0){d.move(g.level.seal,3);d.until(()=>g.open,g.level.exit);d.click();}
 if(index===1)for(let phase=g.state.phase;phase<3;phase++){
  const m=R.magicLayout(phase),angles=[[0,1],[1,1],[2,2]][phase];
  for(let i=0;i<2;i++)for(let n=0;n<angles[i];n++)d.tap(m.mirrors[i]);
  d.move(m.source,3);d.until(()=>g.open,m.receiver);d.click();
 }
 if(index===2)for(let phase=g.state.phase;phase<3;phase++){const [past,now]=R.loversPairs[phase];d.move(past,2.6,true);d.move(now,.9);d.until(()=>g.state.phase>phase||g.won,now,4,true);}
 if(index===3)for(let phase=g.state.phase;phase<2;phase++){d.move(R.balancePads[phase===0?2:1],3);d.until(()=>g.state.phase>phase||g.won,R.balancePads[phase===0?4:5]);}
 if(index===4)for(let phase=g.state.phase;phase<4;phase++){const m=R.starLayout(phase);d.move(m.reversed?m.b:m.a,3);d.until(()=>g.open,m.reversed?m.a:m.b);d.click();}
 if(index===5)for(let phase=g.state.phase;phase<3;phase++){
  d.move(R.moonWell,3);
  for(let seq=0;seq<2;seq++){const p=R.moonOptions[R.moonMaps[phase].indexOf(R.moonTargets[phase][seq])];d.until(()=>g.open,p);d.click();}
 }
 if(index===6)for(let phase=g.state.phase;phase<3;phase++){
  const m=R.sunLayout(phase);d.move({x:780,y:490},2);d.move({x:400,y:490},2);d.move(m.pads[0],3);
  const y=phase===1?408:322;d.move({x:565,y},.45);d.move({x:635,y},.35);d.move(m.pads[1],.5);d.until(()=>g.state.phase>phase||g.won,m.pads[1],3,phase===2);
 }
 if(index===7){for(let i=1;i<4;i++){let turns=(i-g.state.turns[i]+4)%4;if(!turns)continue;d.move(R.worldVertices[0],3);for(let n=0;n<turns;n++){d.until(()=>g.open,R.worldVertices[i]);d.click();}}}
 return g;
}
function solve(d,index){solvePuzzle(d,index);if(!d.g.won)throw Error(`not complete ${index} phase=${d.g.state.phase}`);return d.g;}
module.exports={driver,solve,solvePuzzle};
