const {open}=require('./browser-driver.cjs'),R=require('../rules.js');
async function run(channel){const d=await open(channel,true);try{
 for(let i=0;i<8;i++){
  await d.chapter(i);await d.advance(.5);
  if(i===0){await d.pin(R.LEVELS[0].seal);await d.move(R.LEVELS[0].exit);}
  if(i===1){await d.tap(R.magicLayout().mirrors[0]);await d.tap(R.magicLayout().mirrors[1]);await d.pin(R.magicLayout().source);await d.move(R.magicLayout().receiver);}
  if(i===2){await d.pin({x:780,y:280});await d.move({x:440,y:365},5);}
  if(i===3){await d.pin(R.cups[0]);await d.move(R.cups[1]);}
  if(i===4){await d.pin(R.starVertices[0]);await d.tap(R.starVertices[1]);await d.move(R.starVertices[2]);}
  if(i===5){await d.shot('review-moon-visible');await d.pin(R.moonWell);for(let j=0;j<3;j++){await d.move(R.moonOptions[j]);await d.shot('review-moon-option-'+j);}await d.move(R.moonOptions[1]);}
  if(i===6){await d.pin(R.sunSource);await d.tap(R.sunKeys[0]);}
  if(i===7){await d.pin(R.worldVertices[0]);await d.move(R.worldVertices[1]);}
  await d.shot('review-'+i);await d.page.keyboard.press('Escape');await d.advance(.4);await d.button('pauseHome');
 }
 await d.close();console.log(channel+': eight scene evidence captured');
 }catch(e){await d.browser.close();throw e;}}
(async()=>{for(const c of process.argv.slice(2).length?process.argv.slice(2):['chrome','chrome-mobile','chrome-mobile-landscape'])await run(c);})().catch(e=>{console.error(e);process.exitCode=1;});
