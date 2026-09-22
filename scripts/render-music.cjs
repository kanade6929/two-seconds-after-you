// Original score + deterministic offline synthesizer. No reference-song samples.
// node scripts/render-music.cjs [ffmpeg path]
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const SR=32000,BPM=80,BEAT=60/BPM,BARS=32,DURATION=BARS*4*BEAT,N=Math.round(DURATION*SR),TAU=Math.PI*2;
const midi=n=>440*2**((n-69)/12);
const chords=[
 {bass:35,notes:[54,57,61,66]}, // Bm9
 {bass:31,notes:[54,57,59,62]}, // Gmaj9
 {bass:38,notes:[54,57,61,64]}, // Dmaj9
 {bass:33,notes:[52,57,59,64]}, // Asus2
 {bass:35,notes:[54,57,61,64]},
 {bass:31,notes:[55,59,62,66]},
 {bass:40,notes:[55,59,62,66]}, // Em9
 {bass:33,notes:[55,59,62,64]}  // A suspended, return without a hard cadence
];
// Four short phrases, silence included. Pitches/phrasing authored for this game.
const phrases=[
 [[.5,73,1],[2,69,.5],[3,66,1.5],[5.5,64,.5],[6.5,66,1]],
 [[0,69,1.5],[2,71,.75],[3.5,66,1],[5.5,62,1.5]],
 [[.5,66,1],[2,69,.5],[3,73,1],[4.5,76,.5],[6,73,1.5]],
 [[0,71,1.5],[2.5,69,1],[4,64,1],[6,66,1.5]]
];
function score(){const events=[];const add=(kind,beat,note,duration,amp,pan=0)=>events.push({kind,beat,note,duration,amp,pan});
 for(let bar=0;bar<BARS;bar++){
  const section=Math.floor(bar/8),c=chords[Math.floor(bar/2)%8],base=bar*4;
  if(bar%2===0)c.notes.forEach((n,i)=>add('pad',base,n,9.5,.043,[-.65,-.2,.25,.65][i]));
  add('bass',base,c.bass,2.5,section===0?.07:.095,-.06);
  if(section>0)add('bass',base+2.5,c.bass+12,1.3,.045,.06);
  const order=bar%2?[2,1,3,0,2,3,1,2]:[0,2,1,3,2,1,3,1];
  for(let step=0;step<8;step++){
   if(section===0&&(step===3||step===6)||section===3&&bar>28&&step%2)continue;
   add('pluck',base+step*.5+(step%2?.025:0),c.notes[order[step]]+12,1.7,.025+(step%3===0?.012:0),Math.sin(step*1.7+bar)*.7);
  }
  if(section===1||section===2){
   add('kick',base,0,.7,.035);add('kick',base+2.5,0,.5,.025);
   for(const b of[1,3])add('dust',base+b,0,.4,.016,.15);
   for(let s=0;s<8;s++)add('hat',base+s*.5,0,.11,s%2?.009:.006,s%2?.42:-.42);
  }
  if(bar%2===0&&bar>=4&&bar<30){const phrase=phrases[(bar/2)%4];for(const [beat,n,duration]of phrase)add('lead',base+beat,n+(section===2?0:-12),duration+1.1,section===2?.065:.046,Math.sin(bar)*.14);}
 }
 return events;
}
function render(){const dry=[new Float32Array(N),new Float32Array(N)],send=[new Float32Array(N),new Float32Array(N)];let seed=7181;
 const noise=()=>{seed=(seed*16807)%2147483647;return seed/1073741823.5-1;};
 for(const e of score()){
  const start=Math.round(e.beat*BEAT*SR),duration=e.duration*BEAT,frames=Math.ceil(duration*SR),freq=midi(e.note),pan=[Math.sqrt((1-e.pan)/2),Math.sqrt((1+e.pan)/2)];let previous=0,phase=0;
  for(let i=0;i<frames;i++){
   const t=i/SR,u=t/duration,release=Math.min(1,(duration-t)/.12);let v=0;
   if(e.kind==='pad'){
    const env=Math.min(1,t/.8)*Math.min(1,(duration-t)/1.8),a=TAU*freq*t;
    v=env*(Math.sin(a)*.55+Math.sin(a*1.0017+.5)*.24+Math.sin(a*.9983-.5)*.21+Math.sin(a*2)*.09);
   }else if(e.kind==='bass'){v=(Math.sin(TAU*freq*t)+.17*Math.sin(TAU*freq*2*t))*Math.min(1,t/.03)*Math.exp(-t*1.5)*release;}
   else if(e.kind==='pluck'||e.kind==='lead'){
    const lead=e.kind==='lead',env=Math.min(1,t/(lead?.025:.008))*Math.exp(-t/(lead?.75:.38))*release;
    const a=TAU*freq*t+.008*Math.sin(TAU*4.3*t),fm=Math.sin(a*2)*Math.exp(-t*5)*(lead?.5:1.2);
    v=(Math.sin(a+fm)*.85+Math.sin(a*2.003)*.11)*env;
   }else if(e.kind==='kick'){phase+=TAU*(44+72*Math.exp(-t*28))/SR;v=Math.sin(phase)*Math.exp(-t*11)*Math.min(1,t/.004);}
   else{const n=noise(),high=n-previous;previous=n;v=high*Math.exp(-t*(e.kind==='hat'?65:19))*Math.min(1,t/.003);}
   const k=(start+i)%N;for(let ch=0;ch<2;ch++){const value=v*e.amp*pan[ch];dry[ch][k]+=value;send[ch][k]+=value*(e.kind==='bass'||e.kind==='kick'?.08:.65);}
  }
 }
 // Circular delay/reverb folds tails over the loop, rather than chopping notes.
 const mix=dry.map(a=>new Float32Array(a));
 for(let ch=0;ch<2;ch++)for(const [sec,gain,flip]of [[.28125,.25,1],[.5625,.16,0],[.84375,.10,1],[.113,.12,0],[.173,.10,1],[.337,.085,0],[.719,.06,1],[1.19,.035,0],[1.91,.016,1]]){
  const shift=Math.round(sec*SR),src=send[flip?1-ch:ch];let low=0;for(let i=0;i<N;i++){low+=.35*(src[(i-shift+N)%N]-low);mix[ch][i]+=low*gain;}
 }
 let peak=0,sum=0;for(let ch=0;ch<2;ch++){let dc=0;for(let i=0;i<N;i++){dc+=.0003*(mix[ch][i]-dc);mix[ch][i]=Math.tanh((mix[ch][i]-dc)*1.3);peak=Math.max(peak,Math.abs(mix[ch][i]));}}
 const scale=.72/peak;for(const a of mix)for(let i=0;i<N;i++){a[i]*=scale;sum+=a[i]*a[i];}
 // A tiny wrap crossfade removes subsonic/filter initialization discontinuity.
 const splice=160;for(const a of mix){const end=a[N-1],start=a[0];for(let i=0;i<splice;i++){const f=i/splice;a[i]+=(end-start)*(1-f)**2;}}
 const pcm=Buffer.alloc(44+N*4);pcm.write('RIFF');pcm.writeUInt32LE(pcm.length-8,4);pcm.write('WAVEfmt ',8);pcm.writeUInt32LE(16,16);pcm.writeUInt16LE(1,20);pcm.writeUInt16LE(2,22);pcm.writeUInt32LE(SR,24);pcm.writeUInt32LE(SR*4,28);pcm.writeUInt16LE(4,32);pcm.writeUInt16LE(16,34);pcm.write('data',36);pcm.writeUInt32LE(N*4,40);
 for(let i=0;i<N;i++)for(let ch=0;ch<2;ch++)pcm.writeInt16LE(Math.round(Math.max(-1,Math.min(1,mix[ch][i]))*32767),44+i*4+ch*2);
 return {pcm,meta:{title:'星潮之间',bpm:BPM,bars:BARS,duration:DURATION,sampleRate:SR,channels:2,peak:.72,rms:Math.sqrt(sum/(N*2)),events:score().length}};
}
if(require.main===module){const root=path.join(__dirname,'..'),out=path.join(root,'artifacts/music');fs.mkdirSync(out,{recursive:true});const {pcm,meta}=render(),wav=path.join(out,'night-tide.wav');fs.writeFileSync(wav,pcm);fs.writeFileSync(path.join(out,'analysis.json'),JSON.stringify(meta,null,2));
 if(process.argv[2])execFileSync(process.argv[2],['-hide_banner','-loglevel','error','-y','-i','artifacts/music/night-tide.wav','-codec:a','libmp3lame','-b:a','112k','-ar','32000','-metadata','title=Between Star Tides','-metadata','artist=Chen Xing Ye - Original Score','assets/night-tide.mp3'],{cwd:root,stdio:'inherit'});console.log(meta);
}
module.exports={score,render,BPM,DURATION};
