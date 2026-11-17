// Pure preset planning. All timing is derived from the same ordered steps used by sessions.
import {hasExercisePreview} from './exercise-media-data.mjs';
import {EXERCISES} from './workout-engine.mjs';

const clamp=(value,min,max,fallback=min)=>Math.max(min,Math.min(max,Number.isFinite(Number(value))?Number(value):fallback));
const family=day=>day===7?'sunday':[1,4].includes(day)?'A':[2,5].includes(day)?'B':'C';
const safeDay=day=>Math.floor(clamp(day,1,7,1));
const bridgeId=options=>options.bridgeVariant==='glute'?'bridge-hold':'reverse-plank';
const source=id=>{const e=EXERCISES.find(e=>e.id===id);if(!e)throw new RangeError('Unknown exercise: '+id);return e};
const dose=(id,sets,reps,extra={})=>({...source(id),sets,reps,rest:30,cycleSeconds:4,tempo:'normal',...extra});

export const PRESET_SCHEDULE=[
 {day:1,name:'월',title:'밀기 · 삼두 · 브리지',targets:['chest','shoulders','triceps','legs']},
 {day:2,name:'화',title:'컬 · 프레스 · 힌지 · 복부',targets:['biceps','shoulders','legs','lowerback']},
 {day:3,name:'수',title:'로우 · 스쿼트 · 브리지',targets:['back','biceps','legs','lowerback']},
 {day:4,name:'목',title:'밀기 · 삼두 · 브리지',targets:['chest','shoulders','triceps','legs']},
 {day:5,name:'금',title:'컬 · 프레스 · 힌지 · 복부',targets:['biceps','shoulders','legs','lowerback']},
 {day:6,name:'토',title:'로우 · 스쿼트 · 브리지',targets:['back','biceps','legs','lowerback']},
 {day:7,name:'일',title:'로우 · 푸시업 · 스쿼트 서킷',targets:['back','chest','legs','lowerback']},
];

export function presetTrackKey(day=1,options={}){
 const id=options.savedPreset?.id||options.presetId||'user-week';
 return ['preset',encodeURIComponent(id),options.doseMode==='goal'?'goal':'fit',options.bridgeVariant==='glute'?'glute':'reverse',family(safeDay(day))].join(':');
}

/** Steps are one complete set (including both sides). No rest follows the last step. */
export function buildPresetSteps(plan){
 const steps=[],exercises=plan.exercises||[];
 const blocks=plan.blocks?.length?plan.blocks:[{kind:'sets',exerciseIndices:exercises.map((_,i)=>i)}];
 for(const block of blocks){
  if(block.kind==='circuit'){
   for(let round=1;round<=block.rounds;round++)for(let i=0;i<block.exerciseIndices.length;i++){
    steps.push({exerciseIndex:block.exerciseIndices[i],set:round,round,restAfter:60});
   }
   // Completing the circuit starts a different block, so allow an exercise transition.
   if(steps.length)steps.at(-1).restAfter=60;
  }else for(const exerciseIndex of block.exerciseIndices){
   const e=exercises[exerciseIndex];
   for(let set=1;set<=e.sets;set++)steps.push({exerciseIndex,set,restAfter:set===e.sets?60:30});
  }
 }
 if(steps.length)steps.at(-1).restAfter=0;
 return steps;
}

export function estimatePresetSeconds(plan){
 return Math.round(buildPresetSteps(plan).reduce((total,step)=>{
  const e=plan.exercises[step.exerciseIndex];
  return total+(e.holdSeconds||e.workSeconds||e.reps*(e.cycleSeconds||4))*(e.eachSide?2:1)+step.restAfter;
 },0));
}

