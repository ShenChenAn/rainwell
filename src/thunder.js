// Field recordings: Joseph SARDIN & Axeline T., BigSoundBank, CC0.
// Full sources and processing notes ship with assets/audio/sources.json.
export const THUNDER_CLIPS = [
 {id:'3180',range:'near'}, {id:'3179',range:'near'}, {id:'3115',range:'near'},
 {id:'2718',range:'middle'}, {id:'3116',range:'middle'},
 {id:'3113',range:'far'}, {id:'3114',range:'far'},
].map(clip=>({...clip,url:`assets/audio/thunder-${clip.id}.mp3`}));

export function chooseThunder(clips,near,stage,recent,random=Math.random){
 const preferred=clips.filter(c=>near?c.range==='near':c.range!=='near');
 const pool=preferred.length?preferred:clips;
 const fresh=pool.filter(c=>!recent.includes(c.id));
 const candidates=fresh.length?fresh:pool.filter(c=>c.id!==recent.at(-1));
 const choices=candidates.length?candidates:pool;
 return choices[Math.min(choices.length-1,Math.floor(random()*choices.length))];
}

export class ThunderLibrary {
 constructor(){this.bytes=new Map();this.buffers=new Map();this.errors=[];this.recent=[];this.voices=[];this.played=0;this.retired=0;}
 prepare(){
  if(!this.loading)this.loading=Promise.all(THUNDER_CLIPS.map(async clip=>{
   try{
    const response=await fetch(clip.url);
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    this.bytes.set(clip.id,await response.arrayBuffer());
   }catch(error){this.errors.push(`${clip.id}: ${error.message}`);console.warn('Thunder recording unavailable',clip.id,error);}
  }));
  return this.loading;
 }
 async attach(ctx,output){
  this.ctx=ctx;this.output=output;
  if(!this.decoding)this.decoding=(async()=>{
   await this.prepare();
   await Promise.all([...this.bytes].map(async([id,bytes])=>{
    try{this.buffers.set(id,await ctx.decodeAudioData(bytes.slice(0)));}
    catch(error){this.errors.push(`${id}: decode ${error.message}`);}
   }));
   this.bytes.clear();
  })();
  await this.decoding;
 }
 play(near=false,stage=0,at=this.ctx?.currentTime){
  if(!this.ctx||!this.buffers.size)return false;
  const c=this.ctx,clip=chooseThunder(THUNDER_CLIPS.filter(x=>this.buffers.has(x.id)),near,stage,this.recent);
  this.recent=[...this.recent.slice(-1),clip.id];
  this.voices=this.voices.filter(v=>v.end>at);
  // New claps stay distinct while older rolling tails recede smoothly.
  for(const voice of this.voices){
   if(voice.retiring||at-voice.at<.6)continue;
   voice.tailLevel*=.58;
   voice.gain.gain.cancelAndHoldAtTime(at);
   voice.gain.gain.setTargetAtTime(voice.tailLevel,at,.3);
  }
  const active=this.voices.filter(v=>!v.retiring);
  if(active.length>=4){
   const oldest=active[0];oldest.retiring=true;this.retired++;
   oldest.gain.gain.cancelAndHoldAtTime(at);
   oldest.gain.gain.linearRampToValueAtTime(0,at+.8);
   oldest.source.stop(at+.85);oldest.end=at+.85;
  }
  const source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain(),pan=c.createStereoPanner();
  source.buffer=this.buffers.get(clip.id);
  source.playbackRate.value=.97+Math.random()*.06;
  filter.type='lowpass';filter.frequency.value=near?8500:clip.range==='middle'?4200:2400;filter.Q.value=.5;
  const level=(near?1.9:clip.range==='middle'?1.45:1.2)*(.94+Math.random()*.12);
  gain.gain.value=level;pan.pan.value=(Math.random()-.5)*(near?.5:.8);
  source.connect(filter).connect(gain).connect(pan).connect(this.output);
  const voice={source,gain,at,end:at+source.buffer.duration/source.playbackRate.value,tailLevel:level,retiring:false,id:clip.id};
  this.voices.push(voice);this.played++;
  source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();pan.disconnect();this.voices=this.voices.filter(v=>v!==voice);};
  source.start(at);
  return true;
 }
 get status(){return {loaded:this.buffers.size,total:THUNDER_CLIPS.length,played:this.played,active:this.voices.length,retired:this.retired,recent:[...this.recent],errors:[...this.errors]};}
}
