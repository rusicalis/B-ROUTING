import test from 'node:test';
import assert from 'node:assert/strict';
import {trainerReaction,reactionPose} from '../trainer-reactions.mjs';
import {poseFrames} from '../motion-studio.js';
test('time and completed sets increase effort and sweat without replacing exercise motion',()=>{
 const fresh=trainerReaction({phase:'work',activeSeconds:10,completedSets:0,totalSets:12});
 const tired=trainerReaction({phase:'work',activeSeconds:900,completedSets:10,totalSets:12});
 assert.ok(tired.fatigue>fresh.fatigue);assert.ok(tired.effort>fresh.effort);assert.ok(tired.sweatCount>fresh.sweatCount);assert.equal(tired.takesOverPose,false);
});
test('rest breathes, wipes sweat and encourages; restarting a set cancels gestures',()=>{
 const state={phase:'rest',activeSeconds:500,completedSets:6,totalSets:12};
 assert.equal(trainerReaction({...state,restElapsed:1}).kind,'breathe');assert.equal(trainerReaction({...state,restElapsed:4}).kind,'wipe');assert.equal(trainerReaction({...state,restElapsed:7}).kind,'encourage');assert.equal(trainerReaction({...state,restElapsed:15}).kind,'recover');
 assert.equal(trainerReaction({...state,phase:'work',restElapsed:4}).takesOverPose,false);
 assert.equal(trainerReaction({...state,phase:'done'}).kind,'celebrate');
});
test('wipe and encouragement poses move the hand while keeping feet planted',()=>{
 const base=poseFrames('squat')[0],wipe=reactionPose(base,'wipe',4,.7),cheer=reactionPose(base,'encourage',7,.7);
 assert.ok(wipe.rh[1]>2.4);assert.ok(cheer.rh[1]>2.0);assert.deepEqual(wipe.lf,base.lf);assert.deepEqual(wipe.rf,base.rf);
 for(const p of [wipe,cheer])assert.ok(Object.values(p).flat().every(Number.isFinite));
});
