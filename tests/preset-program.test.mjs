import test from 'node:test';
import assert from 'node:assert/strict';
import {hasExercisePreview} from '../exercise-media-data.mjs';
import {EXERCISES} from '../workout-engine.mjs';
import {PRESET_SCHEDULE,createPresetPlan,buildPresetSteps,estimatePresetSeconds,presetTrackKey,normalizeSavedPreset} from '../preset-program.mjs';

// Catch schedule swaps, regrouped circuits, invented timing, shrinking doses and unsafe snapshots.
test('weekly preset keeps supplied families, movement order and bridge choice',()=>{
 assert.equal(PRESET_SCHEDULE.length,7);
 const ids=day=>createPresetPlan(day,0).exercises.map(e=>e.id);
 assert.deepEqual(ids(1).slice(0,5),['pushup','pike-pushup','bodyweight-triceps','chair-dip','reverse-plank']);
 assert.deepEqual(ids(4),ids(1));
 assert.deepEqual(ids(2).slice(0,5),['kb-concentration-curl','kb-shoulder-press','kb-deadlift','abs-crunch','prone-y']);
 assert.deepEqual(ids(3).slice(0,3),['kb-row','squat','reverse-plank']);
 assert.equal(createPresetPlan(1,0,{bridgeVariant:'glute'}).exercises[4].id,'bridge-hold');
});

test('goal mode retains literal high-volume goals and exposes overflow',()=>{
 const p=createPresetPlan(1,0,{doseMode:'goal'}),byId=id=>p.exercises.find(e=>e.id===id);
 assert.ok(byId('pushup').sets*byId('pushup').reps>=100);
 assert.equal(byId('kb-lying-triceps').sets,10);
 assert.equal(byId('chair-dip').sets,10);
 assert.equal(byId('reverse-plank').sets,5);assert.equal(byId('reverse-plank').holdSeconds,60);
 assert.ok(p.estimatedSeconds>1800);assert.ok(p.overflowSeconds>0);
 assert.ok(p.originalGoals);assert.equal(p.mainOnly,true);assert.equal(p.kind,'preset');
});

test('Sunday executes four ordered rounds and holds within the revised 30–40 minute goal',()=>{
 const p=createPresetPlan(7,0,{doseMode:'goal'}),steps=buildPresetSteps(p);
 assert.equal(p.blocks[0].rounds,4);
 assert.deepEqual(steps.slice(0,6).map(s=>[s.exerciseIndex,s.set,s.round,s.restAfter]),[
 [0,1,1,60],[1,1,1,60],[2,1,1,60],[0,2,2,60],[1,2,2,60],[2,2,2,60]]);
 assert.equal(steps[11].restAfter,60);assert.equal(steps[12].exerciseIndex,3);
 assert.equal(steps.at(-1).restAfter,0);
 assert.equal(estimatePresetSeconds(p),2180);
 assert.equal(p.estimatedSeconds,2180);
});

test('timing counts unilateral work, real set rests and transitions without padding',()=>{
 const p={exercises:[{id:'kb-row',sets:2,reps:5,cycleSeconds:4,eachSide:true},{id:'squat',sets:1,reps:5,cycleSeconds:4}]};
 assert.deepEqual(buildPresetSteps(p).map(s=>s.restAfter),[30,60,0]);
 assert.equal(estimatePresetSeconds(p),190);
});

test('duration changes never remove core moves, sets or work across all levels',()=>{
 for(const day of [1,2,3,7])for(const level of [0,6,12]){
 let previous;
 for(let minutes=10;minutes<=90;minutes++){
  const p=createPresetPlan(day,level,{targetMinutes:minutes});
  assert.equal(p.targetMinutes,day===7?Math.max(30,Math.min(40,minutes)):minutes);assert.equal(p.steps.at(-1).restAfter,0);
  assert.equal(p.estimatedSeconds,estimatePresetSeconds(p));
  assert.ok(p.estimatedSeconds<=p.targetMinutes*60,`day ${day}, level ${level}, minutes ${minutes}`);
  for(const e of p.exercises){assert.ok(EXERCISES.some(x=>x.id===e.id));if(e.equipment==='kettlebell')assert.equal(e.weight,12)}
  if(previous)for(let i=0;i<previous.exercises.length;i++){
   const before=previous.exercises[i],after=p.exercises[i];
   assert.equal(after.id,before.id);assert.ok(after.sets>=before.sets);assert.ok(after.reps>=before.reps);
   if(before.holdSeconds)assert.ok(after.holdSeconds>=before.holdSeconds);
   if(before.workSeconds)assert.ok(after.workSeconds>=before.workSeconds);
  }
  previous=p;
 }
 }
});

test('fit starts modestly and completion levels add at most five percent of work',()=>{
 const work=p=>p.exercises.reduce((sum,e)=>sum+e.sets*(e.holdSeconds||e.workSeconds||e.reps*e.cycleSeconds)*(e.eachSide?2:1),0);
 for(const day of [1,2,3,7]){
 let p=createPresetPlan(day,0);
 assert.ok(p.exercises.every(e=>e.sets<=5));
 assert.ok(p.exercises.filter(e=>!e.holdSeconds&&!e.workSeconds).every(e=>e.reps<=12));
 for(let level=1;level<=12;level++){
  const next=createPresetPlan(day,level);assert.ok(work(next)>work(p));assert.ok(work(next)<=work(p)*1.05);
  p=next;
 }
 }
});

