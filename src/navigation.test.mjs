import test from 'node:test';
import assert from 'node:assert/strict';
import {routeTo,guideBearing} from './navigation.mjs';
import {collides} from './core.mjs';
test('guide routes around a wall without sending the player through it',()=>{const rects=[{minX:-1,maxX:1,minZ:-5,maxZ:0}],p=routeTo({x:0,z:2},{x:0,z:-7},rects);assert.ok(p.length>8);for(let i=1;i<p.length;i++)for(let t=0;t<=1;t+=.1)assert.equal(collides({x:p[i-1].x+(p[i].x-p[i-1].x)*t,z:p[i-1].z+(p[i].z-p[i-1].z)*t},rects),false);assert.ok(Math.hypot(p.at(-1).x,p.at(-1).z+7)<1.8);});
test('guide returns no route for an enclosed target',()=>{const rects=[{minX:-3,maxX:3,minZ:-10,maxZ:-2}];assert.deepEqual(routeTo({x:0,z:2},{x:0,z:-6},rects),[]);});
test('arrow follows camera heading',()=>{assert.equal(guideBearing({x:0,z:0},{x:0,z:-5},0),0);assert.equal(guideBearing({x:0,z:0},{x:5,z:0},0),Math.PI/2);assert.equal(guideBearing({x:0,z:0},{x:0,z:-5},Math.PI/2),Math.PI/2);});
test('endpoint has sight of the target rather than stopping behind adjacent cover',()=>{const rects=[{name:'cover',minX:2.9,maxX:4.7,minZ:-3.6,maxZ:-1.38},{name:'crate',minX:4.38,maxX:5.32,minZ:-2.22,maxZ:-1.28}],target={x:4.85,z:-1.75};const p=routeTo({x:2,z:2.4},target,rects,'crate'),end=p.at(-1);assert.ok(end);for(let t=0;t<1;t+=.01){const x=end.x+(target.x-end.x)*t,z=end.z+(target.z-end.z)*t;assert.equal(x>2.9&&x<4.7&&z>-3.6&&z<-1.38,false);}});
