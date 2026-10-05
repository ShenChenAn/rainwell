import test from 'node:test';
import assert from 'node:assert/strict';
import {Expedition,ITEMS,LAMPS,validateSave} from './core.mjs';
import {RELICS} from './relics.mjs';

test('each collected relic can be inspected without losing warning time, grace or inventory',()=>{
 const game=new Expedition();game.start();
 assert.equal(game.beginInspection(-1),false);
 assert.equal(game.beginInspection(0),false);
 for(let index=0;index<3;index++){
  assert.equal(game.collect(ITEMS[index]),true);
  assert.equal(game.beginInspection(index),true);
  const before=JSON.stringify({elapsed:game.elapsed,danger:game.danger,grace:game.grace,pending:game.pending,stageTime:game.stageTime});
  for(let i=0;i<600;i++)game.update(.1,{x:12,z:5},true);
  assert.equal(JSON.stringify({elapsed:game.elapsed,danger:game.danger,grace:game.grace,pending:game.pending,stageTime:game.stageTime}),before);
  assert.equal(validateSave(game.snapshot()).stage,index+1);
  assert.equal(game.collect(ITEMS[Math.min(index+1,2)]),false);
  assert.equal(game.beginFall({x:0,z:-4}),false);
  game.resume();game.pause();assert.equal(game.phase,'inspecting');
  assert.equal(game.endInspection(),true);assert.equal(game.endInspection(),false);
  game.update(.1,LAMPS[0]);assert.ok(game.elapsed>0);
 }
 assert.equal(game.beginFall({x:0,z:-4}),true);
});

test('inspection titles use the same item identities as pickups and route objectives',()=>{
 assert.deepEqual(RELICS.map(r=>({id:r.id,name:r.name})),ITEMS.map(r=>({id:r.id,name:r.name})));
});
