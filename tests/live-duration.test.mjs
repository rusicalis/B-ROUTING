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
 assert.equal(result.plan.exercises[0].sets,Math.max(7,next(30).exercises[0].sets+1));
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
