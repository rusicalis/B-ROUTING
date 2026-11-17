import {hasExercisePreview} from './exercise-media-data.mjs';
import {EXERCISES,REGIONS} from './workout-engine.mjs';
export const PROGRAM_TARGETS=REGIONS.filter(r=>r.id!=='full');
export const WEEKLY_SCHEDULE=[
 {day:1,name:'월',title:'밀기 A',targets:['chest','shoulders','triceps'],rest:60,moves:[['pushup',3,10],['kb-floor-press',2,8],['pike-pushup',3,8],['scapular-pushup',2,12],['band-triceps',3,8]]},
 {day:2,name:'화',title:'당기기 + 다리 A',targets:['back','biceps','lowerback','legs'],rest:45,moves:[['kb-row',3,10],['band-curl',2,10],['kb-deadlift',3,12],['reverse-lunge',2,8],['back-extension',3,10]]},
 {day:3,name:'수',title:'밀기 B',targets:['chest','shoulders','triceps'],rest:60,moves:[['wide-pushup',3,10],['close-pushup',3,8],['pike-pushup',3,8],['kb-floor-press',2,8],['band-triceps',2,8]]},
 {day:4,name:'목',title:'당기기 + 다리 B',targets:['back','biceps','lowerback','legs'],rest:45,moves:[['kb-row',3,12],['kb-sumo',3,12],['split-squat',2,8],['kb-curl',3,10],['bird-dog',2,8]]},
 {day:5,name:'금',title:'밀기 C',targets:['chest','shoulders','triceps'],rest:60,moves:[['pushup',3,8,'slow'],['kb-floor-press',3,8],['pike-pushup',3,8],['scapular-pushup',2,12],['band-triceps',2,8]]},
 {day:6,name:'토',title:'당기기 C',targets:['back','biceps','lowerback'],rest:45,moves:[['kb-row',4,10],['kb-curl',3,12],['band-curl',3,10],['back-extension',3,12],['back-hold',2,25]]},
 {day:7,name:'일',title:'다리 C',targets:['legs'],rest:45,moves:[['kb-goblet',3,12],['reverse-lunge',3,8],['split-squat',2,8],['bridge',3,15],['calf-raise',3,15]]},
];
export function weeklyCoverage(){return Object.fromEntries(PROGRAM_TARGETS.map(r=>[r.id,WEEKLY_SCHEDULE.filter(day=>day.targets.includes(r.id)).length]))}
export function estimateSeconds(exercises){return Math.round(exercises.reduce((total,e)=>total+e.sets*(e.holdSeconds||e.workSeconds||e.reps*(e.cycleSeconds||4))*(e.eachSide?2:1)+e.sets*e.rest,0)-(exercises.at(-1)?.rest||0))}
export function createWeeklyPlan(day=1,level=0){
 const schedule=WEEKLY_SCHEDULE[Math.max(0,Math.min(6,Number(day)-1))]||WEEKLY_SCHEDULE[0],safeLevel=Math.max(0,Math.min(12,Math.floor(Number(level)||0))),count=schedule.moves.length;
 const exercises=schedule.moves.map(([id,sets,reps,tempo],i)=>{const source=EXERCISES.find(e=>e.id===id),added=Math.max(0,Math.floor((safeLevel+count-1-i)/count));return {...source,sets,reps:Math.min(16,reps+added),rest:schedule.rest,cycleSeconds:tempo==='slow'?5:4,tempo:tempo||'normal',level:safeLevel}});
 const seconds=estimateSeconds(exercises);
 return {kind:'weekly',key:'weekly:day-'+schedule.day,title:schedule.name+'요일 · '+schedule.title,day:schedule.day,targets:schedule.targets,regions:schedule.targets,level:safeLevel,exercises,estimatedSeconds:seconds,estimatedMinutes:Math.round(seconds/60*10)/10,mainOnly:true};
}
export function createCardioPlan(level=0){const safeLevel=Math.max(0,Math.min(12,Math.floor(Number(level)||0))),exercises=['quiet-march','step-jack','shadow-punch','side-step','standing-knee'].filter(hasExercisePreview).map(id=>({...EXERCISES.find(e=>e.id===id),sets:4,workSeconds:50+Math.min(10,safeLevel),reps:0,rest:15,cycleSeconds:id==='shadow-punch'?1.2:id==='quiet-march'?1.6:2,level:safeLevel})),seconds=estimateSeconds(exercises);return {kind:'cardio',key:'cardio:quiet',title:'체지방 관리 · 조용한 유산소',targets:[],regions:['full'],exercises,level:safeLevel,estimatedSeconds:seconds,estimatedMinutes:Math.round(seconds/60*10)/10,circuit:true,mainOnly:true}}
export function seoulWeekday(date=new Date()){return {Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6,Sun:7}[new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',weekday:'short'}).format(date)]}
