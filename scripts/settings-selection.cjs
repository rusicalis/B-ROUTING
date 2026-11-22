const {chromium,webkit,devices}=require(process.env.PLAYWRIGHT_CORE_PATH||'playwright-core');
const assert=require('node:assert/strict');
const origin=process.env.TEST_URL||'http://127.0.0.1:4173',out=process.env.TEST_OUTPUT_DIR||'.',key='burning-routine-local-v150';
(async()=>{for(const engine of ['chromium','webkit']){
 const browser=engine==='chromium'?await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}):await webkit.launch({headless:true});
 try{
  const context=await browser.newContext({...devices['iPhone 13 Mini']});
  await context.addInitScript(k=>{if(!localStorage.getItem(k))localStorage.setItem(k,JSON.stringify({settings:{uiMode:'dark'},workoutConfig:{schema:5,compactRevision:1,mode:'preset',planDay:1,presetId:'user-week',targetMinutes:30,selectionDate:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul'}).format(new Date())},savedPresets:[{id:'saved-pull',name:'내 등 운동',baseTargetMinutes:30,exercises:[{id:'kb-row',sets:3,reps:8},{id:'kb-concentration-curl',sets:2,reps:6}]}],tasks:[{id:'my-task',title:'테스트 일정',start:'05:35',end:'06:00',days:[1,2,3,4,5],notify:'exact',category:'work'}],history:[],completions:{},trainingTracks:{}}));},key);
  const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.clock.install();await p.goto(origin+'/?view=workout');await p.waitForSelector('#imagePlayIcon:not([hidden])');
  const stored=()=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),key),tileNames=()=>p.locator('#settings #exerciseRail .exerciseTile b').allTextContents();
  await p.locator('#imagePause').tap();await p.clock.fastForward(3100);await p.clock.fastForward(33000);await p.locator('#imagePause').tap();const active=(await stored()).activeWorkout;
  await p.locator('[data-view=settings]').tap();await p.locator('#autoGenerateWorkout').tap();assert.equal((await stored()).activeWorkout.id,active.id,'reapplying the current routine keeps its progress');await p.locator('[data-view=settings]').tap();
  await p.locator('#quickRoutine').selectOption('cardio');
  assert.equal((await stored()).workoutConfig.mode,'cardio','selecting a next routine cannot revert to the active default');
  assert.notDeepEqual(await tileNames(),active.plan.exercises.map(e=>e.name),'YOUR ROUTINE shows selected cardio');
  assert.equal((await stored()).activeWorkout.id,active.id,'selection alone preserves the active session');
  await p.locator('#quickRoutine').selectOption('preset');await p.locator('#presetSelect').selectOption('saved-pull');
  assert.equal((await stored()).workoutConfig.presetId,'saved-pull');assert.equal((await stored()).workoutConfig.mode,'preset');
  assert.match(await p.locator('#routineTitle').innerText(),/내 등 운동/);assert.deepEqual(await tileNames(),['케틀벨 원암 로우','케틀벨 원암 컨센트레이션 컬']);
  await p.reload();await p.locator('[data-view=settings]').tap();assert.equal(await p.locator('#presetSelect').inputValue(),'saved-pull');assert.deepEqual(await tileNames(),['케틀벨 원암 로우','케틀벨 원암 컨센트레이션 컬']);
  assert.equal((await stored()).activeWorkout.id,active.id);await p.locator('#autoGenerateWorkout').tap();assert.equal((await stored()).activeWorkout,undefined,'explicit apply opens the selected preview');assert.ok((await stored()).unfinishedWorkouts.some(a=>a.id===active.id),'replaced attempt is retained without awarding credit');assert.deepEqual((await stored()).unfinishedWorkouts.find(a=>a.id===active.id).completedStepIds,active.completedStepIds);assert.equal(active.confirmed,1);
  assert.equal((await stored()).history.length,0);await p.locator('#imagePause').tap();assert.deepEqual((await stored()).activeWorkout.plan.exercises.map(e=>e.id),['kb-row','kb-concentration-curl']);await p.clock.fastForward(3100);await p.locator('#imagePause').tap();
  await p.locator('[data-view=settings]').tap();
  await p.locator('#quickRoutine').selectOption('custom');assert.equal(await p.locator('#exerciseRail .exerciseTile').count(),0);assert.equal(await p.locator('#autoGenerateWorkout').isDisabled(),true);await p.locator('#bodyweightExerciseSelect').selectOption('squat');await p.locator('#addBodyweightExercise').tap();assert.deepEqual(await tileNames(),['맨몸 스쿼트']);await p.locator('#quickRoutine').selectOption('preset');await p.locator('#presetSelect').selectOption('compact-basic');assert.equal(await p.locator('#exerciseRail .exerciseTile').count(),4);
  assert.equal(await p.locator('#appearanceModes input[name=appearanceMode]').count(),2,'appearance choices are checkable inputs');
  const modeInset=await p.locator('#appearanceModes').evaluate(el=>{const box=el.getBoundingClientRect(),label=el.querySelector('label').getBoundingClientRect();return label.x-box.x;});assert.ok(modeInset>=12,'mode options are inset from panel edge');
  assert.equal(await p.locator('#deviceControls #keepScreenOn,#deviceControls #enablePush,#deviceControls #testPush').count(),3);
  assert.deepEqual(await p.locator('#deviceControls label,#deviceControls button').allTextContents(),['화면 꺼짐 방지','알림 활성화','알림 테스트']);
  assert.equal(await p.locator('#serverStatus,#motionSettings,.appearanceNote,.motionHelp').count(),0,'storage/source/explanation cards removed');
  await p.locator('.settingRow .stitle').fill('편집 중인 제목');
  for(const mode of ['light','dark']){await p.locator('[name=appearanceMode][value='+mode+']').check();assert.equal(await p.locator('html').getAttribute('data-mode'),mode);assert.equal(await p.locator('.settingRow .stitle').inputValue(),'편집 중인 제목');assert.equal(await p.locator('[name=appearanceMode]:checked').count(),1);}
  for(const width of [375,320]){
   await p.setViewportSize({width,height:629});await p.locator('#settingsTasks').scrollIntoViewIfNeeded();
   const row=await p.locator('.settingRow').evaluate(el=>{const rect=sel=>el.querySelector(sel).getBoundingClientRect().toJSON();return {title:rect('.stitle'),days:rect('.taskDays'),time:rect('.stime'),notify:rect('.snotify')};});
   assert.ok(row.days.y-row.title.bottom>=8,'weekday spacing');assert.ok(Math.abs(row.time.y-row.notify.y)<2,'time and notification share one row');assert.ok(row.time.right+4<=row.notify.x,'native inputs do not overlap');assert.ok(row.notify.right<=width&&row.time.x>=0);
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  }
  await p.setViewportSize({width:375,height:629});await p.locator('.settingRow .stime').fill('07:25');await p.locator('.settingRow .snotify').selectOption('-5');await p.locator('#saveSettings').tap();assert.equal((await stored()).tasks[0].start,'07:25');assert.equal((await stored()).tasks[0].notify,'-5');
  await p.locator('#settingsTasks').scrollIntoViewIfNeeded();await p.screenshot({path:out+'/V4_2_2_일정_'+engine+'.png',scale:'css'});
  await p.locator('#appearanceSettings').scrollIntoViewIfNeeded();await p.screenshot({path:out+'/V4_2_2_설정_'+engine+'.png',scale:'css'});
  assert.deepEqual(errors,[]);console.log('PASS '+engine+' routine/preset preview+reload+explicit apply; checkbox modes, compact utilities and native same-row settings375/320');
  const nextContext=await browser.newContext({...devices['iPhone 13 Mini']});
  await nextContext.addInitScript(k=>{localStorage.setItem(k,JSON.stringify({settings:{uiMode:'dark'},workoutConfig:{schema:5,compactRevision:1,mode:'cardio',targetMinutes:30,planDay:1,presetId:'saved-stale',selectionDate:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul'}).format(new Date())},savedPresets:[{id:'saved-stale',name:'기존 선택 프리셋',baseTargetMinutes:30,exercises:[{id:'pushup',sets:2,reps:8}]}],tasks:[],history:[],completions:{},trainingTracks:{}}));},key);
  const q=await nextContext.newPage();q.on('pageerror',e=>errors.push(e.message));await q.clock.install();await q.goto(origin+'/?view=workout');await q.waitForSelector('#imagePlayIcon:not([hidden])');await q.locator('#imagePause').tap();await q.locator('[data-view=settings]').tap();await q.locator('#quickRoutine').selectOption('preset');
  const nextState=()=>q.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
  assert.equal(await q.locator('#prepOverlay').evaluate(el=>el.classList.contains('show')),false,'editing during prep leaves a resumable paused workout');assert.equal(await q.locator('#imagePause').isEnabled(),true);
  await q.locator('[data-view=workout]').tap();await q.clock.fastForward(6000);assert.equal(await q.locator('#imagePlayIcon').isVisible(),true);
  const cardio=(await nextState()).activeWorkout;await q.locator('[name=workoutMinutes][value="40"]').check();const resized=(await nextState()).activeWorkout;
  assert.equal(resized.plan.kind,'cardio');assert.deepEqual(resized.plan.exercises.map(e=>e.id),cardio.plan.exercises.map(e=>e.id));assert.equal(resized.plan.targetMinutes,40);
  assert.equal((await nextState()).workoutConfig.mode,'preset');assert.equal((await nextState()).workoutConfig.targetMinutes,30,'current duration cannot overwrite the next selected plan');
  await q.locator('#imagePause').tap();assert.equal(await q.locator('#imagePlayIcon').isVisible(),false,'prep-edited workout can resume');
  assert.deepEqual(errors,[]);console.log('PASS '+engine+' prep editing stays resumable; active cardio duration remains isolated from next preset');
 }finally{await browser.close()}
}})().catch(e=>{console.error(e);process.exitCode=1});
