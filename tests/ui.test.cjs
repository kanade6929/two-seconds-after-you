'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const Core = require('../core.js');
const root = path.resolve(__dirname, '..');

// Runs the real input/controller in an isolated DOM adapter. This checks
// state transitions and input propagation, not browser pixels or performance.
function harness(reduced = true, save = null) {
  const nodes = new Map(), events = {}, windowEvents = {}, animations = [];
  function element(id = '') {
    const node = { id, hidden: false, inert: false, dataset: {}, style: {}, textContent: '', firstChild: {textContent:''}, children: [],
      classList:{contains:c=>/Screen$/.test(id)&&c==='screen',toggle(){}},
      setAttribute(k,v){this[k]=v;},append(...children){this.children.push(...children);},replaceChildren(){this.children=[];},
      querySelectorAll(){return id==='endingScreen'?[element(),element()]:this.children;},getAnimations(){return [];},
      animate(frames,options){animations.push({id,frames,options});return {finished:Promise.resolve(),cancel(){}};},
      addEventListener(type,fn){events[id+':'+type]=fn;}
    }; return node;
  }
  const html = fs.readFileSync(path.join(root,'index.html'),'utf8');
  for(const m of html.matchAll(/id="([^"]+)"/g)) nodes.set(m[1],element(m[1]));
  let raf, clock = 0, snapshot, stored;
  class Renderer {
    point(e){return {x:e.clientX,y:e.clientY,down:e.buttons===1};}
    resize(){}
    burst(){}
    ripple(){}
    title(p){snapshot={point:p};}
    game(g,mode){snapshot={game:g,mode};}
  }
  const document={getElementById:id=>nodes.get(id),body:{classList:{toggle(){}}},documentElement:element('html'),
    addEventListener:(name,fn)=>events[name]=fn,createElement:()=>element(),querySelectorAll:()=>[element(),element()]};
  const context={EchoCore:Core,EchoRenderer:Renderer,document,window:{matchMedia:()=>({matches:reduced}),addEventListener:(name,fn)=>windowEvents[name]=fn},
    localStorage:{getItem(){if(save)return JSON.stringify(save);throw Error('storage disabled');},setItem(k,v){stored=v;}},performance:{now:()=>clock},requestAnimationFrame:fn=>raf=fn};
  vm.runInNewContext(fs.readFileSync(path.join(root,'app.js'),'utf8'),context);
  const advance = seconds=>{for(let i=0;i<Math.round(seconds*120);i++){clock+=1000/120;raf(clock);}};
  const event=(x,y,buttons=0)=>({clientX:x,clientY:y,buttons,button:0,target:{closest:()=>null}});
  return {nodes,events,windowEvents,animations,advance,document,get snapshot(){return snapshot;},
    move(x,y){events.pointermove(event(x,y));},click(x,y){events.pointerdown(event(x,y,1));events.pointermove(event(x,y,0));windowEvents.pointerup();},
    button:id=>nodes.get(id).onclick(),get stored(){return stored;}};
}
test('page-wide movement, easing, pause/resume and reduced motion remain coherent',()=>{
  const h=harness(); h.button('start'); h.move(-80,710);h.advance(.5);
  assert.ok(h.snapshot.game.point.x < -79);assert.ok(h.snapshot.game.point.y>709);
  h.windowEvents.blur();h.advance(.1);const t=h.snapshot.game.t;assert.equal(h.snapshot.mode,'paused');
  h.advance(1);assert.equal(h.snapshot.game.t,t);
  h.button('resume');h.advance(.1);assert.equal(h.snapshot.mode,'play');assert.ok(h.snapshot.game.t>t);
  h.move(600,325);h.advance(.3);assert.ok(h.snapshot.game.point.x>599);
  assert.equal(h.animations.length,0);
});
test('resume is one click after resize, tab switch, and menu; pause time never enters replay',()=>{
  for(const reduced of [true,false]){
    const h=harness(reduced);h.button('start');h.move(1000,550);h.advance(.6);
    for(const reason of ['resize','hidden','menu']){
      const t=h.snapshot.game.t,p={...h.snapshot.game.point};
      if(reason==='resize')h.windowEvents.resize();
      if(reason==='hidden'){h.document.hidden=true;h.events.visibilitychange();}
      if(reason==='menu'){h.button('levelsButton');h.button('closeLevels');}
      h.advance(5);assert.equal(h.snapshot.game.t,t);
      h.document.hidden=false;h.events.visibilitychange();h.button('resume');h.advance(.1);
      assert.equal(h.snapshot.mode,'play');assert.ok(h.snapshot.game.t>t&&h.snapshot.game.t<t+.12);
      assert.ok(Core.distance(h.snapshot.game.point,p)<.01,'continue click must not teleport the point');
      assert.equal(h.nodes.get('pauseScreen').inert,true);
      h.move(800,500);h.advance(.4);assert.ok(Core.distance(h.snapshot.game.point,{x:800,y:500})<1);
    }
  }
});

