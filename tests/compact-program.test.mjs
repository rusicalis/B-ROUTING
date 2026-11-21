import test from 'node:test';
import assert from 'node:assert/strict';
import {hasExercisePreview} from '../exercise-media-data.mjs';
import {createCompactPlan,compactTrackKey,RECOMMENDED_PRESETS,normalizeIntensity,scaleExerciseDose} from '../compact-program.mjs';

test('compact default follows the requested paired muscle split with one or two types per target',()=>{
 const targets=[['chest','triceps','core'],['back','biceps','core'],['shoulders','legs','core']];
 for(let day=1;day<=6;day++){
  const p=createCompactPlan(day,0);
  assert.equal(p.kind,'preset');assert.equal(p.presetId,'user-week');
  assert.deepEqual(p.targets,targets[(day-1)%3]);
  assert.ok(p.exercises.length>=3&&p.exercises.length<=6);
  for(const group of p.targets){const count=p.exercises.filter(e=>e.groups.includes(group)).length;assert.ok(count>=1&&count<=2,`${day}: ${group} has ${count} types`)}
  if(day<=3)assert.deepEqual(p.exercises.map(e=>e.id),createCompactPlan(day+3,0).exercises.map(e=>e.id));
 }
});

test('every recommendation and earned level uses supported exact GIFs and quiet compatible equipment',()=>{
 assert.ok(RECOMMENDED_PRESETS.length>=2&&RECOMMENDED_PRESETS.length<=3);
 for(const {id} of RECOMMENDED_PRESETS)for(let day=1;day<=7;day++)for(const level of [0,3,4,8,12]){
  const p=createCompactPlan(day,level,{presetId:id});
  assert.equal(p.presetId,id);assert.equal(new Set(p.exercises.map(e=>e.id)).size,p.exercises.length);
  for(const e of p.exercises){
   assert.equal(hasExercisePreview(e.id),true,e.id);assert.ok(['bodyweight','kettlebell'].includes(e.equipment),e.id);assert.equal(e.jumping,false);
   if(e.equipment==='kettlebell'){assert.equal(e.weight,12);assert.equal(e.count,1)}
   assert.ok(Number.isInteger(e.sets)&&e.sets>=1&&e.sets<=12,e.id);
  }
 }
});

test('finite timing fills 30/40/50/60 minute selections through doses with exact set and exercise rests',()=>{
 for(const {id} of RECOMMENDED_PRESETS)for(let day=1;day<=6;day++)for(const level of [0,4,12])for(const targetMinutes of [30,40,50,60]){
  const p=createCompactPlan(day,level,{presetId:id,targetMinutes});
  assert.ok(p.estimatedSeconds<=targetMinutes*60,`${id} day${day} level${level}: ${p.estimatedSeconds}`);
  assert.ok(p.estimatedSeconds>=targetMinutes*60-60,`${id} day${day} level${level}: ${p.estimatedSeconds}`);
  assert.equal(p.steps.at(-1).restAfter,0);
  let total=0;
  p.steps.forEach((s,index)=>{
   const e=p.exercises[s.exerciseIndex],next=p.steps[index+1];
   assert.equal(s.restAfter,!next?0:next.exerciseIndex===s.exerciseIndex?30:60);
   total+=(e.holdSeconds||e.workSeconds||e.reps*e.cycleSeconds)*(e.eachSide?2:1)+s.restAfter;
  });
  assert.equal(p.estimatedSeconds,total);assert.ok(p.exercises.length<=6);
 }
});

test('Sunday is an endless exact 5/10/15 circuit with one round-end rest',()=>{
 for(const targetMinutes of [30,60])for(const level of [0,12]){
  const p=createCompactPlan(7,level,{targetMinutes});
  assert.equal(p.infinite,true);assert.deepEqual(p.exercises.map(e=>[e.id,e.reps]),[['pike-pushup',5],['pushup',10],['squat',15]]);
  assert.deepEqual(p.steps.map(s=>[s.exerciseIndex,s.set,s.round,s.restAfter]),[[0,1,1,0],[1,1,1,0],[2,1,1,30]]);
  assert.equal(p.blocks[0].kind,'circuit');assert.equal(p.blocks[0].rounds,1);assert.equal(p.estimatedSeconds,150);
 }
});

