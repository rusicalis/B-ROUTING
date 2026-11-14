import {WEEKLY_SCHEDULE,PROGRAM_TARGETS,createWeeklyPlan,createCardioPlan,weeklyCoverage,seoulWeekday} from './weekly-program.mjs';
import { EXERCISES, REGIONS, createPlan, trackKey, newTrack, migrateWorkout, normalizeRegions, recordCompletion } from './workout-engine.mjs';
import { MotionStudio } from './motion-studio.js';
const APP_VERSION='3.0.0';
const LOCAL_STORAGE_KEY='burning-routine-local-v150';
const DEFAULT_STATE={"version":"2.0.0","settings":{"timezone":"Asia/Seoul","defaultNotify":"exact","pushEnabled":false,"theme":"mint","achievementRange":30},"workoutConfig":{"schema":2,"regions":["full"],"variant":1,"mode":"auto","customIds":[]},"tasks":[{"id":"wake","title":"기상","start":"05:30","end":"05:30","days":[1,2,3,4,5],"category":"routine","notify":"exact"},{"id":"workout-weekday","title":"아침 근력운동","start":"05:35","end":"06:00","days":[1,2,3,4,5],"category":"workout","notify":"exact"},{"id":"leave-home","title":"출발","start":"06:05","end":"06:05","days":[1,2,3,4,5],"category":"routine","notify":"off"},{"id":"morning-capability","title":"공부·역량강화","start":"06:30","end":"07:00","days":[1,2,3,4,5],"category":"study","notify":"-5","variants":{"1":"도금·공정 실무","2":"생산·원가관리","3":"도금·문제해결","4":"데이터·AI","5":"관리역량·복습"}},{"id":"day-work","title":"회사 업무","start":"07:00","end":"17:00","days":[1,2,3,4,5],"category":"work","notify":"off"},{"id":"dinner","title":"저녁식사","start":"17:00","end":"17:30","days":[1,2,3,4,5],"category":"routine","notify":"off"},{"id":"overtime-work","title":"회사 잔업 업무","start":"17:30","end":"18:30","days":[1,2,3,4,5],"category":"work","notify":"exact"},{"id":"evening-focus","title":"핵심 자기계발","start":"18:30","end":"20:00","days":[1,2,3,4,5],"category":"study","notify":"exact","variants":{"1":"실무 심화","2":"프로그램 개발","3":"실무 심화","4":"프로그램 개발","5":"실무 종합"}},{"id":"english","title":"영어","start":"20:00","end":"20:25","days":[1,2,3,4,5],"category":"english","notify":"exact"},{"id":"night-practice","title":"실무 공부","start":"20:25","end":"21:00","days":[1,2,3,4,5],"category":"study","notify":"exact"},{"id":"leave-work","title":"퇴근","start":"21:00","end":"21:00","days":[1,2,3,4,5],"category":"routine","notify":"exact"},{"id":"saturday-run","title":"러닝 40~60분","start":"07:00","end":"08:00","days":[6],"category":"workout","notify":"exact"}],"completions":{},"history":[],"progression":{},"workoutPlans":{},"motions":{"pushup":{"clipStart":0,"clipEnd":0,"rev":0},"pushup-close":{"clipStart":0,"clipEnd":0,"rev":0},"row":{"clipStart":0,"clipEnd":0,"rev":0},"deadlift":{"clipStart":0,"clipEnd":0,"rev":0},"squat":{"clipStart":0,"clipEnd":0,"rev":0},"lunge":{"clipStart":0,"clipEnd":0,"rev":0},"shoulder-press":{"clipStart":0,"clipEnd":0,"rev":0},"lateral-raise":{"clipStart":0,"clipEnd":0,"rev":0},"face-pull":{"clipStart":0,"clipEnd":0,"rev":0},"curl":{"clipStart":0,"clipEnd":0,"rev":0},"triceps":{"clipStart":0,"clipEnd":0,"rev":0},"run":{"clipStart":0,"clipEnd":0,"rev":0}},"updatedAt":null,"trainingTracks":{}};
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const clone=o=>JSON.parse(JSON.stringify(o));
const pad=n=>String(n).padStart(2,'0');
let state=null,session=null,studio=null,achievementFocusKey=null;
const weekdayKo=['일','월','화','수','목','금','토'];
const themePresets=[{id:'mint',name:'민트',strong:'#5f8f86',soft:'#dceee9',bg:'#f5faf8',line:'#d3e3df'},{id:'sky',name:'스카이',strong:'#678dac',soft:'#dceaf4',bg:'#f6f9fc',line:'#d7e2eb'},{id:'lavender',name:'라벤더',strong:'#8275a8',soft:'#e7e1f2',bg:'#faf8fc',line:'#e1dceb'},{id:'rose',name:'로즈',strong:'#a26f7e',soft:'#f2dfe5',bg:'#fcf8f9',line:'#ead9de'},{id:'peach',name:'피치',strong:'#a87b63',soft:'#f3e2d8',bg:'#fcf9f7',line:'#eaded7'},{id:'lemon',name:'레몬',strong:'#8d8350',soft:'#f3edcf',bg:'#fcfbf5',line:'#e9e3c9'},{id:'sage',name:'세이지',strong:'#71896b',soft:'#e0ebdc',bg:'#f8faf6',line:'#d9e4d5'},{id:'aqua',name:'아쿠아',strong:'#5f8f95',soft:'#dcecef',bg:'#f5fafb',line:'#d5e5e7'},{id:'lilac',name:'라일락',strong:'#907aa1',soft:'#ebdff0',bg:'#fbf8fc',line:'#e5daea'},{id:'sand',name:'샌드',strong:'#8e806e',soft:'#ece5da',bg:'#fbfaf7',line:'#e4ddd2'}];
const localDate=(d=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:state?.settings?.timezone||'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
function variantTitle(task,day){return task.id==='workout-weekday'?(WEEKLY_SCHEDULE[(day+6)%7]?.title||'근력')+' 운동':task.variants?.[day]||task.title}
function applyTheme(id){const t=themePresets.find(x=>x.id===id)||themePresets[0];const r=document.documentElement.style;r.setProperty('--teal',t.strong);r.setProperty('--teal2',t.soft);r.setProperty('--bg',t.bg);r.setProperty('--line',t.line);document.querySelector('meta[name=theme-color]')?.setAttribute('content',t.strong)}
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
function renderToday(){const day=new Date().getDay(),date=localDate(),tasks=currentTasks();const done=tasks.filter(t=>isDone(t.id,date)).length;$('#todayTitle').textContent='오늘 · '+weekdayKo[day]+'요일';$('#todaySub').textContent=date;$('#todayRate').textContent=(tasks.length?Math.round(done/tasks.length*100):0)+'%';$('#todayDone').textContent=done;$('#todayRemain').textContent=tasks.length-done;$('#todayList').innerHTML=tasks.map(t=>{const done=isDone(t.id,date),missed=taskMissedClient(t,done),simpleComplete=t.id==='saturday-run';const check='<button class="check '+(done?'on':'')+' taskCheck" data-id="'+t.id+'" aria-label="완료 체크">'+(done?'✓':'')+'</button>';const action=t.category==='workout'&&!simpleComplete?'<div class="workoutActions"><button class="btn primary workoutOpen" data-id="'+t.id+'">운동 시작</button>'+check+'</div>':check;return '<div class="todo '+(done?'done':'')+(missed?' missed':'')+'"><div class="time">'+t.start+'</div><div class="tmain"><b>'+t.displayTitle+'</b><small>'+t.end+' · '+labelCategory(t.category)+'</small></div>'+action+'</div>'}).join('');$$('.taskCheck').forEach(b=>b.onclick=()=>{const t=tasks.find(x=>x.id===b.dataset.id);markDone(t,date,!isDone(t.id,date))});$$('.workoutOpen').forEach(b=>b.onclick=()=>{switchView('workout');openTraining()});}
function labelCategory(c){return {workout:'운동',study:'역량강화',work:'업무',english:'영어',routine:'루틴'}[c]||c}
function renderTaskWeek(){const days=[1,2,3,4,5,6,0];$('#weekGrid').innerHTML=days.map(d=>{const items=state.tasks.filter(t=>t.days.includes(d)).sort((a,b)=>a.start.localeCompare(b.start));return '<div class="daycard"><h3>'+weekdayKo[d]+'요일</h3>'+items.map(t=>'<div class="dayitem"><b>'+t.start+' '+variantTitle(t,d)+'</b><span>'+t.end+'</span></div>').join('')+'</div>'}).join('')}
function renderHistory(){renderAchievementChart();const arr=state.history||[];const historyRoot=$('#historyList');if(historyRoot)historyRoot.innerHTML=arr.length?arr.slice(0,80).map(h=>'<div class="historyItem"><b>'+escapeHtml(h.title||h.type)+'</b><small>'+h.date+' · '+new Date(h.at||Date.now()).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})+'</small></div>').join(''):'<div class="empty">아직 기록이 없습니다.</div>'}
function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function initPushStatus(){if('serviceWorker'in navigator){try{await navigator.serviceWorker.register('./service-worker.js?v=300',{updateViaCache:'none'});}catch(e){console.warn('service worker',e)}}if(!('Notification'in window)){pushText(false,'이 브라우저는 알림을 지원하지 않습니다.');return}pushText(Notification.permission==='granted',Notification.permission==='granted'?'로컬 알림 활성화됨':'로컬 알림 미설정')}
function pushText(ok,text){const el=$('#pushStatus');if(el)el.innerHTML='<span class="statusDot '+(ok?'ok':'bad')+'"></span>'+text;const mini=$('#pushMini');if(mini)mini.textContent=ok?'LOCAL ON':'LOCAL OFF'}
async function showLocalNotification(title,body,url='./?view=today'){if(!('Notification'in window)||Notification.permission!=='granted')return false;try{if('serviceWorker'in navigator){const reg=await navigator.serviceWorker.ready;await reg.showNotification(title,{body,icon:'./icon-192.png',badge:'./icon-192.png',data:{url}});return true}new Notification(title,{body,icon:'./icon-192.png'});return true}catch(e){console.warn('notification',e);return false}}
function localTimeParts(){const fmt=new Intl.DateTimeFormat('en-GB',{timeZone:state?.settings?.timezone||'Asia/Seoul',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});const parts=Object.fromEntries(fmt.formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));const dayMap={Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6};return {weekday:dayMap[parts.weekday],hhmm:parts.hour+':'+parts.minute}}
function shiftHHMM(hhmm,delta){const [h,m]=String(hhmm).split(':').map(Number);const total=((h*60+m+delta)%1440+1440)%1440;return String(Math.floor(total/60)).padStart(2,'0')+':'+String(total%60).padStart(2,'0')}
async function checkLocalNotifications(){if(!state||!('Notification' in window)||Notification.permission!=='granted')return;const p=localTimeParts(),date=localDate();for(const task of state.tasks||[]){if(task.notify==='off'||!task.days?.includes(p.weekday))continue;const due=task.notify==='-5'?shiftHHMM(task.start,-5):task.start;if(due!==p.hhmm)continue;const key='burning-routine-notified:'+date+':'+task.id+':'+due;if(sessionStorage.getItem(key))continue;sessionStorage.setItem(key,'1');await showLocalNotification(task.title||'BURNING ROUTINE',task.notify==='-5'?'5분 후 예정입니다.':'지금 시작할 시간입니다.',task.category==='workout'?'./?view=workout':'./?view=today')}}
function startLocalNotificationWatcher(){checkLocalNotifications();setInterval(checkLocalNotifications,30000)}
async function deleteTask(i){if(!confirm('이 할 일을 삭제하시겠습니까?'))return;state.tasks.splice(i,1);await saveState();renderAll()}
function fmt(sec){sec=Math.max(0,Math.floor(sec));return pad(Math.floor(sec/60))+':'+pad(sec%60)}
function renderSettings(){const dayNames=['일','월','화','수','목','금','토'];const activeTheme=state.settings?.theme||'mint';$('#themePalette').innerHTML=themePresets.map(t=>'<button class="themeChoice '+(t.id===activeTheme?'active':'')+'" data-theme="'+t.id+'"><span class="themeSwatch" style="background:'+t.soft+'"></span>'+t.name+'</button>').join('');$$('.themeChoice').forEach(b=>b.onclick=async()=>{state.settings.theme=b.dataset.theme;applyTheme(state.settings.theme);await saveState();renderSettings()});$('#settingsTasks').innerHTML=state.tasks.map((t,i)=>'<div class="settingRow" data-i="'+i+'"><div><input class="stitle" value="'+escapeHtml(t.title)+'" style="width:100%;border:1px solid #ccd8d5;border-radius:8px;padding:8px"><div style="font-size:11px;color:var(--muted)">'+t.days.map(d=>dayNames[d]).join('·')+'</div></div><input type="time" class="stime" value="'+t.start+'"><select class="snotify"><option value="exact" '+(t.notify==='exact'?'selected':'')+'>정시</option><option value="-5" '+(t.notify==='-5'?'selected':'')+'>5분 전</option><option value="off" '+(t.notify==='off'?'selected':'')+'>알림 없음</option></select><button class="btn danger deleteTask" data-i="'+i+'">×</button></div>').join('');$$('.deleteTask').forEach(b=>b.onclick=()=>deleteTask(Number(b.dataset.i)));$('#motionSettings').innerHTML='<div class="guideInfo">로컬 3D 동작 가이드 · '+EXERCISES.length+'종<br>주요 사용 부위는 모델 위 부위 이름으로 표시합니다. Quaternius의 CC0 인체 모델을 사용하며 얼굴·손가락이 연결된 스키닝 모델입니다.<br>드래그 회전 · 앞/옆/뒤 시점 · 재생 속도 · 구간 탐색을 지원합니다.</div>';}
$('#addTask').onclick=()=>{$('#taskForm').style.display=$('#taskForm').style.display==='none'?'block':'none'};
$('#confirmAddTask').onclick=async()=>{const title=$('#newTitle').value.trim();const days=$$('.newDay:checked').map(x=>Number(x.value));if(!title||!days.length){alert('할 일 이름과 반복요일을 선택해 주세요.');return}state.tasks.push({id:'custom-'+Date.now(),title,start:$('#newStart').value,end:$('#newEnd').value,days,category:$('#newCategory').value,notify:$('#newNotify').value});$('#newTitle').value='';$('#taskForm').style.display='none';await saveState();renderAll()};
$('#enablePush').onclick=async()=>{try{if(!('Notification'in window))throw new Error('이 브라우저는 알림을 지원하지 않습니다.');const perm=await Notification.requestPermission();if(perm!=='granted')throw new Error('알림 권한이 허용되지 않았습니다.');state.settings.pushEnabled=true;await saveState();pushText(true,'로컬 알림 활성화됨')}catch(e){alert(e.message);pushText(false,'로컬 알림 설정 실패')}};
$('#testPush').onclick=async()=>{const ok=await showLocalNotification('BURNING ROUTINE','로컬 알림 테스트입니다.');alert(ok?'테스트 알림을 표시했습니다.':'먼저 로컬 알림을 활성화해 주세요.')};

