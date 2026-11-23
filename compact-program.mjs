import {EXERCISES} from './workout-engine.mjs';
import {hasExercisePreview} from './exercise-media-data.mjs';
import {planIntensity,normalizeIntensity} from './intensity-policy.mjs';
export {normalizeIntensity,scaleExerciseDose} from './intensity-policy.mjs';

// Compact plans deliberately keep a small, reviewed movement menu. Longer sessions
// grow these doses rather than introducing unrelated exercise types.
const clamp=(value,min,max,fallback=min)=>Math.max(min,Math.min(max,Number.isFinite(Number(value))?Number(value):fallback));
const safeDay=value=>Math.floor(clamp(value,1,7));
const family=day=>day===7?'sunday':['push','pull','shoulders-legs'][(day-1)%3];
const weekdays=['월','화','수','목','금','토','일'];
const targetsFor=day=>day===7?['shoulders','chest','legs']:[['chest','triceps','core'],['back','biceps','core'],['shoulders','legs','core']][(day-1)%3];
const titles=['가슴 · 삼두 · 복근','등 · 이두 · 복근','어깨 · 다리 · 복근'];

export const COMPACT_SCHEDULE=weekdays.map((name,i)=>({day:i+1,name,title:i===6?'파이크 · 푸시업 · 스쿼트 무한 서킷':titles[i%3],targets:[...targetsFor(i+1)]}));

export const RECOMMENDED_PRESETS=[
 {id:'user-week',name:'기본 · 부위별 집중',description:'월·목 가슴·삼두·복근 / 화·금 등·이두·복근 / 수·토 어깨·다리·복근. 부위당 1~2종목을 반복합니다.',default:true},
 {id:'compact-basic',name:'추천 · 핵심 동작 집중',description:'같은 주간 분할에서 하루 4~5종목에 집중합니다. 종목을 줄이고 세트와 반복으로 선택 시간을 채웁니다.'},
];
const presetId=options=>RECOMMENDED_PRESETS.some(p=>p.id===options.presetId)?options.presetId:'user-week';

export function compactTrackKey(day=1,options={}){
 return ['preset','compact-v1',presetId(options),family(safeDay(day))].join(':');
}

function movement(id){
 const source=EXERCISES.find(e=>e.id===id);
 if(!source||!hasExercisePreview(id)||!['bodyweight','kettlebell'].includes(source.equipment)||source.jumping)throw new RangeError('Unsupported compact exercise: '+id);
 return {...source,groups:[...source.groups],cues:[...source.cues],sets:2,reps:source.equipment==='kettlebell'?6:8,rest:30,cycleSeconds:4,tempo:'normal',
  ...(source.holdSeconds?{reps:0,holdSeconds:30}:{}),...(source.workSeconds?{reps:0,workSeconds:40}:{})};
}

function selectExercises(day,level,id){
 const f=family(day),basic=id==='compact-basic';
 let ids=f==='push'?['pushup',...(!basic?['wide-pushup']:[]),'bodyweight-triceps','abs-crunch','plank']:
  f==='pull'?['kb-row',...(!basic?['prone-y']:[]),'kb-concentration-curl','abs-crunch','plank']:
  ['pike-pushup',...(!basic?['kb-shoulder-press']:[]),'squat','kb-deadlift','abs-crunch','plank'];
 // These are earned substitutions, never catalog novelty or a calendar rotation.
 if(level>=4){
  const before=f==='shoulders-legs'?'squat':'plank',after=f==='shoulders-legs'?'kb-goblet':'side-plank';
  ids=ids.map(x=>x===before?after:x);
 }
 return ids.map(movement);
}

export function buildCompactSteps(plan){
 if(plan.infinite)return plan.exercises.map((_,exerciseIndex)=>({exerciseIndex,set:1,round:1,restAfter:exerciseIndex===plan.exercises.length-1?30:0}));
 const steps=[];
 for(let exerciseIndex=0;exerciseIndex<plan.exercises.length;exerciseIndex++){
  const e=plan.exercises[exerciseIndex];
  for(let set=1;set<=e.sets;set++)steps.push({exerciseIndex,set,restAfter:set===e.sets?60:30});
 }
 if(steps.length)steps.at(-1).restAfter=0;
 return steps;
}

