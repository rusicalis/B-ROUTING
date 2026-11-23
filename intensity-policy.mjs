// One absolute dose and time policy shared by planning and live sessions.
// Equipment, movement selection, tempo and prescribed rests are never intensified.
const copy=value=>structuredClone(value);
const positive=(value,fallback)=>Number.isFinite(Number(value))&&Number(value)>0?Number(value):fallback;
const setsOf=exercise=>Math.max(1,Math.floor(positive(exercise.sets,1)));
const infinite=plan=>!!(plan.infinite||plan.infiniteCircuit);
const workOf=exercise=>(exercise.holdSeconds||exercise.workSeconds||positive(exercise.reps,1)*positive(exercise.cycleSeconds,4))*(exercise.eachSide?2:1);
const rounded=value=>Math.round(value*1000)/1000;

export const INTENSITY_PROFILES=Object.freeze({
 normal:Object.freeze({factor:1}),hard:Object.freeze({factor:1.25}),extreme:Object.freeze({factor:1.5}),
});

export function normalizeIntensity(value){return typeof value==='string'&&Object.hasOwn(INTENSITY_PROFILES,value)?value:'normal'}

/** Always pass the original Normal dose. Explicit manual doses have no lower cap. */
export function scaleExerciseDose(exercise,intensity='normal'){
 const mode=normalizeIntensity(intensity),e=copy(exercise);
 e.sets=setsOf(e);
 if(mode==='normal')return e;
 for(const field of ['reps','holdSeconds','workSeconds']){
  const base=Number(exercise[field]);
  if(!Number.isFinite(base)||base<=0)continue;
  const hard=Math.max(Math.ceil(base*INTENSITY_PROFILES.hard.factor),Math.floor(base)+1);
  e[field]=mode==='hard'?hard:Math.max(Math.ceil(base*INTENSITY_PROFILES.extreme.factor),hard+1);
 }
 return e;
}

function blocksOf(plan){
 if(plan.blocks?.length)return plan.blocks;
 const exerciseIndices=plan.exercises.map((_,index)=>index);
 return plan.circuit?[{kind:'circuit',exerciseIndices,rounds:Math.min(...plan.exercises.map(setsOf))}]:[{kind:'sets',exerciseIndices}];
}

function buildSteps(plan){
 const steps=[],exercises=plan.exercises;
 if(infinite(plan)){
  const indices=blocksOf(plan).find(block=>block.kind==='circuit')?.exerciseIndices??exercises.map((_,index)=>index);
  return indices.map((exerciseIndex,index)=>({exerciseIndex,set:1,round:1,restAfter:index===indices.length-1?30:0}));
 }
 for(const block of blocksOf(plan)){
  if(block.kind==='circuit'){
   const rounds=Math.min(positive(block.rounds,1),...block.exerciseIndices.map(index=>setsOf(exercises[index])));
   for(let round=1;round<=rounds;round++)for(const exerciseIndex of block.exerciseIndices)steps.push({exerciseIndex,set:round,round});
  }else for(const exerciseIndex of block.exerciseIndices)for(let set=1;set<=setsOf(exercises[exerciseIndex]);set++)steps.push({exerciseIndex,set});
 }
 return steps.map((step,index)=>({...step,restAfter:index===steps.length-1?0:plan.kind==='cardio'?15:step.exerciseIndex===steps[index+1].exerciseIndex?30:60}));
}

function estimate(plan){return rounded(buildSteps(plan).reduce((sum,step)=>sum+workOf(plan.exercises[step.exerciseIndex])+step.restAfter,0))}
function active(plan){return rounded(buildSteps(plan).reduce((sum,step)=>sum+workOf(plan.exercises[step.exerciseIndex]),0))}

// Each group has one whole-number count: one exercise's sets or a complete
// circuit's rounds. Its additive cost includes all rests except the final one.
function countGroups(plan){
 const cardio=plan.kind==='cardio',groups=[];
 for(const [blockIndex,block] of blocksOf(plan).entries()){
  if(block.kind==='circuit'){
   const indices=block.exerciseIndices,max=Math.min(Math.floor(positive(block.rounds,1)),...indices.map(index=>setsOf(plan.exercises[index])));
   const work=indices.reduce((sum,index)=>sum+workOf(plan.exercises[index]),0);
   // A one-movement circuit has ordinary between-set rests.
   const rest=cardio?15:indices.length===1?30:60;
   groups.push({indices,blockIndex,max,work,cost:work+rest*indices.length,overhead:cardio||indices.length>1?0:30});
  }else for(const index of block.exerciseIndices){
   const work=workOf(plan.exercises[index]);
   groups.push({indices:[index],blockIndex,max:setsOf(plan.exercises[index]),work,cost:work+(cardio?15:30),overhead:cardio?0:30});
  }
 }
 return groups;
}

function applyCounts(plan,groups,counts){
 for(let index=0;index<groups.length;index++){
  const group=groups[index],count=counts[index];
  for(const exerciseIndex of group.indices)plan.exercises[exerciseIndex].sets=count;
  if(plan.blocks?.[group.blockIndex]?.kind==='circuit')plan.blocks[group.blockIndex].rounds=count;
 }
}

