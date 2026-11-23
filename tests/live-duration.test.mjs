import test from 'node:test';
import assert from 'node:assert/strict';
import {createCompactPlan} from '../compact-program.mjs';
import {createProgress,markStepComplete,allStepsComplete} from '../session-progress.mjs';
import {applyLiveIntensity,stepDose,incompleteExerciseIndices} from '../live-session.mjs';
import {applyLiveDuration} from '../live-duration.mjs';
import {createPresetPlan,normalizeSavedPreset} from '../preset-program.mjs';

function fixture(minutes=30){
 const plan=createCompactPlan(1,0,{targetMinutes:minutes});
 const progress=createProgress(plan,plan.steps);
 return {id:'retained',date:'2026-11-23',plan,...progress,steps:structuredClone(progress.sourceSteps),index:0,phase:'work',paused:true,intensity:'normal',confirmed:0,setMs:6500,activeMs:15000,restMs:0};
}
const next=minutes=>createCompactPlan(1,0,{targetMinutes:minutes});

test('longer live duration grows future work and preserves the in-flight dose, clocks and credits',()=>{
 const s=fixture(),before=structuredClone(s),current=s.steps[s.index];
 const result=applyLiveDuration(s,next(60));
 assert.equal(result.plan.targetMinutes,60);assert.ok(result.sourceSteps.length>s.sourceSteps.length);
 assert.deepEqual(stepDose(result),stepDose(s));assert.equal(result.steps[result.index].stepId,current.stepId);
 for(const field of ['id','date','index','phase','paused','setMs','restMs','activeMs'])assert.equal(result[field],s[field],field);
 assert.deepEqual(result.completedStepIds,[]);assert.deepEqual(s,before);
});

test('shortening drops only future sets without crediting them or reopening a completed movement',()=>{
 const s=fixture(60),first=s.sourceSteps.filter(row=>row.exerciseIndex===0);
 first.forEach(row=>markStepComplete(s,row));s.index=first.length;s.confirmed=first.length;
 const originalCurrent=stepDose(s),result=applyLiveDuration(s,next(30));
 assert.ok(result.sourceSteps.length<s.sourceSteps.length);assert.deepEqual(result.completedStepIds,s.completedStepIds);
 assert.deepEqual(result.sourceSteps.filter(row=>row.exerciseIndex===0),first.map(row=>({...row,dose:s.plan.exercises[0]})));
 assert.deepEqual(stepDose(result),originalCurrent);assert.ok(!incompleteExerciseIndices(result).includes(0));assert.equal(allStepsComplete(result),false);
});

test('rest duration switching preserves the active rest and keeps the next set available',()=>{
 const s=fixture();markStepComplete(s,s.steps[0]);s.phase='rest';s.restMs=17300;s.setMs=32000;s.confirmed=1;
 const result=applyLiveDuration(s,next(50));
 assert.equal(result.phase,'rest');assert.equal(result.restMs,17300);assert.equal(result.setMs,32000);assert.equal(result.paused,true);
 assert.deepEqual(result.completedStepIds,s.completedStepIds);assert.ok(result.steps[result.index+1]);
 assert.equal(new Set(result.sourceSteps.map(row=>row.stepId)).size,result.sourceSteps.length);
});

test('duration changes establish the new baseline for later intensity changes without cumulative scaling',()=>{
 const s=applyLiveIntensity(fixture(),'hard'),result=applyLiveDuration(s,next(50));
 assert.equal(result.intensity,'hard');assert.equal(result.intensityBasePlan.targetMinutes,50);
 const normal=applyLiveIntensity(result,'normal'),hard=applyLiveIntensity(normal,'hard');
 assert.equal(normal.plan.targetMinutes,50);assert.deepEqual(hard.completedStepIds,result.completedStepIds);
 assert.deepEqual(stepDose(hard),stepDose(result));
 assert.deepEqual(hard.plan.exercises.map(e=>e.sets),result.plan.exercises.map(e=>e.sets));
 assert.deepEqual(hard.plan.exercises.map(e=>e.reps),result.plan.exercises.map(e=>e.reps));
});

test('repeated target selection and serialization preserve stable IDs and selected duration',()=>{
 const up=applyLiveDuration(fixture(),next(60)),same=applyLiveDuration(up,next(60));
 assert.deepEqual(same,up);
 const down=applyLiveDuration(JSON.parse(JSON.stringify(up)),next(30)),again=applyLiveDuration(down,next(60));
 const retired=new Set(up.sourceSteps.filter(row=>!down.sourceSteps.some(x=>x.stepId===row.stepId)).map(row=>row.stepId));
 assert.ok(again.sourceSteps.every(row=>!retired.has(row.stepId)),'retired IDs are never reused');
 assert.equal(again.plan.targetMinutes,60);assert.deepEqual(stepDose(again),stepDose(up));
});

