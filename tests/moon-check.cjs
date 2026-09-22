const assert=require('node:assert/strict'),R=require('../rules.js'),{open}=require('./browser-driver.cjs');
async function run(channel){const d=await open(channel,true);try{
 await d.chapter(5);assert.deepEqual((await d.state()).view.moonMemory.target,R.moonTarget);
 await d.move(R.moonWell,3.2);assert.equal((await d.state()).view.moonMemory.target,null);
 await d.move(R.moonOptions[0],1.1);assert.equal((await d.state()).view.actionLabel,'确认倒影');await d.click();assert.equal((await d.state()).won,false);
 await d.advance(3);assert.deepEqual((await d.state()).view.moonMemory.target,R.moonTarget);
 await d.move(R.moonWell,3.2);await d.move(R.moonOptions[1],1.1);await d.shot('moon-choice');await d.click();assert.equal((await d.state()).won,true);
 await d.close();console.log(channel+': realtime well hides answer, expires, and allows correct retry');
 }catch(e){await d.browser.close();throw e;}}
(async()=>{for(const c of ['chrome','msedge','chrome-mobile'])await run(c);})().catch(e=>{console.error(e);process.exitCode=1;});
