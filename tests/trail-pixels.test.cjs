'use strict';
// Optional real Canvas raster tests. No runtime or CI dependency is required.
// ECHO_CANVAS_MODULE may point to an installed @napi-rs/canvas package.
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const Core=require('../core.js');
const modulePath=process.env.ECHO_CANVAS_MODULE;
const canvas=modulePath?require(modulePath):null;
const source=process.env.ECHO_RENDER_REVISION
  ?require('node:child_process').execFileSync('git',['show',`${process.env.ECHO_RENDER_REVISION}:render.js`],{cwd:path.join(__dirname,'..'),encoding:'utf8'})
  :fs.readFileSync(path.join(__dirname,'../render.js'),'utf8');
function scene(width=1200,height=650,dpr=1){
  const surface=canvas.createCanvas(width,height);
  surface.getBoundingClientRect=()=>({left:0,top:0,width,height});
  const sandbox={EchoCore:Core,window:{devicePixelRatio:dpr},OffscreenCanvas:class{constructor(w,h){return canvas.createCanvas(w,h);}}};
  vm.runInNewContext(source,sandbox);
  return {r:new sandbox.window.EchoRenderer(surface),surface};
}
function pixels(r){return r.ctx.getImageData(0,0,r.canvas.width,r.canvas.height).data;}
function difference(a,b){let sum=0,delta=0;for(let i=0;i<a.length;i++){sum+=a[i];delta+=Math.abs(a[i]-b[i]);}return delta/(sum||1);}
function analytic(fn){return {at(t){return t<0?null:{...fn(t),t,down:false};}};}
const circle=analytic(t=>t<=1?{x:800,y:325}:{x:600+200*Math.cos((t-1)*Math.PI*2/1.5),y:325+140*Math.sin((t-1)*Math.PI*2/1.5)});
function draw(r,t,timeline=circle){
  r.base();const before=pixels(r);r.ribbon(timeline,t-2,t,'#edbd88',.5);const after=pixels(r);
  const light=new Float32Array(before.length/4);
  for(let i=0;i<light.length;i++)for(let channel=0;channel<3;channel++){
    const k=i*4+channel;
    light[i]+=Math.max(0,after[k]*after[i*4+3]/255-before[k]*before[i*4+3]/255);
  }
  return light;
}
const options={skip:!canvas&&'Set ECHO_CANVAS_MODULE to run actual Canvas pixel checks'};
test('pixels: closed-loop tail crossing cannot flash the entire trail',options,()=>{
  const {r}=scene(),before=draw(r,2.499),after=draw(r,2.501);
  // 2 ms of motion may change the tip, never flip the lighting of the loop.
  const delta=difference(before,after);
  assert.ok(delta<.035,`loop crossing changed ${(delta*100).toFixed(1)}% of trail intensity`);
});
test('pixels: rest decays smoothly; backtracking and figure-eight crossings remain stable',options,()=>{
  const routes=[
    analytic(t=>({x:600+220*Math.sin(t*4),y:325+130*Math.sin(t*8)})),
    analytic(t=>({x:600+220*Math.sin(t*4),y:325})),
    analytic(t=>({x:300+200*Math.min(t,1),y:325}))
  ];
  for(const timeline of routes){
    const {r}=scene();let before=draw(r,2.1,timeline);
    for(let i=1;i<=120;i++){
      const after=draw(r,2.1+i/1000,timeline),delta=difference(before,after);
      assert.ok(delta<.065,`1 ms step changed ${(delta*100).toFixed(1)}% of trail intensity`);before=after;
    }
  }
});
test('pixels: segment joins have no bright beads and opacity decays along age',options,()=>{
  const {r}=scene(),timeline=analytic(t=>({x:100+t*400,y:325}));const data=draw(r,2,timeline);
  let previous=0;
  for(let x=130;x<850;x++){
    const alpha=data[325*1200+x];
    assert.ok(alpha>=previous-2,`brightness bump/bead at x=${x}: ${previous} -> ${alpha}`);previous=alpha;
  }
  assert.ok(previous>80,'trail should remain visible');
});
test('pixels: pooled layer clears stale curves and respects resize and parent fade',options,()=>{
  for(const [width,height,dpr]of[[1200,650,1],[960,640,2],[2560,1080,1]]){
    const {r}=scene(width,height,dpr);draw(r,2.5);
    const fresh=scene(width,height,dpr).r;
    const other=analytic(t=>({x:100+t*100,y:100}));
    r.base();r.ctx.globalAlpha=.3;r.ribbon(other,0,2,'#b8eee8',.6);
    fresh.base();fresh.ctx.globalAlpha=.3;fresh.ribbon(other,0,2,'#b8eee8',.6);
    assert.ok(Buffer.from(pixels(r)).equals(Buffer.from(pixels(fresh))),'old trail should leave no stale pixels');assert.equal(r.ctx.globalAlpha,fresh.ctx.globalAlpha);
    r.resize();assert.equal(difference(draw(r,2.5),draw(fresh,2.5)),0);
  }
});
