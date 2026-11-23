import {APPEARANCE_MODES,normalizeAppearance,appearancePalette} from './appearance.mjs';
import {planIntensity} from './intensity-policy.mjs';
import {configForSession,sameRoutineConfig} from './session-config.mjs';
import {applyLiveDuration} from './live-duration.mjs';
import {createCompactPlan,compactTrackKey,COMPACT_SCHEDULE,RECOMMENDED_PRESETS} from './compact-program.mjs';
import {incompleteExerciseIndices,adjacentIncompleteExercise,queueFromExercise,applyLiveIntensity,appendCircuitRound,stepDose} from './live-session.mjs';
import {createFreeDurationPlan} from './duration-catalog.mjs';
import {createProgress,normalizeProgress,markStepComplete,remainingSteps,exerciseProgress,reopenExercise,allStepsComplete} from './session-progress.mjs';
import {getExerciseMedia,hasExercisePreview} from './exercise-media-data.mjs';
import {createPresetPlan,presetTrackKey,normalizeSavedPreset} from './preset-program.mjs';
import {ScreenAwakeController} from './screen-awake.mjs';
import {WEEKLY_SCHEDULE,createWeeklyPlan,createCardioPlan,seoulWeekday} from './weekly-program.mjs';
import { EXERCISES, REGIONS, trackKey, newTrack, migrateWorkout, normalizeRegions, recordCompletion } from './workout-engine.mjs';
import { IllustratedGuide } from './illustrated-guide.mjs';
const APP_VERSION='4.3.0';
const LOCAL_STORAGE_KEY='burning-routine-local-v150';
const DEFAULT_STATE={"version":"2.0.0","settings":{"timezone":"Asia/Seoul","defaultNotify":"exact","pushEnabled":false,"uiMode":"dark","achievementRange":30},"workoutConfig":{"schema":2,"regions":["full"],"variant":1,"mode":"auto","customIds":[]},"tasks":[{"id":"wake","title":"기상","start":"05:30","end":"05:30","days":[1,2,3,4,5],"category":"routine","notify":"exact"},{"id":"workout-weekday","title":"아침 근력운동","start":"05:35","end":"06:00","days":[1,2,3,4,5],"category":"workout","notify":"exact"},{"id":"leave-home","title":"출발","start":"06:05","end":"06:05","days":[1,2,3,4,5],"category":"routine","notify":"off"},{"id":"morning-capability","title":"공부·역량강화","start":"06:30","end":"07:00","days":[1,2,3,4,5],"category":"study","notify":"-5","variants":{"1":"도금·공정 실무","2":"생산·원가관리","3":"도금·문제해결","4":"데이터·AI","5":"관리역량·복습"}},{"id":"day-work","title":"회사 업무","start":"07:00","end":"17:00","days":[1,2,3,4,5],"category":"work","notify":"off"},{"id":"dinner","title":"저녁식사","start":"17:00","end":"17:30","days":[1,2,3,4,5],"category":"routine","notify":"off"},{"id":"overtime-work","title":"회사 잔업 업무","start":"17:30","end":"18:30","days":[1,2,3,4,5],"category":"work","notify":"exact"},{"id":"evening-focus","title":"핵심 자기계발","start":"18:30","end":"20:00","days":[1,2,3,4,5],"category":"study","notify":"exact","variants":{"1":"실무 심화","2":"프로그램 개발","3":"실무 심화","4":"프로그램 개발","5":"실무 종합"}},{"id":"english","title":"영어","start":"20:00","end":"20:25","days":[1,2,3,4,5],"category":"english","notify":"exact"},{"id":"night-practice","title":"실무 공부","start":"20:25","end":"21:00","days":[1,2,3,4,5],"category":"study","notify":"exact"},{"id":"leave-work","title":"퇴근","start":"21:00","end":"21:00","days":[1,2,3,4,5],"category":"routine","notify":"exact"},{"id":"saturday-run","title":"러닝 40~60분","start":"07:00","end":"08:00","days":[6],"category":"workout","notify":"exact"}],"completions":{},"history":[],"progression":{},"workoutPlans":{},"motions":{"pushup":{"clipStart":0,"clipEnd":0,"rev":0},"pushup-close":{"clipStart":0,"clipEnd":0,"rev":0},"row":{"clipStart":0,"clipEnd":0,"rev":0},"deadlift":{"clipStart":0,"clipEnd":0,"rev":0},"squat":{"clipStart":0,"clipEnd":0,"rev":0},"lunge":{"clipStart":0,"clipEnd":0,"rev":0},"shoulder-press":{"clipStart":0,"clipEnd":0,"rev":0},"lateral-raise":{"clipStart":0,"clipEnd":0,"rev":0},"face-pull":{"clipStart":0,"clipEnd":0,"rev":0},"curl":{"clipStart":0,"clipEnd":0,"rev":0},"triceps":{"clipStart":0,"clipEnd":0,"rev":0},"run":{"clipStart":0,"clipEnd":0,"rev":0}},"updatedAt":null,"trainingTracks":{}};
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const clone=o=>JSON.parse(JSON.stringify(o));
const pad=n=>String(n).padStart(2,'0');
let state=null,session=null,studio=null,achievementFocusKey=null;
const screenAwake=new ScreenAwakeController({onChange:status=>{const labels={off:'꺼짐',active:'화면 켜짐 유지 중',requesting:'화면 유지 요청 중',waiting:'화면 유지 대기 · 화면을 터치하면 재요청',unsupported:'이 브라우저는 화면 유지 기능을 지원하지 않습니다.',unavailable:'기기에서 화면 유지 요청을 허용하지 않았습니다.'};const label=$('#wakeLockStatus');if(label){label.textContent=labels[status]||status;label.dataset.status=status}const toggle=$('#keepScreenOn');if(toggle&&state)toggle.checked=state.settings.keepScreenOn!==false}});
document.addEventListener('pointerdown',()=>{if(state?.settings?.keepScreenOn!==false&&state)screenAwake.sync()},{passive:true});
document.addEventListener('visibilitychange',()=>screenAwake.sync());
window.addEventListener('pagehide',()=>screenAwake.dispose());
window.addEventListener('pageshow',()=>{if(state)screenAwake.setEnabled(state.settings.keepScreenOn!==false)});
$('#keepScreenOn')?.addEventListener('change',async event=>{if(!state)return;state.settings.keepScreenOn=event.target.checked;await saveState();await screenAwake.setEnabled(event.target.checked)});
const weekdayKo=['일','월','화','수','목','금','토'];
const localDate=(d=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:state?.settings?.timezone||'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
function variantTitle(task,day){return task.id==='workout-weekday'?(COMPACT_SCHEDULE[(day+6)%7]?.title||'근력')+' 운동':task.variants?.[day]||task.title}
function applyAppearance(mode){const p=appearancePalette(mode),r=document.documentElement;r.dataset.mode=p.id;for(const [name,value]of Object.entries({'--teal':p.accent,'--teal2':p.selected,'--bg':p.background,'--panel':p.panel,'--text':p.text,'--muted':p.muted,'--line':p.line}))r.style.setProperty(name,value);document.querySelector('meta[name=theme-color]')?.setAttribute('content',p.background)}
function renderAppearanceModes(){const root=$('#appearanceModes');if(!root)return;root.innerHTML=APPEARANCE_MODES.map(m=>'<label class="modeChoice '+(state.settings.uiMode===m.id?'active':'')+'" data-mode="'+m.id+'"><input type="radio" name="appearanceMode" value="'+m.id+'" '+(state.settings.uiMode===m.id?'checked':'')+'><span>'+m.name+'</span></label>').join('');for(const input of root.querySelectorAll('input'))input.onchange=async()=>{if(!input.checked)return;state.settings.uiMode=input.value;applyAppearance(state.settings.uiMode);await saveState();renderAppearanceModes()}}

function currentTasks(date=new Date()){const day=date.getDay();return state.tasks.filter(t=>t.days.includes(day)).sort((a,b)=>a.start.localeCompare(b.start)).map(t=>({...t,displayTitle:variantTitle(t,day)}))}
function isDone(taskId,date=localDate()){return !!state.completions?.[date]?.[taskId]}
async function saveState(){state.updatedAt=new Date().toISOString();state.version=APP_VERSION;localStorage.setItem(LOCAL_STORAGE_KEY,JSON.stringify(state));const status=$('#serverStatus');if(status)status.innerHTML='<span class="statusDot ok"></span>로컬 저장 정상';return true}
function markDone(task,date=localDate(),value=true){state.completions[date]=state.completions[date]||{};state.completions[date][task.id]=value;if(value)state.history.unshift({type:'task',taskId:task.id,title:task.displayTitle||task.title,date,at:new Date().toISOString()});saveState();renderToday();renderHistory()}
function currentLocalMinutes(){const f=new Intl.DateTimeFormat('en-GB',{timeZone:state?.settings?.timezone||'Asia/Seoul',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});const p=Object.fromEntries(f.formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));return Number(p.hour)*60+Number(p.minute)}
function taskMissedClient(t,done){const end=t.end||t.start;if(done||!end)return false;const [h,m]=end.split(':').map(Number);return currentLocalMinutes()>(h*60+m)}
function getAchievementSeries(days=30){const base=new Date();base.setHours(0,0,0,0);const arr=[];for(let i=days-1;i>=0;i--){const d=new Date(base);d.setDate(base.getDate()-i);const dateKey=localDate(d);const tasks=currentTasks(d);const total=tasks.length;const done=tasks.filter(t=>!!state.completions?.[dateKey]?.[t.id]).length;const rate=total?Math.round(done/total*100):0;arr.push({dateKey,date:new Date(d),label:(d.getMonth()+1)+'/'+d.getDate(),weekday:weekdayKo[d.getDay()],total,done,rate});}return arr}
function buildSmoothChartPath(points){if(!points.length)return '';if(points.length===1)return 'M '+points[0].x+' '+points[0].y;let d='M '+points[0].x+' '+points[0].y;for(let i=0;i<points.length-1;i++){const p=points[i],n=points[i+1];const mx=(p.x+n.x)/2;d+=' Q '+p.x+' '+p.y+' '+mx+' '+((p.y+n.y)/2);if(i===points.length-2)d+=' T '+n.x+' '+n.y}return d}
function currentGoalStreak(series,threshold=90){let streak=0;for(let i=series.length-1;i>=0;i--){const item=series[i];if(!item.total)continue;if(item.rate>=threshold)streak++;else break}return streak}
function setAchievementDetail(item){if(!item||!$('#achievementDetail'))return;achievementFocusKey=item.dateKey;$('#achievementDetail').innerHTML='<b>'+item.dateKey+' ('+item.weekday+')</b><br>달성율 <b>'+item.rate+'%</b> · 완료 '+item.done+'개 / 예정 '+item.total+'개';$$('.chartDot').forEach(dot=>dot.classList.toggle('active',dot.dataset.key===item.dateKey))}
function renderAchievementChart(){const root=$('#achievementChart');if(!root)return;const selectedDays=[7,30,90].includes(Number(state.settings?.achievementRange))?Number(state.settings.achievementRange):30;state.settings.achievementRange=selectedDays;$$('.rangeBtn').forEach(btn=>{const active=Number(btn.dataset.days)===selectedDays;btn.classList.toggle('active',active);btn.onclick=()=>{const days=Number(btn.dataset.days);if(![7,30,90].includes(days)||days===Number(state.settings.achievementRange))return;state.settings.achievementRange=days;achievementFocusKey=null;renderHistory();saveState()}});const series=getAchievementSeries(selectedDays);const today=series[series.length-1]||{rate:0};const active=series.find(x=>x.dateKey===achievementFocusKey)||today||series[0];const average=Math.round((series.reduce((s,x)=>s+x.rate,0)/(series.length||1))||0);const best=series.reduce((a,b)=>!a||b.rate>a.rate?b:a,null);const eligible=series.filter(x=>x.total>0);const goalDays=eligible.filter(x=>x.rate>=90).length;const streak=currentGoalStreak(getAchievementSeries(90),90);$('#achTodayRate').textContent=(today?.rate||0)+'%';$('#achWeekAvg').textContent=average+'%';$('#achBestRate').textContent=((best?.rate)||0)+'%';$('#achGoalDays').textContent=goalDays+'/'+eligible.length+'일';$('#achStreak').textContent=streak+'일';if(!series.length){root.innerHTML='<div class="emptyChart">표시할 데이터가 없습니다.</div>';$('#achievementDetail').textContent='선택 기간 달성율을 표시합니다.';return}const width=760,height=250,padL=34,padR=18,padT=18,padB=32,plotW=width-padL-padR,plotH=height-padT-padB;const points=series.map((item,i)=>({item,x:padL+(plotW*(series.length===1?0:i/(series.length-1))),y:padT+plotH-((item.rate||0)/100)*plotH}));const linePath=buildSmoothChartPath(points);const areaPath=linePath?linePath+' L '+points[points.length-1].x+' '+(padT+plotH)+' L '+points[0].x+' '+(padT+plotH)+' Z':'';const yGuides=[0,25,50,75,100].map(v=>'<line class="chartGrid" x1="'+padL+'" y1="'+(padT+plotH-(v/100)*plotH)+'" x2="'+(width-padR)+'" y2="'+(padT+plotH-(v/100)*plotH)+'"></line><text class="chartAxisText" x="4" y="'+(padT+plotH-(v/100)*plotH+4)+'">'+v+'%</text>').join('');const goalY=padT+plotH-(.9*plotH);const goalLine='<line class="chartGoalLine" x1="'+padL+'" y1="'+goalY+'" x2="'+(width-padR)+'" y2="'+goalY+'"></line><text class="chartGoalText" text-anchor="end" x="'+(width-padR)+'" y="'+(goalY-6)+'">목표 90%</text>';const labelStep=selectedDays<=7?1:(selectedDays<=30?5:15);const xLabels=series.map((item,i)=>{if(!(i===0||i===series.length-1||i%labelStep===0))return '';return '<text class="chartAxisText" text-anchor="middle" x="'+points[i].x+'" y="'+(height-8)+'">'+item.label+'</text>'}).join('');const dotR=selectedDays>=90?3.2:(selectedDays>=30?4.2:5.2);const dots=points.map(p=>'<circle class="chartDot'+((active&&active.dateKey===p.item.dateKey)?' active':'')+'" data-key="'+p.item.dateKey+'" cx="'+p.x+'" cy="'+p.y+'" r="'+dotR+'"></circle>').join('');root.innerHTML='<svg class="chartSvg" viewBox="0 0 '+width+' '+height+'" role="img" aria-label="최근 '+selectedDays+'일 달성율 그래프">'+yGuides+goalLine+'<path class="chartArea" d="'+areaPath+'"></path><path class="chartPath" d="'+linePath+'"></path>'+dots+xLabels+'</svg>';$$('.chartDot').forEach(dot=>dot.onclick=()=>{const item=series.find(x=>x.dateKey===dot.dataset.key);setAchievementDetail(item)});setAchievementDetail(active)}
function renderToday(){const day=new Date().getDay(),date=localDate(),tasks=currentTasks();const done=tasks.filter(t=>isDone(t.id,date)).length;$('#todayTitle').textContent='오늘 · '+weekdayKo[day]+'요일';$('#todaySub').textContent=date;$('#todayRate').textContent=(tasks.length?Math.round(done/tasks.length*100):0)+'%';$('#todayDone').textContent=done;$('#todayRemain').textContent=tasks.length-done;$('#todayList').innerHTML=tasks.map(t=>{const done=isDone(t.id,date),missed=taskMissedClient(t,done),simpleComplete=t.id==='saturday-run';const check='<button class="check '+(done?'on':'')+' taskCheck" data-id="'+t.id+'" aria-label="완료 체크">'+(done?'✓':'')+'</button>';const action=t.category==='workout'&&!simpleComplete?'<div class="workoutActions"><button class="btn primary workoutOpen" data-id="'+t.id+'">운동 보기</button>'+check+'</div>':check;return '<div class="todo '+(done?'done':'')+(missed?' missed':'')+'"><div class="time">'+t.start+'</div><div class="tmain"><b>'+t.displayTitle+'</b><small>'+t.end+' · '+labelCategory(t.category)+'</small></div>'+action+'</div>'}).join('');$$('.taskCheck').forEach(b=>b.onclick=()=>{const t=tasks.find(x=>x.id===b.dataset.id);markDone(t,date,!isDone(t.id,date))});$$('.workoutOpen').forEach(b=>b.onclick=()=>{switchView('workout');openTraining()});}
function labelCategory(c){return {workout:'운동',study:'역량강화',work:'업무',english:'영어',routine:'루틴'}[c]||c}
function renderTaskWeek(){const days=[1,2,3,4,5,6,0];$('#weekGrid').innerHTML=days.map(d=>{const items=state.tasks.filter(t=>t.days.includes(d)).sort((a,b)=>a.start.localeCompare(b.start));return '<div class="daycard"><h3>'+weekdayKo[d]+'요일</h3>'+items.map(t=>'<div class="dayitem"><b>'+t.start+' '+variantTitle(t,d)+'</b><span>'+t.end+'</span></div>').join('')+'</div>'}).join('')}
function renderHistory(){renderAchievementChart();const arr=state.history||[];const historyRoot=$('#historyList');if(historyRoot)historyRoot.innerHTML=arr.length?arr.slice(0,80).map(h=>'<div class="historyItem"><b>'+escapeHtml(h.title||h.type)+'</b><small>'+h.date+' · '+new Date(h.at||Date.now()).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})+'</small></div>').join(''):'<div class="empty">아직 기록이 없습니다.</div>'}
function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function initPushStatus(){if('serviceWorker'in navigator){try{await navigator.serviceWorker.register('./service-worker.js?v=430',{updateViaCache:'none'});}catch(e){console.warn('service worker',e)}}if(!('Notification'in window)){pushText(false,'이 브라우저는 알림을 지원하지 않습니다.');return}pushText(Notification.permission==='granted',Notification.permission==='granted'?'로컬 알림 활성화됨':'로컬 알림 미설정')}
function pushText(ok,text){const el=$('#pushStatus');if(el)el.innerHTML='<span class="statusDot '+(ok?'ok':'bad')+'"></span>'+text;const mini=$('#pushMini');if(mini)mini.textContent=ok?'LOCAL ON':'LOCAL OFF'}
async function showLocalNotification(title,body,url='./?view=today'){if(!('Notification'in window)||Notification.permission!=='granted')return false;try{if('serviceWorker'in navigator){const reg=await navigator.serviceWorker.ready;await reg.showNotification(title,{body,icon:'./icon-192.png',badge:'./icon-192.png',data:{url}});return true}new Notification(title,{body,icon:'./icon-192.png'});return true}catch(e){console.warn('notification',e);return false}}
function localTimeParts(){const fmt=new Intl.DateTimeFormat('en-GB',{timeZone:state?.settings?.timezone||'Asia/Seoul',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});const parts=Object.fromEntries(fmt.formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));const dayMap={Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6};return {weekday:dayMap[parts.weekday],hhmm:parts.hour+':'+parts.minute}}
function shiftHHMM(hhmm,delta){const [h,m]=String(hhmm).split(':').map(Number);const total=((h*60+m+delta)%1440+1440)%1440;return String(Math.floor(total/60)).padStart(2,'0')+':'+String(total%60).padStart(2,'0')}
async function checkLocalNotifications(){if(!state||!('Notification' in window)||Notification.permission!=='granted')return;const p=localTimeParts(),date=localDate();for(const task of state.tasks||[]){if(task.notify==='off'||!task.days?.includes(p.weekday))continue;const due=task.notify==='-5'?shiftHHMM(task.start,-5):task.start;if(due!==p.hhmm)continue;const key='burning-routine-notified:'+date+':'+task.id+':'+due;if(sessionStorage.getItem(key))continue;sessionStorage.setItem(key,'1');await showLocalNotification(task.title||'BURNING ROUTINE',task.notify==='-5'?'5분 후 예정입니다.':'지금 시작할 시간입니다.',task.category==='workout'?'./?view=workout':'./?view=today')}}
function startLocalNotificationWatcher(){checkLocalNotifications();setInterval(checkLocalNotifications,30000)}
async function deleteTask(i){if(!confirm('이 할 일을 삭제하시겠습니까?'))return;state.tasks.splice(i,1);await saveState();renderAll()}
function fmt(sec){sec=Math.max(0,Math.floor(sec));return pad(Math.floor(sec/60))+':'+pad(sec%60)}
function renderSettings(){
 const dayNames=['일','월','화','수','목','금','토'],notifyNames={exact:'정시','-5':'5분 전',off:'알림 없음'};
 const clock='<svg class="scheduleFieldIcon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></svg>',arrow='<svg class="scheduleFieldIcon" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>';
 renderAppearanceModes();
 $('#settingsTasks').innerHTML=state.tasks.map((t,i)=>'<div class="settingRow" data-i="'+i+'"><div class="taskIdentity"><input class="stitle" aria-label="할 일 이름" value="'+escapeHtml(t.title)+'"><div class="taskDays">'+t.days.map(d=>dayNames[d]).join('·')+'</div></div><div class="taskScheduleFields"><label class="taskTimeField"><span>시간</span><span class="scheduleFieldFrame timeFrame"><span class="scheduleFieldText timeValue" aria-hidden="true">'+taskTimeText(t.start)+'</span>'+clock+'<input type="time" class="stime" aria-label="시간" step="60" value="'+escapeHtml(t.start)+'"></span></label><label class="taskNotifyField"><span>알림</span><span class="scheduleFieldFrame notifyFrame"><span class="scheduleFieldText notifyValue" aria-hidden="true">'+(notifyNames[t.notify]||'정시')+'</span>'+arrow+'<select class="snotify" aria-label="알림"><option value="exact" '+(t.notify==='exact'?'selected':'')+'>정시</option><option value="-5" '+(t.notify==='-5'?'selected':'')+'>5분 전</option><option value="off" '+(t.notify==='off'?'selected':'')+'>알림 없음</option></select></span></label></div><button class="btn danger deleteTask" data-i="'+i+'" aria-label="할 일 삭제">×</button></div>').join('');
 $$('.deleteTask').forEach(b=>b.onclick=()=>deleteTask(Number(b.dataset.i)));
 for(const input of $$('#settingsTasks .stime'))input.oninput=input.onchange=()=>input.closest('.timeFrame').querySelector('.timeValue').textContent=taskTimeText(input.value);
 for(const select of $$('#settingsTasks .snotify'))select.oninput=select.onchange=()=>select.closest('.notifyFrame').querySelector('.notifyValue').textContent=notifyNames[select.value];
}
function taskTimeText(value){return /^([01]\d|2[0-3]):[0-5]\d/.test(value||'')?value.slice(0,5):'--:--'}
$('#addTask').onclick=()=>{$('#taskForm').style.display=$('#taskForm').style.display==='none'?'block':'none'};
$('#confirmAddTask').onclick=async()=>{const title=$('#newTitle').value.trim();const days=$$('.newDay:checked').map(x=>Number(x.value));if(!title||!days.length){alert('할 일 이름과 반복요일을 선택해 주세요.');return}state.tasks.push({id:'custom-'+Date.now(),title,start:$('#newStart').value,end:$('#newEnd').value,days,category:$('#newCategory').value,notify:$('#newNotify').value});$('#newTitle').value='';$('#taskForm').style.display='none';await saveState();renderAll()};
$('#enablePush').onclick=async()=>{try{if(!('Notification'in window))throw new Error('이 브라우저는 알림을 지원하지 않습니다.');const perm=await Notification.requestPermission();if(perm!=='granted')throw new Error('알림 권한이 허용되지 않았습니다.');state.settings.pushEnabled=true;await saveState();pushText(true,'로컬 알림 활성화됨')}catch(e){alert(e.message);pushText(false,'로컬 알림 설정 실패')}};
$('#testPush').onclick=async()=>{const ok=await showLocalNotification('BURNING ROUTINE','로컬 알림 테스트입니다.');alert(ok?'테스트 알림을 표시했습니다.':'먼저 로컬 알림을 활성화해 주세요.')};

