// Browser gestures go through the real pointer controller. Observations only;
// chapter access comes from a save created by the full eight-chapter solver.
const {chromium}=require(process.env.ECHO_PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),R=require('../rules.js');
const dir=path.join(__dirname,'../artifacts/browser');
async function run(width,height){
 const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const c=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,deviceScaleFactor:3}),p=await c.newPage(),cdp=await c.newCDPSession(p),errors=[];
 p.on('pageerror',e=>errors.push(e.message));await p.clock.install({time:new Date('2026-09-16T00:00:00Z')});await p.clock.pauseAt(new Date('2026-09-16T00:00:01Z'));
 await p.addInitScript(save=>{localStorage.setItem('two-seconds-after-you.arcana.v2',save);let Renderer;Object.defineProperty(window,'EchoRenderer',{get(){return Renderer;},set(R){Renderer=class extends R{game(g,m,...a){window.__touch={g,m,r:this};super.game(g,m,...a);}};}});},fs.readFileSync(path.join(dir,'chrome-completed-save.json'),'utf8'));
 await p.goto('http://127.0.0.1:4173');await p.evaluate(()=>document.fonts.ready);const tick=s=>p.clock.runFor(Math.round(s*1000));await tick(.5);
 await p.locator('#titleLevels').tap();await tick(.4);await p.locator('#levelItems button').nth(1).tap();await tick(.7);
 const pad=p.locator('#touchPad');assert.equal(await p.locator('#touchControls button').count(),1);assert.equal(await p.locator('#touchConfirm').count(),0);
 const state=()=>p.evaluate(()=>({point:__touch.g.point,angle:__touch.g.state.orientations[0],mode:__touch.m,scale:__touch.r.scale,gesture:document.getElementById('touchPad').dataset.gesture}));
 async function finger(type,pos){await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:pos?[{x:pos.x,y:pos.y,id:0}]:[]});}
 const center=async()=>{const b=await pad.boundingBox();return{x:b.x+b.width/2,y:b.y+b.height/2};};
 async function dragTo(v){
   const s=await state(),dx=(v.x-s.point.x)*s.scale,dy=(v.y-s.point.y)*s.scale,n=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/42));
   for(let i=0;i<n;i++){const a=await center();await finger('touchStart',a);await finger('touchMove',{x:a.x+dx/n,y:a.y+dy/n});await tick(.04);await finger('touchEnd');}
   await tick(2);assert.ok(Math.hypot((await state()).point.x-v.x,(await state()).point.y-v.y)<2,'pad-only movement reaches mirror');
 }
 const mirror=R.magicLayout(0).mirrors[0];await dragTo(mirror);assert.equal((await state()).angle,0,'dragging does not rotate the mirror');
 await pad.tap();await tick(.05);assert.equal((await state()).angle,1,'one tap rotates exactly once');
 // A long press records down, but neither its start nor release clicks a mirror.
 await finger('touchStart',await center());await tick(.1);assert.equal((await state()).point.down,false);await tick(.2);assert.equal((await state()).point.down,true);assert.equal((await state()).gesture,'holding');
 await p.screenshot({path:path.join(dir,`single-pad-${width}x${height}-hold.png`)});await finger('touchEnd');await tick(.04);assert.equal((await state()).point.down,false);assert.equal((await state()).angle,1);
 // Drift below the slop doesn't move the light; an intentional drag releases hold.
 const a=await center(),before=(await state()).point;await finger('touchStart',a);await finger('touchMove',{x:a.x+3,y:a.y+2});await tick(.3);assert.ok(Math.hypot((await state()).point.x-before.x,(await state()).point.y-before.y)<.1);
 await finger('touchMove',{x:a.x+18,y:a.y});await tick(.06);assert.equal((await state()).point.down,false);assert.equal((await state()).gesture,'moving');await p.screenshot({path:path.join(dir,`single-pad-${width}x${height}-move.png`)});await finger('touchEnd');await tick(.05);assert.equal((await state()).angle,1);
 // OS cancellation and pause both discard the contact, not turn it into a tap.
 await finger('touchStart',await center());await tick(.3);await finger('touchCancel');await tick(.04);assert.equal((await state()).point.down,false);assert.equal((await state()).gesture,'idle');
 await finger('touchStart',await center());await tick(.3);await p.keyboard.press('Escape');await tick(.4);await finger('touchEnd');await p.locator('#resume').tap();await tick(.6);assert.equal((await state()).point.down,false);assert.equal((await state()).angle,1);
 await pad.focus();await p.keyboard.press('Enter');await tick(.05);assert.equal((await state()).angle,2,'keyboard activation is one confirmation');
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(await p.evaluate(()=>[...document.querySelectorAll('#touchControls button,#touchControls span,#touchControls small')].filter(el=>el.scrollWidth>el.clientWidth+2).map(el=>el.textContent)),[]);
 await p.screenshot({path:path.join(dir,`single-pad-${width}x${height}-idle.png`)});assert.deepEqual(errors,[]);console.log(`${width}x${height}: pad-only drag, single tap, hold, jitter, cancellation, pause and keyboard passed`);
 }finally{await browser.close();}
}
(async()=>{await run(390,844);await run(844,390);})().catch(e=>{console.error(e);process.exitCode=1;});
