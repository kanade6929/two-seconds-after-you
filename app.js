(function () {
  'use strict';
  const { Game, Timeline, Follower, LEVELS, STEP, distance, readProgress } = EchoCore;
  const $ = id => document.getElementById(id);
  const renderer = new EchoRenderer($('canvas'));
  const saveKey = 'two-seconds-after-you.v1';
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(saveKey)) || {}; } catch (_) { /* Offline/private browsing remains playable. */ }
  let {unlocked,completed,current,started}=readProgress(saved);
  let muted = saved.muted === true, reduced = typeof saved.reduced === 'boolean' ? saved.reduced : prefersReduced;
  let mode = 'title', game = null, pointer = { x: 600, y: 540, down: false }, pointerSeen = false;
  const follower = new Follower(pointer);
  let titleTime = 0, titleTimeline = new Timeline(), last = performance.now(), accumulator = 0;
  let pendingClick = 0, clickTarget = null, returnMode = 'title', hintShown = false, endingTime = 0;
  let context = null, lastTone = -100;
  let celebrationTime=0;
  const transitions = new Map();
  function visible(id, on) {
    const el = $(id), previous = transitions.get(id);
    if (el.dataset.visible === String(on)) return;
    el.dataset.visible = String(on);
    if (previous) { previous.cancel(); transitions.delete(id); }
    el.style.pointerEvents = on ? '' : 'none';
    el.inert = !on;
    if (reduced || typeof el.animate !== 'function') { el.hidden = !on; return; }
    if (on) el.hidden = false;
    else if (el.hidden) return;
    const isLayer = el.classList.contains('screen') || id === 'levelMenu';
    const animation = el.animate(on
      ? [{opacity:0,transform:`translateY(${isLayer ? 5 : 3}px)`},{opacity:1,transform:'translateY(0)'}]
      : [{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-3px)'}],
      {duration:on ? 420 : 170,easing:on ? 'cubic-bezier(.16,1,.3,1)' : 'ease-in',fill:'both'});
    transitions.set(id, animation);
    animation.finished.then(() => {
      if (transitions.get(id) !== animation) return;
      el.hidden = !on; animation.cancel(); transitions.delete(id);
    }).catch(() => {});
  }

  function persist() { try { localStorage.setItem(saveKey, JSON.stringify({ unlocked, completed, current, started, muted, reduced })); } catch (_) {} }
  function unlockAudio() {
    if (muted) return;
    try { if (!context) { const A = window.AudioContext || window.webkitAudioContext; if (A) context = new A(); } if (context?.state === 'suspended') context.resume().catch(() => {}); } catch (_) {}
  }
  function tone(frequency = 440, duration = .3, gain = .035) {
    if (muted || !context || context.state !== 'running') return;
    try {
      const o = context.createOscillator(), g = context.createGain(), t = context.currentTime;
      o.type = 'sine'; o.frequency.value = frequency;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + .018); g.gain.exponentialRampToValueAtTime(.0001, t + duration);
      o.connect(g); g.connect(context.destination); o.start(t); o.stop(t + duration + .03);
    } catch (_) {}
  }
  function controls() {
    $('sound').textContent = muted ? '声音 · 关' : '声音 · 开'; $('sound').setAttribute('aria-pressed', String(muted));
    $('motion').textContent = reduced ? '动态 · 减少' : '动态 · 完整'; $('motion').setAttribute('aria-pressed', String(reduced));
    document.body.classList.toggle('reduced', reduced);
    if (reduced) for (const [id, animation] of transitions) { $(id).hidden = $(id).dataset.visible !== 'true'; animation.cancel(); transitions.delete(id); }
    $('start').firstChild.textContent = started ? '从第一束光开始 ' : '开始这场合作 ';
    $('continueGame').disabled=!started;
    $('continueGame').textContent=started?`继续游戏 · ${String(current+1).padStart(2,'0')} ${LEVELS[current].title}`:'继续游戏 · 尚无进度';
  }
  function show(newMode) {
    mode = newMode; pendingClick = 0; accumulator = 0; last = performance.now();
    visible('titleScreen', mode === 'title');
    visible('gameHeading', !!game && !['title', 'ending', 'menu', 'failed'].includes(mode));
    visible('gameBottom', mode === 'play');
    visible('pauseScreen', mode === 'paused');
    visible('reconnect', mode === 'reconnect');
    visible('completeScreen', mode === 'complete');
    visible('endingScreen', mode === 'ending');
    visible('failureScreen', mode === 'failed');
    $('settings').hidden = mode === 'failed' || mode === 'celebrate';
    $('home').hidden = mode === 'failed' || mode === 'celebrate';
    visible('levelMenu', mode === 'menu');
    $('stage').classList.toggle('playing', mode === 'play');
    $('stage').classList.toggle('reconnecting', mode === 'reconnect');
    document.body.classList.toggle('in-game', ['play', 'reconnect', 'title'].includes(mode));
    visible('hint', false); hintShown = false; $('hintButton').setAttribute('aria-expanded', 'false');
    $('levelsButton').setAttribute('aria-expanded', String(mode === 'menu'));
  }
  function start(index) {
    unlockAudio(); pointer.down = false; follower.reset(pointer); game = new Game(index, pointer); lastTone = -100;
    pointer={...game.point};follower.reset(pointer);
    current=index;started=true;persist();controls();
    $('levelNumber').textContent = String(index + 1).padStart(2, '0');
    $('chapterCount').textContent = `${String(index+1).padStart(2,'0')} / ${String(LEVELS.length).padStart(2,'0')}`;
    $('levelTitle').textContent = game.level.title; $('levelDescription').textContent = game.level.description;
    $('hint').textContent = game.level.hint; visible('hintButton', false);
    $('footerText').textContent = game.level.arcana;
    show('play'); updateStatus(); tone(330, .25);
  }
  function pause() { if (mode === 'play' || mode === 'reconnect') { pointer.down = false; show('paused'); } }
  function updateStatus() {
    const text=game.status();
    if ($('status').textContent !== text) {
      $('status').textContent = text;
      if (game.level.rule!=='balance' && !reduced && $('status').animate) { $('status').getAnimations().forEach(a => a.cancel()); $('status').animate([{opacity:.35},{opacity:1}],{duration:280,easing:'ease-out'}); }
    }
    visible('hintButton', game.t >= 25);
  }
  function win() {
    if (!completed.includes(game.index)) completed.push(game.index);
    unlocked = Math.max(unlocked, Math.min(LEVELS.length-1, game.index + 1)); current=Math.min(LEVELS.length-1,game.index+1);persist(); controls();
    $('completeSmall').textContent = `第 ${game.index + 1} 个瞬间 / 共 ${LEVELS.length} 个`;
    $('completeTitle').textContent = game.level.done; $('completeText').textContent = game.level.after;
    $('next').firstChild.textContent = game.index === LEVELS.length-1 ? '走到最后 ' : '下一个瞬间 ';
    celebrationTime=0;show('celebrate');tone(130.81,1.4,.045);tone(523.25,1.2,.04);tone(783.99,1.8,.025);
  }
  function step() {
    if (mode !== 'play') return;
    const wasOpen = game.open, wasLatched = game.latched, wasActive = game.active.map(a => a.now || a.echo);
    const smooth = follower.update(STEP, pointer, reduced);
    pendingClick = Math.max(0, pendingClick - STEP);
    const click = pendingClick > 0 && clickTarget && distance(smooth, clickTarget) < 18;
    game.update(STEP, smooth, click); if (click) pendingClick = 0;
    if(game.blocked)follower.reset(game.point);
    if (!wasLatched && game.latched) tone(659.25, .5);
    else if (!wasOpen && game.open) tone(523.25, .4);
    else if (game.t - lastTone > .15 && game.active.some((a, i) => (a.now || a.echo) && !wasActive[i])) { tone(330, .18, .018); lastTone = game.t; }
    if (game.won) win();
    else if (game.failed) { show('failed'); tone(220, .7, .025); }
  }
  function frame(now) {
    const elapsed = Math.min((now - last) / 1000, .25); last = now;
    if(document.hidden){requestAnimationFrame(frame);return;}
    if (mode === 'title') {
      accumulator += elapsed;
      while (accumulator >= STEP) { titleTime += STEP; const p = follower.update(STEP, pointer, reduced); if (pointerSeen) titleTimeline.add(titleTime, p); accumulator -= STEP; }
      renderer.title(pointerSeen ? follower : null, titleTimeline.at(titleTime - 2), titleTimeline, titleTime, reduced);
    } else if (game) {
      if (mode === 'play') { accumulator += elapsed; while (accumulator >= STEP && mode === 'play') { step(); accumulator -= STEP; } updateStatus(); }
      renderer.game(game, mode, reduced, ['paused','reconnect','menu'].includes(mode)?0:elapsed);
      if(mode==='celebrate'){
        if(!document.hidden)celebrationTime+=elapsed;
        renderer.ripple(game.level.exit,celebrationTime,reduced);
        if(celebrationTime>=(reduced?.45:2.6))show('complete');
      }
      if (mode === 'ending' && !reduced) {
        endingTime += elapsed;
        const separation = 32 * Math.max(0, 1 - endingTime / 2);
        const dots = $('endingScreen').querySelectorAll('.duet-mark i'); dots[0].style.left = `${40 - separation / 2}px`; dots[1].style.left = `${40 + separation / 2}px`;
      }
    }
    requestAnimationFrame(frame);
  }
  document.addEventListener('pointermove', e => {
    if (mode === 'title' || mode === 'play') { pointer = renderer.point(e); pointerSeen = true; }
  });
  document.addEventListener('pointerdown', e => {
    if (e.button !== 0 || e.target.closest('button, a')) return;
    unlockAudio(); const p = renderer.point(e);
    if (mode === 'reconnect') {
      if (distance(p, game.point) <= 34) { pointer = { ...game.point, down: false }; follower.reset(pointer); show('play'); }
      return;
    }
    if (mode === 'play' || mode === 'title') { pointer = p; pointer.down = true; pointerSeen = true; pendingClick = mode === 'play' ? .25 : 0; clickTarget = p; }
  });
  window.addEventListener('pointerup', () => { pointer.down = false; });
  document.documentElement.addEventListener('pointerleave', pause);
  window.addEventListener('blur', pause);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  window.addEventListener('resize', () => { renderer.resize(); if (mode === 'play') pause(); });
  window.addEventListener('keydown', e => { if (e.key === 'Escape') { if (mode === 'menu') closeMenu(); else pause(); } });
  $('start').onclick = () => start(0);
  $('continueGame').onclick = () => { if(started)start(current); };
  $('retry').onclick = $('pauseRetry').onclick = () => start(game.index);
  $('failureRetry').onclick = () => start(game.index);
  $('pause').onclick = pause;
  $('resume').onclick = () => {
    if (!game || mode !== 'paused') return;
    unlockAudio();
    // Resume in one click. The old reconnect mode froze simulation until a
    // second, easy-to-miss click, sometimes on a point outside the resized view.
    // Keep the recorded position; the next mouse move eases away from it.
    pointer = { ...game.point, down: false }; follower.reset(pointer);
    clickTarget = null; pointerSeen = true; show('play');
  };
  $('home').onclick = () => { show('title'); titleTimeline = new Timeline(); titleTime = 0; $('footerText').textContent = '一点过去，一点现在。'; };
  $('sound').onclick = () => { muted = !muted; controls(); persist(); if (!muted) { unlockAudio(); tone(440); } };
  $('motion').onclick = () => { reduced = !reduced; controls(); persist(); };
  $('hintButton').onclick = () => { hintShown = !hintShown; visible('hint', hintShown); $('hintButton').setAttribute('aria-expanded', String(hintShown)); };
  $('next').onclick = () => { if (game.index < LEVELS.length-1) start(game.index + 1); else { endingTime = 0; show('ending'); $('footerText').textContent = '谢谢你，刚才的我。'; tone(261.63, 1.8); tone(392, 1.6, .02); } };
  $('again').onclick = () => start(0);
  function closeMenu() { show(returnMode === 'play' || returnMode === 'reconnect' ? 'paused' : returnMode); }
  $('closeLevels').onclick = closeMenu;
  $('levelsButton').onclick = $('titleLevels').onclick = () => {
    if (mode === 'menu') { closeMenu(); return; }
    returnMode = mode;
    $('levelItems').replaceChildren();
    LEVELS.forEach((level, i) => {
      const b = document.createElement('button'); b.className = 'level-choice'; b.disabled = i > unlocked;
      const name = document.createElement('strong'); name.textContent = `0${i + 1}　${level.title}`; name.style.fontWeight = '400';
      const arcana = document.createElement('small'); arcana.className = 'arcana-name'; arcana.textContent = level.arcana; name.append(arcana);
      const status = document.createElement('span'); status.textContent = i > unlocked ? '尚未抵达' : completed.includes(i) ? '已完成 · 重温' : '开始';
      b.append(name, status); b.onclick = () => start(i); $('levelItems').append(b);
    });
    show('menu');
    if (!reduced) $('levelItems').querySelectorAll('button').forEach((b,i) => b.animate?.([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:420,delay:i*55,easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'}));
  };
  controls(); requestAnimationFrame(frame);
})();
