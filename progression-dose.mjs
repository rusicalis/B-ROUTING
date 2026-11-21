// Pure dose guard. Core/order/types/sets/circuit structure are never rewritten.
import {buildDurationSteps,estimateDurationSeconds} from './duration-fit.mjs';
const precision=value=>Math.round(value*1e6)/1e6;
const perSetWork=exercise=>(exercise.holdSeconds||exercise.workSeconds||(exercise.reps||0)*(exercise.cycleSeconds||4))*(exercise.eachSide?2:1);

/** Actual work only: circuit occurrences and both sides, excluding every rest. */
export function workSeconds(plan){
 return precision(buildDurationSteps(plan).reduce((total,step)=>total+perSetWork(plan.exercises[step.exerciseIndex]),0));
}

/**
 * Clone a plan and cap work at105% of the previous completed-level plan.
 * Reduce newly introduced supplements first, then larger/last supplements.
 * Only reps/holdSeconds/workSeconds may fall; reps stay>=1, timed work>=5s
 * (an input dose already below a minimum is preserved rather than increased).
 * If protected work plus minimum supplement doses cannot fit, preserve them and
 * report progressionOverflow. A new challenging type may legitimately lower
 * total work; this helper never invents work, tempo, rest, or removed exercises.
 */
export function limitWorkIncrease(plan,previous,protectedCount=plan.coreCount||0){
 const result=structuredClone(plan),limit=precision(workSeconds(previous)*1.05);
 const count=Number.isFinite(Number(protectedCount))?Math.max(0,Math.min(result.exercises.length,Math.floor(Number(protectedCount)))):0;
 const occurrences=new Map();
 for(const step of buildDurationSteps(result))occurrences.set(step.exerciseIndex,(occurrences.get(step.exerciseIndex)||0)+1);
 const previousIds=new Set((previous.exercises||[]).map(exercise=>exercise.id));
 const candidates=result.exercises.map((exercise,index)=>({index,isNew:!previousIds.has(exercise.id),work:perSetWork(exercise)*(occurrences.get(index)||0)})).filter(row=>row.index>=count);
 candidates.sort((a,b)=>Number(b.isNew)-Number(a.isNew)||b.work-a.work||b.index-a.index);
 let actual=workSeconds(result);
 for(const candidate of candidates){
  if(actual<=limit+1e-6)break;
  const exercise=result.exercises[candidate.index],field=exercise.holdSeconds?'holdSeconds':exercise.workSeconds?'workSeconds':'reps';
  const before=Number(exercise[field]),minimum=Math.min(before,field==='reps'?1:5);
  const unit=(occurrences.get(candidate.index)||0)*(exercise.eachSide?2:1)*(field==='reps'?(exercise.cycleSeconds||4):1);
  if(!(before>minimum)||!(unit>0))continue;
  const excess=actual-limit;
  if(field==='reps')exercise[field]=Math.max(minimum,before-Math.ceil((excess-1e-9)/unit));
  else{
   // Round down the dose so serialization cannot accidentally put it over limit.
   exercise[field]=Math.max(minimum,Math.floor((before-excess/unit)*1e6)/1e6);
  }
  actual=workSeconds(result);
 }
 result.steps=buildDurationSteps(result);
 result.estimatedSeconds=estimateDurationSeconds(result);
 result.estimatedMinutes=Math.round(result.estimatedSeconds/6)/10;
 const targetMinutes=Number.isFinite(Number(result.targetMinutes))?Number(result.targetMinutes):30;
 result.remainingSeconds=Math.max(0,precision(targetMinutes*60-result.estimatedSeconds));
 result.overflowSeconds=Math.max(0,precision(result.estimatedSeconds-targetMinutes*60));
 result.overflow=result.overflowSeconds>0;
 result.progressionOverflow=actual>limit+1e-6;
 return result;
}
