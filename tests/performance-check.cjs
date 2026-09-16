// Current desktop Chrome / mobile viewport benchmark, not physical-phone FPS.
// Four-times CPU throttling does not simulate a mobile GPU.
const {chromium}=require(process.env.ECHO_PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),dir=path.join(root,'artifacts/browser');
async function run(label){
 const browser=await chromium.launch({channel:'chrome',headless:true}),c=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true}),p=await c.newPage(),cdp=await c.newCDPSession(p);
 try{
 await p.addInitScript(save=>{localStorage.setItem('two-seconds-after-you.arcana.v3',save);let Renderer;Object.defineProperty(window,'EchoRenderer',{get(){return Renderer;},set(R){Renderer=class extends R{game(g,m,...args){window.__perfView={g,m,r:this};const t=performance.now();super.game(g,m,...args);if(window.__perf)window.__perf.draw.push(performance.now()-t);}};}});},fs.readFileSync(path.join(dir,'chrome-completed-save.json'),'utf8'));
 await p.goto('http://127.0.0.1:4173');await p.evaluate(()=>document.fonts.ready);await p.locator('#titleLevels').tap();await p.locator('#levelItems button').nth(4).tap();await p.waitForTimeout(1000);
 await cdp.send('Performance.enable');await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
 const before=await cdp.send('Performance.getMetrics');
 await p.evaluate(()=>{window.__perf={draw:[],raf:[],gradients:0,rects:0};const proto=CanvasRenderingContext2D.prototype,off=typeof OffscreenCanvasRenderingContext2D==='undefined'?null:OffscreenCanvasRenderingContext2D.prototype;
   for(const cls of [proto,off].filter(Boolean))for(const name of ['createLinearGradient','createRadialGradient']){const fn=cls[name];cls[name]=function(...a){__perf.gradients++;return fn.apply(this,a);};}
   const rect=Element.prototype.getBoundingClientRect;Element.prototype.getBoundingClientRect=function(...a){__perf.rects++;return rect.apply(this,a);};
   let last=performance.now(),begin=last;function frame(t){__perf.raf.push(t-last);last=t;const age=(t-begin)/1000,r=__perfView.r;document.dispatchEvent(new PointerEvent('pointermove',{pointerType:'mouse',clientX:r.ox+(600+150*Math.sin(age*3))*r.scale,clientY:r.oy+(365+65*Math.sin(age*6))*r.scale,bubbles:true}));if(age<5)requestAnimationFrame(frame);}requestAnimationFrame(frame);
 });
 await p.waitForTimeout(5300);const after=await cdp.send('Performance.getMetrics');const result=await p.evaluate(()=>{const stat=a=>{a.sort((a,b)=>a-b);return {count:a.length,median:+a[Math.floor(a.length*.5)].toFixed(2),p95:+a[Math.floor(a.length*.95)].toFixed(2)};};return {drawMs:stat(__perf.draw),rafMs:stat(__perf.raf),gradients:__perf.gradients,rectReads:__perf.rects};});
 for(const name of ['LayoutCount','RecalcStyleCount','TaskDuration'])result[name]=+(after.metrics.find(m=>m.name===name).value-before.metrics.find(m=>m.name===name).value).toFixed(3);
 await p.screenshot({path:path.join(dir,'performance-'+label+'.png')});console.log(JSON.stringify({label,...result}));return result;
 }finally{await browser.close();}
}
(async()=>{const current=await run('puzzle-v3');fs.writeFileSync(path.join(dir,'performance-puzzle-v3.json'),JSON.stringify(current,null,2));})().catch(e=>{console.error(e);process.exitCode=1;});
