const assert=require('node:assert/strict'),R=require('../rules.js'),{open}=require('./browser-driver.cjs');
async function run(channel){
 const d=await open(channel,true),{state,advance,button,move,click,pin,shot}=d;
 try{
 await d.chapter(5);assert.deepEqual((await state()).view.moonMemory.target,R.moonTarget);
 await pin(R.moonWell);assert.equal((await state()).view.moonMemory.target,null);
 await move(R.moonOptions[0],10);assert.equal((await state()).view.actionLabel,'确认倒影');await click();assert.equal((await state()).won,false);
 await advance(3);assert.equal((await state()).view.moonMemory.target,null);
 await button('release');assert.deepEqual((await state()).view.moonMemory.target,R.moonTarget);
 await pin(R.moonWell);await move(R.moonOptions[1],10);assert.equal((await state()).view.actionLabel,'确认倒影');await shot('moon-choice');await click();assert.equal((await state()).won,true);
 await d.close();console.log(channel+': one memory puzzle; no answer or cue leakage, release and retry passed');
 }catch(e){await d.browser.close();throw e;}
}
(async()=>{for(const c of ['chrome','msedge','chrome-mobile'])await run(c);})().catch(e=>{console.error(e);process.exitCode=1;});
