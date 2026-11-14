import * as T from './vendor/three.module.min.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {HumanTrainer} from './human-trainer.mjs';
import {TrainerExpressions,trainerReaction,reactionPose} from './trainer-reactions.mjs';

import {poseFrames,samplePose} from './exercise-poses.mjs';
export {poseFrames,samplePose} from './exercise-poses.mjs';

export class MotionStudio{
  constructor(host,onError){
    this.host=host;this.speed=1;this.reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;this.playing=!this.reduceMotion;this.phase=0;this.yaw=.32;this.last=performance.now();this.external=false;this.side=0;this.active=false;this.visible=true;this.failed=false;this.context={phase:'ready'};this.contextAt=performance.now();
    const compact=matchMedia('(max-width: 600px)').matches;
    try{
      this.renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
      this.renderer.setPixelRatio(Math.min(devicePixelRatio,compact?1.5:1.75));this.renderer.shadowMap.enabled=!compact;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;
      host.append(this.renderer.domElement);this.renderer.domElement.setAttribute('aria-label','얼굴과 손가락이 있는 인체 모델의 운동 동작');this.renderer.domElement.setAttribute('role','img');
      this.speech=document.createElement('div');this.speech.className='trainerSpeech';this.speech.setAttribute('aria-live','polite');this.speech.hidden=true;host.append(this.speech);
      this.scene=new T.Scene();this.camera=new T.PerspectiveCamera(35,1,.1,30);
      this.scene.add(new T.HemisphereLight(0xfff6ed,0x53716c,2.4));
      const key=new T.DirectionalLight(0xffeee0,3);key.position.set(3,5,4);key.castShadow=!compact;key.shadow.mapSize.set(512,512);Object.assign(key.shadow.camera,{left:-3,right:3,top:4,bottom:-3});this.scene.add(key);
      const fill=new T.DirectionalLight(0xb6dedb,1.8);fill.position.set(-3,3,-2);this.scene.add(fill);
      this.sphere=new T.SphereGeometry(1,20,16);this.kb=new T.Group();
      const body=new T.Mesh(this.sphere,new T.MeshStandardMaterial({color:0x23463f,roughness:.4,metalness:.5}));body.scale.set(.17,.18,.16);body.position.y=-.23;body.castShadow=true;this.kb.add(body);
      const handle=new T.Mesh(new T.TorusGeometry(.12,.027,8,24),new T.MeshStandardMaterial({color:0x6eaaa0,metalness:.6,roughness:.3}));handle.position.y=-.045;this.kb.add(handle);this.kb.visible=false;this.scene.add(this.kb);
      this.band=new T.Mesh(new T.CylinderGeometry(.012,.012,1,8),new T.MeshStandardMaterial({color:'#c58a62',roughness:.8}));this.band.visible=false;this.scene.add(this.band);
      const platform=new T.Mesh(new T.CylinderGeometry(1.9,1.94,.045,64),new T.MeshStandardMaterial({color:0x264740,roughness:.96}));platform.position.y=-.035;platform.receiveShadow=true;this.scene.add(platform);
      const ring=new T.Mesh(new T.TorusGeometry(1.89,.008,6,80),new T.MeshBasicMaterial({color:0x95b9ac}));ring.rotation.x=Math.PI/2;ring.position.y=-.009;this.scene.add(ring);
      const shadow=new T.Mesh(new T.CircleGeometry(.56,32),new T.MeshBasicMaterial({color:0x71968a,transparent:true,opacity:.14,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.scale.set(1,.6,1);shadow.position.y=-.003;this.scene.add(shadow);
      this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(host);
      this.visibilityObserver=new IntersectionObserver(entries=>{this.visible=entries[0].isIntersecting;if(this.visible)this.draw()});this.visibilityObserver.observe(host);
      let drag=null;host.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,yaw:this.yaw}});
      host.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)>8&&Math.abs(dx)>Math.abs(dy)*1.25){host.setPointerCapture(e.pointerId);this.yaw=drag.yaw+dx*.01;this.draw()}});
      host.addEventListener('pointerup',()=>drag=null);host.addEventListener('pointercancel',()=>drag=null);
      this.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();this.failed=true;onError()});
      this.resize();
      this.ready=new GLTFLoader().loadAsync(new URL('./assets/trainer.glb',import.meta.url).href).then(gltf=>{this.trainer=new HumanTrainer(gltf.scene);this.expressions=new TrainerExpressions(this.trainer.model,this.trainer.bones);this.scene.add(this.trainer.model);host.dataset.modelReady='true';this.draw();return true}).catch(error=>{this.failed=true;onError(error);return false});
      this.loop=()=>{this.raf=requestAnimationFrame(this.loop);const now=performance.now();if(!this.active||!this.visible||document.hidden||this.failed){this.last=now;return}if(now-this.last<1000/30)return;const dt=Math.min((now-this.last)/1000,.1);this.last=now;if(this.playing&&!this.external){const nextPhase=this.phase+dt*this.speed/(this.exercise?.cycleSeconds||4);if(this.exercise?.alternating&&nextPhase>=1)this.side=1-this.side;this.phase=nextPhase%1;this.draw()}else if(!this.reduceMotion&&this.context.phase!=='ready')this.draw()};this.loop();
    }catch(error){this.failed=true;this.ready=Promise.resolve(false);onError(error)}
  }
  resize(){if(!this.renderer)return;const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.draw()}
  setExercise(ex){this.exercise=ex;this.frames=poseFrames(ex.animation);this.phase=0;this.side=0;this.external=false;this.draw()}
  setView(view){this.yaw={front:0,side:Math.PI/2,back:Math.PI,angle:.32}[view]??.32;this.draw()}
  setContext(context){this.context={...context};this.contextAt=performance.now();this.draw()}
  draw(){
    if(this.failed||!this.frames||!this.trainer)return;
    const smooth=this.reduceMotion?0:Math.max(0,(performance.now()-this.contextAt)/1000),context={...this.context,restElapsed:(this.context.restElapsed||0)+smooth},reaction=trainerReaction(context),time=this.reduceMotion?0:performance.now()/1000;
    let phase=this.phase,side=this.side;if(context.phase==='work'){const elapsed=(context.setElapsed||0)+smooth,cycle=this.exercise.cycleSeconds||4,perSide=this.exercise.holdSeconds||this.exercise.workSeconds||this.exercise.reps*cycle;side=this.exercise.alternating?Math.floor(elapsed/cycle)%2:this.exercise.eachSide&&elapsed>=perSide?1:0;phase=this.exercise.holdSeconds?(this.exercise.holdPhase??.15):elapsed>=perSide*(this.exercise.eachSide?2:1)?0:(elapsed%cycle)/cycle}
    const t=(1-Math.cos(phase*Math.PI*2))/2;let p=samplePose(this.exercise.animation,t);
    if(reaction.takesOverPose){p=reactionPose(poseFrames('squat')[0],reaction.kind,context.restElapsed,reaction.fatigue);side=0}
    this.trainer.applyPose(p,reaction.takesOverPose?'squat':this.exercise.animation,['kettlebell','band'].includes(this.exercise.equipment)&&!reaction.takesOverPose,side);
    if(['encourage','celebrate'].includes(reaction.kind)){this.trainer.grip('l',true);if(reaction.kind==='celebrate')this.trainer.grip('r',true)}
    if(this.exercise.animation==='punch'&&!reaction.takesOverPose){this.trainer.grip('l',true);this.trainer.grip('r',true)}
    if(reaction.kind==='wipe')this.trainer.orientHand('l',new T.Vector3(-1,0,0),new T.Vector3(0,0,-1));
    if(reaction.kind==='encourage')this.trainer.tiltHead(.045*Math.sin(time*3));
    this.expressions.update(reaction,time,this.reduceMotion);this.host.dataset.reaction=reaction.kind;this.host.dataset.fatigue=reaction.fatigue.toFixed(2);this.speech.hidden=!reaction.speech;if(this.speech.textContent!==reaction.speech)this.speech.textContent=reaction.speech;
    this.kb.visible=this.exercise.equipment==='kettlebell'&&!reaction.takesOverPose;if(this.kb.visible){const left=this.trainer.handPosition(side?'r':'l');if(['row','floor-press','suitcase'].includes(this.exercise.animation))this.kb.position.copy(left);else this.kb.position.copy(left).add(this.trainer.handPosition(side?'l':'r')).multiplyScalar(.5)}
    this.band.visible=this.exercise.equipment==='band'&&!reaction.takesOverPose;if(this.band.visible){const left=this.trainer.handPosition('l'),right=this.trainer.handPosition('r'),direction=right.clone().sub(left);this.band.position.copy(left).add(right).multiplyScalar(.5);this.band.scale.set(1,direction.length(),1);this.band.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize())}
    const floorPose=!reaction.takesOverPose&&['pushup','knee-pushup','wide-pushup','close-pushup','close-knee','plank','pike','scapular','shoulder-tap','climber','birddog','bridge','single-bridge','floor-press','deadbug','sideplank','prone-w','prone-y','snow-angel','back-extension'].includes(this.exercise.animation);
    const r=floorPose?5.8:5.65;this.camera.position.set(Math.sin(this.yaw)*r,floorPose?3.2:2.05,Math.cos(this.yaw)*r);this.camera.lookAt(0,floorPose?.5:1.3,0);this.renderer.render(this.scene,this.camera);
  }
  dispose(){cancelAnimationFrame(this.raf);this.resizeObserver?.disconnect();this.visibilityObserver?.disconnect();this.scene?.traverse(o=>{o.geometry?.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material?.dispose()});this.renderer?.dispose()}
}
