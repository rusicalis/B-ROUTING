const {chromium,webkit,devices}=require(process.env.PLAYWRIGHT_CORE_PATH||'playwright-core');
const assert=require('node:assert/strict');
const origin=process.env.TEST_URL||'http://127.0.0.1:4173',out=process.env.TEST_OUTPUT_DIR||'.',key='burning-routine-local-v150';
(async()=>{for(const engine of ['chromium','webkit']){
 const browser=engine==='chromium'?await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}):await webkit.launch({headless:true});
 try{
  const ctx=await browser.newContext({...devices['iPhone 13 Mini']});
  const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(origin+'/?view=workout');await p.waitForSelector('#imagePlayIcon:not([hidden])');await p.locator('[data-view=settings]').tap();
  assert.equal(await p.locator('.settingsShortcuts').count(),0,'remove the shortcut row');
  assert.equal(await p.locator('#settings > .headline').count(),0,'remove the redundant Settings heading');
  await p.locator('#quickRoutine').selectOption('auto');assert.equal(await p.locator('.regionSymbol').count(),0,'region choices contain text only');
  for(const width of [375,320]){
   await p.setViewportSize({width,height:629});
   for(const mode of ['auto','custom','preset']){
    await p.locator('#quickRoutine').selectOption(mode);
    const apply=await p.locator('#autoGenerateWorkout').boundingBox();
    const buttons=await p.locator('#regionPicker button:visible,#routineVariants button:visible').all();
    for(const button of buttons){const rect=await button.boundingBox();assert.ok(rect.y+rect.height+12<=apply.y,'apply follows region/variant controls with spacing');}
   }
   for(const mode of ['light','dark']){
    await p.locator('[name=appearanceMode][value='+mode+']').check();await p.locator('#settingsTasks').scrollIntoViewIfNeeded();
    const dims=await p.locator('.settingRow').first().evaluate(row=>{const a=row.querySelector('.timeFrame').getBoundingClientRect(),b=row.querySelector('.notifyFrame').getBoundingClientRect();return {a:[a.width,a.height,a.x,a.y,a.right],b:[b.width,b.height,b.x,b.y,b.right]};});
    assert.deepEqual(dims.a.slice(0,2),[120,44]);assert.deepEqual(dims.b.slice(0,2),[120,44]);assert.equal(dims.a[3],dims.b[3]);assert.ok(dims.b[2]-dims.a[4]>=12);assert.ok(dims.b[4]<=width);
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   }
  }
  await p.locator('.settingRow .stime').first().fill('18:45');await p.locator('.settingRow .snotify').first().selectOption('off');
  assert.equal(await p.locator('.timeValue').first().innerText(),'18:45');assert.equal(await p.locator('.notifyValue').first().innerText(),'알림 없음');
  await p.locator('#saveSettings').tap();await p.reload();await p.locator('[data-view=settings]').tap();assert.equal(await p.locator('.timeValue').first().innerText(),'18:45');assert.equal(await p.locator('.notifyValue').first().innerText(),'알림 없음');
  await p.setViewportSize({width:375,height:629});await p.locator('.settingRow').first().scrollIntoViewIfNeeded();
  await p.locator('.stime').first().evaluate(el=>{for(const [k,v]of Object.entries({'width':'240px','min-width':'240px','height':'80px','min-height':'80px'}))el.style.setProperty(k,v,'important');});
  const safe=await p.locator('.settingRow').first().evaluate(row=>{const frame=row.querySelector('.timeFrame'),next=row.querySelector('.notifyFrame'),rect=next.getBoundingClientRect(),native=row.querySelector('.stime');return {width:frame.getBoundingClientRect().width,height:frame.getBoundingClientRect().height,clip:getComputedStyle(frame).overflow,opacity:getComputedStyle(native).opacity,hit:document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2)?.classList.contains('snotify')};});
  assert.equal(safe.width,120);assert.equal(safe.height,44);assert.equal(safe.clip,'hidden');assert.equal(safe.opacity,'0');assert.equal(safe.hit,true,'oversized native time face cannot intercept notification touches');
  await p.locator('.stime').first().evaluate(el=>el.removeAttribute('style'));
  await p.screenshot({path:out+'/V4_2_3_일정_'+engine+'.png',scale:'css'});await p.locator('#trainingConfiguration').scrollIntoViewIfNeeded();await p.locator('#quickRoutine').selectOption('auto');await p.screenshot({path:out+'/V4_2_3_부위선택_'+engine+'.png',scale:'css'});
  assert.deepEqual(errors,[]);console.log('PASS '+engine+' header/symbol removal, apply spacing, equal compact fields320/375, native-overflow clipping, changes/save/reload and both themes');
 }finally{await browser.close()}
}})().catch(e=>{console.error(e);process.exitCode=1});
