// Storage fixture checks only. This is not used as evidence of puzzle solving.
const {chromium}=require(process.env.ECHO_PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const p=await browser.newPage(),old={completed:[0,1,2],unlocked:3,current:3,started:true,muted:true,reduced:true,checkpoints:{3:{phase:1,energy:50}}};
 await p.addInitScript(old=>{if(!localStorage.getItem('two-seconds-after-you.arcana.v2'))localStorage.setItem('two-seconds-after-you.arcana.v2',JSON.stringify(old));},old);
 await p.goto('http://127.0.0.1:4173');await p.locator('#continueGame').click();await p.waitForTimeout(500);
 const save=await p.evaluate(()=>JSON.parse(localStorage.getItem('two-seconds-after-you.arcana.v3')));assert.deepEqual(save.completed,old.completed);assert.equal(save.unlocked,3);assert.equal(save.current,3);assert.equal(save.muted,true);assert.equal(save.reduced,true);assert.equal(save.checkpoints[3].phase,0);assert.deepEqual(save.checkpoints[3].water,[8,0,0]);assert.equal(save.checkpoints[3].anchor,null);
 assert.deepEqual(await p.evaluate(()=>JSON.parse(localStorage.getItem('two-seconds-after-you.arcana.v2'))),old);
 console.log('v2 progress/settings inherited, incompatible checkpoint cleared, original v2 unchanged');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
