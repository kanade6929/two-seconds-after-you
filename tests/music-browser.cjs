// Real decode/playback graph plus input-only gameplay smoke; no level state writes.
const {chromium}=require(process.env.ECHO_PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict');
async function run(channel){const mobile=channel.includes('mobile'),browser=await chromium.launch({channel:mobile?'chrome':channel,headless:true});try{
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},hasTouch:mobile,isMobile:mobile}),p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await context.addInitScript(()=>{let M;Object.defineProperty(window,'NightMusic',{get:()=>M,set(C){M=class extends C{constructor(...args){super(...args);window.__music=this;}};}});});
 await p.goto('http://127.0.0.1:4173');assert.equal(await p.evaluate(()=>!!window.__music),false);
 if(mobile)await p.locator('#start').tap();else await p.locator('#start').click();await p.waitForFunction(()=>window.__music?.source&&__music.buffer);
 const audio=await p.evaluate(()=>{const b=__music.buffer,ends=[];for(let c=0;c<b.numberOfChannels;c++){const a=b.getChannelData(c);ends.push(Math.abs(a[0]-a[a.length-1]));}return{duration:b.duration,channels:b.numberOfChannels,loop:__music.source.loop,seams:ends,state:__music.context.state};});
 assert.ok(Math.abs(audio.duration-96)<.05);assert.equal(audio.channels,2);assert.equal(audio.loop,true);assert.equal(audio.state,'running');assert.ok(audio.seams.every(x=>x<.00001));
 await p.keyboard.press('Escape');await p.waitForTimeout(700);if(mobile)await p.locator('#pauseHome').tap();else await p.locator('#pauseHome').click();await p.waitForTimeout(700);
 const press=async id=>{if(mobile)await p.locator('#'+id).tap();else await p.locator('#'+id).click();};
 await press('sound');assert.equal(await p.evaluate(()=>__music.source===null&&!__music.enabled),true);const offset=await p.evaluate(()=>__music.offset);await press('sound');await p.waitForFunction(()=>!!__music.source);assert.ok(await p.evaluate(o=>Math.abs(__music.offset-o)<.01,offset));
 // Rapid repeated gesture cannot create simultaneous loops.
 const same=await p.evaluate(async()=>{const s=__music.source;await Promise.all([__music.start(),__music.start()]);return s===__music.source;});assert.equal(same,true);
 // Exercise page lifecycle handlers without pretending this is an Android OS test.
 await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});assert.equal(await p.evaluate(()=>__music.source),null);
 await p.evaluate(()=>{delete document.hidden;});await press('sound');await press('sound');await p.waitForFunction(()=>!!__music.source);
 const result=await p.evaluate(()=>({status:__music.status,source:!!__music.source}));assert.equal(result.status,'ready');assert.deepEqual(errors,[]);console.log(channel+': decoded loop, seam, autoplay gate, mute/resume, hidden-page stop passed',audio);
 const failed=await context.newPage();await failed.route('**/night-tide.mp3',route=>route.fulfill({status:503,body:'unavailable'}));await failed.goto('http://127.0.0.1:4173');await failed.locator('#start').click();await failed.waitForFunction(()=>window.__music?.status==='unavailable');assert.equal(await failed.locator('#gameHeading').isVisible(),true);await failed.close();
}finally{await browser.close();}}
(async()=>{for(const c of['chrome','msedge','chrome-mobile'])await run(c);})().catch(e=>{console.error(e);process.exitCode=1;});
