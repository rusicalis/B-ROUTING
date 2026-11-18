// Pure duration allocation. No catalog, DOM, storage or progression dependencies.
// Callers own progression: level is accepted for API compatibility and deliberately ignored.
const copy=value=>structuredClone(value);
const finite=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;
const positive=(value,fallback)=>Math.max(.001,finite(value,fallback));
const secondsFor=e=>(e.holdSeconds||e.workSeconds||positive(e.reps,1)*positive(e.cycleSeconds,4))*(e.eachSide?2:1);

/** Build actual execution order, including each complete unilateral set. */
export function buildDurationSteps(plan){
 const exercises=plan.exercises||[],steps=[];
 let blocks=plan.blocks;
 if(!blocks?.length)blocks=plan.circuit?[{kind:'circuit',exerciseIndices:exercises.map((_,i)=>i),rounds:Math.max(0,...exercises.map(e=>e.sets||1))}]:[{kind:'sets',exerciseIndices:exercises.map((_,i)=>i)}];
 for(const block of blocks){
  if(block.kind==='circuit'){
   for(let round=1;round<=block.rounds;round++)for(const exerciseIndex of block.exerciseIndices){
    if(!exercises[exerciseIndex])throw new RangeError('Circuit references an unknown exercise.');
    if(round<=(exercises[exerciseIndex].sets??block.rounds))steps.push({exerciseIndex,set:round,round});
   }
  }else for(const exerciseIndex of block.exerciseIndices){
   if(!exercises[exerciseIndex])throw new RangeError('Block references an unknown exercise.');
   for(let set=1;set<=exercises[exerciseIndex].sets;set++)steps.push({exerciseIndex,set});
  }
 }
 return steps.map((step,index)=>({...step,restAfter:index===steps.length-1?0:step.exerciseIndex===steps[index+1].exerciseIndex?30:60}));
}

/** Exact work plus disclosed step rests. Never pad an undersized session. */
export function estimateDurationSeconds(plan){
 return Math.round(buildDurationSteps(plan).reduce((total,step)=>total+secondsFor(plan.exercises[step.exerciseIndex])+step.restAfter,0)*1000)/1000;
}

function starter(candidate){
 const e=copy(candidate);
 e.sets=Math.max(1,Math.min(2,Math.floor(finite(e.sets,2))));
 e.cycleSeconds=positive(e.cycleSeconds,4);e.rest=30;
 if(e.holdSeconds){e.holdSeconds=Math.min(30,positive(e.holdSeconds,20));e.reps=0;delete e.workSeconds}
 else if(e.workSeconds){e.workSeconds=Math.min(30,positive(e.workSeconds,30));e.reps=0}
 else e.reps=Math.max(1,Math.min(12,Math.floor(finite(e.reps,8))));
 return e;
}

function append(plan,exercise){
 const index=plan.exercises.length;
 // Existing cardio-style circuits stay intact; appended accessories form a new block.
 if(plan.circuit&&!plan.blocks?.length)plan.blocks=[{kind:'circuit',exerciseIndices:plan.exercises.map((_,i)=>i),rounds:Math.max(0,...plan.exercises.map(e=>e.sets||1))}];
 plan.exercises.push(exercise);
 if(plan.blocks?.length){
  if(plan.blocks.at(-1).kind==='sets')plan.blocks.at(-1).exerciseIndices.push(index);
  else plan.blocks.push({kind:'sets',exerciseIndices:[index]});
 }
}

function fillDoses(plan,budget){
 // One dose field changes at a time. Stop at the first unaffordable increment;
 // skipping a change would allow a larger budget to replace previously given work.
 for(let pass=0;pass<90;pass++){
  let changed=false;
  for(let i=0;i<plan.exercises.length;i++){
   const e=plan.exercises[i],field=e.holdSeconds?'holdSeconds':e.workSeconds?'workSeconds':'reps';
   const ceiling=field==='reps'?(e.equipment==='kettlebell'?12:16):60;
   if(e[field]>=ceiling)continue;
   const previous=e[field];e[field]=Math.min(ceiling,previous+1);
   if(estimateDurationSeconds(plan)>budget){e[field]=previous;return}
   changed=true;
  }
  if(!changed)break;
 }
 // Circuit rounds are protected. Only ordinary set blocks gain extra sets, up to5.
 const circuitIndices=new Set((plan.blocks||[]).filter(block=>block.kind==='circuit').flatMap(block=>block.exerciseIndices));
 for(let sets=2;sets<=5;sets++)for(let i=0;i<plan.exercises.length;i++){
  const e=plan.exercises[i];if(circuitIndices.has(i)||e.sets>=sets)continue;
  const previous=e.sets;e.sets=sets;
  if(estimateDurationSeconds(plan)>budget){e.sets=previous;return}
 }
}

/**
 * Preserve base core doses/order; add distinct candidates in supplied priority order
 * before growing existing doses. Candidates begin at1–2 sets and at most12 reps/30s.
 * At official30/40/50/60-minute checkpoints, retain every earlier allocation before
 * spending the next budget. This prevents new types from replacing earlier fillers.
 * Intermediate targets consume the same candidate prefix, without a new filler pass.
 * A disclosed60s budget margin allows the caller to apply its own gentle progression.
 * If the protected base already exceeds target, retain it and report actual overflow.
 */
export function fitExerciseDuration(basePlan,candidates,targetMinutes,level=0){
 const plan=copy(basePlan);plan.exercises=copy(basePlan.exercises||[]);
 const target=Math.max(1,Math.min(90,finite(targetMinutes,30))),seen=new Set(plan.exercises.map(e=>e.id)),pool=[];
 for(const candidate of Array.isArray(candidates)?candidates:[]){
  if(!candidate||typeof candidate.id!=='string'||!candidate.id||seen.has(candidate.id))continue;
  seen.add(candidate.id);pool.push(starter(candidate));
 }
 const checkpoints=[];
 if(target<30)checkpoints.push(target);
 else{
  for(let minutes=30;minutes<=target;minutes+=10)checkpoints.push(minutes);
  if(checkpoints.at(-1)!==target)checkpoints.push(target);
 }
 let next=0;
 for(const minutes of checkpoints){
  const budget=Math.max(0,minutes*60-60);
  while(next<pool.length&&plan.exercises.length<24){
   const trial=copy(plan);append(trial,copy(pool[next]));
   if(estimateDurationSeconds(trial)>budget)break;
   plan.exercises=trial.exercises;if(trial.blocks)plan.blocks=trial.blocks;
   next++;
  }
  if(minutes===target&&target>=30&&target%10!==0)continue;
  fillDoses(plan,budget);
 }
 plan.targetMinutes=target;plan.steps=buildDurationSteps(plan);plan.estimatedSeconds=estimateDurationSeconds(plan);plan.estimatedMinutes=Math.round(plan.estimatedSeconds/6)/10;
 plan.overflowSeconds=Math.max(0,Math.round((plan.estimatedSeconds-target*60)*1000)/1000);plan.overflow=plan.overflowSeconds>0;
 plan.remainingSeconds=Math.max(0,Math.round((target*60-plan.estimatedSeconds)*1000)/1000);
 return plan;
}
