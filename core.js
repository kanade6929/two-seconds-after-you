(function(root){
  'use strict';
  const Rules=typeof module!=='undefined'&&module.exports?require('./rules.js'):root.ArcanaRules;
  const {LEVELS,dist:distance,near,clamp,segmentDistance}=Rules,STEP=1/120,DELAY=2,WIDTH=1200,HEIGHT=650,HOLD=.4,MAX_SPEED=420,MAX_ACCEL=1600;
  class Timeline{
    constructor(){this.samples=[];}
    add(t,p){const s={t,x:p.x,y:p.y,down:!!p.down},a=this.samples;if(a.length&&a[a.length-1].t===t)a[a.length-1]=s;else a.push(s);while(a.length>2&&a[1].t<t-3.2)a.shift();}
    at(t){const a=this.samples;if(!a.length||t<a[0].t-1e-7)return null;if(t<=a[0].t)return {...a[0]};if(t>=a[a.length-1].t)return {...a[a.length-1]};let lo=0,hi=a.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(a[m].t<=t)lo=m;else hi=m;}
      // Fixed-step sums can land just before the exact two-second sample.
      // Snap numerical dust only, so press/release is not replayed one tick late.
      if(Math.abs(t-a[lo].t)<1e-7)return {...a[lo]};if(Math.abs(t-a[hi].t)<1e-7)return {...a[hi]};
      const f=(t-a[lo].t)/(a[hi].t-a[lo].t);return {t,x:a[lo].x+(a[hi].x-a[lo].x)*f,y:a[lo].y+(a[hi].y-a[lo].y)*f,down:a[lo].down};}
  }
  class Follower{
    constructor(p){this.reset(p);}
    reset(p){this.x=p.x;this.y=p.y;this.vx=0;this.vy=0;this.down=!!p.down;}
    update(dt,target){
      for(let remaining=dt;remaining>1e-8;){const h=Math.min(STEP,remaining);remaining-=h;
        const dx=target.x-this.x,dy=target.y-this.y,d=Math.hypot(dx,dy),speed=Math.min(MAX_SPEED,d*(d<3?4:9),Math.sqrt(1.25*MAX_ACCEL*d)),tx=d?dx/d*speed:0,ty=d?dy/d*speed:0,dvx=tx-this.vx,dvy=ty-this.vy,dv=Math.hypot(dvx,dvy),f=dv?Math.min(1,MAX_ACCEL*h/dv):1;
        this.vx+=dvx*f;this.vy+=dvy*f;const mx=this.vx*h,my=this.vy*h;
        if(mx*dx+my*dy>=d*d&&d<Math.hypot(mx,my)+.001){this.x=target.x;this.y=target.y;this.vx=this.vy=0;}else{this.x+=mx;this.y+=my;}
        if(distance(this,target)<.025&&Math.hypot(this.vx,this.vy)<.4){this.x=target.x;this.y=target.y;this.vx=this.vy=0;}
      }this.down=!!target.down;return {x:this.x,y:this.y,down:this.down};
    }
  }
  function readProgress(raw={}){if(!raw||typeof raw!=='object')raw={};const max=LEVELS.length-1,completed=Array.isArray(raw.completed)?[...new Set(raw.completed.filter(n=>Number.isInteger(n)&&n>=0&&n<=max))]:[],unlocked=clamp(Math.max(0,...completed.map(n=>n+1),Number.isInteger(raw.unlocked)?raw.unlocked:0),0,max),current=clamp(Number.isInteger(raw.current)?raw.current:0,0,unlocked),checkpoints={};for(let i=0;i<LEVELS.length;i++){const c=raw.checkpoints?.[i];if(c&&c.phase===0){const s=Rules.create(i,c),anchor=Rules.restoreAnchor(i,c);checkpoints[i]={...s,anchor:anchor?.id||null,...(anchor?.id==='reflection'?{anchorPoint:{x:anchor.x,y:anchor.y}}:{})};}}return {completed,unlocked,current,started:raw.started===true||completed.length>0,checkpoints};}
  // One thumb surface: tap confirms, drag moves, a still press holds.
  // Distances are CSS pixels, so touch slop is independent of the game camera.
  class TouchGesture{
    constructor(){this.cancel();}
    cancel(){this.id=null;this.age=0;this.dragging=false;this.held=false;}
    start(id,x,y){if(this.id!==null)return false;this.id=id;this.x=this.startX=x;this.y=this.startY=y;this.age=0;this.dragging=false;this.held=false;return true;}
    move(id,x,y){
      if(this.id!==id)return null;
      if(!this.dragging&&Math.hypot(x-this.startX,y-this.startY)<=8)return null;
      this.dragging=true;this.held=false;const delta={x:x-this.x,y:y-this.y};this.x=x;this.y=y;return delta;
    }
    step(dt){if(this.id!==null&&!this.dragging){this.age+=dt;if(this.age>=.22-1e-8)this.held=true;}return this.held;}
    end(id){if(this.id!==id)return false;const tap=!this.dragging&&!this.held;this.cancel();return tap;}
  }
  // Presentation events use game time, not wall time or sampled button edges.
  // Even a press/release between two logic ticks receives exactly one echo.
  class ClickFeedback{
    constructor(){this.clear();}
    clear(){this.time=0;this.pending=[];this.ripples=[];this.sounds=[];}
    emit(p,t,role){const e={x:p.x,y:p.y,t,role};this.ripples.push(e);this.sounds.push(role);if(this.ripples.length>32)this.ripples.shift();if(this.sounds.length>16)this.sounds.shift();}
    click(p,t){this.emit(p,t,'now');this.pending.push({x:p.x,y:p.y,t:t+DELAY});if(this.pending.length>32)this.pending.shift();}
    advance(t){this.time=t;while(this.pending.length&&this.pending[0].t<=t+1e-7){const e=this.pending.shift();this.emit(e,e.t,'echo');}this.ripples=this.ripples.filter(e=>t-e.t<1.35);}
  }
  class Game{
    constructor(index=0,checkpoint={}){this.index=index;this.level=LEVELS[index];this.state=Rules.create(index,checkpoint);this.point={...this.level.spawn,down:false};this.echo=null;this.t=0;this.timeline=new Timeline();this.timeline.add(0,this.point);this.timers={};this.contacts={};this.hold=0;this.need=1;this.open=false;this.won=false;this.ready=false;this.winOrigin={...this.point};this.revision=0;this.progressAt=0;this.effect={};this.blocked=false;this.memory=null;this.pending=null;this.history=[];const anchor=Rules.restoreAnchor(index,checkpoint);if(anchor)this.pending={...anchor,at:2};this.view=Rules.view(this);}
    update(dt,input,click=false){
      if(this.won)return;
      if(this.transition){this.transition.remaining=Math.max(0,this.transition.remaining-dt);if(this.transition.remaining<1e-8)this.transition=null;return;}
      this.t+=dt;this.blocked=false;let p={x:input.x,y:input.y,down:!!input.down};
      const walls=this.view.walls||[];let nearest=null;
      for(const [a,b]of walls){const hit=Rules.intersection(this.point,p,a,b);if(hit&&hit.t>1e-7&&(!nearest||hit.t<nearest.t))nearest=hit;}
      if(nearest){const dx=p.x-this.point.x,dy=p.y-this.point.y,n=Math.hypot(dx,dy)||1;p={x:nearest.x-dx/n*2,y:nearest.y-dy/n*2,down:p.down};this.blocked=true;}
      this.point=p;this.timeline.add(this.t,p);this.echo=this.timeline.at(this.t-DELAY);
      if(!this.feedback)this.feedback=new ClickFeedback();
      if(click)this.feedback.click(p,this.t);
      this.feedback.advance(this.t);
      const before=click?this.snapshot():null,revision=this.revision;
      Rules.update(this,dt,click);
      if(this.index===1&&click&&this.revision!==revision){this.history.push(before);if(this.history.length>64)this.history.shift();}
    }
    checkpoint(){return Rules.checkpoint(this);}
    snapshot(){return {state:JSON.parse(JSON.stringify(this.state)),memory:this.memory&&{...this.memory},pending:this.pending&&{...this.pending,at:this.pending.at-this.t}};}
    clearEcho(){this.memory=this.pending=this.echo=null;this.feedback?.clear();this.timeline=new Timeline();this.timeline.add(this.t,this.point);this.timers={};this.contacts={};this.hold=0;this.effect={};this.state.pourSamples=[];this.view=Rules.view(this);this.ready=this.open=false;}
    undo(){if(this.won||this.index!==1)return false;const past=this.history.pop();if(!past)return false;this.state=past.state;this.state.error=0;this.clearEcho();this.revision++;this.progressAt=this.t;return true;}
    release(){if(this.won)return false;this.clearEcho();if(this.index===3)this.state.water=0;this.state.error=0;this.revision++;this.progressAt=this.t;this.view=Rules.view(this);return true;}
    status(){return this.view.message;}
  }
  const api={STEP,DELAY,HOLD,WIDTH,HEIGHT,MAX_SPEED,MAX_ACCEL,LEVELS,Rules,distance,segmentDistance,Timeline,Follower,TouchGesture,ClickFeedback,Game,readProgress};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.EchoCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
