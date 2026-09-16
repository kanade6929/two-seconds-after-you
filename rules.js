(function(root){
  'use strict';
  const point=(x,y)=>({x,y}),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),near=(a,b,r=40)=>!!a&&dist(a,b)<=r;
  const NODE_RADIUS=40,RELEASE_RADIUS=46;
  function segmentDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1));return dist(p,point(a.x+t*dx,a.y+t*dy));}
  function intersection(a,b,c,d){const rx=b.x-a.x,ry=b.y-a.y,sx=d.x-c.x,sy=d.y-c.y,den=rx*sy-ry*sx;if(Math.abs(den)<1e-9)return null;const t=((c.x-a.x)*sy-(c.y-a.y)*sx)/den,u=((c.x-a.x)*ry-(c.y-a.y)*rx)/den;return t>=0&&t<=1&&u>=0&&u<=1?{t,x:a.x+t*rx,y:a.y+t*ry}:null;}
  const LEVELS=[
    {id:'fool',title:'愚者',roman:'0',phases:2,theme:'迈步之前，先相信留下的自己。',task:'在旅灯留下停留，影子接手时，在同一条光路的尽头点击。',done:'你迈出了第一步，而过去没有离开。',hint:['停留会在两秒后重播，不会永久守住旅灯。','旅灯亮起后，再停约 1 秒；走向右侧星门，等门框闪光再点击。'],spawn:point(330,430),seal:point(470,365),exit:point(710,365)},
    {id:'magician',title:'魔术师',roman:'I',phases:3,theme:'将意愿，变成抵达彼岸的光。',task:'布置两枚折印，影子守源印，你在光束尽头接光并点击。',done:'你创造的光路，也成为了归途。',hint:['出口就是接收印。两枚折印都必须经过，影子离开源印，门便关闭。','三阵折印依次为「直通、右上斜」「右上斜、右上斜」「右下斜、右下斜」。先布光，再在源印留下停留，去接收印等闪光。']},
    {id:'lovers',title:'恋人',roman:'VI',phases:3,theme:'和谐不是重叠，而是彼此回应。',task:'先在昔印按住留下回应，再到今印按住；三组镜像相合即完成。',done:'不必成为彼此，也能一起完整。',hint:['不仅位置要成对，两秒前的按住也会被重播。在同一个印内可以自由微移。','每阵先在昔印按住约 1 秒；松手走到今印，再按住 0.6 秒。下一阵交换左右或高度；第三次回应直接完成。']},
    {id:'temperance',title:'节制',roman:'XIV',phases:2,theme:'不是越多越好，恰好才是答案。',task:'两光分站天平两侧，用重量与力臂相补；两阵平衡，便可抵达。',done:'不必拥有相同的重量，也可以找到平衡。',hint:['压下天平的力量 = 光的重量 × 刻度。重的一束站近些，轻的一束站远些；不是都站最远。','第一阵今重 1、昔重 2：昔守一格，今到对侧二格。第二阵今重 2、昔重 3：昔守二格，今到对侧三格。分站后保持平衡 0.65 秒，不用按住。']},
    {id:'star',title:'星星',roman:'XVII',phases:4,theme:'希望，是两点之间仍愿意相连的光。',task:'让两个端印连成一条弦，同时穿过双星；末阵从右向左回应。',done:'失散的微光，终于连成了归途。',hint:['光弦连接的是印心，不会被印内微移拉歪。最后一阵的昔、今角色会反转。','前三阵昔左今右：中与中、下与上、上与下。末阵昔右中、今左上；双星同时点亮 0.55 秒，直接在今端点击。']},
    {id:'moon',title:'月亮',roman:'XVIII',phases:3,theme:'暂时看不清，也可以慢慢辨认。',task:'影子守月井显出真纹，依照上方图腾顺序点击；最终真纹就是出口。',done:'你没有驱散夜色，却学会了辨认。',hint:['每轮要按顺序辨认两枚真纹。月井失守或选错时，只清空本轮顺序。','先在月井留光，再依次选择上方两枚图腾；中途可回井重新建立回声。每次都需真纹仍显露。最终一轮的第二枚真纹直接结束关卡。']},
    {id:'sun',title:'太阳',roman:'XIX',phases:3,theme:'光不必独占，共同照亮才完整。',task:'分守遮板两侧的互补位置，点亮双半日；末阵在右侧合光印按住。',done:'你的光与我的光，让白昼完整。',hint:['两束光都要来自自己的印，且不能被遮板挡住。最后需要主动按住今印。','前三阵位置依次左下与右上、左上与右下、左下与右上。昔印留光后绕过遮板末端去今印；末阵双半日亮起后按住 0.7 秒，光便在中央汇合。']},
    {id:'world',title:'世界',roman:'XXI',phases:1,theme:'不再追赶过去，而是与它一同完整。',task:'影子守一片，点击另一片：今顺转、昔逆转。拼合四片环纹，让世界完整。',done:'那些看似错开的部分，也能成为完整的你。',hint:['每次点击会一起转动两片：今片顺时针，昔片逆时针。转好的方向会保留，可以慢慢安排下一次合作。','初始局面可这样拼合：昔守上片，今到右片点击两次；再昔守左片，今到下片点击两次。四段线纹都沿菱形轨道相接，最后一次旋转直接完成。']}
  ].map(l=>({...l,spawn:l.spawn||point(330,495)}));
  const loversPairs=[[point(450,350),point(750,350)],[point(750,440),point(450,440)],[point(440,290),point(760,290)]];
  const balancePads=[330,420,510,690,780,870].map(x=>point(x,365));
  const balanceMasses=[[1,2],[2,3]];
  const balanceArm=i=>Math.abs(balancePads[i].x-600)/90;
  const starLeft=[point(415,275),point(415,365),point(415,455)],starRight=[point(735,275),point(735,365),point(735,455)],starPairs=[[1,1],[2,0],[0,2],[0,1]];
  const moonWell=point(560,435),moonOptions=[point(390,280),point(560,260),point(730,280)],moonMaps=[['太阳','月亮','星星'],['星星','太阳','月亮'],['月亮','星星','太阳']],moonTargets=[['星星','太阳'],['太阳','月亮'],['月亮','星星']];
  const worldVertices=[point(600,225),point(740,365),point(600,505),point(460,365)],worldInitial=[2,3,0,1];
  function worldPorts(i,turn){const v=worldVertices[i],a=turn*Math.PI/2;return [[-1,1],[1,1]].map(([x,y])=>point(v.x+26*(x*Math.cos(a)-y*Math.sin(a)),v.y+26*(x*Math.sin(a)+y*Math.cos(a))));}
  const worldJoined=turns=>turns.map((turn,i)=>turn===i);
  function worldRestore(value){return Array.isArray(value)&&value.length===4&&value.every(n=>Number.isInteger(n)&&n>=0&&n<4)&&value.reduce((a,b)=>a+b,0)%4===2?[...value]:[...worldInitial];}
  function magicLayout(phase){return [
    {source:point(360,430),mirrors:[point(510,430),point(660,430)],receiver:point(660,275)},
    {source:point(400,430),mirrors:[point(560,430),point(560,270)],receiver:point(760,270)},
    {source:point(400,270),mirrors:[point(560,270),point(560,430)],receiver:point(760,430)}
  ][Math.min(2,phase)];}
  function traceMagic(phase,orientations){
    const m=magicLayout(phase),lines=[],visited=[];let from=m.source,dir=point(1,0),hit=false;
    for(let step=0;step<4;step++){
      const next=[...m.mirrors.map((p,i)=>({...p,index:i})),{...m.receiver,index:2}].filter(p=>!visited.includes(p.index)).map(p=>({...p,along:(p.x-from.x)*dir.x+(p.y-from.y)*dir.y,cross:Math.abs((p.x-from.x)*dir.y-(p.y-from.y)*dir.x)})).filter(p=>p.along>1&&p.cross<12).sort((a,b)=>a.along-b.along)[0];
      if(!next){lines.push([from,point(from.x+dir.x*350,from.y+dir.y*350)]);break;}lines.push([from,next]);if(next.index===2){hit=visited.includes(0)&&visited.includes(1);break;}visited.push(next.index);const o=orientations[next.index];dir=o===1?point(-dir.y,-dir.x):o===2?point(dir.y,dir.x):dir;from=next;
    }return {lines,hit};
  }
  function sunLayout(phase){const f=phase===1?-1:1,y=365;return {center:point(600,y),receivers:[point(582,y),point(618,y)],pads:[point(460,y+f*60),point(740,y-f*60)],walls:[[point(530,y-f*10),point(530,y-f*85)],[point(670,y+f*10),point(670,y+f*85)],[point(600,340),point(600,390)]]};}
  function sunVisibility(p,i,m){return !!p&&(i===0?p.x<550:p.x>650)&&!m.walls.some(([a,b])=>intersection(p,m.receivers[i],a,b));}
  function starLayout(phase){const [i,j]=starPairs[phase],a=starLeft[i],b=starRight[j];return {a,b,reversed:phase===3,stars:[.36,.64].map(f=>point(a.x+(b.x-a.x)*f,a.y+(b.y-a.y)*f))};}
  function create(index,c={}){return {phase:clamp(Number.isInteger(c.phase)?c.phase:0,0,LEVELS[index].phases-1),orientations:[0,0],turns:worldRestore(c.turns),sequence:0,error:0};}
  function occupancy(g,key,condition,dt,need=.3){g.timers[key]=condition?(g.timers[key]||0)+dt:0;return g.timers[key]>=need-1e-8;}
  // Spatial hysteresis, never a time grace. The visible outer ring is the exact
  // release boundary. Role-specific latches cannot be borrowed by the other light.
  function nodeContains(p,center,radius=NODE_RADIUS){if(!p)return false;const x=Math.abs(p.x-center.x),y=Math.abs(p.y-center.y);return Math.max(x,y,(x+y)/Math.SQRT2)<=radius*Math.cos(Math.PI/8)+1e-7;}
  function occupy(g,key,p,center){const was=g.contacts[key]===true,yes=nodeContains(p,center,was?RELEASE_RADIUS:NODE_RADIUS);g.contacts[key]=yes;return yes;}
  const held=(g,key)=>g.contacts[key]===true;
  function charge(g,valid,dt,need){g.need=need;g.hold=valid?g.hold+dt:0;g.open=valid&&g.hold>=need-1e-8;return g.open;}
  function complete(g,origin){g.won=true;g.open=false;g.ready=false;g.winOrigin={...origin};}
  function advance(g,origin){
    if(g.state.phase===g.level.phases-1){complete(g,origin);return;}
    const timeline=new g.timeline.constructor();timeline.samples=g.timeline.samples.slice();
    g.transition={remaining:.44,duration:.44,previous:{index:g.index,level:g.level,state:{...g.state},view:view(g),point:{...g.point},echo:g.echo&&{...g.echo},timeline,t:g.t,hold:g.hold,effect:{...g.effect}}};
    g.state.phase++;g.hold=0;g.open=false;g.timers={};g.contacts={};g.progressAt=g.t;g.revision++;g.state.orientations=[0,0];g.state.sequence=0;g.effect={};g.timeline.samples=[];g.timeline.add(g.t,g.point);g.echo=null;
  }
  const modules={
    fool(g,dt,click){const l=g.level,here=occupy(g,'lampNow',g.point,l.seal),past=occupy(g,'lampEcho',g.echo,l.seal),end=occupy(g,'foolEnd',g.point,l.exit);if(g.state.phase===0){if(charge(g,here,dt,.3))advance(g,l.seal);return;}const powered=occupancy(g,'source',past,dt);g.effect={powered};if(charge(g,powered&&end,dt,.25)&&click)complete(g,l.exit);},
    magician(g,dt,click){const s=g.state,m=magicLayout(s.phase);if(click){const i=m.mirrors.findIndex(v=>near(g.point,v));if(i>=0){s.orientations[i]=(s.orientations[i]+1)%3;g.hold=0;}}const past=occupy(g,'source',g.echo,m.source),end=occupy(g,'receiver',g.point,m.receiver),powered=occupancy(g,'source',past,dt),beam=traceMagic(s.phase,s.orientations);g.effect={powered,lines:beam.lines,beamHit:beam.hit};if(charge(g,powered&&beam.hit&&end,dt,.55)&&click)advance(g,m.receiver);},
    lovers(g,dt){const [past,now]=loversPairs[g.state.phase],e=occupy(g,'past',g.echo,past),p=occupy(g,'now',g.point,now),paired=p&&e,responding=paired&&g.point.down&&g.echo.down;g.effect={paired,responding};if(charge(g,responding,dt,.6))advance(g,point(600,now.y));},
    temperance(g,dt){let now=-1,past=-1;balancePads.forEach((p,i)=>{if(occupy(g,'balanceNow'+i,g.point,p))now=i;if(occupy(g,'balanceEcho'+i,g.echo,p))past=i;});const [mNow,mPast]=balanceMasses[g.state.phase],opposite=now>=0&&past>=0&&(now<3)!==(past<3),torque=[0,0];if(now>=0)torque[now<3?0:1]+=balanceArm(now)*mNow;if(past>=0)torque[past<3?0:1]+=balanceArm(past)*mPast;g.effect={now,past,torque,opposite};if(charge(g,opposite&&torque[0]===torque[1],dt,.65))advance(g,point(600,365));},
    star(g,dt,click){const m=starLayout(g.state.phase),leftRole=m.reversed?'now':'echo',rightRole=m.reversed?'echo':'now',lp=m.reversed?g.point:g.echo,rp=m.reversed?g.echo:g.point;let li=-1,ri=-1;
      starLeft.forEach((v,i)=>{if(occupy(g,'left'+i,lp,v))li=i;});starRight.forEach((v,i)=>{if(occupy(g,'right'+i,rp,v))ri=i;});
      const a=li<0?null:starLeft[li],b=ri<0?null:starRight[ri],valid=!!a&&!!b&&m.stars.every(v=>segmentDistance(v,a,b)<=12);g.effect={powered:!!a&&!!b,chord:a&&b?[a,b]:null,stars:m.stars,leftRole,rightRole};
      if(charge(g,valid,dt,.55)&&click)advance(g,m.reversed?a:b);
    },
    moon(g,dt,click){const s=g.state,past=occupy(g,'well',g.echo,moonWell),revealed=occupancy(g,'well',past,dt);let at=-1;moonOptions.forEach((v,i)=>{if(occupy(g,'choice'+i,g.point,v))at=i;});if(!past)s.sequence=0;g.effect={revealed};const target=moonTargets[s.phase][s.sequence],correct=at>=0&&moonMaps[s.phase][at]===target;charge(g,revealed&&correct,dt,.18);
      if(click&&at>=0){if(g.open){s.sequence++;g.hold=0;g.open=false;if(s.sequence===2)advance(g,moonOptions[at]);}else if(revealed&&!correct){s.sequence=0;s.error=.6;g.hold=0;}}
    },
    sun(g,dt){const s=g.state,m=sunLayout(s.phase),past=occupy(g,'past',g.echo,m.pads[0]),now=occupy(g,'now',g.point,m.pads[1]),left=past&&sunVisibility(m.pads[0],0,m),right=now&&sunVisibility(m.pads[1],1,m);g.effect={left,right};if(charge(g,left&&right&&(s.phase!==2||g.point.down),dt,s.phase===2?.7:.65))advance(g,m.center);},
    world(g,dt,click){let now=-1,past=-1;worldVertices.forEach((p,i)=>{if(occupy(g,'worldNow'+i,g.point,p))now=i;if(occupy(g,'worldEcho'+i,g.echo,p))past=i;});const pair=now>=0&&past>=0&&now!==past;
      if(g.effect.now!==now||g.effect.past!==past)g.hold=0;
      g.effect={now,past,joined:worldJoined(g.state.turns)};
      if(charge(g,pair,dt,.25)&&click){g.state.turns[now]=(g.state.turns[now]+1)%4;g.state.turns[past]=(g.state.turns[past]+3)%4;g.effect.joined=worldJoined(g.state.turns);g.hold=0;g.open=false;g.revision++;g.progressAt=g.t;if(g.effect.joined.every(Boolean))complete(g,point(600,365));}
    }
  };
  function update(g,dt,click){g.state.error=Math.max(0,g.state.error-dt);g.open=false;if(!g.won)modules[g.level.id](g,dt,click);g.ready=g.open;}
  const node=(id,p,label,sigil='星星',role='any',extra={})=>({id,...p,label,sigil,role,radius:NODE_RADIUS,releaseRadius:RELEASE_RADIUS,...extra});
  function view(g){
    const l=g.level,s=g.state,o={nodes:[],lines:[],walls:[],stars:[],message:'',progress:clamp(g.hold/(g.need||.3)),actionPoint:null,actionLabel:'',clickable:false};
    const n=(id,p,label,sigil,role,active,extra={})=>node(id,p,label,sigil,role,{active,...extra});
    if(l.id==='fool'){o.nodes=[n('lamp',l.seal,'旅灯 · 昔','星星',s.phase?'echo':'now',s.phase?held(g,'lampEcho'):held(g,'lampNow'),{amount:(g.timers.source||g.hold)/.3}),n('exit',l.exit,'星门 · 点击','太阳','now',g.open,{exit:true,amount:g.hold/.25})];o.lines=[[l.seal,l.exit]];o.message=s.phase===0?'在旅灯边框内停一下。里面微移也会继续点亮。':g.effect.powered?'旅灯有了回声。到同一条光路的星门前，等闪光再点击。':'在旅灯留光约一秒，再出发；停留会被重播，不会永久接手。';o.actionPoint=l.exit;}
    if(l.id==='magician'){const m=magicLayout(s.phase);o.nodes=[n('source',m.source,'源印 · 昔','太阳','echo',held(g,'source'),{amount:(g.timers.source||0)/.3}),...m.mirrors.map((p,i)=>n('mirror'+i,p,['第一折印','第二折印'][i],'魔术师','any',near(g.point,p),{mirror:s.orientations[i]})),n('receiver',m.receiver,'光路尽头 · 点击','星星','now',g.open,{exit:true,amount:g.hold/.55})];o.beams=g.effect.powered?traceMagic(s.phase,s.orientations).lines:[];o.message=g.effect.powered?(g.effect.beamHit?'光已抵达尽头。让青光接住它，闪光时点击。':'源印有光，但折射未到终点。调整两枚折印。'):'三态折印改变光路。出口就是接收印，昔光必须持续供能。';o.actionPoint=m.receiver;}
    if(l.id==='lovers'){const [a,b]=loversPairs[s.phase];o.nodes=[n('past',a,'昔 · 录下按住','月亮','echo',held(g,'past')),n('now',b,'今 · 按住回应','星星','now',held(g,'now'))];o.axis=true;o.lines=[[a,b]];o.message=g.effect.paired?(g.effect.responding?'两次回应正在相合。保持按住。':'位置已经相合，还需要两次「按住」同时出现。'):'先在昔印按住留下回声，再去今印按住。位置与回应缺一不可。';o.actionPoint=b;o.actionLabel='按住回应';}
    if(l.id==='temperance'){o.nodes=balancePads.map((p,i)=>n('balance'+i,p,['三格','二格','一格'][i<3?i:5-i],'节制','any',held(g,'balanceNow'+i)||held(g,'balanceEcho'+i)));o.balance={masses:balanceMasses[s.phase],torque:g.effect.torque||[0,0]};o.message=g.effect.opposite?(o.balance.torque[0]===o.balance.torque[1]?'两侧恰好相补。保持片刻，天平会记住。':'天平仍有倾斜。重量 × 刻度，两侧相等才是平衡。'):'先为影子选一处刻度，再到天平另一侧。重光靠近支点，轻光离远些。';}
    if(l.id==='star'){const m=starLayout(s.phase);o.nodes=[...starLeft.map((p,i)=>n('left'+i,p,['上锚','中锚','下锚'][i]+(m.reversed?' · 今':' · 昔'),m.reversed?'星星':'月亮',m.reversed?'now':'echo',held(g,'left'+i))),...starRight.map((p,i)=>n('right'+i,p,['上落点','中落点','下落点'][i]+(m.reversed?' · 昔':' · 今'),m.reversed?'月亮':'星星',m.reversed?'echo':'now',held(g,'right'+i)))];o.stars=m.stars;if(g.effect.chord)o.beams=[g.effect.chord];o.message=m.reversed?'末阵交换角色：昔守右端，今到左端。让同一弦穿过双星，再在今端点击。':'两端印心相连；同时穿过双星，今端闪光时点击。印内微移不会拉歪光弦。';o.actionPoint=m.reversed?m.a:m.b;const gate=o.nodes.find(v=>v.x===o.actionPoint.x&&v.y===o.actionPoint.y);gate.exit=g.open;gate.amount=g.hold/.55;}
    if(l.id==='moon'){const revealed=g.effect.revealed;o.targets=moonTargets[s.phase];o.targetIndex=s.sequence;o.nodes=[n('well',moonWell,'月井 · 昔','月亮','echo',held(g,'well'),{amount:(g.timers.well||0)/.3}),...moonOptions.map((p,i)=>n('choice'+i,p,revealed?'点击真纹':'倒影',revealed?moonMaps[s.phase][i]:'月亮','any',held(g,'choice'+i),{choice:true,exit:revealed&&moonMaps[s.phase][i]===moonTargets[s.phase][s.sequence]&&s.sequence===1}))];o.message=s.error?'顺序暂时散开，请从第一枚真纹再看。':revealed?`依次回应上方图腾：${s.sequence+1} / 2。月井失守会清空本轮。`:'影子守月井，才能显出真实纹样；看上方图腾，从左向右依次回应。';if(revealed)o.actionPoint=moonOptions[moonMaps[s.phase].indexOf(moonTargets[s.phase][s.sequence])];}
    if(l.id==='sun'){const m=sunLayout(s.phase);o.nodes=[n('past',m.pads[0],'昔 · 左半日','月亮','echo',held(g,'past')),n('now',m.pads[1],s.phase===2?'今 · 按住合光':'今 · 右半日','星星','now',held(g,'now'))];o.walls=m.walls;o.sun=m;o.beams=[];if(g.effect.left)o.beams.push([m.pads[0],m.receivers[0]]);if(g.effect.right)o.beams.push([m.pads[1],m.receivers[1]]);o.message=s.phase===2?'最后一次：两侧持续有光时，按住今印。中央太阳就是终点。':'光束从占据的印心出发，绕过遮板去另一侧；两个半日须同时点亮。';o.actionPoint=m.pads[1];o.actionLabel=s.phase===2?'按住合光':'保持双光';}
    if(l.id==='world'){o.nodes=worldVertices.map((p,i)=>n('piece'+i,p,['穹顶','晨光','大地','暮色'][i],'世界','any',held(g,'worldNow'+i)||held(g,'worldEcho'+i),{turn:s.turns[i]}));o.world={turns:s.turns,joined:worldJoined(s.turns)};o.message=g.open?'两片已相连。点击今片：今顺转一格，昔逆转一格。':'影子守一片，你去另一片。方向会保留，不必追赶刻度。';o.actionPoint=worldVertices[g.effect.now];}
    const clickLevels=['fool','magician','star','moon','world'];o.clickable=clickLevels.includes(l.id)&&g.open&&!g.won;if(o.clickable)o.actionLabel=l.id==='world'?'点击联转':l.id==='moon'&&s.sequence===0?'点击回应':s.phase===l.phases-1?'点击完成':'点击封存';return o;
  }
  const api={LEVELS,NODE_RADIUS,RELEASE_RADIUS,point,dist,near,clamp,segmentDistance,intersection,create,update,view,occupy,nodeContains,worldVertices,worldInitial,worldPorts,worldRestore,worldJoined,magicLayout,traceMagic,sunLayout,sunVisibility,loversPairs,balancePads,balanceMasses,balanceArm,starLayout,starLeft,starRight,starPairs,moonWell,moonOptions,moonMaps,moonTargets};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcanaRules=api;
})(typeof globalThis!=='undefined'?globalThis:this);