// The task shell above retains the original data key and behaviour.
let previewPlan=null,previewIndex=0,clockTimer=null,lastClock=0,toastTimer=null;
const partName=id=>REGIONS.find(r=>r.id===id)?.name||({core:'복근',abs:'복근',glutes:'둔근',arms:'팔'}[id])||id;
const doseText=e=>(e.holdSeconds||e.workSeconds)?(e.holdSeconds||e.workSeconds)+'초':e.reps+(e.pairedReps?'쌍':'회');
const equipmentText=e=>e.equipment==='chair'?'벽에 고정한 의자':e.equipment==='kettlebell'?'12kg 케틀벨 1개':e.equipment==='band'?'60cm 일자 밴드':'기구 없는 맨몸';
const regionTitle=()=>state?.workoutConfig?.mode==='preset'?COMPACT_SCHEDULE[state.workoutConfig.planDay-1].title:state?.workoutConfig?.mode==='weekly'?WEEKLY_SCHEDULE[state.workoutConfig.planDay-1].title:state?.workoutConfig?.mode==='cardio'?'조용한 유산소':normalizeRegions(state?.workoutConfig?.regions).map(partName).join(' · ');
const trainingActive=()=>session&&['prep','work','rest','feedback'].includes(session.phase);
function toast(message){$('#trainingToast').textContent=message;$('#trainingToast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#trainingToast').classList.remove('show'),4000)}
function currentTrackKey(){const c=state.workoutConfig;return c.mode==='preset'?(state.savedPresets.some(p=>p.id===c.presetId)?presetTrackKey(c.planDay,c):compactTrackKey(c.planDay,c)):trackKey(c)}
function track(){const key=currentTrackKey();return state.trainingTracks[key]||(state.trainingTracks[key]=newTrack())}
function currentPlan(){
 const c=state.workoutConfig,level=track().level,saved=state.savedPresets.find(p=>p.id===c.presetId),normal={...c,intensity:'normal'};
 const base=c.mode==='preset'?(saved?createPresetPlan(c.planDay,level,{...normal,savedPreset:saved}):createCompactPlan(c.planDay,level,normal)):c.mode==='weekly'?createCompactPlan(c.planDay,level,normal):c.mode==='cardio'?{...createCardioPlan(level,c.targetMinutes),targetMinutes:c.targetMinutes}:timedFreePlan(normal,level);
 return planIntensity(base,c.intensity||'normal');
}
function saveDraft(){
  if(!session||!['prep','work','rest','feedback'].includes(session.phase)){delete state.activeWorkout;return}
  normalizeProgress(session);session.confirmed=session.completedStepIds.length;state.activeWorkout={...session,paused:true,phase:session.phase==='prep'?'work':session.phase};saveState();
}
function renderAll(){renderToday();renderWeek();renderHistory();renderSettings();renderWorkoutBuilder()}
function renderWorkoutBuilder(){
  syncTrainingLayout();
  const c=state.workoutConfig,t=track(),p=selectedSettingsPlan();renderProgramBuilder(p);
  $('#bodyweightCount').textContent=EXERCISES.filter(e=>hasExercisePreview(e.id)).length+' EXERCISES';
  $('#regionPicker').innerHTML=REGIONS.map(r=>`<button class="regionButton ${c.regions.includes(r.id)?'active':''}" data-region="${r.id}" aria-pressed="${c.regions.includes(r.id)}"><b>${r.name}</b><small>${r.en}</small></button>`).join('');
  $$('[data-region]').forEach(b=>b.onclick=async()=>{
    pauseForSettingsEdit();
    const id=b.dataset.region;c.regions=id==='full'?['full']:normalizeRegions(c.regions.includes('full')?[id]:c.regions.includes(id)?c.regions.filter(x=>x!==id):[...c.regions,id]);c.mode='auto';c.selectionDate=localDate();await saveState();refreshRoutineSelection();
  });
  $$('[data-variant]').forEach(b=>{b.classList.toggle('active',c.variant===Number(b.dataset.variant)&&c.mode!=='custom');b.setAttribute('aria-pressed',String(c.variant===Number(b.dataset.variant)&&c.mode!=='custom'));b.onclick=async()=>{pauseForSettingsEdit();c.variant=Number(b.dataset.variant);c.mode='auto';c.selectionDate=localDate();await saveState();refreshRoutineSelection()}});
  $('#trainingLevel').textContent='LEVEL '+pad(t.level+1);
  $('#levelDots').innerHTML=Array.from({length:13},(_,i)=>`<i class="${i<=t.level?'filled':''}" title="${i+1}단계"></i>`).join('');
  $('#trackSummary').textContent=t.completed?`${t.completed}회 완료 · 마지막 운동 ${t.lastCompletedDate}`:'첫 번째 완료를 기다리고 있어요';
  $('#routineTitle').textContent=p.title||regionTitle()+' · '+(c.mode==='custom'?'사용자 루틴':'루틴 '+c.variant);$('#compactRoutineName').textContent=configurationSession()?session.plan.title:$('#routineTitle').textContent;
  $('#routineSummary').textContent=p.infinite?'3개 동작 · 30초 휴식 · 무제한 반복':`${p.exercises.length}개 동작 · 약 ${p.estimatedMinutes}분 · 본운동`;
  $('#workoutDayLabel').textContent=p.infinite?'본운동 · 5 / 10 / 15회 · 라운드 뒤 30초 휴식':'본운동 · 부위당 1~2개 동작 · 세트 30초 / 운동 전환 1분 휴식';
  const select=$('#bodyweightExerciseSelect'),value=select.value;
  const filtered=EXERCISES.filter(e=>hasExercisePreview(e.id)&&(c.regions.includes('full')||c.regions.some(r=>e.groups.includes(r))));
  select.innerHTML=filtered.map(e=>`<option value="${e.id}">${e.name}${e.advanced?' · 숙련자':''} · ${e.equipment==='kettlebell'?'12kg × 1':e.equipment==='band'?'60cm 일자 밴드':e.equipment==='chair'?'고정 의자':'맨몸'}</option>`).join('');if(filtered.some(e=>e.id===value))select.value=value;
  $('#customWorkoutList').innerHTML=c.customIds.map(id=>{const e=EXERCISES.find(x=>x.id===id);return `<div class="routineItem"><b>${e.name}</b><button class="btn danger" data-remove="${id}" aria-label="${e.name} 삭제">×</button></div>`}).join('');
  $$('[data-remove]').forEach(b=>b.onclick=async()=>{pauseForSettingsEdit();c.customIds=c.customIds.filter(id=>id!==b.dataset.remove);c.mode='custom';await saveState();refreshRoutineSelection()});
  if(!configurationSession()&&p.exercises.length){previewPlan=p;renderExerciseRail()}else renderSettingsExerciseRail(p);$('#autoGenerateWorkout').disabled=c.mode==='custom'&&!c.customIds.length;$('#applyCustomWorkout').disabled=!c.customIds.length;
}
function renderExerciseRail(){
 const p=configurationSession()?session.plan:previewPlan;if(!p)return;
 const active=configurationSession()?session.steps[session.index]?.exerciseIndex:previewIndex;
 $('#mobileExerciseSelect').innerHTML=p.exercises.map((e,i)=>'<option value="'+i+'">'+(i+1)+'. '+escapeHtml(e.name)+'</option>').join('');$('#mobileExerciseSelect').value=String(active||0);
 renderSettingsExerciseRail();
}
function renderSettingsExerciseRail(p=selectedSettingsPlan()){
 $('#exerciseRail').innerHTML=p.exercises.length?p.exercises.map((e,i)=>'<button class="exerciseTile '+(!configurationSession()&&i===previewIndex?'active':'')+'" data-preview="'+i+'" data-exercise-id="'+e.id+'"><span class="tileNumber">'+pad(i+1)+'<small>'+(e.equipment==='kettlebell'?'12kg':e.equipment==='band'?'BAND':e.equipment==='chair'?'CHAIR':'BW')+'</small></span><b>'+escapeHtml(e.name)+'</b><span>'+e.sets+'세트 × '+doseText(e)+(e.eachSide?' / 측':'')+'</span><i>'+e.groups.map(partName).join(' · ')+'</i></button>').join(''):'<p class="emptyRoutine">운동을 추가해 주세요.</p>';
 $$('[data-preview]').forEach(b=>b.onclick=()=>{if(configurationSession()){for(const tile of $$('[data-preview]'))tile.classList.toggle('active',tile===b);return}previewIndex=Number(b.dataset.preview);showExercise(previewPlan.exercises[previewIndex],previewIndex);renderExerciseRail()});
}
function selectedSettingsPlan(){const p=currentPlan();return state.workoutConfig.mode==='custom'&&!state.workoutConfig.customIds.length?{...p,title:'직접 운동 선택',exercises:[],estimatedMinutes:0}:p}
function configurationSession(){return session&&['prep','work','rest','feedback','stopped'].includes(session.phase)}
function pauseForSettingsEdit(){if(session&&['work','rest'].includes(session.phase)&&!session.paused)togglePause();else if(session?.phase==='prep'){session.phase='work';session.paused=true;session.prepMs=0;$('#prepOverlay').classList.remove('show');$('#pauseWorkout').disabled=false;updateGuideContext();syncDiagramControls();saveDraft()}}
function refreshRoutineSelection(){if(!configurationSession())prepareWorkout();renderWorkoutBuilder()}
async function applySelectedRoutine(){
 if(state.workoutConfig.mode==='custom'&&!state.workoutConfig.customIds.length){toast('운동을 추가해 주세요.');return}
 if(session?.phase==='feedback'){switchView('workout');$('#completionFeedback').scrollIntoView({behavior:'smooth',block:'center'});toast('완료한 운동의 기록을 먼저 저장해 주세요.');return}
 if(configurationSession()&&sameRoutineConfig(configForSession(session),state.workoutConfig)){switchView('workout');syncTrainingLayout();return}
 if(configurationSession()){
  normalizeProgress(session);state.unfinishedWorkouts=(state.unfinishedWorkouts||[]).filter(attempt=>attempt.id!==session.id);
  if(!allStepsComplete(session))state.unfinishedWorkouts.unshift(clone({...session,paused:true,archivedReason:'routine-replaced'}));state.unfinishedWorkouts=state.unfinishedWorkouts.slice(0,30);
  clearInterval(clockTimer);session=null;delete state.activeWorkout;
 }
 state.settings.compactWorkout=true;prepareWorkout();renderWorkoutBuilder();await saveState();switchView('workout');window.scrollTo({top:0,behavior:'smooth'});
}

