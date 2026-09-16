'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const Core=require('../core.js');
function renderer(width=1920,height=1080){
  const stats={strokes:0,paths:0,arcs:[],beziers:0};
  const ctx={globalAlpha:1,save(){},restore(){},setTransform(){},clearRect(){},setLineDash(){},fill(){},fillText(){},
    beginPath(){stats.paths++;},moveTo(){},lineTo(){},bezierCurveTo(...n){assert.ok(n.every(Number.isFinite));stats.beziers++;},stroke(){stats.strokes++;},arc(x,y,r){assert.ok(r>=0&&Number.isFinite(r));stats.arcs.push(r);},
    createLinearGradient(){return {addColorStop(){}};},createRadialGradient(){return {addColorStop(){}};}};
  const sandbox={EchoCore:Core,window:{devicePixelRatio:1}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../render.js'),'utf8'),sandbox);
  const r=new sandbox.window.EchoRenderer({getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width,height})});return {r,stats};
}
test('ribbon is one continuous path with three full-length strokes, no bead arcs',()=>{
  const {r,stats}=renderer(),t=new Core.Timeline();
  for(let i=0;i<240;i++)t.add(i/120,{x:i*2,y:300+Math.sin(i/20)*70});
  r.ribbon(t,0,1.99,'#b8eee8',.6);
  assert.equal(stats.paths,1);assert.equal(stats.strokes,3);assert.equal(stats.arcs.length,0);assert.ok(stats.beziers>20);
});
test('all eight real renderer scenes execute with smooth activation and extinguishing',()=>{
  for(let index=0;index<8;index++){
    const {r}=renderer(),g=new Core.Game(index),p=g.level.switches[0];
    for(let i=0;i<60;i++){g.update(1/60,p);r.game(g,'play',false,1/60);}
    // Exercise the light envelope independently of role/code-specific activation.
    g.pulse[0]=1;g.lit[0]=true;
    if(g.level.rule==='balance')g.energy[0]=1;
    for(let i=0;i<60;i++)r.game(g,'play',false,1/60);
    const lit=r.lights[0].level;assert.ok(lit>.9);
    g.active[0]={now:false,echo:false};r.game(g,'failed',false,1/60);
    assert.ok(r.lights[0].level>0&&r.lights[0].level<lit);
    for(let i=0;i<240;i++)r.game(g,'failed',false,1/60);
    assert.ok(r.lights[0].level<.01);
  }
});
test('door ripple covers distant viewport corners including ultrawide letterboxing',()=>{
  for(const [w,h]of[[1920,1080],[2560,1080],[900,1200]]){
    const {r,stats}=renderer(w,h),origin={x:975,y:320};r.ripple(origin,1.9,false);
    const far=Math.max(...[[0,0],[w,0],[0,h],[w,h]].map(([x,y])=>Math.hypot((x-r.ox)/r.scale-origin.x,(y-r.oy)/r.scale-origin.y)));
    assert.ok(Math.max(...stats.arcs)>far);
  }
});
test('particles are bounded and reduced-motion ripple avoids screen expansion',()=>{
  const {r,stats}=renderer();for(let i=0;i<10;i++)r.burst({x:600,y:300},'#edbd88',60);assert.equal(r.particles.length,240);
  r.ripple({x:600,y:300},.2,true);assert.ok(Math.max(...stats.arcs)<100);
});
