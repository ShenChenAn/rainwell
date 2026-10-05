import test from 'node:test';
import assert from 'node:assert/strict';
import {THUNDER_CLIPS,chooseThunder} from './thunder.js';

test('near and distant thunder avoid the previous two recordings even with a fixed random value',()=>{
 for(const near of [true,false]){
  let recent=[];
  for(let i=0;i<40;i++){
   const clip=chooseThunder(THUNDER_CLIPS,near,3,recent,()=>0);
   assert.equal(clip.range==='near',near);
   assert.ok(!recent.includes(clip.id));
   recent=[...recent.slice(-1),clip.id];
  }
 }
});
test('partial asset failures still select an available recording',()=>{
 const available=THUNDER_CLIPS.filter(c=>c.range==='far');
 const first=chooseThunder(available,true,3,[],()=>0);
 assert.ok(available.includes(first));
 const second=chooseThunder(available,true,3,[first.id],()=>0);
 assert.notEqual(second.id,first.id);
 assert.equal(chooseThunder([first],true,3,[first.id],()=>0),first);
});
