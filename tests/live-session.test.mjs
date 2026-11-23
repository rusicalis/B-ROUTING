import test from 'node:test';
import assert from 'node:assert/strict';
import {createProgress,markStepComplete,remainingSteps} from '../session-progress.mjs';
import {incompleteExerciseIndices,adjacentIncompleteExercise,queueFromExercise,applyLiveIntensity,appendCircuitRound,stepDose} from '../live-session.mjs';
import {createCompactPlan} from '../compact-program.mjs';

function session(){
 const plan={kind:'preset',exercises:[0,1,2,3].map(id=>({id:String(id),sets:2,reps:10,cycleSeconds:4,rest:30}))};
 const steps=plan.exercises.flatMap((_,exerciseIndex)=>[1,2].map(set=>({exerciseIndex,set,restAfter:set===1?30:60})));
 const progress=createProgress(plan,steps);
 return {plan,...progress,steps:structuredClone(progress.sourceSteps),index:0,phase:'work',paused:false,setMs:2350,restMs:0,activeMs:15000,confirmed:0};
}
const ids=steps=>steps.map(step=>step.stepId);

test('arrows exclude completed exercises while skipped earlier exercise remains reachable',()=>{
 const s=session();for(const id of [0,1,4,5])markStepComplete(s,id);
 const before=structuredClone(s);
 assert.deepEqual(incompleteExerciseIndices(s),[1,3]);
 assert.equal(adjacentIncompleteExercise(s,3,-1),1);
 assert.equal(adjacentIncompleteExercise(s,2,-1),1);
 assert.equal(adjacentIncompleteExercise(s,1,1),3);
 assert.equal(adjacentIncompleteExercise(s,3,1),null);
 assert.equal(adjacentIncompleteExercise(s,1,-1),null);
 assert.deepEqual(s,before);
});

test('selection rotates all unfinished IDs so the queue wraps to skipped work',()=>{
 const s=session();for(const id of [0,1,4,5])markStepComplete(s,id);
 assert.deepEqual(ids(queueFromExercise(s,3)),[6,7,2,3]);
 assert.deepEqual(queueFromExercise(s,3).map(step=>step.restAfter),[30,60,30,0]);
 assert.deepEqual(ids(queueFromExercise(s,0)),[2,3,6,7]);
 for(const step of queueFromExercise(s,3))markStepComplete(s,step);
 assert.deepEqual(queueFromExercise(s,1),[]);
});

test('live intensity changes future doses and sets without changing in-flight dose or time',()=>{
 const s=session(),before=structuredClone(s),hard=applyLiveIntensity(s,'hard');
 assert.deepEqual(s,before);
 assert.equal(hard.plan.exercises[0].sets,2);
 assert.ok(hard.plan.exercises[0].reps>10);
 assert.equal(stepDose(hard).reps,10);
 assert.equal(stepDose(hard,hard.sourceSteps.find(step=>step.stepId===1)).reps,13);
 assert.equal(hard.steps[hard.index].stepId,0);
 for(const key of ['index','phase','paused','setMs','restMs','activeMs','confirmed'])assert.equal(hard[key],s[key],key);
 assert.deepEqual(hard.completedStepIds,[]);
 assert.deepEqual(applyLiveIntensity(hard,'hard'),hard);
});

test('absolute intensity survives up/down cycles and serialized reload without dose drift',()=>{
 const s=session(),extreme=applyLiveIntensity(s,'extreme');
 assert.equal(extreme.plan.exercises[1].sets,2);
 assert.equal(extreme.plan.exercises[1].reps,15);
 const normal=applyLiveIntensity(JSON.parse(JSON.stringify(extreme)),'normal');
 assert.equal(normal.plan.exercises[1].sets,2);
 assert.equal(normal.plan.exercises[1].reps,10);
 assert.deepEqual(ids(normal.sourceSteps),[0,1,2,3,4,5,6,7]);
 assert.equal(applyLiveIntensity(normal,'extreme').plan.exercises[1].reps,15);
 assert.deepEqual(normal.intensityBasePlan.exercises,s.plan.exercises);
});

