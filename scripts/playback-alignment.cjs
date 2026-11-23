const {chromium,webkit,devices}=require(process.env.PLAYWRIGHT_CORE_PATH||'playwright-core');
const assert=require('node:assert/strict');
const origin=process.env.TEST_URL||'http://127.0.0.1:4173',out=process.env.TEST_OUTPUT_DIR||'.',key='burning-routine-local-v150';
(async()=>{for(const engine of ['chromium','webkit']){
 const browser=engine==='chromium'?await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}):await webkit.launch({headless:true});
 try{
  const ctx=await browser.newContext({...devices['iPhone 13 Mini'],reducedMotion:'reduce'});
  await ctx.addInitScript(k=>{if(!localStorage.getItem(k))localStorage.setItem(k,JSON.stringify({settings:{uiMode:'dark'},workoutConfig:{schema:5,compactRevision:1,mode:'preset',presetId:'alignment',doseMode:'goal',planDay:1,targetMinutes:30,selectionDate:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul'}).format(new Date())},savedPresets:[{id:'alignment',name:'정렬 확인',baseTargetMinutes:30,exercises:['pushup','squat','close-pushup'].map(id=>({id,sets:2,reps:20,cycleSeconds:4}))}],tasks:[],history:[],completions:{},trainingTracks:{}}));},key);
  const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.clock.install();await p.goto(origin+'/?view=workout');await p.waitForSelector('#imagePlayIcon:not([hidden])');
  const stored=()=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
  await p.locator('#imagePause').tap();await p.clock.fastForward(3100);await p.locator('#nextExercise').tap();await p.locator('#imagePause').tap();
  const aligned=async()=>{const rects=[];for(const id of ['previousExercise','imagePlayIcon','imageSkip','nextExercise']){assert.equal(await p.locator('#'+id).isVisible(),true,id);rects.push(await p.locator('#'+id).boundingBox());}const centres=rects.map(r=>r.y+r.height/2),heights=rects.map(r=>r.height);assert.ok(Math.max(...centres)-Math.min(...centres)<.5,'all four buttons share one vertical centre: '+JSON.stringify(centres));assert.ok(Math.max(...heights)-Math.min(...heights)<.5,'all four buttons have equal height');assert.ok(heights.every(h=>h>=44));for(let i=0;i<3;i++)assert.ok(rects[i].x+rects[i].width+4<rects[i+1].x,'horizontal controls do not overlap');};
  for(const mode of ['light','dark']){
   await p.locator('[data-view=settings]').tap();await p.locator('[name=appearanceMode][value='+mode+']').check();await p.locator('[data-view=workout]').tap();
   for(const size of [{width:375,height:629},{width:320,height:629},{width:375,height:812},{width:629,height:375}]){await p.setViewportSize(size);await aligned();}
  }
  await p.setViewportSize({width:375,height:629});await p.locator('#nextExercise').tap();assert.equal((await stored()).activeWorkout.steps[0].exerciseIndex,2);await p.locator('#previousExercise').tap();assert.equal((await stored()).activeWorkout.steps[0].exerciseIndex,1);assert.equal((await stored()).activeWorkout.confirmed,0,'navigation never credits skipped sets');
  await p.clock.fastForward(81000);assert.equal((await stored()).activeWorkout.phase,'rest');await p.locator('#imagePause').tap();await aligned();
  await p.locator('#stage').screenshot({path:out+'/V4_2_4_버튼정렬_'+engine+'.png',scale:'css'});await p.locator('#imageSkip').tap();assert.equal((await stored()).activeWorkout.phase,'work','aligned skip remains touchable');assert.equal((await stored()).activeWorkout.confirmed,1);
  assert.deepEqual(errors,[]);console.log('PASS '+engine+' four controls aligned in work/rest, both themes, portrait/landscape320/375/629; arrows and skip retain touch and credit behavior');
 }finally{await browser.close()}
}})().catch(e=>{console.error(e);process.exitCode=1});
