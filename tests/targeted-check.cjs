// Live interactions and safe recovery. Uses only a legitimately completed save.
const {open}=require('./browser-driver.cjs'),R=require('../rules.js'),assert=require('node:assert/strict');
async function run(channel){const d=await open(channel,true);try{
 await d.chapter(1);await d.tap(R.magicLayout().mirrors[0]);assert.deepEqual((await d.state()).state.orientations,[1,0]);await d.button('undo');assert.deepEqual((await d.state()).state.orientations,[0,0]);await d.tap(R.magicLayout().mirrors[1]);await d.page.reload();await d.advance(.6);await d.button('continueGame');assert.deepEqual((await d.state()).state.orientations,[0,1]);assert.equal((await d.state()).memory,null);
 await d.page.keyboard.press('Escape');await d.advance(.4);await d.button('pauseHome');await d.chapter(3);
 await d.move(R.spring,.1);for(let i=0;i<100&&(await d.state()).state.water<65;i++)await d.advance(.05);await d.move(R.rest,5);assert.equal((await d.state()).won,false);await d.shot('realtime-overflow');
 await d.tap(R.vessel);assert.equal((await d.state()).state.water,0);assert.equal((await d.state()).echo,null);
 await d.move(R.spring,.1);for(let i=0;i<80&&(await d.state()).view.water.forecast<55;i++)await d.advance(.05);await d.move(R.rest,5);assert.equal((await d.state()).won,true);
 await d.close();console.log(channel+': undo, saved optics, overfill, drain and live retry passed');
 }catch(e){await d.browser.close();throw e;}}
(async()=>{for(const c of process.argv.slice(2).length?process.argv.slice(2):['chrome','chrome-mobile','chrome-mobile-landscape'])await run(c);})().catch(e=>{console.error(e);process.exitCode=1;});
