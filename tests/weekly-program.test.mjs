import test from 'node:test';
import assert from 'node:assert/strict';
import {WEEKLY_SCHEDULE,PROGRAM_TARGETS,createWeeklyPlan,createCardioPlan,weeklyCoverage,estimateSeconds} from '../weekly-program.mjs';
test('seven-day cycle trains every requested region three times without consecutive direct days, including Sunday to Monday',()=>{
 assert.equal(WEEKLY_SCHEDULE.length,7);const count=weeklyCoverage();
 for(const part of PROGRAM_TARGETS){assert.ok(count[part.id]>=3,part.id);for(let i=0;i<7;i++)assert.equal(WEEKLY_SCHEDULE[i].targets.includes(part.id)&&WEEKLY_SCHEDULE[(i+1)%7].targets.includes(part.id),false,part.id+' adjacent '+i)}
});
test('all weekly main-only routines last 20–30 minutes at all progression levels',()=>{
 for(let day=1;day<=7;day++)for(let level=0;level<=12;level++){
  const p=createWeeklyPlan(day,level);assert.ok(p.exercises.length>=5);assert.ok(estimateSeconds(p.exercises)>=1200&&estimateSeconds(p.exercises)<=1800,day+' level '+level+' '+estimateSeconds(p.exercises));
  assert.ok(!p.exercises.some(e=>e.stage==='warmup'||e.stage==='cooldown'));assert.ok(p.exercises.every(e=>!e.jumping));
  for(const target of WEEKLY_SCHEDULE[day-1].targets)assert.ok(p.exercises.some(e=>e.groups.includes(target)),target+' missing '+day);
  for(const e of p.exercises){assert.ok(['bodyweight','kettlebell','band'].includes(e.equipment));if(e.equipment==='band'){assert.equal(e.bandType,'straight');assert.equal(e.bandLength,60);assert.equal(e.requiresAnchor,false)}}
 }
});
test('progressive weekly plans retain or increase total work while remaining within the time budget',()=>{
 for(let day=1;day<=7;day++){let work=0;for(let level=0;level<=12;level++){const p=createWeeklyPlan(day,level);const next=p.exercises.reduce((n,e)=>n+e.sets*(e.holdSeconds||e.workSeconds||e.reps*e.cycleSeconds)*(e.eachSide?2:1),0);assert.ok(next>=work,'work decreased '+day+' '+level);work=next}}
});
test('optional cardio is a separate no-jump bodyweight routine',()=>{
 const p=createCardioPlan(0);assert.equal(p.kind,'cardio');assert.ok(p.exercises.every(e=>e.equipment==='bodyweight'&&e.jumping===false&&e.workSeconds>0));assert.ok(estimateSeconds(p.exercises)>=600&&estimateSeconds(p.exercises)<=1800);
});
