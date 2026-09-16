(function(root){
  'use strict';
  const point=(x,y)=>({x,y}),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),near=(a,b,r=32)=>!!a&&dist(a,b)<=r;
  function segmentDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1));return dist(p,point(a.x+t*dx,a.y+t*dy));}
  function intersection(a,b,c,d){const rx=b.x-a.x,ry=b.y-a.y,sx=d.x-c.x,sy=d.y-c.y,den=rx*sy-ry*sx;if(Math.abs(den)<1e-9)return null;const t=((c.x-a.x)*sy-(c.y-a.y)*sx)/den,u=((c.x-a.x)*ry-(c.y-a.y)*rx)/den;return t>=0&&t<=1&&u>=0&&u<=1?{t,x:a.x+t*rx,y:a.y+t*ry}:null;}
  const LEVELS=[
    {id:'fool',title:'愚者',roman:'0',phases:1,theme:'迈步之前，先相信留下的自己。',task:'在旅灯停一下，让两秒前的你接手，再走向门。',done:'你迈出了第一步，而过去没有离开。',hint:['停留多久，影子就会在两秒后停留多久。','在旅灯停约 1 秒，再到右侧门。等暖金守印、青色在门前稳定后点击。'],spawn:point(330,430),seal:point(470,365),exit:point(710,365)},
    {id:'magician',title:'魔术师',roman:'I',phases:2,theme:'将意愿，变成抵达彼岸的光。',task:'点击两枚折光符印布置光路，让影子在源印供光。',done:'原来，你也拥有创造道路的力量。',hint:['直线让光穿过，斜线改变它的方向。两枚符印都必须经过。','第一阵：左印直通、右印向右上倾斜。第二阵：两印均向右上倾斜；再到源印留下影子。']},
    {id:'lovers',title:'恋人',roman:'VI',phases:3,theme:'和谐不是重叠，而是彼此回应。',task:'先到「昔」印留下影子，再到镜像的「今」印。',done:'不必成为彼此，也能一起完整。',hint:['中轴两边互为镜像，离中心太近不算相遇。','每阵先停在昔印约 1 秒，再去今印保持 0.55 秒；跟随印记交换左右与高度。']},
    {id:'temperance',title:'节制',roman:'XIV',phases:1,theme:'不是越多越好，恰好才是答案。',task:'两光分守双杯，按住从「今」杯注向「昔」杯；平衡后松手。',done:'你开始懂得，何时已经足够。',hint:['能量不会增加，只会在两杯之间流动。松手，水流就停止。','先在右杯留下影子，再到左杯。双杯点亮后按住约 1 秒，调到各 45% 至 55%；松手守位 0.65 秒。']},
    {id:'star',title:'星星',roman:'XVII',phases:3,theme:'希望，是两点之间仍愿意相连的光。',task:'影子守左端，你选右端，让同一条光弦同时穿过两颗星。',done:'失散的微光，终于找到了彼此。',hint:['不要追着星星跑，试着延长连接它们的那条线。','三阵依次为左中与右中、左下与右上、左上与右下。先在左端留下影子，再去右端。']},
    {id:'moon',title:'月亮',roman:'XVIII',phases:3,theme:'暂时看不清，也可以慢慢辨认。',task:'影子守月井时真纹显露，点击与上方目标相同的纹样。',done:'你没有驱散夜色，却学会了辨认。',hint:['倒影都很相似，月井亮起时才看得见真纹。','先在月井留光，再靠近候选印。看上方目标，等真纹显露后选择；选错只重试这一轮。']},
    {id:'sun',title:'太阳',roman:'XIX',phases:2,theme:'光不必独占，共同照亮才完整。',task:'寻找遮板两侧的互补方位，让两光分别照亮太阳两半。',done:'你的光与我的光，让白昼完整。',hint:['同一个位置只能照亮一半，速度无法替代另一束光。','第一阵影子左下、你右上；第二阵左上与右下。移动时绕过遮板末端，不要直接穿墙。']},
    {id:'world',title:'世界',roman:'XXI',phases:1,theme:'不再追赶过去，而是与它一同完整。',task:'从上方星印出发，跟随四秒一圈的刻度，走出回环。',done:'走过的每一段时间，都是值得接纳的你。',hint:['先建立两秒回声，再让两光保持中心对称。偏离只重来本次回环。','从上顶点开始，顺时针每秒到下一个顶点；跟随青色小刻度，不穿中间。回声建立后再持续完整一圈。'],seal:point(600,345),exit:point(840,345)}
  ].map(l=>({...l,spawn:l.spawn||point(320,495),seal:l.seal||point(770,385),exit:l.exit||point(1010,385)}));
  const loversPairs=[[point(450,350),point(750,350)],[point(750,440),point(450,440)],[point(440,290),point(760,290)]];
  const starLeft=[point(415,275),point(415,365),point(415,455)],starRight=[point(735,275),point(735,365),point(735,455)],starPairs=[[1,1],[2,0],[0,2]];
  const moonWell=point(560,435),moonOptions=[point(370,280),point(560,260),point(750,280)],moonMaps=[['太阳','月亮','星星'],['星星','太阳','月亮'],['月亮','星星','太阳']],moonTargets=['星星','太阳','月亮'];
  const worldVertices=[point(600,210),point(730,340),point(600,470),point(470,340)];
  function worldPoint(t){const q=((t%4)+4)%4,i=Math.floor(q),f=q-i,a=worldVertices[i],b=worldVertices[(i+1)%4];return point(a.x+(b.x-a.x)*f,a.y+(b.y-a.y)*f);}
  function magicLayout(phase){return {source:point(300,430),mirrors:phase===0?[point(500,430),point(700,430)]:[point(500,430),point(500,265)],receiver:phase===0?point(700,265):point(760,265)};}
  function traceMagic(phase,orientations){
    const m=magicLayout(phase),lines=[],visited=[];let from=m.source,dir=point(1,0),hit=false;
    for(let step=0;step<4;step++){
      const next=[...m.mirrors.map((p,i)=>({...p,index:i})),{...m.receiver,index:2}].filter(p=>!visited.includes(p.index)).map(p=>({...p,along:(p.x-from.x)*dir.x+(p.y-from.y)*dir.y,cross:Math.abs((p.x-from.x)*dir.y-(p.y-from.y)*dir.x)})).filter(p=>p.along>1&&p.cross<12).sort((a,b)=>a.along-b.along)[0];
      if(!next){lines.push([from,point(from.x+dir.x*400,from.y+dir.y*400)]);break;}lines.push([from,next]);if(next.index===2){hit=visited.includes(0)&&visited.includes(1);break;}visited.push(next.index);const o=orientations[next.index];dir=o===1?point(-dir.y,-dir.x):o===2?point(dir.y,dir.x):dir;from=next;
    }return {lines,hit};
  }
  function sunLayout(phase){const f=phase===0?1:-1,y=365;return {center:point(600,y),receivers:[point(582,y),point(618,y)],pads:[point(460,y+f*60),point(740,y-f*60)],walls:[[point(530,y-f*10),point(530,y-f*85)],[point(670,y+f*10),point(670,y+f*85)],[point(600,340),point(600,390)]]};}
  function sunVisibility(p,i,m){return !!p&&(i===0?p.x<550:p.x>650)&&!m.walls.some(([a,b])=>intersection(p,m.receivers[i],a,b));}
  function create(index,c={}){return {phase:clamp(Number.isInteger(c.phase)?c.phase:0,0,LEVELS[index].phases),orientations:[0,0],energy:clamp(Number.isFinite(c.energy)?c.energy:.8),attempt:null,error:0};}
  const ready=g=>g.state.phase>=g.level.phases;
  function occupancy(g,key,condition,dt,need=.4){g.timers[key]=condition?(g.timers[key]||0)+dt:0;return g.timers[key]>=need-1e-8;}
  function advance(g){g.state.phase++;g.hold=0;g.timers={};g.progressAt=g.t;g.revision++;g.state.orientations=[0,0];g.effect={};if(!ready(g)){g.timeline.samples=[];g.timeline.add(g.t,g.point);g.echo=null;}}
  // Eight independent rule handlers share only occupancy/phase infrastructure.
  // A handler returns [valid continuous cooperation, required seconds], or
  // handles its own discrete sequence. Rendering never participates in this decision.
  const modules={
    fool(g,dt){if(occupancy(g,'learn',near(g.point,g.level.seal),dt))advance(g);},
    magician(g,dt,click){const s=g.state,m=magicLayout(s.phase);if(click){const i=m.mirrors.findIndex(v=>near(g.point,v));if(i>=0){s.orientations[i]=(s.orientations[i]+1)%3;g.hold=0;}}const powered=occupancy(g,'source',near(g.echo,m.source),dt),beam=traceMagic(s.phase,s.orientations);g.effect={powered,lines:beam.lines};return [powered&&beam.hit,.5];},
    lovers(g){const [past,now]=loversPairs[g.state.phase],p=g.point,e=g.echo;return [near(e,past)&&near(p,now)&&Math.hypot(p.x+e.x-1200,p.y-e.y)<=18,.55];},
    temperance(g,dt){const p=g.point,e=g.echo,s=g.state,cups=[point(440,365),point(740,365)],direction=near(p,cups[0])&&near(e,cups[1])?1:near(p,cups[1])&&near(e,cups[0])?-1:0,settled=occupancy(g,'cups',direction!==0,dt);if(settled&&p.down)s.energy=clamp(s.energy-direction*dt*.3);g.effect={direction,settled};return [settled&&!p.down&&s.energy>=.45&&s.energy<=.55,.65];},
    star(g){const p=g.point,e=g.echo,[i,j]=starPairs[g.state.phase],a=starLeft[i],b=starRight[j],stars=[.36,.64].map(f=>point(a.x+(b.x-a.x)*f,a.y+(b.y-a.y)*f)),anchored=starLeft.some(v=>near(e,v)),landed=starRight.some(v=>near(p,v));g.effect={powered:anchored,stars};return [anchored&&landed&&stars.every(v=>segmentDistance(v,e,p)<=12),.45];},
    moon(g,dt,click){const s=g.state,revealed=occupancy(g,'well',near(g.echo,moonWell),dt);g.effect={revealed};if(click){const i=moonOptions.findIndex(v=>near(g.point,v));if(i>=0){if(revealed&&moonMaps[s.phase][i]===moonTargets[s.phase])advance(g);else{s.error=.6;g.hold=0;}}}},
    sun(g){const m=sunLayout(g.state.phase),left=sunVisibility(g.echo,0,m),right=sunVisibility(g.point,1,m);g.effect={left,right};return [left&&right,.6];},
    world(g,dt){const s=g.state,p=g.point,e=g.echo;
      if(s.attempt===null){if(occupancy(g,'begin',near(p,worldVertices[0],24),dt,.35)){s.attempt=g.t;g.timers={};}return;}
      const age=g.t-s.attempt,guide=worldPoint(age),onPath=worldVertices.some((a,i)=>segmentDistance(p,a,worldVertices[(i+1)%4])<23),valid=onPath&&near(p,guide,38)&&(age<2||!!e&&Math.hypot(p.x+e.x-1200,p.y+e.y-680)<=26);
      g.timers.deviation=valid?0:(g.timers.deviation||0)+dt;if(g.timers.deviation>.18){s.attempt=null;g.hold=0;g.timers={};s.error=.65;return;}g.hold=Math.max(0,age-2);g.need=4;g.effect={guide,warming:age<2};if(age>=6)advance(g);return;
    }
  };
  function update(g,dt,click){
    g.state.error=Math.max(0,g.state.error-dt);if(ready(g))return;
    const result=modules[g.level.id](g,dt,click);if(!result)return;
    const [condition,need]=result;g.need=need;g.hold=condition?g.hold+dt:0;if(g.hold>=need-1e-8)advance(g);
  }
  const node=(id,p,label,sigil='星星',role='any',extra={})=>({id,...p,label,sigil,role,...extra});
  function view(g){
    const l=g.level,s=g.state,o={nodes:[],lines:[],walls:[],stars:[],message:'',progress:clamp(g.hold/(g.need||.4))};
    if(ready(g)){o.nodes=[node('seal',l.seal,l.id==='fool'?'旅灯 · 昔':'门印 · 昔','月亮','echo'),node('exit',l.exit,'出口 · 今','太阳','now',{exit:true})];o.lines=[[l.seal,l.exit]];o.message=g.open?'过去守住了门。在出口停稳，点击。':g.sealHold>0?'昔印正在点亮。请在出口等待。':'在月印留光，再前往太阳门。';return o;}
    if(l.id==='fool'){o.nodes=[node('learn',l.seal,'旅灯 · 先停一下','星星','now')];o.message='停留约半秒，然后离开。影子会重复这段停留，不会永久守住。';o.progress=clamp((g.timers.learn||0)/.4);}
    if(l.id==='magician'){const m=magicLayout(s.phase);o.nodes=[node('source',m.source,'源印 · 昔','太阳','echo'),...m.mirrors.map((p,i)=>node('mirror'+i,p,['第一折印','第二折印'][i],'魔术师','any',{mirror:s.orientations[i]})),node('receiver',m.receiver,'接收印','星星')];o.beams=g.effect.powered?traceMagic(s.phase,s.orientations).lines:[];o.message='点击折印：直通 / 右上斜 / 右下斜。影子守源印时光路显现。';}
    if(l.id==='lovers'){const [a,b]=loversPairs[s.phase];o.nodes=[node('past',a,'昔 · 留下回声','月亮','echo'),node('now',b,'今 · 镜像回应','星星','now')];o.axis=true;o.message='分居中轴两侧，保持镜像对称 0.55 秒。';}
    if(l.id==='temperance'){o.nodes=[node('left',point(440,365),'左杯','节制'),node('right',point(740,365),'右杯','节制')];o.energy=[s.energy,1-s.energy];o.lines=[[o.nodes[0],o.nodes[1]]];o.message='按住：从今杯流向昔杯。松手：止流。两杯各 45% 至 55% 后守位。';}
    if(l.id==='star'){o.nodes=[...starLeft.map((p,i)=>node('anchor'+i,p,['上锚 · 昔','中锚 · 昔','下锚 · 昔'][i],'月亮','echo')),...starRight.map((p,i)=>node('land'+i,p,['上落点 · 今','中落点 · 今','下落点 · 今'][i],'星星','now'))];const [i,j]=starPairs[s.phase],a=starLeft[i],b=starRight[j];o.stars=[.36,.64].map(f=>point(a.x+(b.x-a.x)*f,a.y+(b.y-a.y)*f));if(g.effect.powered&&g.echo)o.beams=[[g.echo,g.point]];o.message='一条光弦，同时穿过两颗星；端点正确后保持 0.45 秒。';}
    if(l.id==='moon'){const revealed=g.effect.revealed;o.target=moonTargets[s.phase];o.nodes=[node('well',moonWell,'月井 · 昔','月亮','echo'),...moonOptions.map((p,i)=>node('choice'+i,p,revealed?'点击真纹':'倒影',revealed?moonMaps[s.phase][i]:'月亮','any',{choice:true}))];o.message=s.error?'这不是目标真纹。守住月井，再看一次。':revealed?'真纹已显露。点击与上方目标相同的图腾。':'影子守月井 0.4 秒，倒影才显出真纹。';}
    if(l.id==='sun'){const m=sunLayout(s.phase);o.nodes=[node('past',m.pads[0],'左方 · 昔','月亮','echo'),node('now',m.pads[1],'右方 · 今','星星','now')];o.walls=m.walls;o.sun=m;o.beams=[];if(g.echo)o.beams.push([g.echo,m.receivers[0]]);o.beams.push([g.point,m.receivers[1]]);o.message='左半只接受过去，右半只接受现在。光路不能被遮挡，移动不能穿墙。';}
    if(l.id==='world'){o.nodes=worldVertices.map((p,i)=>node('vertex'+i,p,['起点','一秒','两秒','三秒'][i],['星星','太阳','月亮','星星'][i]));o.world=true;o.guide=s.attempt===null?worldVertices[0]:worldPoint(g.t-s.attempt);o.message=s.error?'回环暂时散开。回到上方星印再出发。':s.attempt===null?'在上方星印停留，开始四秒一圈的回环。':g.t-s.attempt<2?'先建立两秒回声，沿顺时针刻度行走。':'保持两光中心对称，走完完整的一圈。';}return o;
  }
  const api={LEVELS,point,dist,near,clamp,segmentDistance,intersection,create,ready,update,view,worldPoint,worldVertices,magicLayout,traceMagic,sunLayout,sunVisibility,loversPairs,starLeft,starRight,starPairs,moonWell,moonOptions,moonMaps,moonTargets};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcanaRules=api;
})(typeof globalThis!=='undefined'?globalThis:this);