function ensureStudio(){
  if(studio&&!studio.failed)return;
  if(studio)studio.dispose();
  $('#motionCanvas').replaceChildren();$('#motionEmpty').classList.remove('show');$('#workout').classList.remove('studioUnavailable');
  studio=new IllustratedGuide($('#motionCanvas'),()=>{$('#workout').classList.add('studioUnavailable');$('#motionEmpty').classList.add('show')},()=>{$('#workout').classList.remove('studioUnavailable');$('#motionEmpty').classList.remove('show')});
  studio.active=$('#workout').classList.contains('active');
}
function showExercise(e,index,set=0){
  $('#exerciseNumber').textContent='MOVEMENT '+pad(index+1)+' / '+pad((trainingActive()?session.plan:previewPlan).exercises.length);
  $('#woExercise').textContent=e.name;$('#mobileExerciseName').textContent=e.name;$('#mobileExerciseDose').textContent=(session?.plan?.infinite&&trainingActive()?'라운드 '+(session.steps[session.index]?.round||1)+' · ':e.sets+'세트 × ')+doseText(e)+(e.eachSide?' / 측':'');$('#woCue').textContent=e.cue;
  $('#woPart').textContent=equipmentText(e);
  $('#woRest').textContent='휴식 '+e.rest+'초';$('#woSet').textContent=set?`세트 ${set} / ${e.sets}`:e.sets+'세트';
  $('#woReps').textContent=(doseText(e))+(e.eachSide?' / 측':'');
  $('#woTempo').textContent=e.workSeconds?'시간 인터벌':e.holdSeconds?'자세 유지':(e.tempo==='slow'?'느린 템포 · ':'')+e.cycleSeconds+'초 / 회';
  $('#formCues').innerHTML=e.cues.map(c=>'<li>'+escapeHtml(c)+'</li>').join('');
  $('#muscleText').textContent=e.groups.map(partName).join(' · ');
  $('#studioEquipment').textContent=e.equipment==='kettlebell'?'SINGLE KETTLEBELL · 12KG':e.equipment==='band'?'STRAIGHT BAND · 60CM':e.equipment==='chair'?'STABLE CHAIR':'BODYWEIGHT';
  const alternatives={'kb-floor-press':'knee-pushup','kb-row':'prone-w','kb-goblet':'squat','kb-sumo':'squat','kb-deadlift':'good-morning','kb-curl':'close-knee','kb-suitcase':'side-plank'};
  $('#exerciseAlternative').innerHTML=e.equipment==='kettlebell'&&alternatives[e.id]?`12kg이 부담스럽다면 <button data-alternative="${alternatives[e.id]}">맨몸 동작으로 변경 ↗</button>`:'';
  const alt=$('[data-alternative]');if(alt)alt.onclick=async()=>{if(trainingActive()){toast('진행 중에는 운동을 변경할 수 없습니다. 종료 후 변경해 주세요.');return}state.workoutConfig.customIds=previewPlan.exercises.map((x,i)=>i===previewIndex?alt.dataset.alternative:x.id);state.workoutConfig.mode='custom';await saveState();prepareWorkout();renderWorkoutBuilder();toast('맨몸 동작으로 바꾼 사용자 루틴을 적용했습니다.')};
  ensureStudio();studio.setExercise(e);updateGuideContext();
  $('#previewToggle').disabled=trainingActive();$('#previewSpeed').disabled=trainingActive();$('#previewScrub').disabled=trainingActive();syncDiagramControls();
}
function prepareWorkout(){
  if(trainingActive())return;
  followTodayProgram();
  clearInterval(clockTimer);session=null;previewPlan=currentPlan();previewIndex=0;
  showExercise(previewPlan.exercises[0],0);renderExerciseRail();resetControls();renderRecovery();renderOrder();
  $('#progressDetail').textContent=track().lastCompletedDate===localDate()?'오늘 완료 기록이 있어요. 다시 운동할 수 있지만 오늘 단계는 중복 상승하지 않습니다.':'기본 동작부터 시작 · 편안한 완료 기록에 따라 수량과 난도를 단계적으로 조절';
}
function resetControls(){
  syncTrainingLayout();
  $('#startWorkout').hidden=false;$('#startWorkout').disabled=false;$('#startWorkout').textContent='운동 시작 →';$('#startWorkout').onclick=beginWorkout;
  $('#nextWorkout').disabled=true;$('#pauseWorkout').disabled=true;$('#pauseWorkout').textContent='일시정지';$('#stopWorkout').hidden=true;$('#skipRest').hidden=true;$('#skipRest').disabled=false;
  $('#completionFeedback').hidden=true;$('#prepOverlay').classList.remove('show');
  $('#phaseLabel').textContent='미리보기';$('#phaseRemain').textContent='자세를 먼저 확인해 주세요';$('#currentRep').textContent='01';$('#sideLabel').textContent='동작 가이드';$('#elapsed').textContent='00:00';$('#remain').textContent='00:00';updateSessionProgress();
}
function updateSessionProgress(){const confirmed=session?.confirmed||0,total=session?.sourceSteps?.length||previewPlan?.steps?.length||previewPlan?.exercises.reduce((n,e)=>n+e.sets,0)||0,infinite=session?.plan?.infinite;const pct=total?Math.round(confirmed/total*100):0;$('#sessionProgressText').textContent=infinite?Math.floor(confirmed/3)+'라운드 완료 · '+confirmed+'세트':confirmed+' / '+total+'세트 완료';$('#sessionProgressPercent').textContent=infinite?'∞':pct+'%';$('#sessionProgressBar').value=pct}
function beginWorkout(){
 if(state.workoutConfig.mode==='custom'&&!state.workoutConfig.customIds.length){switchView('settings');$('#bodyweightExerciseSelect').focus();toast('운동을 추가해 주세요.');return}
  screenAwake.sync();$('#trainingToast').classList.remove('show');
  if(session?.phase==='done')prepareWorkout();
  if(trainingActive())return;
  if(followTodayProgram()){prepareWorkout();renderWorkoutBuilder()}
  const plan=clone(previewPlan),steps=[];if(plan.steps?.length)steps.push(...plan.steps);else if(plan.circuit){for(let s=1;s<=Math.max(...plan.exercises.map(e=>e.sets));s++)plan.exercises.forEach((e,i)=>{if(s<=e.sets)steps.push({exerciseIndex:i,set:s})})}else plan.exercises.forEach((e,i)=>{for(let s=1;s<=e.sets;s++)steps.push({exerciseIndex:i,set:s})});
  const progress=createProgress(plan,steps);session={id:crypto.randomUUID(),date:localDate(),trackKey:currentTrackKey(),config:clone(state.workoutConfig),presetSnapshot:clone(state.workoutConfig.mode==='preset'?state.savedPresets.find(p=>p.id===plan.presetId)||null:null),plan,...progress,steps:progress.sourceSteps.map(s=>({...s})),index:0,intensity:plan.intensity||'normal',confirmed:0,phase:'prep',paused:false,prepMs:3000,setMs:0,activeMs:0,restMs:0};
  state.settings.compactWorkout=true;syncTrainingLayout();window.scrollTo({top:0,behavior:'smooth'});$('#startWorkout').hidden=true;$('#stopWorkout').hidden=false;$('#prepOverlay').classList.add('show');$('#prepCount').textContent='3';$('#pauseWorkout').disabled=true;showSessionExercise();startClock();saveDraft();
}
function startClock(){clearInterval(clockTimer);lastClock=performance.now();clockTimer=setInterval(tickTraining,100)}
function showSessionExercise(){const s=session.steps[session.index],e={...stepDose(session,s),sets:session.plan.exercises[s.exerciseIndex].sets};showExercise(e,s.exerciseIndex,s.set);studio.external=true;studio.playing=false;renderExerciseRail();updateSessionProgress();renderSessionClock();syncDiagramControls();renderOrder()}
function renderSessionClock(){if(!session)return;$('#elapsed').textContent=fmt((session.activeMs||0)/1000);const e=stepDose(session),seconds=session.phase==='rest'?(session.restMs||0)/1000:(e.holdSeconds||e.workSeconds||e.reps*e.cycleSeconds)*(e.eachSide?2:1)-(session.setMs||0)/1000;$('#remain').textContent=fmt(Math.ceil(Math.max(0,seconds)))}
function tickTraining(){
  const now=performance.now(),dt=now-lastClock;lastClock=now;if(!session)return;updateGuideContext();syncDiagramControls();renderSessionClock();if(session.paused)return;
  if(session.phase==='prep'){session.prepMs-=dt;$('#prepCount').textContent=String(Math.max(1,Math.ceil(session.prepMs/1000)));if(session.prepMs<=0){$('#prepOverlay').classList.remove('show');session.phase='work';$('#pauseWorkout').disabled=false;$('#nextWorkout').disabled=false;saveDraft()}return}
  if(!['work','rest'].includes(session.phase))return;
  session.activeMs+=dt;$('#elapsed').textContent=fmt(session.activeMs/1000);
  if(session.phase==='rest'){$('#phaseLabel').textContent='휴식';session.restMs=Math.max(0,session.restMs-dt);$('#remain').textContent=fmt(Math.ceil(session.restMs/1000));$('#phaseRemain').textContent=Math.ceil(session.restMs/1000)+'초 후 '+(session.steps[session.index+1]?.exerciseIndex!==session.steps[session.index]?.exerciseIndex?'다음 운동':'다음 세트');if(session.restMs<=0)endRest();return}
  session.setMs+=dt;const e=stepDose(session);const perSide=(e.holdSeconds||e.workSeconds||e.reps*e.cycleSeconds),elapsed=session.setMs/1000,side=e.eachSide&&elapsed>=perSide?1:0;
  studio.side=side;studio.phase=e.holdSeconds?.15:(elapsed%e.cycleSeconds)/e.cycleSeconds;updateGuideContext();
  $('#remain').textContent=fmt(Math.ceil(Math.max(0,perSide*(e.eachSide?2:1)-elapsed)));
  $('#currentRep').textContent=(e.holdSeconds||e.workSeconds)?Math.max(0,Math.ceil(perSide-(elapsed%perSide)))+'초':Math.min(e.reps,Math.floor((elapsed%perSide)/e.cycleSeconds)+1)+' / '+e.reps;
  $('#sideLabel').textContent=e.eachSide?(side?'반대쪽':'한쪽'):e.workSeconds?'교대로 움직이기':'반복';
  $('#phaseLabel').textContent=studio.stageLabel||'동작 따라하기';
  $('#phaseRemain').textContent=e.holdSeconds?'표시된 자세를 그대로 유지하세요':'다음 반복 '+Math.max(0,e.cycleSeconds-(elapsed%e.cycleSeconds)).toFixed(1)+'초'+(e.eachSide?' · 양쪽 각각':'');
  if(elapsed>=perSide*(e.eachSide?2:1))confirmSet();
}
function confirmSet(){
 if(!session||session.phase!=='work'||session.paused)return;
 const step=session.steps[session.index];if(!markStepComplete(session,step))return;session.lastConfirmedStepId=step.stepId;session.confirmed=session.completedStepIds.length;
 if(session.plan.infinite&&session.index===session.steps.length-1)session=appendCircuitRound(session);
 if(!session.plan.infinite&&allStepsComplete(session)){finishAttempt();return}
 if(session.index===session.steps.length-1){session.steps=remainingSteps(session);session.index=-1;}
 const next=session.steps[session.index+1];if(!next){finishAttempt();return}
 session.phase='rest';session.restMs=(step.restAfter??(step.exerciseIndex===next.exerciseIndex?30:60))*1000;
 updateSessionProgress();renderOrder();if(session.restMs<=0){endRest();return}
 $('#phaseLabel').textContent='휴식';$('#currentRep').textContent='REST';$('#remain').textContent=fmt(session.restMs/1000);$('#setTimerLabel').textContent='휴식 남은 시간';showRestPreview();updateGuideContext();syncDiagramControls();saveDraft();
}
function endRest(){if(session?.phase!=='rest'||session.paused)return;session.index++;session.phase='work';session.setMs=0;$('#diagramModeLabel').hidden=true;$('#setTimerLabel').textContent='현재 세트 남은 시간';showSessionExercise();saveDraft();if(navigator.vibrate)navigator.vibrate(100)}

