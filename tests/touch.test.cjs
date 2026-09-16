'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{TouchGesture,Timeline,STEP}=require('../core.js');
test('unified touch: a short still tap confirms exactly once, without a recorded hold',()=>{
 const g=new TouchGesture();g.start(1,100,100);assert.equal(g.step(.1),false);assert.equal(g.move(1,105,102),null);assert.equal(g.end(1),true);assert.equal(g.end(1),false);assert.equal(g.held,false);
});
test('unified touch: drag slop ignores jitter, preserves the full delta, and never clicks on release',()=>{
 const g=new TouchGesture();g.start(1,100,100);assert.equal(g.move(1,103,104),null);assert.deepEqual(g.move(1,114,105),{x:14,y:5});assert.deepEqual(g.move(1,120,108),{x:6,y:3});assert.equal(g.step(1),false);assert.equal(g.end(1),false);
});
test('unified touch: still long press holds, dragging cancels it and releasing never also clicks',()=>{
 const g=new TouchGesture();g.start(1,100,100);assert.equal(g.step(.21),false);assert.equal(g.step(.01),true);assert.equal(g.move(1,104,101),null);assert.equal(g.held,true);assert.equal(g.end(1),false);
 g.start(1,100,100);g.step(.3);g.move(1,115,100);assert.equal(g.held,false);assert.equal(g.step(1),false);assert.equal(g.end(1),false);
});
test('unified touch: another finger, cancellation, or stage reset cannot submit or retain a hold',()=>{
 const g=new TouchGesture();g.start(7,10,10);assert.equal(g.start(8,0,0),false);assert.equal(g.move(8,200,200),null);assert.equal(g.end(8),false);assert.equal(g.id,7);g.step(.3);g.cancel();assert.equal(g.end(7),false);assert.equal(g.step(3),false);assert.equal(g.start(9,10,10),true);
});
test('unified touch: 30/60/144 FPS produce the same hold onset and two-second replay',()=>{
 for(const fps of [30,60,144]){const g=new TouchGesture(),line=new Timeline();g.start(1,0,0);let t=0,acc=0,first=null;for(let frame=0;frame<fps*3;frame++){acc+=1/fps;while(acc>=STEP-1e-9){acc-=STEP;t+=STEP;const down=g.step(STEP);if(down&&first===null)first=t;line.add(t,{x:20,y:30,down});}}assert.ok(Math.abs(first-27*STEP)<1e-7);assert.equal(line.at(first).down,true);assert.equal(line.at(first-STEP).down,false);assert.equal(line.at((first+2)-2).down,true);}
});