// The task shell above retains the original data key and behaviour.
let previewPlan=null,previewIndex=0,clockTimer=null,lastClock=0,toastTimer=null;
const partName=id=>REGIONS.find(r=>r.id===id)?.name||({core:'코어',glutes:'둔근',arms:'팔'}[id])||id;
const doseText=e=>(e.holdSeconds||e.workSeconds)?(e.holdSeconds||e.workSeconds)+'초':e.reps+'회';
const equipmentText=e=>e.equipment==='kettlebell'?'12kg 케틀벨 1개':e.equipment==='band'?'60cm 일자 밴드':'기구 없는 맨몸';
const regionTitle=()=>state?.workoutConfig?.mode==='weekly'?WEEKLY_SCHEDULE[state.workoutConfig.planDay-1].title:state?.workoutConfig?.mode==='cardio'?'조용한 유산소':normalizeRegions(state?.workoutConfig?.regions).map(partName).join(' · ');
const trainingActive=()=>session&&['prep','work','rest','feedback'].includes(session.phase);
function toast(message){$('#trainingToast').textContent=message;$('#trainingToast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#trainingToast').classList.remove('show'),4000)}
function track(){const key=trackKey(state.workoutConfig);return state.trainingTracks[key]||(state.trainingTracks[key]=newTrack())}
function currentPlan(){const c=state.workoutConfig,level=track().level;return c.mode==='weekly'?createWeeklyPlan(c.planDay,level):c.mode==='cardio'?createCardioPlan(level):createPlan({...c,level})}
function saveDraft(){
  if(!session||!['prep','work','rest','feedback'].includes(session.phase)){delete state.activeWorkout;return}
  state.activeWorkout={...session,paused:true,phase:session.phase==='prep'?'work':session.phase};saveState();
}
function renderAll(){renderToday();renderWeek();renderHistory();renderSettings();renderWorkoutBuilder()}
function renderWorkoutBuilder(){
  syncTrainingLayout();
  const c=state.workoutConfig,t=track(),p=trainingActive()?session.plan:currentPlan();renderProgramBuilder(p);
  $('#bodyweightCount').textContent=EXERCISES.length+' EXERCISES';
  const symbols={full:'◎',chest:'◇',back:'⋈',legs:'Ⅱ',shoulders:'⌒',biceps:'∿',triceps:'≋',lowerback:'⊞'};
  $('#regionPicker').innerHTML=REGIONS.map(r=>`<button class="regionButton ${c.regions.includes(r.id)?'active':''}" data-region="${r.id}" aria-pressed="${c.regions.includes(r.id)}"><span class="regionSymbol" aria-hidden="true">${symbols[r.id]}</span><b>${r.name}</b><small>${r.en}</small></button>`).join('');
  $$('[data-region]').forEach(b=>b.onclick=async()=>{
    if(trainingActive()){toast('진행 중인 운동을 마치거나 종료한 뒤 부위를 변경해 주세요.');return}
    const id=b.dataset.region;c.regions=id==='full'?['full']:normalizeRegions(c.regions.includes('full')?[id]:c.regions.includes(id)?c.regions.filter(x=>x!==id):[...c.regions,id]);c.mode='auto';await saveState();prepareWorkout();renderWorkoutBuilder();
  });
  $$('[data-variant]').forEach(b=>{b.classList.toggle('active',c.variant===Number(b.dataset.variant)&&c.mode!=='custom');b.setAttribute('aria-pressed',String(c.variant===Number(b.dataset.variant)&&c.mode!=='custom'));b.onclick=async()=>{if(trainingActive()){toast('진행 중인 운동을 먼저 종료해 주세요.');return}c.variant=Number(b.dataset.variant);c.mode='auto';await saveState();prepareWorkout();renderWorkoutBuilder()}});
  $('#trainingLevel').textContent='LEVEL '+pad(t.level+1);
  $('#levelDots').innerHTML=Array.from({length:13},(_,i)=>`<i class="${i<=t.level?'filled':''}" title="${i+1}단계"></i>`).join('');
  $('#trackSummary').textContent=t.completed?`${t.completed}회 완료 · 마지막 운동 ${t.lastCompletedDate}`:'첫 번째 완료를 기다리고 있어요';
  $('#routineTitle').textContent=p.title||regionTitle()+' · '+(c.mode==='custom'?'사용자 루틴':'루틴 '+c.variant);$('#compactRoutineName').textContent=$('#routineTitle').textContent;
  $('#routineSummary').textContent=`${p.exercises.length}개 동작 · 약 ${p.estimatedMinutes}분 · 본운동`;
  $('#workoutDayLabel').textContent='본운동 20~30분 · 점프 없음 · 직접 훈련 부위 회복 배치';
  const select=$('#bodyweightExerciseSelect'),value=select.value;
  const filtered=EXERCISES.filter(e=>c.regions.includes('full')||c.regions.some(r=>e.groups.includes(r)));
  select.innerHTML=filtered.map(e=>`<option value="${e.id}">${e.name} · ${e.equipment==='kettlebell'?'12kg × 1':e.equipment==='band'?'60cm 일자 밴드':'맨몸'}</option>`).join('');if(filtered.some(e=>e.id===value))select.value=value;
  $('#customWorkoutList').innerHTML=c.customIds.map(id=>{const e=EXERCISES.find(x=>x.id===id);return `<div class="routineItem"><b>${e.name}</b><button class="btn danger" data-remove="${id}" aria-label="${e.name} 삭제">×</button></div>`}).join('');
  $$('[data-remove]').forEach(b=>b.onclick=async()=>{if(trainingActive()){toast('진행 중인 운동을 먼저 종료해 주세요.');return}c.customIds=c.customIds.filter(id=>id!==b.dataset.remove);if(!c.customIds.length)c.mode='auto';await saveState();renderWorkoutBuilder();prepareWorkout()});
  if(!trainingActive()&&(!session||session.phase!=='done')){previewPlan=p;renderExerciseRail()}
}
function renderExerciseRail(){
  const p=trainingActive()?session.plan:previewPlan;if(!p)return;
  const active=trainingActive()?session.steps[session.index]?.exerciseIndex:previewIndex;
  $('#mobileExerciseSelect').innerHTML=p.exercises.map((e,i)=>'<option value="'+i+'">'+(i+1)+'. '+escapeHtml(e.name)+'</option>').join('');$('#mobileExerciseSelect').value=String(active||0);
  $('#exerciseRail').innerHTML=p.exercises.map((e,i)=>`<button class="exerciseTile ${i===active?'active':''}" data-preview="${i}" aria-pressed="${i===active}"><span class="tileNumber">${pad(i+1)}<small>${e.equipment==='kettlebell'?'12kg':e.equipment==='band'?'BAND':'BW'}</small></span><b>${e.name}</b><span>${e.sets}세트 × ${doseText(e)}${e.eachSide?' / 측':''}</span><i>${e.groups.map(partName).join(' · ')}</i></button>`).join('');
  $$('[data-preview]').forEach(b=>b.onclick=()=>{if(trainingActive()){toast('운동 중에는 현재 세트의 동작을 표시합니다.');return}previewIndex=Number(b.dataset.preview);showExercise(previewPlan.exercises[previewIndex],previewIndex);renderExerciseRail()});
}
function ensureStudio(){
  if(studio&&!studio.failed)return;
  if(studio)studio.dispose();
  $('#motionCanvas').replaceChildren();$('#motionEmpty').classList.remove('show');$('#workout').classList.remove('studioUnavailable');
  studio=new MotionStudio($('#motionCanvas'),()=>{$('#workout').classList.add('studioUnavailable');$('#motionEmpty').classList.add('show');$('#studioHint').textContent='아래 자세 순서를 확인해 주세요.'});
  studio.active=$('#workout').classList.contains('active');
}
function showExercise(e,index,set=0){
  $('#exerciseNumber').textContent='MOVEMENT '+pad(index+1)+' / '+pad((trainingActive()?session.plan:previewPlan).exercises.length);
  $('#woExercise').textContent=e.name;$('#mobileExerciseName').textContent=e.name;$('#mobileExerciseDose').textContent=e.sets+'세트 × '+(doseText(e))+(e.eachSide?' / 측':'');$('#woCue').textContent=e.cue;
  $('#woPart').textContent=equipmentText(e);
  $('#woRest').textContent='휴식 '+e.rest+'초';$('#woSet').textContent=set?`세트 ${set} / ${e.sets}`:e.sets+'세트';
  $('#woReps').textContent=(doseText(e))+(e.eachSide?' / 측':'');
  $('#woTempo').textContent=e.workSeconds?'시간 인터벌':e.holdSeconds?'자세 유지':(e.tempo==='slow'?'느린 템포 · ':'')+e.cycleSeconds+'초 / 회';
  $('#formCues').innerHTML=e.cues.map(c=>'<li>'+escapeHtml(c)+'</li>').join('');
  $('#muscleText').textContent=e.groups.map(partName).join(' · ');
  $('#studioEquipment').textContent=e.equipment==='kettlebell'?'SINGLE KETTLEBELL · 12KG':e.equipment==='band'?'STRAIGHT BAND · 60CM':'BODYWEIGHT';
  const alternatives={'kb-floor-press':'knee-pushup','kb-row':'prone-w','kb-goblet':'squat','kb-sumo':'squat','kb-deadlift':'good-morning','kb-curl':'close-knee','kb-suitcase':'side-plank'};
  $('#exerciseAlternative').innerHTML=e.equipment==='kettlebell'?`12kg이 부담스럽다면 <button data-alternative="${alternatives[e.id]}">맨몸 동작으로 변경 ↗</button>`:'';
  const alt=$('[data-alternative]');if(alt)alt.onclick=async()=>{if(trainingActive()){toast('진행 중에는 운동을 변경할 수 없습니다. 종료 후 변경해 주세요.');return}state.workoutConfig.customIds=previewPlan.exercises.map((x,i)=>i===previewIndex?alt.dataset.alternative:x.id);state.workoutConfig.mode='custom';await saveState();prepareWorkout();renderWorkoutBuilder();toast('맨몸 동작으로 바꾼 사용자 루틴을 적용했습니다.')};
  ensureStudio();studio.setExercise(e);updateTrainerContext();
  $('#previewToggle').disabled=trainingActive();$('#previewSpeed').disabled=trainingActive();$('#previewScrub').disabled=trainingActive();
}
function prepareWorkout(){
  if(trainingActive())return;
  followTodayProgram();
  clearInterval(clockTimer);session=null;previewPlan=currentPlan();previewIndex=0;
  showExercise(previewPlan.exercises[0],0);renderExerciseRail();resetControls();
  $('#progressDetail').textContent=track().lastCompletedDate===localDate()?'오늘 완료 기록이 있어요. 다시 운동할 수 있지만 오늘 단계는 중복 상승하지 않습니다.':'모든 세트 완료 + 여유 있게 완료 → 다음 운동에서 1단계 상승';
}
function resetControls(){
  syncTrainingLayout();
  $('#startWorkout').hidden=false;$('#startWorkout').disabled=false;$('#startWorkout').textContent='운동 시작 →';$('#startWorkout').onclick=beginWorkout;
  $('#nextWorkout').disabled=true;$('#pauseWorkout').disabled=true;$('#pauseWorkout').textContent='일시정지';$('#stopWorkout').hidden=true;$('#skipRest').hidden=true;$('#skipRest').disabled=false;
  $('#restBox').classList.remove('show');$('#completionFeedback').hidden=true;$('#prepOverlay').classList.remove('show');
  $('#phaseLabel').textContent='미리보기';$('#phaseRemain').textContent='자세를 먼저 확인해 주세요';$('#currentRep').textContent='01';$('#sideLabel').textContent='동작 가이드';$('#elapsed').textContent='00:00';$('#remain').textContent='00:00';updateSessionProgress();
}
function updateSessionProgress(){const confirmed=session?.confirmed||0,total=session?.steps?.length||previewPlan?.exercises.reduce((n,e)=>n+e.sets,0)||0;const pct=total?Math.round(confirmed/total*100):0;$('#sessionProgressText').textContent=confirmed+' / '+total+'세트 완료';$('#sessionProgressPercent').textContent=pct+'%';$('#sessionProgressBar').value=pct}
function beginWorkout(){
  if(session?.phase==='done'||session?.phase==='stopped')prepareWorkout();
  if(trainingActive())return;
  if(followTodayProgram()){prepareWorkout();renderWorkoutBuilder()}
  const plan=clone(previewPlan),steps=[];if(plan.circuit){for(let s=1;s<=Math.max(...plan.exercises.map(e=>e.sets));s++)plan.exercises.forEach((e,i)=>{if(s<=e.sets)steps.push({exerciseIndex:i,set:s})})}else plan.exercises.forEach((e,i)=>{for(let s=1;s<=e.sets;s++)steps.push({exerciseIndex:i,set:s})});
  session={id:crypto.randomUUID(),date:localDate(),trackKey:trackKey(state.workoutConfig),plan,steps,index:0,confirmed:0,phase:'prep',paused:false,prepMs:3000,setMs:0,activeMs:0,restMs:0};
  state.settings.compactWorkout=true;syncTrainingLayout();window.scrollTo({top:0,behavior:'smooth'});$('#startWorkout').hidden=true;$('#stopWorkout').hidden=false;$('#prepOverlay').classList.add('show');$('#prepCount').textContent='3';$('#pauseWorkout').disabled=true;showSessionExercise();startClock();saveDraft();
}
function startClock(){clearInterval(clockTimer);lastClock=performance.now();clockTimer=setInterval(tickTraining,100)}
function showSessionExercise(){const s=session.steps[session.index],e=session.plan.exercises[s.exerciseIndex];showExercise(e,s.exerciseIndex,s.set);studio.external=true;studio.playing=false;renderExerciseRail();updateSessionProgress()}
function tickTraining(){
  const now=performance.now(),dt=now-lastClock;lastClock=now;if(!session)return;updateTrainerContext();if(session.paused)return;
  if(session.phase==='prep'){session.prepMs-=dt;$('#prepCount').textContent=String(Math.max(1,Math.ceil(session.prepMs/1000)));if(session.prepMs<=0){$('#prepOverlay').classList.remove('show');session.phase='work';$('#pauseWorkout').disabled=false;$('#nextWorkout').disabled=false;saveDraft()}return}
  if(!['work','rest'].includes(session.phase))return;
  session.activeMs+=dt;$('#elapsed').textContent=fmt(session.activeMs/1000);
  if(session.phase==='rest'){session.restMs=Math.max(0,session.restMs-dt);$('#restSec').textContent=Math.ceil(session.restMs/1000);$('#phaseRemain').textContent=Math.ceil(session.restMs/1000)+'초 후 다음 세트';if(session.restMs<=0)endRest();return}
  session.setMs+=dt;const e=session.plan.exercises[session.steps[session.index].exerciseIndex];const perSide=(e.holdSeconds||e.workSeconds||e.reps*e.cycleSeconds),elapsed=session.setMs/1000,side=e.eachSide&&elapsed>=perSide?1:0;
  studio.side=side;studio.phase=e.holdSeconds?.15:(elapsed%e.cycleSeconds)/e.cycleSeconds;studio.draw();
  $('#remain').textContent=fmt(Math.max(0,perSide*(e.eachSide?2:1)-elapsed));
  $('#currentRep').textContent=(e.holdSeconds||e.workSeconds)?Math.max(0,Math.ceil(perSide-(elapsed%perSide)))+'초':Math.min(e.reps,Math.floor((elapsed%perSide)/e.cycleSeconds)+1)+' / '+e.reps;
  $('#sideLabel').textContent=e.eachSide?(side?'반대쪽':'한쪽'):e.workSeconds?'교대로 움직이기':'반복';
  $('#phaseLabel').textContent=e.holdSeconds?'자세 유지':studio.phase<.5?'정확하게 동작하기':'천천히 시작 자세로';
  $('#phaseRemain').textContent=e.eachSide?'양쪽 모두 마친 뒤 세트 완료':'실제 동작을 마친 뒤 세트 완료';
  if(elapsed>=perSide*(e.eachSide?2:1)){$('#phaseLabel').textContent='동작 가이드 완료';$('#phaseRemain').textContent='실제로 마쳤다면 세트 완료를 눌러 주세요';$('#currentRep').textContent=(e.holdSeconds||e.workSeconds)?'시간 완료':e.reps+' / '+e.reps;studio.phase=0;studio.draw()}
}
function confirmSet(){
  if(!session||session.phase!=='work'||session.paused)return;
  session.confirmed++;updateSessionProgress();
  if(session.index===session.steps.length-1){session.phase='feedback';updateTrainerContext();syncTrainingLayout();clearInterval(clockTimer);saveDraft();$('#nextWorkout').disabled=true;$('#pauseWorkout').disabled=true;$('#stopWorkout').hidden=true;$('#completionFeedback').hidden=false;$('#phaseLabel').textContent='모든 세트 완료';$('#phaseRemain').textContent='컨디션을 알려 주세요';$('#completionFeedback').scrollIntoView({behavior:'smooth',block:'nearest'});return}
  session.phase='rest';session.restMs=session.plan.exercises[session.steps[session.index].exerciseIndex].rest*1000;$('#restBox').classList.add('show');$('#restSec').textContent=session.restMs/1000;$('#skipRest').hidden=false;$('#nextWorkout').disabled=true;$('#phaseLabel').textContent='휴식';$('#currentRep').textContent='REST';updateTrainerContext();saveDraft();
}
function endRest(){if(session?.phase!=='rest'||session.paused)return;session.index++;session.phase='work';session.setMs=0;$('#restBox').classList.remove('show');$('#skipRest').hidden=true;$('#nextWorkout').disabled=false;showSessionExercise();saveDraft();if(navigator.vibrate)navigator.vibrate(100)}
function togglePause(){
  if(!session||!['work','rest'].includes(session.phase))return;
  session.paused=!session.paused;updateTrainerContext();lastClock=performance.now();$('#pauseWorkout').textContent=session.paused?'계속하기':'일시정지';$('#nextWorkout').disabled=session.paused||session.phase==='rest';$('#skipRest').disabled=session.paused;if(session.paused){$('#phaseLabel').textContent='일시정지';saveDraft()}
}
async function completeWorkout(feedback){
  if(session?.phase!=='feedback')return;
  const t=state.trainingTracks[session.trackKey]||(state.trainingTracks[session.trackKey]=newTrack());
  session.date=localDate();
  const result=recordCompletion(t,{sessionId:session.id,date:session.date,confirmed:session.confirmed,total:session.steps.length,feedback});if(!result.accepted)return;
  state.history.unshift({type:'workout',title:(session.plan.title||regionTitle())+' 운동 완료',date:session.date,at:new Date().toISOString(),level:session.plan.level,feedback,sessionId:session.id,trackKey:session.trackKey,sets:session.confirmed});
  const day=new Date().getDay();const task=state.tasks.find(t=>t.category==='workout'&&t.id!=='saturday-run'&&t.days.includes(day));if(task){state.completions[session.date]=state.completions[session.date]||{};state.completions[session.date][task.id]=true}
  session.phase='done';updateTrainerContext();syncTrainingLayout();$('#mobileExerciseName').textContent='오늘 운동 완료';$('#mobileExerciseDose').textContent='LEVEL '+pad(t.level+1);delete state.activeWorkout;await saveState();$('#completionFeedback').hidden=true;$('#phaseLabel').textContent='운동 완료';$('#phaseRemain').textContent='오늘의 성장을 저장했어요';$('#currentRep').textContent='✓';$('#sideLabel').textContent='COMPLETE';
  $('#woExercise').textContent='오늘도 해냈어요!';$('#woCue').textContent=result.advanced?'다음 운동은 한 단계 높아진 루틴으로 준비됩니다.':feedback==='pain'?'다음 단계는 낮췄어요. 통증이 있으면 운동을 쉬고 상태를 확인해 주세요.':'오늘의 완료를 기록하고 현재 강도를 유지합니다.';
  $('#progressDetail').textContent='현재 LEVEL '+pad(t.level+1)+' · 반복 수, 세트 수, 템포를 단계적으로 조절합니다. 하루 1회까지 단계가 상승합니다.';
  $('#startWorkout').hidden=false;$('#startWorkout').textContent='다음 루틴 확인 →';$('#startWorkout').onclick=()=>{prepareWorkout();renderWorkoutBuilder();$('#startWorkout').onclick=beginWorkout};
  renderToday();renderHistory();renderWorkoutBuilder();toast(result.advanced?'완료 기록 저장 · 다음 운동 LEVEL '+pad(t.level+1):'완료 기록을 저장했습니다.');
}
function stopWorkout(){if(!trainingActive())return;session.phase='stopped';clearInterval(clockTimer);delete state.activeWorkout;saveState();prepareWorkout();renderWorkoutBuilder();toast('운동을 종료했습니다. 미완료 운동은 단계를 올리지 않습니다.')}
function switchView(v){$$('.view').forEach(x=>x.classList.toggle('active',x.id===v));$$('#nav button').forEach(x=>x.classList.toggle('active',x.dataset.view===v));if(v==='workout'){if(!previewPlan)prepareWorkout();ensureStudio();studio.active=true;studio.resize()}else if(studio)studio.active=false}
function openTraining(){switchView('workout');$('#startWorkout').scrollIntoView({behavior:'smooth',block:'nearest'})}
$$('#nav button').forEach(b=>b.onclick=()=>switchView(b.dataset.view));
$('#autoGenerateWorkout').onclick=()=>{if(trainingActive()){toast('현재 운동을 마치거나 종료해 주세요.');return}state.settings.compactWorkout=true;prepareWorkout();renderWorkoutBuilder();saveState();if(matchMedia('(max-width:600px)').matches)window.scrollTo({top:0,behavior:'smooth'});else $('#exerciseRail').scrollIntoView({behavior:'smooth',block:'nearest'});toast((currentPlan().title||regionTitle())+' 준비 완료')};
$('#addBodyweightExercise').onclick=async()=>{if(trainingActive()){toast('진행 중인 운동을 먼저 종료해 주세요.');return}const id=$('#bodyweightExerciseSelect').value;if(!id)return;if(state.workoutConfig.customIds.includes(id)){toast('이미 추가한 운동입니다.');return}if(state.workoutConfig.customIds.length>=10){toast('사용자 루틴은 최대 10개 동작까지 추가할 수 있습니다.');return}state.workoutConfig.customIds.push(id);await saveState();renderWorkoutBuilder()};
$('#applyCustomWorkout').onclick=async()=>{if(trainingActive()){toast('진행 중인 운동을 먼저 종료해 주세요.');return}if(!state.workoutConfig.customIds.length){toast('운동을 먼저 추가해 주세요.');return}state.workoutConfig.mode='custom';await saveState();prepareWorkout();renderWorkoutBuilder();toast('사용자 루틴을 적용했습니다.')};
$('#startWorkout').onclick=beginWorkout;$('#nextWorkout').onclick=confirmSet;$('#pauseWorkout').onclick=togglePause;$('#skipRest').onclick=endRest;$('#stopWorkout').onclick=stopWorkout;
$$('[data-feedback]').forEach(b=>b.onclick=()=>completeWorkout(b.dataset.feedback));
$$('[data-camera]').forEach(b=>b.onclick=()=>{studio?.setView(b.dataset.camera);$$('[data-camera]').forEach(x=>x.classList.toggle('active',x===b))});
$('#previewToggle').onclick=()=>{if(!studio||trainingActive())return;studio.playing=!studio.playing;$('#previewToggle').textContent=studio.playing?'Ⅱ':'▶';$('#previewToggle').setAttribute('aria-label',studio.playing?'미리보기 일시정지':'미리보기 재생')};
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
  state.settings={...DEFAULT_STATE.settings,...state.settings};state.tasks=Array.isArray(state.tasks)?state.tasks:clone(DEFAULT_STATE.tasks);state.history=Array.isArray(state.history)?state.history:[];state.completions=state.completions||{};
  if(!state.workoutConfig?.planDay){state.workoutConfig={...state.workoutConfig,planDay:seoulWeekday()}}migrateWorkout(state);followTodayProgram();state.tasks=state.tasks.filter(t=>t.id!=='saturday-run');const scheduledTask=state.tasks.find(t=>t.id==='workout-weekday');if(scheduledTask){scheduledTask.days=[0,1,2,3,4,5,6];scheduledTask.title='주 7일 근력 루틴'}applyTheme(state.settings.theme);renderAll();prepareWorkout();
  const draft=state.activeWorkout;
  if((draft?.date===localDate()||draft?.phase==='feedback')&&draft?.steps?.length&&draft.index<draft.steps.length&&draft.confirmed===(draft.phase==='feedback'?draft.steps.length:draft.index+(draft.phase==='rest'?1:0))&&draft.plan?.exercises?.every(e=>EXERCISES.some(x=>x.id===e.id))){
    session={...draft,paused:true,phase:['rest','feedback'].includes(draft.phase)?draft.phase:'work'};showSessionExercise();$('#startWorkout').hidden=true;$('#stopWorkout').hidden=false;$('#pauseWorkout').disabled=false;$('#pauseWorkout').textContent='계속하기';$('#nextWorkout').disabled=true;$('#phaseLabel').textContent='일시정지';$('#phaseRemain').textContent='이전 운동을 이어갈 수 있어요';if(session.phase==='rest'){$('#restBox').classList.add('show');$('#skipRest').hidden=false;$('#skipRest').disabled=true}if(session.phase==='feedback'){$('#completionFeedback').hidden=false;$('#stopWorkout').hidden=true;$('#pauseWorkout').disabled=true;$('#phaseLabel').textContent='모든 세트 완료';$('#phaseRemain').textContent='컨디션을 알려 주세요'}else startClock();
  }
  syncTrainingLayout();
  if(new URLSearchParams(location.search).get('view')==='workout')switchView('workout');
  await initPushStatus();startLocalNotificationWatcher();await saveState();
}
load().catch(e=>{console.error(e);document.body.insertAdjacentHTML('beforeend','<div class="startupError">앱 초기화 오류: '+escapeHtml(e.message)+'</div>')});

