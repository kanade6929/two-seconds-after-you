// Input-only visual sequence captures; read-only observations of presentation events.
const assert=require('node:assert/strict'),{open}=require('./browser-driver.cjs');
async function run(channel){const d=await open(channel);try{
  await d.shot('cosmos-title');await d.button('start');await d.advance(.9);await d.shot('cosmos-tutorial');
  await d.move({x:600,y:470},2.2);await d.click();await d.advance(.3);await d.shot('cosmos-click-now');
  const events=()=>d.page.evaluate(()=>({time:__observed.g.feedback.time,pending:__observed.g.feedback.pending,ripples:__observed.g.feedback.ripples}));
  let e=await events();assert.equal(e.pending.length,1);const target=e.pending[0];
  await d.page.keyboard.press('Escape');await d.advance(3);assert.deepEqual(await events(),e);await d.button('resume');
  await d.advance(Math.max(0,target.t-(await events()).time+.22));e=await events();const echo=e.ripples.find(r=>r.role==='echo');assert.ok(echo);assert.equal(echo.x,target.x);assert.equal(echo.y,target.y);await d.shot('cosmos-click-echo');
  await d.move({x:465,y:365},3.2);await d.move({x:735,y:365},1.3);const camera=await d.page.evaluate(()=>[__observed.r.scale,__observed.r.ox,__observed.r.oy]);await d.click();assert.equal((await d.state()).won,true);
  await d.advance(.6);assert.deepEqual(await d.page.evaluate(()=>[__observed.r.scale,__observed.r.ox,__observed.r.oy]),camera);await d.shot('cosmos-win-wave');await d.advance(1.4);await d.shot('cosmos-win-trails');await d.advance(1.45);await d.shot('cosmos-win-return');await d.advance(1);assert.equal(await d.page.locator('#completeScreen').isVisible(),true);
  await d.button('next');await d.page.keyboard.press('Escape');await d.advance(.7);await d.button('pauseHome');await d.button('motion');await d.button('start');await d.advance(1);await d.shot('cosmos-reduced');
  await d.move({x:465,y:365},3.2);await d.move({x:735,y:365},1.3);await d.click();await d.advance(.7);await d.shot('cosmos-win-reduced');await d.advance(2);assert.equal(await d.page.locator('#completeScreen').isVisible(),true);
  console.log(channel+': click echo/pause, ceremony/recovery, reduced-motion passed');await d.close();
}catch(e){await d.shot('cosmos-failure');await d.browser.close();throw e;}}
(async()=>{for(const c of process.argv.slice(2).length?process.argv.slice(2):['chrome','chrome-mobile','chrome-mobile-landscape'])await run(c);})().catch(e=>{console.error(e);process.exitCode=1;});
