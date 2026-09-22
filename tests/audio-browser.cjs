// Checks real Web Audio nodes, not subjective speaker/headphone quality.
const {chromium}=require(process.env.ECHO_PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true}),p=await b.newPage();try{
 await p.clock.install();await p.clock.pauseAt(new Date());
 await p.addInitScript(()=>{const A=window.AudioContext;window.__sound={contexts:0,freq:[],gains:[],convolvers:0,active:0,max:0};window.AudioContext=class extends A{
  constructor(...a){super(...a);__sound.contexts++;}
  createOscillator(){const o=super.createOscillator(),set=o.frequency.setValueAtTime.bind(o.frequency);o.frequency.setValueAtTime=(f,t)=>{__sound.freq.push(f);return set(f,t);};__sound.active++;__sound.max=Math.max(__sound.max,__sound.active);o.addEventListener('ended',()=>__sound.active--);return o;}
  createGain(){const g=super.createGain();__sound.gains.push(g);return g;}
  createConvolver(){__sound.convolvers++;return super.createConvolver();}
 };let R;Object.defineProperty(window,'EchoRenderer',{get:()=>R,set(C){R=class extends C{game(g,m,...a){window.__audioView={g,m,r:this};return super.game(g,m,...a);}};}});});
 await p.goto('http://127.0.0.1:4173');await p.locator('#start').click();await p.clock.runFor(800);
 const move=async(x,y,s)=>{const q=await p.evaluate(({x,y})=>({x:__audioView.r.ox+x*__audioView.r.scale,y:__audioView.r.oy+y*__audioView.r.scale}),{x,y});await p.mouse.move(q.x,q.y);await p.clock.runFor(s*1000);};
 await move(600,470,2);await p.mouse.down();await p.mouse.up();await p.clock.runFor(2100);
 let stats=await p.evaluate(()=>({contexts:__sound.contexts,convolvers:__sound.convolvers,freq:__sound.freq,max:__sound.max}));assert.equal(stats.contexts,1);assert.equal(stats.convolvers,1);assert.ok(stats.freq.some(f=>Math.abs(f-587.3295358)<.001));assert.ok(stats.freq.some(f=>Math.abs(f-293.6647679)<.001));
 const offset=stats.freq.length;await p.mouse.down();await p.mouse.up();await p.clock.runFor(2100);const phrase=await p.evaluate(()=>__sound.freq);assert.ok(phrase.slice(offset).some(f=>Math.abs(f-739.988845)<.001));assert.ok(phrase.slice(offset).some(f=>Math.abs(f-369.9944227)<.001));
 await p.keyboard.press('Escape');await p.clock.runFor(700);await p.locator('#pauseHome').click();await p.clock.runFor(700);await p.locator('#sound').click();
 const before=await p.evaluate(()=>__sound.freq.length);await p.locator('#start').click();await p.clock.runFor(800);await move(600,470,2);await p.mouse.down();await p.mouse.up();await p.clock.runFor(2100);assert.equal(await p.evaluate(()=>__sound.freq.length),before);
 console.log('real Web Audio: one context/reverb, distinct current/echo pitches, mute prevents voices; listening quality not asserted');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
