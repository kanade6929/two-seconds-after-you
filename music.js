(function(root){
  'use strict';
  // One decoded, gapless loop. No note scheduling or synth work in the draw loop.
  class NightMusic{
    constructor(context,destination,{fetcher=root.fetch?.bind(root),url='assets/night-tide.mp3'}={}){
      this.context=context;this.fetcher=fetcher;this.url=url;this.gain=context.createGain();this.gain.gain.value=0;this.gain.connect(destination);
      this.buffer=null;this.source=null;this.loading=null;this.enabled=false;this.offset=0;this.scene='title';this.status='idle';this.retiring=null;
    }
    async load(){
      if(this.buffer)return this.buffer;if(this.loading)return this.loading;
      this.status='loading';this.loading=(async()=>{const response=await this.fetcher(this.url);if(!response.ok)throw Error('music unavailable');const bytes=await response.arrayBuffer();this.buffer=await this.context.decodeAudioData(bytes);NightMusic.softenBoundary(this.buffer);this.status='ready';return this.buffer;})().catch(()=>{this.status='unavailable';return null;}).finally(()=>{this.loading=null;});return this.loading;
    }
    static softenBoundary(buffer){
      // Codec edge ringing differs from the master: remove a sub-8ms boundary
      // transient after decoding, without adding silence or changing loop length.
      const n=Math.min(Math.ceil(buffer.sampleRate*.008),Math.floor(buffer.length/4));
      for(let ch=0;ch<buffer.numberOfChannels;ch++){const a=buffer.getChannelData(ch);for(let i=0;i<n;i++){const fade=Math.sin(i/(n-1)*Math.PI/2);a[i]*=fade;a[a.length-1-i]*=fade;}}
    }
    async start(){
      this.enabled=true;const buffer=await this.load();if(!buffer||!this.enabled||this.source||this.context.state!=='running')return;
      if(this.retiring){try{this.retiring.stop();}catch{}this.retiring.disconnect();this.retiring=null;}
      const s=this.context.createBufferSource();s.buffer=buffer;s.loop=true;s.loopStart=0;s.loopEnd=buffer.duration;s.connect(this.gain);
      this.source=s;this.started=this.context.currentTime;this.gain.gain.cancelScheduledValues(this.started);this.gain.gain.setValueAtTime(0,this.started);
      s.start(0,this.offset%buffer.duration);s.onended=()=>{s.disconnect();if(this.retiring===s)this.retiring=null;};this.setScene(this.scene);
    }
    setScene(scene){this.scene=scene;if(!this.enabled||!this.source)return;const now=this.context.currentTime;this.gain.gain.cancelScheduledValues(now);this.gain.gain.setTargetAtTime(scene==='celebrate'?.055:scene==='paused'?.065:.14,now,scene==='celebrate'?.15:1.3);}
    stop(){this.enabled=false;if(!this.source)return;const s=this.source,now=this.context.currentTime;
      this.offset=(this.offset+Math.max(0,now-this.started))%this.buffer.duration;this.source=null;
      this.gain.gain.cancelScheduledValues(now);this.gain.gain.setTargetAtTime(0,now,.035);s.stop(now+.15);this.retiring=s;
    }
  }
  if(typeof module!=='undefined'&&module.exports)module.exports=NightMusic;else root.NightMusic=NightMusic;
})(typeof globalThis!=='undefined'?globalThis:this);
