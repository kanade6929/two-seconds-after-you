'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const Core=require('../core.js');
function renderer(width=1920,height=1080,trace=false,dpr=1){
  const stats={strokes:0,paths:0,arcs:[],beziers:0,blits:0,layers:0,gradients:[],composites:new Set()};
  function context(){
    const stack=[];
    const ctx={globalAlpha:1,globalCompositeOperation:'source-over',shadowBlur:0,
      save(){stack.push({globalAlpha:this.globalAlpha,globalCompositeOperation:this.globalCompositeOperation,shadowBlur:this.shadowBlur});},
      restore(){Object.assign(this,stack.pop());},setTransform(){},clearRect(){},fillRect(){},setLineDash(){},fill(){},fillText(){},
      drawImage(){stats.blits++;},beginPath(){stats.paths++;},moveTo(){},lineTo(){},bezierCurveTo(...n){assert.ok(n.every(Number.isFinite));stats.beziers++;},
      stroke(){assert.ok(this.globalAlpha>=0&&this.globalAlpha<=1);stats.composites.add(this.globalCompositeOperation);stats.strokes++;},arc(x,y,r){assert.ok(r>=0&&Number.isFinite(r));stats.arcs.push(r);},
      createLinearGradient(...coords){const gradient={coords,stops:[],addColorStop(t,color){this.stops.push({t,color});}};if(trace)stats.gradients.push(gradient);return gradient;},
      createRadialGradient(){return {addColorStop(){}};}};
    return ctx;
  }
  const ctx=context();
  const sandbox={EchoCore:Core,ArcanaSymbols:require('../symbols.js'),window:{devicePixelRatio:dpr},OffscreenCanvas:class{constructor(width,height){this.width=width;this.height=height;this.ctx=context();stats.layers++;}getContext(){return this.ctx;}}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../render.js'),'utf8'),sandbox);
  const r=new sandbox.window.EchoRenderer({getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width,height})});return {r,stats,ctx};
}
test('ribbon uses one reusable max-intensity light map, no bead arcs or global gradient',()=>{
  const {r,stats}=renderer(1920,1080,true),t=new Core.Timeline();
  for(let i=0;i<240;i++)t.add(i/120,{x:i*2,y:300+Math.sin(i/20)*70});
  r.ribbon(t,0,1.99,'#b8eee8',.6);
  assert.equal(stats.strokes,stats.paths+2);assert.equal(stats.arcs.length,0);assert.ok(stats.beziers>20);
  assert.deepEqual([...stats.composites],['lighten','source-over']);assert.equal(stats.blits,2);assert.equal(stats.layers,2);
  assert.ok(stats.gradients.every(g=>Math.hypot(g.coords[2]-g.coords[0],g.coords[3]-g.coords[1])<40));
  r.ribbon(t,.01,1.99,'#edbd88',.5);assert.equal(stats.layers,2);assert.equal(stats.blits,4);
});
test('resting input never stamps dots and trail compositing preserves parent fade',()=>{
  const {r,stats,ctx}=renderer(),t=new Core.Timeline();
  for(let i=0;i<=240;i++)t.add(i/120,{x:600,y:300});
  ctx.globalAlpha=.25;r.ribbon(t,0,2,'#edbd88',.5);
  assert.equal(stats.strokes,3);assert.equal(stats.arcs.length,0);assert.equal(stats.beziers,0);
  assert.equal(ctx.globalAlpha,.25);assert.equal(ctx.globalCompositeOperation,'source-over');
});
test('tarot sigils consist only of straight line paths, never circles or bezier curves',()=>{
  for(const name of ['星星','月亮','太阳']){
    const {r,stats}=renderer();r.sigil(name,600,325,'#edbd88',1);
    assert.equal(stats.paths,1);assert.equal(stats.strokes,1);assert.equal(stats.beziers,0);assert.equal(stats.arcs.length,0);
  }
});
test('visible trails decay sooner without changing the two-second replay offset',()=>{
  const {r}=renderer(),calls=[];r.ribbon=(timeline,start,end)=>calls.push({start,end});
  r.cursors(null,null,{},false,8);assert.deepEqual(calls,[{start:6.85,end:8},{start:5.4,end:6}]);
  calls.length=0;r.cursors(null,null,{},true,8);assert.deepEqual(calls,[{start:7.65,end:8},{start:5.75,end:6}]);
});
test('glow clamps intensity before multiplying parent opacity and restores drawing state',()=>{
  const {r,ctx}=renderer();ctx.globalAlpha=.9;
  ctx.fill=function(){assert.ok(this.globalAlpha<=.9&&this.globalAlpha>=0);};
  for(const alpha of[-.2,0,.5,1,1.7]){r.glow({x:300,y:300},'#edbd88',0,true,alpha);assert.equal(ctx.globalAlpha,.9);}
  r.ripple({x:300,y:300},.35,false);assert.equal(ctx.globalAlpha,.9);assert.equal(ctx.globalCompositeOperation,'source-over');
});
test('all eight real renderer scenes execute with smooth activation and extinguishing',()=>{
  for(let index=0;index<8;index++){
    const {r}=renderer(),g=new Core.Game(index);
    for(let i=0;i<20;i++){g.update(1/120,g.point);r.game(g,'play',false,1/120);}
    assert.ok(r.nodeLights.size>0);
  }
});
test('door ripple covers distant viewport corners including ultrawide letterboxing',()=>{
  for(const [w,h]of[[1920,1080],[2560,1080],[900,1200]]){
    const {r}=renderer(w,h),origin={x:975,y:320},radii=[];r.polygon=(x,y,r)=>radii.push(r);r.ripple(origin,1.05,false);
    const far=Math.max(...[[0,0],[w,0],[0,h],[w,h]].map(([x,y])=>Math.hypot((x-r.ox)/r.scale-origin.x,(y-r.oy)/r.scale-origin.y)));
    assert.ok(Math.max(...radii)>far);
  }
});
test('particles are bounded and reduced-motion ripple avoids screen expansion',()=>{
  const {r,stats}=renderer();for(let i=0;i<10;i++)r.burst({x:600,y:300},'#edbd88',60);assert.equal(r.particles.length,180);
  r.ripple({x:600,y:300},.2,true);assert.ok(Math.max(...stats.arcs)<100);
});

