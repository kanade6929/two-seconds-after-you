// Human-like input only. Never assign puzzle progression to solve a level.
const {STEP,Follower,Game,Rules:R}=require('../core.js');
function driver(index,checkpoint){const g=new Game(index,checkpoint),f=new Follower(g.point);return {g,f,
 move(p,seconds=1.6,down=false){for(let i=0;i<Math.round(seconds/STEP);i++){g.update(STEP,f.update(STEP,{...p,down}));if(g.blocked)f.reset(g.point);}},
 until(predicate,p,limit=8,down=false){for(let i=0;i<limit/STEP&&!predicate();i++)this.move(p,STEP,down);if(!predicate())throw Error(`timeout ${g.level.id}: ${g.status()} phase=${g.state.phase} energy=${g.state.energy}`);},
 tap(p){this.move(p,1.6);g.update(STEP,f.update(STEP,{...p,down:true}),true);this.move(p,.03);},
 exit(){for(let n=0;n<3&&!g.won;n++){this.move(g.level.seal,3);this.move(g.level.exit,1.4);g.update(STEP,f.update(STEP,{...g.level.exit,down:true}),true);}}};}
function solvePuzzle(d,index){const g=d.g;
 if(index===0)d.move(g.level.seal,1.8);
 if(index===1)for(let phase=0;phase<2;phase++){const m=R.magicLayout(phase);if(phase===1)d.tap(m.mirrors[0]);d.tap(m.mirrors[1]);d.move(m.source,3);d.until(()=>g.state.phase>phase,m.source);}
 if(index===2)for(let phase=0;phase<3;phase++){const [past,now]=R.loversPairs[phase];d.move(past,2.3);d.until(()=>g.state.phase>phase,now);}
 if(index===3)for(let attempt=0;attempt<5&&!g.ready;attempt++){
  const left={x:440,y:365},right={x:740,y:365},over=g.state.energy>.5,past=over?right:left,now=over?left:right;
  d.move(past,3);d.until(()=>g.effect.settled||g.ready,now);if(g.ready)break;
  let guard=0;while(!g.ready&&g.effect.settled&&Math.abs(g.state.energy-.5)>.009&&guard++<400)d.move(now,STEP,true);
  d.move(now,.75);
 }
 if(index===4)for(let phase=0;phase<3;phase++){const [i,j]=R.starPairs[phase];d.move(R.starLeft[i],3);d.until(()=>g.state.phase>phase,R.starRight[j]);}
 if(index===5)for(let phase=0;phase<3;phase++){d.move(R.moonWell,3);const p=R.moonOptions[R.moonMaps[phase].indexOf(R.moonTargets[phase])];d.move(p,1.3);g.update(STEP,{...d.f,down:true},true);d.move(p,.05);}
 if(index===6)for(let phase=0;phase<2;phase++){
  const m=R.sunLayout(phase);d.move({x:780,y:540},2);d.move({x:400,y:540},2);d.move(m.pads[0],3);
  const y=phase===0?322:408;
  d.move({x:565,y},.45);d.move({x:635,y},.35);d.move(m.pads[1],.5);
  d.until(()=>g.state.phase>phase,m.pads[1],3);
 }
 if(index===7){d.move(R.worldVertices[0],2);d.until(()=>g.state.attempt!==null,R.worldVertices[0]);for(let i=0;i<1400&&!g.ready;i++){const age=g.t-g.state.attempt;d.move(R.worldPoint(age+.11),STEP);}}
 return g;
}
function solve(d,index){solvePuzzle(d,index);if(!d.g.ready)throw Error(`puzzle not ready ${index} ${d.g.state.phase}`);d.exit();return d.g;}
module.exports={driver,solve,solvePuzzle};
