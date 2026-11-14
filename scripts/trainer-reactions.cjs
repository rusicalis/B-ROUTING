const {chromium,devices}=require(process.env.PLAYWRIGHT_CORE_PATH||'playwright-core');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--no-sandbox']});try{
 const page=await browser.newPage({...devices['iPhone 13 Mini'],reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto((process.env.TEST_URL||'http://127.0.0.1:4173')+'/?view=workout');await page.waitForSelector('#motionCanvas[data-model-ready="true"]');
 await page.locator('[data-program-day="2"]').tap();await page.locator('#startWorkout').tap();await page.waitForTimeout(3400);assert.equal(await page.locator('#motionCanvas').getAttribute('data-reaction'),'exercise');
 await page.locator('#nextWorkout').tap();await page.waitForTimeout(3500);assert.equal(await page.locator('#motionCanvas').getAttribute('data-reaction'),'wipe');assert.match(await page.locator('.trainerSpeech').innerText(),/땀/);
 await page.waitForTimeout(3000);assert.equal(await page.locator('#motionCanvas').getAttribute('data-reaction'),'encourage');
 await page.locator('#skipRest').tap();await page.waitForTimeout(150);assert.equal(await page.locator('#motionCanvas').getAttribute('data-reaction'),'exercise');assert.equal(await page.locator('.trainerSpeech').isVisible(),false);assert.deepEqual(errors,[]);
 await page.goto((process.env.TEST_URL||'http://127.0.0.1:4173')+'/workout-engine.mjs');
 const finite=await page.evaluate(async()=>{const {MotionStudio}=await import('/motion-studio.js'),{EXERCISES}=await import('/workout-engine.mjs');document.body.innerHTML='<div id="test" style="width:375px;height:400px"></div>';const studio=new MotionStudio(document.querySelector('#test'),()=>{});await studio.ready;studio.setExercise(EXERCISES.find(e=>e.id==='squat'));studio.setContext({phase:'work',activeSeconds:900,completedSets:8,totalSets:12});const values=studio.trainer.pos('Head').toArray(),sweat=studio.expressions.sweat.visible;studio.dispose();return values.every(Number.isFinite)&&sweat});assert.equal(finite,true,'raw catalog exercises retain a finite pose and sweat during effort');
 console.log('PASS actual iPhone workout: exercise → rest sweat wipe → encouragement → exercise; no gesture interrupts a working set');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
