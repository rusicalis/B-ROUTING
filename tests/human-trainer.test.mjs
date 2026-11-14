import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as T from '../vendor/three.module.min.js';
import {GLTFLoader} from '../vendor/GLTFLoader.js';
import {poseFrames} from '../motion-studio.js';
import {EXERCISES} from '../workout-engine.mjs';
import {HumanTrainer} from '../human-trainer.mjs';
const bytes=await fs.readFile(new URL('../assets/trainer.glb',import.meta.url));
const loadTrainer=async()=>new HumanTrainer((await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene);
test('trainer uses a continuous skinned human mesh with facial detail and finger bones',async()=>{
 const trainer=await loadTrainer();assert.ok(trainer.model.getObjectByName('Eyes'));assert.ok(trainer.model.getObjectByName('Eyebrows'));
 let vertices=0;trainer.model.traverse(o=>{if(o.isSkinnedMesh)vertices+=o.geometry.attributes.position.count});assert.ok(vertices>5000);assert.ok(trainer.bones.size>=60);assert.ok(trainer.bones.has('index_03_l'));assert.ok(trainer.bones.has('thumb_03_r'));
});
test('exercise posing preserves anatomical segment lengths and has no invalid transforms',async()=>{
 const trainer=await loadTrainer();const lengths=trainer.segmentLengths();
 for(const ex of EXERCISES)for(const pose of poseFrames(ex.animation)){
  trainer.applyPose(pose,ex.animation,ex.equipment==='kettlebell');
  for(const [id,length]of Object.entries(trainer.segmentLengths()))assert.ok(Math.abs(length-lengths[id])<.001,id+' '+ex.id);
  for(const bone of trainer.bones.values())assert.ok(bone.getWorldPosition(new T.Vector3()).toArray().every(Number.isFinite),ex.id);
 }
});
test('squat starts upright and knees bend forwards without lateral bone twist',async()=>{
 const trainer=await loadTrainer();const [a,b]=poseFrames('squat');
 for(let step=0;step<=20;step++){
  const t=step/20,p=Object.fromEntries(Object.keys(a).map(k=>[k,a[k].map((v,i)=>v+(b[k][i]-v)*t)]));trainer.applyPose(p,'squat');
  for(const side of ['l','r']){
   const hip=trainer.pos('thigh_'+side),knee=trainer.pos('calf_'+side),ankle=trainer.pos('foot_'+side);
   const flex=180-knee.clone().sub(hip).angleTo(knee.clone().sub(ankle))*180/Math.PI;
   if(step===0)assert.ok(flex<15,'standing knee flexion '+flex);
   const line=hip.clone().lerp(ankle,(hip.y-knee.y)/(hip.y-ankle.y));assert.ok(knee.z>=line.z-.002,'knees must bend forward');
   assert.ok(Math.abs(knee.x)<=Math.abs(ankle.x)+.055,'knees must not bow excessively beyond feet');
   assert.ok(ankle.distanceTo(new T.Vector3(...p[side==='l'?'rf':'lf']))<.02,'planted foot stays at its target');
   const axes=['thigh_','calf_'].map(prefix=>new T.Vector3(-1,0,0).applyQuaternion(trainer.reference.get(prefix+side).quaternion.clone().invert()).applyQuaternion(trainer.bones.get(prefix+side).getWorldQuaternion(new T.Quaternion())));
   assert.ok(axes[0].dot(axes[1])>.999,'knee hinge axes stay aligned');
  }
 }
});
test('brown swept hair and round dark glasses stay attached to the animated head',async()=>{
 const trainer=await loadTrainer(),hair=trainer.model.getObjectByName('TrainerHair'),glasses=trainer.model.getObjectByName('TrainerGlasses');
 assert.ok(hair,'sculpted brown hair exists');assert.ok(glasses,'round dark glasses exist');assert.equal(hair.parent.name,'Head');assert.equal(glasses.parent.name,'Head');
 const offsets=[hair,glasses].map(o=>o.getWorldPosition(new T.Vector3()).distanceTo(trainer.pos('Head')));
 for(const animation of ['squat','hinge','pushup','bridge']){trainer.applyPose(poseFrames(animation)[1],animation);[hair,glasses].forEach((o,i)=>assert.ok(Math.abs(o.getWorldPosition(new T.Vector3()).distanceTo(trainer.pos('Head'))-offsets[i])<.001))}
});
test('push-up legs stay extended, plank elbows bend and planted hands meet the floor',async()=>{
 const trainer=await loadTrainer();
 for(const animation of ['pushup','wide-pushup','close-pushup','scapular','plank'])for(const pose of poseFrames(animation)){
  trainer.applyPose(pose,animation);
  for(const side of ['l','r']){
   const hip=trainer.pos('thigh_'+side),knee=trainer.pos('calf_'+side),ankle=trainer.pos('foot_'+side),shoulder=trainer.pos('upperarm_'+side),elbow=trainer.pos('lowerarm_'+side),hand=trainer.pos('hand_'+side);
   const kneeFlex=180-hip.clone().sub(knee).angleTo(ankle.clone().sub(knee))*180/Math.PI;assert.ok(kneeFlex<18,animation+' knees '+kneeFlex);
   assert.ok(hand.distanceTo(new T.Vector3(...pose[side==='l'?'rh':'lh']))<.025,animation+' planted hands');
   if(animation==='plank'){const angle=180-shoulder.clone().sub(elbow).angleTo(hand.clone().sub(elbow))*180/Math.PI;assert.ok(angle>65&&angle<115,'plank elbow '+angle)}
  }
 }
});
test('spine, neck and pelvis keep their reference links while all limbs reach authored targets',async()=>{
 const trainer=await loadTrainer();
 const links=new Map([...trainer.bones].filter(([n])=>n!=='pelvis').map(([name,bone])=>[name,{position:bone.position.clone(),scale:bone.scale.clone()}]));
 const supine=['bridge','single-bridge','floor-press','deadbug'];
 for(const ex of EXERCISES)for(const pose of poseFrames(ex.animation)){
  trainer.applyPose(pose,ex.animation,ex.equipment==='kettlebell');
  for(const [name,expected]of links){const bone=trainer.bones.get(name);assert.ok(bone.position.distanceTo(expected.position)<.0001,name+' translation');assert.ok(bone.scale.distanceTo(expected.scale)<.0001,name+' scale')}
  for(const [bone,target]of [['hand_l','rh'],['hand_r','lh']]){const goal=new T.Vector3(...pose[target]);if(supine.includes(ex.animation))goal.x*=-1;assert.ok(trainer.pos(bone).distanceTo(goal)<.06,ex.id+' '+bone+' unreachable '+trainer.pos(bone).distanceTo(goal))}
  const chestDelta=trainer.bones.get('spine_03').getWorldQuaternion(new T.Quaternion()).multiply(trainer.reference.get('spine_03').quaternion.clone().invert());
  const headDelta=trainer.bones.get('Head').getWorldQuaternion(new T.Quaternion()).multiply(trainer.reference.get('Head').quaternion.clone().invert());assert.ok(chestDelta.angleTo(headDelta)<.15,'head follows neutral spine');
 }
});
test('floor exercise toes stay above the floor and knee push-ups bear weight on grounded knees',async()=>{
 const trainer=await loadTrainer();
 for(const animation of ['pushup','wide-pushup','close-pushup','scapular','plank','pike','shoulder-tap','climber','birddog','prone-w','prone-y','snow-angel','back-extension'])for(const pose of poseFrames(animation)){
  trainer.applyPose(pose,animation);
  for(const side of ['l','r'])assert.ok(trainer.pos('ball_'+side).y>=.01,animation+' toes must not pass through the floor');
 }
 for(const animation of ['knee-pushup','close-knee'])for(const pose of poseFrames(animation)){
  trainer.applyPose(pose,animation);
  for(const side of ['l','r']){const knee=trainer.pos('calf_'+side);assert.ok(knee.y>.10&&knee.y<.16,animation+' knee contact height '+knee.y)}
 }
});
