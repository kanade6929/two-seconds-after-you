// Follow-up browser checks use a save produced by the full input solver,
// then select chapters through the public UI. No live rules are overwritten.
const {chromium}=require(process.env.ECHO_PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),R=require('../rules.js');
const dir=path.join(__dirname,'../artifacts/browser');
async function run(mobile){
 const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:mobile?3:1}),p=await context.newPage();
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.clock.install({time:new Date('2026-09-16T00:00:00Z')});await p.clock.pauseAt(new Date('2026-09-16T00:00:01Z'));
 await p.addInitScript(save=>{if(!localStorage.getItem('two-seconds-after-you.arcana.v2'))localStorage.setItem('two-seconds-after-you.arcana.v2',save);let Renderer;Object.defineProperty(window,'EchoRenderer',{get(){return Renderer;},set(R){Renderer=class extends R{game(g,m,...a){window.__view={g,m,r:this};super.game(g,m,...a);}};}});},fs.readFileSync(path.join(dir,'chrome-completed-save.json'),'utf8'));
 await p.goto('http://127.0.0.1:4173');await p.evaluate(()=>document.fonts.ready);const tick=s=>p.clock.runFor(Math.round(s*1000));await tick(.5);
 const state=()=>p.evaluate(()=>({t:__view.g.t,phase:__view.g.state.phase,fade:__view.g.transition?.remaining,point:__view.g.point,open:__view.g.open,turns:__view.g.state.turns,won:__view.g.won}));
 async function button(id){if(mobile)await p.locator('#'+id).tap();else await p.locator('#'+id).click();await tick(.6);}
 async function move(v,seconds){const q=await p.evaluate(v=>({x:__view.r.ox+v.x*__view.r.scale,y:__view.r.oy+v.y*__view.r.scale}),v);if(mobile)await p.touchscreen.tap(q.x,q.y);else await p.mouse.move(q.x,q.y);await tick(seconds);}
 async function click(){if(mobile)await p.locator('#touchPad').tap();else{await p.mouse.down();await p.mouse.up();}}
 async function chapter(i){await button('titleLevels');const card=p.locator('#levelItems button').nth(i);if(mobile)await card.tap();else await card.click();await tick(.6);}
 const prefix=mobile?'target-mobile':'target-desktop';await chapter(3);await move(R.balancePads[2],3);await move(R.balancePads[4],.9);
 for(let n=0;n<100&&!(await state()).fade;n++)await tick(.008);
 assert.ok((await state()).fade);const time=(await state()).t;await tick(.08);await p.screenshot({path:path.join(dir,prefix+'-fade-out.png')});await tick(.18);assert.equal((await state()).t,time);await p.screenshot({path:path.join(dir,prefix+'-fade-in.png')});await tick(.4);
 await p.keyboard.press('Escape');await tick(.4);await button('pauseHome');await chapter(7);
 await move(R.worldVertices[0],3);await move(R.worldVertices[1],1.3);assert.equal((await state()).open,true);await click();const first=(await state()).turns;await tick(.06);await p.screenshot({path:path.join(dir,prefix+'-turning.png')});await tick(.3);
 assert.deepEqual((await state()).turns,first);await p.keyboard.press('Escape');await tick(.4);await p.reload();await tick(.5);await button('continueGame');assert.deepEqual((await state()).turns,first);assert.equal((await state()).open,false);
 assert.deepEqual(errors,[]);await browser.close();console.log(prefix+': transition, rotation and persisted world state passed');
}
(async()=>{await run(false);await run(true);})().catch(e=>{console.error(e);process.exitCode=1;});
