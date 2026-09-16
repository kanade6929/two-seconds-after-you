// Isolated installed-browser integration. No game progression is assigned by tests.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.ECHO_PLAYWRIGHT_MODULE||'playwright');
const R=require('../rules.js');
const dir=path.join(__dirname,'../artifacts/browser');fs.mkdirSync(dir,{recursive:true});
async function run(channel){
 const mobile=channel.includes('mobile'),browser=await chromium.launch({channel:mobile?'chrome':channel,headless:true});
 const context=await browser.newContext(mobile?{viewport:channel.includes('landscape')?{width:844,height:390}:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3}:{viewport:{width:1440,height:900}}),page=await context.newPage(),errors=[],cdp=mobile?await context.newCDPSession(page):null;
 page.on('pageerror',e=>errors.push(e.message));await page.clock.install({time:new Date('2026-09-16T00:00:00Z')});await page.clock.pauseAt(new Date('2026-09-16T00:00:01Z'));
 await page.addInitScript(()=>{let renderer;Object.defineProperty(window,'EchoRenderer',{get(){return renderer;},set(R){renderer=class extends R{game(g,mode,...args){window.__observed={g,mode,r:this};return super.game(g,mode,...args);}};}});});
 await page.goto('http://127.0.0.1:4173');await page.evaluate(()=>document.fonts.ready);assert.equal(await page.evaluate(()=>document.fonts.check('16px "Arcana YueSong"')),true);await page.clock.runFor(500);
 const advance=s=>page.clock.runFor(Math.round(s*1000));
 const state=()=>page.evaluate(()=>window.__observed?{mode:window.__observed.mode,index:window.__observed.g.index,t:window.__observed.g.t,point:window.__observed.g.point,echo:window.__observed.g.echo,ready:window.__observed.g.ready,won:window.__observed.g.won,phase:window.__observed.g.state.phase,energy:window.__observed.g.state.energy,attempt:window.__observed.g.state.attempt,sequence:window.__observed.g.state.sequence,effect:window.__observed.g.effect,open:window.__observed.g.open}:null);
 async function press(on){if(mobile){const b=await page.locator('#touchConfirm').boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:on?'touchStart':'touchEnd',touchPoints:on?[{x:b.x+b.width/2,y:b.y+b.height/2}]:[]});}else if(on)await page.mouse.down();else await page.mouse.up();}
 async function move(p,s=1.6){if(mobile){const r=await page.evaluate(()=>({s:window.__observed.r.scale,x:window.__observed.r.ox,y:window.__observed.r.oy})),x=r.x+p.x*r.s,y=r.y+p.y*r.s;const hit=await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.id,{x,y});assert.equal(hit,'canvas',channel+' gameplay target obscured '+JSON.stringify({p,x,y,hit}));await page.touchscreen.tap(x,y);}else{const v=page.viewportSize(),scale=Math.min(v.width/1200,v.height/650);await page.mouse.move((v.width-1200*scale)/2+p.x*scale,(v.height-650*scale)/2+p.y*scale);}await advance(s);}
 async function button(id){if(mobile)await page.locator('#'+id).scrollIntoViewIfNeeded();const box=await page.locator('#'+id).boundingBox();assert.ok(box,id+' visible');if(mobile)await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);else{await page.mouse.move(box.x+box.width/2,box.y+box.height/2);if(await page.locator('body').evaluate(el=>el.classList.contains('light-cursor')))await advance(3.8);await page.mouse.down();await page.mouse.up();}await advance(.45);}
 async function click(){await press(true);await press(false);await advance(.03);}
 async function until(fn,p,limit=6){for(let i=0;i<limit*20;i++){if(fn(await state()))return;await move(p,.05);}await page.screenshot({path:path.join(dir,channel+'-failure.png')});throw Error(channel+' timeout '+JSON.stringify(await state()));}
 await page.screenshot({path:path.join(dir,channel+'-1440-title.png')});
 await button('start');assert.equal((await state()).index,0);
 await button('pause');const paused=await state();if(mobile)await advance(2);else await move({x:1000,y:100},2);assert.equal((await state()).t,paused.t);await button('resume');assert.ok((await state()).t>paused.t);
 if(mobile){const pad=await page.locator('#touchPad').boundingBox(),x=pad.x+pad.width/2,y=pad.y+pad.height/2,before=(await state()).point;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+35,y:y-12}]});await advance(.7);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});const after=(await state()).point;assert.ok(after.x>before.x+20,'touchpad drag moves virtual light');}
 for(let index=0;index<8;index++){
  const l=R.LEVELS[index];assert.equal((await state()).index,index);
  await page.screenshot({path:path.join(dir,`${channel}-game-${index}.png`)});
  if(index===0){await move(l.seal,3);await until(g=>g.open,l.exit);await page.screenshot({path:path.join(dir,channel+'-clickable.png')});await click();}
  if(index===1)for(let phase=0;phase<3;phase++){await advance(.5);const m=R.magicLayout(phase),angles=[[0,1],[1,1],[2,2]][phase];for(let i=0;i<2;i++)for(let n=0;n<angles[i];n++){await move(m.mirrors[i]);await click();}await move(m.source,3);await until(g=>g.open,m.receiver);await click();}
  if(index===2)for(let phase=0;phase<3;phase++){const [past,now]=R.loversPairs[phase];await move(past,1.6);await press(true);await advance(1.5);await press(false);await move(now,.95);await press(true);await advance(.8);await press(false);assert.ok((await state()).phase>phase||(await state()).won,'paired press '+phase);}
  if(index===3)for(let phase=0;phase<2;phase++){await advance(.5);await move(R.balancePads[phase===0?2:1],3);await until(g=>g.phase>phase||g.won,R.balancePads[phase===0?4:5]);}
  if(index===4)for(let phase=0;phase<4;phase++){await advance(.5);const m=R.starLayout(phase);await move(m.reversed?m.b:m.a,3);await until(g=>g.open,m.reversed?m.a:m.b);await click();}
  if(index===5)for(let phase=0;phase<3;phase++){await advance(.5);await move(R.moonWell,3);for(let seq=0;seq<2;seq++){await until(g=>g.open,R.moonOptions[R.moonMaps[phase].indexOf(R.moonTargets[phase][seq])]);await click();}assert.ok((await state()).phase>phase||(await state()).won);}
  if(index===6)for(let phase=0;phase<3;phase++){const m=R.sunLayout(phase);await move({x:780,y:490},2);await move({x:400,y:490},2);await move(m.pads[0],3);const y=phase===1?408:322;await move({x:565,y},.45);await move({x:635,y},.35);await move(m.pads[1],.5);if(phase===2){await press(true);await advance(1);await press(false);}else await until(g=>g.phase>phase,m.pads[1],3);}
  if(index===7)for(const [past,now]of [[0,1],[3,2]]){await move(R.worldVertices[past],3);for(let n=0;n<2;n++){await until(g=>g.open,R.worldVertices[now]);await page.screenshot({path:path.join(dir,channel+'-world-linked.png')});await click();}}
  assert.equal((await state()).won,true,l.title+' integrated ending');
  await advance(1.3);if(index===2)await page.screenshot({path:path.join(dir,channel+'-complete.png')});
  console.log(channel+': '+l.title+' solved with mouse input');await button('next');
 }
 assert.equal(await page.locator('#endingScreen').isVisible(),true);fs.writeFileSync(path.join(dir,channel+'-completed-save.json'),await page.evaluate(()=>localStorage.getItem('two-seconds-after-you.arcana.v2')));await button('endingHome');await button('titleLevels');await page.screenshot({path:path.join(dir,channel+'-chapters.png')});await button('closeLevels');
 await button('commentsButton');assert.match(await page.locator('#communityStatus').innerText(),/暂未开放/);assert.equal(await page.locator('#submitComment').isDisabled(),true);await button('closeCommunity');
 for(const [width,height,dpr]of mobile?[[360,800,2],[390,844,3],[430,932,3],[844,390,2]]:[[1280,720,1],[1440,900,1],[1920,1080,1],[1440,900,2]]){
  const c=await browser.newContext({viewport:{width,height},deviceScaleFactor:dpr,...(mobile?{isMobile:true,hasTouch:true}:{})});const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:4173');await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(400);await p.screenshot({path:path.join(dir,`${channel}-${width}-${height}-${dpr}x.png`)});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  const clipped=await p.evaluate(()=>[...document.querySelectorAll('button,h1,h2,p')].filter(el=>el.getClientRects().length&&el.scrollWidth>el.clientWidth+2).map(el=>el.id||el.textContent));assert.deepEqual(clipped,[],'font overflow');
  assert.match(await p.locator('body').evaluate(el=>getComputedStyle(el).fontFamily),/Arcana YueSong/);await p.locator('#start').press('Enter');await p.waitForTimeout(500);await p.screenshot({path:path.join(dir,`${channel}-${width}-${height}-${dpr}x-game.png`)});await c.close();
 }
 assert.deepEqual(errors,[]);await browser.close();console.log(channel+': browser matrix passed');
}
(async()=>{for(const channel of process.argv.slice(2).length?process.argv.slice(2):['chrome','msedge'])await run(channel);})().catch(e=>{console.error(e);process.exit(1);});
