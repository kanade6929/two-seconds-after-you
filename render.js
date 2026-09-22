(function () {
  'use strict';
  const { WIDTH: W, HEIGHT: H, HOLD } = EchoCore;
  const C = { paper: '#090f19', ink: '#b8eee8', muted: '#91a6b9', line: '#2b3b50', red: '#edbd88', soft: '#152538' };
  class Renderer {
    constructor(canvas) { this.canvas = canvas; this.ctx = canvas.getContext('2d',{alpha:false}); this.lights=[]; this.doorLight=0; this.visualTime=0; this.particles=[]; this.lastGame=null; this.resize(); }
    layer(width,height){const c=typeof OffscreenCanvas==='function'?new OffscreenCanvas(width,height):document.createElement('canvas');c.width=width;c.height=height;return c;}
    resize() {
      const r = this.canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, this.mobileDpr||2);
      this.canvas.width = Math.round(r.width * dpr); this.canvas.height = Math.round(r.height * dpr);
      this.scale = Math.min(r.width / W, r.height / H);
      this.ox = (r.width - W * this.scale) / 2; this.oy = (r.height - H * this.scale) / 2;
      this.dpr = dpr;
      this.rect=r;this.skyLayer=null;this.glowSprites=new Map();
      this.ribbonLayer=null;this.ribbonMask=null;this.sceneLayer=null;
      // Match the CSS night sky inside the canvas as well: screen-composited
      // light maps need an opaque backdrop or their black bounds show through.
      const c = this.ctx, w = this.canvas.width, h = this.canvas.height;
      this.skyRx = w * .72 * Math.SQRT2; this.skyRy = h * .52 * Math.SQRT2;
      c.setTransform(1, 0, 0, 1, 0, 0);
      this.sky = c.createRadialGradient(0, 0, 0, 0, 0, 1);
      this.sky.addColorStop(0, '#152839'); this.sky.addColorStop(.42, '#0b1522'); this.sky.addColorStop(1, '#070c14');
      c.setTransform(1, 0, 0, 1, 0, 0);
    }
    adapt(frameMs,costMs,active){
      if(!this.mobile||!active||frameMs>150){this.pressure=0;return;}
      // Hysteresis: lower only the raster scale after sustained pressure.
      // HTML text, pointer coordinates, 120 Hz physics and replay never change.
      const slow=frameMs>24||costMs>11;this.pressure=Math.max(0,(this.pressure||0)+(slow?frameMs:-frameMs*2));
      if(this.pressure<2200||this.dpr<=1.25)return;
      this.pressure=0;const scale=this.scale,x=this.ox,y=this.oy;this.mobileDpr=Math.max(1.25,this.dpr-.25);this.resize();this.scale=scale;this.ox=x;this.oy=y;
    }
    point(e) { const r = this.rect; return { x: (e.clientX - r.left - this.ox) / this.scale, y: (e.clientY - r.top - this.oy) / this.scale, down: e.buttons === 1 }; }
    layout(game,mobile){
      this.mobile=mobile;const r=this.rect;
      if(!mobile||!game){this.scale=Math.min(r.width/W,r.height/H);this.ox=(r.width-W*this.scale)/2;this.oy=(r.height-H*this.scale)/2;this.sceneBounds=null;this.layoutKey='';return;}
      // The celebration hides the thumb UI, not the scene: preserve its camera.
      if(game.won&&this.layoutGame===game&&this.layoutViewport===r.width+':'+r.height)return;
      this.layoutViewport=r.width+':'+r.height;
      const key=[game.index,game.state.phase,r.width,r.height,document.getElementById('gameBottom').hidden].join(':');if(this.layoutKey===key&&this.layoutGame===game)return;this.layoutKey=key;this.layoutGame=game;
      const landscape=r.width>r.height,heading=document.getElementById('gameHeading').getBoundingClientRect(),bottom=document.getElementById('gameBottom').getBoundingClientRect();
      const left=landscape?248:14,top=landscape?68:Math.max(190,heading.bottom+14),width=r.width-left-14,height=Math.max(100,(landscape?r.height-126:bottom.top-12)-top);
      const points=[...game.view.nodes,...(game.view.bounds||[]),...(game.view.annotations||[]),game.point,...(game.echo?[game.echo]:[])];const minX=Math.min(...points.map(p=>p.x))-90,maxX=Math.max(...points.map(p=>p.x))+90,minY=Math.min(...points.map(p=>p.y))-65,maxY=Math.max(...points.map(p=>p.y))+85;
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
      // One glyph, one raster/shadow pass, rather than a blur per short stroke.
      c.beginPath();for(const points of ArcanaSymbols.paths(name))points.forEach(([dx,dy],i)=>i?c.lineTo(x+dx*size,y+dy*size):c.moveTo(x+dx*size,y+dy*size));
      c.strokeStyle=color;c.lineWidth=1.3;c.stroke();
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
      if(!this.skyLayer){this.skyLayer=this.layer(w,h);const sky=this.skyLayer.getContext('2d',{alpha:false});sky.setTransform(this.skyRx,0,0,this.skyRy,w*.72,h*.48);sky.fillStyle=this.sky;sky.fillRect(-w*.72/this.skyRx,-h*.48/this.skyRy,w/this.skyRx,h/this.skyRy);}
      c.drawImage(this.skyLayer,0,0);
      c.setTransform(this.dpr * this.scale, 0, 0, this.dpr * this.scale, this.dpr * this.ox, this.dpr * this.oy);
    }
    atmosphere(t, reduced, ceremony=0) {
      const c=this.ctx,w=this.rect.width,h=this.rect.height;
      const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
      const age=reduced?0:ceremony,energy=age?Math.sin(Math.PI*Math.min(1,age/4.2)):0;
      const recover=smooth((age-3.05)/1.15),turn=1.1*smooth(age/3.5),time=reduced?0:t;
      // Three small pre-rendered cloud plates, never per-frame blur/noise.
      if(!this.nebula){this.nebula=['#2e687b','#524366','#826451'].map((color,k)=>{
        const plate=this.layer(256,256),p=plate.getContext('2d');
        for(let j=0;j<7;j++){const x=54+(j*47+k*31)%150,y=55+(j*67)%145,r=55+j%3*13,g=p.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color+'55');g.addColorStop(.4,color+'23');g.addColorStop(1,color+'00');p.fillStyle=g;p.fillRect(0,0,256,256);}
        const edge=p.createRadialGradient(128,128,28,128,128,126);edge.addColorStop(0,'#ffffffff');edge.addColorStop(.65,'#ffffff88');edge.addColorStop(1,'#ffffff00');p.globalCompositeOperation='destination-in';p.fillStyle=edge;p.fillRect(0,0,256,256);return plate;
      });}
      c.save();c.setTransform(this.dpr,0,0,this.dpr,0,0);c.globalCompositeOperation='screen';
      for(let i=0;i<3;i++){
        const x=w*(.15+i*.34)+Math.sin(time*.055+i*2)*w*.045,y=h*(.32+i*.15)+Math.cos(time*.043+i)*h*.045;
        const fw=w*(.85+.08*Math.sin(time*.03+i)),fh=h*(.6+i*.12);
        c.globalAlpha=(.42+.08*Math.sin(time*.16+i))*(1+energy*.9);
        c.drawImage(this.nebula[i],x-fw/2,y-fh/2,fw,fh);
      }
      const count=this.mobile?145:235,cx=w*.56,cy=h*.43;
      for(let i=0;i<count;i++){
        const u=(i*.61803398875+.13)%1,v=(i*.754877666+.27)%1;
        // A broad diagonal river of stars plus an even, quiet outer field.
        const x=u*w,y=(i%3===0?v:(.18+u*.56+(v-.5)*.42))*h;
        const dx=x-cx,dy=y-cy,r=Math.hypot(dx,dy),a=Math.atan2(dy,dx);
        const bright=.2+.33*(.5+.5*Math.sin(time*(.24+i%5*.035)+i*2.1));
        const color=i%5===0?C.red:i%3===0?'#a5c5e9':C.ink,size=i%13===0?1.3:.55;
        if(age>0&&r>4){
          const alpha=(1-recover),length=energy*(.13+i%7*.033);
          for(let j=0;j<3;j++){c.globalAlpha=alpha*energy*(.08+j*.07);c.beginPath();c.arc(cx,cy,r,a+turn-length*(1-j/3),a+turn-length*(1-(j+1)/3));c.lineWidth=size;c.strokeStyle=color;c.stroke();}
          c.globalAlpha=bright*alpha;this.circle(cx+Math.cos(a+turn)*r,cy+Math.sin(a+turn)*r,size,color,true);
        }
        c.globalAlpha=bright*(age?recover:1);this.circle(x,y,size,color,true);
        if(i%23===0&&!age){c.globalAlpha=bright*.42;this.path([{x:x-3,y},{x:x+3,y}],color,.6);this.path([{x,y:y-3},{x,y:y+3}],color,.6);}
      }
      c.restore();
    }
    clickRipple(p,age,role,reduced) {
      if(age<0||age>=1.35)return;
      const c=this.ctx,color=role==='echo'?C.red:C.ink,u=Math.min(1,age/1.35),fade=(1-u)**2;
      c.save();c.globalCompositeOperation='screen';
      const radius=reduced?20:9+57*(1-(1-u)**3);
      c.globalAlpha=fade*.8;this.circle(p.x,p.y,radius,color,false,1.7);
      c.globalAlpha=fade*.18;this.circle(p.x,p.y,radius,color,false,7);
      if(!reduced){c.globalAlpha=fade*.5;this.circle(p.x,p.y,5+radius*.66,color,false,.8);}
      this.glow(p,color,0,true,fade*.55);c.restore();
    }
    tutorial(game,reduced,mode,dt) {
      if(game.index!==0)return;
      const key=game.open?2:game.t>=7?1:0;
      const lines=[['青光是此刻的你','橙光会在两秒后，重走你的每一步'],['先在左侧旅灯停一会儿，再去右侧','停留多久，过去的你就会守候多久'],['橙光守灯时，星门才会亮起','让青光停在门内，点击抵达']];
      if(this.tutorialKey!==key){this.tutorialKey=key;this.tutorialAge=0;}
      this.tutorialAge=(this.tutorialAge||0)+dt;
      const c=this.ctx,fade=mode==='celebrate'?Math.max(0,1-(game.ceremonyAge||0)/.6):1;
      c.save();c.globalAlpha=fade*(reduced?.92:Math.min(.92,.35+this.tutorialAge*.8));
      // Screen-space type stays legible when the mobile camera zooms out.
      c.setTransform(this.dpr,0,0,this.dpr,0,0);
      const landscape=this.mobile&&this.rect.width>this.rect.height;
      const x=this.mobile?(landscape?(248+this.rect.width)/2:this.rect.width/2):this.ox+600*this.scale;
      const y=this.oy+365*this.scale-(this.mobile?86:112*this.scale);
      const size=this.mobile?15:Math.max(19,23*this.scale),rise=reduced?0:5*Math.exp(-this.tutorialAge*3);
      c.textAlign='center';c.font=`${size}px "Arcana YueSong","SimSun",serif`;c.fillStyle=C.ink;c.fillText(lines[key][0],x,y+rise);
      c.font=`${this.mobile?12:Math.max(15,16*this.scale)}px "Arcana YueSong","SimSun",serif`;c.fillStyle='#b4c9d5';c.fillText(lines[key][1],x,y+size*1.55+rise);
      c.restore();
    }
    glow(p, color, t, reduced, alpha = 1, hollow = false) {
      if(alpha<.001)return;
      const c = this.ctx, breath = reduced ? 1 : 1 + .10 * Math.sin(t * 1.45 + (hollow ? 1.4 : 0));
      c.save(); c.globalAlpha *= Math.max(0, Math.min(1, alpha));
      const radius = 53 * breath;
      let sprite=this.glowSprites.get(color);
      if(!sprite){sprite=this.layer(128,128);const s=sprite.getContext('2d'),gradient=s.createRadialGradient(64,64,0,64,64,64);gradient.addColorStop(0,color+'50');gradient.addColorStop(.28,color+'19');gradient.addColorStop(1,color+'00');s.fillStyle=gradient;s.fillRect(0,0,128,128);if(this.glowSprites.size>=64)this.glowSprites.delete(this.glowSprites.keys().next().value);this.glowSprites.set(color,sprite);}
      c.drawImage(sprite,p.x-radius,p.y-radius,radius*2,radius*2);
      c.shadowColor = color; c.shadowBlur = 17 * this.scale;
      if (hollow) { this.circle(p.x, p.y, p.down ? 8 : 6, color, false, 1.8); this.circle(p.x, p.y, 2, '#fff2dd', true); }
      else { this.circle(p.x, p.y, p.down ? 6 : 4.5, color, true); this.circle(p.x, p.y, 2, '#f1fffc', true); }
      c.restore();
    }
    ribbon(timeline, start, end, color, opacity) {
      if (!timeline || end <= start) return;
      const points = [], cadence = 1 / (this.mobile?30:45);
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
      const width=right-left,height=bottom-top;
      const createLayer = () => this.layer(Math.ceil(width/128)*128,Math.ceil(height/128)*128);
      if (!this.ribbonLayer) this.ribbonLayer = createLayer();
      if (!this.ribbonMask) this.ribbonMask = createLayer();
      const layer = this.ribbonLayer;
      for (const surface of [layer, this.ribbonMask]) {
        if (surface.width < width) surface.width = Math.ceil(width/128)*128;
        if (surface.height < height) surface.height = Math.ceil(height/128)*128;
      }
      const c = layer.getContext('2d');
      c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      c.fillStyle = '#000000'; c.fillRect(0, 0, width, height);
      c.setTransform(pixelScale, 0, 0, pixelScale, ox-left, oy-top);
      c.globalCompositeOperation = 'lighten'; c.lineCap = 'round'; c.lineJoin = 'round';
      const fade = t => {
        const u = Math.max(0, Math.min(1, (t - start) / (end - start)));
        return u * u * (3 - 2 * u);
      };
      const rgb = [1,3,5].map(n => parseInt(color.slice(n,n+2),16));
      const mask = this.ribbonMask.getContext('2d');
      mask.setTransform(1,0,0,1,0,0); mask.clearRect(0,0,width,height);
      mask.setTransform(pixelScale,0,0,pixelScale,ox-left,oy-top);
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
      c.drawImage(this.ribbonMask,0,0,width,height,0,0,width,height);
      const target = this.ctx;
      target.save(); target.setTransform(1, 0, 0, 1, 0, 0);
      target.globalAlpha *= Math.max(0, Math.min(1, opacity));
      target.globalCompositeOperation = 'screen'; target.shadowBlur = 0;
      target.drawImage(layer, 0, 0, width, height, left, top, width, height);
      target.restore();
    }
    cursors(point, echo, timeline, reduced, t, pinned=false) {
      const c = this.ctx;
      this.ribbon(timeline, t - (reduced ? .35 : 1.15), t, C.ink, .6);
      if(!pinned)this.ribbon(timeline, t - (reduced ? 2.25 : 2.6), t - 2, C.red, .5);
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
      if(reduced){this.glow(origin,C.red,0,true,Math.max(0,1-age/1.4));c.restore();return;}
      const far=Math.max(...[[0,0],[this.canvas.width,0],[0,this.canvas.height],[this.canvas.width,this.canvas.height]].map(([x,y])=>Math.hypot((x/this.dpr-this.ox)/this.scale-origin.x,(y/this.dpr-this.oy)/this.scale-origin.y)))+60;
      c.globalCompositeOperation='lighter';
      for(let i=0;i<4;i++){const f=Math.max(0,Math.min(1,(age-i*.16)/1.8));if(f===0)continue;const r=20+far*1.18*(1-(1-f)**3);c.globalAlpha=(1-f)**1.4*.55;this.circle(origin.x,origin.y,r,i%2?C.red:C.ink,false,1.8);c.globalAlpha*=.2;this.circle(origin.x,origin.y,r,i%2?C.red:C.ink,false,14);}
      for(let i=0;i<48;i++){const a=i*2.39996,r=30+age*(100+i%9*24);c.globalAlpha=Math.max(0,1-age/2.6)*.4;this.path([{x:origin.x+Math.cos(a)*r,y:origin.y+Math.sin(a)*r},{x:origin.x+Math.cos(a)*(r+8+age*10),y:origin.y+Math.sin(a)*(r+8+age*10)}],i%2?C.red:C.ink);}
      this.glow(origin,C.red,age,true,Math.max(0,1-age/2.2));c.restore();
    }
    game(game,mode,reduced,dt=1/60) {
      const transition=game.transition;
      if(!transition){this.scene(game,mode,reduced,dt);return;}
      const old=transition.remaining>.26,age=transition.duration-transition.remaining;
      const opacity=old?Math.max(0,1-age/.18):Math.min(1,(.26-transition.remaining)/.26);
      const display=old?transition.previous:game;
      if(!this.sceneLayer)this.sceneLayer=typeof OffscreenCanvas==='function'?new OffscreenCanvas(this.canvas.width,this.canvas.height):document.createElement('canvas');
      const layer=this.sceneLayer,canvas=this.canvas,ctx=this.ctx;
      if(layer.width!==canvas.width)layer.width=canvas.width;if(layer.height!==canvas.height)layer.height=canvas.height;
      this.canvas=layer;this.ctx=layer.getContext('2d');
      try{this.scene(display,'transition',reduced,dt);}finally{this.canvas=canvas;this.ctx=ctx;}
      this.base();this.atmosphere(this.visualTime,reduced);ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=opacity*opacity*(3-2*opacity);ctx.drawImage(layer,0,0);ctx.restore();
    }
    scene(game,mode,reduced,dt=1/60) {
      if(this.lastGame!==game){this.lastGame=game;this.nodeLights=new Map();this.particles=[];this.doorLight=0;this.beamLights=new Map();this.windowLights=[];this.sunLights=[0,0];this.worldAngles=new Map();this.balanceTilt=0;this.tutorialKey=null;this.tutorialAge=0;}
      this.visualTime+=dt;this.particles=this.particles.filter(p=>(p.age+=dt)<p.life);
      this.base();this.atmosphere(this.visualTime,reduced,mode==='celebrate'?game.ceremonyAge||0:0);
      const c=this.ctx,v=game.view,R=EchoCore.Rules,t=this.visualTime;
      this.tutorial(game,reduced,mode,dt);
      const approach=(a,b,duration)=>a+(b-a)*(1-Math.exp(-dt/(duration/3)));
      if(v.axis){this.path([{x:590,y:215},{x:610,y:215},{x:610,y:510},{x:590,y:510},{x:590,y:215}],C.muted,1.2);for(let y=235;y<500;y+=34)this.path([{x:593,y:y+10},{x:607,y}],C.line);}
      for(const line of v.lines)this.path(line,C.line);
      // Moving light chords are drawn directly: caching per-position beams
      // would retain hundreds of fading paths and reintroduce mobile stutter.
      for(const line of [v.chord,...(v.chords||[])].filter(Boolean)){
        c.save();c.globalAlpha=.16;this.path(line,C.ink,6);c.globalAlpha=.85;this.path(line,C.ink,1.4);c.restore();
      }
      for(const wall of v.rayWalls||[])this.path(wall,C.muted,3);
      const liveBeams=new Set();for(const line of v.beams||[]){const key=line.map(p=>p.x+','+p.y).join(':');liveBeams.add(key);if(!this.beamLights.has(key))this.beamLights.set(key,{line,light:0});}
      for(const [key,beam]of this.beamLights){
        const active=liveBeams.has(key);beam.light=approach(beam.light,active?1:0,active?.14:.18);if(!active&&beam.light<.002){this.beamLights.delete(key);continue;}
        const line=beam.line;
        let end=line[1];
        for(const wall of v.walls){const hit=R.intersection(line[0],end,wall[0],wall[1]);if(hit)end=hit;}
        c.save();c.globalAlpha=.14*beam.light;this.path([line[0],end],C.ink,6);c.globalAlpha=.7*beam.light;this.path([line[0],end],C.ink,1.2);c.restore();
      }
      for(const line of v.walls)this.path(line,'#acb8bd',3);
      if(v.sun){
        this.sigil('太阳',600,365,C.red,game.hold>0?.7:0,1.65);
        for(let i=0;i<2;i++){const active=i===0?game.effect.left:game.effect.right;this.sunLights[i]=approach(this.sunLights[i],active?1:0,active?.14:.18);this.polygon(v.sun.receivers[i].x,v.sun.receivers[i].y,8,this.mix(C.line,i?C.ink:C.red,this.sunLights[i]),true);}
      }
      for(const star of v.stars)this.sigil('星星',star.x,star.y,C.red,0,.55);
      if(v.moonMemory){const memory=v.moonMemory,labelY=175+Math.max(40,this.mobile?24/this.scale:40);if(memory.concealed){this.polygon(600,175,20,C.line);if(!v.clickable)this.text('凭记忆辨认',600,labelY,C.muted,12);}else{this.rune(memory.target,600,175,C.ink);this.text('记住分枝与根部',600,labelY,C.ink,12);}this.path([{x:365,y:255},{x:835,y:255}],C.line,1,[10,6]);}
      (v.lightWindows||[]).forEach((window,i)=>{const light=approach(this.windowLights[i]||0,window.on?1:0,window.on?.14:.18);this.windowLights[i]=light;this.polygon(window.x,window.y,25,this.mix(C.line,C.ink,light),false,4);this.sigil('太阳',window.x,window.y,this.mix(C.muted,C.ink,light),light*.6,.55);this.text(window.on?'亮':'暗',window.x,window.y+43,window.on?C.ink:C.muted,12);});
      for(const note of v.annotations||[])this.text(note.text,note.x,note.y,C.muted,13);
      for(let i=0;i<v.nodes.length;i++){
        const n=v.nodes[i],echo=n.role==='echo'||n.role!=='now'&&R.nodeContains(game.echo,n,R.RELEASE_RADIUS);
        const active=!!n.active;
        const old=this.nodeLights.get(n.id)||0,light=approach(old,active?1:0,active?.14:n.exit?.16:.18);this.nodeLights.set(n.id,light);
        if(old<.05&&light>.05&&!reduced)this.burst(n,echo?C.red:C.ink,10);
        const hue=n.role==='echo'||echo?C.red:C.ink,col=this.mix('#677e90',hue,light);
        this.glow(n,hue,t,reduced,light*.13);
        this.polygon(n.x,n.y,n.radius,this.mix('#101c2a','#192b35',light),true,8,Math.PI/8);
        this.polygon(n.x,n.y,n.radius,col,false,8,Math.PI/8);
        this.polygon(n.x,n.y,n.releaseRadius,this.mix(C.line,col,.25+light*.4),false,8,Math.PI/8);
        if(n.rune){this.path([{x:n.x-21,y:n.y+20},{x:n.x+21,y:n.y+20}],col,2);n.rune.forEach((height,j)=>this.path([{x:n.x+(j-1)*18,y:n.y+20},{x:n.x+(j-1)*18,y:n.y+14-height*11}],col,2));}
        else if(n.glyph)this.rune(n.glyph,n.x,n.y,col);
        else if(n.stone!==undefined){
          if(n.stone){c.save();if(n.stored)c.globalAlpha*=.3;this.polygon(n.x,n.y,14+n.stone*2,col,false,4);this.text(String(n.stone),n.x,n.y+6,col,19);c.restore();}
          else{this.path([{x:n.x-9,y:n.y+3},{x:n.x,y:n.y+9},{x:n.x+9,y:n.y+3}],col,1.4);}
          if(n.slot&&v.balance.selected>=0){c.save();c.globalAlpha=.45;this.polygon(n.x,n.y,48,C.ink,false,8,Math.PI/8);c.restore();}
        }
        else if(n.mirror!==undefined){const ends=n.mirror===0?[[-18,0],[18,0]]:n.mirror===1?[[-15,15],[15,-15]]:[[-15,-15],[15,15]];this.path(ends.map(([x,y])=>({x:n.x+x,y:n.y+y})),col,2);}
        else if(n.turn!==undefined){const i=v.nodes.indexOf(n),oldTurn=this.worldAngles.get(i)??n.turn,delta=((n.turn-oldTurn+6)%4)-2,turn=reduced?n.turn:oldTurn+delta*(1-Math.exp(-dt*22));this.worldAngles.set(i,turn);const ports=R.worldPorts(i,turn);this.path([ports[0],n,ports[1]],v.world.joined[i]?C.ink:col,2.2);this.polygon(n.x,n.y,4,col);}
        else if(n.id==='vessel'&&v.water){
          const w=v.water,base=n.y+28,top=n.y-28,y=base-56*w.value/120,pred=base-56*w.forecast/120;
          this.path([{x:n.x-23,y:top},{x:n.x-23,y:base},{x:n.x+23,y:base},{x:n.x+23,y:top}],col,1.5);
          c.save();c.globalAlpha=.32;c.fillStyle=C.ink;c.fillRect(n.x-21,y,42,base-y);c.restore();
          for(const v of w.target)this.path([{x:n.x-30,y:base-56*v/120},{x:n.x+30,y:base-56*v/120}],C.red,1);
          this.path([{x:n.x-23,y:pred},{x:n.x+23,y:pred}],C.ink,2,[4,3]);
          this.text(Math.round(w.value/1.2)+'%  /  预测 '+Math.round(w.forecast/1.2)+'%',n.x,n.y-64,C.ink,13);
        }
        else this.sigil(n.sigil,n.x,n.y,col,light,.72);
        this.orbitParticles(n,light,t,reduced,hue);
        const labelColor=this.mix(C.muted,hue,light);
        if(this.mobile&&game.index===1&&(n.id==='source'||n.id==='receiver'))this.text(n.label,n.x+(n.id==='source'?-53:53),n.y+4,labelColor,12,n.id==='source'?'right':'left');
        else if(this.mobile&&game.index===1&&n.id.startsWith('mirror'))this.text('折印',n.x,n.y+59,labelColor,12);
        else if(game.index===4)this.text(n.label,n.x+(n.x<600?-57:57),n.y+4,labelColor,12,n.x<600?'right':'left');
        else this.text(n.label,n.x,n.y+59,labelColor,12);
        const amount=n.amount??(active?v.progress:0);
        if(amount>0){this.path([{x:n.x-20,y:n.y+45},{x:n.x+20,y:n.y+45}],C.line,2);this.path([{x:n.x-20,y:n.y+45},{x:n.x-20+40*Math.min(1,amount),y:n.y+45}],hue,2);}
      }
      if(v.clickable&&v.actionPoint&&mode==='play'&&!v.mirror)this.clickCue(v.actionPoint,v.balance?'':v.actionLabel,t,reduced);
      const progress=v.progress;
      c.save();c.globalAlpha=mode==='celebrate'?.4:1;this.cursors(null,mode==='celebrate'?game.timeline.at(game.t+(game.ceremonyAge||0)-2):game.echo,game.timeline,reduced,game.t,!!game.memory);c.restore();
      // Reflections sit above seals, just like the real pointer, so a correct
      // placement never conceals one of the four lights behind a filled node.
      if(v.mirror){
        for(const [p,ref,color,label]of [[game.point,v.mirror.now,C.ink,'今'],[game.echo,v.mirror.past,C.red,'昔']])if(p&&ref){
          c.save();c.globalAlpha=.3;this.path([p,ref],color,1,[3,8]);c.restore();
          this.glow(ref,color,t,reduced,.85,true);this.polygon(ref.x,ref.y,9,color,false,4);
          this.text(label+' · 本体',p.x+(p.x<600?-22:22),p.y+4,color,11,p.x<600?'right':'left');
          if(!v.nodes.some(n=>R.nodeContains(ref,n)))this.text(label+' · 镜像',ref.x+(ref.x<600?-22:22),ref.y+4,color,11,ref.x<600?'right':'left');
        }
        if(v.mirror.pending){const p=v.mirror.pending;this.polygon(p.x,p.y,16+5*(1-p.amount),C.red,false,4);this.text('留影抵达中',p.x,p.y+35,C.red,11);}
      }
      this.drawParticles(reduced);
      for(const event of game.feedback?.ripples||[])this.clickRipple(event,game.feedback.time-event.t,event.role,reduced);
    }
    rune(lines,x,y,color){const size=this.mobile?Math.min(1.5,Math.max(1,9/(18*this.scale))):1;for(const line of lines)this.path(line.map(([a,b])=>({x:x+a*size,y:y+b*size})),color,2.2);}
    clickCue(p,label,t,reduced,side=false,labelOffset=65){
      const c=this.ctx,pulse=reduced?1:(1+Math.sin(t*Math.PI*1.5))*.5,color=this.mix(C.ink,C.red,pulse);
      c.save();this.glow(p,color,t,reduced,.18+.12*pulse);
      c.globalAlpha=reduced?1:.6+.4*pulse;this.polygon(p.x,p.y,49,color,false,8,Math.PI/8);
      if(!reduced){const age=(t*.75)%1;c.globalAlpha=(1-age)*.45;this.polygon(p.x,p.y,50+age*14,C.red,false,8,Math.PI/8);}
      c.globalAlpha=1;this.text(label,side?p.x+(p.x<600?-52:52):p.x,side?p.y-19:p.y-labelOffset,C.ink,side?11:13,side?(p.x<600?'right':'left'):'center');c.restore();
    }
  }
  window.EchoRenderer=Renderer;
})();
