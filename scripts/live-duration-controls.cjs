const {chromium,webkit,devices}=require(process.env.PLAYWRIGHT_CORE_PATH||'playwright-core');
const assert=require('node:assert/strict');
const origin=process.env.TEST_URL||'http://127.0.0.1:4173',out=process.env.TEST_OUTPUT_DIR||'.',key='burning-routine-local-v150';
(async()=>{for(const engine of ['chromium','webkit']){
 const browser=engine==='chromium'?await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}):await webkit.launch({headless:true});
 try{
  const context=await browser.newContext({...devices['iPhone 13 Mini']});
  await context.addInitScript(k=>{if(!localStorage.getItem(k))localStorage.setItem(k,JSON.stringify({workoutConfig:{schema:5,compactRevision:1,mode:'preset',presetId:'user-week',planDay:1,targetMinutes:30,selectionDate:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul'}).format(new Date())},settings:{uiMode:'dark'},tasks:[],history:[],completions:{},trainingTracks:{}}));},key);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const state=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
  await page.clock.install();await page.goto(origin+'/?view=workout');await page.waitForSelector('#imagePlayIcon:not([hidden])');
  await page.locator('#imagePause').tap();await page.clock.fastForward(3100);await page.locator('#imagePause').tap();
  assert.equal(await page.locator('[name=workoutMinutes][value="40"]').isEnabled(),true,'duration selection must remain available during a paused workout');
  assert.equal((await page.locator('#imageSkip').innerText()).trim(),'','skip is icon-only');
  assert.match(await page.locator('#imageSkip').getAttribute('aria-label'),/건너뛰기/);
  const shape=await page.evaluate(()=>{const r=document.querySelector('#imagePlayIcon').getBoundingClientRect(),s=document.querySelector('#imageSkip').getBoundingClientRect();return {resume:[r.width,r.height],skip:[s.width,s.height],radius:getComputedStyle(document.querySelector('#imageSkip')).borderRadius};});
  assert.deepEqual(shape.skip,shape.resume,'skip and resume have the same diameter');assert.equal(shape.radius,'50%');
  const before=(await state()).activeWorkout;
  for(const minutes of [40,50,60,30]){
   await page.locator('[name=workoutMinutes][value="'+minutes+'"]').check();const after=(await state()).activeWorkout;
   assert.equal(after.id,before.id);assert.equal(after.plan.targetMinutes,minutes);assert.equal(after.setMs,before.setMs);assert.equal(after.activeMs,before.activeMs);assert.deepEqual(after.completedStepIds,before.completedStepIds);
   assert.equal(await page.locator('[name=workoutMinutes][value="'+minutes+'"]').isChecked(),true);
   if(minutes===60)assert.ok(after.sourceSteps.length>before.sourceSteps.length);
  }
  await page.screenshot({path:out+'/V4_2_1_재생_건너뛰기_'+engine+'.png',scale:'css'});
  await page.locator('#imagePause').tap();await page.locator('[name=workoutMinutes][value="40"]').check();
  await page.clock.fastForward(33000);assert.equal((await state()).activeWorkout.phase,'rest');
  await page.locator('#imagePause').tap();const rest=(await state()).activeWorkout;
  await page.locator('[name=workoutMinutes][value="60"]').check();const changed=(await state()).activeWorkout;
  assert.equal(changed.restMs,rest.restMs);assert.deepEqual(changed.completedStepIds,rest.completedStepIds);
  await page.reload();await page.waitForSelector('#imagePlayIcon:not([hidden])');assert.equal((await state()).activeWorkout.plan.targetMinutes,60);assert.equal(await page.locator('[name=workoutMinutes][value="60"]').isChecked(),true);
  assert.equal((await page.locator('#imageSkip').innerText()).trim(),'','rest skip is also icon-only');
  await page.locator('[data-view=settings]').tap();await page.locator('#appearanceModes [data-mode=light]').tap();await page.locator('[data-view=workout]').tap();await page.screenshot({path:out+'/V4_2_1_휴식_라이트_'+engine+'.png',scale:'css'});
  for(const width of [375,320]){await page.setViewportSize({width,height:629});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);for(const minutes of [30,40,50,60])await page.locator('[name=workoutMinutes][value="'+minutes+'"]').check();}
  assert.deepEqual(errors,[]);console.log('PASS '+engine+' equal circular icon controls; live 30/40/50/60 touch changes, dose/credit preservation, running/rest/reload and light/dark mobile bounds');
 }finally{await browser.close()}
}})().catch(e=>{console.error(e);process.exitCode=1});
