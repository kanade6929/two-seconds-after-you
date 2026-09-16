// Input-only solvers. All operations travel through Game.update / public actions.
const {STEP,Follower,Game,Rules:R}=require('../core.js');
function driver(index,checkpoint){const g=new Game(index,checkpoint),f=new Follower(g.point);return {g,f,
 move(p,seconds=1.8,down=false){for(let i=0;i<Math.round(seconds/STEP)&&!g.won;i++){g.update(STEP,f.update(STEP,{...p,down}));if(g.blocked)f.reset(g.point);}},
 until(predicate,p,limit=8,down=false){for(let i=0;i<limit/STEP&&!predicate();i++)this.move(p,STEP,down);if(!predicate())throw Error('timeout '+g.level.id+': '+g.status());},
 click(){g.update(0,{...g.point,down:true},true);},tap(p){this.move(p);this.click();this.move(p,.04);},
 pin(p){this.tap(p);this.move(p,2.1);},release(){g.release();},undo(){g.undo();}
};}
function solvePuzzle(d,index){const g=d.g;
 if(index===0){d.pin(g.level.seal);d.move(g.level.exit,12);d.click();}
 if(index===1){const m=R.magicLayout();for(let i=0;i<2;i++)while(g.state.orientations[i]!==1)d.tap(m.mirrors[i]);d.pin(m.source);d.move(m.receiver,12);d.click();}
 if(index===2){d.release();d.pin(R.mirrorPoint(R.loversSeals[0]));d.move(R.mirrorPoint(R.loversSeals[1]),12);}
 if(index===3){
  // Breadth-first plan from actual conserved water, useful after undo/refresh.
  const queue=[{water:g.state.water,steps:[]}],seen=new Set();
  for(let h=0;h<queue.length;h++){const {water,steps}=queue[h],key=water.join();if(seen.has(key))continue;seen.add(key);
   if(water[0]===4&&water[1]===4){for(const [a,b]of steps){d.release();d.pin(R.cups[a]);d.move(R.cups[b],4);d.click();}break;}
   for(let a=0;a<3;a++)for(let b=0;b<3;b++){const next=R.pour(water,a,b);if(next)queue.push({water:next,steps:[...steps,[a,b]]});}
  }
 }
 if(index===4){d.release();d.pin(R.starVertices[0]);for(const i of [1,2,3,1,4,3,0,4]){d.move(R.starVertices[i],4);d.click();}}
 if(index===5){d.pin(R.moonWell);d.move(R.moonOptions[R.moonAnswer],12);d.click();}
 if(index===6){for(let i=0;i<3;i++)if(!!(g.state.mask&(1<<i))!==(i<2))d.tap(R.sunKeys[i]);d.release();d.pin(R.sunSource);}
 if(index===7){for(let i=1;i<4;i++){const n=(i-g.state.turns[i]+4)%4;if(!n)continue;d.release();d.pin(R.worldVertices[0]);for(let j=0;j<n;j++)d.tap(R.worldVertices[i]);}}
 return g;
}
function solve(d,index){solvePuzzle(d,index);if(!d.g.won)throw Error('not complete '+index+' '+d.g.status());return d.g;}
module.exports={driver,solve,solvePuzzle};
