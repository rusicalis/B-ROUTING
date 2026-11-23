import {normalizeProgress,remainingSteps,exerciseProgress} from './session-progress.mjs';
import {scaleExerciseDose} from './intensity-policy.mjs';
import {stepDose,rebuildLiveQueue,queueRests,circuitIndices,normalSessionPlan,reconcileSessionPlan} from './session-plan.mjs';

export {stepDose,rebuildLiveQueue};
const copy=value=>structuredClone(value);
const normalized=session=>normalizeProgress(copy(session));

export function incompleteExerciseIndices(session){
 return exerciseProgress(normalized(session)).filter(row=>row.remaining>0).map(row=>row.exerciseIndex);
}

/** Nonwrapping arrows follow plan order, including earlier skipped exercises. */
export function adjacentIncompleteExercise(session,currentIndex,delta){
 const available=incompleteExerciseIndices(session);
 if(delta<0)return available.filter(index=>index<currentIndex).at(-1)??null;
 if(delta>0)return available.find(index=>index>currentIndex)??null;
 return null;
}

/** Rotate the full remaining ledger; reaching its end returns to missed work. */
export function queueFromExercise(session,index){
 const s=normalized(session),queue=remainingSteps(s),position=queue.findIndex(step=>step.exerciseIndex===index);
 return queueRests(s,position>0?[...queue.slice(position),...queue.slice(0,position)]:queue);
}

/** Apply the same absolute dose policy used before starting a workout. */
export function applyLiveIntensity(session,intensity){
 if(!['normal','hard','extreme'].includes(intensity))throw new RangeError('Unknown live intensity: '+intensity);
 return reconcileSessionPlan(session,normalSessionPlan(session),intensity);
}

/** Add one circuit round; its last movement always has the 30 second boundary. */
export function appendCircuitRound(session){
 const s=normalized(session),indices=circuitIndices(s.plan);
 if(!indices.length)return s;
 const base=normalSessionPlan(s),intensity=s.intensity??s.plan.intensity??'normal';
 s.intensityBasePlan=copy(base);
 let nextId=Math.max(s.nextStepId??0,...s.sourceSteps.map(step=>step.stepId+1));
 const round=Math.max(0,...s.sourceSteps.filter(step=>indices.includes(step.exerciseIndex)).map(step=>step.round??step.set??0))+1;
 const added=indices.map((exerciseIndex,index)=>({exerciseIndex,set:round,round,stepId:nextId++,restAfter:index===indices.length-1?30:0,dose:scaleExerciseDose(base.exercises[exerciseIndex],intensity)}));
 s.nextStepId=nextId;s.sourceSteps.push(...added);
 for(const index of indices)s.plan.exercises[index].sets=s.sourceSteps.filter(step=>step.exerciseIndex===index).length;
 const block=s.plan.blocks?.find(row=>row.kind==='circuit');if(block)block.rounds=round;
 s.plan.steps=copy(s.sourceSteps);
 s.steps=[...(s.steps??[]),...copy(added)];
 return s;
}
