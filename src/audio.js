import {ThunderLibrary} from './thunder.js';
export class Soundscape{
 constructor(){this.ctx=null;this.volume=.55;this.stepClock=0;this.pursuerClock=0;this.breathClock=0;this.nextThunder=15;this.duckUntil=0;this.rainDuckUntil=0;this.thunderLibrary=new ThunderLibrary();this.events={thunder:0,pursuer:0,player:0};}
 async start(){if(!this.ctx){const C=window.AudioContext||window.webkitAudioContext;if(!C)return;this.ctx=new C();const c=this.ctx;this.master=c.createGain();this.master.gain.value=this.volume*.55;this.limiter=c.createDynamicsCompressor();this.limiter.threshold.value=-9;this.limiter.knee.value=6;this.limiter.ratio.value=6;this.limiter.attack.value=.008;this.limiter.release.value=.25;this.master.connect(this.limiter).connect(c.destination);this.thunderBus=c.createGain();this.thunderBus.connect(this.master);this.thunderReady=this.thunderLibrary.attach(c,this.thunderBus);this.noise=c.createBuffer(1,c.sampleRate*5,c.sampleRate);const data=this.noise.getChannelData(0);let last=0;for(let i=0;i<data.length;i++){const w=Math.random()*2-1;last=(last+.035*w)/1.035;data[i]=last*3.5;}this.white=c.createBuffer(1,c.sampleRate*2,c.sampleRate);const white=this.white.getChannelData(0);for(let i=0;i<white.length;i++)white[i]=Math.random()*2-1;const rain=c.createBufferSource();rain.buffer=this.noise;rain.loop=true;const filter=c.createBiquadFilter();filter.type='highpass';filter.frequency.value=450;const gain=c.createGain();gain.gain.value=.32;this.rainGain=gain;rain.connect(filter).connect(gain).connect(this.master);rain.start();}await this.ctx.resume();await this.thunderReady;}
 prepare(){return this.thunderLibrary.prepare();}
 setVolume(v){this.volume=v;if(this.ctx)this.master.gain.setTargetAtTime(v*.55,this.ctx.currentTime,.1);}
 inspect(){
  // Keep the rain bed and any existing thunder tails playing during inspection.
  // Gameplay updates stop, so release temporary ducking here instead of freezing it.
  if(!this.ctx)return;const t=this.ctx.currentTime;
  this.rainGain.gain.cancelScheduledValues(t);this.rainGain.gain.setTargetAtTime(.32,t,.35);
  this.thunderBus.gain.cancelScheduledValues(t);this.thunderBus.gain.setTargetAtTime(1,t,.35);
 }
 pause(){this.ctx?.suspend();}
 burst(duration,freq,amp,position=null,crisp=false,refDistance=2.5){if(!this.ctx||this.ctx.state!=='running')return;const c=this.ctx,t=c.currentTime,s=c.createBufferSource();s.buffer=crisp?this.white:this.noise;const f=c.createBiquadFilter();f.type=crisp?'bandpass':'lowpass';f.frequency.value=freq;const gain=c.createGain();gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,amp),t+.035);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);s.connect(f).connect(gain);if(position){const p=c.createPanner();p.panningModel='HRTF';p.distanceModel='inverse';p.refDistance=refDistance;p.maxDistance=30;p.positionX.value=position[0];p.positionY.value=position[1];p.positionZ.value=position[2];gain.connect(p).connect(this.master);s.onended=()=>{p.disconnect();gain.disconnect();f.disconnect()};}else{gain.connect(this.master);s.onended=()=>{gain.disconnect();f.disconnect()};}s.start(t,Math.random()*(crisp?1:2));s.stop(t+duration);}
 tone(freq,duration,amp=.06){if(!this.ctx||this.ctx.state!=='running')return;const c=this.ctx,t=c.currentTime,o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(freq,t);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(amp,t+.025);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g).connect(this.master);o.start(t);o.stop(t+duration);o.onended=()=>g.disconnect();}
 duck(seconds){if(this.ctx)this.duckUntil=this.ctx.currentTime+seconds;}
 footstep(position,pursuer=false){this.burst(.22,pursuer?430:260,pursuer?1.7:.13,position,false,pursuer?4.5:2.5);this.burst(.15,pursuer?950:1100,pursuer?.65:.055,position,true,pursuer?4.5:2.5);this.events[pursuer?'pursuer':'player']++;}
 cue(type){if(type==='collect'){this.tone(330,.9,.08);this.tone(495,.6,.035);}if(type==='warning')this.burst(.6,160,.25);if(type==='failed')this.burst(1.8,100,.4);if(type==='hint')this.tone(190,.8,.025);}
 update(dt,game,camera,moving,sprint,time){if(!this.ctx||this.ctx.state!=='running')return;const c=this.ctx,l=c.listener,p=camera.position;const dir={x:-Math.sin(camera.rotation.y),z:-Math.cos(camera.rotation.y)};l.positionX.value=p.x;l.positionY.value=p.y;l.positionZ.value=p.z;const e=camera.matrixWorld.elements;l.forwardX.value=-e[8];l.forwardY.value=-e[9];l.forwardZ.value=-e[10];l.upX.value=e[4];l.upY.value=e[5];l.upZ.value=e[6];this.stepClock-=dt;if(moving&&this.stepClock<=0){this.footstep(null);this.stepClock=sprint?.29:.47;}const d=game.danger/100;const rainLevel=c.currentTime<this.rainDuckUntil?.11:c.currentTime<this.duckUntil?.2:.32;this.rainGain.gain.cancelScheduledValues(c.currentTime);this.rainGain.gain.setTargetAtTime(rainLevel,c.currentTime,.18);this.thunderBus.gain.cancelScheduledValues(c.currentTime);this.thunderBus.gain.setTargetAtTime(d>.58?.78:1,c.currentTime,.15);this.pursuerClock-=dt;this.breathClock-=dt;if(d>.18&&this.pursuerClock<=0){const dist=7.5-d*6;this.footstep([p.x+e[8]*dist+Math.sin(time*1.6)*.9,p.y-1.5,p.z+e[10]*dist],true);this.pursuerClock=1.1-d*.7;}if(d>.58&&this.breathClock<=0){this.burst(.8,600,.14+d*.18,[p.x+e[8]*1.1,p.y,p.z+e[10]*1.1]);this.tone(54,.22,.06*d);this.breathClock=2.4-d*1.2;}}
 thunder(near=false,stage=0){
  if(!this.ctx||this.ctx.state!=='running')return;
  this.events.thunder++;
  this.rainDuckUntil=Math.max(this.rainDuckUntil,this.ctx.currentTime+(near?1.1:.7));
  this.rainGain.gain.cancelScheduledValues(this.ctx.currentTime);
  this.rainGain.gain.setTargetAtTime(.11,this.ctx.currentTime,.04);
  if(this.thunderLibrary.play(near,stage))return;
  // Only used if every recording fails to load; never add a synthetic bass note.
  this.burst(near?5:7,near?360:220,near?1.6:1.2);
  this.burst(.3,near?1400:700,near?.5:.25,null,true);
 }
}
