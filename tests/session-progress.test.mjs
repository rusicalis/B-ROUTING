import test from 'node:test';
import assert from 'node:assert/strict';
import {createProgress,normalizeProgress,markStepComplete,remainingSteps,exerciseProgress,reopenExercise,allStepsComplete} from '../session-progress.mjs';

const plan={kind:'preset',exercises:[{id:'pushup',sets:2,rest:30},{id:'squat',sets:2,rest:30}]};
const steps=[{exerciseIndex:0,set:1,restAfter:30},{exerciseIndex:0,set:2,restAfter:60},{exerciseIndex:1,set:1,restAfter:30},{exerciseIndex:1,set:2,restAfter:0}];
const session=()=>({plan,steps:structuredClone(steps),index:0,confirmed:0,phase:'work',...createProgress(plan,steps)});

test('navigation and stopping never credit skipped work; retries contain only unfinished stable IDs',()=>{
 const s=session();s.index=2;
 assert.deepEqual(s.completedStepIds,[]);
 assert.equal(markStepComplete(s,s.steps[2]),true);
 assert.equal(markStepComplete(s,s.steps[2]),false);
 assert.deepEqual(s.completedStepIds,[2]);
 s.phase='stopped';const restored=normalizeProgress(JSON.parse(JSON.stringify(s)));
 assert.deepEqual(remainingSteps(restored).map(x=>x.stepId),[0,1,3]);
 assert.deepEqual(remainingSteps(restored,1).map(x=>x.stepId),[3]);
 assert.deepEqual(exerciseProgress(restored),[{exerciseIndex:0,completed:0,total:2,remaining:2},{exerciseIndex:1,completed:1,total:2,remaining:1}]);
 assert.equal(allStepsComplete(restored),false);
});

test('remaining steps recompute rests after selection and omissions without mutating source',()=>{
 const s=session();const original=structuredClone(s.sourceSteps);
 markStepComplete(s,steps[1]);
 assert.deepEqual(remainingSteps(s).map(x=>[x.stepId,x.restAfter]),[[0,60],[2,30],[3,0]]);
 assert.deepEqual(remainingSteps(s,0).map(x=>[x.stepId,x.restAfter]),[[0,0]]);
 assert.deepEqual(s.sourceSteps,original);
 const retry=remainingSteps(s);retry[0].restAfter=999;assert.deepEqual(s.sourceSteps,original);
});

test('serialized retry queues restore original step IDs rather than reindexing the shortened queue',()=>{
 const s=session();markStepComplete(s,0);markStepComplete(s,2);
 s.steps=remainingSteps(s);s.index=0;s.phase='work';
 const restored=normalizeProgress(JSON.parse(JSON.stringify(s)));
 assert.deepEqual(restored.sourceSteps.map(x=>x.stepId),[0,1,2,3]);
 assert.deepEqual(remainingSteps(restored).map(x=>x.stepId),[1,3]);
 assert.equal(markStepComplete(restored,restored.steps[0]),true);
 assert.deepEqual(remainingSteps(restored).map(x=>x.stepId),[3]);
 assert.equal(markStepComplete(restored,restored.steps[1]),true);
 assert.equal(allStepsComplete(restored),true);
 assert.deepEqual(remainingSteps(restored),[]);
});

test('legacy work/rest/stopped/feedback sessions import only their completed prefix',()=>{
 for(const [phase,index,confirmed,want]of [['work',1,1,[0]],['work',3,0,[]],['rest',1,1,[0,1]],['rest',0,0,[0]],['stopped',2,2,[0,1]],['feedback',3,3,[0,1,2,3]],['done',3,4,[0,1,2,3]]]){
  const s={plan,steps:structuredClone(steps),phase,index,confirmed};
  assert.equal(normalizeProgress(s),s);
  assert.deepEqual(s.completedStepIds,want,phase+' index '+index);
  normalizeProgress(s);assert.deepEqual(s.completedStepIds,want,'normalization is idempotent');
 }
});

test('explicit ledger is authoritative over feedback, stale confirmed counts and malformed IDs',()=>{
 const s={...session(),phase:'feedback',confirmed:500,completedStepIds:[2,2,-1,4,1.2,'1',null,NaN,0]};
 normalizeProgress(s);assert.deepEqual(s.completedStepIds,[0,2]);assert.equal(allStepsComplete(s),false);
 assert.equal(markStepComplete(s,{stepId:99,exerciseIndex:0,set:1}),false);
 assert.equal(markStepComplete(s,{stepId:1,exerciseIndex:1,set:2}),false);
 assert.equal(markStepComplete(s,{exerciseIndex:99,set:1}),false);
 assert.equal(markStepComplete(s,null),false);
});

test('interleaved Sunday circuit preserves original order and rounds through skipping/retry',()=>{
 const circuitPlan={kind:'preset',exercises:[{id:'kb-row'},{id:'pushup'},{id:'squat'}]};
 const circuit=[{exerciseIndex:0,set:1,round:1,restAfter:60},{exerciseIndex:1,set:1,round:1,restAfter:60},{exerciseIndex:2,set:1,round:1,restAfter:30},{exerciseIndex:0,set:2,round:2,restAfter:60},{exerciseIndex:1,set:2,round:2,restAfter:60},{exerciseIndex:2,set:2,round:2,restAfter:0}];
 const s={plan:circuitPlan,steps:circuit,...createProgress(circuitPlan,circuit)};
 markStepComplete(s,1);markStepComplete(s,4);
 assert.deepEqual(remainingSteps(s).map(x=>[x.stepId,x.exerciseIndex,x.set,x.round,x.restAfter]),[[0,0,1,1,60],[2,2,1,1,60],[3,0,2,2,60],[5,2,2,2,0]]);
 assert.deepEqual(remainingSteps(s,0).map(x=>[x.stepId,x.restAfter]),[[0,30],[3,0]]);
 assert.deepEqual(exerciseProgress(s).map(x=>x.completed),[0,2,0]);
});

test('reopening one exercise removes only its credits and completion remains idempotent',()=>{
 const s=session();for(const step of s.sourceSteps)markStepComplete(s,step);
 assert.equal(allStepsComplete(s),true);
 assert.equal(reopenExercise(s,0),s);assert.deepEqual(s.completedStepIds,[2,3]);
 assert.deepEqual(remainingSteps(s).map(x=>x.stepId),[0,1]);
 reopenExercise(s,99);assert.deepEqual(s.completedStepIds,[2,3]);
 for(const step of remainingSteps(s))markStepComplete(s,step);
 assert.equal(allStepsComplete(s),true);assert.equal(s.completedStepIds.length,4);
});

test('nonpreset routines retain their configured rest and empty plans never earn completion',()=>{
 const p={kind:'custom',exercises:[{rest:45},{rest:75}]};
 const s={plan:p,steps,...createProgress(p,steps)};
 assert.deepEqual(remainingSteps(s).map(x=>x.restAfter),[45,45,75,0]);
 const empty={plan:{exercises:[]},steps:[],...createProgress({exercises:[]},[])};
 assert.equal(allStepsComplete(empty),false);assert.deepEqual(exerciseProgress(empty),[]);assert.deepEqual(remainingSteps(empty),[]);
});
