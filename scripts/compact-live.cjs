const {chromium,webkit,devices}=require(process.env.PLAYWRIGHT_CORE_PATH||'playwright-core');
const assert=require('node:assert/strict');
const origin=process.env.TEST_URL||'http://127.0.0.1:4173',out=process.env.TEST_OUTPUT_DIR||'.',key='burning-routine-local-v150';
(async()=>{for(const engine of ['chromium','webkit']){
 const browser=engine==='chromium'?await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}):await webkit.launch({headless:true});
 try{
  const ctx=await browser.newContext({...devices['iPhone 13 Mini'],reducedMotion:'reduce'});
  await ctx.addInitScript(k=>{if(!localStorage.getItem(k))localStorage.setItem(k,JSON.stringify({settings:{uiMode:'dark'},workoutConfig:{schema:5,compactRevision:1,mode:'preset',planDay:1,selectionDate:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul'}).format(new Date()),presetId:'fixture',doseMode:'goal',targetMinutes:30,regions:['full'],customIds:[]},savedPresets:[{id:'fixture',name:'동작 이동 검증',baseTargetMinutes:30,exercises:['pushup','squat','close-pushup','abs-crunch'].map(id=>({id,sets:1,reps:1,cycleSeconds:1}))}],tasks:[],history:[],completions:{},trainingTracks:{}}));},key);
  const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const stored=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
  await page.clock.install();
  await page.goto(origin+'/?view=workout');await page.waitForSelector('#motionCanvas[data-media-ready=true]');
  assert.equal(await page.locator('#restBox').count(),0,'separate rest card removed');
  assert.equal(await page.locator('#unfinishedPanel').count(),0,'separate recovery list removed');
  assert.equal(await page.locator('#imagePlayIcon').isVisible(),true);
  await page.locator('#imagePause').tap();await page.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).activeWorkout?.phase==='rest',key);
  assert.equal((await stored()).activeWorkout.confirmed,1,'set completes on timer expiry');
  assert.match(await page.locator('#setTimerLabel').innerText(),/휴식/);
  await page.locator('#imagePause').tap();assert.equal(await page.locator('#imageSkip').isVisible(),true);
  await page.locator('#imageSkip').tap(); // skip rest, exercise 2
  await page.locator('#nextExercise').tap(); // leave exercise 2 incomplete, go exercise 3
  await page.locator('#imagePause').tap(); // pause to inspect arrows and live intensity
  assert.equal((await stored()).activeWorkout.confirmed,1,'arrow must not award credit');
  await page.locator('#previousExercise').tap();
  assert.equal((await stored()).activeWorkout.steps[0].exerciseIndex,1,'previous selects missed exercise 2');
  assert.equal(await page.locator('#previousExercise').isDisabled(),true,'completed exercise 1 omitted');
  await page.locator('#imagePause').tap();
  const before=(await stored()).activeWorkout;
  await page.locator('[name=workoutIntensity][value=hard]').check();
  const after=(await stored()).activeWorkout;
  assert.deepEqual(after.completedStepIds,before.completedStepIds);
  assert.equal(after.setMs,before.setMs,'changing intensity preserves current elapsed time');
  assert.equal(after.intensity,'hard');
  assert.equal(after.sourceSteps.filter(s=>s.exerciseIndex===0).length,1,'completed movement is not reintroduced');
  await page.reload();await page.waitForSelector('#imagePlayIcon:not([hidden])');
  assert.notEqual(await page.locator('#remain').innerText(),'00:00','paused reload restores the set countdown immediately');
  assert.equal((await stored()).activeWorkout.intensity,'hard');
  assert.equal(await page.locator('[name=workoutIntensity][value=hard]').isChecked(),true);
  await page.locator('#stopWorkout').tap();
  assert.equal(await page.locator('[name=workoutIntensity][value=normal]').isDisabled(),true,'stopped session cannot be replaced by intensity editing');
  await page.locator('#imagePause').tap();
  assert.equal(await page.locator('#stopWorkout').isVisible(),true,'resuming restores the end control');
  assert.equal(await page.locator('#workout').evaluate(e=>e.classList.contains('trainingInProgress')),true);
  await page.locator('#imagePause').tap();
  await page.screenshot({path:out+'/V4_2_운동_다크_'+engine+'.png',scale:'css'});
  await page.locator('[name=workoutIntensity][value=normal]').check();
  await page.locator('#imagePause').tap();
  for(let guard=0;guard<15&&(await stored()).activeWorkout?.phase!=='feedback';guard++){
   const draft=(await stored()).activeWorkout;
   if(draft.phase==='rest'){await page.locator('#imagePause').tap();await page.locator('#imageSkip').tap();}
   else await page.clock.fastForward(100000);
  }
  assert.equal(await page.locator('#completionFeedback').isVisible(),true,'missed and later exercise sets all finish in one ledger: '+JSON.stringify({errors,draft:((d)=>({phase:d.phase,index:d.index,confirmed:d.confirmed,step:d.steps[d.index],credits:d.completedStepIds} ))((await stored()).activeWorkout),display:await page.locator('#remain').innerText(),play:await page.locator('#imagePlayIcon').isVisible()}));
  await page.locator('[data-feedback=good]').tap();
  assert.equal((await stored()).history.filter(x=>x.type==='workout').length,1);
  assert.equal((await stored()).activeWorkout,undefined);
  await page.locator('#imagePause').tap();
  assert.notEqual((await stored()).activeWorkout.id,before.id,'new play does not restore stale unfinished cards');
  assert.equal((await stored()).activeWorkout.confirmed,0);
  assert.deepEqual(errors,[]);
  console.log('PASS '+engine+' automatic sets, integrated rest, central controls, incomplete-only arrows, live intensity and reload');
  await ctx.close();
  const sunday=await browser.newContext({...devices['iPhone 13 Mini'],reducedMotion:'reduce'});
  await sunday.addInitScript(k=>{if(!localStorage.getItem(k))localStorage.setItem(k,JSON.stringify({settings:{uiMode:'light'},workoutConfig:{schema:5,compactRevision:1,mode:'preset',planDay:7,selectionDate:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul'}).format(new Date()),presetId:'user-week',targetMinutes:30,regions:['full'],customIds:[]},tasks:[],history:[],completions:{},trainingTracks:{}}));},key);
  const sun=await sunday.newPage();sun.on('pageerror',e=>errors.push(e.message));await sun.goto(origin+'/?view=workout');await sun.waitForSelector('#imagePlayIcon:not([hidden])');
  await sun.clock.install();await sun.locator('#imagePause').tap();await sun.clock.fastForward(3100);
  const sunState=()=>sun.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
  assert.deepEqual((await sunState()).activeWorkout.plan.exercises.map(e=>e.reps),[5,10,15]);
  assert.equal(await sun.locator('#durationPicker').isVisible(),false,'Sunday is endless');
  await sun.clock.fastForward(21000);assert.equal((await sunState()).activeWorkout.phase,'work');
  await sun.clock.fastForward(41000);assert.equal((await sunState()).activeWorkout.phase,'work');
  await sun.clock.fastForward(61000);let sd=(await sunState()).activeWorkout;
  assert.equal(sd.phase,'rest');assert.equal(sd.confirmed,3);assert.equal(sd.sourceSteps.length,6);assert.equal(sd.restMs,30000);
  await sun.locator('#imagePause').tap();await sun.locator('[name=workoutIntensity][value=extreme]').check();
  assert.equal((await sunState()).activeWorkout.sourceSteps.length,6,'intensity cannot create unbalanced circuit sets');
  await sun.locator('#imageSkip').tap();
  assert.equal((await sunState()).activeWorkout.steps[(await sunState()).activeWorkout.index].round,2);
  await sun.locator('#imagePause').tap();await sun.screenshot({path:out+'/V4_2_일요일_라이트_'+engine+'.png',scale:'css'});
  await sun.locator('#stopWorkout').tap();assert.equal(await sun.locator('#completionFeedback').isVisible(),true);
  await sun.locator('[data-feedback=hard]').tap();assert.equal((await sunState()).history.filter(x=>x.type==='workout').length,1);
  assert.equal((await sunState()).activeWorkout,undefined);assert.deepEqual(errors,[]);
  console.log('PASS '+engine+' Sunday exact doses, no intermediate rests, endless append, live intensity and explicit finish');
 }finally{await browser.close()}
}})().catch(e=>{console.error(e);process.exitCode=1});
