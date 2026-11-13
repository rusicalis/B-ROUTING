import test from 'node:test';
import assert from 'node:assert/strict';
import {EXERCISES} from '../workout-engine.mjs';
import {poseFrames} from '../motion-studio.js';
test('all thirty exercises have finite start and end poses; dynamic exercises move',()=>{
 for(const e of EXERCISES){const frames=poseFrames(e.animation);assert.equal(frames.length,2);for(const p of frames)for(const v of Object.values(p)){assert.equal(v.length,3);assert.ok(v.every(Number.isFinite),e.id)}if(!e.holdSeconds)assert.notDeepEqual(frames[0],frames[1],e.id)}
});
test('scapular push-up maintains extended elbows while moving the shoulder blades',()=>{
 for(const p of poseFrames('scapular'))for(const side of ['l','r']){const a=p[side+'s'],b=p[side+'e'],c=p[side+'h'];const distance=(x,y)=>Math.hypot(...x.map((v,i)=>v-y[i]));assert.ok(distance(a,b)+distance(b,c)-distance(a,c)<.01)}
});
