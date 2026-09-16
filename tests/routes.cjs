// Reusable human-like input routes: no mutation of game progression state.
const {STEP,LEVELS,Follower,Game}=require('../core.js');
function driver(index){
  const g=new Game(index),f=new Follower(g.point);
  return {g,move(p,seconds=.75){for(let i=0;i<Math.round(seconds/STEP);i++){g.update(STEP,f.update(STEP,p));if(g.blocked)f.reset(g.point);}},
    tap(p){this.move(p,.32);g.update(STEP,f.update(STEP,p),true);this.move(p,.05);},
    track(seconds){for(let i=0;i<Math.round(seconds/STEP);i++)g.update(STEP,f.update(STEP,g.switchPositions(g.t+STEP)[0]));},
    exit(){this.move(g.level.exit,.4);for(let i=0;i<1200&&!g.won;i++){g.update(STEP,f.update(STEP,g.level.exit),true);}}};
}
function solve(d,index){
  const l=LEVELS[index],at=(i,s=.8)=>d.move(l.switches[i],s);
  if(index===0){at(0);d.move(l.exit,1.7);}
  if(index===1){at(0);at(1,2.1);at(0,2.1);}
  if(index===2){at(0,.9);d.move({x:570,y:350},1.25);d.move(l.exit,.6);}
  if(index===3){for(const i of l.code)d.tap(l.switches[i]);d.move(l.exit,2.2);}
  if(index===4){at(1,1.05);d.track(2.3);}
  if(index===5){at(0,.75);at(1,.7);at(2,.75);d.move(l.exit,2.5);}
  if(index===6||index===7){
    if(index===7){for(const i of l.code)d.tap(l.switches[i]);d.move({x:1050,y:550},2.2);}
    const anchor=l.switches[index===6?0:2];
    for(const target of l.targets){
      d.move(anchor,1.1);
      d.move({x:anchor.x+(target.x-anchor.x)*1.7,y:anchor.y+(target.y-anchor.y)*1.7},2.15);
    }
  }
  d.exit();return d.g;
}
module.exports={driver,solve};
