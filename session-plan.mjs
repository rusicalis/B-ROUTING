import {normalizeProgress,remainingSteps} from './session-progress.mjs';
import {planIntensity,normalizeIntensity} from './intensity-policy.mjs';

const copy=value=>structuredClone(value);
export const infinitePlan=plan=>!!(plan.infinite||plan.infiniteCircuit);
export const circuitIndices=plan=>plan.blocks?.find(block=>block.kind==='circuit')?.exerciseIndices??plan.exercises.slice(0,3).map((_,index)=>index);
const seconds=e=>Math.max(0,(e.holdSeconds||e.workSeconds||(e.reps||0)*(e.cycleSeconds||4))*(e.eachSide?2:1));
const slots=exercises=>{const counts=new Map();return exercises.map((exercise,index)=>{const occurrence=counts.get(exercise.id)||0;counts.set(exercise.id,occurrence+1);return {key:exercise.id+':'+occurrence,exercise,index}})};

/** Resolve historical dose by stable ID, including stale navigation objects. */
export function stepDose(session,step=session.steps?.[session.index]){
 const source=Number.isInteger(step?.stepId)?session.sourceSteps?.find(row=>row.stepId===step.stepId):null;
 return copy(source?.dose??step?.dose??session.plan?.exercises?.[step?.exerciseIndex]??{});
}

export function queueRests(session,queue){
 const circuit=infinitePlan(session.plan)?circuitIndices(session.plan):null;
 return queue.map((step,index)=>{
  const next=queue[index+1],exercise=session.plan?.exercises?.[step.exerciseIndex];
  let restAfter=0;
  if(circuit?.includes(step.exerciseIndex))restAfter=step.exerciseIndex===circuit.at(-1)?30:0;
  else if(next)restAfter=session.plan?.kind==='preset'?(step.exerciseIndex===next.exerciseIndex?30:60):(exercise?.rest??step.restAfter??60);
  return {...step,restAfter};
 });
}

/** Keep the traversed queue and current slot, rotating missed work behind it. */
export function rebuildLiveQueue(session,current){
 if(!current){session.steps=queueRests(session,remainingSteps(session));return}
 const sourceCurrent=session.sourceSteps.find(step=>step.stepId===current.stepId);
 const sourcePosition=session.sourceSteps.findIndex(step=>step.stepId===current.stepId);
 const remaining=remainingSteps(session).filter(step=>step.stepId!==current.stepId);
 const start=remaining.findIndex(step=>session.sourceSteps.findIndex(row=>row.stepId===step.stepId)>sourcePosition);
 const future=start>0?[...remaining.slice(start),...remaining.slice(0,start)]:remaining;
 const prefix=session.steps.slice(0,session.index).map(step=>({...step,dose:stepDose(session,step)}));
 session.steps=[...prefix,...queueRests(session,[{...current,...sourceCurrent},...future])];
}

/** Absolute Normal baseline; never derive it from an intensity-reduced queue. */
export function normalSessionPlan(session){
 const base=copy(session.intensityBasePlan??session.plan);
 base.exercises=copy(session.plan.baseExercises??base.baseExercises??base.exercises);
 base.baseExercises=copy(base.exercises);base.intensity='normal';
 return base;
}

function orderCircuits(session){
 if(session.plan.circuit&&!session.plan.blocks?.length)session.plan.blocks=[{kind:'circuit',exerciseIndices:session.plan.exercises.map((_,index)=>index)}];
 const ordered=[],included=new Set();
 for(const block of session.plan.blocks??[]){
  const indices=block.exerciseIndices,rows=session.sourceSteps.filter(row=>indices.includes(row.exerciseIndex)&&!included.has(row.stepId));
  if(block.kind==='circuit'){
   rows.sort((a,b)=>(a.round??a.set)-(b.round??b.set)||indices.indexOf(a.exerciseIndex)-indices.indexOf(b.exerciseIndex));
   block.rounds=Math.max(0,...rows.map(row=>row.round??row.set));
  }else rows.sort((a,b)=>indices.indexOf(a.exerciseIndex)-indices.indexOf(b.exerciseIndex)||a.set-b.set);
  ordered.push(...rows);rows.forEach(row=>included.add(row.stepId));
 }
 session.sourceSteps=[...ordered,...session.sourceSteps.filter(row=>!included.has(row.stepId))];
}