function syncTrainingLayout(){const panel=$('#workout');const running=session&&['prep','work','rest'].includes(session.phase);panel.classList.toggle('trainingInProgress',!!running);panel.classList.toggle('trainingComplete',session?.phase==='done');panel.classList.toggle('routineCollapsed',!!state?.settings?.compactWorkout||!!running);panel.toggleAttribute('data-session-active',!!running);$('#woExercise')?.closest('.woPanel')?.querySelector('.woButtons')?.toggleAttribute('hidden',session?.phase==='feedback')}
$('#editRoutine').onclick=()=>{if(trainingActive()){toast('운동을 마치거나 종료한 뒤 루틴을 변경해 주세요.');return}state.settings.compactWorkout=false;saveState();syncTrainingLayout();window.scrollTo({top:0,behavior:'smooth'})};

$('#mobileExerciseSelect').onchange=()=>{if(trainingActive())return;previewIndex=Number($('#mobileExerciseSelect').value);showExercise(previewPlan.exercises[previewIndex],previewIndex);renderExerciseRail()};

function updateTrainerContext(){if(!studio)return;const exercise=session?.plan?.exercises?.[session?.steps?.[session?.index]?.exerciseIndex];studio.setContext({phase:session?.paused&&['work','rest'].includes(session?.phase)?'paused':session?.phase||'ready',activeSeconds:(session?.activeMs||0)/1000,completedSets:session?.confirmed||0,totalSets:session?.steps?.length||1,setElapsed:(session?.setMs||0)/1000,restElapsed:session?.phase==='rest'?Math.max(0,(exercise?.rest||60)-(session.restMs||0)/1000):0})}

