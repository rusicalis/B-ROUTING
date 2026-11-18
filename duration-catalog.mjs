import {EXERCISES,createPlan} from './workout-engine.mjs';
import {EXTRA_EXERCISES} from './extra-exercises.mjs';
import {hasExercisePreview} from './exercise-media-data.mjs';
import {fitExerciseDuration,estimateDurationSeconds} from './duration-fit.mjs';
const novel=new Set(EXTRA_EXERCISES.map(e=>e.id));
export function durationCandidates(base,targets){
 const ids=new Set(base.exercises.map(e=>e.id)),pool=EXERCISES.filter(e=>!ids.has(e.id)&&hasExercisePreview(e.id)&&!e.advanced&&e.kind!=='cardio'&&['bodyweight','kettlebell'].includes(e.equipment)&&targets.some(g=>e.groups.includes(g)));
 const ordered=[];for(const fresh of [true,false]){const candidates=pool.filter(e=>novel.has(e.id)===fresh),groups=targets.map(g=>candidates.filter(e=>e.groups.includes(g)));for(let row=0;row<candidates.length;row++)for(const group of groups){const e=group[row];if(e&&!ordered.some(x=>x.id===e.id))ordered.push(e)}}return ordered;
}
export function createDurationPlan(base,targets,minutes,level=0){return fitExerciseDuration(base,durationCandidates(base,targets),minutes,level)}

export function createFreeDurationPlan(config={},level=0){
 const safeLevel=Math.max(0,Math.min(12,Math.floor(Number(level)||0))),base=createPlan({...config,level:0});base.kind='preset';base.exercises.forEach(e=>e.rest=30);const targets=base.regions.includes('full')?['chest','shoulders','biceps','triceps','back','lowerback','legs']:base.regions;
 const plan=createDurationPlan(base,config.mode==='custom'?[]:targets,config.targetMinutes||30);plan.level=safeLevel;
 const timed=plan.exercises.find(e=>e.holdSeconds||e.workSeconds);
 if(timed){const field=timed.holdSeconds?'holdSeconds':'workSeconds';timed[field]+=safeLevel*.1}else if(plan.exercises[0]){const e=plan.exercises[0];e.cycleSeconds=Math.round(e.cycleSeconds*(1+safeLevel*.01)*1000)/1000}
 plan.estimatedSeconds=estimateDurationSeconds(plan);plan.estimatedMinutes=Math.round(plan.estimatedSeconds/6)/10;plan.overflowSeconds=Math.max(0,plan.estimatedSeconds-plan.targetMinutes*60);plan.overflow=plan.overflowSeconds>0;return plan;
}
