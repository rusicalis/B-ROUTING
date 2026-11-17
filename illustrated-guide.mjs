import {GifReader} from './vendor/omggif.mjs';
import {getExerciseMedia} from './exercise-media-data.mjs';
import {guideTiming} from './guide-timing.mjs';

async function gifResponse(url,signal){
 let cache;try{cache=await caches.open('burning-routine-guide-media-v310')}catch{}
 try{const response=await fetch(url,{signal});if(!response.ok)throw Error('Illustration '+response.status);if(cache)cache.put(url,response.clone()).catch(()=>{});return response}
 catch(error){if(signal.aborted)throw error;const saved=await cache?.match(url);if(saved)return saved;throw error}
}

export class IllustratedGuide{
 constructor(host,onError,onReady=()=>{}){
  this.host=host;this.onError=onError;this.onReady=onReady;this.playing=!matchMedia('(prefers-reduced-motion: reduce)').matches;this.speed=1;this.phase=0;this.side=0;this.external=false;this.active=false;this.visible=true;this.failed=false;this.context={phase:'ready'};this.contextAt=performance.now();this.last=performance.now();this.token=0;this.ready=Promise.resolve(false);
  this.observer=new IntersectionObserver(entries=>{this.visible=entries[0].isIntersecting;this.last=performance.now()});this.observer.observe(host);
  this.loop=()=>{this.raf=requestAnimationFrame(this.loop);const now=performance.now(),dt=Math.min(.1,(now-this.last)/1000);this.last=now;if(!this.active||!this.visible||document.hidden)return;if(this.playing&&!this.external){const next=this.phase+dt*this.speed/(this.exercise?.cycleSeconds||4);if(this.exercise?.alternating&&next>=1)this.side=1-this.side;this.phase=next%1;this.draw()}else if(this.context.phase==='work')this.draw()};this.loop();
 }
 setExercise(exercise){
  this.controller?.abort();this.controller=new AbortController();const token=++this.token;this.exercise=exercise;this.media=getExerciseMedia(exercise.id);this.phase=0;this.side=0;this.external=false;this.gif=null;this.images=null;this.lastFrame=-1;this.lastStep=-1;delete this.host.dataset.mediaReady;this.host.dataset.mediaState='loading';this.host.replaceChildren();
  this.figure=document.createElement('div');this.figure.className='guideFigure';this.host.append(this.figure);this.badge=document.createElement('div');this.badge.className='guideStepBadge';this.host.append(this.badge);
  const attribution=document.querySelector('#mediaAttribution');if(attribution){attribution.replaceChildren();const link=document.createElement(this.media?.sourceUrl?'a':'span');link.textContent=this.media?.source||'';if(this.media?.sourceUrl){link.href=this.media.sourceUrl;link.target='_blank';link.rel='noopener noreferrer'}attribution.append(link)}
  const note=document.querySelector('#mediaNote');if(note){note.textContent=this.media?.note||'';note.hidden=!note.textContent}
  const hint=document.querySelector('#studioHint');if(hint)hint.textContent=this.media?.provider==='gif'?'그림 움직임과 타이머를 함께 따라해 주세요':'준비 그림 → 동작 그림 → 복귀를 따라해 주세요';
  this.ready=(async()=>{
   if(!this.media||this.media.provider==='unavailable')throw Error('No exact illustrated guide');
   if(this.media.provider==='gif'){
    const bytes=new Uint8Array(await(await gifResponse(this.media.url,this.controller.signal)).arrayBuffer());if(token!==this.token)return false;
    const reader=new GifReader(bytes);if(reader.width>800||reader.height>800||reader.numFrames()>500)throw Error('Oversized illustration');
    const frames=Array.from({length:reader.numFrames()},(_,i)=>reader.frameInfo(i)),duration=frames.reduce((n,f)=>n+Math.max(.02,(f.delay||10)/100),0);
    const canvas=document.createElement('canvas');canvas.width=reader.width;canvas.height=reader.height;canvas.setAttribute('aria-label',exercise.name+' 그림 동작 시범');canvas.setAttribute('role','img');this.figure.append(canvas);
    this.gif={reader,frames,duration,canvas,ctx:canvas.getContext('2d'),pixels:new Uint8ClampedArray(reader.width*reader.height*4),decoded:-1,restore:null};
   }else{
    const images=this.media.frames.map((src,i)=>{const img=new Image();img.src=src;img.alt=exercise.name+' · '+(i?'동작 자세':'준비 자세');img.className='guideImage';return img});await Promise.all(images.map(img=>img.decode()));if(token!==this.token)return false;this.images=images;images.forEach(img=>this.figure.append(img));
   }
   if(token!==this.token)return false;this.host.dataset.mediaReady='true';this.host.dataset.mediaState='ready';this.onReady();this.draw();return true;
  })().catch(error=>{if(token!==this.token||this.controller.signal.aborted)return false;this.host.dataset.mediaState='unavailable';this.host.dataset.mediaError=error.message;const missing=this.media?.provider==='unavailable';const empty=document.querySelector('#motionEmpty');if(empty){empty.querySelector('b').textContent=missing?'이 장비와 일치하는 그림이 없습니다':'그림을 불러오지 못했습니다';empty.querySelector('p').textContent=missing?'요청 원안은 아래 자세 설명을 따라 확인해 주세요. 기본 시간 맞춤에서는 그림이 있는 대체 동작을 제공합니다.':'아래 자세 안내는 계속 볼 수 있습니다. 연결을 확인하고 다시 불러와 주세요.';empty.querySelector('button').hidden=missing}this.onError(error);return false});return this.ready;
 }
 setContext(context){
  if(this.context.phase==='work'&&context.phase!=='work'){const t=guideTiming(this.exercise,{...this.context,setElapsed:(this.context.setElapsed||0)+(performance.now()-this.contextAt)/1000},this.phase,this.side);this.phase=t.phase;this.side=t.side}
  this.context={...context};this.contextAt=performance.now();this.draw();
 }
 draw(){
  if(!this.exercise)return;
  const context={...this.context};if(context.phase==='work')context.setElapsed=(context.setElapsed||0)+(performance.now()-this.contextAt)/1000;
  const state=guideTiming(this.exercise,context,this.phase,this.side);this.stageLabel=state.label;this.host.dataset.guidePhase=String(state.step);this.host.dataset.guideSide=String(state.side);
  const frozen=['rest','paused','feedback','done'].includes(context.phase);this.badge.textContent=context.phase==='rest'?'휴식 중 · 그림 시범 정지':context.phase==='paused'?'일시정지':context.phase==='done'||context.phase==='feedback'?'운동 완료':state.label;
  this.figure.classList.toggle('guideMirrored',!!state.side);this.figure.classList.toggle('guideFrozen',frozen);
  document.querySelectorAll('button[data-guide-phase]').forEach(button=>{const selected=Number(button.dataset.guidePhase)===state.step;button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected))});
  if(context.phase==='ready'){const label=document.querySelector('#phaseLabel');if(label)label.textContent=state.label}
  if(this.images)this.images.forEach((img,i)=>img.hidden=i!==state.imageIndex);
  if(this.gif){const g=this.gif;let target=0,elapsed=0;const visualPhase=this.exercise.holdSeconds&&context.phase==='work'?(this.media.holdPhase??.5):(state.phase+(this.media.offset||0))%1;for(let i=0;i<g.frames.length;i++){elapsed+=Math.max(.02,(g.frames[i].delay||10)/100);if(elapsed>visualPhase*g.duration){target=i;break}}this.drawGifFrame(target)}
 }
 drawGifFrame(target){
  const g=this.gif;if(g.decoded===target)return;const {reader,frames,pixels,ctx}=g;
  if(target<g.decoded){pixels.fill(0);g.decoded=-1;g.restore=null}
  while(g.decoded<target){
   if(g.decoded>=0){const previous=frames[g.decoded];if(previous.disposal===2)for(let y=previous.y;y<previous.y+previous.height;y++)pixels.fill(0,(y*reader.width+previous.x)*4,(y*reader.width+previous.x+previous.width)*4);else if(previous.disposal===3&&g.restore)pixels.set(g.restore)}
   const index=g.decoded+1;g.restore=frames[index].disposal===3?pixels.slice():null;reader.decodeAndBlitFrameRGBA(index,pixels);g.decoded=index;
  }
  ctx.putImageData(new ImageData(pixels,reader.width,reader.height),0,0);this.host.dataset.gifFrame=String(target);
 }
 resize(){}
 dispose(){this.controller?.abort();this.token++;cancelAnimationFrame(this.raf);this.observer?.disconnect();this.gif=null;this.images=null;this.host.replaceChildren()}
}