function togglePause(){
  if(!session||!['work','rest'].includes(session.phase))return;
  session.paused=!session.paused;updateGuideContext();lastClock=performance.now();$('#pauseWorkout').textContent=session.paused?'계속하기':'일시정지';$('#nextWorkout').disabled=session.paused||session.phase==='rest';$('#skipRest').disabled=session.paused;if(session.paused){$('#phaseLabel').textContent='일시정지'}syncDiagramControls();saveDraft();
}
async function completeWorkout(feedback){
  if(session?.phase!=='feedback'||!allStepsComplete(session))return;
  const t=state.trainingTracks[session.trackKey]||(state.trainingTracks[session.trackKey]=newTrack());
  session.date=localDate();
  const result=recordCompletion(t,{sessionId:session.id,date:session.date,confirmed:session.confirmed,total:session.sourceSteps.length,feedback});if(!result.accepted)return;
  state.history.unshift({type:'workout',title:(session.plan.title||regionTitle())+' 운동 완료',date:session.date,at:new Date().toISOString(),level:session.plan.level,feedback,sessionId:session.id,trackKey:session.trackKey,sets:session.confirmed});
  const day=new Date().getDay();const task=state.tasks.find(t=>t.category==='workout'&&t.id!=='saturday-run'&&t.days.includes(day));if(task){state.completions[session.date]=state.completions[session.date]||{};state.completions[session.date][task.id]=true}
  session.phase='done';updateGuideContext();syncTrainingLayout();$('#mobileExerciseName').textContent='오늘 운동 완료';$('#mobileExerciseDose').textContent='LEVEL '+pad(t.level+1);delete state.activeWorkout;state.unfinishedWorkouts=state.unfinishedWorkouts.filter(a=>a.id!==session.id);await saveState();renderRecovery();syncDiagramControls();$('#completionFeedback').hidden=true;$('#phaseLabel').textContent='운동 완료';$('#phaseRemain').textContent='오늘의 성장을 저장했어요';$('#currentRep').textContent='✓';$('#sideLabel').textContent='COMPLETE';
  $('#woExercise').textContent='오늘도 해냈어요!';$('#woCue').textContent=result.advanced?'다음 운동은 한 단계 높아진 루틴으로 준비됩니다.':feedback==='pain'?'다음 단계는 낮췄어요. 통증이 있으면 운동을 쉬고 상태를 확인해 주세요.':'오늘의 완료를 기록하고 현재 강도를 유지합니다.';
  $('#progressDetail').textContent='현재 LEVEL '+pad(t.level+1)+' · 반복 수, 세트 수, 템포를 단계적으로 조절합니다. 하루 1회까지 단계가 상승합니다.';
  $('#startWorkout').hidden=false;$('#startWorkout').textContent='다음 루틴 확인 →';$('#startWorkout').onclick=()=>{prepareWorkout();renderWorkoutBuilder();$('#startWorkout').onclick=beginWorkout};
  renderToday();renderHistory();renderWorkoutBuilder();toast(result.advanced?'완료 기록 저장 · 다음 운동 LEVEL '+pad(t.level+1):'완료 기록을 저장했습니다.');
}
function stopWorkout(){if(!trainingActive())return;if(session.plan.infinite){const done=new Set(session.completedStepIds);session.sourceSteps=session.sourceSteps.filter(step=>done.has(step.stepId));session.steps=session.steps.filter(step=>done.has(step.stepId));session.index=Math.max(0,session.steps.length-1);if(!session.sourceSteps.length){session.phase='done';clearInterval(clockTimer);delete state.activeWorkout;saveState();syncTrainingLayout();return}}finishAttempt();}
function switchView(v){$$('.view').forEach(x=>x.classList.toggle('active',x.id===v));$$('#nav button').forEach(x=>x.classList.toggle('active',x.dataset.view===v));if(v==='workout'){if(!previewPlan)prepareWorkout();ensureStudio();studio.active=true;studio.resize()}else if(studio)studio.active=false}
function openTraining(){switchView('workout');window.scrollTo({top:0,behavior:'smooth'})}
$$('#nav button').forEach(b=>b.onclick=()=>switchView(b.dataset.view));
$('#autoGenerateWorkout').onclick=applySelectedRoutine;
$('#addBodyweightExercise').onclick=async()=>{pauseForSettingsEdit();const id=$('#bodyweightExerciseSelect').value;if(!id)return;if(state.workoutConfig.customIds.includes(id)){toast('이미 추가한 운동입니다.');return}if(state.workoutConfig.customIds.length>=10){toast('사용자 루틴은 최대 10개 동작까지 추가할 수 있습니다.');return}state.workoutConfig.customIds.push(id);state.workoutConfig.mode='custom';state.workoutConfig.selectionDate=localDate();await saveState();refreshRoutineSelection()};
$('#applyCustomWorkout').onclick=async()=>{state.workoutConfig.mode='custom';await applySelectedRoutine()};
$('#startWorkout').onclick=beginWorkout;$('#nextWorkout').onclick=confirmSet;$('#pauseWorkout').onclick=togglePause;$('#skipRest').onclick=endRest;$('#stopWorkout').onclick=stopWorkout;
$$('[data-feedback]').forEach(b=>b.onclick=()=>completeWorkout(b.dataset.feedback));
$$('button[data-guide-phase]').forEach(b=>b.onclick=()=>{if(!studio||trainingActive())return;studio.playing=false;studio.phase=[0,.5,.85][Number(b.dataset.guidePhase)];studio.draw();$('#previewToggle').textContent='▶'});
$('#previewToggle').onclick=()=>{if(!studio||trainingActive())return;studio.playing=!studio.playing;$('#previewToggle').textContent=studio.playing?'Ⅱ':'▶';studio.draw();$('#previewToggle').setAttribute('aria-label',studio.playing?'미리보기 일시정지':'미리보기 재생')};
$('#previewSpeed').onchange=()=>{if(studio)studio.speed=Number($('#previewSpeed').value)};
$('#previewScrub').oninput=()=>{if(!studio||trainingActive())return;studio.playing=false;studio.phase=Number($('#previewScrub').value)/100;studio.draw();$('#previewToggle').textContent='▶'};
$('#motionRetry').onclick=()=>{if(studio)studio.dispose();studio=null;ensureStudio();const e=trainingActive()?session.plan.exercises[session.steps[session.index].exerciseIndex]:previewPlan.exercises[previewIndex];studio.setExercise(e);studio.external=!!trainingActive()};
$('#refreshBtn').onclick=()=>location.reload();
$('#saveSettings').onclick=async()=>{$$('.settingRow').forEach(row=>{const t=state.tasks[Number(row.dataset.i)];t.title=row.querySelector('.stitle').value.trim()||t.title;t.start=row.querySelector('.stime').value;t.notify=row.querySelector('.snotify').value});await saveState();renderAll();toast('설정을 저장했습니다.')};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&session&&['work','rest'].includes(session.phase)&&!session.paused){togglePause();toast('화면을 벗어나 운동이 일시정지되었습니다.')}});
window.addEventListener('pagehide',saveDraft);
async function load(){
  const saved=localStorage.getItem(LOCAL_STORAGE_KEY)||localStorage.getItem('daily-routine')||localStorage.getItem('cotec-daily-routine');
  try{state=saved?JSON.parse(saved):clone(DEFAULT_STATE)}catch{state=clone(DEFAULT_STATE);toast('저장 데이터를 읽을 수 없어 기본 화면을 열었습니다. 기존 데이터는 별도 백업 키에 보관했습니다.');localStorage.setItem(LOCAL_STORAGE_KEY+'-recovery',saved)}
  state.settings={compactWorkout:true,keepScreenOn:true,...DEFAULT_STATE.settings,...state.settings};state.settings.uiMode=normalizeAppearance(state.settings);delete state.settings.theme;screenAwake.setEnabled(state.settings.keepScreenOn!==false);state.tasks=Array.isArray(state.tasks)?state.tasks:clone(DEFAULT_STATE.tasks);state.history=Array.isArray(state.history)?state.history:[];state.completions=state.completions||{};state.unfinishedWorkouts=(Array.isArray(state.unfinishedWorkouts)?state.unfinishedWorkouts:[]).filter(a=>a?.plan?.exercises?.length&&a?.steps?.length&&a.plan.exercises.every(e=>EXERCISES.some(x=>x.id===e.id))).map(a=>normalizeProgress(a));
  if(!state.workoutConfig?.planDay){state.workoutConfig={...state.workoutConfig,planDay:seoulWeekday()}}migrateWorkout(state);state.savedPresets=state.savedPresets.map(p=>normalizeSavedPreset(p)).filter(r=>r.ok).map(r=>r.preset);if(!RECOMMENDED_PRESETS.some(p=>p.id===state.workoutConfig.presetId)&&!state.savedPresets.some(p=>p.id===state.workoutConfig.presetId))state.workoutConfig.presetId='user-week';if(!state.workoutConfig.compactRevision){state.workoutConfig.compactRevision=1;state.workoutConfig.mode='preset';state.workoutConfig.presetId='user-week';}followTodayProgram();state.tasks=state.tasks.filter(t=>t.id!=='saturday-run');const scheduledTask=state.tasks.find(t=>t.id==='workout-weekday');if(scheduledTask){scheduledTask.days=[0,1,2,3,4,5,6];scheduledTask.title='주 7일 근력 루틴'}applyAppearance(state.settings.uiMode);renderAll();prepareWorkout();
  const draft=state.activeWorkout;
  if((draft?.date===localDate()||draft?.phase==='feedback')&&draft?.steps?.length&&draft.index<draft.steps.length&&draft.plan?.exercises?.every(e=>EXERCISES.some(x=>x.id===e.id))){
    session=normalizeProgress({...draft,paused:true,phase:['rest','feedback'].includes(draft.phase)?draft.phase:'work'});if(session.phase!=='feedback'&&session.plan.intensityPolicy!==2){session=applyLiveIntensity(session,session.intensity||session.plan.intensity||'normal');saveDraft()}session.confirmed=session.completedStepIds.length;showSessionExercise();$('#startWorkout').hidden=true;$('#stopWorkout').hidden=false;$('#pauseWorkout').disabled=false;$('#pauseWorkout').textContent='계속하기';$('#nextWorkout').disabled=true;$('#phaseLabel').textContent='일시정지';$('#phaseRemain').textContent='이전 운동을 이어갈 수 있어요';if(session.phase==='rest'){startClock();$('#skipRest').hidden=false;$('#skipRest').disabled=true}if(session.phase==='feedback'){$('#completionFeedback').hidden=false;$('#stopWorkout').hidden=true;$('#pauseWorkout').disabled=true;$('#phaseLabel').textContent='모든 세트 완료';$('#phaseRemain').textContent='컨디션을 알려 주세요'}else startClock();
  }
  syncTrainingLayout();syncDiagramControls();renderOrder();renderRecovery();if(session?.phase==='rest')showRestPreview();
  if(new URLSearchParams(location.search).get('view')==='workout')switchView('workout');
  await initPushStatus();startLocalNotificationWatcher();await saveState();
}
setupControlsLayout();load().catch(e=>{console.error(e);document.body.insertAdjacentHTML('beforeend','<div class="startupError">앱 초기화 오류: '+escapeHtml(e.message)+'</div>')});