export function estimateCompactSeconds(plan){
 return buildCompactSteps(plan).reduce((sum,step)=>{
  const e=plan.exercises[step.exerciseIndex];
  return sum+(e.holdSeconds||e.workSeconds||e.reps*e.cycleSeconds)*(e.eachSide?2:1)+step.restAfter;
 },0);
}

function fitDuration(exercises,seconds){
 const plan={exercises};
 const update=(e,field,value)=>{
  const before=e[field];e[field]=value;
  if(estimateCompactSeconds(plan)>seconds){e[field]=before;return false}
  return true;
 };
 let stopped=false;
 for(let stage=3;stage<=12&&!stopped;stage++){
  // Keep early work sets modest. Longer choices first repeat familiar doses,
  // then gradually add controlled reps/hold time instead of extra movement types.
  for(const e of exercises){
   const field=e.holdSeconds?'holdSeconds':e.workSeconds?'workSeconds':'reps';
   const desired=field==='reps'?(e.equipment==='kettlebell'?6:8)+Math.max(0,stage-6)*(e.equipment==='kettlebell'?1:2):(field==='workSeconds'?40:30)+Math.max(0,stage-6)*5;
   if(e[field]<desired&&!update(e,field,desired)){stopped=true;break}
   // Four crunch sets leave room for a small whole-second dose increase at
   // every earned level without needing fractional timers or losing other sets.
   if(!update(e,'sets',e.id==='abs-crunch'?Math.min(stage,4):stage)){stopped=true;break}
  }
 }
 // One second of real core work per set closes the small set-size remainder.
 // This is visible prescribed work; rests stay exactly 30/60 seconds.
 for(const e of exercises.filter(e=>e.workSeconds||e.holdSeconds)){
  const field=e.workSeconds?'workSeconds':'holdSeconds';
  const ceiling=e.id==='abs-crunch'?78:90;
  while(e[field]<ceiling&&update(e,field,e[field]+1)){}
 }
 return exercises;
}

export function createCompactPlan(day=1,level=0,options={}){
 day=safeDay(day);level=Math.floor(clamp(level,0,12));
 const id=presetId(options),intensity=normalizeIntensity(options.intensity),infinite=day===7;
 const targetMinutes=[30,40,50,60].includes(Number(options.targetMinutes))?Number(options.targetMinutes):(infinite?40:30);
 let base;
 if(infinite)base=['pike-pushup','pushup','squat'].map((id,i)=>({...movement(id),sets:1,reps:[5,10,15][i]}));
 else{
  // Reserve at most 48 seconds (four sets × twelve earned levels). Each
  // comfortable completion adds one real second to each crunch set. The
  // movement menu, sets and other doses stay intact until a reviewed swap.
  base=fitDuration(selectExercises(day,level,id),targetMinutes*60-48);
  base.find(e=>e.id==='abs-crunch').workSeconds+=level;
 }
 const exercises=structuredClone(base);
 const schedule=COMPACT_SCHEDULE[day-1];
 const notes=[infinite?'파이크 5회 → 푸시업 10회 → 스쿼트 15회. 동작 사이 휴식 없이 한 바퀴 후 30초 쉬고 계속 반복합니다.':'세트 사이 30초 · 운동 전환 60초 · 한쪽 동작은 양쪽 시간 포함',
  '완료 기록으로 얻은 단계에 따라 검증된 동작만 점진적으로 바꿉니다.'];
 if(exercises.some(e=>e.requiresStableChair))notes.push('케틀벨 컨센트레이션 컬에는 흔들리지 않는 좌판이 필요합니다.');
 const plan={kind:'preset',mainOnly:true,compact:true,presetId:id,doseMode:'fit',day,level,key:compactTrackKey(day,{presetId:id}),title:schedule.name+'요일 · '+schedule.title,targets:[...schedule.targets],regions:[...schedule.targets],targetMinutes,intensity,infinite,exercises,notes,
  baseExercises:base.map(e=>({...e})),coreCount:exercises.length,challengeCount:level>=4&&!infinite?1:0};
 if(infinite)plan.blocks=[{kind:'circuit',exerciseIndices:[0,1,2],rounds:1,infinite:true}];
 return planIntensity(plan,intensity);
}
