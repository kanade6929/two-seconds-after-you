'use strict';
// Native Canvas preview of the real renderer only, not an HTML/browser screenshot.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const Core=require('../core.js');
if(!process.env.ECHO_CANVAS_MODULE)throw Error('Set ECHO_CANVAS_MODULE to an installed @napi-rs/canvas package');
const {createCanvas}=require(process.env.ECHO_CANVAS_MODULE);
const canvas=createCanvas(1440,900);canvas.getBoundingClientRect=()=>({width:1440,height:900,left:0,top:0});
const sandbox={EchoCore:Core,window:{devicePixelRatio:1},OffscreenCanvas:class{constructor(w,h){return createCanvas(w,h);}}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../render.js'),'utf8'),sandbox);
const r=new sandbox.window.EchoRenderer(canvas),g=new Core.Game(3);
for(let i=0;i<480;i++){
  const t=i/120;g.update(1/120,{x:590+260*Math.sin(t*2),y:355+130*Math.sin(t*4)});
}
g.pulse=[1,1,1];g.lit=[true,true,true];
for(let i=0;i<90;i++)r.game(g,'play',false,1/60);
const dir=path.join(__dirname,'../artifacts');fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,'arcana-render.png'),canvas.toBuffer('image/png'));
const begin=performance.now();for(let i=0;i<120;i++)r.game(g,'play',false,1/60);
console.log('Native Canvas average render:',((performance.now()-begin)/120).toFixed(2),'ms (not browser/device FPS)');
console.log(path.join(dir,'arcana-render.png'));
