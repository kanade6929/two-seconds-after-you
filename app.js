(function(){
  'use strict';
  const {Game,Timeline,Follower,TouchGesture,LEVELS,STEP,readProgress}=EchoCore,$=id=>document.getElementById(id);
  const renderer=new EchoRenderer($('canvas')),saveKey='two-seconds-after-you.arcana.v4';
  function read(key){try{return JSON.parse(localStorage.getItem(key))||{};}catch{return {};}}
  const v3=read('two-seconds-after-you.arcana.v3'),legacy=Object.keys(v3).length?v3:read('two-seconds-after-you.arcana.v2'),old=Object.keys(legacy).length?legacy:read('two-seconds-after-you.v1'),current=read(saveKey),saved=Object.keys(current).length?current:{...legacy,checkpoints:{}},progress=readProgress(saved);
  let muted=(saved.muted??old.muted)===true,reduced=saved.reduced??old.reduced??window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let mode='title',game=null,raw={x:600,y:540,down:false},seen=false,inside=true,down=false,pressed=null,hovered=null,dispatching=false,mouseGestureIsLight=false;
  const follower=new Follower(raw),cursor=$('virtualCursor');
  let last=performance.now(),accumulator=0,titleTime=0,titleTimeline=new Timeline(),celebration=0,resumeAge=0,resumePlaced=false,returnMode='title',hintTier=0;
  let audio=null,audioBus=null,audioVerb=null,music=null,lastRevision=0,paintElapsed=0,lastPaint=0,paintMode='';const voices=new Set(),transitions=new Map();
  let touchMode=window.matchMedia('(pointer: coarse)').matches,touchDrag=null;const touchGesture=new TouchGesture();document.body.classList.toggle('touch-mode',touchMode);
  function touchFeedback(){const state=touchGesture.id===null?'idle':touchGesture.dragging?'moving':touchGesture.held?'holding':'pending';if($('touchPad').dataset.gesture!==state)$('touchPad').dataset.gesture=state;}
  function resetTouch(){touchDrag=null;touchGesture.cancel();down=false;touchFeedback();}
  function confirmTouch(){if(mode!=='play'||game.transition)return;const wasOpen=game.open;game.update(0,{...game.point,down:false},true);afterUpdate(wasOpen);}
  function icon(el,name){el.prepend(ArcanaSymbols.svg(name,document));}
  document.querySelectorAll('[data-symbol]').forEach(el=>icon(el,el.dataset.symbol));
  function visible(id,on){
    const el=$(id);if(el.dataset.visible===String(on))return;el.dataset.visible=String(on);el.inert=!on;
    transitions.get(id)?.cancel();transitions.delete(id);
    if(reduced||!el.animate){el.hidden=!on;return;}
    if(on)el.hidden=false;else if(el.hidden)return;
    const a=el.animate(on?[{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}]:[{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-3px)'}],{duration:on?620:280,easing:'cubic-bezier(.16,1,.3,1)',fill:'both'});
    transitions.set(id,a);a.finished.then(()=>{if(transitions.get(id)!==a)return;el.hidden=!on;a.cancel();transitions.delete(id);}).catch(()=>{});
  }
  function persist(){try{localStorage.setItem(saveKey,JSON.stringify({...progress,muted,reduced}));}catch{/* Play remains available in private/restricted storage. */}}
  function checkpoint(){if(game&&!game.won){progress.checkpoints[game.index]=game.checkpoint();persist();}}
  function unlockAudio(){if(muted)return;try{if(!audio){const A=window.AudioContext||window.webkitAudioContext;if(A){
    audio=new A();audioBus=audio.createGain();audioBus.connect(audio.destination);
    audioVerb=audio.createConvolver();const length=Math.floor(audio.sampleRate*2.8),impulse=audio.createBuffer(2,length,audio.sampleRate);
    let seed=73;for(let ch=0;ch<2;ch++){const data=impulse.getChannelData(ch);for(let i=0;i<length;i++){seed=(seed*16807)%2147483647;data[i]=(seed/1073741823.5-1)*Math.exp(-i/length*7)*.24;}}
    audioVerb.buffer=impulse;const wet=audio.createGain();wet.gain.value=.24;audioVerb.connect(wet);wet.connect(audioBus);
    if(window.NightMusic)music=new NightMusic(audio,audioBus);
  }}if(audioBus)audioBus.gain.setTargetAtTime(1,audio.currentTime,.06);audio?.resume().then(()=>{if(!muted&&!document.hidden){music?.setScene(mode);music?.start();}}).catch(()=>{});}catch{}}
  function silence(){music?.stop();if(!audio)return;audioBus?.gain.setTargetAtTime(0,audio.currentTime,.035);for(const voice of voices){try{voice.stop(audio.currentTime+.06);}catch{}}}
  function tone(f=440,d=.9,volume=.025,delay=0){
    if(muted||document.hidden||audio?.state!=='running'||voices.size>=48)return;
    try{const start=audio.currentTime+delay,duration=Math.max(.8,d*1.6);
      for(const [ratio,weight] of [[1,1],[2,.16],[3,.045]]){
        const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(f*ratio,start);o.frequency.exponentialRampToValueAtTime(f*ratio*.998,start+duration);
        g.gain.setValueAtTime(.00001,start);g.gain.linearRampToValueAtTime(volume*weight,start+.045);g.gain.exponentialRampToValueAtTime(.00001,start+duration);
        o.connect(g);g.connect(audioBus);g.connect(audioVerb);voices.add(o);o.onended=()=>{voices.delete(o);o.disconnect();g.disconnect();};o.start(start);o.stop(start+duration+.05);
      }
    }catch{}
  }
  function clickSounds(){if(!game?.feedback)return;for(const {role,note} of game.feedback.sounds.splice(0))tone(440*2**((note-69-(role==='echo'?12:0))/12),.8,role==='echo'?.018:.023);}
  function victorySound(){for(const [i,f] of [146.83,293.66,440,587.33,739.99].entries())tone(f,2.1,.018-i*.001,i*.16);}
  function controls(){
    $('inputNote').textContent=touchMode?'滑动与轻点 · 与两秒前的自己配合':'移动与点击 · 与两秒前的自己配合';
    $('soundLabel').textContent=muted?'声音 · 关':'声音 · 开';$('sound').setAttribute('aria-pressed',String(muted));
    $('motionLabel').textContent=reduced?'动态 · 减少':'动态 · 完整';$('motion').setAttribute('aria-pressed',String(reduced));document.body.classList.toggle('reduced',reduced);
    $('continueGame').disabled=!progress.started;$('continueLabel').textContent=progress.started?'继续 · '+LEVELS[progress.current].title:'继续旅程';
    if(reduced)for(const[id,a]of transitions){a.cancel();$(id).hidden=$(id).dataset.visible!=='true';transitions.delete(id);}
  }
  function lightCursor(){return ['play','resuming','celebrate'].includes(mode);}
  function show(next){
    if(mode!==next&&['paused','menu','community','resuming'].includes(next))tone(next==='resuming'?523.25:392,.9,.013);
    mode=next;music?.setScene(mode);resetTouch();pressed?.classList.remove('virtual-down');pressed=null;
    hovered?.classList.remove('virtual-hover');hovered=null;document.body.classList.toggle('light-cursor',lightCursor());
    const mapping={titleScreen:'title',pauseScreen:'paused',completeScreen:'complete',endingScreen:'ending',levelMenu:'menu',community:'community'};
    for(const[id,m]of Object.entries(mapping))visible(id,mode===m);
    visible('gameHeading',!!game&&['play','paused','resuming','celebrate','complete'].includes(mode));visible('gameBottom',mode==='play');visible('hint',false);
    visible('touchControls',touchMode&&mode==='play');document.body.classList.toggle('touch-playing',touchMode&&['play','resuming','paused','celebrate','complete'].includes(mode));
    document.querySelector('.topbar').inert=['celebrate','resuming'].includes(mode);
    $('footerText').textContent=mode==='title'?'一点过去，一点现在。':game?.level.theme||'';
  }
  function enter(index,checkpointData={}){
    checkpoint();unlockAudio();game=new Game(index,checkpointData);lastRevision=game.revision;
    progress.current=index;progress.started=true;progress.checkpoints[index]=game.checkpoint();persist();controls();
    $('levelNumber').textContent=game.level.roman;$('levelTitle').textContent=game.level.title;$('levelTheme').textContent=game.level.theme;$('levelTask').textContent=game.level.task;
    hintTier=0;visible('hintButton',false);resumeAge=0;resumePlaced=false;show('resuming');
  }
  function pause(){if(['play','resuming'].includes(mode)){checkpoint();show('paused');}}
  function resume(){if(mode!=='paused')return;unlockAudio();resumeAge=0;resumePlaced=false;show('resuming');}
  function home(){checkpoint();titleTimeline=new Timeline();titleTime=0;show('title');controls();}
  function retry(){if(game)enter(game.index);}
  function updateStatus(){
    const status=game.status(),phase='昔光慢两秒 · 停留会被重播';
    if($('status').textContent!==status)$('status').textContent=status;
    if($('phaseLabel').textContent!==phase)$('phaseLabel').textContent=phase;
    $('undo').disabled=game.history.length===0;$('release').disabled=false;
    const label=game.index===3?'放空重来':'重建回声';if($('releaseLabel').textContent!==label)$('releaseLabel').textContent=label;
    visible('hintButton',game.t-game.progressAt>=25);
  }
  function win(){
    if(!progress.completed.includes(game.index))progress.completed.push(game.index);progress.unlocked=Math.max(progress.unlocked,Math.min(7,game.index+1));progress.current=Math.min(7,game.index+1);delete progress.checkpoints[game.index];persist();controls();
    $('completeSigil').replaceChildren(ArcanaSymbols.svg(game.level.title,document));$('completeTitle').textContent=game.level.title+' · 已抵达';$('completeText').textContent=game.level.done;$('nextLabel').textContent=game.index===7?'与自己相逢':'翻开下一张牌';celebration=0;game.ceremonyAge=0;show('celebrate');victorySound();
  }
  function afterUpdate(wasOpen){
    clickSounds();
    if(!wasOpen&&game.open&&!game.won)tone(587.33,.85,.018);
    if(game.revision!==lastRevision){lastRevision=game.revision;checkpoint();tone(659.25,.25);}
    if(game.won)win();
  }
  function step(){
    if(mode==='play'&&game.transition){resetTouch();game.update(STEP,game.point);follower.reset(game.point);return;}
    if(mode==='play'&&touchGesture.id!==null){down=touchGesture.step(STEP);touchFeedback();}
    if(touchMode&&mode==='play'&&renderer.sceneBounds){const b=renderer.sceneBounds;raw.x=Math.max(b.x+8,Math.min(b.x+b.width-8,raw.x));raw.y=Math.max(b.y+8,Math.min(b.y+b.height-8,raw.y));}
    const p=follower.update(STEP,{...raw,down});
    if(mode==='resuming'){
      resumeAge+=STEP;if(resumeAge>=.12&&!resumePlaced){resumePlaced=true;raw={...game.point,down:false};follower.reset(raw);document.body.classList.add('cursor-ready');}
      if(resumeAge>=.26)show('play');return;
    }
    if(mode==='play'){
      const wasOpen=game.open;game.update(STEP,p);if(game.blocked)follower.reset(game.point);afterUpdate(wasOpen);
    }else if(['title','menu','community','ending'].includes(mode)){titleTime+=STEP;if(mode==='title'&&seen)titleTimeline.add(titleTime,p);}
  }
  function cssPoint(){const r=renderer.rect;return{x:r.left+renderer.ox+follower.x*renderer.scale,y:r.top+renderer.oy+follower.y*renderer.scale};}
  function atCursor(){const p=cssPoint();return document.elementFromPoint(p.x,p.y);}
  function interactive(){const el=atCursor()?.closest('button,input,textarea');return el&&!el.disabled&&!el.closest('[inert],[hidden]')?el:null;}
  function updateCursor(){
    const p=cssPoint();cursor.style.transform=`translate3d(${p.x}px,${p.y}px,0)`;
    cursor.style.opacity=!inside?'0':mode==='resuming'?String(resumeAge<.12?1-resumeAge/.12:Math.min(1,(resumeAge-.12)/.14)):'1';cursor.classList.toggle('down',down||!!pressed);
    const hit=touchMode||mode!=='play'?null:interactive();if(hit!==hovered){hovered?.classList.remove('virtual-hover');hovered=hit;hovered?.classList.add('virtual-hover');}
  }
  function frame(now){
    const elapsed=Math.min(.1,Math.max(0,(now-last)/1000));last=now;
    if(!document.hidden){const scene=game?.transition?.remaining>.26?game.transition.previous:game;renderer.layout(scene&&!['title','menu','community','ending'].includes(mode)?scene:null,touchMode);accumulator+=elapsed;while(accumulator>=STEP){step();accumulator-=STEP;}
      paintElapsed+=elapsed;
      const interval=touchMode?(['play','celebrate','resuming'].includes(mode)?1/60:1/30):0;
      if(paintElapsed>=interval-.001||paintMode!==mode){
        const drawDt=Math.min(.1,lastPaint?(now-lastPaint)/1000:elapsed);paintElapsed=interval?Math.max(0,paintElapsed-interval):0;paintMode=mode;const startPaint=performance.now();
        if(['title','menu','community','ending'].includes(mode))renderer.title(null,titleTimeline.at(titleTime-2),titleTimeline,titleTime,reduced);
        else if(game){if(mode==='celebrate'){celebration+=drawDt;game.ceremonyAge=celebration;game.feedback?.advance(game.t+celebration);clickSounds();}renderer.game(game,mode,reduced,['paused','resuming'].includes(mode)?0:drawDt);if(mode==='play')updateStatus();if(mode==='celebrate'){renderer.ripple(game.winOrigin,celebration,reduced);if(celebration>=(reduced?2.4:4.2))show('complete');}}
        const frameMs=now-lastPaint;lastPaint=now;renderer.adapt(frameMs,performance.now()-startPaint,mode==='play'&&!game.transition);
      }
      updateCursor();
    }requestAnimationFrame(frame);
  }
  // Menus keep native pointer/focus/selection. Only a gameplay gesture is routed
  // through the light; remember its origin even if pointerup opens a native menu.
  document.addEventListener('pointermove',e=>{if(e.pointerType==='touch'){if(touchGesture.id===e.pointerId){const delta=touchGesture.move(e.pointerId,e.clientX,e.clientY);if(delta){raw.x+=delta.x/renderer.scale;raw.y+=delta.y/renderer.scale;down=false;}touchFeedback();}else if(touchDrag?.id===e.pointerId)raw={...renderer.point(e),down:false};return;}raw={...renderer.point(e),down:false};inside=true;if(!seen){seen=true;if(!lightCursor())follower.reset(raw);document.body.classList.add('cursor-ready');}updateCursor();});
  document.addEventListener('pointerdown',e=>{
    if(e.pointerType==='touch'){
      if(!touchMode){touchMode=true;document.body.classList.add('touch-mode');visible('touchControls',mode==='play');document.body.classList.toggle('touch-playing',mode==='play');controls();}
      seen=true;inside=true;document.body.classList.add('cursor-ready');unlockAudio();
      const pad=e.target.closest('#touchPad');if(pad||e.target===$('canvas')){e.preventDefault();if(mode!=='play'||game.transition||touchGesture.id!==null||touchDrag)return;e.target.setPointerCapture(e.pointerId);if(pad){touchGesture.start(e.pointerId,e.clientX,e.clientY);touchFeedback();}else{touchDrag={id:e.pointerId};raw={...renderer.point(e),down:false};}return;}
      return;
    }
    if(e.button!==0)return;mouseGestureIsLight=lightCursor();unlockAudio();if(!mouseGestureIsLight)return;
    if(!seen){raw=renderer.point(e);seen=true;document.body.classList.add('cursor-ready');}
    e.preventDefault();if(mode!=='play')return;const hit=interactive();
    if(hit){pressed=hit;hit.classList.add('virtual-down');return;}
    if(atCursor()?.closest('.scrim,.hint-panel,.topbar'))return;
    if(mode==='play'){down=true;const wasOpen=game.open;game.update(0,{...game.point,down:true},true);afterUpdate(wasOpen);}
  },true);
  window.addEventListener('pointerup',e=>{
    if(e.pointerType==='touch'){if(touchGesture.id===e.pointerId){const tap=touchGesture.end(e.pointerId);down=false;touchFeedback();if(tap)confirmTouch();}if(touchDrag?.id===e.pointerId)touchDrag=null;return;}
    if(e.button!==0||!mouseGestureIsLight)return;down=false;const hit=mode==='play'?interactive():null,target=pressed;pressed?.classList.remove('virtual-down');pressed=null;
    if(target&&target===hit&&target.matches('button')){dispatching=true;try{target.click();}finally{dispatching=false;}}
  },true);
  document.addEventListener('click',e=>{if(e.target.closest('#touchPad')){e.preventDefault();if(e.detail===0)confirmTouch();return;}if(!touchMode&&!dispatching&&e.detail!==0&&(mouseGestureIsLight||lightCursor())){e.preventDefault();e.stopImmediatePropagation();}},true);
  function cancelPointer(e){if(touchGesture.id===e.pointerId||touchDrag?.id===e.pointerId)resetTouch();if(e.pointerType!=='touch'){down=false;pressed?.classList.remove('virtual-down');pressed=null;}}
  window.addEventListener('pointercancel',cancelPointer);window.addEventListener('lostpointercapture',cancelPointer);
  $('touchPad').addEventListener('contextmenu',e=>e.preventDefault());
  document.addEventListener('wheel',e=>{if(touchMode||!lightCursor())return;let el=atCursor();while(el&&el!==document.body){if(el.scrollHeight>el.clientHeight&&/auto|scroll/.test(getComputedStyle(el).overflowY)){e.preventDefault();el.scrollBy(0,e.deltaY);return;}el=el.parentElement;}},{passive:false});
  document.documentElement.addEventListener('pointerleave',e=>{if(e.pointerType==='touch')return;inside=false;pause();});window.addEventListener('blur',pause);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){pause();silence();accumulator=0;}last=performance.now();});window.addEventListener('resize',()=>{renderer.resize();pause();});
  window.addEventListener('pagehide',()=>{checkpoint();silence();});
  window.addEventListener('keydown',e=>{if(e.isComposing)return;if(e.key==='Escape'){if(mode==='menu')closeMenu();else if(mode==='community')home();else if(!$('hint').hidden)visible('hint',false);else pause();}});
  $('start').onclick=()=>enter(0);$('continueGame').onclick=()=>{if(progress.started)enter(progress.current,progress.checkpoints[progress.current]||{});};$('pauseRetry').onclick=retry;$('pause').onclick=pause;$('resume').onclick=resume;
  $('undo').onclick=()=>{if(mode==='play'&&game.undo()){resetTouch();afterUpdate(false);}};$('release').onclick=()=>{if(mode==='play'&&game.release()){resetTouch();afterUpdate(false);}};
  $('home').onclick=$('pauseHome').onclick=$('endingHome').onclick=home;
  $('sound').onclick=()=>{muted=!muted;if(muted)silence();controls();persist();unlockAudio();tone();};$('motion').onclick=()=>{reduced=!reduced;controls();persist();};
  $('hintButton').onclick=()=>{hintTier=0;showHint();};function showHint(){$('hintText').textContent=game.level.hint[hintTier];$('hintNext').disabled=hintTier===1;visible('hint',true);}
  $('hintNext').onclick=()=>{hintTier=1;showHint();};$('closeHint').onclick=()=>visible('hint',false);
  $('next').onclick=()=>{if(game.index<7)enter(game.index+1);else{$('collected').replaceChildren(...LEVELS.map(l=>ArcanaSymbols.svg(l.title,document)));show('ending');tone(261.63,1.4);}};$('again').onclick=()=>enter(0);
  function closeMenu(){show(returnMode==='play'||returnMode==='resuming'?'paused':returnMode);}
  $('closeLevels').onclick=closeMenu;
  $('levelsButton').onclick=$('titleLevels').onclick=()=>{
    if(mode==='menu'){closeMenu();return;}checkpoint();returnMode=mode;$('levelItems').replaceChildren();
    LEVELS.forEach((l,i)=>{const b=document.createElement('button');b.className='chapter-card';b.disabled=i>progress.unlocked;const roman=document.createElement('span');roman.className='roman';roman.textContent=l.roman;const name=document.createElement('strong');name.textContent=l.title;const state=document.createElement('small');state.textContent=i>progress.unlocked?'尚未抵达':progress.completed.includes(i)?'已完成 · 重温':'翻开此牌';b.append(roman,ArcanaSymbols.svg(l.title,document),name,state);b.onclick=()=>enter(i);$('levelItems').append(b);});show('menu');
  };
  const community=new EchoCommunity(window.ECHO_COMMUNITY_CONFIG),serviceMessage='留言与点赞暂未开放。游戏可以完整游玩，接入文件已准备好。';
  let pageCursor=null,communityBusy=false;
  function communityState(text){$('communityStatus').textContent=text;}
  function renderComments(rows,append){if(!append)$('commentList').replaceChildren();for(const row of rows){const article=document.createElement('article');article.className='comment';const name=document.createElement('strong');name.textContent=row.nickname||'一位过客';const time=document.createElement('time');time.textContent=new Date(row.created_at).toLocaleDateString('zh-CN');const body=document.createElement('p');body.textContent=row.body;article.append(name,time,body);$('commentList').append(article);}}
  async function readComments(append=false){if(communityBusy)return;communityBusy=true;if(!append)pageCursor=null;$('moreComments').disabled=true;communityState('正在读取微光……');try{const result=await community.readComments(append?pageCursor:null);renderComments(result.rows,append);pageCursor=result.next;$('moreComments').textContent='更多留言';visible('moreComments',!!pageCursor);communityState(result.rows.length||append?'留言提交后会公开可见。':'还没有留言。愿你成为第一束光。');}catch{communityState('暂时连接不上留言服务。输入不会丢失，请稍后重试。');visible('moreComments',true);$('moreComments').textContent='重试读取';}finally{communityBusy=false;$('moreComments').disabled=false;}}
  $('commentsButton').onclick=()=>{checkpoint();show('community');if(community.configured)readComments();else{communityState(serviceMessage);for(const id of ['nickname','commentBody','submitComment'])$(id).disabled=true;}};
  $('closeCommunity').onclick=home;$('moreComments').onclick=()=>readComments(!!pageCursor);
  $('commentForm').addEventListener('submit',async e=>{e.preventDefault();if(communityBusy||!community.configured)return;const nickname=$('nickname').value.trim(),body=$('commentBody').value.trim();if(!body||[...nickname].length>16||[...body].length>300){communityState('请留下 1—300 字的留言，称呼不超过 16 字。');return;}communityBusy=true;$('submitComment').disabled=true;communityState('正在送出微光……');let sent=false;try{await community.submitComment(nickname,body);$('commentBody').value='';sent=true;tone(523.25);}catch{communityState('未能送出。内容已保留，请重试。');}finally{communityBusy=false;$('submitComment').disabled=false;}if(sent){await readComments();communityState('微光已送达，公开可见。');}});
  function likeView(info){$('likeLabel').textContent=`${info.liked?'已赞':'点赞'} · ${info.count}`;$('likeButton').setAttribute('aria-pressed',String(info.liked));}
  let liking=false;$('likeButton').onclick=async()=>{if(!community.configured){$('commentsButton').click();return;}if(liking)return;liking=true;$('likeButton').disabled=true;try{likeView(await community.toggleLike());}catch{$('likeLabel').textContent='点赞未送达 · 重试';}finally{liking=false;$('likeButton').disabled=false;}};
  if(community.configured){$('likeLabel').textContent='点赞 · 正在读取';$('likeButton').disabled=true;community.readLikes().then(likeView).catch(()=>{$('likeLabel').textContent='点赞暂不可用 · 重试';}).finally(()=>{$('likeButton').disabled=false;});}
  controls();show('title');requestAnimationFrame(frame);
  document.fonts?.ready.then(()=>{renderer.layoutKey='';});
})();