function goalTemplate(day,options){
 const f=family(day),bridge=bridgeId(options);
 if(f==='A')return {exercises:[dose('pushup',10,10),dose('pike-pushup',3,6),dose('kb-lying-triceps',10,6),dose('chair-dip',10,6),dose(bridge,5,0,{holdSeconds:60})]};
 if(f==='B')return {exercises:[dose('kb-curl',3,8),dose('kb-shoulder-press',3,6),dose('kb-deadlift',3,10),dose('abs-crunch',5,0,{workSeconds:60}),dose('band-lateral-raise',3,8)]};
 if(f==='C')return {exercises:[dose('kb-row',3,8),dose('squat',3,12),dose(bridge,5,0,{holdSeconds:60})]};
 return {exercises:[dose('kb-row',4,5),dose('pushup',4,10),dose('squat',4,15),dose('abs-crunch',5,0,{workSeconds:60}),dose(bridge,5,0,{holdSeconds:60})],blocks:[{kind:'circuit',exerciseIndices:[0,1,2],rounds:4},{kind:'sets',exerciseIndices:[3,4]}]};
}

// These are conservative initial-dose ceilings, not a reason to manufacture longer sessions.
// A larger target consumes a deterministic prefix of small dose changes, so existing work never shrinks.
export const PREVIEW_SUBSTITUTIONS={'kb-lying-triceps':'bodyweight-triceps','kb-curl':'kb-concentration-curl','band-lateral-raise':'prone-y','band-w':'prone-y','prone-w':'scapular-pushup'};
function fitTemplate(day,options,budget){
 const f=family(day),bridge=bridgeId(options);
 const requestedSpecs=f==='A'?[['pushup',4,8],['pike-pushup',3,5],['kb-lying-triceps',3,6],['chair-dip',3,6],[bridge,4,30]]:
  f==='B'?[['kb-curl',3,8],['kb-shoulder-press',3,6],['kb-deadlift',3,10],['abs-crunch',4,30],['band-lateral-raise',3,8]]:
  f==='C'?[['kb-row',3,8],['squat',4,12],[bridge,4,30]]:
  [['kb-row',3,5],['pushup',3,6],['squat',3,10],['abs-crunch',3,30],[bridge,3,30]];
 const specs=requestedSpecs.map(([id,...dose])=>[PREVIEW_SUBSTITUTIONS[id]||id,...dose]);
 const exercises=specs.map(([id])=>{
  const timed=id===bridge||id==='abs-crunch';
  return dose(id,1,timed?0:id==='pike-pushup'?3:4,timed?{[id==='abs-crunch'?'workSeconds':'holdSeconds']:20}:{});
 });
 const plan={exercises};
 if(f==='sunday')plan.blocks=[{kind:'circuit',exerciseIndices:[0,1,2],rounds:1},{kind:'sets',exerciseIndices:[3,4]}];
 const change=(index,field,value)=>{
  const previous=exercises[index][field],rounds=plan.blocks?.[0].rounds;
  exercises[index][field]=value;
  if(f==='sunday'&&index<3&&field==='sets'){
   for(let i=0;i<3;i++)exercises[i].sets=value;
   plan.blocks[0].rounds=value;
  }
  if(estimatePresetSeconds(plan)>budget){
   exercises[index][field]=previous;
   if(f==='sunday'&&index<3&&field==='sets'){for(let i=0;i<3;i++)exercises[i].sets=rounds;plan.blocks[0].rounds=rounds}
   return false;
  }
  return true;
 };
 // First establish comfortable repetitions, then add whole sets gradually.
 for(let pass=0;pass<12;pass++)for(let i=0;i<specs.length;i++){
  const e=exercises[i],field=e.holdSeconds?'holdSeconds':e.workSeconds?'workSeconds':'reps',target=specs[i][2];
  if(e[field]<target&&!change(i,field,Math.min(target,e[field]+(field==='reps'?1:5))))return plan;
 }
 for(let set=2;set<=4;set++)for(let i=0;i<specs.length;i++){
  if(f==='sunday'&&i>0&&i<3)continue;
  if(specs[i][1]>=set&&!change(i,'sets',set))return plan;
 }
 const accessories=f==='A'?[['scapular-pushup',3,8],['band-w',3,8]]:
  f==='B'?[['dead-bug',2,6],['prone-w',2,8]]:
  f==='C'?[['calf-raise',3,12],['bird-dog',3,6],['prone-w',2,8]]:
  [['plank',2,20],['prone-w',2,8]];
 for(const [requestedId,sets,reps]of accessories){
  const id=PREVIEW_SUBSTITUTIONS[requestedId]||requestedId;
  const e=dose(id,sets,id==='plank'?0:reps,id==='plank'?{holdSeconds:reps}:{});
  exercises.push(e);
  if(plan.blocks)plan.blocks.at(-1).exerciseIndices.push(exercises.length-1);
  if(estimatePresetSeconds(plan)>budget){
   exercises.pop();if(plan.blocks)plan.blocks.at(-1).exerciseIndices.pop();return plan;
  }
 }
 // Longer sessions first add a few repetitions, then sets. All changes retain
 // the starter sequence and every already allocated dose, including accessories.
 for(let pass=0;pass<6;pass++)for(let i=0;i<exercises.length;i++){
  const e=exercises[i],field=e.holdSeconds?'holdSeconds':e.workSeconds?'workSeconds':'reps';
  const ceiling=field==='reps'?(e.id==='pike-pushup'||e.id==='chair-dip'?8:12):50;
  if(e[field]<ceiling&&!change(i,field,Math.min(ceiling,e[field]+(field==='reps'?1:5))))return plan;
 }
 for(let set=2;set<=5;set++)for(let i=0;i<exercises.length;i++){
  if(f==='sunday'&&i>0&&i<3)continue;
  if(exercises[i].sets<set&&!change(i,'sets',set))return plan;
 }
 return plan;
}

