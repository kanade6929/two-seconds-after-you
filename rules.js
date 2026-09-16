(function(root){
  'use strict';
  const point=(x,y)=>({x,y}),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),near=(a,b,r=40)=>!!a&&dist(a,b)<=r;
  const NODE_RADIUS=40,RELEASE_RADIUS=46;
  function segmentDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1));return dist(p,point(a.x+t*dx,a.y+t*dy));}
  function intersection(a,b,c,d){const rx=b.x-a.x,ry=b.y-a.y,sx=d.x-c.x,sy=d.y-c.y,den=rx*sy-ry*sx;if(Math.abs(den)<1e-9)return null;const t=((c.x-a.x)*sy-(c.y-a.y)*sx)/den,u=((c.x-a.x)*ry-(c.y-a.y)*rx)/den;return t>=0&&t<=1&&u>=0&&u<=1?{t,x:a.x+t*rx,y:a.y+t*ry}:null;}
  function nodeContains(p,center,radius=NODE_RADIUS){if(!p)return false;const x=Math.abs(p.x-center.x),y=Math.abs(p.y-center.y);return Math.max(x,y,(x+y)/Math.SQRT2)<=radius*Math.cos(Math.PI/8)+1e-7;}
  function occupy(g,key,p,center){const yes=nodeContains(p,center,g.contacts[key]?RELEASE_RADIUS:NODE_RADIUS);g.contacts[key]=yes;return yes;}
  const LEVELS=[
    {id:'fool',title:'愚者',roman:'0',theme:'过去留下来，你便可以慢慢出发。',task:'点击旅灯留下影子，再去点击与它相连的星门。',done:'你不再赶路，也能与过去一同抵达。',hint:['主动点击才会留影。影子两秒后抵达，并一直留在选定的机关。','先点左侧旅灯，等留影抵达。再慢慢走到右侧星门点击，无需抢时间。'],seal:point(450,365),exit:point(750,365)},
    {id:'magician',title:'魔术师',roman:'I',theme:'改变一个方向，也能开辟一条路。',task:'在源印留影，转动两枚折印，把光送到星印。',done:'看似折返的光，也找到了自己的去处。',hint:['折印有直通和两种斜面。从源头沿光路推演：下一次需要向哪里转？','两枚折印都转成右上斜面：先向上，再向右。光抵达星印后在那里点击。']},
    {id:'lovers',title:'恋人',roman:'VI',theme:'隔着一道光，也能照见彼此。',task:'点击空处留影，让昔与今的镜像交错点亮两侧机关。',done:'你在这边，我在那边，我们在光中相逢。',hint:['镜子左右反照，两个机关只认镜像，不认本体。左上要昔光，右下要今光；直接站进去不会生效。','先在右上（左上昔印的对面）点击留影。两秒后暖金镜像点亮左印；再走到左下，让青色镜像照亮右下今印。']},
    {id:'temperance',title:'节制',roman:'XIV',theme:'恰好的一半，藏在几次让与接受之间。',task:'源杯留影，再点另一杯倒水；用容量 8、5、3，分出 4 与 4。',done:'倾倒与留白，让彼此都刚刚好。',hint:['每次倒到源杯空或目标杯满。先用小杯从中杯取走三份，就能留下两份。','依次倒：大→中，中→小，小→大，中→小，大→中，中→小，小→大。换源杯先按「收回留影」。']},
    {id:'star',title:'星星',roman:'XVII',theme:'没有哪一段来路，需要被重复走过。',task:'选起星留影，逐颗点击连星；一笔走完星弦，每条只能走一次。',done:'那些散落的光，连成了一段完整的路。',hint:['数每颗星连了几条弦。除了起终点，其余星每次进入都还要出去。','从左下留影，依次点：左上、屋顶、右上、左上、右下、右上、左下、右下。可撤回一步，不用描线。']},
    {id:'moon',title:'月亮',roman:'XVIII',theme:'看见倒影，也记得自己原来的模样。',task:'记住真纹；月井留影后，选出它在水中的上下倒影。',done:'夜色改变了方向，没有改变你。',hint:['水面反转上下，左右仍在原处。先看根部尖角朝向，再看左右分枝的高低。','正确倒影根部尖角朝上，高枝在右、低枝在左：选中间一枚。收回留影可重新看真纹。']},
    {id:'sun',title:'太阳',roman:'XIX',theme:'光不必更多，只需照在恰当的地方。',task:'日核留影，再切换光键；同窗两束光会抵消，让四窗全亮。',done:'你学会了让光彼此成全，而非彼此遮蔽。',hint:['日核先照两扇外窗。顺着细线看每个光键影响哪两窗；开关一次，就是翻转这两窗。','打开左键与中键，右键保持关闭。左外窗被两键翻转两次，恢复亮；两扇内窗各翻转一次，变亮。']},
    {id:'world',title:'世界',roman:'XXI',theme:'让过去转身，也让现在找到位置。',task:'留影选一片，点另一片：今顺转、昔逆转，拼合完整回环。',done:'那些曾经错开的部分，也成为了完整的你。',hint:['每次改变两片，总转角守恒。先找需要相反转向的两片，再选谁留在过去。','昔守上片，点右片两次；收回留影，昔守左片，点下片两次。角度保留，没有操作时限。']}
  ].map(l=>({...l,phases:1,spawn:point(340,495)}));
  const magic={source:point(390,430),mirrors:[point(560,430),point(560,270)],receiver:point(770,270)};
  function magicLayout(){return magic;}
  function traceMagic(phase,orientations){
    const lines=[],visited=[];let from=magic.source,dir=point(1,0),hit=false;
    for(let step=0;step<4;step++){
      const next=[...magic.mirrors.map((p,i)=>({...p,index:i})),{...magic.receiver,index:2}].filter(p=>!visited.includes(p.index)).map(p=>({...p,along:(p.x-from.x)*dir.x+(p.y-from.y)*dir.y,cross:Math.abs((p.x-from.x)*dir.y-(p.y-from.y)*dir.x)})).filter(p=>p.along>1&&p.cross<12).sort((a,b)=>a.along-b.along)[0];
      if(!next){lines.push([from,point(from.x+dir.x*230,from.y+dir.y*230)]);break;}lines.push([from,next]);if(next.index===2){hit=visited.includes(0)&&visited.includes(1);break;}visited.push(next.index);const o=orientations[next.index];dir=o===1?point(-dir.y,-dir.x):o===2?point(dir.y,dir.x):dir;from=next;
    }return {lines,hit};
  }
  const mirrorPoint=p=>p?point(1200-p.x,p.y):null,loversSeals=[point(420,280),point(780,440)];
  const cups=[point(390,365),point(600,365),point(810,365)],capacities=[8,5,3];
  function pour(water,from,to){const next=water.slice(),amount=Math.min(next[from],capacities[to]-next[to]);if(from===to||amount<=0)return null;next[from]-=amount;next[to]+=amount;return next;}
  const starVertices=[point(450,465),point(450,300),point(600,180),point(750,300),point(750,465)],starEdges=[[0,1],[1,2],[2,3],[3,1],[1,4],[4,3],[3,0],[0,4]];
  const starEdge=(a,b)=>starEdges.findIndex(([x,y])=>x===a&&y===b||x===b&&y===a);
  function starWalk(path,next){if(!path.length)return [next];const edge=starEdge(path.at(-1),next),used=path.slice(1).map((v,i)=>starEdge(path[i],v));return edge<0||used.includes(edge)?null:[...path,next];}
  const moonWell=point(600,455),moonOptions=[point(420,315),point(600,315),point(780,315)];
  const moonTarget=[[[-18,-18],[0,-18],[0,18],[18,18]],[[-7,11],[0,21],[7,11]]],moonAnswer=1;
  const transformRune=(sx,sy)=>moonTarget.map(line=>line.map(([x,y])=>[x*sx,y*sy]));
  const moonRunes=[transformRune(1,1),transformRune(1,-1),transformRune(-1,1)];
  const sunSource=point(370,390),sunKeys=[point(520,440),point(670,440),point(820,440)],sunWindows=[point(480,235),point(600,235),point(720,235),point(840,235)],sunMasks=[3,5,9],sunBase=9;
  const sunBits=mask=>sunMasks.reduce((v,m,i)=>mask&(1<<i)?v^m:v,sunBase);
  const worldVertices=[point(600,210),point(765,365),point(600,510),point(435,365)],worldInitial=[2,3,0,1];
  const worldJoined=turns=>turns.map((v,i)=>v===i);
  function worldPorts(i,turn){const v=worldVertices[i],a=turn*Math.PI/2;return [[-1,1],[1,1]].map(([x,y])=>point(v.x+26*(x*Math.cos(a)-y*Math.sin(a)),v.y+26*(x*Math.sin(a)+y*Math.cos(a))));}
  function worldRestore(v){return Array.isArray(v)&&v.length===4&&v.every(n=>Number.isInteger(n)&&n>=0&&n<4)&&v.reduce((a,b)=>a+b,0)%4===2?v.slice():worldInitial.slice();}
  function anchors(index){
    switch(LEVELS[index].id){
      case'fool':return [{id:'lamp',...LEVELS[0].seal}];case'magician':return [{id:'source',...magic.source}];
      case'lovers':return [];case'temperance':return cups.map((p,i)=>({id:'cup'+i,...p}));
      case'star':return starVertices.map((p,i)=>({id:'star'+i,...p}));case'moon':return [{id:'well',...moonWell}];
      case'sun':return [{id:'source',...sunSource}];case'world':return worldVertices.map((p,i)=>({id:'piece'+i,...p}));
    }
  }
  function create(index,c={}){
    const orientations=Array.isArray(c.orientations)&&c.orientations.length===2&&c.orientations.every(v=>Number.isInteger(v)&&v>=0&&v<3)?c.orientations.slice():[0,0];
    const water=Array.isArray(c.water)&&c.water.length===3&&c.water.every((v,i)=>Number.isInteger(v)&&v>=0&&v<=capacities[i])&&c.water.reduce((a,b)=>a+b,0)===8?c.water.slice():[8,0,0];
    let path=[];if(Array.isArray(c.path)&&c.path.length<=9)for(const v of c.path){if(!Number.isInteger(v)||v<0||v>4){path=[];break;}const next=starWalk(path,v);if(!next){path=[];break;}path=next;}
    return {phase:0,orientations,water,path,mask:Number.isInteger(c.mask)&&c.mask>=0&&c.mask<8?c.mask:0,turns:worldRestore(c.turns),error:0,message:''};
  }
  function restoreAnchor(index,c){if(index===2&&c.anchor==='reflection'&&Number.isFinite(c.anchorPoint?.x)&&Number.isFinite(c.anchorPoint?.y)&&c.anchorPoint.x>=0&&c.anchorPoint.x<=1200&&c.anchorPoint.y>=0&&c.anchorPoint.y<=650)return {id:'reflection',...c.anchorPoint};return anchors(index).find(a=>a.id===c.anchor)||null;}
  function checkpoint(g){const a=g.memory||g.pending;return {phase:0,orientations:g.state.orientations.slice(),water:g.state.water.slice(),path:g.state.path.slice(),mask:g.state.mask,turns:g.state.turns.slice(),anchor:a?.id||null,...(a?.id==='reflection'?{anchorPoint:point(a.x,a.y)}:{})};}
  function changed(g){g.revision++;g.progressAt=g.t;g.state.error=0;}
  function fail(g,message){g.state.message=message;g.state.error=2.5;}
  function complete(g,origin){g.won=true;g.open=false;g.ready=false;g.winOrigin={...origin};}
  function record(g,anchor){
    const existing=g.pending||g.memory,same=existing?.id===anchor.id&&(anchor.id!=='reflection'||near(existing,anchor,12));
    if(same){g.pending=null;g.memory=null;g.echo=g.timeline.at(g.t-2);}
    else{g.memory=null;g.pending={...anchor,at:g.t+2};}changed(g);
  }
  function tickMemory(g){
    if(g.pending&&g.t+1e-8>=g.pending.at){g.memory={id:g.pending.id,x:g.pending.x,y:g.pending.y};g.pending=null;changed(g);}
    if(g.memory)g.echo={x:g.memory.x,y:g.memory.y,down:false};
  }
  function update(g,dt,click){
    g.state.error=Math.max(0,g.state.error-dt);tickMemory(g);g.hold=0;g.need=1;
    const s=g.state,id=g.level.id,a=anchors(g.index),hit=arr=>arr.findIndex(p=>nodeContains(g.point,p)),mem=g.memory?.id;
    if(click&&!g.won){
      const i=hit(a),anchor=i>=0?a[i]:null;
      // A pending memory cannot be borrowed early, nor silently retargeted by
      // tapping a destination while it is still being established.
      if(g.pending&&['temperance','star','world'].includes(id)){if(anchor?.id===g.pending.id)record(g,anchor);else fail(g,'留影尚未抵达。抵达后即可慢慢行动。');}
      else if(id==='fool'){if(anchor)record(g,anchor);else if(nodeContains(g.point,g.level.exit)){if(mem==='lamp')complete(g,g.level.exit);else fail(g,'先在旅灯点击留影，它会一直等你。');}}
      else if(id==='magician'){const j=hit(magic.mirrors);if(anchor)record(g,anchor);else if(j>=0){s.orientations[j]=(s.orientations[j]+1)%3;changed(g);}else if(nodeContains(g.point,magic.receiver)){if(mem==='source'&&traceMagic(0,s.orientations).hit)complete(g,magic.receiver);else fail(g,'检查光是否经过两枚折印，真正抵达这里。');}}
      else if(id==='lovers')record(g,{id:'reflection',x:g.point.x,y:g.point.y});
      else if(id==='temperance'&&anchor){if(!mem||mem===anchor.id)record(g,anchor);else{const next=pour(s.water,Number(mem.slice(3)),i);if(next){s.water=next;changed(g);if(next[0]===4&&next[1]===4)complete(g,point(600,365));}else fail(g,'源杯已空，或目标已满。收回留影，换一个源杯。');}}
      else if(id==='star'&&anchor){if(!mem){s.path=[i];record(g,anchor);}else{const next=starWalk(s.path,i);if(next){s.path=next;changed(g);if(next.length===starEdges.length+1)complete(g,starVertices[i]);}else fail(g,'这条星弦已走过，或两星没有相连。可撤回一步。');}}
      else if(id==='moon'){const j=hit(moonOptions);if(anchor)record(g,anchor);else if(j>=0){if(mem==='well'){if(j===moonAnswer)complete(g,moonOptions[j]);else fail(g,'这是另一种翻转。收回留影可以重看真纹。');}else fail(g,'先记住真纹，再在月井留影，倒影才会显现。');}}
      else if(id==='sun'){const j=hit(sunKeys);if(anchor)record(g,anchor);else if(j>=0){s.mask^=1<<j;changed(g);}}
      else if(id==='world'&&anchor){if(!mem||mem===anchor.id)record(g,anchor);else{s.turns[i]=(s.turns[i]+1)%4;const past=Number(mem.slice(5));s.turns[past]=(s.turns[past]+3)%4;changed(g);if(worldJoined(s.turns).every(Boolean))complete(g,point(600,365));}}
    }
    if(id==='sun'&&g.memory?.id==='source'&&sunBits(s.mask)===15)complete(g,point(660,235));
    if(id==='lovers'&&g.memory&&nodeContains(mirrorPoint(g.memory),loversSeals[0])&&nodeContains(mirrorPoint(g.point),loversSeals[1]))complete(g,point(600,365));
    g.view=view(g);g.open=g.view.clickable&&!g.won;g.ready=g.open;
  }
  function view(g){
    const id=g.level.id,s=g.state,mem=g.memory?.id,waiting=g.pending,nodes=[],o={nodes,lines:[],walls:[],stars:[],beams:[],annotations:[],progress:0,actionPoint:null,actionLabel:'确认',clickable:false,bounds:[point(315,150),point(900,535)]};
    function n(key,p,label,sigil='星星',extra={}){
      const held=mem===key,pending=waiting?.id===key;const v={id:key,...p,label,sigil,radius:NODE_RADIUS,releaseRadius:RELEASE_RADIUS,role:held||pending?'echo':'any',active:held||nodeContains(g.point,p),...extra};
      if(pending){v.amount=clamp(1-(waiting.at-g.t)/2);v.label='留影抵达中';}nodes.push(v);return v;
    }
    function cue(p,label){if(nodeContains(g.point,p)){o.actionPoint=p;o.actionLabel=label;o.clickable=true;}}
    function anchorCues(){for(const p of anchors(g.index))cue(p,mem===p.id?'收回留影':waiting?.id===p.id?'取消留影':'点击留影');}
    if(id==='fool'){
      n('lamp',g.level.seal,mem?'旅灯 · 已留影':'旅灯 · 点击留影');n('exit',g.level.exit,'星门','太阳',{active:mem==='lamp',exit:true});o.lines=[[g.level.seal,g.level.exit]];if(mem)o.beams=o.lines;
      o.message=mem?'影子已经留下。慢慢走到星门，点击抵达。':'在旅灯上点击一次，两秒后影子会守在这里。无需赶时间。';anchorCues();if(mem)cue(g.level.exit,'点击抵达');
    }
    if(id==='magician'){
      n('source',magic.source,'源印 · 留影','太阳');magic.mirrors.forEach((p,i)=>{n('mirror'+i,p,'折印 · 转向','魔术师',{mirror:s.orientations[i]});cue(p,'转动折印');});
      const beam=traceMagic(0,s.orientations);n('receiver',magic.receiver,'星印 · 接光','星星',{active:mem==='source'&&beam.hit,exit:true});if(mem)o.beams=beam.lines;
      o.message='光遇斜面会转向，遇横印会直行。先看光路，再调整。';anchorCues();if(mem&&beam.hit)cue(magic.receiver,'接住微光');
    }
    if(id==='lovers'){
      o.mirror={now:mirrorPoint(g.point),past:mirrorPoint(g.echo),pinned:!!g.memory,pending:g.pending?{...g.pending,amount:clamp(1-(g.pending.at-g.t)/2)}:null};o.axis=true;
      n('pastSeal',loversSeals[0],'昔光镜像','月亮',{role:'echo',active:!!g.memory&&nodeContains(mirrorPoint(g.memory),loversSeals[0])});
      n('nowSeal',loversSeals[1],'今光镜像','星星',{role:'now',active:nodeContains(mirrorPoint(g.point),loversSeals[1])});
      o.message='只有镜像能点亮机关。本体与镜像之间的虚线，指向你要站的另一侧。';o.annotations=[{x:600,y:185,text:'本体与镜像 · 同高反照'},{x:600,y:545,text:'点击空处留影，再移动另一个自己'}];
      const existing=g.pending||g.memory;cue(g.point,existing&&near(existing,g.point,12)?'收回此处留影':existing?'在此重留影':'点击留下过去');
    }
    if(id==='temperance'){
      cups.forEach((p,i)=>{n('cup'+i,p,['大杯','中杯','小杯'][i]+' · 容量 '+capacities[i],'节制',{water:s.water[i],capacity:capacities[i],active:mem==='cup'+i});cue(p,!mem?'选作源杯':mem==='cup'+i?'收回留影':'倒入此杯');});
      o.annotations=[{x:600,y:205,text:'目标：大杯 4 · 中杯 4 · 小杯 0'},{x:600,y:490,text:'每次倒至一杯空，或另一杯满'}];o.message='留影所在的杯是源杯。换源杯先收回留影；水量永远是八份。';
    }
    if(id==='star'){
      const used=s.path.slice(1).map((v,i)=>starEdge(s.path[i],v));o.lines=starEdges.map(([a,b])=>[starVertices[a],starVertices[b]]);o.beams=used.map(e=>o.lines[e]);
      starVertices.forEach((p,i)=>{n('star'+i,p,s.path.at(-1)===i?'当前星':i===2?'穹顶':'星印','星星',{active:s.path.includes(i)});cue(p,mem?'连接此星':'从此留影');});
      o.annotations=[{x:600,y:550,text:'已连接 '+used.length+' / '+starEdges.length+' 条星弦'}];o.message='每次点击沿一条已有星弦前进。无需描线，无需按住，也没有时限。';
    }
    if(id==='moon'){
      o.moonMemory={concealed:mem==='well',target:mem==='well'?null:moonTarget};n('well',moonWell,'月井 · 留影','月亮');
      moonOptions.forEach((p,i)=>{n('choice'+i,p,mem?'选择倒影':'水中倒影','月亮',{glyph:mem?moonRunes[i]:null});if(mem)cue(p,'确认倒影');});
      o.message=mem?'真纹已隐藏。辨认上下倒影；忘记可收回留影重看。':'先看上方真纹的分枝与根部，再点击月井。';anchorCues();
    }
    if(id==='sun'){
      const bits=mem?sunBits(s.mask):sunBits(s.mask)^sunBase;n('source',sunSource,'日核 · 留影','太阳');
      sunKeys.forEach((p,i)=>{n('key'+i,p,'光键 · '+(s.mask&(1<<i)?'开':'关'),'太阳',{active:!!(s.mask&(1<<i))});cue(p,'切换光键');});
      o.lightWindows=sunWindows.map((p,i)=>({...p,on:!!(bits&(1<<i))}));
      for(let i=0;i<3;i++)for(let j=0;j<4;j++)if(sunMasks[i]&(1<<j)){o.lines.push([sunKeys[i],sunWindows[j]]);if(s.mask&(1<<i))o.beams.push([sunKeys[i],sunWindows[j]]);}
      for(const j of [0,3]){o.lines.push([sunSource,sunWindows[j]]);if(mem)o.beams.push([sunSource,sunWindows[j]]);}
      o.annotations=[{x:660,y:170,text:'同窗：奇数束亮 · 偶数束暗'}];o.message='日核照两扇外窗。每枚光键翻转它连着的两窗，再点一次可关。';anchorCues();
    }
    if(id==='world'){
      o.world={turns:s.turns,joined:worldJoined(s.turns)};worldVertices.forEach((p,i)=>{n('piece'+i,p,['穹顶','晨光','大地','暮色'][i],'世界',{turn:s.turns[i]});cue(p,!mem?'选作昔片':mem==='piece'+i?'收回留影':'今顺转 · 昔逆转');});
      o.message='留影固定一片，你转另一片。换昔片先收回留影；角度一直保留。';
    }
    if(waiting){o.message='两秒后，留影会停在选定机关。抵达后不会消失。';if(['temperance','star','world'].includes(id)&&o.actionPoint&&!nodeContains(o.actionPoint,waiting))o.clickable=false;}
    if(s.error)o.message=s.message;
    if(g.won)o.clickable=false;
    return o;
  }
  const api={LEVELS,NODE_RADIUS,RELEASE_RADIUS,point,dist,near,clamp,segmentDistance,intersection,nodeContains,occupy,create,update,view,anchors,record,checkpoint,restoreAnchor,worldVertices,worldInitial,worldPorts,worldJoined,worldRestore,magicLayout,traceMagic,loversSeals,mirrorPoint,cups,capacities,pour,starVertices,starEdges,starEdge,starWalk,moonWell,moonOptions,moonTarget,moonAnswer,moonRunes,sunSource,sunKeys,sunWindows,sunMasks,sunBase,sunBits};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcanaRules=api;
})(typeof globalThis!=='undefined'?globalThis:this);
