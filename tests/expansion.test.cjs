'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Game,STEP,LEVELS,readProgress}=require('../core.js');
const {driver,solve}=require('./routes.cjs');
for(let i=0;i<8;i++)test('chapter '+(i+1)+' solvable with real eased pointer input: '+LEVELS[i].title,()=>{assert.equal(solve(driver(i),i).won,true);});
test('swap needs both directional phases, one stationary pair is insufficient',()=>{
 const d=driver(1),s=d.g.level.switches;d.move(s[0]);d.move(s[1],4);assert.equal(d.g.phase,1);assert.equal(d.g.open,false);
 d.move(s[0],2.5);assert.equal(d.g.phase,2);assert.equal(d.g.open,true);
});
test('closed gate blocks direct clicks and offscreen tunneling; echo opens center only',()=>{
 const d=driver(2),g=d.g;d.move(g.level.exit,1);assert.ok(g.point.x<610);assert.equal(g.latched,false);
 d.move({x:1100,y:-400},.5);assert.ok(g.point.x<610);assert.equal(g.won,false);
 d.move(g.level.switches[0],1);d.move({x:570,y:350},1.2);assert.equal(g.gateOpen,true);
 d.move({x:560,y:40},.25);d.move({x:900,y:40},.25);assert.ok(g.point.x<610);
});
test('gate full solution opens by echo, not by current light',()=>{
 const g=new Game(2);g.update(STEP,g.level.switches[0]);assert.equal(g.gateOpen,false);
 assert.equal(solve(driver(2),2).won,true);
});
test('code ignores occupancy; wrong echoed click resets; correct input is delayed two seconds',()=>{
 const d=driver(3),g=d.g,s=g.level.switches;for(const p of s)d.move(p,2.5);assert.equal(g.phase,0);
 d.tap(s[1]);assert.equal(g.phase,0);d.move({x:1000,y:540},2.1);assert.equal(g.phase,1);
 d.tap(s[2]);d.move({x:1000,y:540},2.1);assert.equal(g.phase,0);assert.ok(g.codeError>0);
 for(const i of g.level.code)d.tap(s[i]);d.move(g.level.exit,2.2);d.exit();assert.equal(g.won,true);
});
test('moving receiver requires tracking; rhythmic exit rejects off-beat clicks',()=>{
 const d=driver(4),g=d.g;d.move(g.level.switches[1],1.05);d.track(2.3);assert.equal(g.latched,true);
 d.move(g.level.exit,.4);while(g.open)d.move(g.level.exit,STEP);
 g.update(STEP,g.point,true);assert.equal(g.won,false);d.exit();assert.equal(g.won,true);
});
test('reservoir does not accept a full single lamp or overfilled values',()=>{
 const d=driver(5),g=d.g;d.move(g.level.switches[0],2);assert.equal(g.open,false);assert.equal(g.energy[0],1);
 const before=g.energy[0];d.move({x:50,y:600},.3);assert.ok(g.energy[0]<=before);assert.equal(g.latched,false);
 assert.equal(solve(driver(5),5).won,true);
});
test('beam ignores point visits without anchored echo and enforces crystal order',()=>{
 const d=driver(6),g=d.g;for(const p of g.level.targets)d.move(p,1);assert.equal(g.crystal,0);
 const anchor=g.level.switches[0],target=g.level.targets[2];d.move(anchor,1.1);
 d.move({x:anchor.x+(target.x-anchor.x)*1.7,y:anchor.y+(target.y-anchor.y)*1.7},2.2);
 assert.equal(g.crystal,0);assert.equal(g.latched,false);
});
test('finale cannot skip code by playing beam first',()=>{
 const d=driver(7),g=d.g,anchor=g.level.switches[2],target=g.level.targets[0];d.move(anchor,1.1);
 d.move({x:anchor.x+(target.x-anchor.x)*1.7,y:anchor.y+(target.y-anchor.y)*1.7},2.2);
 assert.equal(g.codeDone,false);assert.equal(g.crystal,0);assert.equal(g.open,false);
});
test('progress keeps old unlocks while changing all eight puzzle rules',()=>{
 assert.equal(LEVELS.length,8);assert.equal(new Set(LEVELS.map(l=>l.rule)).size,8);
 assert.deepEqual(readProgress({unlocked:2,completed:[0,1,2]}),{unlocked:3,completed:[0,1,2],current:3,started:true});
 assert.equal(readProgress({unlocked:999,current:999,completed:[7,7,-1,'2']}).unlocked,7);
 assert.deepEqual(readProgress(null),{unlocked:0,completed:[],current:0,started:false});
});
test('arcana code names agree across switch labels, hints, descriptions, and status',()=>{
 assert.equal(new Set(LEVELS.map(l=>l.arcana)).size,8);
 for(const index of [3,7]){
  const g=new Game(index),l=g.level;
  assert.doesNotMatch(JSON.stringify(l),/[甲乙丙]/);
  for(const n of l.code){
   const s=l.switches[n];assert.ok(s.name);assert.ok(s.label.includes(s.name));
   assert.ok(l.hint.includes(s.name));assert.ok(l.description.includes(s.name));assert.ok(g.status().includes(s.name));
  }
 }
});