test('lower intensity retains completed and current doses without adding optional sets',()=>{
 const hard=applyLiveIntensity(session(),'hard');
 const optional=hard.sourceSteps.find(step=>step.exerciseIndex===0&&step.set===2);
 markStepComplete(hard,optional);
 const current=hard.sourceSteps.find(step=>step.exerciseIndex===1&&step.set===2);
 hard.steps=queueFromExercise(hard,1);hard.index=hard.steps.findIndex(step=>step.stepId===current.stepId);
 const normal=applyLiveIntensity(hard,'normal');
 assert.ok(normal.sourceSteps.some(step=>step.stepId===optional.stepId));
 assert.ok(normal.sourceSteps.some(step=>step.stepId===current.stepId));
 assert.deepEqual(normal.completedStepIds,[optional.stepId]);
 assert.equal(stepDose(normal,current).reps,13);
 assert.equal(stepDose(normal,normal.sourceSteps.find(step=>step.stepId===optional.stepId)).reps,13);
 assert.equal(normal.plan.exercises[0].sets,2);
 assert.equal(normal.plan.exercises[1].sets,2);
});

test('completed exercise never reappears on live intensity changes and paused rest stays exact',()=>{
 const s=session();markStepComplete(s,0);markStepComplete(s,1);
 s.index=1;s.phase='rest';s.paused=true;s.restMs=12345;s.confirmed=2;
 const extreme=applyLiveIntensity(s,'extreme');
 assert.deepEqual(extreme.sourceSteps.filter(step=>step.exerciseIndex===0).map(step=>step.stepId),[0,1]);
 assert.equal(extreme.plan.exercises[0].reps,10);
 assert.deepEqual(incompleteExerciseIndices(extreme),[1,2,3]);
 assert.equal(extreme.steps[extreme.index].stepId,1);
 for(const key of ['index','phase','paused','setMs','restMs','activeMs','confirmed'])assert.equal(extreme[key],s[key],key);
 assert.deepEqual(extreme.completedStepIds,[0,1]);
});

test('current per-side timed dose stays exact while future work adjusts from baseline',()=>{
 const s=session();s.plan.exercises[0]={...s.plan.exercises[0],reps:0,holdSeconds:30,eachSide:true};
 const extreme=applyLiveIntensity(s,'extreme');
 assert.equal(stepDose(extreme).holdSeconds,30);assert.equal(stepDose(extreme).eachSide,true);
 assert.equal(stepDose(extreme,extreme.sourceSteps.find(step=>step.stepId===1)).holdSeconds,45);
 assert.equal(applyLiveIntensity(extreme,'normal').plan.exercises[0].holdSeconds,30);
});

function circuit(){
 const plan={kind:'preset',infiniteCircuit:true,exercises:[5,10,15].map((reps,index)=>({id:['kb-row','pushup','squat'][index],sets:1,reps,cycleSeconds:4,rest:30})),blocks:[{kind:'circuit',exerciseIndices:[0,1,2],rounds:1}]};
 const steps=plan.exercises.map((_,exerciseIndex)=>({exerciseIndex,set:1,round:1,restAfter:exerciseIndex===2?30:0}));
 const progress=createProgress(plan,steps);
 return {plan,...progress,steps:structuredClone(progress.sourceSteps),index:2,phase:'work',setMs:500,activeMs:10000};
}