// A started or credited circuit round is indivisible: its untouched companions
// remain work to do. Previously ragged history is disclosed without reopening a
// completed movement or inventing credit for a missing companion.
function retainCircuitRounds(session,originalRows,complete,current){
 if(infinitePlan(session.plan))return;
 const incomplete=[];
 for(const [blockIndex,block] of (session.plan.blocks??[]).entries()){
  if(block.kind!=='circuit')continue;
  const indices=block.exerciseIndices,roundOf=row=>row.round??row.set;
  const protectedRounds=new Set(originalRows.filter(row=>indices.includes(row.exerciseIndex)&&(complete.has(row.stepId)||row.stepId===current?.stepId)).map(roundOf));
  for(const row of originalRows){
   if(!indices.includes(row.exerciseIndex)||!protectedRounds.has(roundOf(row))||session.sourceSteps.some(saved=>saved.stepId===row.stepId))continue;
   const restored=copy(row);restored.round=roundOf(row);
   if(!complete.has(row.stepId)&&row.stepId!==current?.stepId)restored.dose=copy(session.plan.exercises[row.exerciseIndex]);
   session.sourceSteps.push(restored);
  }
  const rounds=new Set(session.sourceSteps.filter(row=>indices.includes(row.exerciseIndex)).map(roundOf));
  for(const round of rounds){
   const rows=session.sourceSteps.filter(row=>indices.includes(row.exerciseIndex)&&roundOf(row)===round);
   const missing=indices.filter(index=>!rows.some(row=>row.exerciseIndex===index));
   if(!missing.length)continue;
   const keepsCoverage=rows.every(row=>session.sourceSteps.some(other=>other.exerciseIndex===row.exerciseIndex&&roundOf(other)!==round&&!complete.has(other.stepId)));
   if(protectedRounds.has(round)||!keepsCoverage)incomplete.push({blockIndex,round,exerciseIndices:missing});
   else{const removed=new Set(rows.map(row=>row.stepId));session.sourceSteps=session.sourceSteps.filter(row=>!removed.has(row.stepId))}
  }
 }
 if(incomplete.length)session.plan.incompleteCircuitRounds=incomplete;
 else delete session.plan.incompleteCircuitRounds;
}

function removalBundles(session,complete,current,minimum){
 const counts=new Map(session.plan.exercises.map((_,index)=>[index,session.sourceSteps.filter(row=>row.exerciseIndex===index).length]));
 const circuits=new Set(),bundles=[];
 const canRemove=rows=>rows.length>0&&rows.every(row=>!complete.has(row.stepId)&&row.stepId!==current?.stepId&&counts.get(row.exerciseIndex)>(minimum.get(row.exerciseIndex)??0));
 const bundle=rows=>({rows,surplus:Math.min(...rows.map(row=>counts.get(row.exerciseIndex)-(minimum.get(row.exerciseIndex)??0))),round:Math.max(...rows.map(row=>row.round??row.set)),index:Math.max(...rows.map(row=>row.exerciseIndex))});
 for(const block of session.plan.blocks??[]){
  if(block.kind!=='circuit')continue;
  const indices=block.exerciseIndices;indices.forEach(index=>circuits.add(index));
  const rows=session.sourceSteps.filter(row=>indices.includes(row.exerciseIndex));
  for(const round of new Set(rows.map(row=>row.round??row.set))){
   const selected=rows.filter(row=>(row.round??row.set)===round);
   if(indices.every(index=>selected.some(row=>row.exerciseIndex===index))&&canRemove(selected))bundles.push(bundle(selected));
  }
 }
 for(const row of session.sourceSteps)if(!circuits.has(row.exerciseIndex)&&canRemove([row]))bundles.push(bundle([row]));
 return bundles.sort((a,b)=>b.surplus-a.surplus||b.round-a.round||b.index-a.index);
}

function estimate(session,current){
 const phase=session.phase==='stopped'?session.stoppedPhase:session.phase;
 const future=session.steps.slice(session.index+(phase==='rest'?1:0));
 let remaining=future.reduce((sum,row)=>sum+seconds(stepDose(session,row))+(row.restAfter||0),0);
 if(phase==='rest')remaining+=(session.restMs||0)/1000;
 else if(current)remaining-=Math.min(seconds(stepDose(session,current)),(session.setMs||0)/1000);
 return Math.max(0,(session.activeMs||0)/1000+remaining);
}

function updateEstimate(session,current){
 session.plan.steps=copy(session.sourceSteps);
 session.plan.estimatedSeconds=Math.ceil(estimate(session,current));
 session.plan.estimatedMinutes=Math.round(session.plan.estimatedSeconds/6)/10;
 const target=Number(session.plan.targetMinutes)*60;
 session.plan.overflowSeconds=infinitePlan(session.plan)||!Number.isFinite(target)?0:Math.max(0,session.plan.estimatedSeconds-target);
 session.plan.overflow=session.plan.overflowSeconds>0;
 session.plan.remainingSeconds=infinitePlan(session.plan)||!Number.isFinite(target)?0:Math.max(0,target-session.plan.estimatedSeconds);
}

/**
 * Shared pure intensity/duration reconciliation. nextNormalPlan is the full
 * unscaled selected-duration plan. Protected doses, credits, IDs and clocks stay
 * exact; only future rows can be removed to fit the actual remaining budget.
 */