test('tracks share family progress but separate modes, bridge variants and saved presets',()=>{
 assert.equal(presetTrackKey(1),presetTrackKey(4));assert.equal(presetTrackKey(2),presetTrackKey(5));assert.equal(presetTrackKey(3),presetTrackKey(6));
 assert.notEqual(presetTrackKey(1),presetTrackKey(2));assert.notEqual(presetTrackKey(1),presetTrackKey(7));
 assert.equal(presetTrackKey(1,{targetMinutes:10}),presetTrackKey(1,{targetMinutes:90}));
 assert.notEqual(presetTrackKey(1),presetTrackKey(1,{doseMode:'goal'}));
 assert.notEqual(presetTrackKey(1),presetTrackKey(1,{bridgeVariant:'glute'}));
 assert.notEqual(presetTrackKey(1),presetTrackKey(1,{savedPreset:{id:'mine'}}));
});

test('saved snapshot validates, clones and restores edited doses without metadata spoofing',()=>{
 const input={id:'mine',name:'My plan',exercises:[{id:'kb-row',sets:2,reps:5,eachSide:true,cycleSeconds:4}]};
 const result=normalizeSavedPreset(input);assert.equal(result.ok,true);assert.notEqual(result.preset,input);
 result.preset.exercises[0].reps=8;assert.equal(input.exercises[0].reps,5);
 const p=createPresetPlan(1,0,{savedPreset:input});assert.equal(p.title,'My plan');assert.equal(p.exercises[0].reps,5);assert.equal(p.exercises[0].weight,12);assert.equal(p.exercises[0].eachSide,true);
 for(const patch of [{id:'made-up'},{sets:0},{sets:2.3},{reps:-1},{reps:NaN},{eachSide:false},{weight:2},{equipment:'bodyweight'},{cycleSeconds:0},{holdSeconds:Infinity}]){
  const bad={...input,exercises:[{...input.exercises[0],...patch}]};assert.equal(normalizeSavedPreset(bad).ok,false,JSON.stringify(patch));
 }
 assert.equal(normalizeSavedPreset({...input,blocks:[{kind:'circuit',exerciseIndices:[2],rounds:3}]}).ok,false);
});

test('longer targets add useful work beyond the thirty-minute starter dose',()=>{
 for(const day of [1,2,3,7]){
  const starter=createPresetPlan(day,0),longer=createPresetPlan(day,0,{targetMinutes:45});
  assert.ok(starter.estimatedSeconds>=24*60,`starter day ${day}: ${starter.estimatedSeconds}`);
  assert.ok(longer.estimatedSeconds>starter.estimatedSeconds,`longer day ${day}`);
 }
});

test('saved fit duration adapts monotonically around its edited base while goal stays exact',()=>{
 const saved={id:'edited',name:'Edited',baseTargetMinutes:30,exercises:[{id:'pushup',sets:3,reps:8,cycleSeconds:4},{id:'reverse-plank',sets:3,reps:0,holdSeconds:30}]};
 const base=createPresetPlan(1,0,{savedPreset:saved});
 assert.deepEqual(base.exercises.map(e=>[e.sets,e.reps,e.holdSeconds]),[[3,8,undefined],[3,0,30]]);
 const short=createPresetPlan(1,0,{savedPreset:saved,targetMinutes:10}),long=createPresetPlan(1,0,{savedPreset:saved,targetMinutes:45});
 assert.ok(short.estimatedSeconds<base.estimatedSeconds);assert.ok(long.estimatedSeconds>base.estimatedSeconds);
 let previous;
 for(let targetMinutes=10;targetMinutes<=90;targetMinutes++){
  const p=createPresetPlan(1,0,{savedPreset:saved,targetMinutes});
  if(previous)for(let i=0;i<p.exercises.length;i++){
   assert.ok(p.exercises[i].sets>=previous.exercises[i].sets);assert.ok(p.exercises[i].reps>=previous.exercises[i].reps);
   if(p.exercises[i].holdSeconds)assert.ok(p.exercises[i].holdSeconds>=previous.exercises[i].holdSeconds);
  }
  previous=p;
 }
 assert.deepEqual(createPresetPlan(1,0,{savedPreset:saved,doseMode:'goal',targetMinutes:10}).exercises.map(e=>[e.sets,e.reps,e.holdSeconds]),[[3,8,undefined],[3,0,30]]);
 assert.equal(normalizeSavedPreset(saved).preset.baseTargetMinutes,30);
 assert.equal(normalizeSavedPreset({...saved,baseTargetMinutes:0}).ok,false);
});

test('saved completion growth stays gentle even for a single low-dose movement',()=>{
 const saved={id:'tiny',name:'Tiny',exercises:[{id:'kb-row',sets:1,reps:2,cycleSeconds:4}]};
 const work=p=>p.exercises.reduce((n,e)=>n+e.sets*(e.holdSeconds||e.workSeconds||e.reps*e.cycleSeconds)*(e.eachSide?2:1),0);
 let previous=createPresetPlan(1,0,{savedPreset:saved});
 for(let level=1;level<=12;level++){
  const p=createPresetPlan(1,level,{savedPreset:saved});assert.ok(work(p)>work(previous));assert.ok(work(p)<=work(previous)*1.05);previous=p;
 }
});

test('all default fit exercises have exact equipment diagrams and Sunday uses35min default',()=>{for(let d=1;d<=7;d++)for(let level=0;level<=12;level++){const p=createPresetPlan(d,level);assert.ok(p.exercises.every(e=>hasExercisePreview(e.id)));if(d===7){assert.equal(p.targetMinutes,35);assert.ok(p.estimatedSeconds>=1800&&p.estimatedSeconds<=2400)}}});
