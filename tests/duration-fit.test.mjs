import test from 'node:test';
import assert from 'node:assert/strict';
import {fitExerciseDuration,buildDurationSteps,estimateDurationSeconds} from '../duration-fit.mjs';

const move=(id,extra={})=>({id,sets:2,reps:8,cycleSeconds:4,rest:30,...extra});
const base={kind:'preset',title:'Protected core',exercises:[move('core-a'),move('core-b',{eachSide:true}),move('core-hold',{reps:0,holdSeconds:30})]};
const candidates=Array.from({length:18},(_,i)=>move('new-'+i,{eachSide:i%3===0}));
const work=plan=>plan.exercises.reduce((n,e)=>n+e.sets*(e.holdSeconds||e.workSeconds||e.reps*e.cycleSeconds)*(e.eachSide?2:1),0);

test('longer official targets prioritize distinct candidate types and preserve all prior doses',()=>{
 let previous;
 for(const targetMinutes of [30,40,50,60]){
  const plan=fitExerciseDuration(base,candidates,targetMinutes);
  assert.equal(plan.targetMinutes,targetMinutes);assert.ok(plan.estimatedSeconds<=targetMinutes*60);assert.equal(plan.estimatedSeconds,estimateDurationSeconds(plan));
  assert.ok(plan.exercises.length<=24);assert.ok(plan.exercises.length>base.exercises.length);
  assert.deepEqual(plan.exercises.slice(0,3).map(e=>e.id),base.exercises.map(e=>e.id));
  assert.equal(new Set(plan.exercises.map(e=>e.id)).size,plan.exercises.length);
  assert.equal(plan.steps.at(-1).restAfter,0);
  if(previous){
   assert.ok(plan.exercises.length>=previous.exercises.length);assert.ok(work(plan)>=work(previous));
   for(let i=0;i<previous.exercises.length;i++){
    const before=previous.exercises[i],after=plan.exercises[i];assert.equal(after.id,before.id);assert.ok(after.sets>=before.sets);assert.ok(after.reps>=before.reps);
    if(before.holdSeconds)assert.ok(after.holdSeconds>=before.holdSeconds);
   }
  }
  previous=plan;
 }
});

test('new exercises precede scaling the protected core whenever starter additions fit',()=>{
 const p=fitExerciseDuration(base,[move('first'),move('first'),move('second')],30);
 assert.deepEqual(p.exercises.map(e=>e.id),['core-a','core-b','core-hold','first','second']);
 assert.equal(p.exercises[3].sets>=2,true);assert.equal(p.exercises[4].sets>=2,true);
 const one=fitExerciseDuration({kind:'preset',exercises:[move('base')]},[move('unilateral',{eachSide:true})],3);
 assert.deepEqual(one.exercises.map(e=>e.id),['base']);assert.equal(one.exercises[0].sets,2);
});

test('every intermediate target follows a monotone allocation prefix',()=>{
 let previous;
 for(let target=30;target<=60;target++){
  const p=fitExerciseDuration(base,candidates,target);
  if(previous)for(let i=0;i<previous.exercises.length;i++){
   assert.equal(p.exercises[i].id,previous.exercises[i].id);assert.ok(p.exercises[i].sets>=previous.exercises[i].sets);assert.ok(p.exercises[i].reps>=previous.exercises[i].reps);
   if(previous.exercises[i].holdSeconds)assert.ok(p.exercises[i].holdSeconds>=previous.exercises[i].holdSeconds);
  }
  previous=p;
 }
});

test('estimator counts both sides and only actual sets and30/60 second rests',()=>{
 const p={kind:'preset',exercises:[move('row',{sets:2,reps:5,eachSide:true}),move('squat',{sets:1,reps:5})]};
 assert.deepEqual(buildDurationSteps(p).map(s=>s.restAfter),[30,60,0]);assert.equal(estimateDurationSeconds(p),190);
});

test('Sunday preserves ordered rounds and appends candidates outside its circuit',()=>{
 const sunday={kind:'preset',exercises:[move('row',{sets:2,reps:5,eachSide:true}),move('pushup',{sets:2,reps:6}),move('squat',{sets:2,reps:8}),move('hold',{sets:2,reps:0,holdSeconds:30})],blocks:[{kind:'circuit',rounds:2,exerciseIndices:[0,1,2]},{kind:'sets',exerciseIndices:[3]}]};
 const p=fitExerciseDuration(sunday,[move('new')],30);
 assert.deepEqual(p.blocks[0],sunday.blocks[0]);assert.deepEqual(p.blocks[1].exerciseIndices,[3,4]);
 assert.deepEqual(p.steps.slice(0,6).map(s=>[s.exerciseIndex,s.set,s.round,s.restAfter]),[[0,1,1,60],[1,1,1,60],[2,1,1,60],[0,2,2,60],[1,2,2,60],[2,2,2,60]]);
 assert.equal(p.steps.at(-1).exerciseIndex,4);assert.equal(p.steps.at(-1).restAfter,0);
});

test('tiny budgets protect core doses and disclose real overflow instead of deleting or padding',()=>{
 const p=fitExerciseDuration(base,candidates,1);
 assert.deepEqual(p.exercises,base.exercises);assert.equal(p.overflow,true);assert.equal(p.overflowSeconds,p.estimatedSeconds-60);assert.ok(p.overflowSeconds>0);
 const noCandidates=fitExerciseDuration({kind:'preset',exercises:[move('one',{sets:1,reps:1})]},[],60);
 assert.ok(noCandidates.estimatedSeconds<3600);assert.ok(noCandidates.exercises[0].sets<=5);assert.ok(noCandidates.exercises[0].reps<=16);
});

test('input plans and catalog metadata are immutable; caller retains level progression ownership',()=>{
 const before=structuredClone(base),pool=structuredClone(candidates);
 const a=fitExerciseDuration(base,candidates,30,0),b=fitExerciseDuration(base,candidates,30,12);
 assert.deepEqual(base,before);assert.deepEqual(candidates,pool);assert.deepEqual(a.exercises,b.exercises);
 a.exercises[0].reps=999;assert.deepEqual(base,before);
});
