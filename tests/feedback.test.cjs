'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {ClickFeedback,Game,STEP}=require('../core.js');
test('a zero-duration click receives exactly one response at two game seconds',()=>{
  const f=new ClickFeedback();f.click({x:321,y:234},5);f.advance(6.999);assert.deepEqual(f.sounds,['now']);
  f.advance(7);assert.deepEqual(f.sounds,['now','echo']);assert.deepEqual(f.ripples[0],{x:321,y:234,t:7,role:'echo'});
  f.advance(7.4);assert.equal(f.sounds.length,2);f.advance(8.36);assert.equal(f.ripples.length,0);
});
test('pauses do not consume pending click responses; resets discard them',()=>{
  const g=new Game(0);g.update(0,g.point,true);const pending=JSON.stringify(g.feedback.pending);
  for(let i=0;i<30;i++)g.feedback.advance(g.t);assert.equal(JSON.stringify(g.feedback.pending),pending);
  g.release();for(let i=0;i<400;i++)g.update(STEP,g.point);assert.deepEqual(g.feedback.ripples,[]);assert.deepEqual(g.feedback.sounds,[]);
});
test('multiple clicks in one logic frame retain their own position and never supply a mechanism',()=>{
  const g=new Game(0);for(let i=0;i<3;i++)g.update(0,{x:600+i,y:500},true);
  assert.equal(g.feedback.pending.length,3);assert.equal(g.won,false);g.update(2,g.point);
  assert.deepEqual(g.feedback.ripples.filter(e=>e.role==='echo').map(e=>e.x),[600,601,602]);assert.equal(g.won,false);
});
test('click presentation is bounded under repeated input and not saved',()=>{
  const g=new Game(0);for(let i=0;i<1000;i++)g.update(0,g.point,true);
  assert.ok(g.feedback.pending.length<=32);assert.ok(g.feedback.ripples.length<=32);assert.ok(g.feedback.sounds.length<=16);
  assert.equal(g.checkpoint().feedback,undefined);
});
test('30/60/144 FPS replay exact event coordinates with the same simulation clock',()=>{
  for(const fps of[30,60,144]){const f=new ClickFeedback();f.click({x:455,y:365},.5);for(let i=0;i<fps*3;i++)f.advance(i/fps);assert.deepEqual(f.sounds,['now','echo']);assert.equal(f.ripples[0].t,2.5);}
});