function syncTrainingLayout(){const panel=$('#workout');const running=session&&['prep','work','rest'].includes(session.phase);panel.classList.toggle('trainingInProgress',!!running);panel.classList.toggle('trainingComplete',session?.phase==='done');panel.classList.toggle('routineCollapsed',!!state?.settings?.compactWorkout||!!running);panel.toggleAttribute('data-session-active',!!running);$('#woExercise')?.closest('.woPanel')?.querySelector('.woButtons')?.toggleAttribute('hidden',['feedback','review'].includes(session?.phase));syncDiagramControls()}
$('#editRoutine').onclick=()=>{switchView('settings');$('#trainingConfiguration').scrollIntoView({behavior:'smooth',block:'start'})};

$('#mobileExerciseSelect').onchange=()=>{if(trainingActive())return;previewIndex=Number($('#mobileExerciseSelect').value);showExercise(previewPlan.exercises[previewIndex],previewIndex);renderExerciseRail()};

function updateGuideContext(){if(!studio)return;if(session?.phase==='rest'){studio.external=false;studio.playing=!session.paused;studio.setContext({phase:session.paused?'paused':'ready',restPreview:true});return}const exercise=session?.plan?.exercises?.[session?.steps?.[session?.index]?.exerciseIndex];studio.setContext({phase:session?.paused&&['work','rest'].includes(session?.phase)?'paused':session?.phase||'ready',activeSeconds:(session?.activeMs||0)/1000,completedSets:session?.confirmed||0,totalSets:session?.sourceSteps?.length||session?.steps?.length||1,setElapsed:(session?.setMs||0)/1000,restElapsed:session?.phase==='rest'?Math.max(0,(session?.steps?.[session?.index]?.restAfter??exercise?.rest??60)-(session.restMs||0)/1000):0})}

