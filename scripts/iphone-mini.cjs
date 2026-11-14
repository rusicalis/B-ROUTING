const {chromium,webkit,devices}=require(process.env.PLAYWRIGHT_CORE_PATH||'playwright-core');
const assert=require('node:assert/strict');
const origin=process.env.TEST_URL||'http://127.0.0.1:4173';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--no-sandbox']});
 try{
  const context=await browser.newContext({...devices['iPhone 13 Mini'],reducedMotion:'reduce'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/?view=workout');await page.waitForSelector('#motionCanvas[data-model-ready="true"]');
  for(const selector of ['[data-program-mode="weekly"]','[data-program-day="1"]','#previewToggle','[data-camera="side"]','#startWorkout','#nav button']){
    const rects=await page.locator(selector).evaluateAll(items=>items.map(el=>{const r=el.getBoundingClientRect();return {w:r.width,h:r.height}}));
    assert.ok(rects.every(r=>r.w>=44&&r.h>=44),selector+' must have 44px touch targets');
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const nav=await page.locator('#nav').boundingBox();assert.ok(nav.y>=550&&nav.y+nav.height<=629,'bottom navigation must be fixed to the viewport, not the filtered header');
  await page.locator('#autoGenerateWorkout').click();
  assert.equal(await page.locator('.workoutBuilder').isVisible(),false,'setup collapses for movement viewing');
  await page.waitForTimeout(250);await page.evaluate(()=>scrollTo(0,0));
  const start=await page.locator('#startWorkout').boundingBox();assert.ok(start.y>=0&&start.y+start.height<=629,'start is in reach above Safari toolbar');
  await page.locator('[data-camera="side"]').tap();assert.equal(await page.locator('[data-camera="side"]').getAttribute('class'),'active');await page.locator('[data-camera="angle"]').tap();
  await page.waitForTimeout(4000);await page.screenshot({path:(process.env.TEST_OUTPUT_DIR||'.')+'/iphone13mini-safari-size.png',scale:'css'});
  await page.locator('#startWorkout').click();await page.waitForTimeout(3300);
  const done=await page.locator('#nextWorkout').boundingBox();assert.ok(done.y>=0&&done.y+done.height<=629);await page.locator('#nextWorkout').click();await page.locator('#skipRest').click();await page.locator('#stopWorkout').click();
  await page.locator('[data-view="settings"]').tap();assert.equal(await page.locator('#settings').isVisible(),true);
  await page.locator('[data-view="today"]').tap();assert.equal(await page.locator('#today').isVisible(),true);
  await page.setViewportSize({width:375,height:812});await page.locator('[data-view="workout"]').tap();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);console.log('PASS iPhone 13 Mini 375×629 Safari viewport, 375×812 standalone, touch targets, pinned controls and human mesh');
 }finally{await browser.close()}
 const safari=await webkit.launch({headless:true});
 try{const context=await safari.newContext({...devices['iPhone 13 Mini'],reducedMotion:'reduce'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(origin+'/?view=workout');await page.waitForSelector('[data-region="full"]',{state:'attached'});await page.locator('#autoGenerateWorkout').tap();assert.equal(await page.locator('.workoutBuilder').isVisible(),false);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.locator('#startWorkout').tap();await page.waitForTimeout(3300);assert.equal(await page.locator('#nextWorkout').isEnabled(),true);assert.deepEqual(errors,[]);console.log('PASS WebKit iPhone 13 Mini emulation and workout controls')}finally{await safari.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
