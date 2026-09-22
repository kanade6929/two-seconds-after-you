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
  if(i===0){await move(R.LEVELS[0].seal,3.2);await move(R.LEVELS[0].exit,1.3);await shot('realtime-door');await click();}
  if(i===1){const m=R.magicLayout();await d.tap(m.mirrors[0]);await d.tap(m.mirrors[1]);await move(m.source,3.2);await move(m.receiver,1.4);await shot('realtime-magic');await click();}
  if(i===2){await move(R.mirrorPoint(R.loversSeals[0]),3.2);await move(R.mirrorPoint(R.loversSeals[1]),1.25);await shot('realtime-lovers');await advance(.7);}
  if(i===3){await move(R.spring,.1);for(let t=0;t<80&&(await state()).view.water.forecast<55;t++)await advance(.05);await shot('realtime-temperance');await move(R.rest,5);}
  if(i===4){await move(R.starLeft[2],3.2);await move(R.starRight[0],1.1);await shot('realtime-star');await advance(.9);}
  if(i===5){await shot('moon-remember');await move(R.moonWell,3.2);await move(R.moonOptions[1],1.1);await shot('moon-hidden');await click();}
  if(i===6){await move(R.sunPads[1],3.2);await move(R.sunPads[2],1.1);await shot('realtime-sun');await advance(.9);}
  if(i===7){for(let k=0;k<4;k++){await move(R.worldVertices[k],3.2);await move(R.worldVertices[(k+1)%4],1.8);if(k===0)await shot('realtime-world');}}
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