function fitCounts(plan,budget,minimumActive){
 if(estimate(plan)<=budget)return plan;
 const groups=countGroups(plan);
 const minimum=copy(plan);applyCounts(minimum,groups,groups.map(()=>1));
 if(estimate(minimum)>budget){applyCounts(plan,groups,groups.map(()=>1));return plan}
 // Milliseconds preserve custom fractional cycle times without rounding a plan
 // into the selected budget. First protect the largest feasible minimum share
 // of every type's original sets, then spend remaining time on whole counts.
 const finalRest=plan.kind==='cardio'?15:60;
 const overhead=groups.reduce((sum,group)=>sum+group.overhead,0)-finalRest;
 const limit=Math.floor((budget-overhead)*1000);
 const ratios=[...new Set(groups.flatMap(group=>Array.from({length:group.max},(_,index)=>(index+1)/group.max)))].sort((a,b)=>b-a);
 const floor=Math.round(minimumActive*1000);
 let chosen=null,fallback=null,fallbackCost=-1;
 for(const ratio of ratios){
  const lower=groups.map(group=>Math.max(1,Math.ceil(group.max*ratio-1e-9)));
  if(groups.reduce((sum,group,index)=>sum+Math.round(group.cost*1000)*lower[index],0)>limit)continue;
  let states=new Map([[0,{work:0,balance:0,counts:[]}]]);
  for(const [groupIndex,group] of groups.entries()){
   const next=new Map(),cost=Math.round(group.cost*1000),work=Math.round(group.work*1000);
   for(const [spent,state] of states)for(let count=lower[groupIndex];count<=group.max;count++){
    const total=spent+cost*count;if(total>limit)break;
    const candidate={work:state.work+work*count,balance:state.balance+Math.log(count/group.max),counts:[...state.counts,count]},previous=next.get(total);
    if(!previous||candidate.work>previous.work||candidate.work===previous.work&&candidate.balance>previous.balance)next.set(total,candidate);
   }
   states=next;
  }
  let candidate=null,candidateCost=-1;
  for(const [cost,state] of states){
   if(cost>fallbackCost){fallback=state;fallbackCost=cost}
   if(state.work>=floor&&(cost>candidateCost||cost===candidateCost&&state.balance>candidate.balance)){candidate=state;candidateCost=cost}
  }
  if(candidate){
   chosen=candidate;
   // Within a minute of actual work+rest is a good finite fit. Loosen only
   // when balanced integer counts otherwise leave a substantial unused gap.
   if(candidateCost+overhead*1000>=(budget-60)*1000)break;
  }
 }
 // Highly constrained custom plans may not match the previous mode's active
 // work in whole sets. Coverage and the selected time remain hard limits.
 if(!chosen)chosen=fallback;
 if(chosen)applyCounts(plan,groups,chosen.counts);
 return plan;
}

/**
 * Rebuild from the saved Normal baseline, never from an already-scaled dose.
 * Keep original counts whenever they fit. Otherwise reduce only whole sets or
 * balanced rounds; mandatory movement coverage can honestly exceed the target.
 */
export function planIntensity(basePlan,intensity='normal'){
 const mode=normalizeIntensity(intensity),plan=copy(basePlan),base=copy(basePlan.baseExercises??basePlan.exercises??[]);
 plan.baseExercises=copy(base);plan.exercises=base.map(exercise=>scaleExerciseDose(exercise,mode));
 plan.intensity=mode;plan.intensityPolicy=2;
 // Blocks are also restored from the baseline when changing an already fitted
 // plan, so a second switch cannot inherit the previous mode's smaller rounds.
 const baseBlocks=basePlan.baseBlocks??basePlan.blocks;
 if(baseBlocks){plan.baseBlocks=copy(baseBlocks);plan.blocks=copy(baseBlocks)}
 const budget=Number.isFinite(Number(plan.targetMinutes))&&Number(plan.targetMinutes)>0?Number(plan.targetMinutes)*60:Infinity;
 if(!infinite(plan)&&Number.isFinite(budget)){
  let minimumActive=0;
  if(mode!=='normal')minimumActive=active(planIntensity({...basePlan,baseExercises:base,...(baseBlocks?{baseBlocks}:{} )},mode==='extreme'?'hard':'normal'));
  fitCounts(plan,budget,minimumActive);
 }
 if(infinite(plan)){
  for(const exercise of plan.exercises)exercise.sets=1;
  for(const block of plan.blocks??[])if(block.kind==='circuit')block.rounds=1;
 }
 plan.steps=buildSteps(plan);plan.estimatedSeconds=estimate(plan);plan.estimatedMinutes=Math.round(plan.estimatedSeconds/6)/10;
 plan.overflowSeconds=infinite(plan)||!Number.isFinite(budget)?0:rounded(Math.max(0,plan.estimatedSeconds-budget));plan.overflow=plan.overflowSeconds>0;
 plan.remainingSeconds=infinite(plan)||!Number.isFinite(budget)?0:rounded(Math.max(0,budget-plan.estimatedSeconds));
 if(infinite(plan))plan.roundSeconds=plan.estimatedSeconds;
 return plan;
}
