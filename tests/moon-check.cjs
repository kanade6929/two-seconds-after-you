// Uses the completed save produced by browser-check; progression is input-only.
const {chromium}=require(process.env.ECHO_PLAYWRIGHT_MODULE||'playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),R=require('../rules.js');
const dir=path.join(__dirname,'../artifacts/browser');
async function run(channel,mobile=false){
 const browser=await chromium.launch({channel,headless:true});try{
 const c=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:mobile?3:1}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.clock.install({time:new Date('2026-09-16T00:00:00Z')});await p.clock.pauseAt(new Date('2026-09-16T00:00:01Z'));
 await p.addInitScript(save=>{localStorage.setItem('two-seconds-after-you.arcana.v2',save);let Renderer;Object.defineProperty(window,'EchoRenderer',{get(){return Renderer;},set(R){Renderer=class extends R{game(g,m,...a){window.__moon={g,m,r:this};super.game(g,m,...a);}};}});},fs.readFileSync(path.join(dir,'chrome-completed-save.json'),'utf8'));
 await p.goto('http://127.0.0.1:4173');await p.evaluate(()=>document.fonts.ready);const tick=s=>p.clock.runFor(Math.round(s*1000));await tick(.5);
 const tap=async el=>mobile?el.tap():el.click();await tap(p.locator('#titleLevels'));await tick(.5);await tap(p.locator('#levelItems button').nth(5));await tick(.6);
 const state=()=>p.evaluate(()=>({phase:__moon.g.state.phase,open:__moon.g.open,won:__moon.g.won,memory:__moon.g.view.moonMemory,action:__moon.g.view.actionLabel}));
 async function move(v,seconds){const q=await p.evaluate(v=>({x:__moon.r.ox+v.x*__moon.r.scale,y:__moon.r.oy+v.y*__moon.r.scale}),v);if(mobile)await p.touchscreen.tap(q.x,q.y);else await p.mouse.move(q.x,q.y);await tick(seconds);}
 async function click(){if(mobile)await p.locator('#touchPad').tap();else{await p.mouse.down();await p.mouse.up();}await tick(.02);}
 const label=channel+(mobile?'-mobile':'');
 for(let phase=0;phase<3;phase++){
   await tick(.5);assert.deepEqual((await state()).memory,{concealed:false,target:R.moonTargets[phase]});
   if(phase===0)await p.screenshot({path:path.join(dir,label+'-moon-remember.png')});
   await move(R.moonWell,3);assert.deepEqual((await state()).memory,{concealed:true,target:null});
   if(phase===0){await move(R.moonOptions[0],1.2);assert.equal((await state()).open,true);assert.equal((await state()).action,'确认选择');await click();assert.equal((await state()).phase,0);await tick(2.2);assert.equal((await state()).memory.target,'星星');await move(R.moonWell,3);}
   await move(R.moonOptions[R.moonMaps[phase].indexOf(R.moonTargets[phase])],1.3);assert.equal((await state()).open,true);assert.equal((await state()).memory.target,null);
   if(phase===0)await p.screenshot({path:path.join(dir,label+'-moon-hidden.png')});await click();assert.ok((await state()).phase>phase||(await state()).won);
 }
 assert.equal((await state()).won,true);assert.deepEqual(errors,[]);console.log(label+': three single-click memory rounds, wrong choice and target restore passed');
 }finally{await browser.close();}
}
(async()=>{await run('chrome');await run('msedge');await run('chrome',true);})().catch(e=>{console.error(e);process.exitCode=1;});
