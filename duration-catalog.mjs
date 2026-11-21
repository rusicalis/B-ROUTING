import {limitWorkIncrease} from './progression-dose.mjs';
import {EXERCISES,createPlan} from './workout-engine.mjs';
import {rankExercises,exerciseProfile} from './exercise-policy.mjs';
import {hasExercisePreview} from './exercise-media-data.mjs';
import {fitExerciseDuration,estimateDurationSeconds} from './duration-fit.mjs';
export function durationCandidates(base,targets,level=0){
 const ids=new Set(base.exercises.map(e=>e.id)),pool=EXERCISES.filter(e=>!ids.has(e.id)&&hasExercisePreview(e.id)&&e.kind!=='cardio'&&['bodyweight','kettlebell'].includes(e.equipment)&&targets.some(g=>e.groups.includes(g)));
 return rankExercises(pool,targets,level);
}
export function createDurationPlan(base,targets,minutes,level=0){const plan=fitExerciseDuration(base,durationCandidates(base,targets,level),minutes,level);plan.coreCount=base.exercises.length;plan.trainingStage=level<4?'기본':level<8?'발전':'도전';plan.successfulDays=level;plan.challengeCount=plan.exercises.filter(e=>exerciseProfile(e).difficulty>=3).length;return plan}

export function createFreeDurationPlan(config={},level=0){
 const safeLevel=Math.max(0,Math.min(12,Math.floor(Number(level)||0))),base=createPlan({...config,level:0});base.kind='preset';base.exercises.forEach(e=>e.rest=30);const targets=base.regions.includes('full')?['chest','shoulders','biceps','triceps','back','lowerback','legs']:base.regions;
 const plan=createDurationPlan(base,config.mode==='custom'?[]:targets,config.targetMinutes||30,safeLevel);plan.level=safeLevel;
 const timed=plan.exercises.find(e=>e.holdSeconds||e.workSeconds);
 if(timed){const field=timed.holdSeconds?'holdSeconds':'workSeconds';timed[field]+=safeLevel*.1}else if(plan.exercises[0]){const e=plan.exercises[0];e.cycleSeconds=Math.round(e.cycleSeconds*(1+safeLevel*.01)*1000)/1000}
 plan.estimatedSeconds=estimateDurationSeconds(plan);plan.estimatedMinutes=Math.round(plan.estimatedSeconds/6)/10;plan.overflowSeconds=Math.max(0,plan.estimatedSeconds-plan.targetMinutes*60);plan.overflow=plan.overflowSeconds>0;return safeLevel>0?limitWorkIncrease(plan,createFreeDurationPlan(config,safeLevel-1),plan.coreCount):plan;
}
