const {chromium,webkit,devices}=require(process.env.PLAYWRIGHT_CORE_PATH||'playwright-core');
const assert=require('node:assert/strict');
const origin=process.env.TEST_URL||'http://127.0.0.1:4173',out=process.env.TEST_OUTPUT_DIR||'.',key='burning-routine-local-v150';
const dose=(s,row=s.steps[s.index])=>s.sourceSteps.find(r=>r.stepId===row.stepId)?.dose||row.dose||s.plan.exercises[row.exerciseIndex];
const saveShape=s=>s.plan.exercises.map(e=>[e.id,e.sets,e.reps,e.holdSeconds||e.workSeconds||0]);
(async()=>{for(const engine of ['chromium','webkit']){
 const browser=engine==='chromium'?await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}):await webkit.launch({headless:true});
 try{
  const started={},pages={};
  for(const mode of ['normal','hard','extreme']){
   const ctx=await browser.newContext({...devices['iPhone 13 Mini']});
   await ctx.addInitScript(({key,mode})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({settings:{uiMode:'dark'},workoutConfig:{schema:5,compactRevision:1,mode:'preset',presetId:'sample',doseMode:'fit',intensity:mode,planDay:1,targetMinutes:30,selectionDate:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul'}).format(new Date())},savedPresets:[{id:'sample',name:'강도 비교',baseTargetMinutes:30,exercises:['pushup','squat'].map(id=>({id,sets:3,reps:8,cycleSeconds:4}))}],tasks:[],history:[],completions:{},trainingTracks:{}}));},{key,mode});
   const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>{errors.push(e.message);console.error('BROWSER',engine,mode,e.stack)});await p.clock.install();await p.goto(origin+'/?view=workout');await p.waitForSelector('#imagePlayIcon:not([hidden])');await p.locator('#imagePause').tap();await p.clock.fastForward(3100);await p.locator('#imagePause').tap();
   const state=()=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);const session=(await state()).activeWorkout;
   assert.equal(session.plan.exercises[0].reps,{normal:8,hard:10,extreme:12}[mode],'saved preset must use selected intensity before start');assert.equal(session.intensity,mode);assert.equal(session.plan.intensityPolicy,2);assert.ok(session.plan.estimatedSeconds<=1800);assert.equal(session.sourceSteps.length,6,'short saved prescription is not filled with extra sets');
   started[mode]=session;pages[mode]={p,state,errors};
  }
  const {p,state,errors}=pages.normal;const before=(await state()).activeWorkout;
  for(const mode of ['hard','extreme','normal','hard']){
   await p.locator('[name=workoutIntensity][value='+mode+']').check();const session=(await state()).activeWorkout;
   assert.deepEqual(saveShape(session),saveShape(started[mode]),'pre-start and live future targets are identical');assert.equal(session.id,before.id);assert.equal(session.setMs,before.setMs);assert.equal(session.activeMs,before.activeMs);assert.deepEqual(session.completedStepIds,before.completedStepIds);assert.equal(dose(session).reps,8,'current set remains unchanged');
   const next=session.steps[session.index+1];assert.equal(dose(session,next).reps,{normal:8,hard:10,extreme:12}[mode]);assert.match(await p.locator('#upNext').innerText(),new RegExp({normal:8,hard:10,extreme:12}[mode]+'회'));
  }
  await p.reload();await p.waitForSelector('#imagePlayIcon:not([hidden])');assert.equal((await state()).activeWorkout.intensity,'hard');assert.equal(await p.locator('[name=workoutIntensity][value=hard]').isChecked(),true);
  for(const minutes of [40,30]){await p.locator('[name=workoutMinutes][value="'+minutes+'"]').check();const session=(await state()).activeWorkout;assert.equal(session.intensity,'hard');assert.equal(session.plan.targetMinutes,minutes);assert.ok(session.plan.estimatedSeconds<=minutes*60);assert.equal(dose(session).reps,8);assert.deepEqual(session.completedStepIds,[]);}
  await p.screenshot({path:out+'/V4_3_강도_'+engine+'.png',scale:'css'});
  assert.deepEqual(errors,[]);for(const entry of Object.values(pages))assert.deepEqual(entry.errors,[]);
  console.log('PASS '+engine+' pre-start/live shared intensity on saved presets; future-dose preview, preserved current/credits/time, repeat toggles, reload and resize');
  const {createCompactPlan}=await import('../compact-program.mjs'),{createProgress}=await import('../session-progress.mjs');
  const normal=createCompactPlan(1,0,{targetMinutes:30}),legacy=structuredClone(normal);delete legacy.intensityPolicy;legacy.intensity='hard';
  legacy.exercises=normal.exercises.map(e=>({...e,sets:e.sets+1,reps:Math.ceil(e.reps*1.15),...(e.holdSeconds?{holdSeconds:Math.ceil(e.holdSeconds*1.15)}:{}),...(e.workSeconds?{workSeconds:Math.ceil(e.workSeconds*1.15)}:{})}));
  legacy.steps=legacy.exercises.flatMap((e,exerciseIndex)=>Array.from({length:e.sets},(_,i)=>({exerciseIndex,set:i+1,restAfter:i===e.sets-1?60:30})));legacy.steps.at(-1).restAfter=0;
  legacy.estimatedSeconds=legacy.steps.reduce((sum,row)=>{const e=legacy.exercises[row.exerciseIndex];return sum+(e.holdSeconds||e.workSeconds||e.reps*e.cycleSeconds)*(e.eachSide?2:1)+row.restAfter},0);assert.ok(legacy.estimatedSeconds>1800);
  const progress=createProgress(legacy,legacy.steps),date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul'}).format(new Date()),old={id:'legacy-hard',date,trackKey:normal.key,plan:legacy,...progress,steps:structuredClone(progress.sourceSteps),index:0,phase:'work',paused:true,intensity:'hard',setMs:2000,activeMs:2000,restMs:0,confirmed:0};
  const migrated=await browser.newContext({...devices['iPhone 13 Mini']});await migrated.addInitScript(({key,date,old})=>localStorage.setItem(key,JSON.stringify({settings:{uiMode:'dark'},workoutConfig:{schema:5,compactRevision:1,mode:'preset',presetId:'user-week',planDay:1,targetMinutes:30,intensity:'hard',selectionDate:date},activeWorkout:old,tasks:[],history:[],completions:{},trainingTracks:{}})),{key,date,old});
  const q=await migrated.newPage();q.on('pageerror',e=>errors.push(e.message));await q.goto(origin+'/?view=workout');await q.waitForSelector('#imagePlayIcon:not([hidden])');const restored=await q.evaluate(k=>JSON.parse(localStorage.getItem(k)).activeWorkout,key);
  assert.equal(restored.id,old.id);assert.equal(restored.plan.intensityPolicy,2);assert.equal(restored.setMs,2000);assert.equal(restored.activeMs,2000);assert.equal(dose(restored).reps,legacy.exercises[0].reps);assert.deepEqual(restored.completedStepIds,[]);assert.ok(restored.plan.estimatedSeconds<=1800);assert.deepEqual(errors,[]);
  console.log('PASS '+engine+' legacy overlong Hard session migrates to bounded policy without rewriting current work or credit');
 }finally{await browser.close()}
}})().catch(e=>{console.error(e);process.exitCode=1});
