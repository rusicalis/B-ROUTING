import test from 'node:test';
import assert from 'node:assert/strict';
import {workSeconds,limitWorkIncrease} from '../progression-dose.mjs';
import {estimateDurationSeconds} from '../duration-fit.mjs';
const previous={kind:'preset',targetMinutes:30,coreCount:1,exercises:[{id:'protected-hold',sets:2,reps:0,holdSeconds:300},{id:'existing-side-hold',sets:3,reps:0,holdSeconds:50.3,eachSide:true}]};

test('a901.8to979.8 second jump reduces the newly introduced supplement first to at most5percent',()=>{
 const raw={...structuredClone(previous),exercises:[...structuredClone(previous.exercises),{id:'new-controlled',sets:1,reps:13,cycleSeconds:6}]};
 assert.equal(workSeconds(previous),901.8);assert.equal(workSeconds(raw),979.8);
 const result=limitWorkIncrease(raw,previous);
 assert.ok(workSeconds(result)<=946.89);assert.ok(workSeconds(result)>901.8);
 assert.equal(result.exercises[2].reps,7);assert.deepEqual(result.exercises[1],previous.exercises[1]);
 assert.deepEqual(result.exercises.map(e=>e.id),raw.exercises.map(e=>e.id));assert.deepEqual(result.exercises.map(e=>e.sets),raw.exercises.map(e=>e.sets));
 assert.equal(result.progressionOverflow,false);assert.equal(result.estimatedSeconds,estimateDurationSeconds(result));
});

test('actual ordered circuit occurrences and both sides determine work and reductions',()=>{
 const old={kind:'preset',targetMinutes:30,exercises:[{id:'row',sets:2,reps:5,cycleSeconds:4,eachSide:true},{id:'pushup',sets:2,reps:5,cycleSeconds:4}],blocks:[{kind:'circuit',rounds:2,exerciseIndices:[0,1]}]};
 const raw=structuredClone(old);raw.exercises[1].reps=8;
 assert.equal(workSeconds(old),120);assert.equal(workSeconds(raw),144);
 const p=limitWorkIncrease(raw,old,1);
 assert.ok(workSeconds(p)<=126);assert.equal(p.exercises[1].reps,5);assert.deepEqual(p.exercises[0],old.exercises[0]);assert.deepEqual(p.blocks,old.blocks);
 assert.deepEqual(p.steps.map(s=>s.exerciseIndex),[0,1,0,1]);assert.equal(p.steps.at(-1).restAfter,0);
});

test('existing supplements use largest contribution then last index when no newID exists',()=>{
 const old={targetMinutes:30,exercises:[{id:'core',sets:1,reps:10,cycleSeconds:4},{id:'small',sets:1,reps:5,cycleSeconds:4},{id:'large',sets:3,reps:5,cycleSeconds:4}]};
 const raw=structuredClone(old);raw.exercises[1].reps=6;raw.exercises[2].reps=8;
 const p=limitWorkIncrease(raw,old,1);
 assert.equal(p.exercises[1].reps,6);assert.ok(p.exercises[2].reps<8);assert.ok(workSeconds(p)<=workSeconds(old)*1.05);
});

test('timed supplements can reduce precisely but never below five seconds',()=>{
 const old={targetMinutes:30,exercises:[{id:'core',sets:1,reps:10,cycleSeconds:4},{id:'timer',sets:2,reps:0,workSeconds:10,eachSide:true}]};
 const raw=structuredClone(old);raw.exercises[1].workSeconds=15;
 const p=limitWorkIncrease(raw,old,1);
 assert.equal(workSeconds(old),80);assert.equal(workSeconds(p),84);assert.equal(p.exercises[1].workSeconds,11);
 const impossible={targetMinutes:1,exercises:[{id:'huge-core',sets:1,reps:100,cycleSeconds:4},{id:'hold',sets:2,reps:0,holdSeconds:20}]};
 const capped=limitWorkIncrease(impossible,old,1);
 assert.equal(capped.exercises[0].reps,100);assert.equal(capped.exercises[1].holdSeconds,5);assert.equal(capped.progressionOverflow,true);assert.ok(capped.overflowSeconds>0);
});

test('already gentle plans are cloned without dose changes or hidden pacing',()=>{
 const old={targetMinutes:30,exercises:[{id:'core',sets:1,reps:10,cycleSeconds:4},{id:'hold',sets:2,reps:0,holdSeconds:20}]};
 const raw=structuredClone(old);raw.exercises[1].holdSeconds=21;
 const before=structuredClone(raw),p=limitWorkIncrease(raw,old,1);
 assert.deepEqual(p.exercises,raw.exercises);assert.notEqual(p.exercises,raw.exercises);assert.deepEqual(raw,before);assert.equal(p.progressionOverflow,false);
 assert.equal(p.remainingSeconds,1800-p.estimatedSeconds);assert.equal(p.overflow,false);
});

test('minimum repetitions remain one and protected core overflow is reported without rewriting blocks',()=>{
 const old={targetMinutes:1,exercises:[{id:'x',sets:1,reps:1,cycleSeconds:4}]};
 const raw={targetMinutes:1,coreCount:1,exercises:[{id:'core',sets:3,reps:20,cycleSeconds:4},{id:'supplement',sets:5,reps:8,cycleSeconds:4}],blocks:[{kind:'sets',exerciseIndices:[0,1]}]};
 const before=structuredClone(raw),p=limitWorkIncrease(raw,old);
 assert.deepEqual(p.exercises[0],before.exercises[0]);assert.deepEqual(p.blocks,before.blocks);assert.equal(p.exercises[1].reps,1);assert.equal(p.exercises[1].sets,5);assert.equal(p.progressionOverflow,true);assert.deepEqual(raw,before);
});
