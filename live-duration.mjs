import {normalizeProgress} from './session-progress.mjs';
import {normalizeIntensity,scaleExerciseDose} from './compact-program.mjs';
import {stepDose,rebuildLiveQueue} from './live-session.mjs';

const copy=value=>structuredClone(value);
const seconds=e=>(e.holdSeconds||e.workSeconds||e.reps*(e.cycleSeconds||4))*(e.eachSide?2:1);
function exerciseSlots(exercises){const counts=new Map();return exercises.map((exercise,index)=>{const occurrence=counts.get(exercise.id)||0;counts.set(exercise.id,occurrence+1);return {key:exercise.id+':'+occurrence,exercise,index}})}

/** Replace future duration targets without changing completion or the in-flight set. */
export function applyLiveDuration(session,nextPlan){
 if(![30,40,50,60].includes(nextPlan?.targetMinutes))throw new RangeError('Unsupported workout duration.');
 if(session.plan?.infinite||nextPlan.infinite||!['prep','work','rest','stopped'].includes(session.phase))throw new RangeError('This session cannot change duration.');
 const s=normalizeProgress(copy(session));
 if(s.plan.targetMinutes===nextPlan.targetMinutes)return s;
 const current=s.steps[s.index],complete=new Set(s.completedStepIds),oldPlan=s.plan;
 for(const row of s.sourceSteps)if(!row.dose)row.dose=stepDose(s,row);
 const protectedId=current?.stepId;
 const intensity=normalizeIntensity(s.intensity??oldPlan.intensity),extra={normal:0,hard:1,extreme:2}[intensity];
 const requested=nextPlan.baseExercises||nextPlan.exercises;
 const oldSlots=exerciseSlots(oldPlan.exercises),newSlots=exerciseSlots(nextPlan.exercises);
 const slots=[...oldSlots,...newSlots.filter(slot=>!oldSlots.some(old=>old.key===slot.key))];
 const normalPlan={...copy(nextPlan),exercises:[]},exercises=[],rows=[];
 let nextId=Math.max(s.nextStepId||0,...s.sourceSteps.map(row=>row.stepId+1));
 for(let exerciseIndex=0;exerciseIndex<slots.length;exerciseIndex++){
  const slot=slots[exerciseIndex],oldSlot=oldSlots.find(old=>old.key===slot.key),newSlot=newSlots.find(row=>row.key===slot.key);
  const old=oldSlot?.exercise,normal=copy(requested[newSlot?.index]||s.intensityBasePlan?.exercises[oldSlot?.index]||oldPlan.baseExercises?.[oldSlot?.index]||old);
  const original=s.sourceSteps.filter(row=>row.exerciseIndex===exerciseIndex);
  const done=original.filter(row=>complete.has(row.stepId));
  // A fully completed movement never reappears when the target gets longer.
  if(original.length&&done.length===original.length){
   rows.push(...original);exercises.push({...copy(old),sets:original.length});normalPlan.exercises.push({...normal,sets:original.length});continue;
  }
  const protectedRows=original.filter(row=>complete.has(row.stepId)||row.stepId===protectedId);
  const minimum=Math.max(1,done.length+1,...protectedRows.map(row=>row.set||0));
  const baseCount=Math.max(1,normal.sets||1),count=Math.max(minimum,baseCount+extra);
  const selected=[...protectedRows];
  for(const row of original){if(selected.length>=count)break;if(!selected.some(saved=>saved.stepId===row.stepId))selected.push(row);}
  const usedSets=new Set(selected.map(row=>row.set));
  while(selected.length<count){let set=1;while(usedSets.has(set))set++;usedSets.add(set);selected.push({exerciseIndex,set,stepId:nextId++,restAfter:30});}
  selected.sort((a,b)=>a.set-b.set);
  const target=scaleExerciseDose(normal,intensity);
  selected.forEach((row,index)=>{
   if(!complete.has(row.stepId)&&row.stepId!==protectedId){row.dose=copy(target);if(index>=baseCount)row.intensityOptional=true;else delete row.intensityOptional;}
  });
  rows.push(...selected);exercises.push({...target,sets:selected.length});normalPlan.exercises.push({...normal,sets:baseCount});
 }
 s.sourceSteps=rows;s.nextStepId=nextId;s.intensity=intensity;
 s.plan={...copy(nextPlan),exercises,intensity};
 // Preserve historical circuit ordering where a saved preset uses rounds.
 for(const block of s.plan.blocks||[])if(block.kind==='circuit'){
  const indices=block.exerciseIndices.map(index=>slots.findIndex(slot=>slot.key===newSlots[index]?.key));block.exerciseIndices=indices;
  const circuitRows=rows.filter(row=>indices.includes(row.exerciseIndex));
  circuitRows.forEach(row=>{if(!complete.has(row.stepId)&&row.stepId!==protectedId)row.round=row.set;});
  circuitRows.sort((a,b)=>(a.round??a.set)-(b.round??b.set)||indices.indexOf(a.exerciseIndex)-indices.indexOf(b.exerciseIndex));
  let cursor=0;s.sourceSteps=s.sourceSteps.map(row=>indices.includes(row.exerciseIndex)?circuitRows[cursor++]:row);
  block.rounds=Math.max(...circuitRows.map(row=>row.round??row.set));
 }
 s.intensityBasePlan=normalPlan;
 s.intensityBaseSteps=copy(s.sourceSteps.filter(row=>!row.intensityOptional&&row.set<=normalPlan.exercises[row.exerciseIndex].sets));
 s.plan.baseExercises=copy(normalPlan.exercises);
 s.plan.steps=copy(s.sourceSteps);
 rebuildLiveQueue(s,current);
 const future=s.steps.slice(s.index+(s.phase==='rest'?1:0));
 let remaining=future.reduce((total,row)=>total+seconds(stepDose(s,row))+(row.restAfter||0),0);
 if(s.phase==='rest')remaining+=(s.restMs||0)/1000;
 else remaining=Math.max(0,remaining-(s.setMs||0)/1000);
 s.plan.estimatedSeconds=Math.ceil((s.activeMs||0)/1000+remaining);
 s.plan.estimatedMinutes=Math.round(s.plan.estimatedSeconds/6)/10;
 s.plan.overflowSeconds=Math.max(0,s.plan.estimatedSeconds-s.plan.targetMinutes*60);
 s.plan.overflow=s.plan.overflowSeconds>0;
 return s;
}
