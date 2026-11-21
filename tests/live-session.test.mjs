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
 assert.equal(hard.plan.exercises[0].sets,3);
 assert.ok(hard.plan.exercises[0].reps>10);
 assert.equal(stepDose(hard).reps,10);
 assert.equal(stepDose(hard,hard.sourceSteps.find(step=>step.stepId===1)).reps,12);
 assert.equal(hard.steps[hard.index].stepId,0);
 for(const key of ['index','phase','paused','setMs','restMs','activeMs','confirmed'])assert.equal(hard[key],s[key],key);
 assert.deepEqual(hard.completedStepIds,[]);
 assert.deepEqual(applyLiveIntensity(hard,'hard'),hard);
});

test('absolute intensity survives up/down cycles and serialized reload without dose drift',()=>{
 const s=session(),extreme=applyLiveIntensity(s,'extreme');
 assert.equal(extreme.plan.exercises[1].sets,4);
 assert.equal(extreme.plan.exercises[1].reps,13);
 const normal=applyLiveIntensity(JSON.parse(JSON.stringify(extreme)),'normal');
 assert.equal(normal.plan.exercises[1].sets,2);
 assert.equal(normal.plan.exercises[1].reps,10);
 assert.deepEqual(ids(normal.sourceSteps),[0,1,2,3,4,5,6,7]);
 assert.equal(applyLiveIntensity(normal,'extreme').plan.exercises[1].reps,13);
 assert.deepEqual(normal.intensityBasePlan.exercises,s.plan.exercises);
});

test('lower intensity retains credited and current optional sets with their original doses',()=>{
 const hard=applyLiveIntensity(session(),'hard');
 const optional=hard.sourceSteps.find(step=>step.exerciseIndex===0&&step.set===3);
 markStepComplete(hard,optional);
 const current=hard.sourceSteps.find(step=>step.exerciseIndex===1&&step.set===3);
 hard.steps=queueFromExercise(hard,1);hard.index=hard.steps.findIndex(step=>step.stepId===current.stepId);
 const normal=applyLiveIntensity(hard,'normal');
 assert.ok(normal.sourceSteps.some(step=>step.stepId===optional.stepId));
 assert.ok(normal.sourceSteps.some(step=>step.stepId===current.stepId));
 assert.deepEqual(normal.completedStepIds,[optional.stepId]);
 assert.equal(stepDose(normal,current).reps,12);
 assert.equal(stepDose(normal,normal.sourceSteps.find(step=>step.stepId===optional.stepId)).reps,12);
 assert.equal(normal.plan.exercises[0].sets,3);
 assert.equal(normal.plan.exercises[1].sets,3);
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
 assert.equal(stepDose(extreme,extreme.sourceSteps.find(step=>step.stepId===1)).holdSeconds,39);
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
 assert.deepEqual(hard.sourceSteps.map(step=>[step.exerciseIndex,step.round]),[[0,1],[1,1],[2,1],[0,2],[1,2],[2,2]]);
 assert.deepEqual(hard.steps.map(step=>step.exerciseIndex),[0,1,2,0,1,2]);
});

test('removed optional IDs are never reassigned when intensity increases again',()=>{
 const hard=applyLiveIntensity(session(),'hard'),removed=hard.sourceSteps.filter(step=>step.intensityOptional).map(step=>step.stepId);
 const normal=applyLiveIntensity(hard,'normal'),again=applyLiveIntensity(normal,'hard');
 assert.ok(again.sourceSteps.filter(step=>step.intensityOptional).every(step=>!removed.includes(step.stepId)));
 assert.equal(new Set(ids(again.sourceSteps)).size,again.sourceSteps.length);
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
 assert.equal(stepDose(hard,hard.sourceSteps[2]).reps,18);
 const next=appendCircuitRound(hard);
 assert.deepEqual(next.sourceSteps.slice(3).map(step=>stepDose(next,step).reps),[6,12,18]);
 assert.deepEqual(queueFromExercise(next,2).map(step=>step.restAfter),[30,0,0,30,0]);
 const normal=applyLiveIntensity(next,'normal'),round3=appendCircuitRound(normal);
 assert.deepEqual(round3.sourceSteps.slice(-3).map(step=>stepDose(round3,step).reps),[5,10,15]);
 assert.equal(normal.sourceSteps.length,6);
});
