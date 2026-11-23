import test from 'node:test';
import assert from 'node:assert/strict';
import {planIntensity,scaleExerciseDose,normalizeIntensity} from '../intensity-policy.mjs';

test('scaling separates tiny repetitions and capped timed doses without reducing manual bases',()=>{
 for(const [base,want] of [[1,[1,2,3]],[8,[8,10,12]],[24,[24,30,36]],[40,[40,50,60]]]){
  assert.deepEqual(['normal','hard','extreme'].map(mode=>scaleExerciseDose({sets:3,reps:base},mode).reps),want);
 }
 assert.deepEqual(['normal','hard','extreme'].map(mode=>scaleExerciseDose({sets:2,reps:0,holdSeconds:90},mode).holdSeconds),[90,113,135]);
 assert.equal(scaleExerciseDose({sets:2,reps:0,workSeconds:120},'normal').workSeconds,120);
 assert.equal(scaleExerciseDose({sets:2,reps:0,workSeconds:120},'hard').workSeconds,150);
 assert.equal(normalizeIntensity('unknown'),'normal');
});

test('short plans scale absolutely without adding sets, changing rests, or mutating input',()=>{
 const base={kind:'preset',targetMinutes:30,exercises:[{id:'a',sets:2,reps:8,cycleSeconds:4,cues:['steady']},{id:'b',sets:2,reps:0,holdSeconds:90,eachSide:true}]};
 const before=structuredClone(base),hard=planIntensity(base,'hard');
 assert.deepEqual(base,before);assert.deepEqual(hard.exercises.map(e=>e.sets),[2,2]);
 assert.deepEqual(hard.steps.map(s=>s.restAfter),[30,60,30,0]);
 assert.equal(hard.estimatedSeconds,652); // 2*40 + 2*(113*2) + 120 rest.
 assert.equal(hard.remainingSeconds,1148);assert.equal(hard.overflow,false);
 assert.equal(hard.intensityPolicy,2);assert.deepEqual(hard.baseExercises,base.exercises);
 hard.baseExercises[0].cues.push('changed');assert.deepEqual(base.exercises[0].cues,['steady']);
 assert.deepEqual(planIntensity(planIntensity(base,'extreme'),'normal').exercises,base.exercises);
 assert.deepEqual(planIntensity(planIntensity(base,'extreme'),'hard').exercises,planIntensity(base,'hard').exercises);
});

test('oversized minimum coverage reports honest overflow without cutting doses or dropping types',()=>{
 const base={kind:'preset',targetMinutes:1,exercises:[{id:'a',sets:5,reps:40,cycleSeconds:4},{id:'b',sets:5,holdSeconds:120,reps:0}]};
 const p=planIntensity(base,'extreme');
 assert.deepEqual(p.exercises.map(e=>e.sets),[1,1]);assert.deepEqual(p.exercises.map(e=>e.id),['a','b']);
 assert.equal(p.estimatedSeconds,480);assert.equal(p.overflowSeconds,420);assert.equal(p.overflow,true);
 assert.equal(p.exercises[0].reps,60);assert.equal(p.exercises[1].holdSeconds,180);
});

test('time fitting shares set reductions across types before exhausting one movement',()=>{
 const p=planIntensity({kind:'preset',targetMinutes:20,exercises:[{id:'a',sets:6,reps:8,cycleSeconds:4},{id:'b',sets:6,reps:8,cycleSeconds:4},{id:'c',sets:6,reps:0,holdSeconds:30}]},'hard');
 assert.ok(p.estimatedSeconds<=1200);
 assert.ok(p.exercises.every(e=>e.sets>=5),JSON.stringify(p.exercises.map(e=>e.sets)));
});

test('plans with no finite target retain prescribed counts',()=>{
 const p=planIntensity({kind:'preset',exercises:[{id:'a',sets:8,reps:8,cycleSeconds:4}]},'extreme');
 assert.equal(p.exercises[0].sets,8);assert.equal(p.estimatedSeconds,594);assert.equal(p.overflow,false);
});

test('saved circuits reduce complete balanced rounds and keep round execution order',()=>{
 const base={kind:'preset',targetMinutes:3,exercises:[{id:'a',sets:4,reps:5,cycleSeconds:4},{id:'b',sets:4,reps:5,cycleSeconds:4}],blocks:[{kind:'circuit',exerciseIndices:[0,1],rounds:4}]};
 const p=planIntensity(base,'hard');
 assert.deepEqual(p.exercises.map(e=>e.sets),[1,1]);assert.equal(p.blocks[0].rounds,1);
 assert.deepEqual(p.steps.map(s=>[s.exerciseIndex,s.round,s.restAfter]),[[0,1,60],[1,1,0]]);
 assert.equal(p.estimatedSeconds,116);
 const restored=planIntensity({...JSON.parse(JSON.stringify(p)),targetMinutes:10},'normal');
 assert.deepEqual(restored.exercises.map(e=>e.sets),[4,4]);assert.equal(restored.blocks[0].rounds,4);
 assert.equal(restored.steps.length,8);assert.equal(restored.estimatedSeconds,580);
});

test('single movement circuit blocks keep ordinary set rests and exact transition costs',()=>{
 const p=planIntensity({kind:'preset',targetMinutes:3,exercises:[{id:'a',sets:2,reps:0,holdSeconds:30},{id:'b',sets:2,reps:0,holdSeconds:30}],blocks:[{kind:'sets',exerciseIndices:[0]},{kind:'circuit',exerciseIndices:[1],rounds:2}]},'hard');
 assert.deepEqual(p.exercises.map(e=>e.sets),[1,1]);assert.equal(p.estimatedSeconds,136);
 assert.deepEqual(p.steps.map(s=>s.restAfter),[60,0]);
});

test('cardio keeps its fifteen second rests and balanced rounds',()=>{
 const base={kind:'cardio',targetMinutes:3,circuit:true,exercises:[{id:'a',sets:4,reps:0,workSeconds:30,rest:15},{id:'b',sets:4,reps:0,workSeconds:30,rest:15}]};
 const p=planIntensity(base,'hard');
 assert.deepEqual(p.exercises.map(e=>e.sets),[1,1]);
 assert.deepEqual(p.steps.map(s=>s.restAfter),[15,0]);assert.equal(p.estimatedSeconds,91);
});

test('infinite Sunday scales one round only and preserves its exact rests',()=>{
 const base={kind:'preset',targetMinutes:1,infinite:true,exercises:[5,10,15].map((reps,index)=>({id:String(index),sets:1,reps,cycleSeconds:4})),blocks:[{kind:'circuit',exerciseIndices:[0,1,2],rounds:1,infinite:true}]};
 const normal=planIntensity(base,'normal'),hard=planIntensity(base,'hard'),extreme=planIntensity(base,'extreme');
 assert.deepEqual(normal.exercises.map(e=>e.reps),[5,10,15]);
 assert.deepEqual(hard.exercises.map(e=>e.reps),[7,13,19]);
 assert.deepEqual(extreme.exercises.map(e=>e.reps),[8,15,23]);
 for(const p of [normal,hard,extreme]){assert.equal(p.steps.length,3);assert.deepEqual(p.steps.map(s=>s.restAfter),[0,0,30]);assert.equal(p.overflow,false);assert.equal(p.roundSeconds,p.estimatedSeconds)}
});
