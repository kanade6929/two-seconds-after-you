// Input-only solvers. All operations travel through Game.update / public actions.
const {STEP,Follower,Game,Rules:R}=require('../core.js');
function driver(index,checkpoint){const g=new Game(index,checkpoint),f=new Follower(g.point);return {g,f,
 move(p,seconds=1.8,down=false){if(!Number.isFinite(p?.x)||!Number.isFinite(p?.y))throw Error('invalid route point');for(let i=0;i<Math.round(seconds/STEP)&&!g.won;i++){g.update(STEP,f.update(STEP,{...p,down}));if(g.blocked)f.reset(g.point);}},
 until(predicate,p,limit=8,down=false){for(let i=0;i<limit/STEP&&!predicate();i++)this.move(p,STEP,down);if(!predicate())throw Error('timeout '+g.level.id+': '+g.status());},
 click(){g.update(0,{...g.point,down:true},true);},tap(p){this.move(p);this.click();this.move(p,.04);},
 pin(p){this.tap(p);this.move(p,2.1);},release(){g.release();},undo(){g.undo();}
};}
function solvePuzzle(d,index){const g=d.g;
 if(index===0){d.move(g.level.seal,3.2);d.move(g.level.exit,1.35);d.click();}
 if(index===1){const m=R.magicLayout();for(let i=0;i<2;i++)while(g.state.orientations[i]!==1)d.tap(m.mirrors[i]);d.move(m.source,3.2);d.move(m.receiver,1.4);d.click();}
 if(index===2){d.move(R.mirrorPoint(R.loversSeals[0]),3.2);d.move(R.mirrorPoint(R.loversSeals[1]),1.9);}
 if(index===3){d.release();d.until(()=>g.effect.forecast>=55,R.spring);d.move(R.rest,5);}
 if(index===4){d.move(R.starLeft[2],3.2);d.move(R.starRight[0],1.9);}
 if(index===5){d.move(R.moonWell,3.2);d.move(R.moonOptions[R.moonAnswer],1.2);d.click();}
 if(index===6){d.move(R.sunPads[1],3.2);d.move(R.sunPads[2],1.9);}
 if(index===7){for(let i=g.state.links;i<4;i++){d.move(R.worldVertices[i],3.2);d.until(()=>g.won||g.state.links>i,R.worldVertices[(i+1)%4],2.1);}}
 return g;
}
function solve(d,index){solvePuzzle(d,index);if(!d.g.won)throw Error('not complete '+index+' '+d.g.status());return d.g;}
module.exports={driver,solve,solvePuzzle};