function fitSaved(saved,selected,targetMinutes){
 const baseSeconds=estimatePresetSeconds(selected),baseMinutes=saved.baseTargetMinutes;
 if(targetMinutes===baseMinutes)return selected;
 const plan={exercises:selected.exercises.map(e=>({...e})),...(selected.blocks?{blocks:structuredClone(selected.blocks)}:{})};
 const originals=selected.exercises;
 const budget=targetMinutes<baseMinutes?Math.min(targetMinutes*60,baseSeconds*targetMinutes/baseMinutes):baseSeconds+(targetMinutes-baseMinutes)*60;
 if(targetMinutes<baseMinutes){
  for(const e of plan.exercises){e.sets=1;if(e.holdSeconds)e.holdSeconds=Math.min(5,e.holdSeconds);else if(e.workSeconds)e.workSeconds=Math.min(5,e.workSeconds);else e.reps=1}
  for(const block of plan.blocks||[])if(block.kind==='circuit')block.rounds=1;
 }
 const update=(i,field,value)=>{
  const before=structuredClone(plan),circuit=plan.blocks?.find(b=>b.kind==='circuit'&&b.exerciseIndices.includes(i));
  plan.exercises[i][field]=value;
  if(circuit&&field==='sets'){circuit.rounds=value;for(const index of circuit.exerciseIndices)plan.exercises[index].sets=value}
  if(estimatePresetSeconds(plan)>budget){plan.exercises=before.exercises;if(before.blocks)plan.blocks=before.blocks;return false}
  return true;
 };
 // A deterministic path from minimum doses to the edited snapshot, then above it.
 // Stop at the first unaffordable change; skipping it could make longer targets
 // reallocate work away from an exercise that was already prescribed.
 for(let pass=0;pass<300;pass++)for(let i=0;i<plan.exercises.length;i++){
  const e=plan.exercises[i],field=e.holdSeconds?'holdSeconds':e.workSeconds?'workSeconds':'reps';
  const ceiling=targetMinutes<baseMinutes?originals[i][field]:Math.max(originals[i][field],field==='reps'?16:90);
  if(e[field]<ceiling&&!update(i,field,Math.min(ceiling,e[field]+1)))return plan;
 }
 for(let sets=2;sets<=30;sets++)for(let i=0;i<plan.exercises.length;i++){
  const circuit=plan.blocks?.find(b=>b.kind==='circuit'&&b.exerciseIndices.includes(i));
  if(circuit&&circuit.exerciseIndices[0]!==i)continue;
  const ceiling=targetMinutes<baseMinutes?originals[i].sets:Math.max(originals[i].sets,6);
  if(plan.exercises[i].sets<sets&&sets<=ceiling&&!update(i,'sets',sets))return plan;
 }
 return plan;
}

/**
 * Snapshot validation result: {ok:true,preset:<fresh plain clone>} or {ok:false,error:<message>}.
 * Store only returned preset. Hydration always restores equipment/side metadata from EXERCISES.
 */
