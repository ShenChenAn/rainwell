import test from 'node:test';
import assert from 'node:assert/strict';
import {StormTimeline} from './weather.mjs';
function run(stage,dt){const w=new StormTimeline(()=>.5);w.reset(stage);const events=[];for(let t=0;t<120-1e-6;t+=dt)for(const e of w.update(dt,stage))events.push({...e,time:w.time});return {w,events};}
test('weather follows active seconds even when rendering drops to two frames per second',()=>{
 for(let stage=0;stage<4;stage++){const fast=run(stage,1/60),slow=run(stage,.5);assert.ok(Math.abs(fast.w.flashes-slow.w.flashes)<=1);assert.ok(Math.abs(slow.w.time-120)<1e-6);}
 assert.ok(run(3,.5).w.flashes>run(0,.5).w.flashes*2);
});
test('each flash produces a delayed thunder and stage changes shorten the next wait',()=>{
 const {events}=run(2,.1);let flash=null;
 for(const event of events){if(event.type==='flash'){assert.equal(flash,null);flash=event;}else{assert.ok(flash);assert.ok(event.time>flash.time);assert.ok(event.time-flash.time<2.1);flash=null;}}
 const w=new StormTimeline(()=>.5);w.update(7,0);const previous=w.next;w.update(.1,3);assert.ok(w.next<previous);assert.equal(w.flashes,1);
});
test('flash remains visible across several frames at low FPS and reset clears pending thunder',()=>{
 const w=new StormTimeline(()=>.5);w.update(7,0);assert.equal(w.flash,1);w.update(.5,0);assert.ok(w.flash>.1);w.update(.3,0);assert.equal(w.flash,0);w.reset(3);assert.equal(w.pending,null);assert.equal(w.flash,0);assert.equal(w.flashes,0);
});

test('final-stage storms retain one delayed thunder per flash at rapid cadence',()=>{
 const w=new StormTimeline(()=>.99);w.reset(3);let waiting=false,count=0,last=-Infinity;
 for(let i=0;i<1200;i++)for(const e of w.update(.1,3)){
  if(e.type==='flash'){assert.equal(waiting,false);if(Number.isFinite(last)){assert.ok(w.time-last>=2);assert.ok(w.time-last<=3.11);}last=w.time;waiting=true;count++;}
  else{assert.equal(waiting,true);waiting=false;}
 }
 assert.ok(count>=39);assert.ok(w.flashes-w.thunders<=1);
});
