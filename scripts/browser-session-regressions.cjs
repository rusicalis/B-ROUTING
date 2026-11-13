const {chromium}=require(process.env.PLAYWRIGHT_CORE_PATH||'playwright-core');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--no-sandbox']});
 try{
  const context=await browser.newContext({timezoneId:'Asia/Seoul',reducedMotion:'reduce'}),page=await context.newPage();
  const key='burning-routine-local-v150',origin=process.env.TEST_URL||'http://127.0.0.1:4173';
  await page.goto(origin+'/?view=workout');await page.waitForSelector('[data-region="full"]');
  await page.locator('.customDetails summary').click();await page.locator('#bodyweightExerciseSelect').selectOption('squat');await page.locator('#addBodyweightExercise').click();await page.locator('#applyCustomWorkout').click();
  await page.locator('#startWorkout').click();await page.waitForTimeout(3300);await page.locator('#pauseWorkout').click();await page.locator('#stopWorkout').click();
  await page.locator('#startWorkout').click();await page.waitForTimeout(3300);await page.locator('#nextWorkout').click();
  assert.equal(await page.locator('#skipRest').isEnabled(),true,'rest skip is available after stopping a paused session');
  await page.locator('#skipRest').click();await page.locator('#nextWorkout').click();assert.equal(await page.locator('#completionFeedback').isVisible(),true);
  // Cross midnight before reloading the pending feedback session.
  await page.clock.install({time:new Date('2026-11-14T23:59:50+09:00')});
  await page.clock.setSystemTime(new Date('2026-11-15T00:00:10+09:00'));
  await page.reload();await page.waitForSelector('[data-region="full"]');assert.equal(await page.locator('#completionFeedback').isVisible(),true,'pending feedback survives reload across midnight');
  await page.locator('[data-feedback="good"]').click();
  const s=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
  assert.equal(s.history.find(h=>h.type==='workout').date,'2026-11-15','completion records the current date after midnight');
  assert.equal(s.trainingTracks['custom:squat'].lastCreditDate,'2026-11-15');
  console.log('PASS paused-stop rest controls, feedback reload, midnight completion date');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