function renderProgramBuilder(plan){
 const c=state.workoutConfig,isPreset=c.mode==='preset';
 $$('.workoutBuilder')[0].dataset.programMode=c.mode;
 $$('[data-program-mode]').forEach(button=>{button.classList.toggle('active',button.dataset.programMode===c.mode);button.setAttribute('aria-pressed',String(button.dataset.programMode===c.mode));button.onclick=()=>selectProgram(button.dataset.programMode,c.planDay)});
 $('#programDayPicker').hidden=!isPreset&&c.mode!=='weekly';$('#weeklyCoverage').hidden=true;$('#regionPicker').hidden=c.mode!=='auto';$('#routineVariants').hidden=!['auto','custom'].includes(c.mode);
 const schedule=isPreset?COMPACT_SCHEDULE:WEEKLY_SCHEDULE;
 $('#programDayPicker').innerHTML=schedule.map(day=>'<button data-program-day="'+day.day+'" class="'+(day.day===c.planDay?'active':'')+'"><b>'+day.name+'</b><small>'+day.title+'</small></button>').join('');
 $$('[data-program-day]').forEach(button=>button.onclick=()=>selectProgram(isPreset?'preset':'weekly',Number(button.dataset.programDay)));
 $('#presetControls').hidden=!isPreset;
 if(isPreset){
  $('#presetSelect').innerHTML=RECOMMENDED_PRESETS.map(p=>'<option value="'+p.id+'">'+escapeHtml(p.name)+'</option>').join('')+state.savedPresets.map(p=>'<option value="'+escapeHtml(p.id)+'">'+escapeHtml(p.name)+'</option>').join('');$('#presetSelect').value=c.presetId;
  $('#targetMinutes').value=plan.targetMinutes;$('#targetMinutes').min='30';$('#targetMinutes').max='60';$('#doseMode').value=c.doseMode;$('#bridgeVariant').value=c.bridgeVariant;
  $('#programSummary').innerHTML='<b>'+escapeHtml(plan.title)+'</b><span>'+(plan.infinite?'무제한 반복 · 라운드 뒤 30초 휴식':'목표 '+plan.targetMinutes+'분 · 예상 '+plan.estimatedMinutes+'분')+'</span>'+(plan.notes||[]).map(n=>'<small>'+escapeHtml(n)+'</small>').join('');
 }else $('#programSummary').innerHTML=c.mode==='weekly'?'<b>'+escapeHtml(plan.title)+'</b><span>이전 주간 분할 · 약 '+plan.estimatedMinutes+'분</span>':c.mode==='cardio'?'<b>근력 루틴과 별개로 선택하는 유산소</b><span>점프 없이 진행하는 맨몸 인터벌</span>':'<b>자유 구성</b><span>원하는 운동을 선택한 뒤 아래에서 수량을 편집해 프리셋으로 저장할 수 있습니다.</span>';
 syncDurationPicker(configurationSession()?session.plan.targetMinutes:plan.targetMinutes);$('#quickRoutine').value=c.mode==='custom'?'custom':c.mode==='weekly'?'preset':c.mode;$('#quickPlanSummary').textContent=(plan.title||regionTitle())+(plan.infinite?' · 무제한 반복':' · 예상 '+plan.estimatedMinutes+'분')+(plan.trainingStage?' · '+plan.trainingStage+' 단계':'');$('.customDetails').hidden=c.mode!=='custom';if(c.mode==='custom')$('.customDetails').open=true;renderDoseEditor(plan);
}
function renderDoseEditor(plan){
 $('#presetDoseRows').innerHTML=plan.exercises.map((e,i)=>'<div class="presetDoseRow"><b>'+escapeHtml(e.name)+(e.eachSide?' · 양쪽 각각':'')+'</b><label>세트<input type="number" min="1" max="30" value="'+e.sets+'" data-dose-index="'+i+'" data-dose-field="sets"></label><label>'+((e.holdSeconds||e.workSeconds)?'초':'회')+'<input type="number" min="1" max="'+((e.holdSeconds||e.workSeconds)?300:100)+'" value="'+(e.holdSeconds||e.workSeconds||e.reps)+'" data-dose-index="'+i+'" data-dose-field="'+(e.holdSeconds?'holdSeconds':e.workSeconds?'workSeconds':'reps')+'"></label></div>').join('');
 $('#deletePreset').hidden=!state.savedPresets.some(p=>p.id===state.workoutConfig.presetId);
}
async function changePresetSetting(key,value){pauseForSettingsEdit();state.workoutConfig[key]=value;if(key==='presetId')state.workoutConfig.mode='preset';state.workoutConfig.selectionDate=localDate();await saveState();refreshRoutineSelection();renderWeek()}
$('#presetSelect').onchange=e=>changePresetSetting('presetId',e.target.value);
$('#targetMinutes').onchange=e=>changePresetSetting(selectedDurationKey(),[30,40,50,60].reduce((best,n)=>Math.abs(n-Number(e.target.value))<Math.abs(best-Number(e.target.value))?n:best,30));
$('#doseMode').onchange=e=>changePresetSetting('doseMode',e.target.value);
$('#bridgeVariant').onchange=e=>changePresetSetting('bridgeVariant',e.target.value);
$('#savePreset').onclick=async()=>{
 pauseForSettingsEdit();
 const plan=clone(selectedSettingsPlan()),name=$('#presetName').value.trim();if(!name){toast('프리셋 이름을 입력해 주세요.');$('#presetName').focus();return}
 for(const input of $$('[data-dose-index]'))plan.exercises[Number(input.dataset.doseIndex)][input.dataset.doseField]=Number(input.value);
 if(plan.blocks)for(const b of plan.blocks)if(b.kind==='circuit'){b.rounds=plan.exercises[b.exerciseIndices[0]].sets;for(const i of b.exerciseIndices)plan.exercises[i].sets=b.rounds}
 const result=normalizeSavedPreset({id:'saved-'+crypto.randomUUID(),name,baseTargetMinutes:plan.targetMinutes||state.workoutConfig.targetMinutes,exercises:plan.exercises,blocks:plan.blocks});if(!result.ok){toast(result.error);return}
 if(state.savedPresets.length>=30){toast('저장한 프리셋은 최대 30개입니다. 먼저 하나를 삭제해 주세요.');return}
 state.savedPresets.push(result.preset);state.workoutConfig.mode='preset';state.workoutConfig.presetId=result.preset.id;await saveState();refreshRoutineSelection();toast('프리셋을 저장했습니다.');
};
$('#deletePreset').onclick=async()=>{pauseForSettingsEdit();state.savedPresets=state.savedPresets.filter(p=>p.id!==state.workoutConfig.presetId);state.workoutConfig.presetId='user-week';await saveState();refreshRoutineSelection();toast('저장 프리셋을 삭제했습니다.')};
async function selectProgram(mode,day){pauseForSettingsEdit();state.workoutConfig.mode=mode;state.workoutConfig.planDay=day||seoulWeekday();state.workoutConfig.selectionDate=localDate();await saveState();refreshRoutineSelection()}
function followTodayProgram(){const c=state?.workoutConfig,today=localDate(),draft=state?.activeWorkout;if(!c||draft&&(draft.date===today||draft.phase==='feedback'))return false;if(['preset','weekly','cardio'].includes(c.mode)&&c.selectionDate!==today){c.mode='preset';c.planDay=seoulWeekday();c.selectionDate=today;return true}return false}
function renderWeek(){renderTaskWeek();const root=$('#weeklyTrainingSummary');if(!root)return;root.innerHTML='<div class="panel weeklyPlanPanel"><div class="panelhead">기본 주간 루틴</div><div class="weeklyPlanCards">'+COMPACT_SCHEDULE.map(day=>{const p=createCompactPlan(day.day,0,{targetMinutes:state.workoutConfig.targetMinutes});return '<button data-week-open="'+day.day+'"><b>'+day.name+' · '+day.title+'</b><span>'+p.exercises.map(e=>e.name).join(' / ')+'</span><small>'+(p.infinite?'무제한 서킷':p.exercises.length+'개 동작 · 예상 '+p.estimatedMinutes+'분')+'</small></button>'}).join('')+'</div></div>';$$('[data-week-open]').forEach(button=>button.onclick=async()=>{if(trainingActive()){switchView('workout');toast('현재 운동을 먼저 마치거나 종료해 주세요.');return}state.workoutConfig.presetId='user-week';await selectProgram('preset',Number(button.dataset.weekOpen));switchView('workout')})}
function setupControlsLayout(){
 const advanced=document.createElement('details');advanced.className='advancedRoutine';advanced.innerHTML='<summary>상세 설정 · 수량 편집 · 프리셋 저장</summary>';$('.workoutBuilderBody').append(advanced);
 const summary=document.createElement('div');summary.id='quickPlanSummary';summary.className='quickPlanSummary';$('#programDayPicker').after(summary);
 for(const node of [$('#programSummary'),$('.presetEditor')])advanced.append(node);$('#doseMode').closest('label').hidden=true;$('#bridgeVariant').closest('label').hidden=true;
 $('#targetMinutes').closest('label').hidden=true;const apply=$('#autoGenerateWorkout');apply.classList.add('quickApply');$('.builderBottom').after(apply);
 const instruction=document.createElement('section');instruction.className='instructionBlock';instruction.innerHTML='<h3>운동 방법</h3>';$('.timerBox').after(instruction);for(const node of [$('#woCue'),$('#formCues'),$('#exerciseAlternative')])instruction.append(node);const source=document.createElement('div');source.className='diagramSource';source.append($('#mediaAttribution'));instruction.append(source);$('.studioFootnote').remove();
 for(const input of $$('[name=workoutMinutes]'))input.onchange=()=>changeWorkoutDuration(Number(input.value));
 $('#quickRoutine').onchange=e=>selectProgram(e.target.value,state.workoutConfig.planDay);
 $('#imagePause').onclick=()=>{if(session?.phase==='stopped'){session.phase=session.stoppedPhase||'work';session.paused=true;startClock();}if(session?.phase==='feedback')return;if(trainingActive())togglePause();else beginWorkout();syncTrainingLayout();syncDiagramControls()};
 $('#imageSkip').onclick=()=>{if(!session||!['work','rest'].includes(session.phase))return;if(session.phase==='rest'){session.paused=false;endRest()}else{const current=session.steps[session.index].exerciseIndex,indices=incompleteExerciseIndices(session),next=indices.find(i=>i>current)??indices.find(i=>i!==current);if(next!==undefined)goToExercise(next);else toast('마지막 미완료 운동입니다. 재생해서 마무리하세요.')}};
 for(const input of $$('[name=workoutIntensity]'))input.onchange=()=>{if(!input.checked)return;if(trainingActive()&&['work','rest'].includes(session.phase)){const sameSelection=sameRoutineConfig(configForSession(session),state.workoutConfig);session=applyLiveIntensity(session,input.value);session.config={...configForSession(session),intensity:input.value};if(sameSelection)state.workoutConfig.intensity=input.value;previewPlan=session.plan;session.confirmed=session.completedStepIds.length;if(session.phase==='rest')showRestPreview();else showSessionExercise();saveDraft();updateSessionProgress();renderOrder();toast(session.plan.overflow?'현재 세트와 진행 기록을 유지해 선택 시간보다 길어질 수 있습니다.':'선택 시간에 맞춰 다음 세트의 운동량을 바꿨습니다.')}else if(!trainingActive()){state.workoutConfig.intensity=input.value;saveState();prepareWorkout();renderWorkoutBuilder()}syncDiagramControls()};
 relocateRoutineSettings();
 $('#previousExercise').onclick=()=>navigateExercise(-1);$('#nextExercise').onclick=()=>navigateExercise(1);$('#undoSet').onclick=undoLastSet;
}
function persistPartial(){} // Legacy recovery records are preserved in storage, never rendered.
function finishAttempt(){
 if(!session)return;clearInterval(clockTimer);normalizeProgress(session);session.confirmed=session.completedStepIds.length;$('#prepOverlay').classList.remove('show');$('#diagramModeLabel').hidden=true;
 if(allStepsComplete(session)){session.phase='feedback';session.paused=false;$('#completionFeedback').hidden=false;$('#phaseLabel').textContent='모든 세트 완료';$('#phaseRemain').textContent='컨디션을 선택해 기록하세요';saveDraft()}
 else{session.stoppedPhase=session.phase==='rest'?'rest':'work';session.phase='stopped';session.paused=true;state.activeWorkout={...session,phase:session.stoppedPhase,paused:true};saveState();$('#phaseLabel').textContent='일시정지';$('#phaseRemain').textContent='그림의 재생 버튼으로 이어갈 수 있습니다.'}
 $('#stopWorkout').hidden=true;updateGuideContext();syncTrainingLayout();updateSessionProgress();renderOrder();syncDiagramControls();
}
function renderRecovery(){}

