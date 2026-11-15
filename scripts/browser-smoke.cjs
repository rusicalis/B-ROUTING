// npm install --no-save playwright-core, then set PLAYWRIGHT_CORE_PATH if needed.
const {chromium}=require(process.env.PLAYWRIGHT_CORE_PATH||'playwright-core');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const origin=process.env.TEST_URL||'http://127.0.0.1:4173';
const out=process.env.TEST_OUTPUT_DIR||'.';
const key='burning-routine-local-v150';
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--no-sandbox']});
  const context=await browser.newContext({viewport:{width:1440,height:1100},timezoneId:'Asia/Seoul'});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const stored=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
  const open=async()=>{await page.goto(origin+'/?view=workout');await page.waitForSelector('[data-region="full"]',{state:'attached'});await page.waitForSelector('#motionCanvas[data-media-ready=true]')};
  await open();await page.locator('[data-program-mode=auto]').click();assert.equal(await page.locator('.exerciseTile').count(),6);await page.waitForSelector('#motionCanvas[data-media-ready=true]');assert.ok(await page.locator('#motionCanvas img,#motionCanvas canvas').count()>0);
  assert.equal(await page.locator('#motionEmpty').isVisible(),false);
  await page.screenshot({path:out+'/desktop.png',fullPage:true});
  for(const r of ['chest','back','legs','biceps','shoulders','triceps','lowerback']){await page.locator('[data-region="full"]').click();await page.locator('[data-region="'+r+'"]').click();assert.equal(await page.locator('.regionButton.active').count(),1);assert.ok(await page.locator('.exerciseTile').count()>=3);for(let v=1;v<=3;v++){await page.locator('[data-variant="'+v+'"]').click();for(let i=0;i<await page.locator('.exerciseTile').count();i++){await page.locator('[data-preview="'+i+'"]').click();assert.ok((await page.locator('#formCues li').count())>=3)}}}
  console.log('PASS all regions, variants and available previews');
  await page.locator('[data-region="full"]').click();await page.locator('[data-variant="1"]').click();await page.locator('#startWorkout').click();await page.waitForTimeout(3300);
  await page.locator('#nextWorkout').click();assert.equal(await page.locator('#restBox').isVisible(),true);
  await page.reload();await page.waitForSelector('[data-region="full"]',{state:'attached'});
  assert.equal(await page.locator('#pauseWorkout').innerText(),'계속하기','rest draft resumes paused');
  assert.equal(await page.locator('#restBox').isVisible(),true,'rest draft retains rest');
  await page.locator('#pauseWorkout').click();await page.locator('#skipRest').click();
  const before=(await stored()).trainingTracks['full:routine-1'].level;
  await page.locator('[data-region="back"]').click();assert.deepEqual((await stored()).workoutConfig.regions,['full']);
  await page.locator('#stopWorkout').click();assert.equal((await stored()).trainingTracks['full:routine-1'].level,before);
  console.log('PASS interruption, reload and active selection guard');
  async function finish(feedback){await page.locator('#startWorkout').click();await page.waitForTimeout(3300);for(let i=0;i<32;i++){if(await page.locator('#completionFeedback').isVisible())break;if(await page.locator('#skipRest').isVisible())await page.locator('#skipRest').click();await page.locator('#nextWorkout').click()}assert.equal(await page.locator('#completionFeedback').isVisible(),true);await page.locator('[data-feedback="'+feedback+'"]').click();await page.waitForTimeout(100)}
  await finish('good');let s=await stored();assert.equal(s.trainingTracks['full:routine-1'].level,1);assert.equal(s.history.filter(h=>h.type==='workout').length,1);await page.locator('#startWorkout').click();await finish('good');s=await stored();assert.equal(s.trainingTracks['full:routine-1'].level,1,'same-day completion does not double advance');
  console.log('PASS full routine completion and same-day progression guard');
  await open();assert.equal(await page.locator('#trainingLevel').innerText(),'LEVEL 02');
  await page.locator('button[data-guide-phase="1"]').click();await page.locator('#previewToggle').click();await page.locator('#previewSpeed').selectOption('0.5');await page.locator('#previewScrub').fill('50');
  await page.evaluate(async()=>{await navigator.serviceWorker.ready});await page.waitForFunction(()=>!!navigator.serviceWorker.controller);await context.setOffline(true);await page.reload();await page.waitForSelector('[data-region="full"]',{state:'attached'});await page.waitForSelector('#motionCanvas[data-media-ready=true]');assert.ok(await page.locator('#motionCanvas img,#motionCanvas canvas').count()>0);assert.equal(await page.locator('#motionEmpty').isVisible(),false);await context.setOffline(false);
  await page.waitForSelector('#motionCanvas[data-media-ready=true]');console.log('PASS illustrated controls and offline reload');
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:out+'/mobile.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  console.log('PASS mobile width and screenshot');
  const legacy=await browser.newContext({viewport:{width:390,height:844}});const lp=await legacy.newPage();lp.on('pageerror',e=>errors.push(e.message));await lp.addInitScript(({key})=>{localStorage.setItem(key,JSON.stringify({tasks:[{id:'my-task',title:'내 할일',start:'07:00',end:'08:00',days:[0,1,2,3,4,5,6],category:'work',notify:'off'}],settings:{theme:'rose'},history:[{type:'task',date:'2026-11-01',title:'보존 기록'}],completions:{'2026-11-01':{'my-task':true}},workoutConfig:{mode:'custom',customRoutine:[{id:'band-test',equipment:'band'}]}}))},{key});await lp.goto(origin+'/?view=workout');await lp.waitForSelector('[data-region="full"]',{state:'attached'});assert.equal(await lp.locator('.exerciseTile').count(),5);const migrated=await lp.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);assert.equal(migrated.tasks[0].id,'my-task');assert.equal(migrated.history[0].title,'보존 기록');assert.equal(migrated.settings.theme,'rose');
  await lp.locator('[data-view="today"]').click();assert.equal(await lp.getByText('내 할일',{exact:true}).count(),1);await lp.locator('.taskCheck').click();assert.equal(await lp.locator('#todayRate').innerText(),'100%');
  await lp.locator('[data-view="settings"]').click();await lp.locator('#saveSettings').click();
  console.log('PASS migration and existing task/settings flow');
  assert.deepEqual(errors,[]);fs.writeFileSync(out+'/browser-results.json',JSON.stringify({passed:true,errors,checks:['regions','variants','illustrated previews','resume','partial stop','completion','duplicate day','offline','mobile','migration','tasks','settings']},null,2));
  await browser.close();console.log('ALL BROWSER CHECKS PASSED');
})().catch(e=>{console.error(e);process.exit(1)});
