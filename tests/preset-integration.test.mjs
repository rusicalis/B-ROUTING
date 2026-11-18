import test from 'node:test';
import assert from 'node:assert/strict';
import {EXERCISES,migrateWorkout} from '../workout-engine.mjs';
test('new requested movements have accurate equipment and timed doses',()=>{
 for(const id of ['kb-lying-triceps','chair-dip','kb-shoulder-press','band-lateral-raise','abs-crunch','bridge-hold','reverse-plank'])assert.ok(EXERCISES.find(e=>e.id===id),id);
 assert.equal(EXERCISES.find(e=>e.id==='chair-dip').equipment,'chair');
 assert.equal(EXERCISES.find(e=>e.id==='kb-shoulder-press').eachSide,true);
 assert.equal(EXERCISES.find(e=>e.id==='reverse-plank').holdSeconds,30);
});
test('schema4 migrates old weekly config without losing records and defaults to reverse plank fit30',()=>{
 const s={workoutConfig:{schema:3,mode:'weekly',planDay:4},tasks:[{id:'x'}],history:[{type:'task'}],trainingTracks:{old:{level:3}}};migrateWorkout(s);
 assert.equal(s.workoutConfig.mode,'preset');assert.equal(s.workoutConfig.schema,5);assert.equal(s.workoutConfig.bridgeVariant,'reverse');assert.equal(s.workoutConfig.targetMinutes,30);assert.equal(s.workoutConfig.doseMode,'fit');assert.equal(s.history.length,1);assert.equal(s.trainingTracks.old.level,3);
 s.workoutConfig.mode='auto';migrateWorkout(s);assert.equal(s.workoutConfig.mode,'auto');
});
