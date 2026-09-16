(function (root) {
  'use strict';
  const STEP = 1 / 120, DELAY = 2, HOLD = .2, WIDTH = 1200, HEIGHT = 650;
  const LEVELS=[
    {title:'留一下',arcana:'0 · 愚者',rule:'hold',description:'先停一下，再离开。让两秒前的自己接手。',
      switches:[{x:370,y:350,label:'留一束光'}],exit:{x:850,y:350},
      hint:'在左侧停留半秒，再到出口。暖金影子抵达开关时，点击亮起的门。',done:'过去的你，接住了现在。',after:'短短两秒，也足够成为彼此的依靠。'},
    {title:'交换位置',arcana:'VI · 恋人',rule:'swap',description:'先昔在左、现在右；再交换身份，完成第二次共鸣。',
      switches:[{x:375,y:380,label:'左岸'},{x:825,y:380,label:'右岸'}],exit:{x:600,y:240},
      hint:'先在左岸留光，再去右岸等影子，完成第一段。随后回到左岸，等影子到右岸，各占位 0.3 秒。两段都会保留。',done:'换一个位置，看见自己。',after:'配合，也可以是把刚才的角色交给对方。'},
    {title:'借光穿行',arcana:'VII · 战车',rule:'gate',description:'只有过去能开闸。让影子守住左侧，自己从光隙穿过。',
      switches:[{x:310,y:350,label:'昔 · 开闸',role:'echo'}],exit:{x:935,y:350},gate:{x:610,y:350,half:88},spawn:{x:180,y:490},
      hint:'左侧开关只接受暖金影子。在它上面停半秒，移到闸门前等待；光隙打开后，从中央横穿，再点击出口。上下绕行不可穿越屏障。',done:'有人留在身后，路就打开了。',after:'过去守着那道门，你只管向前。'},
    {title:'月下的回信',arcana:'XVIII · 月亮',rule:'code',description:'依次点击月亮 → 星星 → 月亮 → 太阳。两秒后的回声会替你叩门。',
      switches:[{x:330,y:365,name:'星星',label:'XVII · 星星'},{x:590,y:285,name:'月亮',label:'XVIII · 月亮'},{x:820,y:390,name:'太阳',label:'XIX · 太阳'}],exit:{x:1030,y:300},code:[1,0,1,2],
      hint:'依次点击月亮、星星、月亮、太阳，每次等光点靠近再点。只有两秒后重播的点击才算输入；多点或点错会清空暗号，等旧回声结束再重输。单纯停留不会点亮。',done:'月光里，传来你的回信。',after:'星星记住了那句暗号，太阳在回声尽头等你。'},
    {title:'追光与对拍',arcana:'XVII · 星星',rule:'orbit',description:'留住过去，跟随移动的现在。共鸣后，在门环的亮拍点击。',
      switches:[{x:400,y:355,label:'现 · 跟随',role:'now'},{x:800,y:370,label:'昔 · 留光',role:'echo'}],exit:{x:970,y:250},orbit:{index:0,cx:400,cy:355,r:68,speed:.65},beat:{period:2.4,window:.65},
      hint:'先在右侧留光，再跟随左侧缓慢公转的机关。青白与暖金同时正确占位 0.55 秒就保留共鸣。随后去出口，门环指针进入亮区时点击；错过拍子不会失败。',done:'终于，和自己合上了拍。',after:'追赶之后，记得等一等恰好的时刻。'},
    {title:'恰好的余温',arcana:'XIV · 节制',rule:'balance',description:'三盏灯都保持在刻度带内：35%—85%。太暗或太满，都无法共鸣。',
      switches:[{x:320,y:345,label:'第一盏'},{x:580,y:275,label:'第二盏'},{x:800,y:400,label:'第三盏'}],exit:{x:1020,y:290},
      hint:'短暂触碰各盏灯，让亮度进入外圈标出的 35%—85% 区间。影子也会充能，所以要预留余量；太满就离开等它衰减。三盏同时达标 0.4 秒后永久开门。',done:'光不必盛满，便足够温暖。',after:'掌握节奏，也包括懂得何时离开。'},
    {title:'拨动光弦',arcana:'I · 魔术师',rule:'beam',description:'影子守住锚点，你来转动光弦，依次穿过三枚棱晶。',
      switches:[{x:300,y:360,label:'昔 · 光弦锚点',role:'echo'}],targets:[{x:520,y:280},{x:570,y:425},{x:640,y:330}],exit:{x:1030,y:400},
      hint:'在左侧锚点留光，再把自己移到第一枚棱晶后方，让两光点之间的直线穿过它约 0.25 秒；依次扫过第二、第三枚。棱晶按顺序编号，进度保留；影子离开可重新留光继续。',done:'距离，也可以奏出声音。',after:'彼此之间的牵连，是你拨动的那根弦。'},
    {title:'世界的回环',arcana:'XXI · 世界',rule:'finale',description:'先点击月亮 → 星星 → 月亮，再用光弦点亮双晶，最后在亮拍叩门。',
      switches:[{x:300,y:260,name:'星星',label:'XVII · 星星'},{x:550,y:245,name:'月亮',label:'XVIII · 月亮'},{x:350,y:365,label:'昔 · 锚点',role:'echo'}],code:[1,0,1],targets:[{x:650,y:275},{x:650,y:455}],exit:{x:1000,y:340},beat:{period:2.8,window:.7},
      hint:'先按月亮、星星、月亮点击，等待影子输入完成。然后在下方锚点留光，移到两枚棱晶后方，依次用光弦穿过它们约 0.3 秒。暗号和棱晶进度保留，最后在出口门环亮拍点击。',done:'所有的你，终于相遇。',after:'从愚者迈出的第一步，到世界温柔的回环，每一束光都是你。'}
  ];
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  class Timeline {
    constructor() { this.samples = []; }
    add(t, p) {
      const s = { t, x: p.x, y: p.y, down: !!p.down };
      if (this.samples.length && this.samples[this.samples.length - 1].t === t) this.samples[this.samples.length - 1] = s;
      else this.samples.push(s);
      while (this.samples.length > 2 && this.samples[1].t < t - 3.2) this.samples.shift();
    }
    at(t) {
      const a = this.samples;
      if (!a.length || t < a[0].t - 1e-7) return null;
      if (t >= a[a.length - 1].t) return { ...a[a.length - 1] };
      let lo = 0, hi = a.length - 1;
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (a[mid].t <= t) lo = mid; else hi = mid; }
      const f = (t - a[lo].t) / (a[hi].t - a[lo].t);
      return { x: a[lo].x + (a[hi].x - a[lo].x) * f, y: a[lo].y + (a[hi].y - a[lo].y) * f, down: a[lo].down, t };
    }
  }
  // Exact critically damped spring: smooth acceleration and arrival, no overshoot.
  // Both collision and replay consume this same filtered position.
  class Follower {
    constructor(p) { this.reset(p); }
    reset(p) { this.x = p.x; this.y = p.y; this.vx = 0; this.vy = 0; this.down = !!p.down; }
    update(dt, target, reduced = false) {
      const omega = reduced ? 60 : 32, decay = Math.exp(-omega * dt);
      for (const axis of ['x', 'y']) {
        const velocity = 'v' + axis, delta = this[axis] - target[axis];
        const temp = (this[velocity] + omega * delta) * dt;
        this[axis] = target[axis] + (delta + temp) * decay;
        this[velocity] = (this[velocity] - omega * temp) * decay;
        if (Math.abs(this[axis] - target[axis]) < .015 && Math.abs(this[velocity]) < .05) { this[axis] = target[axis]; this[velocity] = 0; }
      }
      this.down = !!target.down;
      return { x: this.x, y: this.y, down: this.down };
    }
  }
  function readProgress(raw = {}) {
    if (!raw || typeof raw !== 'object') raw = {};
    const last = LEVELS.length - 1;
    const completed = Array.isArray(raw.completed) ? [...new Set(raw.completed.filter(n => Number.isInteger(n) && n >= 0 && n <= last))] : [];
    const unlocked = Math.min(last, Math.max(Number.isInteger(raw.unlocked) ? raw.unlocked : 0, ...completed.map(n => n + 1), 0));
    return { completed, unlocked, current:Number.isInteger(raw.current) ? Math.max(0,Math.min(unlocked,raw.current)) : unlocked,
      started:raw.started === true || completed.length > 0 || unlocked > 0 };
  }
  function segmentDistance(p,a,b){
    const dx=b.x-a.x,dy=b.y-a.y,len=dx*dx+dy*dy;
    const u=len?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/len)):0;
    return Math.hypot(p.x-a.x-u*dx,p.y-a.y-u*dy);
  }
  class Game{
    constructor(index=0,point={x:600,y:540}){
      this.index=index;this.level=LEVELS[index];this.t=0;this.point={...(this.level.spawn||point),down:false};this.echo=null;
      this.timeline=new Timeline();this.timeline.add(0,this.point);this.hold=0;this.latched=false;this.open=false;this.won=false;
      this.failed=false;this.windowArmed=false;this.grace=0;this.phase=0;this.crystal=0;this.codeDone=false;this.codeError=0;this.inputQueue=[];
      this.beamOn=false;this.gateOpen=false;this.blocked=false;this.beatPhase=0;this.pulse=this.level.switches.map(()=>0);
      this.lit=this.level.switches.map(()=>false);this.energy=this.level.switches.map(()=>0);this.active=this.level.switches.map(()=>({now:false,echo:false}));
      this.positions=this.switchPositions(0);
    }
    switchPositions(t=this.t){return this.level.switches.map((s,i)=>{
      const o=this.level.orbit;return o&&o.index===i?{...s,x:o.cx+Math.cos(t*o.speed)*o.r,y:o.cy+Math.sin(t*o.speed)*o.r}:{...s};});}
    update(dt,input,click=false){
      if(this.won||this.failed)return;this.t+=dt;const l=this.level,rule=l.rule;
      let point={...input};this.echo=this.timeline.at(this.t-DELAY);this.positions=this.switchPositions();this.blocked=false;
      if(l.gate){
        const gate=l.gate;this.gateOpen=!!this.echo&&distance(this.echo,l.switches[0])<=44;
        if(!this.latched&&point.x>=gate.x-7){
          const frac=Math.max(0,Math.min(1,(gate.x-this.point.x)/(point.x-this.point.x||1)));
          const crossingY=this.point.y+(point.y-this.point.y)*frac;
          if(!this.gateOpen||Math.abs(crossingY-gate.y)>gate.half-10){point.x=gate.x-8;this.blocked=true;}
          else if(point.x>=gate.x+7)this.latched=true;
        }
      }
      this.point=point;this.timeline.add(this.t,point);this.echo=this.timeline.at(this.t-DELAY);
      this.active=this.positions.map(s=>({now:distance(s,point)<=44,echo:!!this.echo&&distance(s,this.echo)<=44}));
      const a=this.active;this.pulse=this.pulse.map(v=>Math.max(0,v-dt*1.2));this.codeError=Math.max(0,this.codeError-dt);
      if(click&&l.code&&!this.codeDone)this.inputQueue.push({t:this.t,p:{...point}});
      while(this.inputQueue.length&&this.inputQueue[0].t<=this.t-DELAY+1e-7){
        const event=this.inputQueue.shift();
        if(l.code&&!this.codeDone){const index=this.positions.findIndex(s=>distance(s,event.p)<=44);
          if(index>=0&&index<=(rule==='finale'?1:2)){
            this.pulse[index]=1;
            if(index===l.code[this.phase])this.phase++;else{this.phase=0;this.codeError=1.3;}
            if(this.phase===l.code.length){this.codeDone=true;this.lit=this.lit.map((v,i)=>i<2||rule==='code');}
          }
        }
      }
      let together=false,need=HOLD;
      if(rule==='swap'){together=this.phase===0?(a[0].echo&&a[1].now):(a[1].echo&&a[0].now);need=.3;}
      if(rule==='orbit'){together=a[0].now&&a[1].echo;need=.55;}
      if(rule==='balance'){
        this.energy=this.energy.map((v,i)=>Math.max(0,Math.min(1,v+((a[i].now||a[i].echo)?dt*.9:-dt*.14))));
        together=this.energy.every(v=>v>=.35&&v<=.85);need=.4;
      }
      if(rule==='beam'||rule==='finale'){
        const anchor=rule==='beam'?0:2;this.beamOn=!!this.echo&&a[anchor].echo&&(rule==='beam'||this.codeDone);
        const target=l.targets[this.crystal];
        together=this.beamOn&&!!target&&distance(point,this.echo)>140&&segmentDistance(target,point,this.echo)<20;
        need=rule==='beam'?.25:.3;
      }
      this.hold=together?this.hold+dt:0;
      if(this.hold>=need-1e-7&&!this.latched){
        if(rule==='swap'){this.phase++;if(this.phase>=2)this.latched=true;}
        else if(rule==='beam'||rule==='finale'){this.crystal++;if(this.crystal>=l.targets.length)this.latched=true;}
        else this.latched=true;
        this.hold=0;
      }
      if(rule==='code'&&this.codeDone)this.latched=true;
      let powered=rule==='hold'?(a[0].now||a[0].echo):this.latched;
      if(l.beat){this.beatPhase=(this.t%l.beat.period)/l.beat.period;powered=powered&&this.beatPhase<l.beat.window/l.beat.period;}
      this.grace=powered?(l.beat?0:.65):Math.max(0,this.grace-dt);this.open=powered||this.grace>1e-7;
      if(rule==='hold'&&a[0].echo&&!a[0].now)this.windowArmed=true;
      if(click&&this.open&&distance(point,l.exit)<=49)this.won=true;
      if(rule==='hold'&&this.windowArmed&&!this.open&&!this.won)this.failed=true;
    }
    status(){const r=this.level.rule;
      if(this.open)return '现在，点击亮起的出口。';
      if(this.level.beat&&this.latched)return '共鸣已保留。等待门环指针进入亮区，再点击。';
      if(r==='swap')return this.phase===0?'第一段：过去在左，你在右。':'第一段已保留。交换：过去在右，你在左。';
      if(r==='gate')return this.latched?'你已经穿过屏障。前往出口。':this.gateOpen?'光隙已打开，从中间穿过去。':'在左侧留光；等待暖金影子开闸，青白从中间穿行。';
      if(r==='code'||(r==='finale'&&!this.codeDone))return this.codeError?'暗号不对，回声已清空。等旧回声结束再输入。':'回声输入 '+this.phase+' / '+this.level.code.length+'：'+this.level.code.map(n=>this.level.switches[n].name).join(' → ')+'。请点击。';
      if(r==='orbit')return '暖金守住右侧，青白跟随公转机关，共鸣 0.55 秒。';
      if(r==='balance')return '把三盏光调在刻度带内：'+this.energy.map(v=>Math.round(v*100)+'%').join(' / ')+'。影子也会充能。';
      if(r==='beam'||r==='finale')return '棱晶 '+this.crystal+' / '+this.level.targets.length+'。影子守锚点，你在目标后方，用光弦依次扫过。';
      return '在左侧停留约半秒，再到右侧等待过去的光。';
    }
  }
  const api = { STEP, DELAY, HOLD, WIDTH, HEIGHT, LEVELS, distance, segmentDistance, Timeline, Follower, Game, readProgress };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.EchoCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
