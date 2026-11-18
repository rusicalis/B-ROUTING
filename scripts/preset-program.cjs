// Focused end-to-end regression checks. Run against a local static server:
// $env:PLAYWRIGHT_CORE_PATH='E:/Codex/2026-11-14/d/work/browser-tools/package'; node scripts/preset-program.cjs
const {chromium}=require(process.env.PLAYWRIGHT_CORE_PATH||'playwright-core');
const assert=require('node:assert/strict');
const origin=process.env.TEST_URL||'http://127.0.0.1:4173',key='burning-routine-local-v150';

function wakeMock(mode='supported'){
 window.__wake={requests:0,releases:0,defer:false,resolve:null,last:null,visible:true};
 Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>window.__wake.visible?'visible':'hidden'});
 Object.defineProperty(document,'hidden',{configurable:true,get:()=>!window.__wake.visible});
 if(mode==='unsupported'){Object.defineProperty(navigator,'wakeLock',{configurable:true,value:undefined});return}
 Object.defineProperty(navigator,'wakeLock',{configurable:true,value:{request:async type=>{
  if(type!=='screen')throw new Error('Wrong lock type');
  const state=window.__wake;state.requests++;
  if(mode==='denied')throw new DOMException('Denied by test','NotAllowedError');
  const lock=new EventTarget();lock.released=false;lock.release=async()=>{if(!lock.released){lock.released=true;state.releases++;lock.dispatchEvent(new Event('release'))}};state.last=lock;
  if(state.defer)await new Promise(resolve=>state.resolve=resolve);
  return lock;
 }}});
}

