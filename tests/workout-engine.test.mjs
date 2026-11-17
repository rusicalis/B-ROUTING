import test from 'node:test';
import assert from 'node:assert/strict';
import * as W from '../workout-engine.mjs';

test('all exercises use bodyweight, one 12kg kettlebell or the 60cm straight band',()=>{
  assert.ok(W.EXERCISES.length>=28);
  for(const e of W.EXERCISES){assert.ok(['bodyweight','kettlebell','band','chair'].includes(e.equipment));assert.ok(e.cues.length>=3);assert.ok(e.animation);assert.equal(e.jumping,false);if(e.equipment==='kettlebell'){assert.equal(e.weight,12);assert.equal(e.count,1)}if(e.equipment==='band'){assert.equal(e.bandLength,60);assert.equal(e.bandType,'straight');assert.equal(e.requiresAnchor,false)}}
});
test('every region offers varied relevant exercises and distinct routine variants',()=>{
  for(const region of W.REGIONS){
    const ids=[];
    for(let variant=1;variant<=3;variant++){
      const p=W.createPlan({regions:[region.id],variant,level:0});
      assert.ok(p.exercises.length>=3);
      assert.ok(p.exercises.every(e=>region.id==='full'||e.groups.includes(region.id)));
      assert.equal(new Set(p.exercises.map(e=>e.id)).size,p.exercises.length);
      ids.push(p.exercises.map(e=>e.id).join(','));
    }
    assert.equal(new Set(ids).size,3,region.id);
  }
});
test('multi-region routine covers each selected part and mixes equipment',()=>{
  const p=W.createPlan({regions:['chest','back','legs'],variant:1,level:0});
  for(const r of ['chest','back','legs'])assert.ok(p.exercises.some(e=>e.groups.includes(r)));
  assert.ok(p.exercises.some(e=>e.equipment==='bodyweight'));assert.ok(p.exercises.some(e=>e.equipment==='kettlebell'));
});
test('progression is bounded and holds have seconds rather than fake repetitions',()=>{
  for(let level=0;level<100;level++)for(const e of W.createPlan({regions:['full'],level,variant:1}).exercises){assert.ok(e.sets<=4);assert.ok(e.reps<=16);assert.ok(e.rest>=45);if(e.holdSeconds)assert.ok(e.holdSeconds<=45)}
  const a=W.createPlan({regions:['legs'],level:0}),b=W.createPlan({regions:['legs'],level:1});
  assert.ok(b.exercises[0].reps>a.exercises[0].reps);
});
test('only all confirmed sets advance a track, once per date',()=>{
  const track=W.newTrack();const plan=W.createPlan({regions:['full'],level:0});const total=plan.exercises.reduce((n,e)=>n+e.sets,0);
  assert.equal(W.recordCompletion(track,{sessionId:'a',date:'2026-11-14',confirmed:total-1,total,feedback:'good'}).accepted,false);
  const a=W.recordCompletion(track,{sessionId:'a',date:'2026-11-14',confirmed:total,total,feedback:'good'});
  assert.equal(a.accepted,true);assert.equal(track.level,1);
  assert.equal(W.recordCompletion(track,{sessionId:'a',date:'2026-11-14',confirmed:total,total,feedback:'good'}).accepted,false);
  W.recordCompletion(track,{sessionId:'b',date:'2026-11-14',confirmed:total,total,feedback:'good'});assert.equal(track.level,1);
  W.recordCompletion(track,{sessionId:'c',date:'2026-11-15',confirmed:total,total,feedback:'hard'});assert.equal(track.level,1);
  W.recordCompletion(track,{sessionId:'d',date:'2026-11-16',confirmed:total,total,feedback:'pain'});assert.equal(track.level,0);
});
test('region track keys are order-independent and separate routine/custom choices',()=>{
  assert.equal(W.trackKey({regions:['legs','chest'],variant:1}),W.trackKey({regions:['chest','legs'],variant:1}));
  assert.notEqual(W.trackKey({regions:['chest'],variant:1}),W.trackKey({regions:['back'],variant:1}));
  assert.notEqual(W.trackKey({regions:['chest'],variant:1}),W.trackKey({regions:['chest'],variant:2}));
  assert.notEqual(W.trackKey({mode:'custom',customIds:['pushup']}),W.trackKey({mode:'custom',customIds:['squat']}));
});
test('migration removes unsupported equipment while preserving user task data',()=>{
  const old={tasks:[{id:'my-task'}],history:[{type:'task'}],completions:{'2026-11-01':{x:true}},settings:{theme:'rose'},workoutConfig:{mode:'custom',customRoutine:[{id:'band-row',equipment:'band'}]}};
  W.migrateWorkout(old);
  assert.equal(old.tasks[0].id,'my-task');assert.equal(old.history.length,1);assert.equal(old.settings.theme,'rose');assert.equal(old.completions['2026-11-01'].x,true);
  assert.ok(old.workoutConfig.customIds.every(id=>W.EXERCISES.some(e=>e.id===id)));
  assert.ok(W.createPlan(old.workoutConfig).exercises.length>=3);
});
test('unknown/empty selections recover to a usable plan and invalid feedback is rejected',()=>{
  assert.ok(W.createPlan({regions:['bogus'],customIds:[],mode:'custom',level:NaN}).exercises.length>=3);
  assert.equal(W.recordCompletion(W.newTrack(),{sessionId:'x',date:'2026-11-14',confirmed:2,total:2,feedback:'bogus'}).accepted,false);
});
test('every increase retains or increases exercise volume instead of resetting reps',()=>{
  for(const region of W.REGIONS){let previous=null;for(let level=0;level<=12;level++){const p=W.createPlan({regions:[region.id],level});if(previous)p.exercises.forEach((e,i)=>{const volume=e.sets*(e.holdSeconds||e.reps*e.cycleSeconds),old=previous.exercises[i];assert.ok(volume>=old.sets*(old.holdSeconds||old.reps*old.cycleSeconds),`${e.id} level ${level}`)});previous=p}}
});