export function reconcileSessionPlan(session,nextNormalPlan,intensity=normalizeIntensity(session.intensity??session.plan.intensity)){
 const s=normalizeProgress(copy(session)),oldPlan=s.plan,complete=new Set(s.completedStepIds);
 let current=s.steps?.[s.index];
 if(current&&!Number.isInteger(current.stepId))current={...current,...s.sourceSteps.find(row=>row.exerciseIndex===current.exerciseIndex&&row.set===current.set&&(row.round??null)===(current.round??null))};
 for(const row of s.sourceSteps)if(!row.dose)row.dose=stepDose(s,row);
 const originalRows=copy(s.sourceSteps);
 const normal=copy(nextNormalPlan),base=copy(normal.baseExercises??normal.exercises);
 normal.exercises=copy(base);normal.baseExercises=copy(base);normal.intensity='normal';
 const policy=planIntensity(normal,intensity),oldSlots=slots(oldPlan.exercises),newSlots=slots(base);
 const all=[...oldSlots,...newSlots.filter(slot=>!oldSlots.some(old=>old.key===slot.key))];
 const originalBase=normalSessionPlan(s),newExercises=[],normalExercises=[],source=[];
 let nextId=Math.max(s.nextStepId??0,...s.sourceSteps.map(row=>row.stepId+1));
 const minimum=new Map();
 const sameTarget=oldPlan.intensityPolicy===2&&(s.intensity??oldPlan.intensity)===intensity&&oldPlan.targetMinutes===normal.targetMinutes&&JSON.stringify(oldPlan.baseExercises)===JSON.stringify(base);
 for(let exerciseIndex=0;exerciseIndex<all.length;exerciseIndex++){
  const slot=all[exerciseIndex],old=oldSlots.find(row=>row.key===slot.key),next=newSlots.find(row=>row.key===slot.key);
  const original=s.sourceSteps.filter(row=>row.exerciseIndex===old?.index);
  const done=original.filter(row=>complete.has(row.stepId));
  const finished=original.length>0&&done.length===original.length;
  const normalExercise=copy(next?.exercise??originalBase.exercises[old?.index]??old?.exercise);
  const target=copy(next?policy.exercises[next.index]:old.exercise);
  normalExercises.push(normalExercise);
  if(finished){source.push(...original);newExercises.push({...copy(old.exercise),sets:original.length});continue}
  const protectedRows=original.filter(row=>complete.has(row.stepId)||row.stepId===current?.stepId);
  const min=Math.max(protectedRows.length,done.length+1);minimum.set(exerciseIndex,min);
  const desired=next?Number(target.sets)||1:1;
  const wanted=infinitePlan(oldPlan)?original.length:Math.max(min,sameTarget?Math.min(desired,original.length):desired);
  const selected=[...protectedRows];
  for(const row of original){if(selected.length>=wanted)break;if(!selected.some(saved=>saved.stepId===row.stepId))selected.push(row)}
  const usedSets=new Set(selected.map(row=>row.set));
  while(selected.length<wanted){let set=1;while(usedSets.has(set))set++;usedSets.add(set);selected.push({exerciseIndex,set,stepId:nextId++,restAfter:30})}
  selected.sort((a,b)=>a.set-b.set);
  for(const row of selected){
   row.exerciseIndex=exerciseIndex;
   if(!complete.has(row.stepId)&&row.stepId!==current?.stepId){row.dose=copy(target);delete row.intensityOptional}
   if(normal.circuit||normal.blocks?.some(block=>block.kind==='circuit'&&block.exerciseIndices.includes(next?.index)))row.round=row.round??row.set;
  }
  source.push(...selected);newExercises.push({...target,sets:selected.length});
 }
 s.sourceSteps=source;s.nextStepId=nextId;s.intensity=intensity;
 s.plan={...policy,exercises:newExercises,baseExercises:copy(normalExercises)};
 const mapBlocks=blocks=>blocks?.map(block=>({...copy(block),exerciseIndices:block.exerciseIndices.map(index=>all.findIndex(slot=>slot.key===newSlots[index]?.key)).filter(index=>index>=0)}));
 if(s.plan.blocks)s.plan.blocks=mapBlocks(s.plan.blocks);
 if(s.plan.baseBlocks)s.plan.baseBlocks=mapBlocks(s.plan.baseBlocks);
 s.intensityBasePlan={...normal,exercises:copy(normalExercises),baseExercises:copy(normalExercises),...(normal.blocks?{blocks:mapBlocks(normal.blocks)}:{}),...(normal.baseBlocks?{baseBlocks:mapBlocks(normal.baseBlocks)}:{})};
 if(s.plan.circuit&&!s.plan.blocks?.length)s.plan.blocks=[{kind:'circuit',exerciseIndices:s.plan.exercises.map((_,index)=>index)}];
 retainCircuitRounds(s,originalRows,complete,current);
 orderCircuits(s);rebuildLiveQueue(s,current);
 const budget=Number(s.plan.targetMinutes)*60;
 if(!infinitePlan(s.plan)&&Number.isFinite(budget)){
  while(estimate(s,current)>budget){
   const removable=removalBundles(s,complete,current,minimum);
   if(!removable.length)break;
   const removed=new Set(removable[0].rows.map(row=>row.stepId));
   s.sourceSteps=s.sourceSteps.filter(row=>!removed.has(row.stepId));
   rebuildLiveQueue(s,current);
  }
 }
 orderCircuits(s);
 for(let index=0;index<s.plan.exercises.length;index++)s.plan.exercises[index].sets=s.sourceSteps.filter(row=>row.exerciseIndex===index).length;
 s.intensityBaseSteps=copy(s.sourceSteps);
 updateEstimate(s,current);
 return s;
}