test('click reminder follows live permission, never afterglow or a paused scene',()=>{
  const {driver}=require('./routes.cjs'),d=driver(0),g=d.g,{r}=renderer(),calls=[];
  r.clickCue=(...args)=>calls.push(args);
  r.game(g,'play',false);assert.equal(calls.length,0);
  d.move(g.level.seal,3);d.until(()=>g.open,g.level.exit);
  r.game(g,'play',false);assert.equal(calls.length,1);assert.equal(calls[0][1],'点击完成');
  r.game(g,'pause',false);assert.equal(calls.length,1);
  d.move(g.level.exit,2.2);assert.equal(g.view.clickable,false);
  r.game(g,'play',false);assert.equal(calls.length,1);assert.ok(r.nodeLights.get('exit')>0);
});

test('click reminder breathes normally but stays static with reduced motion',()=>{
  function capture(t,reduced){const {r,ctx}=renderer(),draw=[];
    r.glow=(...args)=>draw.push(['glow',...args]);
    r.polygon=(...args)=>draw.push(['frame',...args,ctx.globalAlpha]);
    r.text=(...args)=>draw.push(['label',...args]);
    r.clickCue({x:600,y:350},'点击完成',t,reduced);
    // Glow ignores its time argument in reduced mode; compare displayed values.
    draw[0][3]=0;return draw;
  }
  assert.notDeepEqual(capture(.25,false),capture(.75,false));
  assert.deepEqual(capture(.25,true),capture(.75,true));
  assert.equal(capture(.25,true).filter(v=>v[0]==='frame').length,1);
  assert.equal(capture(.25,false).filter(v=>v[0]==='frame').length,2);
});

test('stage transition draws old and new scenes without a hard cut or active click cue',()=>{
  const {driver}=require('./routes.cjs'),d=driver(0),g=d.g,{r,ctx}=renderer();d.until(()=>g.state.phase===1,g.level.seal);
  const scenes=[],alphas=[];const scene=r.scene.bind(r);r.scene=(s,m,...args)=>{scenes.push([s.state.phase,m]);scene(s,m,...args);};
  const blit=ctx.drawImage;ctx.drawImage=function(...a){alphas.push(this.globalAlpha);blit(...a);};
  g.update(.09,g.point);r.game(g,'play',false,.09);assert.equal(scenes[0][0],0);assert.equal(scenes[0][1],'transition');assert.ok(alphas.at(-1)>.4&&alphas.at(-1)<.6);
  g.update(.22,g.point);r.game(g,'play',false,.22);assert.equal(scenes.at(-1)[0],1);assert.ok(alphas.at(-1)>.4&&alphas.at(-1)<.6);
  r.game(g,'paused',true,0);assert.equal(scenes.at(-1)[0],1);
});

test('background and glow reuse bounded sprites; ribbon buffers are local, not full screen',()=>{
 const {r,stats}=renderer();r.base();const sky=r.skyLayer;r.base();assert.equal(r.skyLayer,sky);
 for(let i=0;i<20;i++)r.glow({x:600,y:300},'#b8eee8',i,false);assert.equal(r.glowSprites.size,1);
 const t=new Core.Timeline();t.add(0,{x:500,y:300});t.add(1,{x:520,y:310});r.ribbon(t,0,1,'#b8eee8',.6);
 assert.ok(r.ribbonLayer.width<500&&r.ribbonLayer.height<500);const before=stats.strokes;r.sigil('太阳',600,300,'#b8eee8');assert.equal(stats.strokes-before,1);
});

test('mobile pixel adaptation requires sustained pressure and never moves logical coordinates',()=>{
 const {r}=renderer(390,844,false,3);r.mobile=true;r.scale=.6;r.ox=20;r.oy=100;
 for(let i=0;i<40;i++)r.adapt(33,12,true);assert.equal(r.dpr,2);
 for(let i=0;i<30;i++)r.adapt(33,12,true);assert.equal(r.dpr,1.75);assert.equal(r.scale,.6);assert.equal(r.ox,20);assert.equal(r.oy,100);
 r.adapt(1000,50,true);assert.equal(r.pressure,0);
});
