// Pure per-set completion ledger. Spread createProgress() into a new session.
// normalizeProgress() mutates only sourceSteps/completedStepIds and returns that session.
// Navigation, queue changes, phase, index and confirmed are never completion credit.
const own=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
const integer=value=>Number.isInteger(value)&&value>=0;
const sameStep=(a,b)=>a?.exerciseIndex===b?.exerciseIndex&&a?.set===b?.set&&(a?.round??null)===(b?.round??null);

function sourceCopies(steps,preserveIds=false){
 const seen=new Set();
 return (Array.isArray(steps)?steps:[]).map((step,index)=>{
  let stepId=preserveIds&&integer(step?.stepId)&&!seen.has(step.stepId)?step.stepId:index;
  while(seen.has(stepId))stepId++;
  seen.add(stepId);
  return {...step,stepId};
 });
}

/** Fresh source steps receive zero-based stable IDs; caller input is never mutated. */
export function createProgress(plan,steps=plan?.steps||[]){
 return {sourceSteps:sourceCopies(steps),completedStepIds:[]};
}

function resolveStep(source,step){
 if(integer(step))return source.find(candidate=>candidate.stepId===step);
 if(!step||typeof step!=='object')return undefined;
 if(own(step,'stepId')){
  if(!integer(step.stepId))return undefined;
  const candidate=source.find(row=>row.stepId===step.stepId);
  if(!candidate)return undefined;
  if(['exerciseIndex','set','round'].some(field=>own(step,field)&&step[field]!==candidate[field]))return undefined;
  return candidate;
 }
 return source.find(candidate=>sameStep(candidate,step));
}

/**
 * Restore a serialized ledger, or migrate an old confirmed-prefix session.
 * An explicit completedStepIds field is authoritative, even if empty/malformed.
 * Legacy rest includes its current confirmed set; feedback/done includes the full
 * old execution queue. Existing retry queues are never used to reindex source IDs.
 * Other session fields, including confirmed/index/phase/steps, remain untouched.
 */
export function normalizeProgress(session){
 if(!session||typeof session!=='object')throw new TypeError('A session object is required.');
 const hasSource=Array.isArray(session.sourceSteps);
 const source=hasSource?session.sourceSteps:Array.isArray(session.plan?.steps)?session.plan.steps:session.steps;
 session.sourceSteps=sourceCopies(source,hasSource);
 let completed=[];
 if(own(session,'completedStepIds'))completed=Array.isArray(session.completedStepIds)?session.completedStepIds:[];
 else{
  const queue=Array.isArray(session.steps)?session.steps:session.sourceSteps;
  let count=integer(session.confirmed)?session.confirmed:0;
  if(session.phase==='rest'&&integer(session.index))count=Math.max(count,session.index+1);
  if(['feedback','done'].includes(session.phase))count=queue.length;
  completed=queue.slice(0,Math.min(count,queue.length)).map(step=>resolveStep(session.sourceSteps,step)?.stepId);
 }
 const valid=new Set(completed.filter(integer));
 // Source order is stable, naturally deduplicates, and excludes unknown IDs.
 session.completedStepIds=session.sourceSteps.filter(step=>valid.has(step.stepId)).map(step=>step.stepId);
 return session;
}

/** Accept a source/queue step or numeric stepId. Return true only for a new credit. */
export function markStepComplete(session,step){
 normalizeProgress(session);
 const resolved=resolveStep(session.sourceSteps,step);
 if(!resolved||session.completedStepIds.includes(resolved.stepId))return false;
 session.completedStepIds.push(resolved.stepId);
 // Keep serialization deterministic even when exercises were completed out of order.
 const complete=new Set(session.completedStepIds);
 session.completedStepIds=session.sourceSteps.filter(row=>complete.has(row.stepId)).map(row=>row.stepId);
 return true;
}

/** Fresh remaining queue in original source order, optionally for one exercise. */
export function remainingSteps(session,exerciseIndex=null){
 normalizeProgress(session);
 const complete=new Set(session.completedStepIds);
 const remaining=session.sourceSteps.filter(step=>!complete.has(step.stepId)&&(exerciseIndex===null||step.exerciseIndex===exerciseIndex));
 return remaining.map((step,index)=>{
  const next=remaining[index+1],exercise=session.plan?.exercises?.[step.exerciseIndex];
  let restAfter=0;
  if(next){
   if(session.plan?.kind==='preset')restAfter=step.exerciseIndex===next.exerciseIndex?30:60;
   else restAfter=Number.isFinite(exercise?.rest)&&exercise.rest>=0?exercise.rest:Number.isFinite(step.restAfter)&&step.restAfter>=0?step.restAfter:60;
  }
  return {...step,restAfter};
 });
}

/** Include every exercise in plan order, even an exercise with zero source steps. */
export function exerciseProgress(session){
 normalizeProgress(session);
 const complete=new Set(session.completedStepIds);
 const count=session.plan?.exercises?.length??(session.sourceSteps.length?Math.max(...session.sourceSteps.map(step=>step.exerciseIndex))+1:0);
 return Array.from({length:count},(_,exerciseIndex)=>{
  const steps=session.sourceSteps.filter(step=>step.exerciseIndex===exerciseIndex),completed=steps.filter(step=>complete.has(step.stepId)).length;
  return {exerciseIndex,completed,total:steps.length,remaining:steps.length-completed};
 });
}

/** Remove only this exercise's credits; keep its original steps and IDs. */
export function reopenExercise(session,exerciseIndex){
 normalizeProgress(session);
 const reopened=new Set(session.sourceSteps.filter(step=>step.exerciseIndex===exerciseIndex).map(step=>step.stepId));
 session.completedStepIds=session.completedStepIds.filter(stepId=>!reopened.has(stepId));
 return session;
}

/** Empty/malformed plans never earn whole-session completion. */
export function allStepsComplete(session){
 normalizeProgress(session);
 return session.sourceSteps.length>0&&session.completedStepIds.length===session.sourceSteps.length;
}