test('earned progress changes only reviewed movements after sufficient completed levels',()=>{
 const ids=(day,level)=>createCompactPlan(day,level).exercises.map(e=>e.id);
 for(let day=1;day<=6;day++){
  assert.deepEqual(ids(day,0),ids(day,3));
  const before=ids(day,0),after=ids(day,4);
  assert.equal(after.filter(id=>!before.includes(id)).length,1);
 }
 assert.ok(ids(1,4).includes('side-plank'));
 assert.ok(ids(3,4).includes('kb-goblet'));
});

test('comfortable completion levels add gentle real work without removing prescribed doses',()=>{
 const work=p=>p.exercises.reduce((sum,e)=>sum+e.sets*(e.holdSeconds||e.workSeconds||e.reps*e.cycleSeconds)*(e.eachSide?2:1),0);
 for(const {id} of RECOMMENDED_PRESETS)for(let day=1;day<=6;day++)for(const targetMinutes of [30,40,50,60]){
  let previous=createCompactPlan(day,0,{presetId:id,targetMinutes});
  for(let level=1;level<=12;level++){
   const next=createCompactPlan(day,level,{presetId:id,targetMinutes});
   if(level!==4){
    assert.deepEqual(next.exercises.map(e=>e.id),previous.exercises.map(e=>e.id));
    assert.ok(work(next)>work(previous),`${id} day${day} ${targetMinutes}min level${level} must add work`);
    assert.ok(work(next)<=work(previous)*1.05);
    next.exercises.forEach((e,i)=>{
     const before=previous.exercises[i];
     assert.ok(e.sets>=before.sets);assert.ok(e.reps>=before.reps);
     assert.ok((e.holdSeconds||0)>=(before.holdSeconds||0));
     assert.ok((e.workSeconds||0)>=(before.workSeconds||0));
    });
   }
   assert.ok(next.estimatedSeconds<=targetMinutes*60);
   assert.ok(next.estimatedSeconds>=targetMinutes*60-60);
   previous=next;
  }
 }
});

test('intensity is exclusive, bounded, and leaves input objects unchanged',()=>{
 const base={id:'pushup',sets:5,reps:10,cycleSeconds:4};
 const normal=scaleExerciseDose(base,'normal'),hard=scaleExerciseDose(base,'hard'),extreme=scaleExerciseDose(base,'extreme');
 assert.deepEqual(base,{id:'pushup',sets:5,reps:10,cycleSeconds:4});assert.notEqual(base,normal);
 assert.equal(normal.reps,10);assert.ok(hard.reps>normal.reps);assert.ok(extreme.reps>hard.reps);
 assert.equal(normalizeIntensity(['hard','extreme']),'normal');assert.equal(normalizeIntensity('bogus'),'normal');
 assert.equal(normalizeIntensity('extreme'),'extreme');
 const cap=scaleExerciseDose({sets:12,reps:24,holdSeconds:90},'extreme');assert.equal(cap.sets,12);assert.equal(cap.reps,24);assert.equal(cap.holdSeconds,90);
 const p=createCompactPlan(1,0,{intensity:'extreme'});assert.equal(p.intensity,'extreme');assert.ok(p.exercises.every(e=>e.sets<=12&&e.reps<=24));
});

test('progress is shared by paired weekdays and separated from legacy and recommendation tracks',()=>{
 assert.equal(compactTrackKey(1),compactTrackKey(4));assert.equal(compactTrackKey(2),compactTrackKey(5));assert.equal(compactTrackKey(3),compactTrackKey(6));
 assert.notEqual(compactTrackKey(1),compactTrackKey(2));assert.notEqual(compactTrackKey(1),compactTrackKey(7));
 assert.equal(compactTrackKey(1),compactTrackKey(1,{targetMinutes:60,intensity:'hard'}));
 assert.notEqual(compactTrackKey(1),compactTrackKey(1,{presetId:RECOMMENDED_PRESETS[1].id}));
 assert.equal(createCompactPlan(NaN,-2,{presetId:'missing',targetMinutes:NaN}).day,1);
 assert.equal(createCompactPlan(1,Infinity,{presetId:'missing'}).presetId,'user-week');
});