test('Sunday rounds append unique IDs with exact 5/10/15 doses and 0/0/30 rests',()=>{
 const s=circuit();for(const step of s.sourceSteps)markStepComplete(s,step);
 const before=structuredClone(s),next=appendCircuitRound(s);
 assert.deepEqual(s,before);
 assert.deepEqual(next.completedStepIds,[0,1,2]);
 assert.deepEqual(next.sourceSteps.slice(3).map(step=>[step.stepId,step.exerciseIndex,step.set,step.round,step.restAfter]),[[3,0,2,2,0],[4,1,2,2,0],[5,2,2,2,30]]);
 assert.deepEqual(next.sourceSteps.slice(3).map(step=>stepDose(next,step).reps),[5,10,15]);
 assert.deepEqual(ids(queueFromExercise(next,0)),[3,4,5]);
 assert.deepEqual(queueFromExercise(next,0).map(step=>step.restAfter),[0,0,30]);
 const third=appendCircuitRound(JSON.parse(JSON.stringify(next)));
 assert.deepEqual(ids(third.sourceSteps),[0,1,2,3,4,5,6,7,8]);
 assert.deepEqual(third.sourceSteps.slice(6).map(step=>step.round),[3,3,3]);
 assert.equal(third.index,s.index);assert.equal(third.setMs,s.setMs);
});

test('invalid intensity is rejected without mutating session',()=>{
 const s=session(),before=structuredClone(s);
 assert.throws(()=>applyLiveIntensity(s,'unknown'),RangeError);
 assert.deepEqual(s,before);
});

test('live intensity preserves round order instead of grouping circuit exercises',()=>{
 const s=circuit();s.index=0;s.plan.infiniteCircuit=false;
 const hard=applyLiveIntensity(s,'hard');
 assert.deepEqual(hard.sourceSteps.map(step=>[step.exerciseIndex,step.round]),[[0,1],[1,1],[2,1]]);
 assert.deepEqual(hard.steps.map(step=>step.exerciseIndex),[0,1,2]);
});

test('intensity queue preserves skipped steps before the current position exactly once',()=>{
 const s=session();s.steps=queueFromExercise(s,3);s.index=1;markStepComplete(s,s.steps[0]);
 const hard=applyLiveIntensity(s,'hard'),remaining=remainingSteps(hard);
 const queued=hard.steps.slice(hard.index);
 assert.equal(hard.steps[hard.index].stepId,7);
 assert.deepEqual([...new Set(ids(queued))].sort((a,b)=>a-b),ids(remaining).sort((a,b)=>a-b));
 assert.equal(new Set(ids(queued)).size,queued.length);
});

test('a session started hard lowers to true normal baseline while retaining current hard dose',()=>{
 const plan=createCompactPlan(1,0,{intensity:'hard'}),progress=createProgress(plan,plan.steps);
 const s={plan,...progress,steps:structuredClone(progress.sourceSteps),index:0,phase:'work',setMs:3456};
 const normal=applyLiveIntensity(s,'normal');
 assert.equal(normal.plan.exercises[0].reps,plan.baseExercises[0].reps);
 assert.equal(stepDose(normal).reps,plan.exercises[0].reps);
 assert.equal(stepDose(normal,normal.sourceSteps[1]).reps,plan.baseExercises[0].reps);
 assert.equal(normal.setMs,3456);
 const hard=applyLiveIntensity(normal,'hard');
 assert.equal(hard.plan.exercises[0].reps,plan.exercises[0].reps);
});

test('infinite live switches change future dose without adding uneven rounds',()=>{
 const plan=createCompactPlan(7,0),progress=createProgress(plan,plan.steps);
 const s={plan,...progress,steps:structuredClone(progress.sourceSteps),index:1,phase:'work',setMs:1020};
 markStepComplete(s,0);
 const hard=applyLiveIntensity(s,'hard');
 assert.equal(hard.sourceSteps.length,3);
 assert.deepEqual(hard.sourceSteps.map(step=>step.round),[1,1,1]);
 assert.equal(stepDose(hard,hard.sourceSteps[0]).reps,5);
 assert.equal(stepDose(hard).reps,10);
 assert.equal(stepDose(hard,hard.sourceSteps[2]).reps,19);
 const next=appendCircuitRound(hard);
 assert.deepEqual(next.sourceSteps.slice(3).map(step=>stepDose(next,step).reps),[7,13,19]);
 assert.deepEqual(queueFromExercise(next,2).map(step=>step.restAfter),[30,0,0,30,0]);
 const normal=applyLiveIntensity(next,'normal'),round3=appendCircuitRound(normal);
 assert.deepEqual(round3.sourceSteps.slice(-3).map(step=>stepDose(round3,step).reps),[5,10,15]);
 assert.equal(normal.sourceSteps.length,6);
});