function renderProgramBuilder(plan){
 const c=state.workoutConfig;
 $$('.workoutBuilder')[0].dataset.programMode=c.mode;
 $$('[data-program-mode]').forEach(button=>{button.classList.toggle('active',button.dataset.programMode===c.mode);button.setAttribute('aria-pressed',String(button.dataset.programMode===c.mode));button.onclick=()=>selectProgram(button.dataset.programMode,c.planDay)});
 $('#programDayPicker').hidden=c.mode!=='weekly';$('#weeklyCoverage').hidden=c.mode!=='weekly';$('#regionPicker').hidden=c.mode!=='auto';$('#routineVariants').hidden=!['auto','custom'].includes(c.mode);
 $('#programDayPicker').innerHTML=WEEKLY_SCHEDULE.map(day=>'<button data-program-day="'+day.day+'" class="'+(day.day===c.planDay?'active':'')+'"><b>'+day.name+'</b><small>'+day.title+'</small></button>').join('');
 $$('[data-program-day]').forEach(button=>button.onclick=()=>selectProgram('weekly',Number(button.dataset.programDay)));
 $('#programSummary').innerHTML=c.mode==='weekly'?'<b>'+escapeHtml(plan.title)+'</b><span>'+plan.targets.map(partName).join(' · ')+' · 약 '+plan.estimatedMinutes+'분</span><small>같은 직접 훈련 부위가 연속되지 않게 배치했습니다. 협력근·안정근 사용은 겹칠 수 있습니다.</small>':c.mode==='cardio'?'<b>근력 루틴과 별개로 선택하는 유산소</b><span>50~60초 운동 / 15초 휴식 · 4라운드 · 점프 없음</span><small>발을 구르지 않는 걷기·스텝·복싱 동작입니다. 근력 루틴의 회복일을 강한 추가 운동으로 채우지 않도록 강도를 조절하세요.</small>':'<b>자유 구성</b><span>이 모드는 주간 분할과 별도로 원하는 운동을 선택합니다.</span>';
 const counts=weeklyCoverage();$('#weeklyCoverage').innerHTML=PROGRAM_TARGETS.map(part=>'<span>'+part.name+' <b>'+counts[part.id]+'회</b></span>').join('');
}
async function selectProgram(mode,day){if(trainingActive()){toast('진행 중인 운동을 먼저 종료해 주세요.');return}state.workoutConfig.mode=mode;state.workoutConfig.planDay=day||seoulWeekday();state.workoutConfig.selectionDate=localDate();await saveState();prepareWorkout();renderWorkoutBuilder()}
function followTodayProgram(){const c=state?.workoutConfig,today=localDate(),draft=state?.activeWorkout;if(!c||draft&&(draft.date===today||draft.phase==='feedback'))return false;if(['weekly','cardio'].includes(c.mode)&&c.selectionDate!==today){c.mode='weekly';c.planDay=seoulWeekday();c.selectionDate=today;return true}return false}
function renderWeek(){renderTaskWeek();const root=$('#weeklyTrainingSummary');if(!root)return;root.innerHTML='<div class="panel weeklyPlanPanel"><div class="panelhead">본운동 주간 분할 · 각 부위 주 3회</div><div class="weeklyPlanCards">'+WEEKLY_SCHEDULE.map(day=>{const p=createWeeklyPlan(day.day,0);return '<button data-week-open="'+day.day+'"><b>'+day.name+' · '+day.title+'</b><span>'+day.targets.map(partName).join(' · ')+'</span><small>'+p.exercises.length+'개 동작 · 약 '+p.estimatedMinutes+'분</small></button>'}).join('')+'</div></div>';$$('[data-week-open]').forEach(button=>button.onclick=async()=>{if(trainingActive()){switchView('workout');toast('현재 운동을 먼저 마치거나 종료해 주세요.');return}await selectProgram('weekly',Number(button.dataset.weekOpen));switchView('workout')})}