export function normalizeSavedPreset(input){
 const fail=error=>({ok:false,error});
 if(!input||typeof input!=='object'||Array.isArray(input))return fail('프리셋 객체가 필요합니다.');
 if(typeof input.id!=='string'||!input.id.trim()||input.id.length>100||typeof input.name!=='string'||!input.name.trim()||input.name.length>100)return fail('프리셋 이름과 ID를 확인해 주세요.');
 if(!Array.isArray(input.exercises)||!input.exercises.length||input.exercises.length>20)return fail('운동은 1~20개여야 합니다.');
 const exercises=[];
 for(const row of input.exercises){
  if(!row||typeof row!=='object')return fail('운동 형식이 잘못되었습니다.');
  const canonical=EXERCISES.find(e=>e.id===row.id);if(!canonical)return fail('등록되지 않은 운동입니다.');
  if(('eachSide'in row&&row.eachSide!==Boolean(canonical.eachSide))||('equipment'in row&&row.equipment!==canonical.equipment)||('weight'in row&&row.weight!==canonical.weight)||('count'in row&&row.count!==canonical.count))return fail('운동 장비와 좌우 정보는 바꿀 수 없습니다.');
  const integer=(n,min,max)=>typeof n==='number'&&Number.isInteger(n)&&n>=min&&n<=max;
  if(!integer(row.sets,1,30)||!integer(row.reps,0,100))return fail('세트와 반복 수를 확인해 주세요.');
  const out={id:row.id,sets:row.sets,reps:row.reps};
  for(const field of ['holdSeconds','workSeconds','cycleSeconds'])if(row[field]!==undefined){
   if(typeof row[field]!=='number'||!Number.isFinite(row[field])||row[field]<=0||row[field]>(field==='cycleSeconds'?15:300))return fail('운동 시간을 확인해 주세요.');
   out[field]=row[field];
  }
  if(!out.reps&&!out.holdSeconds&&!out.workSeconds)return fail('반복 수 또는 운동 시간이 필요합니다.');
  if(out.holdSeconds&&out.workSeconds)return fail('유지 시간과 반복 시간을 동시에 지정할 수 없습니다.');
  if(canonical.eachSide)out.eachSide=true;
  exercises.push(out);
 }
 const baseTargetMinutes=input.baseTargetMinutes??input.targetMinutes??30;
 if(typeof baseTargetMinutes!=='number'||!Number.isFinite(baseTargetMinutes)||baseTargetMinutes<10||baseTargetMinutes>90)return fail('기준 운동 시간은 10~90분이어야 합니다.');
 const preset={id:input.id.trim(),name:input.name.trim(),baseTargetMinutes,exercises};
 if(input.blocks!==undefined){
  if(!Array.isArray(input.blocks)||!input.blocks.length||input.blocks.length>20)return fail('블록 형식이 잘못되었습니다.');
  const seen=new Set(),blocks=[];
  for(const b of input.blocks){
   if(!b||!['sets','circuit'].includes(b.kind)||!Array.isArray(b.exerciseIndices)||!b.exerciseIndices.length)return fail('블록 형식이 잘못되었습니다.');
   const ids=[];
   for(const i of b.exerciseIndices){if(!Number.isInteger(i)||i<0||i>=exercises.length||seen.has(i))return fail('블록 운동 순서를 확인해 주세요.');seen.add(i);ids.push(i)}
   const out={kind:b.kind,exerciseIndices:ids};
   if(b.kind==='circuit'){
    if(!Number.isInteger(b.rounds)||b.rounds<1||b.rounds>30||ids.some(i=>exercises[i].sets!==b.rounds))return fail('서킷 라운드와 세트 수가 일치해야 합니다.');
    out.rounds=b.rounds;
   }
   blocks.push(out);
  }
  if(seen.size!==exercises.length)return fail('모든 운동이 블록에 포함되어야 합니다.');
  preset.blocks=blocks;
 }
 return {ok:true,preset};
}