test('invalid, infinite or finished plan changes are rejected without mutating progress',()=>{
 const s=fixture(),original=structuredClone(s);
 assert.throws(()=>applyLiveDuration(s,{...next(30),targetMinutes:35}),RangeError);
 assert.throws(()=>applyLiveDuration({...s,phase:'feedback'},next(40)),RangeError);
 const sun=createCompactPlan(7);assert.throws(()=>applyLiveDuration({...s,plan:sun},sun),RangeError);
 assert.deepEqual(s,original);
});

test('a protected late hard set is not added again as an extra set when shortening',()=>{
 const s=applyLiveIntensity(fixture(60),'hard');
 const first=s.sourceSteps.filter(row=>row.exerciseIndex===0);
 for(const row of first.slice(0,6))markStepComplete(s,row);
 s.index=s.steps.findIndex(row=>row.stepId===first[6].stepId);
 const result=applyLiveDuration(s,next(30));
 assert.equal(result.plan.exercises[0].sets,7);
 assert.equal(result.intensityBasePlan.exercises[0].sets,next(30).exercises[0].sets);
 assert.deepEqual(stepDose(result),stepDose(s));
 const normal=applyLiveIntensity(result,'normal'),again=applyLiveIntensity(normal,'hard');
 assert.equal(again.plan.exercises[0].sets,result.plan.exercises[0].sets);
 assert.deepEqual(again.completedStepIds,result.completedStepIds);
});

test('saved duplicate movement slots retain their individual tempos and doses after resizing',()=>{
 const saved=normalizeSavedPreset({id:'duplicate',name:'속도 구분',baseTargetMinutes:30,exercises:[{id:'pushup',sets:3,reps:5,cycleSeconds:3},{id:'pushup',sets:3,reps:15,cycleSeconds:7}]}).preset;
 const plan=createPresetPlan(1,0,{savedPreset:saved,targetMinutes:30,doseMode:'fit'}),progress=createProgress(plan,plan.steps);
 const s={...fixture(),plan,...progress,steps:copySteps(progress.sourceSteps)};
 const target=createPresetPlan(1,0,{savedPreset:saved,targetMinutes:40,doseMode:'fit'}),result=applyLiveDuration(s,target);
 assert.deepEqual(result.plan.exercises.map(e=>e.cycleSeconds),[3,7]);
 assert.ok(result.sourceSteps.filter(row=>row.exerciseIndex===1).every(row=>row.dose.cycleSeconds===7));
});
const copySteps=rows=>structuredClone(rows);

test('resizing an active cardio circuit keeps round order and cardio rest intervals',()=>{
 const plan={kind:'cardio',circuit:true,targetMinutes:30,exercises:['march','punch','step'].map(id=>({id,sets:2,reps:0,workSeconds:50,rest:15,cycleSeconds:2}))};
 const steps=[1,2].flatMap(set=>plan.exercises.map((_,exerciseIndex)=>({exerciseIndex,set,restAfter:15}))),progress=createProgress(plan,steps);
 const s={...fixture(),plan,...progress,steps:copySteps(progress.sourceSteps)};
 const target={...structuredClone(plan),targetMinutes:40,exercises:plan.exercises.map(e=>({...e,sets:3}))},result=applyLiveDuration(s,target);
 assert.deepEqual(result.sourceSteps.map(row=>row.exerciseIndex),[0,1,2,0,1,2,0,1,2]);
 assert.ok(result.steps.slice(0,-1).every(row=>row.restAfter===15));assert.equal(result.steps.at(-1).restAfter,0);
});

test('duration shortening trims future original rows against actual time and keeps credits exact',()=>{
 const s=fixture(60);markStepComplete(s,s.steps[0]);s.index=1;s.activeMs=1300000;s.setMs=12000;
 const result=applyLiveDuration(s,next(30));
 assert.ok(result.plan.estimatedSeconds<=1800);
 assert.equal(result.plan.overflow,false);
 assert.deepEqual(result.completedStepIds,[0]);
 assert.deepEqual(stepDose(result),stepDose(s));
 assert.equal(result.steps[result.index].stepId,1);
 assert.equal(incompleteExerciseIndices(result).length,s.plan.exercises.length);
});