function nextQueuedStep(){return session?.steps?.[session.index+1]}
function showRestPreview(){
 const next=nextQueuedStep();if(!next)return;const e={...stepDose(session,next),sets:session.plan.exercises[next.exerciseIndex].sets};showExercise(e,next.exerciseIndex,next.set);$('#diagramModeLabel').hidden=false;$('#diagramModeLabel').textContent='휴식 중 · 다음 세트 미리보기';$('#mobileExerciseName').textContent='다음 · '+e.name;studio.external=false;studio.playing=!session.paused;studio.setContext({phase:session.paused?'paused':'ready',restPreview:true});$('#phaseLabel').textContent='휴식';$('#currentRep').textContent='REST';syncDiagramControls();
}
function syncDiagramControls(){
 if(!$('#imagePause')||!state)return;const running=trainingActive(),phase=session?.phase,paused=!!session?.paused,plan=running?session.plan:previewPlan,index=running?session.steps[session.index]?.exerciseIndex:previewIndex;
 $('#imagePlayIcon').hidden=running?(!paused||phase==='prep'||phase==='feedback'):false;$('#stopWorkout').hidden=!running||phase==='feedback';$('#stopWorkout').textContent=plan?.infinite?'서킷 끝내기':'오늘은 여기까지';$('#imagePause').disabled=['prep','feedback'].includes(phase);$('#imagePause').setAttribute('aria-label',running?(phase==='feedback'?'완료 기록 확인':paused?'다시 시작':'일시정지'):'운동 시작');
 $('#imageSkip').hidden=!(running&&paused&&['work','rest'].includes(phase));$('#imageSkip').setAttribute('aria-label',phase==='rest'?'휴식 건너뛰기':'운동 건너뛰기');$('#imageSkip').title=phase==='rest'?'휴식 건너뛰기':'운동 건너뛰기';$('#centerControls').classList.toggle('paused',running&&paused);
 $('#nextWorkout').hidden=true;$('#skipRest').hidden=true;$('#undoSet').hidden=true;
 syncDurationPicker(plan?.targetMinutes);$('#durationPicker').hidden=!!plan?.infinite;
 const intensity=running?session.intensity||'normal':state.workoutConfig.intensity||'normal';for(const input of $$('[name=workoutIntensity]')){input.checked=input.value===intensity;input.disabled=['prep','feedback','done','stopped'].includes(phase)}
 $('#previousExercise').disabled=['prep','feedback'].includes(phase)||(running?adjacentIncompleteExercise(session,index,-1)===null:index<=0);$('#nextExercise').disabled=['prep','feedback'].includes(phase)||(running?adjacentIncompleteExercise(session,index,1)===null:index>=(plan?.exercises.length||1)-1);
 $('#setTimerLabel').textContent=phase==='rest'?'휴식 남은 시간':'현재 세트 남은 시간';
 if(plan){const next=running?nextQueuedStep():plan.exercises[index+1]?{exerciseIndex:index+1,set:1}:null;$('#upNext').innerHTML=next?'<span>'+(phase==='rest'?'휴식 뒤':'다음 세트')+'</span><b>'+escapeHtml(plan.exercises[next.exerciseIndex].name)+' · '+(next.round?'라운드 '+next.round:next.set+'세트')+'</b><small>'+escapeHtml(doseText(running?stepDose(session,next):plan.exercises[next.exerciseIndex]))+((running?stepDose(session,next):plan.exercises[next.exerciseIndex]).eachSide?' / 측':'')+'</small>':'<b>'+(plan.infinite?'계속 반복 · 라운드 뒤 30초 휴식':running?'마지막 미완료 세트':'마지막 운동')+'</b>'}
}
function navigateExercise(delta){const running=trainingActive(),current=running?session.steps[session.index].exerciseIndex:previewIndex,index=running?adjacentIncompleteExercise(session,current,delta):current+delta;if(index!==null)goToExercise(index)}
function goToExercise(index){
 if(!trainingActive()){if(index<0||index>=previewPlan.exercises.length)return;previewIndex=index;showExercise(previewPlan.exercises[index],index);renderExerciseRail();syncDiagramControls();renderOrder();return}
 if(['prep','feedback'].includes(session.phase))return;const queue=queueFromExercise(session,index);if(!queue.length)return;
 session.steps=queue;session.index=0;session.phase='work';session.paused=false;session.setMs=0;session.restMs=0;$('#diagramModeLabel').hidden=true;showSessionExercise();startClock();saveDraft();
}

