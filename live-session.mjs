import {normalizeProgress,remainingSteps,exerciseProgress} from './session-progress.mjs';
import {scaleExerciseDose} from './compact-program.mjs';

// Every public helper is pure. Store the returned session when changing intensity
// or appending a round; navigation returns fresh arrays and never credits work.
const copy=value=>structuredClone(value);
const normalized=session=>normalizeProgress(copy(session));
const levelOf=intensity=>({normal:0,hard:1,extreme:2})[intensity];
const infinite=plan=>!!(plan.infinite||plan.infiniteCircuit);
const circuitIndices=plan=>plan.blocks?.find(block=>block.kind==='circuit')?.exerciseIndices??plan.exercises.slice(0,3).map((_,index)=>index);

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

function rests(session,queue){
 const circuit=infinite(session.plan)?circuitIndices(session.plan):null;
 return queue.map((step,index)=>{
  const next=queue[index+1],exercise=session.plan?.exercises?.[step.exerciseIndex];
  let restAfter=0;
  if(circuit?.includes(step.exerciseIndex))restAfter=step.exerciseIndex===circuit.at(-1)?30:0;
  else if(next){
   if(session.plan?.kind==='preset')restAfter=step.exerciseIndex===next.exerciseIndex?30:60;
   else restAfter=exercise?.rest??step.restAfter??60;
  }
  return {...step,restAfter};
 });
}

/** Rotate the full remaining ledger; reaching its end returns to missed work. */
export function queueFromExercise(session,index){
 const s=normalized(session),queue=remainingSteps(s),position=queue.findIndex(step=>step.exerciseIndex===index);
 return rests(s,position>0?[...queue.slice(position),...queue.slice(0,position)]:queue);
}

/** Resolve dose by stable ID, so stale queue objects still get the saved dose. */
export function stepDose(session,step=session.steps?.[session.index]){
 const source=Number.isInteger(step?.stepId)?session.sourceSteps?.find(row=>row.stepId===step.stepId):null;
 return copy(source?.dose??step?.dose??session.plan?.exercises?.[step?.exerciseIndex]??{});
}

function rememberBaseline(session){
 if(!session.intensityBasePlan){
  session.intensityBasePlan=copy(session.plan);
  if(Array.isArray(session.plan.baseExercises))session.intensityBasePlan.exercises=copy(session.plan.baseExercises);
 }
 if(!session.intensityBaseSteps)session.intensityBaseSteps=copy(session.sourceSteps);
}

function nextId(session){
 const id=Math.max(session.nextStepId??0,...session.sourceSteps.map(step=>step.stepId+1));
 session.nextStepId=id+1;
 return id;
}

// Preserve the already traversed queue and its current slot. The future queue
// includes every remaining ledger row, including work skipped before this slot.
function updateQueue(session,current){
 if(!current){session.steps=rests(session,remainingSteps(session));return}
 const sourceCurrent=session.sourceSteps.find(step=>step.stepId===current.stepId);
 const sourcePosition=session.sourceSteps.findIndex(step=>step.stepId===current.stepId);
 const remaining=remainingSteps(session).filter(step=>step.stepId!==current.stepId);
 const start=remaining.findIndex(step=>session.sourceSteps.findIndex(row=>row.stepId===step.stepId)>sourcePosition);
 const future=start>0?[...remaining.slice(start),...remaining.slice(0,start)]:remaining;
 const prefix=session.steps.slice(0,session.index).map(step=>({...step,dose:stepDose(session,step)}));
 session.steps=[...prefix,{...current,...sourceCurrent},...rests(session,future)];
 // Recompute the current rest boundary, while leaving an ongoing rest timer exact.
 const boundary=rests(session,[session.steps[session.index],...future])[0];
 session.steps[session.index].restAfter=boundary.restAfter;
}

/**
 * Absolute session intensity: normal uses the first saved baseline; hard adds
 * one optional set and 15% dose; extreme adds two and 30%. Infinite circuits
 * change only future doses and append rounds explicitly. Completed doses and
 * the in-flight dose never change. Only unstarted optional sets may be removed.
 * Use stepDose() for the current timer/render: plan.exercises describes future
 * targets, while individual source/queue rows retain their own historical dose.
 */
