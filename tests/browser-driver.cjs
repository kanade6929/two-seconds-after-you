// Observe renderer state only. Every gameplay action uses browser pointer input.
const {chromium}=require(process.env.ECHO_PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'../artifacts/browser'),key='two-seconds-after-you.arcana.v4';
async function open(channel='chrome',saved=false){
 const mobile=channel.includes('mobile'),landscape=channel.includes('landscape');
 const browser=await chromium.launch({channel:mobile?'chrome':channel,headless:true});
 const context=await browser.newContext({viewport:mobile?(landscape?{width:844,height:390}:{width:390,height:844}):{width:1440,height:900},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?3:1});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 // Gameplay regression is offline/deterministic; real service has its own opt-in test.
 await page.route('**/community-config.js',r=>r.fulfill({contentType:'text/javascript',body:'window.ECHO_COMMUNITY_CONFIG={url:"",publishableKey:""}'}));
 await page.clock.install({time:new Date('2026-09-16T00:00:00Z')});await page.clock.pauseAt(new Date('2026-09-16T00:00:01Z'));
 await page.addInitScript(({save,key})=>{
  if(save&&!localStorage.getItem(key))localStorage.setItem(key,save);
  let Renderer;Object.defineProperty(window,'EchoRenderer',{get(){return Renderer;},set(R){Renderer=class extends R{game(g,mode,...args){window.__observed={g,mode,r:this};return super.game(g,mode,...args);}};}});
 },{key,save:saved?fs.readFileSync(path.join(dir,'chrome-completed-save.json'),'utf8'):null});
 await page.goto('http://127.0.0.1:4173');await page.evaluate(()=>document.fonts.ready);
 const advance=s=>page.clock.runFor(Math.round(s*1000));await advance(.5);
 const state=()=>page.evaluate(()=>{const o=window.__observed;if(!o)return null;const g=o.g;return {mode:o.mode,index:g.index,t:g.t,point:g.point,echo:g.echo,ready:g.ready,won:g.won,phase:g.state.phase,state:g.state,memory:g.memory,pending:g.pending,view:g.view,open:g.open};});
 async function button(id){const el=page.locator('#'+id);if(mobile){await el.scrollIntoViewIfNeeded();await el.tap();}else{const b=await el.boundingBox();assert.ok(b,id+' visible');await page.mouse.move(b.x+b.width/2,b.y+b.height/2);if(await page.locator('body').evaluate(e=>e.classList.contains('light-cursor')))await advance(3.8);await page.mouse.down();await page.mouse.up();}await advance(.5);}
 async function move(p,seconds=2.2){const q=await page.evaluate(p=>({x:__observed.r.rect.left+__observed.r.ox+p.x*__observed.r.scale,y:__observed.r.rect.top+__observed.r.oy+p.y*__observed.r.scale}),p);
  assert.equal(await page.evaluate(q=>document.elementFromPoint(q.x,q.y)?.id,q),'canvas',channel+' target is not covered by UI '+JSON.stringify({p,q}));
  if(mobile)await page.touchscreen.tap(q.x,q.y);else await page.mouse.move(q.x,q.y);await advance(seconds);
 }
 async function click(){if(mobile)await page.locator('#touchPad').tap();else{await page.mouse.down();await page.mouse.up();}await advance(.04);}
 async function tap(p){await move(p);await click();}
 async function pin(p){await tap(p);await advance(2.1);}
 async function chapter(index){await button('titleLevels');const el=page.locator('#levelItems button').nth(index);if(mobile)await el.tap();else await el.click();await advance(.6);}
 async function shot(name){fs.mkdirSync(dir,{recursive:true});await page.screenshot({path:path.join(dir,channel+'-'+name+'.png')});}
 async function close(){assert.deepEqual(errors,[]);await browser.close();}
 return{browser,context,page,mobile,advance,state,button,move,click,tap,pin,chapter,shot,close};
}
module.exports={open,dir,key};