(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']});
 const errors=[];
 const watch=page=>page.on('pageerror',error=>errors.push(error.message));
 try{
  const context=await browser.newContext({viewport:{width:1280,height:1000},timezoneId:'Asia/Seoul',reducedMotion:'reduce'});
  await context.addInitScript(wakeMock,'supported');
  const page=await context.newPage();watch(page);
  const stored=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
  const ready=async()=>{await page.waitForSelector('[data-program-day="1"]',{state:'attached'});await page.waitForFunction(k=>JSON.parse(localStorage.getItem(k)||'{}').workoutConfig?.schema===5,key)};
  const setting=async(id,value)=>{if(id==='targetMinutes'){await page.locator('[name=workoutMinutes][value="'+value+'"]').check()}else{await page.locator('#'+id).fill(String(value));await page.locator('#'+id).press('Tab')}await page.waitForFunction(({key,id,value})=>JSON.parse(localStorage.getItem(key)).workoutConfig[id]===value,{key,id,value})};
  const dose=()=>page.locator('[data-dose-index]').evaluateAll(inputs=>inputs.map(input=>({index:Number(input.dataset.doseIndex),field:input.dataset.doseField,value:Number(input.value)})));
  await page.goto(origin+'/?view=workout');await ready();if(await page.locator('#editRoutine').isVisible())await page.locator('#editRoutine').click();
  let state=await stored();assert.equal(state.workoutConfig.mode,'preset');assert.equal(state.workoutConfig.bridgeVariant,'reverse');assert.equal(state.workoutConfig.doseMode,'fit');assert.equal(state.workoutConfig.targetMinutes,30);
  assert.equal(await page.locator('#bridgeVariant').inputValue(),'reverse');assert.equal(await page.locator('#doseMode').inputValue(),'fit');
  await page.locator('[data-program-day="1"]').click();const starter=await dose();
  await setting('targetMinutes',40);const longer=await dose();assert.ok(longer.some((row,i)=>row.value>starter[i]?.value));
  for(let i=0;i<starter.length;i++)assert.ok(longer[i].value>=starter[i].value,'longer target must retain every existing dose');
  await setting('targetMinutes',30);
  if(!await page.locator('.advancedRoutine').evaluate(el=>el.open))await page.locator('.advancedRoutine>summary').click();await page.locator('.presetEditor summary').click();
  await page.locator('[data-dose-index="0"][data-dose-field="sets"]').fill('2');
  await page.locator('[data-dose-index="0"][data-dose-field="reps"]').fill('7');
  await page.locator('#presetName').fill('Browser edited dose');await page.locator('#savePreset').click();
  await page.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).savedPresets.length===1,key);
  state=await stored();const savedId=state.savedPresets[0].id;assert.equal(state.savedPresets[0].baseTargetMinutes,30);assert.equal(state.savedPresets[0].exercises[0].reps,7);assert.equal(state.savedPresets[0].exercises[0].sets,2);
  assert.equal(await page.locator('#presetSelect').inputValue(),savedId);
  await page.reload();await ready();assert.equal(await page.locator('#presetSelect').inputValue(),savedId);
  assert.equal(await page.locator('[data-dose-index="0"][data-dose-field="reps"]').inputValue(),'7');
  await page.locator('#presetSelect').selectOption('user-week');await page.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).workoutConfig.presetId==='user-week',key);
  await page.locator('#presetSelect').selectOption(savedId);await page.waitForFunction(({key,savedId})=>JSON.parse(localStorage.getItem(key)).workoutConfig.presetId===savedId,{key,savedId});
  assert.equal(await page.locator('[data-dose-index="0"][data-dose-field="sets"]').inputValue(),'2');
  const edited=await dose();await setting('targetMinutes',40);assert.ok((await dose()).some((row,i)=>row.value>edited[i]?.value));await setting('targetMinutes',30);
  if(!await page.locator('.advancedRoutine').evaluate(el=>el.open))await page.locator('.advancedRoutine>summary').click();await page.locator('.presetEditor summary').click();await page.locator('#deletePreset').click();await page.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).savedPresets.length===0,key);assert.equal(await page.locator('#presetSelect').inputValue(),'user-week');
  await page.locator('#doseMode').selectOption('goal');await page.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).workoutConfig.doseMode==='goal',key);
  assert.match(await page.locator('#programSummary').innerText(),/41\.4/);assert.match(await page.locator('#programSummary').innerText(),/목표 시간보다/);
  assert.equal(await page.locator('[data-dose-index="0"][data-dose-field="sets"]').inputValue(),'10');assert.equal(await page.locator('[data-dose-index="0"][data-dose-field="reps"]').inputValue(),'10');
  assert.equal(await page.locator('[data-dose-index="2"][data-dose-field="sets"]').inputValue(),'10');assert.equal(await page.locator('[data-dose-index="3"][data-dose-field="sets"]').inputValue(),'10');
  await page.locator('[data-program-day="7"]').click();assert.match(await page.locator('#programSummary').innerText(),/36\.3/);
  await page.locator('#startWorkout').click();await page.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).activeWorkout?.phase==='work',key);
  await page.waitForFunction(()=>!document.querySelector('#nextWorkout').disabled);
  let draft=(await stored()).activeWorkout;
  assert.deepEqual(draft.steps.slice(0,6).map(s=>[s.exerciseIndex,s.round,s.restAfter]),[[0,1,60],[1,1,60],[2,1,60],[0,2,60],[1,2,60],[2,2,60]]);
  assert.equal(draft.plan.blocks[0].rounds,4);assert.equal(draft.plan.estimatedSeconds,2180);
  assert.match(await page.locator('#woExercise').innerText(),/로우/);
  for(const [rest,nextName]of [[60,/푸시업/],[60,/스쿼트/],[60,/로우/]]){
   await page.locator('#nextWorkout').click();await page.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).activeWorkout?.phase==='rest',key);
   const actual=Number(await page.locator('#restSec').innerText());assert.ok(actual<=rest&&actual>=rest-1,`expected ${rest}s rest, got ${actual}`);
   await page.locator('#skipRest').click();await page.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).activeWorkout?.phase==='work',key);assert.match(await page.locator('#woExercise').innerText(),nextName);
  }
  await page.locator('#stopWorkout').click();
  console.log('PASS fit/reverse30 defaults, actual duration doses, edited save/reload/reapply/delete, literal overflow and ordered Sunday30/60s session rests');

  await page.locator('[data-view="settings"]').click();
  await page.waitForFunction(()=>document.querySelector('#wakeLockStatus').dataset.status==='active');
  assert.equal(await page.evaluate(()=>window.__wake.requests),1);
  await page.evaluate(()=>{for(let i=0;i<8;i++)document.dispatchEvent(new Event('pointerdown'))});assert.equal(await page.evaluate(()=>window.__wake.requests),1);
  await page.locator('#keepScreenOn').uncheck();await page.waitForFunction(()=>document.querySelector('#wakeLockStatus').dataset.status==='off');assert.equal(await page.evaluate(()=>window.__wake.releases),1);
  await page.locator('#keepScreenOn').check();await page.waitForFunction(()=>document.querySelector('#wakeLockStatus').dataset.status==='active');
  await page.evaluate(()=>{window.__wake.visible=false;document.dispatchEvent(new Event('visibilitychange'))});await page.waitForFunction(()=>document.querySelector('#wakeLockStatus').dataset.status==='waiting');assert.equal(await page.evaluate(()=>window.__wake.releases),2);
  await page.evaluate(()=>{window.__wake.visible=true;document.dispatchEvent(new Event('visibilitychange'))});await page.waitForFunction(()=>document.querySelector('#wakeLockStatus').dataset.status==='active');
  await page.evaluate(()=>window.__wake.last.release());await page.waitForFunction(()=>document.querySelector('#wakeLockStatus').dataset.status==='waiting');
  await page.evaluate(()=>document.dispatchEvent(new Event('pointerdown')));await page.waitForFunction(()=>document.querySelector('#wakeLockStatus').dataset.status==='active');
  await page.locator('#keepScreenOn').uncheck();
  await page.evaluate(()=>{window.__wake.defer=true;const toggle=document.querySelector('#keepScreenOn');toggle.checked=true;toggle.dispatchEvent(new Event('change'))});await page.waitForFunction(()=>document.querySelector('#wakeLockStatus').dataset.status==='requesting');
  await page.evaluate(()=>{window.__wake.visible=false;document.dispatchEvent(new Event('visibilitychange'));window.__wake.resolve()});await page.waitForFunction(()=>window.__wake.last.released&&document.querySelector('#wakeLockStatus').dataset.status==='waiting');
  await page.evaluate(()=>{window.__wake.defer=false;window.__wake.visible=true;document.dispatchEvent(new Event('visibilitychange'))});await page.waitForFunction(()=>document.querySelector('#wakeLockStatus').dataset.status==='active');
  await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await page.waitForFunction(()=>document.querySelector('#wakeLockStatus').dataset.status==='off');
  await page.evaluate(()=>window.dispatchEvent(new Event('pageshow')));await page.waitForFunction(()=>document.querySelector('#wakeLockStatus').dataset.status==='active');
  console.log('PASS mocked wake lock acquire/deduplicate/disable/hide/reacquire/external release/late result/page lifecycle');
  await context.close();

  for(const mode of ['unsupported','denied']){
   const c=await browser.newContext();await c.addInitScript(wakeMock,mode);const p=await c.newPage();watch(p);await p.goto(origin+'/?view=workout');await p.waitForFunction(expected=>document.querySelector('#wakeLockStatus').dataset.status===expected,mode==='unsupported'?'unsupported':'unavailable');
   assert.equal(await p.locator('.startupError').count(),0);await c.close();
  }
  console.log('PASS unsupported and denied wake lock truthful statuses');

  const legacy=await browser.newContext({timezoneId:'Asia/Seoul'});await legacy.addInitScript(wakeMock,'unsupported');const lp=await legacy.newPage();watch(lp);
  await lp.addInitScript(({key})=>{if(sessionStorage.getItem('preset-regression-seeded'))return;sessionStorage.setItem('preset-regression-seeded','yes');localStorage.setItem(key,JSON.stringify({settings:{theme:'rose'},tasks:[{id:'keep-task',title:'Keep my task',start:'07:00',end:'08:00',days:[0,1,2,3,4,5,6],category:'work',notify:'off'}],history:[{type:'task',title:'Keep history',date:'2026-11-01'}],completions:{'2026-11-01':{'keep-task':true}},trainingTracks:{'weekly:day-1':{level:3,completed:4,lastCreditDate:'2026-11-01'}},workoutConfig:{schema:3,mode:'weekly',planDay:1}}))},{key});
  await lp.goto(origin+'/?view=workout');await lp.waitForSelector('[data-program-day="1"]',{state:'attached'});const migrated=await lp.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
  assert.equal(migrated.workoutConfig.schema,5);assert.equal(migrated.workoutConfig.mode,'preset');assert.equal(migrated.settings.theme,'rose');assert.equal(migrated.tasks[0].id,'keep-task');assert.equal(migrated.history[0].title,'Keep history');assert.equal(migrated.completions['2026-11-01']['keep-task'],true);assert.equal(migrated.trainingTracks['weekly:day-1'].level,3);assert.equal(migrated.trainingTracks['weekly:day-1'].completed,4);
  await legacy.close();assert.deepEqual(errors,[]);console.log('PASS legacy tasks/theme/history/completions/tracks preserved; no browser page errors');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