export function createPresetPlan(day=1,level=0,options={}){
 day=safeDay(day);level=Math.floor(clamp(level,0,12));
 const schedule=PRESET_SCHEDULE[day-1],targetMinutes=Math.round(day===7?clamp(options.targetMinutes??35,30,40,35):clamp(options.targetMinutes??30,10,90,30));
 const doseMode=options.doseMode==='goal'?'goal':'fit',bridgeVariant=options.bridgeVariant==='glute'?'glute':'reverse';
 const original=goalTemplate(day,{bridgeVariant}),notes=[];if(day===7)notes.push('일요일은 30~40분으로 제한합니다. 목표 서킷도 10→4라운드로 조정하고 복근·리버스 플랭크는 유지합니다.');
 let selected,saved;
 if(options.savedPreset){
  const result=normalizeSavedPreset(options.savedPreset);
  if(!result.ok)throw new TypeError(result.error);
  saved=result.preset;
  selected={exercises:saved.exercises.map(e=>dose(e.id,e.sets,e.reps,e)),...(saved.blocks?{blocks:saved.blocks}:{} )};
  if(doseMode==='fit')selected=fitSaved(saved,selected,targetMinutes);
 }else selected=doseMode==='goal'?original:fitTemplate(day,{bridgeVariant},targetMinutes*60-60);
 // Keep a fixed sixty-second reserve at every level. This prevents progress from removing
 // sets at a duration boundary. Only one timed core movement gains one second each level.
 if(doseMode==='fit'&&level){
  const timed=selected.exercises.find(e=>e.holdSeconds||e.workSeconds);
  if(timed){const field=timed.holdSeconds?'holdSeconds':'workSeconds';timed[field]+=level*Math.min(1,timed[field]*.01)}
  else if(selected.exercises.length){const e=selected.exercises[0];e.cycleSeconds=Math.round(e.cycleSeconds*(1+level*.01)*1000)/1000;notes.push('완료 단계마다 첫 동작의 제어 템포를 1%씩 천천히 진행합니다.');}
 }
 if(doseMode==='fit'&&!saved)notes.push('정확한 그림에 맞춰 누운 케틀벨 삼두→맨몸 삼두, 컬→원암 컨센트레이션 컬, 밴드 사이드 레이즈→프론 Y 레이즈로 대체합니다. 요청 동작은 원안 목표에 보존합니다.');
 if(doseMode==='fit')notes.push('일반인 시작량으로 조절했습니다. 남는 시간을 추가 휴식으로 채우지 않습니다.');
 notes.push('세트 사이 30초 · 운동 전환 60초 · 한쪽 운동은 양쪽 시간 포함');
 if(family(day)==='A')notes.push('원래 목표에서 횟수가 없는 파이크와 삼두·딥스는 각각 6회로 산정했습니다.');
 if(family(day)==='B'||family(day)==='C')notes.push('원래 목표에서 세트·횟수가 없는 근력 동작은 3세트의 보수적인 반복 수로 산정했습니다.');
 const plan={kind:'preset',mainOnly:true,presetId:saved?.id||options.presetId||'user-week',doseMode,bridgeVariant,day,level,key:presetTrackKey(day,{...options,doseMode,bridgeVariant}),title:saved?.name||schedule.name+'요일 · '+schedule.title,targets:[...schedule.targets],regions:[...schedule.targets],targetMinutes,...selected,notes,
  originalGoals:{exercises:original.exercises.map(e=>({id:e.id,sets:e.sets,reps:e.reps,...(e.holdSeconds?{holdSeconds:e.holdSeconds}:{}),...(e.workSeconds?{workSeconds:e.workSeconds}:{}),...(e.eachSide?{eachSide:true}:{})})),...(original.blocks?{blocks:original.blocks}:{}),estimatedSeconds:estimatePresetSeconds(original)}};
 plan.steps=buildPresetSteps(plan);plan.estimatedSeconds=estimatePresetSeconds(plan);plan.estimatedMinutes=Math.round(plan.estimatedSeconds/6)/10;
 plan.overflowSeconds=Math.max(0,plan.estimatedSeconds-targetMinutes*60);plan.overflow=plan.overflowSeconds>0;
 plan.remainingSeconds=Math.max(0,targetMinutes*60-plan.estimatedSeconds);
 if(plan.overflow)notes.push('목표 시간보다 '+Math.ceil(plan.overflowSeconds/60)+'분 깁니다. 실제 예상 시간을 확인해 주세요.');
 return plan;
}

