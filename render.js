(function () {
  'use strict';
  const { WIDTH: W, HEIGHT: H, HOLD } = EchoCore;
  const C = { paper: '#090f19', ink: '#b8eee8', muted: '#91a6b9', line: '#2b3b50', red: '#edbd88', soft: '#152538' };
  class Renderer {
    constructor(canvas) { this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.lights=[]; this.doorLight=0; this.visualTime=0; this.particles=[]; this.lastGame=null; this.resize(); }
    resize() {
      const r = this.canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = Math.round(r.width * dpr); this.canvas.height = Math.round(r.height * dpr);
      this.scale = Math.min(r.width / W, r.height / H);
      this.ox = (r.width - W * this.scale) / 2; this.oy = (r.height - H * this.scale) / 2;
      this.dpr = dpr;
      // Match the CSS night sky inside the canvas as well: screen-composited
      // light maps need an opaque backdrop or their black bounds show through.
      const c = this.ctx, w = this.canvas.width, h = this.canvas.height;
      this.skyRx = w * .72 * Math.SQRT2; this.skyRy = h * .52 * Math.SQRT2;
      c.setTransform(1, 0, 0, 1, 0, 0);
      this.sky = c.createRadialGradient(0, 0, 0, 0, 0, 1);
      this.sky.addColorStop(0, '#152839'); this.sky.addColorStop(.42, '#0b1522'); this.sky.addColorStop(1, '#070c14');
      c.setTransform(1, 0, 0, 1, 0, 0);
    }
    point(e) { const r = this.canvas.getBoundingClientRect(); return { x: (e.clientX - r.left - this.ox) / this.scale, y: (e.clientY - r.top - this.oy) / this.scale, down: e.buttons === 1 }; }
    layout(game,mobile){
      this.mobile=mobile;const r=this.canvas.getBoundingClientRect();
      if(!mobile||!game){this.scale=Math.min(r.width/W,r.height/H);this.ox=(r.width-W*this.scale)/2;this.oy=(r.height-H*this.scale)/2;this.sceneBounds=null;this.layoutKey='';return;}
      const key=[game.index,game.state.phase,r.width,r.height,document.getElementById('gameBottom').hidden].join(':');if(this.layoutKey===key&&this.layoutGame===game)return;this.layoutKey=key;this.layoutGame=game;
      const landscape=r.width>r.height,heading=document.getElementById('gameHeading').getBoundingClientRect(),bottom=document.getElementById('gameBottom').getBoundingClientRect();
      const left=landscape?248:14,top=landscape?68:Math.max(190,heading.bottom+14),width=r.width-left-14,height=Math.max(100,(landscape?r.height-126:bottom.top-12)-top);
      const points=[...game.view.nodes,game.point,...(game.echo?[game.echo]:[]),...(game.view.target?[{x:600,y:185}]:[])];const minX=Math.min(...points.map(p=>p.x))-90,maxX=Math.max(...points.map(p=>p.x))+90,minY=Math.min(...points.map(p=>p.y))-65,maxY=Math.max(...points.map(p=>p.y))+85;
      const spanX=Math.max(400,maxX-minX),spanY=Math.max(280,maxY-minY);this.scale=Math.min(width/spanX,height/spanY,1);this.ox=left+width/2-(minX+maxX)/2*this.scale;this.oy=top+height/2-(minY+maxY)/2*this.scale;
      this.sceneBounds={x:minX,y:minY,width:maxX-minX,height:maxY-minY};
    }
    circle(x, y, r, color, fill = false, width = 1) {
      const c = this.ctx; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.lineWidth = width;
      if (fill) { c.fillStyle = color; c.fill(); } else { c.strokeStyle = color; c.stroke(); }
    }
    text(text, x, y, color = C.muted, size = 13, align = 'center') {
      const c = this.ctx; c.fillStyle = color; c.font = `${this.mobile?Math.max(size,11/this.scale):size}px "Arcana YueSong","SimSun",serif`; c.textAlign = align; c.fillText(text, x, y);
    }
    path(points, color, width = 1, dash = []) {
      const c = this.ctx; c.beginPath(); points.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.strokeStyle = color; c.lineWidth = width; c.setLineDash(dash); c.stroke(); c.setLineDash([]);
    }
    sigil(name, x, y, color, intensity=0, size=1) {
      const c=this.ctx;c.save();c.lineCap='butt';c.lineJoin='miter';c.shadowColor=color;c.shadowBlur=intensity*8*this.scale;
      for(const points of ArcanaSymbols.paths(name))this.path(points.map(([dx,dy])=>({x:x+dx*size,y:y+dy*size})),color,1.3);
      c.restore();
    }
    polygon(x,y,r,color,fill=false,sides=4,angle=-Math.PI/2) {
      const points=Array.from({length:sides+1},(_,i)=>({x:x+Math.cos(angle+i*Math.PI*2/sides)*r,y:y+Math.sin(angle+i*Math.PI*2/sides)*r}));
      if(fill){const c=this.ctx;c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.fillStyle=color;c.fill();}
      else this.path(points,color);
    }
    base() {
      const c = this.ctx; c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.shadowBlur = 0;
      const w = this.canvas.width, h = this.canvas.height;
      c.setTransform(this.skyRx, 0, 0, this.skyRy, w * .72, h * .48);
      c.fillStyle = this.sky; c.fillRect(-w * .72 / this.skyRx, -h * .48 / this.skyRy, w / this.skyRx, h / this.skyRy);
      c.setTransform(this.dpr * this.scale, 0, 0, this.dpr * this.scale, this.dpr * this.ox, this.dpr * this.oy);
    }
    atmosphere(t, reduced) {
      const c = this.ctx;
      for (let i = 0; i < 65; i++) {
        const x = ((i * 239.17 + 53 + (reduced ? 0 : Math.sin(t*.12+i)*14)) % 1200), y = ((i * 173.43 + 31 - (reduced ? 0 : t*(1.1+i%3))) % 650+650)%650;
        c.globalAlpha = reduced ? .2 : .12 + .14 * (1 + Math.sin(t * .35 + i * 1.7)) / 2;
        this.circle(x, y, i % 7 === 0 ? 1.15 : .6, C.muted, true);
      }
      c.globalAlpha = 1;
    }
    glow(p, color, t, reduced, alpha = 1, hollow = false) {
      const c = this.ctx, breath = reduced ? 1 : 1 + .10 * Math.sin(t * 1.45 + (hollow ? 1.4 : 0));
      c.save(); c.globalAlpha *= Math.max(0, Math.min(1, alpha));
      const radius = 53 * breath, gradient = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
      gradient.addColorStop(0, color + '50'); gradient.addColorStop(.28, color + '19'); gradient.addColorStop(1, color + '00');
      this.circle(p.x, p.y, radius, gradient, true);
      c.shadowColor = color; c.shadowBlur = 17 * this.scale;
      if (hollow) { this.circle(p.x, p.y, p.down ? 8 : 6, color, false, 1.8); this.circle(p.x, p.y, 2, '#fff2dd', true); }
      else { this.circle(p.x, p.y, p.down ? 6 : 4.5, color, true); this.circle(p.x, p.y, 2, '#f1fffc', true); }
      c.restore();
    }
    ribbon(timeline, start, end, color, opacity) {
      if (!timeline || end <= start) return;
      const points = [], cadence = 1 / 45;
      const first = timeline.at(start); if (first) points.push(first);
      // Keep every time-grid sample: distance decimation from the moving tail
      // changes ALL retained vertices at once, making slow curves shimmer.
      for (let tick = Math.floor(start / cadence) + 1; tick * cadence < end; tick++) {
        const p = timeline.at(tick * cadence);
        if (p) points.push(p);
      }
      const last = timeline.at(end); if (last) points.push(last);
      if (points.length < 2) return;
      const pixelScale = this.dpr * this.scale, ox = this.dpr * this.ox, oy = this.dpr * this.oy;
      const pad = 12 * pixelScale + 2;
      const left = Math.max(0, Math.floor(Math.min(...points.map(p => p.x)) * pixelScale + ox - pad));
      const top = Math.max(0, Math.floor(Math.min(...points.map(p => p.y)) * pixelScale + oy - pad));
      const right = Math.min(this.canvas.width, Math.ceil(Math.max(...points.map(p => p.x)) * pixelScale + ox + pad));
      const bottom = Math.min(this.canvas.height, Math.ceil(Math.max(...points.map(p => p.y)) * pixelScale + oy + pad));
      if (right <= left || bottom <= top) return;
      // An opaque, reusable light map lets 'lighten' take the maximum intensity
      // at joins/self-crossings instead of accumulating translucent round caps.
      // Black is neutral when this map is screened onto the actual night scene.
      const createLayer = () => typeof OffscreenCanvas === 'function'
        ? new OffscreenCanvas(this.canvas.width, this.canvas.height) : document.createElement('canvas');
      if (!this.ribbonLayer) this.ribbonLayer = createLayer();
      if (!this.ribbonMask) this.ribbonMask = createLayer();
      const layer = this.ribbonLayer;
      for (const surface of [layer, this.ribbonMask]) {
        if (surface.width !== this.canvas.width) surface.width = this.canvas.width;
        if (surface.height !== this.canvas.height) surface.height = this.canvas.height;
      }
      const c = layer.getContext('2d');
      c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      c.fillStyle = '#000000'; c.fillRect(left, top, right - left, bottom - top);
      c.setTransform(pixelScale, 0, 0, pixelScale, ox, oy);
      c.globalCompositeOperation = 'lighten'; c.lineCap = 'round'; c.lineJoin = 'round';
      const fade = t => {
        const u = Math.max(0, Math.min(1, (t - start) / (end - start)));
        return u * u * (3 - 2 * u);
      };
      const rgb = [1,3,5].map(n => parseInt(color.slice(n,n+2),16));
      const mask = this.ribbonMask.getContext('2d');
      mask.setTransform(1,0,0,1,0,0); mask.clearRect(left,top,right-left,bottom-top);
      mask.setTransform(pixelScale,0,0,pixelScale,ox,oy);
      mask.globalCompositeOperation = 'source-over'; mask.lineCap = 'round'; mask.lineJoin = 'round';
      mask.beginPath(); mask.moveTo(points[0].x,points[0].y);
      for (let i = 0; i < points.length - 1; i++) {
        const a = points[Math.max(0, i - 1)], b = points[i], d = points[i + 1], e = points[Math.min(points.length - 1, i + 2)];
        // Limited Catmull-Rom tangents preserve endpoints without corner spikes.
        const len = Math.hypot(d.x - b.x, d.y - b.y);
        if (len < .001) continue; // Resting samples must not become luminous dots.
        const tangent = (x, y) => { const s = Math.min(1 / 6, len / (3 * (Math.hypot(x, y) || 1))); return [x * s, y * s]; };
        const v = tangent(d.x - a.x, d.y - a.y), w = tangent(e.x - b.x, e.y - b.y);
        c.beginPath(); c.moveTo(b.x, b.y);
        c.bezierCurveTo(b.x + v[0], b.y + v[1], d.x - w[0], d.y - w[1], d.x, d.y);
        mask.bezierCurveTo(b.x + v[0], b.y + v[1], d.x - w[0], d.y - w[1], d.x, d.y);
        // Local age interpolation never rotates/reverses a whole-trail gradient.
        const gradient = c.createLinearGradient(b.x, b.y, d.x, d.y);
        // Opaque RGB stores age. A wide color field keeps segment-cap AA
        // outside the final ribbon, whose coverage is drawn as ONE path.
        const shade = t => `rgb(${rgb.map(v => (v * fade(t)).toFixed(3)).join(',')})`;
        gradient.addColorStop(0, shade(b.t)); gradient.addColorStop(1, shade(d.t));
        c.strokeStyle = gradient; c.globalAlpha = 1; c.lineWidth = 20; c.stroke();
      }
      mask.strokeStyle = '#ffffff';
      for (const [width, alpha] of [[9,.06],[4,.13],[1.2,1]]) {
        mask.globalAlpha = alpha; mask.lineWidth = width; mask.stroke();
      }
      c.setTransform(1,0,0,1,0,0); c.globalAlpha = 1; c.globalCompositeOperation = 'destination-in';
      c.drawImage(this.ribbonMask,left,top,right-left,bottom-top,left,top,right-left,bottom-top);
      const target = this.ctx;
      target.save(); target.setTransform(1, 0, 0, 1, 0, 0);
      target.globalAlpha *= Math.max(0, Math.min(1, opacity));
      target.globalCompositeOperation = 'screen'; target.shadowBlur = 0;
      target.drawImage(layer, left, top, right - left, bottom - top, left, top, right - left, bottom - top);
      target.restore();
    }
    cursors(point, echo, timeline, reduced, t) {
      const c = this.ctx;
      this.ribbon(timeline, t - (reduced ? .35 : 1.15), t, C.ink, .6);
      this.ribbon(timeline, t - (reduced ? 2.25 : 2.6), t - 2, C.red, .5);
      if (echo) this.glow(echo, C.red, t, reduced, Math.min(1, Math.max(0, (t - 2) / .3)), true);
      if (point) this.glow(point, C.ink, t, reduced);
    }

    title(point,echo,timeline,t,reduced) {
      this.base();this.atmosphere(t,reduced);
      const x=875,y=328,c=this.ctx;
      this.path([{x:x-145,y:115},{x:x+145,y:115},{x:x+158,y:128},{x:x+158,y:525},{x:x+145,y:538},{x:x-145,y:538},{x:x-158,y:525},{x:x-158,y:128},{x:x-145,y:115}],C.line);
      this.path([{x:x-142,y:140},{x:x+142,y:140}],C.line);
      this.path([{x:x-142,y:512},{x:x+142,y:512}],C.line);
      this.polygon(x,y,145,C.line);this.polygon(x,y,98,C.line);
      c.save();c.globalAlpha=reduced?.9:.8+Math.sin(t*.7)*.15;this.sigil('星星',x,y,C.ink,.5,2.1);c.restore();
      this.sigil('月亮',x-86,y-108,C.red,.3,.9);this.sigil('太阳',x+86,y+108,C.red,.3,.9);
      this.text('PAST  /  PRESENT',x,170,C.muted,10);this.text('2.00',x,465,C.red,22);
      this.cursors(null,echo,timeline,reduced,t);
    }
    mix(a,b,t) {
      return '#'+[1,3,5].map(n=>Math.round(parseInt(a.slice(n,n+2),16)+(parseInt(b.slice(n,n+2),16)-parseInt(a.slice(n,n+2),16))*Math.max(0,Math.min(1,t))).toString(16).padStart(2,'0')).join('');
    }
    burst(origin,color,count=18) {
      for(let i=0;i<count&&this.particles.length<180;i++){const a=i*2.39996,v=15+(i%5)*7;this.particles.push({x:origin.x,y:origin.y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,age:0,life:.6+i%3*.15,color});}
    }
    orbitParticles(p,amount,t,reduced,color=C.red) {
      if(reduced||amount<.01)return;const c=this.ctx;c.save();
      for(let i=0;i<10;i++){const a=t*.5+i*2.39996,r=44+i%3*4;c.globalAlpha=amount*(.2+.3*(1+Math.sin(t+i))/2);this.path([{x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r},{x:p.x+Math.cos(a)*r-Math.sin(a)*3,y:p.y+Math.sin(a)*r+Math.cos(a)*3}],color);}
      c.restore();
    }
    drawParticles(reduced) {
      if(reduced)return;const c=this.ctx;c.save();for(const p of this.particles){const f=p.age/p.life;c.globalAlpha=Math.sin(Math.PI*f)*.5;this.path([{x:p.x+p.vx*p.age,y:p.y+p.vy*p.age},{x:p.x+p.vx*(p.age-.04),y:p.y+p.vy*(p.age-.04)}],p.color);}c.restore();
    }
    ripple(origin,age,reduced) {
      const c=this.ctx;c.save();
      if(reduced){this.glow(origin,C.red,0,true,Math.max(0,1-age/.4));c.restore();return;}
      const far=Math.max(...[[0,0],[this.canvas.width,0],[0,this.canvas.height],[this.canvas.width,this.canvas.height]].map(([x,y])=>Math.hypot((x/this.dpr-this.ox)/this.scale-origin.x,(y/this.dpr-this.oy)/this.scale-origin.y)))+60;
      c.globalCompositeOperation='lighter';
      for(let i=0;i<3;i++){const f=Math.max(0,Math.min(1,(age-i*.08)/.8));if(f===0)continue;const r=20+far*(1-(1-f)**2);c.globalAlpha=(1-f)*.55;this.polygon(origin.x,origin.y,r,i%2?C.red:C.ink,false,8);this.polygon(origin.x,origin.y,r*.98,C.ink,false,8);}
      for(let i=0;i<64;i++){const a=i*2.39996,r=30+age*(160+i%9*40);c.globalAlpha=Math.max(0,1-age)*.55;this.path([{x:origin.x+Math.cos(a)*r,y:origin.y+Math.sin(a)*r},{x:origin.x+Math.cos(a)*(r+14),y:origin.y+Math.sin(a)*(r+14)}],i%2?C.red:C.ink);}
      this.glow(origin,C.red,age,true,Math.max(0,1-age));c.restore();
    }
    game(game,mode,reduced,dt=1/60) {
      if(this.lastGame!==game){this.lastGame=game;this.nodeLights=new Map();this.particles=[];this.doorLight=0;this.beamLight=0;this.lastBeams=[];this.sunLights=[0,0];}
      this.visualTime+=dt;this.particles=this.particles.filter(p=>(p.age+=dt)<p.life);
      this.base();this.atmosphere(this.visualTime,reduced);
      const c=this.ctx,v=game.view,R=EchoCore.Rules,t=this.visualTime;
      const approach=(a,b,duration)=>a+(b-a)*(1-Math.exp(-dt/(duration/3)));
      if(v.axis)this.path([{x:600,y:230},{x:600,y:490}],C.line,1,[5,7]);
      for(const line of v.lines)this.path(line,C.line);
      if(v.world){
        const points=[...R.worldVertices,R.worldVertices[0]];this.path(points,C.line,1.2);
        for(let i=0;i<32;i++){const a=R.worldPoint(i/8),b=R.worldPoint(i/8+.045);this.path([a,b],C.muted,.8);}
        this.polygon(v.guide.x,v.guide.y,7,C.ink);
      }
      this.beamLight=approach(this.beamLight,v.beams?.length?1:0,v.beams?.length?.14:.18);
      if(v.beams?.length)this.lastBeams=v.beams;
      for(const line of this.lastBeams){
        let end=line[1];
        for(const wall of v.walls){const hit=R.intersection(line[0],end,wall[0],wall[1]);if(hit)end=hit;}
        c.save();c.globalAlpha=.14*this.beamLight;this.path([line[0],end],C.ink,6);c.globalAlpha=.7*this.beamLight;this.path([line[0],end],C.ink,1.2);c.restore();
      }
      for(const line of v.walls)this.path(line,'#acb8bd',3);
      if(v.sun){
        this.sigil('太阳',600,365,C.red,game.hold>0?.7:0,1.65);
        for(let i=0;i<2;i++){const active=i===0?game.effect.left:game.effect.right;this.sunLights[i]=approach(this.sunLights[i],active?1:0,active?.14:.18);this.polygon(v.sun.receivers[i].x,v.sun.receivers[i].y,8,this.mix(C.line,i?C.ink:C.red,this.sunLights[i]),true);}
      }
      for(const star of v.stars)this.sigil('星星',star.x,star.y,C.red,0,.55);
      if(v.target){this.sigil(v.target,600,185,C.red,.3,.65);this.text('寻找此纹',650,190,C.muted,11,'left');}
      for(let i=0;i<v.nodes.length;i++){
        const n=v.nodes[i],now=R.near(game.point,n)&&n.role!=='echo',echo=R.near(game.echo,n)&&n.role!=='now';
        let active=now||echo;if(n.id==='seal')active=game.open;if(n.exit)active=game.open;
        if(n.id==='receiver')active=game.hold>0;
        const old=this.nodeLights.get(n.id)||0,light=approach(old,active?1:0,active?.14:n.exit?.16:.18);this.nodeLights.set(n.id,light);
        if(old<.05&&light>.05&&!reduced)this.burst(n,echo?C.red:C.ink,10);
        const hue=n.role==='echo'||echo?C.red:C.ink,col=this.mix('#677e90',hue,light);
        this.glow(n,hue,t,reduced,light*.13);
        this.polygon(n.x,n.y,n.exit?44:39,this.mix('#101c2a','#192b35',light),true,8,Math.PI/8);
        this.polygon(n.x,n.y,n.exit?44:39,col,false,8,Math.PI/8);
        if(n.mirror!==undefined){const ends=n.mirror===0?[[-18,0],[18,0]]:n.mirror===1?[[-15,15],[15,-15]]:[[-15,-15],[15,15]];this.path(ends.map(([x,y])=>({x:n.x+x,y:n.y+y})),col,2);}
        else this.sigil(n.sigil,n.x,n.y,col,light,.72);
        this.orbitParticles(n,light,t,reduced,hue);
        const labelColor=this.mix(C.muted,hue,light);
        if(game.level.id==='star'&&!game.ready)this.text(this.mobile?n.label[0]:n.label,n.x+(n.role==='echo'?-48:48),n.y+4,labelColor,12,n.role==='echo'?'right':'left');
        else this.text(n.label,n.x,n.y+59,labelColor,12);
        const amount=n.id==='seal'?game.sealHold/.4:n.exit?game.exitHold/.25:n.id==='source'?(game.timers.source||0)/.4:n.id==='well'?(game.timers.well||0)/.4:n.id==='learn'?(game.timers.learn||0)/.4:active?v.progress:0;
        if(amount>0){this.path([{x:n.x-20,y:n.y+45},{x:n.x+20,y:n.y+45}],C.line,2);this.path([{x:n.x-20,y:n.y+45},{x:n.x-20+40*Math.min(1,amount),y:n.y+45}],hue,2);}
        if(v.energy){const energy=v.energy[i];this.text(Math.round(energy*100)+'%',n.x,n.y+80,energy>=.45&&energy<=.55?C.ink:C.red,12);this.path([{x:n.x-27,y:n.y+90},{x:n.x+27,y:n.y+90}],C.line,3);this.path([{x:n.x-27,y:n.y+90},{x:n.x-27+54*energy,y:n.y+90}],C.red,3);}
      }
      if(game.ready){this.text(game.open?'门印有光':'影子守印 0.4 秒',game.level.seal.x,game.level.seal.y-64,C.muted,11);this.text(game.exitHold>=.25?'可以点击':'停稳 0.25 秒',game.level.exit.x,game.level.exit.y-64,C.muted,11);}
      const progress=game.ready?Math.min(1,game.exitHold/.25):v.progress;
      if(!this.mobile){this.path([{x:515,y:542},{x:685,y:542}],C.line,2);if(progress>0)this.path([{x:515,y:542},{x:515+170*progress,y:542}],C.red,2);}
      c.save();c.globalAlpha=mode==='celebrate'?.4:1;this.cursors(null,game.echo,game.timeline,reduced,game.t);c.restore();
      this.drawParticles(reduced);
    }
  }
  window.EchoRenderer=Renderer;
})();
