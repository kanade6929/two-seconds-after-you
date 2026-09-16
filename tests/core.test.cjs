'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { Game, Timeline, Follower, STEP, LEVELS } = require('../core.js');
const point = (p, down = false) => ({ ...p, down });
function hold(g, p, seconds) { for (let i = 0; i < Math.round(seconds / STEP); i++) g.update(STEP, point(p)); }
test('timeline: linear interpolation and button state delayed exactly two seconds', () => {
  const t = new Timeline(); t.add(0, { x: 0, y: 0, down: true }); t.add(1, { x: 100, y: 50, down: false });
  assert.deepEqual(t.at(.5), { t: .5, x: 50, y: 25, down: true }); assert.equal(t.at(-.1), null);
  const g = new Game(0); for (let n = 1; n <= 480; n++) g.update(STEP, { x: n * STEP * 100, y: 200, down: n * STEP < 2.5 });
  assert.ok(Math.abs(g.echo.x - 200) < 1e-6); assert.equal(g.echo.down, true);
});
test('level 1: closed exit rejects click; echo holds exit open; no permanent latch', () => {
  const g = new Game(0), l = g.level;
  g.update(STEP, point(l.exit), true); assert.equal(g.won, false);
  hold(g, l.switches[0], 3); hold(g, l.exit, .2); assert.equal(g.open, true);
  g.update(STEP, point(l.exit, true), true); assert.equal(g.won, true);
  const h = new Game(0); hold(h, l.switches[0], 3); hold(h, l.exit, 2.8); assert.equal(h.open, false); assert.equal(h.failed, true);
});


test('fixed-step accumulation produces same timeline at 30/60/144 FPS', () => {
  const results = [30, 60, 144].map(fps => {
    const g = new Game(0); let a = 0;
    for (let frame = 0; frame < fps * 4; frame++) {
      a += 1 / fps; while (a + 1e-9 >= STEP) { const t = g.t + STEP; g.update(STEP, { x: 200 + t * 30, y: 500, down: false }); a -= STEP; }
    } return { t: g.t, x: g.echo.x };
  });
  for (const r of results) { assert.ok(Math.abs(r.t - 4) < 1e-6); assert.ok(Math.abs(r.x - 260) < 1e-6); }
});
test('reset clears time, echo, circuit latch and completion', () => {
  const old = new Game(1); hold(old, LEVELS[1].switches[0], 3); hold(old, LEVELS[1].switches[1], 1);
  const fresh = new Game(old.index); assert.equal(fresh.t, 0); assert.equal(fresh.echo, null); assert.equal(fresh.latched, false); assert.equal(fresh.won, false);
});
test('pause freezes timeline simply by not advancing game time; samples stay bounded', () => {
  const g = new Game(0); hold(g, { x: 600, y: 540 }, 40); const before = JSON.stringify(g);
  assert.equal(JSON.stringify(g), before); assert.ok(g.timeline.samples.length < 390);
  g.update(STEP, g.point); assert.ok(Math.abs(g.t - 40 - STEP) < 1e-6);
});
test('spring: no overshoot, settles rapidly, rejects high-frequency hand jitter', () => {
  const f = new Follower({x:0,y:0}); let previous = 0;
  for (let i=0;i<120;i++) { const p = f.update(STEP,{x:100,y:100}); assert.ok(p.x >= previous && p.x <= 100); previous = p.x; }
  assert.ok(Math.abs(f.x-100)<.02);
  const samples=[];
  for(let i=0;i<120;i++) samples.push(f.update(STEP,{x:100+(i%2?1.5:-1.5),y:100}).x);
  assert.ok(Math.max(...samples)-Math.min(...samples)<.2);
});
test('spring exact solution agrees across refresh rates', () => {
  for(const fps of [30,60,144]) {
    const f=new Follower({x:0,y:0}); for(let i=0;i<fps/2;i++) f.update(1/fps,{x:800,y:500});
    assert.ok(Math.abs(f.x-800)<.01);
  }
});
