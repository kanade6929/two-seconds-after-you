// Freshly solved saves only; all puzzle changes use real UI input.
const assert=require('node:assert/strict'),R=require('../rules.js'),{open}=require('./browser-driver.cjs');
async function run(channel){
 const d=await open(channel,true),{page,advance,state,button,move,click,pin,chapter,shot}=d;
 try{
 await chapter(2);await pin({x:780,y:280});await move({x:450,y:360},5);
 const saved=(await state()).memory;assert.equal((await state()).view.nodes[0].active,true);
 await button('release');assert.equal((await state()).memory,null);
 await button('undo');assert.deepEqual((await state()).memory,saved);assert.equal((await state()).view.nodes[0].active,true);
 await page.keyboard.press('Escape');await advance(.5);const paused=(await state()).t;await advance(10);assert.equal((await state()).t,paused);
 await page.reload();await advance(.6);await button('continueGame');
 assert.equal((await state()).memory,null);assert.equal((await state()).pending.id,'reflection');
 await move({x:780,y:495},2.1);assert.ok(Math.abs((await state()).memory.x-saved.x)<.01);
 await move({x:450,y:350},3);await shot('mirror-restored');await move({x:420,y:440},3);assert.equal((await state()).won,true);
 await advance(1.3);await button('next');assert.equal((await state()).index,3);
 await pin(R.cups[0]);await d.tap(R.cups[1]);assert.deepEqual((await state()).state.water,[3,5,0]);
 await button('undo');assert.deepEqual((await state()).state.water,[8,0,0]);await d.tap(R.cups[1]);
 await page.keyboard.press('Escape');await advance(.4);await page.reload();await advance(.5);await button('continueGame');
 assert.deepEqual((await state()).state.water,[3,5,0]);assert.equal((await state()).memory,null);await advance(2.1);
 await shot('cups-restored');await page.keyboard.press('Escape');await advance(.4);await button('pauseRetry');assert.deepEqual((await state()).state.water,[8,0,0]);assert.equal((await state()).pending,null);
 await advance(26);await button('hintButton');assert.equal(await page.locator('#hint').isVisible(),true);await shot('hint');
 await button('hintNext');assert.match(await page.locator('#hintText').innerText(),/大→中/);await button('closeHint');
 await d.close();console.log(channel+': mirror roles, undo, freeze, refresh, cups and hints passed');
 }catch(e){await shot('targeted-failure');await d.browser.close();throw e;}
}
(async()=>{for(const c of ['chrome','chrome-mobile','chrome-mobile-landscape'])await run(c);})().catch(e=>{console.error(e);process.exitCode=1;});