test('title continue migrates old three-chapter completion to chapter four',()=>{
  const h=harness(true,{unlocked:2,completed:[0,1,2]});
  assert.equal(h.nodes.get('continueGame').disabled,false);
  h.button('continueGame');h.advance(.1);assert.equal(h.snapshot.game.index,3);
  h.button('home');h.button('titleLevels');assert.equal(h.nodes.get('levelItems').children.length,8);
  assert.equal(h.nodes.get('levelItems').children[3].disabled,false);
  assert.equal(h.nodes.get('levelItems').children[4].disabled,true);
});
test('continue remembers the last chapter started, fresh start does not erase unlocks',()=>{
  const h=harness(true,{unlocked:6,completed:[0,1,2,3,4,5],current:4,started:true});
  h.button('continueGame');h.advance(.1);assert.equal(h.snapshot.game.index,4);
  h.button('home');h.button('start');h.advance(.1);assert.equal(h.snapshot.game.index,0);
  assert.equal(JSON.parse(h.stored).unlocked,6);
});
test('missed window shows one retry action; retry clears failure',()=>{
  const h=harness();h.button('start');h.move(370,350);h.advance(.8);h.move(850,350);h.advance(4);
  assert.equal(h.snapshot.mode,'failed');assert.equal(h.nodes.get('failureScreen').hidden,false);
  for(const id of ['settings','home','gameBottom','completeScreen','pauseScreen','levelMenu']) assert.equal(h.nodes.get(id).hidden,true,id);
  h.button('failureRetry');h.advance(.1);assert.equal(h.snapshot.mode,'play');assert.equal(h.snapshot.game.failed,false);
});
test('coordinate transform covers every pixel for wide and tall viewports',()=>{
  for(const [width,height] of [[1920,1080],[1440,900],[800,900]]){
    const context={EchoCore:Core,window:{devicePixelRatio:1}};
    vm.runInNewContext(fs.readFileSync(path.join(root,'render.js'),'utf8'),context);
    const r=new context.window.EchoRenderer({getContext:()=>({setTransform(){},createRadialGradient(){return{addColorStop(){}};}}),getBoundingClientRect:()=>({width,height,left:0,top:0})});
    for(const [x,y] of [[0,0],[width,height],[width/2,height/2]]){
      const p=r.point({clientX:x,clientY:y,buttons:0});
      assert.ok(Math.abs(p.x*r.scale+r.ox-x)<1e-6);assert.ok(Math.abs(p.y*r.scale+r.oy-y)<1e-6);
    }
  }
});

test('all eight revised puzzles complete through the actual UI controller',()=>{
 const {solve}=require('./routes.cjs');
 const h=harness(false);h.button('start');h.advance(.02);
 for(let index=0;index<8;index++){
   const d={
    get g(){return h.snapshot.game;},
    move(p,s=.75){h.move(p.x,p.y);h.advance(s);},
    tap(p){this.move(p,.32);h.click(p.x,p.y);h.advance(.06);},
    track(s){for(let i=0;i<Math.round(s*120);i++){const p=this.g.switchPositions(this.g.t+1/120)[0];this.move(p,1/120);}},
    exit(){this.move(this.g.level.exit,.4);for(let i=0;i<1200&&h.snapshot.mode==='play';i++){if(this.g.open)h.click(this.g.level.exit.x,this.g.level.exit.y);h.advance(1/120);}}
   };
   solve(d,index);h.advance(.1);assert.equal(h.snapshot.mode,'celebrate',Core.LEVELS[index].title);
   h.advance(2.7);assert.equal(h.snapshot.mode,'complete');h.button('next');h.advance(.02);
 }
 assert.equal(h.snapshot.mode,'ending');assert.equal(JSON.parse(h.stored).completed.length,8);
 assert.ok(h.animations.some(a=>a.id==='completeScreen'&&a.frames[0].opacity===0));
});
