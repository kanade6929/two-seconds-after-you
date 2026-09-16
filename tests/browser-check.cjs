// Full eight-chapter solve through actual mouse / touch events. No state writes.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const R=require('../rules.js'),{open,dir,key}=require('./browser-driver.cjs');
async function run(channel){
 const d=await open(channel),{page,advance,state,button,move,click,pin,shot}=d;
 try{
 await shot('title');await button('start');await button('pause');const before=(await state()).t;
 await advance(8);assert.equal((await state()).t,before);await button('resume');assert.ok((await state()).t>before);
 for(let i=0;i<8;i++){
  assert.equal((await state()).index,i);await advance(.5);await shot('game-'+i);
  if(i===0){await d.tap(R.LEVELS[0].exit);assert.equal((await state()).won,false);await pin(R.LEVELS[0].seal);await move(R.LEVELS[0].exit,10);await shot('clickable');await click();}
  if(i===1){const m=R.magicLayout();await d.tap(m.mirrors[0]);await d.tap(m.mirrors[1]);await pin(m.source);await move(m.receiver,10);await shot('light-path');await click();}
  if(i===2){
   await pin({x:780,y:280});await move({x:440,y:370},10);assert.equal((await state()).view.nodes[0].active,true);assert.equal((await state()).won,false);
   await shot('lovers-four-lights');await move({x:420,y:440});assert.equal((await state()).won,true);
  }
  if(i===3){for(const[a,b]of[[0,1],[1,2],[2,0],[1,2],[0,1],[1,2],[2,0]]){if((await state()).memory)await button('release');await pin(R.cups[a]);await move(R.cups[b],4);await click();}}
  if(i===4){await pin(R.starVertices[0]);for(const n of[1,2,3,1,4,3,0,4]){await move(R.starVertices[n],4);await click();}}
  if(i===5){await shot('moon-remember');await pin(R.moonWell);await move(R.moonOptions[0],10);await click();assert.equal((await state()).won,false);await advance(3);await move(R.moonOptions[1]);await shot('moon-hidden');await click();}
  if(i===6){await pin(R.sunSource);await d.tap(R.sunKeys[0]);await shot('sun-links');await d.tap(R.sunKeys[1]);}
  if(i===7){for(const[a,b]of[[0,1],[3,2]]){if((await state()).memory)await button('release');await pin(R.worldVertices[a]);await d.tap(R.worldVertices[b]);await shot('world-linked');await d.tap(R.worldVertices[b]);}}
  assert.equal((await state()).won,true,R.LEVELS[i].title);await advance(1.3);
  console.log(channel+': '+R.LEVELS[i].title+' input-only solve passed');await button('next');
 }
 assert.equal(await page.locator('#endingScreen').isVisible(),true);
 fs.writeFileSync(path.join(dir,channel+'-completed-save.json'),await page.evaluate(key=>localStorage.getItem(key),key));
 await button('endingHome');await button('titleLevels');await shot('chapters');await button('closeLevels');
 await button('commentsButton');assert.match(await page.locator('#communityStatus').innerText(),/暂未开放/);await button('closeCommunity');
 for(const[width,height,dpr]of d.mobile?[[360,800,2],[430,932,3]]:[[1280,720,1],[1920,1080,1],[1440,900,2]]){
  const c=await d.browser.newContext({viewport:{width,height},deviceScaleFactor:dpr,...(d.mobile?{isMobile:true,hasTouch:true}:{})}),p=await c.newPage();
  await p.goto('http://127.0.0.1:4173');await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(500);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.deepEqual(await p.evaluate(()=>[...document.querySelectorAll('button,h1,h2,p')].filter(el=>el.getClientRects().length&&el.scrollWidth>el.clientWidth+2).map(el=>el.id||el.textContent)),[]);
  await p.screenshot({path:path.join(dir,channel+'-'+width+'x'+height+'-'+dpr+'x.png')});
  await p.locator('#start').press('Enter');await p.waitForTimeout(600);await p.screenshot({path:path.join(dir,channel+'-'+width+'x'+height+'-game.png')});await c.close();
 }
 await d.close();console.log(channel+': complete browser matrix passed');
 }catch(e){await shot('failure');await d.browser.close();throw e;}
}
(async()=>{for(const channel of process.argv.slice(2).length?process.argv.slice(2):['chrome','msedge','chrome-mobile','chrome-mobile-landscape'])await run(channel);})().catch(e=>{console.error(e);process.exitCode=1;});
