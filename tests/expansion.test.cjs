'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{Game,Rules:R,LEVELS}=require('../core.js'),{driver,solve}=require('./routes.cjs');
for(let i=0;i<8;i++)test('deliberate input with long pauses solves '+LEVELS[i].title,()=>{const g=solve(driver(i),i);assert.equal(g.won,true);assert.equal(g.level.phases,1);});
test('memory is explicit, arrives in two game seconds, persists, and releases immediately',()=>{
 const d=driver(0),g=d.g;d.move(g.level.seal,5);d.move(g.level.exit,5);d.click();assert.equal(g.won,false);assert.equal(g.memory,null);
 d.tap(g.level.seal);assert.equal(g.memory,null);d.move(g.level.seal,1.9);assert.equal(g.memory,null);d.move(g.level.seal,.1);assert.equal(g.memory.id,'lamp');
 d.move(g.level.exit,60);assert.equal(g.open,true);g.release();assert.equal(g.memory,null);d.click();assert.equal(g.won,false);d.pin(g.level.seal);d.tap(g.level.exit);assert.equal(g.won,true);
});
test('moving and holding alone never solves any puzzle',()=>{for(let i=0;i<8;i++){const d=driver(i);for(const n of d.g.view.nodes)d.move(n,3,true);assert.equal(d.g.won,false);assert.equal(d.g.memory,null);}});
test('pending memory cannot be borrowed by clicking a destination early',()=>{for(const i of [3,4,7]){const d=driver(i),a=R.anchors(i);d.tap(a[0]);const pending=d.g.pending.id;d.g.update(0,a[1],true);assert.equal(d.g.memory,null);assert.equal(d.g.pending.id,pending);assert.equal(d.g.won,false);}});
test('magician has exactly one complete two-reflection light path',()=>{const solutions=[];for(let a=0;a<3;a++)for(let b=0;b<3;b++)if(R.traceMagic(0,[a,b]).hit)solutions.push([a,b]);assert.deepEqual(solutions,[[1,1]]);});
test('lovers requires two cross-side reflections, not bodies or a same-side shortcut',()=>{
 const [past,now]=R.loversSeals,d=driver(2),g=d.g;
 d.pin(past);d.move(now,20);assert.equal(g.won,false);assert.equal(g.view.nodes.some(n=>n.active),false);
 d.release();d.pin(R.mirrorPoint(now));d.move(R.mirrorPoint(past),20);assert.equal(g.won,false,'swapping the past and present roles fails');
 d.release();d.pin(R.mirrorPoint(past));d.move(now,20);assert.equal(g.won,false);assert.equal(g.view.nodes[0].active,true);assert.equal(g.view.nodes[1].active,false);
 d.move(R.mirrorPoint(now),20);assert.equal(g.won,true);
});
test('lovers exposes four correctly reflected points, retargets pending memory, and saves coordinates',()=>{
 const d=driver(2),g=d.g;d.tap({x:720,y:320});d.tap({x:780,y:280});assert.equal(g.pending.x,g.point.x);d.move(g.point,2.1);
 const checkpoint=g.checkpoint(),fresh=new Game(2,checkpoint);assert.equal(fresh.pending.id,'reflection');assert.equal(fresh.pending.x,checkpoint.anchorPoint.x);assert.equal(fresh.memory,null);
 d.move({x:440,y:350},20);assert.deepEqual(g.view.mirror.now,R.mirrorPoint(g.point));assert.deepEqual(g.view.mirror.past,R.mirrorPoint(g.echo));assert.equal(g.view.mirror.pinned,true);
 assert.ok(new Set([g.point,g.echo,g.view.mirror.now,g.view.mirror.past].map(p=>[Math.round(p.x),Math.round(p.y)].join())).size===4);
 d.release();d.undo();assert.equal(g.echo.x,g.memory.x);assert.deepEqual(g.view.mirror.past,R.mirrorPoint(g.memory));
 assert.equal(new Game(2,{anchor:'reflection',anchorPoint:{x:Infinity,y:200}}).pending,null);
});
test('temperance conserves eight units on every reachable pour; goal needs seven logical pours',()=>{
 const queue=[[[8,0,0],0]],seen=new Set();let shortest=null;
 for(let h=0;h<queue.length;h++){const [w,depth]=queue[h];if(seen.has(w.join()))continue;seen.add(w.join());if(w[0]===4&&w[1]===4&&shortest===null)shortest=depth;
 for(let a=0;a<3;a++)for(let b=0;b<3;b++){const n=R.pour(w,a,b);if(n){assert.equal(n.reduce((a,b)=>a+b),8);assert.ok(n.every((v,i)=>v>=0&&v<=R.capacities[i]));queue.push([n,depth+1]);}}}
 assert.equal(shortest,7);const d=driver(3);d.pin(R.cups[0]);d.tap(R.cups[1]);assert.deepEqual(d.g.state.water,[3,5,0]);d.undo();assert.deepEqual(d.g.state.water,[8,0,0]);assert.equal(d.g.memory.id,'cup0');
});
test('star requires an Euler trail: arbitrary order, repeat and nonexistent edges fail',()=>{
 assert.deepEqual(R.starVertices.map((_,i)=>R.starEdges.filter(e=>e.includes(i)).length),[3,4,2,4,3]);
 const d=driver(4);d.pin(R.starVertices[0]);d.tap(R.starVertices[2]);assert.deepEqual(d.g.state.path,[0]);d.tap(R.starVertices[1]);d.tap(R.starVertices[0]);assert.deepEqual(d.g.state.path,[0,1]);d.undo();assert.deepEqual(d.g.state.path,[0]);assert.equal(solve(d,4).won,true);
});
test('moon hides target while pinned, all options have identical cues, release restores target',()=>{
 const d=driver(5),g=d.g;assert.deepEqual(g.view.moonMemory.target,R.moonTarget);d.pin(R.moonWell);assert.equal(g.view.moonMemory.target,null);
 d.move(R.moonOptions[0],20);assert.equal(g.view.actionLabel,'确认倒影');d.click();assert.equal(g.won,false);d.move(R.moonOptions[1]);assert.equal(g.view.actionLabel,'确认倒影');g.release();assert.deepEqual(g.view.moonMemory.target,R.moonTarget);d.click();assert.equal(g.won,false);
 assert.deepEqual(R.moonRunes[1],R.moonTarget.map(line=>line.map(([x,y])=>[x,-y])));
});
test('sun parity has one solution, all-on is not a solution, unpowered light keys do not win',()=>{
 assert.deepEqual(Array.from({length:8},(_,i)=>i).filter(i=>R.sunBits(i)===15),[3]);assert.notEqual(R.sunBits(7),15);
 const d=driver(6);d.tap(R.sunKeys[0]);d.tap(R.sunKeys[1]);assert.equal(d.g.won,false);d.pin(R.sunSource);assert.equal(d.g.won,true);
});
test('world rotation invariant, arbitrary-pause solution, undo and save are valid',()=>{
 const d=driver(7);d.pin(R.worldVertices[0]);d.move(R.worldVertices[1],20);d.click();assert.deepEqual(d.g.state.turns,[1,0,0,1]);d.undo();assert.deepEqual(d.g.state.turns,R.worldInitial);
 d.tap(R.worldVertices[1]);const saved=d.g.checkpoint(),fresh=driver(7,saved);assert.deepEqual(fresh.g.state.turns,saved.turns);assert.equal(fresh.g.memory,null);assert.ok(fresh.g.pending);assert.equal(solve(fresh,7).won,true);
});
test('checkpoint validates water, path, orientations, anchor and reachable ring parity',()=>{
 const g=new Game(3,{water:[99,0,0],orientations:[9,9],path:[0,0],anchor:'admin',turns:[0,0,0,0]});assert.deepEqual(g.state.water,[8,0,0]);assert.deepEqual(g.state.path,[]);assert.deepEqual(g.state.orientations,[0,0]);assert.equal(g.pending,null);assert.deepEqual(g.state.turns,R.worldInitial);
});
test('undo restores pending delay relative to now, without ageing while paused',()=>{
 const d=driver(0);d.tap(d.g.level.seal);d.move(d.g.point,.5);const remain=d.g.pending.at-d.g.t;d.release();d.move(d.g.point,10);d.undo();assert.ok(Math.abs(d.g.pending.at-d.g.t-remain)<1e-7);assert.equal(d.g.memory,null);
});
test('spatial acquisition still matches the drawn octagon',()=>{const g=new Game(),c={x:600,y:350};for(let i=0;i<8;i++){const a=Math.PI/8+i*Math.PI/4;assert.equal(R.occupy(g,'a',{x:c.x+39.9*Math.cos(a),y:c.y+39.9*Math.sin(a)},c),true);}assert.equal(R.occupy(g,'a',{x:646,y:350},c),false);});