test('a resized reordered circuit retains movement identity through later intensity switches',()=>{
 const exercises=['a','b','c'].map(id=>({id,sets:2,reps:8,cycleSeconds:4,rest:30}));
 const plan={kind:'preset',targetMinutes:30,exercises,blocks:[{kind:'circuit',exerciseIndices:[0,2],rounds:2},{kind:'sets',exerciseIndices:[1]}]};
 const steps=[{exerciseIndex:0,set:1,round:1},{exerciseIndex:2,set:1,round:1},{exerciseIndex:0,set:2,round:2},{exerciseIndex:2,set:2,round:2},{exerciseIndex:1,set:1},{exerciseIndex:1,set:2}];
 const progress=createProgress(plan,steps),s={...fixture(),plan,...progress,steps:copySteps(progress.sourceSteps)};
 const target={...structuredClone(plan),targetMinutes:40,exercises:[exercises[2],exercises[1],exercises[0]],blocks:[{kind:'circuit',exerciseIndices:[2,0],rounds:2},{kind:'sets',exerciseIndices:[1]}]};
 const result=applyLiveDuration(s,target),hard=applyLiveIntensity(result,'hard');
 assert.deepEqual(result.plan.blocks[0].exerciseIndices,[0,2]);
 assert.deepEqual(hard.plan.blocks[0].exerciseIndices,[0,2]);
 assert.deepEqual(hard.sourceSteps.map(row=>hard.plan.exercises[row.exerciseIndex].id),['a','c','a','c','b','b']);
});

test('shorter duration protects companions in current and completed circuit rounds with honest overflow',()=>{
 const plan={kind:'preset',targetMinutes:40,exercises:['a','b'].map(id=>({id,sets:3,reps:8,cycleSeconds:4})),blocks:[{kind:'circuit',exerciseIndices:[0,1],rounds:3}]};
 const steps=[1,2,3].flatMap(round=>[0,1].map(exerciseIndex=>({exerciseIndex,set:round,round}))),progress=createProgress(plan,steps);
 const s={...fixture(),plan,...progress,steps:copySteps(progress.sourceSteps),index:4,activeMs:1750000,setMs:12000};
 markStepComplete(s,2);
 const target={...structuredClone(plan),targetMinutes:30,exercises:plan.exercises.map(e=>({...e,sets:1})),blocks:[{kind:'circuit',exerciseIndices:[0,1],rounds:1}]};
 const result=applyLiveDuration(s,target);
 assert.deepEqual(result.sourceSteps.map(row=>[row.exerciseIndex,row.round]),[[0,2],[1,2],[0,3],[1,3]]);
 assert.deepEqual(result.completedStepIds,[2]);
 assert.equal(result.steps[result.index].stepId,4);
 assert.deepEqual(stepDose(result),stepDose(s));
 assert.equal(result.plan.overflow,true);
 assert.equal(result.restMs,s.restMs);
});

test('mixed circuit and ordinary blocks trim rounds together while ordinary sets remain independent',()=>{
 const plan={kind:'preset',targetMinutes:40,exercises:['a','b','c'].map(id=>({id,sets:3,reps:8,cycleSeconds:4})),blocks:[{kind:'circuit',exerciseIndices:[0,1],rounds:3},{kind:'sets',exerciseIndices:[2]}]};
 const steps=[...[1,2,3].flatMap(round=>[0,1].map(exerciseIndex=>({exerciseIndex,set:round,round}))),...[1,2,3].map(set=>({exerciseIndex:2,set}))],progress=createProgress(plan,steps);
 const s={...fixture(),plan,...progress,steps:copySteps(progress.sourceSteps),activeMs:1500000,setMs:0};
 const target={...structuredClone(plan),targetMinutes:30};
 const result=applyLiveDuration(s,target);
 for(const round of new Set(result.sourceSteps.filter(row=>row.exerciseIndex<2).map(row=>row.round)))assert.deepEqual(result.sourceSteps.filter(row=>row.round===round&&row.exerciseIndex<2).map(row=>row.exerciseIndex),[0,1]);
 assert.ok(result.sourceSteps.some(row=>row.exerciseIndex===2));
 assert.ok(result.plan.estimatedSeconds<=1800);
 assert.deepEqual(result.completedStepIds,[]);
});

test('resizing a stopped rest uses its remaining rest timer exactly like the active rest phase',()=>{
 const resting=fixture(60);markStepComplete(resting,resting.steps[0]);
 Object.assign(resting,{index:0,phase:'rest',setMs:64000,restMs:10000,activeMs:84000});
 const stopped={...structuredClone(resting),phase:'stopped',stoppedPhase:'rest'};
 const activeResult=applyLiveDuration(resting,next(30)),stoppedResult=applyLiveDuration(stopped,next(30));
 assert.deepEqual(stoppedResult.sourceSteps,activeResult.sourceSteps);
 assert.equal(stoppedResult.plan.estimatedSeconds,activeResult.plan.estimatedSeconds);
 assert.equal(stoppedResult.phase,'stopped');assert.equal(stoppedResult.stoppedPhase,'rest');
 assert.equal(stoppedResult.restMs,10000);assert.equal(stoppedResult.setMs,64000);
 assert.deepEqual(stoppedResult.completedStepIds,resting.completedStepIds);
});
