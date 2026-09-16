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
    circle(x, y, r, color, fill = false, width = 1) {
      const c = this.ctx; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.lineWidth = width;
      if (fill) { c.fillStyle = color; c.fill(); } else { c.strokeStyle = color; c.stroke(); }
    }
    text(text, x, y, color = C.muted, size = 13, align = 'center') {
      const c = this.ctx; c.fillStyle = color; c.font = `${size}px "Microsoft YaHei UI",sans-serif`; c.textAlign = align; c.fillText(text, x, y);
    }
    path(points, color, width = 1, dash = []) {
      const c = this.ctx; c.beginPath(); points.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.strokeStyle = color; c.lineWidth = width; c.setLineDash(dash); c.stroke(); c.setLineDash([]);
    }
    sigil(name, x, y, color, intensity = 0) {
      // Tarot totems use straight strokes exclusively, including the moon.
      const c = this.ctx;
      const stroke = (pairs, width = 1.35) => this.path(pairs.map(([dx,dy]) => ({x:x+dx,y:y+dy})), color, width);
      c.save(); c.lineCap = 'butt'; c.lineJoin = 'miter'; c.miterLimit = 2;
      c.shadowColor = color; c.shadowBlur = intensity * 9 * this.scale;
      if (name === '星星') {
        stroke([[0,-22],[5,-6],[20,0],[5,6],[0,22],[-5,6],[-20,0],[-5,-6],[0,-22]]);
        stroke([[-13,-13],[13,13]],.85); stroke([[13,-13],[-13,13]],.85);
        stroke([[0,-6],[4,0],[0,6],[-4,0],[0,-6]],.9);
      } else if (name === '月亮') {
        stroke([[7,-22],[-8,-17],[-17,-5],[-17,7],[-7,19],[7,22],[-1,10],[-5,0],[-1,-10],[7,-22]]);
        stroke([[13,-7],[16,0],[13,7],[10,0],[13,-7]],1);
        stroke([[-23,0],[-20,0]],1);
      } else if (name === '太阳') {
        stroke([[0,-11],[11,0],[0,11],[-11,0],[0,-11]]);
        stroke([[0,-5],[5,0],[0,5],[-5,0],[0,-5]],.8);
        for (let i=0;i<8;i++) {
          const a=i*Math.PI/4;
          stroke([[Math.cos(a)*16,Math.sin(a)*16],[Math.cos(a)*24,Math.sin(a)*24]],i%2?1:1.4);
        }
      }
      c.restore();
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
    title(point, echo, timeline, t, reduced) {
      this.base(); this.atmosphere(t, reduced); const c = this.ctx;
      const x = 850, y = 300;
      this.circle(x, y, 170, C.line); this.circle(x, y, 112, C.line);
      this.path([{ x: x - 222, y }, { x: x + 222, y }], C.line, 1, [2, 7]);
      this.path([{ x, y: y - 222 }, { x, y: y + 222 }], C.line, 1, [2, 7]);
      const angle = reduced ? -.55 : t * .17 - .55;
      const p = { x: x + Math.cos(angle) * 170, y: y + Math.sin(angle) * 170 };
      const e = { x: x + Math.cos(angle - .8) * 170, y: y + Math.sin(angle - .8) * 170 };
      c.beginPath(); c.arc(x, y, 170, angle - .8, angle); c.strokeStyle = C.red; c.lineWidth = 1.5; c.stroke();
      this.glow(p, C.ink, t, reduced); this.glow(e, C.red, t, reduced, 1, true);
      this.text('2.00', x, y + 8, C.ink, 36); this.text('秒 的 距 离', x, y + 40, C.muted, 12);
      this.text('NOW', x + 200, y + 4, C.muted, 10); this.text('THEN', x, y - 238, C.muted, 10);
      this.cursors(point, echo, timeline, reduced, t);
    }
    mix(a,b,t) {
      const channel=(s,n)=>parseInt(s.slice(n,n+2),16);
      return '#'+[1,3,5].map(n=>Math.round(channel(a,n)+(channel(b,n)-channel(a,n))*Math.max(0,Math.min(1,t))).toString(16).padStart(2,'0')).join('');
    }
    updateVisuals(game,dt,reduced,mode) {
      if(this.lastGame!==game){this.lastGame=game;this.lights=game.active.map(()=>({now:0,echo:0,level:0}));this.doorLight=0;this.latchLight=0;this.chargeLight=0;this.gateLight=0;this.beamLight=0;this.crystalLights=(game.level.targets||[]).map(()=>0);this.particles=[];this.fadeAt=null;}
      this.visualTime+=dt;
      const approach=(v,target,tau)=>v+(target-v)*(1-Math.exp(-dt/tau));
      game.active.forEach((a,i)=>{
        const light=this.lights[i], role=game.level.switches[i].role;
        const now=a.now&&role!=='echo', echo=a.echo&&role!=='now';
        const retained=game.lit[i];
        const codeOnly=game.level.rule==='code'||(game.level.rule==='finale'&&i<2);
        const target=mode==='failed'?0:game.level.rule==='balance'?game.energy[i]:retained?1:codeOnly?game.pulse[i]:(now||echo?1:0);
        if(!reduced&&target>.8&&light.level<.08) this.burst(game.positions[i],echo?C.red:C.ink,18);
        light.now=approach(light.now,now?1:0,.35);light.echo=approach(light.echo,echo||retained?1:0,.45);
        light.level=approach(light.level,target,target>light.level?.15:.6);
      });
      const target=mode==='failed'?0:game.open?Math.max(.25,game.grace/.65):0;
      this.doorLight=approach(this.doorLight,target,target>this.doorLight?.18:.45);
      this.latchLight=approach(this.latchLight,game.latched?1:0,.25);
      this.chargeLight=approach(this.chargeLight,game.latched?0:Math.min(1,game.hold/.3),.18);
      this.gateLight=approach(this.gateLight||0,game.gateOpen||game.latched?1:0,.25);
      this.beamLight=approach(this.beamLight||0,game.beamOn?1:0,.18);
      this.crystalLights=this.crystalLights.map((v,i)=>approach(v,mode==='failed'?0:i<game.crystal?1:0,.25));
      this.particles=this.particles.filter(p=>(p.age+=dt)<p.life);
    }
    burst(origin,color,count=28) {
      for(let i=0;i<count&&this.particles.length<240;i++){
        const a=i*2.39996, speed=13+(i%7)*7;
        this.particles.push({x:origin.x,y:origin.y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,age:0,life:1.1+(i%5)*.2,color});
      }
    }
    drawParticles(reduced) {
      if(reduced)return;
      const c=this.ctx;c.save();
      for(const p of this.particles){const f=p.age/p.life,travel=(1-Math.exp(-p.age*1.3))/1.3;
        c.globalAlpha=Math.sin(Math.PI*f)*.55;
        // Short drifting motes, separate from the continuous cursor ribbon.
        this.path([{x:p.x+p.vx*travel,y:p.y+p.vy*travel},{x:p.x+p.vx*travel-p.vx*.045,y:p.y+p.vy*travel-p.vy*.045}],p.color,1);
      }c.restore();
    }
    orbitParticles(origin,intensity,t,reduced,color=C.ink){
      if(reduced||intensity<.01)return;
      const c=this.ctx;c.save();
      for(let i=0;i<18;i++){
        const a=t*(i%2?.7:-.48)+i*2.39996,r=52+(i%4)*6+Math.sin(t+i)*3;
        c.globalAlpha=intensity*(.3+.45*(.5+.5*Math.sin(t*1.7+i)));
        const x=origin.x+Math.cos(a)*r,y=origin.y+Math.sin(a)*r;
        this.path([{x,y},{x:x-Math.sin(a)*4,y:y+Math.cos(a)*4}],color,i%5===0?1.7:1);
      }c.restore();
    }
    ripple(origin,age,reduced){
      const c=this.ctx,max=Math.max(...[[0,0],[this.canvas.width/this.dpr,0],[0,this.canvas.height/this.dpr],[this.canvas.width/this.dpr,this.canvas.height/this.dpr]].map(([x,y])=>Math.hypot((x-this.ox)/this.scale-origin.x,(y-this.oy)/this.scale-origin.y)))+100;
      c.save();
      if(reduced){this.glow(origin,C.red,0,true,Math.max(0,1-age/.5));c.restore();return;}
      c.globalCompositeOperation='lighter';
      // A gathering corona, a single bright bloom, then three chromatic wavefronts.
      if(age<.4){
        const f=age/.4;c.globalAlpha=1-f*.3;
        this.circle(origin.x,origin.y,90*(1-f)+12,C.ink,false,2+f*5);
        this.glow(origin,C.red,0,true,.7+f);
      }
      const burst=Math.max(0,age-.16),fade=Math.max(0,1-burst/2.4);
      if(burst>0){
        const bloom=c.createRadialGradient(origin.x,origin.y,0,origin.x,origin.y,220);
        bloom.addColorStop(0,'#fff4d9');bloom.addColorStop(.12,'#edbd8880');bloom.addColorStop(.6,'#89e5ed25');bloom.addColorStop(1,'#89e5ed00');
        c.globalAlpha=Math.exp(-burst*4)*.9;this.circle(origin.x,origin.y,220,bloom,true);
      }
      const colors=[C.ink,C.red,'#9ebce8'];
      for(let j=0;j<3;j++){
        const t=burst-j*.14;if(t<=0)continue;
        const f=Math.min(1,t/1.4),r=20+max*(1-Math.pow(1-f,2)),a=Math.max(0,1-t/2.2);
        const wash=c.createRadialGradient(origin.x,origin.y,Math.max(0,r-100),origin.x,origin.y,r+15);
        wash.addColorStop(0,colors[j]+'00');wash.addColorStop(.55,colors[j]+'16');wash.addColorStop(.86,colors[j]+'62');wash.addColorStop(1,colors[j]+'00');
        c.globalAlpha=a*.7;this.circle(origin.x,origin.y,r+15,wash,true);
        c.globalAlpha=a*.85;this.circle(origin.x,origin.y,r,colors[j],false,2.5-j*.6);
      }
      for(let i=0;i<100;i++){
        const a=i*2.39996,speed=95+(i%17)*24,travel=speed*(1-Math.exp(-burst*1.5));
        const r=18+travel,x=origin.x+Math.cos(a)*r,y=origin.y+Math.sin(a)*r;
        c.globalAlpha=fade*fade*(.4+(i%3)*.2);
        this.path([{x,y},{x:x-Math.cos(a)*(8+burst*18),y:y-Math.sin(a)*(8+burst*18)}],colors[i%3],i%7===0?2:1);
      }
      c.globalAlpha=Math.exp(-burst*2.6)*.4;
      this.path([{x:origin.x-500,y:origin.y},{x:origin.x+500,y:origin.y}],C.ink,2);
      c.restore();
    }
    game(game, mode, reduced, dt=1/60) {
      this.updateVisuals(game,dt,reduced,mode);
      this.base(); this.atmosphere(this.visualTime, reduced); const c = this.ctx, l = game.level, e = l.exit;
      const active = game.active;
      const doorColor=this.mix(C.line,C.red,this.doorLight);
      const switches=game.positions;
      if(l.orbit)this.circle(l.orbit.cx,l.orbit.cy,l.orbit.r,C.line,false,1);
      if(l.gate){
        const g=l.gate,col=this.mix('#476179',C.red,this.gateLight),gap=g.half*this.gateLight;
        const top=-this.oy/this.scale,bottom=(this.canvas.height/this.dpr-this.oy)/this.scale;
        this.path([{x:g.x,y:top},{x:g.x,y:g.y-gap}],col,2);
        this.path([{x:g.x,y:g.y+gap},{x:g.x,y:bottom}],col,2);
        this.text(game.gateOpen?'光隙已打开':'由过去开闸',g.x,g.y-110,col,12);
      }
      if(l.targets){
        if(game.echo&&this.beamLight>.01){
          c.save();c.globalAlpha=this.beamLight*.15;this.path([game.echo,game.point],C.ink,8);
          c.globalAlpha=this.beamLight*.8;this.path([game.echo,game.point],C.ink,1.5);c.restore();
        }
        l.targets.forEach((p,i)=>{
          const lit=this.crystalLights[i],color=this.mix(i===game.crystal?C.ink:C.muted,C.red,lit);
          this.path([{x:p.x,y:p.y-14},{x:p.x+10,y:p.y},{x:p.x,y:p.y+14},{x:p.x-10,y:p.y},{x:p.x,y:p.y-14}],color,1.6);
          this.text(String(i+1).padStart(2,'0'),p.x,p.y+36,color,12);
          if(lit>.01)this.orbitParticles(p,lit*.6,this.visualTime,reduced,C.red);
        });
      }else if(!l.gate){
        switches.forEach(s=>this.path([{x:s.x,y:s.y},{x:e.x,y:e.y}],doorColor,1));
      }
      if(l.code){
        this.text(l.code.map((v,i)=>i<game.phase?'✓':l.switches[v].name).join('   →   '),600,190,game.codeError?'#e9a19b':C.red,17);
      }
      switches.forEach((s, i) => {
        const a = active[i], light=this.lights[i], hue=this.mix(C.ink,C.red,light.echo),color=this.mix('#627b92',hue,light.level);
        this.glow(s,hue,this.visualTime,reduced,light.level*.18);
        this.orbitParticles(s,light.level,this.visualTime,reduced,hue);
        this.circle(s.x, s.y, 44, this.mix('#101c2a',this.mix('#172e35','#282322',light.echo),light.level), true);
        this.circle(s.x, s.y, 44, color, false, 1+light.level*.5);
        if (s.name) this.sigil(s.name, s.x, s.y, color, light.level);
        else this.circle(s.x, s.y, 34, C.line, false, 1);
        if(s.role)this.text(s.role==='now'?'现':'昔',s.x,s.y+5,s.role==='now'?C.ink:C.red,12);
        else if(!s.name)this.circle(s.x, s.y, 3, color, true);
        // The remaining arc is the visible afterglow, decaying instead of snapping off.
        if(light.level>.01){c.beginPath();c.arc(s.x,s.y,39,-Math.PI/2,-Math.PI/2+Math.PI*2*light.level);c.strokeStyle=color;c.lineWidth=1.5;c.stroke();}
        if(this.chargeLight>.01){c.save();c.globalAlpha=this.chargeLight;c.beginPath();c.arc(s.x,s.y,49,-Math.PI/2,-Math.PI/2+Math.PI*2*this.chargeLight);c.strokeStyle=C.red;c.lineWidth=2;c.stroke();c.restore();}
        this.text(s.label, s.x, s.y + 67, this.mix(C.muted,hue,light.level), 12);
        if(l.rule==='balance'){
          c.beginPath();c.arc(s.x,s.y,52,-Math.PI/2+Math.PI*2*.35,-Math.PI/2+Math.PI*2*.85);c.strokeStyle=C.ink;c.lineWidth=2;c.stroke();
          this.text(Math.round(game.energy[i]*100)+'%',s.x,s.y+88,game.energy[i]>.85?C.red:C.muted,11);
        }
      });
      this.glow(e,C.red,this.visualTime,reduced,this.doorLight*.3);
      this.circle(e.x, e.y, 49, this.mix('#101c2a','#282322',this.doorLight), true);
      this.circle(e.x, e.y, 49, doorColor, false, 1.5);
      if(l.beat){
        c.beginPath();c.arc(e.x,e.y,61,-Math.PI/2,-Math.PI/2+Math.PI*2*l.beat.window/l.beat.period);c.strokeStyle=C.red;c.lineWidth=4;c.stroke();
        const a=game.beatPhase*Math.PI*2-Math.PI/2;
        this.path([{x:e.x+Math.cos(a)*55,y:e.y+Math.sin(a)*55},{x:e.x+Math.cos(a)*68,y:e.y+Math.sin(a)*68}],C.ink,2);
      }
      const col = this.mix('#7990a5',C.red,this.doorLight);
      // Door halves separate when its circuit has power.
      const gap = this.doorLight*12;
      this.path([{ x: e.x - 15 - gap, y: e.y + 20 }, { x: e.x - 15 - gap, y: e.y - 20 }, { x: e.x - gap, y: e.y - 20 }], col, 1.5);
      this.path([{ x: e.x + gap, y: e.y - 20 }, { x: e.x + 15 + gap, y: e.y - 20 }, { x: e.x + 15 + gap, y: e.y + 20 }], col, 1.5);
      c.save();c.globalAlpha=this.doorLight;this.circle(e.x,e.y,3,C.red,true);c.restore();
      this.text(game.open ? '出口已打开 · 点击' : '出口', e.x, e.y + 80, this.mix(C.muted,C.red,this.doorLight), 13);
      const fading=['celebrate','complete','failed','ending'].includes(mode)?this.visualTime-(this.fadeAt??this.visualTime):0;
      if(['celebrate','failed'].includes(mode)){if(this.fadeAt==null)this.fadeAt=this.visualTime;}else if(mode==='play')this.fadeAt=null;
      c.save();c.globalAlpha=Math.max(0,1-fading/1.4);this.cursors(game.point,game.echo,game.timeline,reduced,game.t);c.restore();
      this.drawParticles(reduced);
      if (mode === 'reconnect') {
        this.circle(game.point.x, game.point.y, 34, C.red, false, 1.5);
        this.text('从这里继续', game.point.x, game.point.y - 47, C.red, 13);
      }
      if (!game.echo) this.text('过去的你正在赶来…', 600, 535, C.muted, 12);
    }
  }
  window.EchoRenderer = Renderer;
})();