export function applyLiveIntensity(session,intensity){
 const level=levelOf(intensity);
 if(level===undefined)throw new RangeError('Unknown live intensity: '+intensity);
 const s=normalized(session),current=s.steps?.[s.index];
 rememberBaseline(s);
 const complete=new Set(s.completedStepIds),unfinished=new Set(incompleteExerciseIndices(s));
 // Snapshot before plan targets change, including stale legacy queues without IDs.
 for(const step of s.sourceSteps)if(!step.dose)step.dose=stepDose(s,step);
 for(let index=0;index<s.plan.exercises.length;index++){
  if(!unfinished.has(index)&&!infinite(s.plan))continue;
  const base=s.intensityBasePlan.exercises[index],target=scaleExerciseDose(base,intensity);
  const original=s.intensityBaseSteps.filter(step=>step.exerciseIndex===index);
  const required=infinite(s.plan)?s.sourceSteps.filter(step=>step.exerciseIndex===index).length:Math.max(original.length,Number(base.sets)||0)+level;
  const existing=s.sourceSteps.filter(step=>step.exerciseIndex===index);
  const removable=existing.filter(step=>step.intensityOptional&&!complete.has(step.stepId)&&step.stepId!==current?.stepId).reverse();
  const remove=new Set(removable.slice(0,Math.max(0,existing.length-required)).map(step=>step.stepId));
  s.sourceSteps=s.sourceSteps.filter(step=>!remove.has(step.stepId));
  let rows=s.sourceSteps.filter(step=>step.exerciseIndex===index);
  while(rows.length<required){
   const set=Math.max(0,...rows.map(step=>step.set??0))+1;
   const step={exerciseIndex:index,set,stepId:nextId(s),restAfter:30,intensityOptional:true,dose:copy(target)};
   if(rows.some(row=>row.round!==undefined))step.round=set;
   const position=s.sourceSteps.findLastIndex(row=>row.exerciseIndex===index)+1;
   s.sourceSteps.splice(position,0,step);rows.push(step);
  }
  for(const step of rows)if(!complete.has(step.stepId)&&step.stepId!==current?.stepId)step.dose=copy(target);
  s.plan.exercises[index]={...target,sets:rows.length};
 }
 for(const block of s.plan.blocks??[]){
  if(block.kind!=='circuit')continue;
  const rows=s.sourceSteps.filter(step=>block.exerciseIndices.includes(step.exerciseIndex));
  rows.sort((a,b)=>(a.round??a.set)-(b.round??b.set)||block.exerciseIndices.indexOf(a.exerciseIndex)-block.exerciseIndices.indexOf(b.exerciseIndex));
  let position=0;
  s.sourceSteps=s.sourceSteps.map(step=>block.exerciseIndices.includes(step.exerciseIndex)?rows[position++]:step);
  block.rounds=Math.max(0,...rows.map(step=>step.round??step.set));
 }
 s.intensity=intensity;
 s.plan.intensity=intensity;
 s.plan.steps=copy(s.sourceSteps);
 updateQueue(s,current);
 return s;
}

/** Add one circuit round; its last movement always has the 30 second boundary. */
export function appendCircuitRound(session){
 const s=normalized(session),indices=circuitIndices(s.plan);
 if(!indices.length)return s;
 rememberBaseline(s);
 const intensity=s.intensity??s.plan.intensity??'normal';
 const round=Math.max(0,...s.sourceSteps.filter(step=>indices.includes(step.exerciseIndex)).map(step=>step.round??step.set??0))+1;
 const added=indices.map((exerciseIndex,index)=>({exerciseIndex,set:round,round,stepId:nextId(s),restAfter:index===indices.length-1?30:0,dose:scaleExerciseDose(s.intensityBasePlan.exercises[exerciseIndex],intensity)}));
 s.sourceSteps.push(...added);
 for(const index of indices)s.plan.exercises[index].sets=s.sourceSteps.filter(step=>step.exerciseIndex===index).length;
 const block=s.plan.blocks?.find(row=>row.kind==='circuit');if(block)block.rounds=round;
 s.plan.steps=copy(s.sourceSteps);
 s.steps=[...(s.steps??[]),...copy(added)];
 return s;
}
