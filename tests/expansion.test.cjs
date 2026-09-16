'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Game,STEP,LEVELS,Rules:R}=require('../core.js');const {driver,solve}=require('./routes.cjs');
for(let i=0;i<8;i++)test('real limited-speed input solves integrated '+LEVELS[i].title,()=>{const g=solve(driver(i),i);assert.equal(g.won,true);assert.ok(Number.isFinite(g.winOrigin.x));assert.equal(g.state.phase,LEVELS[i].phases-1);});
test('every stable stage can be resumed and solved without a detached final gate',()=>{for(let i=0;i<8;i++)for(let phase=1;phase<LEVELS[i].phases;phase++){const g=solve(driver(i,{phase}),i);assert.equal(g.won,true);}for(const l of LEVELS.slice(1)){assert.equal(l.seal,undefined);assert.equal(l.exit,undefined);assert.equal(l.hint.length,2);}});
test('fast sweeps and serial single-point visits cannot solve later puzzles',()=>{for(let i=1;i<8;i++){const d=driver(i);for(let n=0;n<80;n++)d.move({x:n%2?1100:100,y:250+n%3*120},.03);assert.equal(d.g.state.phase,0,LEVELS[i].title);assert.equal(d.g.won,false);}});
test('octagonal acquisition matches the drawn edge and spatial release has no time grace',()=>{
 const g=new Game(),center={x:600,y:350};
 for(let n=0;n<8;n++){const a=Math.PI/8+n*Math.PI/4,p={x:center.x+39.9*Math.cos(a),y:center.y+39.9*Math.sin(a)};assert.equal(R.occupy(g,'test',p,center),true);}
 assert.equal(R.occupy(g,'test',{x:640,y:350},center),true);assert.equal(R.occupy(g,'test',{x:646,y:350},center),false);
 assert.equal(R.occupy(g,'new',{x:640,y:350},center),false);assert.equal(R.occupy(g,'test',null,center),false);
});
test('stamp movement is stable throughout the visual interior without changing recorded positions',()=>{
 const d=driver(0),g=d.g,c=g.level.seal;d.move(c,3);
 for(let n=0;n<360;n++){const a=n*.025,p={x:c.x+34*Math.cos(a),y:c.y+34*Math.sin(a)};d.move(p,STEP);if(n>240)assert.equal(g.contacts.lampEcho,true);}
 assert.ok(Math.hypot(g.point.x-c.x,g.point.y-c.y)>20);assert.ok(g.timeline.samples.some(p=>Math.abs(p.x-c.x)>20));
});
test('magician keeps source, actual two-mirror beam and receiving endpoint necessary until click',()=>{
 for(const [phase,pair]of [[0,[0,1]],[1,[1,1]],[2,[2,2]]])assert.equal(R.traceMagic(phase,pair).hit,true);
 for(const pair of [[1,0],[2,2],[0,0]])assert.equal(R.traceMagic(0,pair).hit,false);
 const d=driver(1),g=d.g,m=R.magicLayout(0);d.tap(m.mirrors[1]);d.move(m.source,5);assert.equal(g.state.phase,0);assert.equal(g.open,false);
 d.until(()=>g.open,m.receiver);assert.equal(g.view.clickable,true);d.move(m.receiver,2.2);assert.equal(g.open,false);assert.equal(g.view.clickable,false);d.click();assert.equal(g.state.phase,0);
});
test('lovers need mirrored roles and simultaneous recorded press, not pixel matching',()=>{
 const d=driver(2),g=d.g,[past,now]=R.loversPairs[0];d.move({x:600,y:350},4,true);assert.equal(g.state.phase,0);
 d.move(past,3);d.move(now,1.5,true);assert.equal(g.state.phase,0);
 d.move({x:past.x+25,y:past.y-20},3,true);d.move({x:now.x+20,y:now.y+20},.9);d.until(()=>g.state.phase===1,{x:now.x+20,y:now.y+20},4,true);
 assert.equal(g.echo,null);assert.equal(g.timeline.samples.length,1);assert.equal(g.point.down,true);assert.deepEqual(g.contacts,{});
});
test('temperance compares real opposing torques, not equal distances or single-role occupancy',()=>{
 const d=driver(3),g=d.g;d.move(R.balancePads[2],4);assert.equal(g.state.phase,0);d.move(R.balancePads[3],1.6);assert.equal(g.effect.opposite,true);assert.notEqual(g.effect.torque[0],g.effect.torque[1]);assert.equal(g.state.phase,0);
 d.move(R.balancePads[2],3);d.until(()=>g.state.phase===1,R.balancePads[4]);assert.equal(g.echo,null);
 d.move(R.balancePads[2],3);d.move(R.balancePads[4],1.6);assert.equal(g.state.phase,1);assert.equal(g.won,false);
 assert.equal(solve(driver(3),3).won,true);
});
test('each star map has a unique simultaneous chord, including reversed final roles',()=>{
 for(let phase=0;phase<4;phase++){const m=R.starLayout(phase);let good=0;for(const a of R.starLeft)for(const b of R.starRight)if(m.stars.every(s=>R.segmentDistance(s,a,b)<=12))good++;assert.equal(good,1);}
 const d=driver(4),g=d.g;d.move({x:415,y:395},3);d.until(()=>g.open,{x:735,y:338});assert.deepEqual(g.effect.chord,[R.starLeft[1],R.starRight[1]]);assert.equal(g.view.clickable,true);d.click();assert.equal(g.state.phase,1);
 const reversed=driver(4,{phase:3});reversed.move(R.starLeft[0],3);reversed.move(R.starRight[1],2);reversed.click();assert.equal(reversed.g.won,false);
});
test('moon requires two ordered true symbols during continuous reveal; wrong or expired reveal resets local order',()=>{
 const d=driver(5),g=d.g;d.tap(R.moonOptions[2]);assert.equal(g.state.sequence,0);d.move(R.moonWell,3);d.until(()=>g.open,R.moonOptions[2]);d.click();assert.equal(g.state.sequence,1);
 d.move(R.moonOptions[1],.5);d.click();assert.equal(g.state.phase,0);assert.equal(g.state.sequence,0);
 d.move(R.moonWell,3);d.until(()=>g.open,R.moonOptions[2]);d.click();d.move(R.moonOptions[2],2);assert.equal(g.state.sequence,0);assert.equal(g.view.clickable,false);
});
test('sun requires actual unobstructed stamp rays and cannot tunnel through walls',()=>{
 for(let phase=0;phase<3;phase++){const m=R.sunLayout(phase);assert.equal(R.sunVisibility(m.pads[0],0,m),true);assert.equal(R.sunVisibility(m.pads[0],1,m),false);assert.equal(R.sunVisibility(m.pads[1],1,m),true);}
 const g=new Game(6);g.update(STEP,{x:500,y:320});g.update(STEP,{x:590,y:320});assert.equal(g.blocked,true);assert.ok(g.point.x<530);
 const d=driver(6,{phase:2});d.move({x:450,y:495},3);d.move({x:750,y:495},2);assert.equal(d.g.won,false);assert.equal(d.g.effect.left,false);
});
test('world rotates two distinct occupied pieces and preserves the puzzle through safe checkpoints',()=>{
 const d=driver(7),g=d.g;d.move(R.worldVertices[0],4);d.click();assert.deepEqual(g.state.turns,R.worldInitial);assert.equal(g.won,false);
 d.until(()=>g.open,R.worldVertices[1]);d.click();assert.deepEqual(g.state.turns,[1,0,0,1]);
 d.click();assert.deepEqual(g.state.turns,[1,0,0,1]); // Cannot double-fire without a fresh settle.
 d.move({x:600,y:365},3);assert.deepEqual(g.state.turns,[1,0,0,1]);assert.equal(g.open,false);
 const save=g.checkpoint(),fresh=new Game(7,save);assert.deepEqual(fresh.state.turns,save.turns);assert.equal(fresh.echo,null);assert.equal(fresh.open,false);
 assert.equal(solve(driver(7,save),7).won,true);assert.deepEqual(R.worldRestore([0,0,0,0]),R.worldInitial);
});

test('stage fade freezes clock, replay and input without spending the cooperation window',()=>{
 const d=driver(0),g=d.g;d.until(()=>g.state.phase===1,g.level.seal);assert.ok(g.transition);
 const t=g.t,p={...g.point},samples=JSON.stringify(g.timeline.samples);g.update(.18,{x:1100,y:100},true);
 assert.equal(g.t,t);assert.deepEqual(g.point,p);assert.equal(JSON.stringify(g.timeline.samples),samples);assert.equal(g.won,false);
 assert.equal(g.transition.previous.state.phase,0);g.update(.3,p);assert.equal(g.transition,null);assert.equal(g.t,t);g.update(STEP,p);assert.ok(g.t>t);
});
test('old completed-stage checkpoints never restore temporary power or auto-complete new endings',()=>{for(let i=0;i<8;i++){const g=new Game(i,{phase:99,energy:.5});assert.equal(g.state.phase,LEVELS[i].phases-1);assert.equal(g.open,false);assert.equal(g.won,false);assert.equal(g.echo,null);assert.equal(g.state.sequence,0);}});
