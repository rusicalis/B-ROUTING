const {chromium,devices}=require(process.env.PLAYWRIGHT_CORE_PATH||'playwright-core');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--no-sandbox']});try{
 const page=await browser.newPage({...devices['iPhone 13 Mini'],reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto((process.env.TEST_URL||'http://127.0.0.1:4173')+'/?view=workout');await page.waitForSelector('#motionCanvas[data-media-ready="true"]');
 assert.equal(await page.locator('[data-program-day]').count(),7);assert.equal(await page.locator('#weeklyCoverage span').count(),7);
 for(let day=1;day<=7;day++){await page.locator('[data-program-day="'+day+'"]').tap();assert.match(await page.locator('#routineSummary').innerText(),/약 2[0-9]/);assert.equal(await page.locator('.exerciseTile').count(),5);}
 await page.locator('[data-program-day="1"]').tap();await page.locator('#autoGenerateWorkout').tap();await page.locator('#startWorkout').tap();await page.waitForTimeout(3300);
 await page.locator('#nextWorkout').tap();assert.equal(await page.locator('#restSec').innerText(),'60');await page.locator('#stopWorkout').tap();
 await page.locator('#editRoutine').tap();await page.locator('[data-program-mode="cardio"]').tap();assert.match(await page.locator('#programSummary').innerText(),/점프 없음/);await page.locator('#autoGenerateWorkout').tap();await page.locator('#startWorkout').tap();await page.waitForTimeout(3300);
 assert.match(await page.locator('#woReps').innerText(),/50초/);assert.equal(await page.locator('#woExercise').innerText(),'조용한 제자리 걷기');await page.locator('#nextWorkout').tap();await page.locator('#skipRest').tap();assert.equal(await page.locator('#woExercise').innerText(),'스텝 잭 · 점프 없음');await page.locator('#stopWorkout').tap();
 await page.locator('[data-view="week"]').tap();assert.equal(await page.locator('[data-week-open]').count(),7);await page.locator('[data-week-open="3"]').tap();assert.match(await page.locator('#routineTitle').innerText(),/수요일/);
 await page.clock.install({time:new Date('2026-11-14T23:59:50+09:00')});await page.clock.setSystemTime(new Date('2026-11-15T07:00:00+09:00'));await page.reload();await page.waitForSelector('[data-program-day]',{state:'attached'});assert.match(await page.locator('#routineTitle').innerText(),/일요일/);
 await page.clock.setSystemTime(new Date('2026-11-16T07:00:00+09:00'));await page.reload();await page.waitForSelector('[data-program-day]',{state:'attached'});assert.match(await page.locator('#routineTitle').innerText(),/월요일/);
 assert.deepEqual(errors,[]);console.log('PASS seven weekday routines, body-part frequency display, main-only start, separate timed no-jump cardio circuit and weekly navigation');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