test('late live intensity trims unstarted original sets to the remaining time budget',()=>{
 const s=session();s.plan.targetMinutes=30;s.activeMs=1400000;s.setMs=10000;
 const result=applyLiveIntensity(s,'extreme');
 assert.ok(result.sourceSteps.length<s.sourceSteps.length);
 assert.equal(result.steps[result.index].stepId,s.steps[s.index].stepId);
 assert.deepEqual(result.completedStepIds,[]);
 assert.equal(stepDose(result).reps,10);
 assert.ok(result.plan.estimatedSeconds<=1800);
 assert.equal(result.plan.overflow,false);
 assert.deepEqual(incompleteExerciseIndices(result),[0,1,2,3]);
});

test('mandatory unfinished movements stay available with honest overflow after time is spent',()=>{
 const s=session();s.plan.targetMinutes=30;s.activeMs=1900000;
 const result=applyLiveIntensity(s,'extreme');
 assert.deepEqual(incompleteExerciseIndices(result),[0,1,2,3]);
 assert.equal(result.sourceSteps.length,4);
 assert.equal(result.plan.overflow,true);
 assert.ok(result.plan.overflowSeconds>0);
 assert.equal(result.activeMs,1900000);
 assert.deepEqual(result.completedStepIds,[]);
});

test('a hard-start plan restores all normal baseline sets instead of retaining hard reduced counts',()=>{
 const s=session();s.plan.baseExercises=structuredClone(s.plan.exercises);
 s.plan.exercises=s.plan.exercises.map(e=>({...e,sets:1,reps:13}));
 s.plan.intensity='hard';s.intensity='hard';
 const progress=createProgress(s.plan,s.plan.exercises.map((_,exerciseIndex)=>({exerciseIndex,set:1,restAfter:60})));
 Object.assign(s,progress,{steps:structuredClone(progress.sourceSteps)});
 const normal=applyLiveIntensity(s,'normal');
 assert.deepEqual(normal.plan.exercises.map(e=>e.sets),[2,2,2,2]);
 assert.equal(stepDose(normal).reps,13);
 assert.equal(stepDose(normal,normal.sourceSteps.find(row=>row.exerciseIndex===0&&row.set===2)).reps,10);
 assert.equal(normal.plan.intensityPolicy,2);
});

test('fresh live switches use the same future dose and set targets as prestart planning',()=>{
 for(const mode of ['normal','hard','extreme'])for(const targetMinutes of [30,40,50,60]){
  const plan=createCompactPlan(1,0,{targetMinutes}),progress=createProgress(plan,plan.steps);
  const s={plan,...progress,steps:structuredClone(progress.sourceSteps),index:0,phase:'work',activeMs:0,setMs:0};
  const expected=createCompactPlan(1,0,{targetMinutes,intensity:mode}),result=applyLiveIntensity(s,mode);
  assert.deepEqual(result.plan.exercises,expected.exercises,mode+' '+targetMinutes);
  assert.equal(stepDose(result).reps,plan.exercises[0].reps);
  for(const row of result.sourceSteps.filter(row=>row.stepId!==0))assert.deepEqual(stepDose(result,row),expected.exercises[row.exerciseIndex]);
  assert.ok(result.plan.estimatedSeconds<=targetMinutes*60);
 }
});

test('reselecting an already budget-trimmed intensity keeps its stable IDs after reload',()=>{
 const s=session();s.plan.targetMinutes=30;s.activeMs=1400000;s.setMs=10000;
 const first=applyLiveIntensity(s,'extreme'),again=applyLiveIntensity(JSON.parse(JSON.stringify(first)),'extreme');
 assert.deepEqual(again,first);
});