function undoLastSet(){
 if(!session?.completedStepIds?.includes(session.lastConfirmedStepId))return;const id=session.lastConfirmedStepId;session.completedStepIds=session.completedStepIds.filter(x=>x!==id);session.confirmed=session.completedStepIds.length;delete session.lastConfirmedStepId;
 const remaining=remainingSteps(session),position=remaining.findIndex(step=>step.stepId===id);session.steps=remaining.slice(position);session.index=0;session.phase='work';session.paused=true;session.setMs=0;session.restMs=0;$('#completionFeedback').hidden=true;$('#diagramModeLabel').hidden=true;$('#nextWorkout').disabled=true;$('#pauseWorkout').disabled=false;showSessionExercise();startClock();saveDraft();syncTrainingLayout();renderRecovery();toast('직전 세트 완료를 취소했습니다. 그림을 눌러 다시 시작하세요.');
}
function renderOrder(){
 const plan=trainingActive()||session?.phase==='review'?session.plan:previewPlan;if(!plan||!$('#exerciseOrderList'))return;const progress=session?.plan===plan?exerciseProgress(session):[];const active=trainingActive()?session.steps[session.index]?.exerciseIndex:previewIndex;
 $('#orderCount').textContent=plan.exercises.length+'종';$('#exerciseOrderList').innerHTML=plan.exercises.map((e,i)=>{const p=progress[i];if(p&&!p.remaining)return '';return '<li><button data-order-exercise="'+i+'" class="'+(i===active?'active':'')+'"><b>'+(i+1)+'. '+escapeHtml(e.name)+'</b><span>'+(p?p.completed+'/'+p.total+'세트':e.sets+'세트')+'</span></button></li>'}).join('');$$('[data-order-exercise]').forEach(button=>button.onclick=()=>goToExercise(Number(button.dataset.orderExercise)));
}


function syncDurationPicker(minutes){const selected=[30,40,50,60].includes(minutes)?minutes:state?.workoutConfig?.[selectedDurationKey()]||30;for(const input of $$('[name=workoutMinutes]')){input.checked=Number(input.value)===selected;input.disabled=session?.phase==='feedback'}}

async function changeWorkoutDuration(minutes){
 if(![30,40,50,60].includes(minutes)||session?.phase==='feedback')return;
 if(!session||!['prep','work','rest','stopped'].includes(session.phase)){await changePresetSetting('targetMinutes',minutes);return}
 if(session.plan.infinite||session.plan.targetMinutes===minutes){syncDurationPicker(session.plan.targetMinutes);return}
 const c=configForSession(session),sameSelection=sameRoutineConfig(c,state.workoutConfig),level=session.plan.level;
 const saved=c.mode==='preset'?(session.presetSnapshot||state.savedPresets.find(p=>p.id===session.plan.presetId)||(!session.plan.compact&&session.plan.presetId?normalizeSavedPreset({id:session.plan.presetId,name:session.plan.title,baseTargetMinutes:c.targetMinutes,exercises:session.plan.baseExercises||session.plan.exercises,blocks:session.plan.blocks}).preset:null)):null;
 const options={...c,targetMinutes:minutes,intensity:'normal',doseMode:'fit',presetId:session.plan.presetId};
 const plan=session.plan.compact?createCompactPlan(session.plan.day,level,options):saved?createPresetPlan(session.plan.day,level,{...options,savedPreset:saved}):c.mode==='cardio'?{...createCardioPlan(level,minutes),targetMinutes:minutes}:timedFreePlan(options,level);
 session=applyLiveDuration(session,plan);previewPlan=session.plan;session.config={...c,targetMinutes:minutes,doseMode:'fit'};if(sameSelection){state.workoutConfig.targetMinutes=minutes;state.workoutConfig.doseMode='fit'}
 session.confirmed=session.completedStepIds.length;
 if(session.phase==='rest')showRestPreview();else showSessionExercise();
 updateSessionProgress();renderOrder();syncDiagramControls();
 if(session.phase==='stopped'){state.activeWorkout={...session,paused:true,phase:session.stoppedPhase||'work'};await saveState()}else saveDraft();
 toast(minutes+'분 기준으로 남은 운동량을 조절했습니다.');
}

function timedFreePlan(config,level){const plan=createFreeDurationPlan(config,level);plan.title=config.mode==='custom'?'직접 고른 운동':plan.regions.includes('full')?'전신 시간 맞춤':plan.regions.map(partName).join(' · ')+' 시간 맞춤';return plan}

function selectedDurationKey(){return 'targetMinutes'}


function relocateRoutineSettings(){
 const settings=$('#settings'),configuration=document.createElement('section');configuration.id='trainingConfiguration';configuration.className='trainingConfiguration';configuration.innerHTML='<div class="headline"><div><h2>운동 루틴 설정</h2></div></div>';
 for(const node of [$('.workoutBuilder'),$('.trainingHeading'),$('#exerciseRail')])configuration.append(node);settings.prepend(configuration);
 $('#settingsTasks').closest('.panel').id='scheduleSettings';$('#appearanceModes').closest('.panel').id='appearanceSettings';
 $('#autoGenerateWorkout').textContent='루틴 적용 · 운동 화면';$('#editRoutine').textContent='루틴 설정';
 const fields=$('#taskForm>div:first-child');fields.classList.add('newTaskFields');for(const [id,title]of [['newTitle','할 일'],['newStart','시작 시간'],['newEnd','종료 시간'],['newCategory','분류']]){const input=$('#'+id),label=document.createElement('label');label.className='newTaskField';const span=document.createElement('span');span.textContent=title;input.before(label);label.append(span,input)}
}
