(function(root){
  'use strict';
  const point=(x,y)=>({x,y}),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),near=(a,b,r=40)=>!!a&&dist(a,b)<=r;
  const NODE_RADIUS=44,RELEASE_RADIUS=49,SETTLE_TIME=.16,PAIR_TIME=.35;
  function segmentDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1));return dist(p,point(a.x+t*dx,a.y+t*dy));}
  function intersection(a,b,c,d){const rx=b.x-a.x,ry=b.y-a.y,sx=d.x-c.x,sy=d.y-c.y,den=rx*sy-ry*sx;if(Math.abs(den)<1e-9)return null;const t=((c.x-a.x)*sy-(c.y-a.y)*sx)/den,u=((c.x-a.x)*ry-(c.y-a.y)*rx)/den;return t>=0&&t<=1&&u>=0&&u<=1?{t,x:a.x+t*rx,y:a.y+t*ry}:null;}
  function nodeContains(p,center,radius=NODE_RADIUS){if(!p)return false;const x=Math.abs(p.x-center.x),y=Math.abs(p.y-center.y);return Math.max(x,y,(x+y)/Math.SQRT2)<=radius*Math.cos(Math.PI/8)+1e-7;}
  function occupy(g,key,p,center){const yes=nodeContains(p,center,g.contacts[key]?RELEASE_RADIUS:NODE_RADIUS);g.contacts[key]=yes;return yes;}
  const LEVELS=[
    {id:'fool',title:'愚者',roman:'0',theme:'先为过去留一点时间，再向前走。',task:'旅灯停留，再走向星门；昔光接手时点击星门。',done:'迈出的第一步，有过去的你照亮。',hint:['停留多久，两秒后的影子就停留多久。无需点击旅灯，也不会永久留影。','在左侧旅灯停约两秒，再直接走到右侧星门。暖金影子仍在旅灯时，星门会呼吸发亮，点击即可。'],seal:point(465,365),exit:point(735,365)},
    {id:'magician',title:'魔术师',roman:'I',theme:'让意愿有方向，让微光成为现实。',task:'转好折印；源印停留，再接住昔光送来的光。',done:'你安排的每一次转折，都有了回应。',hint:['两枚折印先布置好。源印只接受昔光，接收印只接受现在的你。','把两枚折印都点成右上斜面；在左下源印停两秒，再直走右上接收印，亮起时点击。']},
    {id:'lovers',title:'恋人',roman:'VI',theme:'和谐不是重叠，而是隔着光回应彼此。',task:'先到右上，再到左下；用昔与今的镜像同时点亮双印。',done:'不必成为彼此，也能一起完整。',hint:['画面有四个光点：今、昔，以及它们的镜像。左上认昔的镜像，右下认今的镜像。','在右上、左上昔印的对面停两秒，再走到左下、右下今印的对面。两枚镜像同时守住半秒即可。']},
    {id:'temperance',title:'节制',roman:'XIV',theme:'适时停下，也是在照顾尚未抵达的自己。',task:'注入星泉，提前离开；让昔光补足，双光归静时恰好半杯。',done:'你为过去留下余量，也为此刻留住平衡。',hint:['今光和昔光都能注水，各每秒十二份。离开后，过去的注水还会继续两秒；看虚线预测的最终水位。','站在左侧注泉，等预测进入半杯带便移向右侧归静。不要等实际水位满到半杯才走。过量可点中央水杯放空重试。']},
    {id:'star',title:'星星',roman:'XVII',theme:'希望不在某一点，而在彼此之间。',task:'昔守左锚、今赴右锚；一根光弦同时穿过双星。',done:'分散的微光，在连接中有了方向。',hint:['把两颗小星看作尺上的两点，沿它们延长，找到左右锚点。必须同一根弦同时穿过，逐颗扫过无效。','在左下锚点停两秒，再移到右上锚点。两点间的斜弦同时穿过两颗星，维持半秒。']},
    {id:'moon',title:'月亮',roman:'XVIII',theme:'看不见的时候，也能相信认真看过的自己。',task:'记住真纹；月井停留后离开，在昔光遮住答案时选上下倒影。',done:'你穿过了倒影，也记得自己的模样。',hint:['水面只反转上下，不反转左右。昔光进入月井才隐藏真纹；离开后可以重新观察。','看真纹根部和分枝，在月井停两秒，再去选中间的上下倒影。只能在昔光仍守月井时确认，一次选择即可。']},
    {id:'sun',title:'太阳',roman:'XIX',theme:'光可以不同，却能一同照亮完整的世界。',task:'看遮板选互补光位；让昔光照左半，今光照右半。',done:'不必独自明亮，你们已经照亮了彼此。',hint:['每侧两个光位，遮板会截住错误方向。真正到达日核的射线才计入，余光不算。','先在左下光位停两秒，再移向右上光位。左下的昔光与右上的今光同时绕开遮板，照亮日核。']},
    {id:'world',title:'世界',roman:'XXI',theme:'将一次次交接，连成完整的自己。',task:'从穹顶顺时针走；昔守来处、今到下一印，接成四方回环。',done:'你不再丢下过去，也不必停在过去。',hint:['不是沿线竞速。每到一印先停一下，等过去到达，再去下一印；已经接好的边会保留。','穹顶停两秒，再去右印，等一边接好；在右印再停两秒，依次去下、左、上。每次由昔光守上一印、今光守下一印。']}
  ].map(l=>({...l,phases:1,spawn:point(340,495)}));
  const magic={source:point(440,415),mirrors:[point(560,415),point(560,285)],receiver:point(730,285)};
  function magicLayout(){return magic;}
  function traceMagic(phase,orientations){const lines=[],visited=[];let from=magic.source,dir=point(1,0),hit=false;
    for(let step=0;step<4;step++){const next=[...magic.mirrors.map((p,i)=>({...p,index:i})),{...magic.receiver,index:2}].filter(p=>!visited.includes(p.index)).map(p=>({...p,along:(p.x-from.x)*dir.x+(p.y-from.y)*dir.y,cross:Math.abs((p.x-from.x)*dir.y-(p.y-from.y)*dir.x)})).filter(p=>p.along>1&&p.cross<12).sort((a,b)=>a.along-b.along)[0];if(!next){lines.push([from,point(from.x+dir.x*200,from.y+dir.y*200)]);break;}lines.push([from,next]);if(next.index===2){hit=visited.includes(0)&&visited.includes(1);break;}visited.push(next.index);const o=orientations[next.index];dir=o===1?point(-dir.y,-dir.x):o===2?point(dir.y,dir.x):dir;from=next;}return {lines,hit};}
  const mirrorPoint=p=>p?point(1200-p.x,p.y):null,loversSeals=[point(455,285),point(745,430)];
  const spring=point(460,380),rest=point(745,380),vessel=point(600,245),FLOW=12,TARGET=[54,66];
  const starLeft=[point(430,260),point(430,350),point(430,440)],starRight=[point(770,260),point(770,350),point(770,440)],targetStars=[point(543.333,380),point(656.667,320)];
  const moonWell=point(600,455),moonOptions=[point(420,315),point(600,315),point(780,315)];
  const moonTarget=[[[-18,-18],[0,-18],[0,18],[18,18]],[[-7,11],[0,21],[7,11]]],moonAnswer=1,transformRune=(sx,sy)=>moonTarget.map(line=>line.map(([x,y])=>[x*sx,y*sy]));
  const moonRunes=[transformRune(1,1),transformRune(1,-1),transformRune(-1,1)];
  const sunPads=[point(450,255),point(450,445),point(750,255),point(750,445)],sunReceivers=[point(578,350),point(622,350)],sunWalls=[[point(477,300),point(565,300)],[point(635,400),point(723,400)],[point(600,205),point(600,495)]];
  function sunRay(p,side){const end=sunReceivers[side];if(!p)return {lit:false,line:null};const pad=sunPads.findIndex((v,i)=>Math.floor(i/2)===side&&nodeContains(p,v,RELEASE_RADIUS));if(pad<0)return {lit:false,line:null};let stop=null;for(const [a,b]of sunWalls){const h=intersection(p,end,a,b);if(h&&(!stop||h.t<stop.t))stop=h;}return {lit:!stop,line:[p,stop||end]};}
  const worldVertices=[point(600,225),point(760,365),point(600,505),point(440,365)];
  function create(index,c={}){const valid=c.rulesVersion===4;return {phase:0,rulesVersion:4,orientations:valid&&Array.isArray(c.orientations)&&c.orientations.length===2&&c.orientations.every(v=>Number.isInteger(v)&&v>=0&&v<3)?c.orientations.slice():[0,0],links:valid&&Number.isInteger(c.links)?clamp(c.links,0,3):0,water:0,pourSamples:[],error:0,message:''};}
  function checkpoint(g){return {phase:0,rulesVersion:4,orientations:g.state.orientations.slice(),links:g.state.links};}
  // Compatibility entry points intentionally cannot restore or create permanent echoes.
  const anchors=()=>[],restoreAnchor=()=>null,record=()=>false;
  function changed(g){g.revision++;g.progressAt=g.t;}
  function fail(g,message){g.state.message=message;g.state.error=2.5;}
  function complete(g,origin){g.won=true;g.winOrigin={...origin};g.open=g.ready=false;}
  function sustain(g,key,condition,dt,seconds){g.timers[key]=condition?(g.timers[key]||0)+dt:0;return g.timers[key]+1e-8>=seconds;}
  function at(g,key,p,center,dt){const inside=occupy(g,key,p,center);return sustain(g,key+'-settle',inside,dt,SETTLE_TIME);}
  function update(g,dt,click){
    const s=g.state,id=g.level.id,p=g.point,e=g.echo;g.memory=g.pending=null;s.error=Math.max(0,s.error-dt);g.effect={};g.hold=0;g.need=1;
    const held=(key,p,center)=>at(g,key,p,center,dt),pair=(condition,seconds=PAIR_TIME)=>{const done=sustain(g,'cooperate',condition,dt,seconds);g.hold=g.timers.cooperate;g.need=seconds;return done;};
    if(id==='fool'){const power=held('lamp',e,g.level.seal),arrived=held('exit',p,g.level.exit);g.effect={power,arrived};if(click&&nodeContains(p,g.level.exit)){if(power&&arrived)complete(g,g.level.exit);else fail(g,'星门需要昔光仍在旅灯；回去停一下，再试一次。');}}
    if(id==='magician'){if(click){const i=magic.mirrors.findIndex(m=>nodeContains(p,m));if(i>=0){s.orientations[i]=(s.orientations[i]+1)%3;changed(g);}}const power=held('source',e,magic.source),beam=traceMagic(0,s.orientations),arrived=held('receiver',p,magic.receiver);g.effect={power,arrived,beam};if(click&&nodeContains(p,magic.receiver)){if(power&&beam.hit&&arrived)complete(g,magic.receiver);else fail(g,'昔光供能、两枚折印和接收位置，需要同时成立。');}}
    if(id==='lovers'){const past=held('pastSeal',mirrorPoint(e),loversSeals[0]),now=held('nowSeal',mirrorPoint(p),loversSeals[1]);g.effect={past,now};if(pair(past&&now))complete(g,point(600,355));}
    if(id==='temperance'){
      const now=occupy(g,'spring-now',p,spring),past=occupy(g,'spring-past',e,spring);
      s.pourSamples.push({t:g.t,dt,on:now});while(s.pourSamples.length&&s.pourSamples[0].t<=g.t-2+1e-8)s.pourSamples.shift();
      s.water=clamp(s.water+dt*FLOW*(Number(now)+Number(past)),0,120);
      const future=s.pourSamples.reduce((n,v)=>n+(v.on?v.dt*FLOW:0),0),restNow=held('rest-now',p,rest),restPast=held('rest-past',e,rest),calm=restNow&&restPast,enough=s.water>=TARGET[0]&&s.water<=TARGET[1];
      g.effect={now,past,future,forecast:Math.min(120,s.water+future),calm,enough};
      if(click&&nodeContains(p,vessel)){s.water=0;s.pourSamples=[];g.timeline.samples=[];g.timeline.add(g.t,p);g.echo=null;g.contacts={};g.timers={};changed(g);fail(g,'水杯已放空，旧注水记录也已清除。');}
      else if(pair(enough&&!now&&!past&&calm,.45))complete(g,vessel);
    }
    if(id==='star'){const li=starLeft.findIndex((v,i)=>occupy(g,'left'+i,e,v)),ri=starRight.findIndex((v,i)=>occupy(g,'right'+i,p,v));const connected=li>=0&&ri>=0,hit=connected&&targetStars.every(v=>segmentDistance(v,e,p)<=18);g.effect={li,ri,connected,hit};if(pair(hit))complete(g,point(600,350));}
    if(id==='moon'){const power=held('well',e,moonWell);g.effect={power};if(click){const i=moonOptions.findIndex(v=>nodeContains(p,v));if(i>=0){if(!power)fail(g,'昔光尚未守住月井，先回井边停一下。');else if(i===moonAnswer)complete(g,moonOptions[i]);else fail(g,'不是这个倒影。等昔光离井后，可以重新看真纹。');}}}
    if(id==='sun'){const left=sunRay(e,0),right=sunRay(p,1);g.effect={left:left.lit,right:right.lit,rays:[left.line,right.line].filter(Boolean)};if(pair(left.lit&&right.lit,.4))complete(g,point(600,350));}
    if(id==='world'){const from=s.links,to=(from+1)%4,past=held('world-past',e,worldVertices[from]),now=held('world-now',p,worldVertices[to]);g.effect={past,now,from,to};if(pair(past&&now)){if(from===3)complete(g,worldVertices[0]);else{s.links++;g.timers={};g.contacts={};g.effect={};g.hold=0;changed(g);}}}
    g.view=view(g);g.open=g.ready=g.view.clickable&&!g.won;
  }
  function view(g){
    const id=g.level.id,s=g.state,e=g.effect||{},nodes=[],o={nodes,lines:[],walls:[],stars:[],beams:[],annotations:[],progress:clamp(g.hold/g.need),actionPoint:null,actionLabel:'确认',clickable:false,bounds:[point(330,160),point(870,545)]};
    const n=(key,p,label,sigil='星星',extra={})=>{const v={id:key,...p,label,sigil,radius:NODE_RADIUS,releaseRadius:RELEASE_RADIUS,role:'any',active:false,...extra};nodes.push(v);return v;};
    function cue(p,label,enabled=false){if(enabled&&nodeContains(g.point,p)){o.actionPoint=p;o.actionLabel=label;o.clickable=true;}}
    if(id==='fool'){n('lamp',g.level.seal,'旅灯 · 昔','星星',{role:'echo',active:e.power});n('exit',g.level.exit,'星门 · 今','太阳',{role:'now',active:e.power,exit:true});o.lines=[[g.level.seal,g.level.exit]];if(e.power)o.beams=o.lines;o.message=e.power?'昔光正在守灯。星门呼吸发亮时，点击抵达。':'在旅灯停一下再离开。你的停留，两秒后会被重播。';cue(g.level.exit,'点击抵达',e.power&&e.arrived);}
    if(id==='magician'){n('source',magic.source,'源印 · 昔','太阳',{role:'echo',active:e.power});magic.mirrors.forEach((p,i)=>{n('mirror'+i,p,'折印 · 转向','魔术师',{mirror:s.orientations[i],active:nodeContains(g.point,p)});cue(p,'转动折印',true);});const beam=e.beam||traceMagic(0,s.orientations);n('receiver',magic.receiver,'接收印 · 今','星星',{role:'now',active:e.power&&beam.hit,exit:true});o.lines=[[magic.source,magic.mirrors[0]],[...magic.mirrors],[magic.mirrors[1],magic.receiver]];if(e.power)o.beams=beam.lines;o.message='先转好折印，再让过去守源印。光要经过两次转折，交到现在手中。';cue(magic.receiver,'接住微光',e.power&&beam.hit&&e.arrived);}
    if(id==='lovers'){o.axis=true;o.mirror={now:mirrorPoint(g.point),past:mirrorPoint(g.echo)};n('pastSeal',loversSeals[0],'昔光镜像','月亮',{role:'echo',active:e.past});n('nowSeal',loversSeals[1],'今光镜像','星星',{role:'now',active:e.now});o.annotations=[{x:600,y:180,text:'两侧反照'},{x:600,y:540,text:'右上停留，再赴左下'}];o.message='本体不触发双印，镜像才会。先停留，再交错，让昔与今同时回应。';}
    if(id==='temperance'){n('spring',spring,'注泉 · 今与昔','节制',{active:e.now||e.past});n('rest',rest,'归静 · 双光','星星',{active:e.calm});n('vessel',vessel,'放空重试','节制',{active:e.enough});o.water={value:s.water,forecast:e.forecast||s.water,target:TARGET};o.lines=[[spring,vessel],[vessel,rest]];if(e.now||e.past)o.beams=[[spring,vessel]];o.message=s.water>66?'超过半杯了。点中央水杯放空，再试着更早离开。':e.now?'看虚线预测：昔光还会补水。预测进入半杯带，就向右离开。':e.past?'你已经停下，昔光还在补足。去右侧归静，等两束光会合。':'在左侧注水，右侧静候。虚线表示已经留给过去的水量。';cue(vessel,'放空水杯',true);}
    if(id==='star'){starLeft.forEach((p,i)=>n('left'+i,p,'昔锚','月亮',{role:'echo',active:e.li===i}));starRight.forEach((p,i)=>n('right'+i,p,'今锚','星星',{role:'now',active:e.ri===i}));o.stars=targetStars;o.lines=[[starLeft[0],starLeft[2]],[starRight[0],starRight[2]]];if(e.connected)o.chord=[g.echo,g.point];o.message='两颗小星是一条直线的提示。让昔守左锚、今到右锚，同时贯穿双星。';}
    if(id==='moon'){o.moonMemory={concealed:!!e.power,target:e.power?null:moonTarget};n('well',moonWell,'月井 · 昔','月亮',{role:'echo',active:e.power});moonOptions.forEach((p,i)=>{n('choice'+i,p,'水中倒影','月亮',{glyph:e.power?moonRunes[i]:null,active:e.power,role:'now'});cue(p,'确认倒影',e.power);});o.message=e.power?'真纹暂时隐藏。选它的上下倒影；昔光离井后会重新显现。':'记住真纹，月井停留再离开。昔光守井时，只需选一枚倒影。';}
    if(id==='sun'){sunPads.forEach((p,i)=>n('sun'+i,p,i<2?'昔光位':'今光位','太阳',{role:i<2?'echo':'now',active:nodeContains(i<2?g.echo:g.point,p)}));o.sun={receivers:sunReceivers};o.rayWalls=sunWalls;o.chords=e.rays||[];o.message='看光线在哪里被挡住。昔照左半、今照右半，两个方向要同时畅通。';}
    if(id==='world'){const from=s.links,to=(from+1)%4;worldVertices.forEach((p,i)=>n('world'+i,p,['穹顶','晨光','大地','暮色'][i],'世界',{role:i===from?'echo':'now',active:i===from?e.past:i===to?e.now:i<from,amount:i===to?o.progress:0}));for(let i=0;i<4;i++){const line=[worldVertices[i],worldVertices[(i+1)%4]];o.lines.push(line);if(i<s.links)o.beams.push(line);}o.annotations=[{x:600,y:350,text:s.links+' / 4'},{x:600,y:390,text:'顺时针交接'}];o.message='昔守'+['穹顶','晨光','大地','暮色'][from]+'，今到'+['穹顶','晨光','大地','暮色'][to]+'。接好后先停一下，再走向下一印。';}
    if(s.error)o.message=s.message;if(g.won)o.clickable=false;return o;
  }
  const api={LEVELS,NODE_RADIUS,RELEASE_RADIUS,point,dist,near,clamp,segmentDistance,intersection,nodeContains,occupy,create,update,view,anchors,record,checkpoint,restoreAnchor,magicLayout,traceMagic,loversSeals,mirrorPoint,spring,rest,vessel,FLOW,TARGET,starLeft,starRight,targetStars,moonWell,moonOptions,moonTarget,moonAnswer,moonRunes,sunPads,sunReceivers,sunWalls,sunRay,worldVertices};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcanaRules=api;
})(typeof globalThis!=='undefined'?globalThis:this);