test('live budget trimming keeps circuit round metadata aligned with its retained ledger',()=>{
 const plan={kind:'preset',targetMinutes:30,exercises:['a','b'].map(id=>({id,sets:3,reps:8,cycleSeconds:4})),blocks:[{kind:'circuit',exerciseIndices:[0,1],rounds:3}]};
 const steps=[1,2,3].flatMap(round=>[0,1].map(exerciseIndex=>({exerciseIndex,set:round,round}))),progress=createProgress(plan,steps);
 const s={plan,...progress,steps:structuredClone(progress.sourceSteps),index:0,phase:'work',activeMs:1650000,setMs:0};
 const result=applyLiveIntensity(s,'extreme');
 assert.deepEqual(result.sourceSteps.map(row=>[row.exerciseIndex,row.round]),[[0,1],[1,1]]);
 assert.equal(result.plan.blocks[0].rounds,1);
 assert.equal(result.plan.baseBlocks[0].rounds,3);
 assert.ok(result.plan.estimatedSeconds<=1800);
});

test('late saved circuit intensity trims whole untouched rounds instead of leaving a partial round',()=>{
 const plan={kind:'preset',targetMinutes:30,exercises:['a','b'].map(id=>({id,sets:3,reps:8,cycleSeconds:4})),blocks:[{kind:'circuit',exerciseIndices:[0,1],rounds:3}]};
 const steps=[1,2,3].flatMap(round=>[0,1].map(exerciseIndex=>({exerciseIndex,set:round,round}))),progress=createProgress(plan,steps);
 const s={plan,...progress,steps:structuredClone(progress.sourceSteps),index:0,phase:'work',activeMs:1500000,setMs:0};
 const result=applyLiveIntensity(s,'extreme');
 assert.deepEqual(result.sourceSteps.map(row=>[row.exerciseIndex,row.round]),[[0,1],[1,1]]);
 assert.deepEqual(result.plan.exercises.map(e=>e.sets),[1,1]);
 assert.ok(result.plan.estimatedSeconds<=1800);
 assert.deepEqual(result.completedStepIds,[]);
});

test('late cardio intensity retains full rounds with fifteen second rests',()=>{
 const plan={kind:'cardio',circuit:true,targetMinutes:30,exercises:['a','b','c'].map(id=>({id,sets:3,workSeconds:50,reps:0,rest:15}))};
 const steps=[1,2,3].flatMap(set=>[0,1,2].map(exerciseIndex=>({exerciseIndex,set,restAfter:15}))),progress=createProgress(plan,steps);
 const s={plan,...progress,steps:structuredClone(progress.sourceSteps),index:0,phase:'work',activeMs:1500000,setMs:0};
 const result=applyLiveIntensity(s,'extreme');
 assert.deepEqual(result.sourceSteps.map(row=>[row.exerciseIndex,row.round]),[[0,1],[1,1],[2,1]]);
 assert.deepEqual(result.steps.map(row=>row.restAfter),[15,15,0]);
 assert.ok(result.plan.estimatedSeconds<=1800);
});

test('legacy ragged circuits disclose missing companions without dropping the last unfinished movement',()=>{
 const plan={kind:'preset',targetMinutes:30,exercises:['a','b','c'].map(id=>({id,sets:1,reps:8,cycleSeconds:4})),blocks:[{kind:'circuit',exerciseIndices:[0,1],rounds:2},{kind:'sets',exerciseIndices:[2]}]};
 const steps=[{exerciseIndex:0,set:1,round:1},{exerciseIndex:1,set:2,round:2},{exerciseIndex:2,set:1}],progress=createProgress(plan,steps);
 const s={plan,...progress,steps:structuredClone(progress.sourceSteps),index:2,phase:'work',activeMs:0,setMs:0};
 const result=applyLiveIntensity(s,'hard');
 assert.deepEqual(incompleteExerciseIndices(result),[0,1,2]);
 assert.deepEqual(result.plan.incompleteCircuitRounds,[{blockIndex:0,round:1,exerciseIndices:[1]},{blockIndex:0,round:2,exerciseIndices:[0]}]);
 assert.deepEqual(result.completedStepIds,[]);
});
