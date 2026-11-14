import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as T from '../vendor/three.module.min.js';
import {GLTFLoader} from '../vendor/GLTFLoader.js';
import {HumanTrainer} from '../human-trainer.mjs';
import {EXERCISES} from '../workout-engine.mjs';
import {samplePose,poseFrames} from '../exercise-poses.mjs';
import {reactionPose} from '../trainer-reactions.mjs';
const bytes=await fs.readFile(new URL('../assets/trainer.glb',import.meta.url));
const trainer=new HumanTrainer((await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene);
test('every exercise has continuous shoulder/elbow/hip/knee rotations through the full motion on both sides',()=>{
 for(const e of EXERCISES)for(const side of [0,1]){let previous=new Map();for(let frame=0;frame<=60;frame++){
  trainer.applyPose(samplePose(e.animation,frame/60),e.animation,e.equipment!=='bodyweight',side);
  for(const name of ['pelvis','spine_01','spine_02','spine_03','neck_01','Head','upperarm_l','lowerarm_l','hand_l','upperarm_r','lowerarm_r','hand_r','thigh_l','calf_l','foot_l','thigh_r','calf_r','foot_r']){
   const q=trainer.bones.get(name).getWorldQuaternion(new T.Quaternion());assert.ok(q.toArray().every(Number.isFinite),e.id+' '+name);
   if(previous.has(name))assert.ok(previous.get(name).angleTo(q)<.8,e.id+' '+name+' sudden twist at '+frame);previous.set(name,q);
  }
  for(const suffix of ['l','r']){const shoulder=trainer.pos('upperarm_'+suffix),elbow=trainer.pos('lowerarm_'+suffix),hand=trainer.pos('hand_'+suffix),finger=trainer.pos('middle_01_'+suffix);const flex=180-shoulder.sub(elbow).angleTo(hand.clone().sub(elbow))*180/Math.PI;assert.ok(flex<150,e.id+' elbow overfold');assert.ok(hand.clone().sub(elbow).angleTo(finger.sub(hand))*180/Math.PI<105,e.id+' wrist overfold');}
 }}
});
test('forefeet remain grounded while the calf-raise heels rise',()=>{
 const heights=[];for(const p of poseFrames('calf')){trainer.applyPose(p,'calf');heights.push(trainer.pos('foot_l').y);assert.ok(Math.abs(trainer.pos('ball_l').y-.023)<.035,'forefoot contact')}
 assert.ok(heights[1]-heights[0]>.06);
});
test('rest gestures retain all skeletal segment lengths and band grips stay within a short working span',()=>{
 const lengths=trainer.segmentLengths();for(const kind of ['breathe','wipe','encourage','recover','celebrate'])for(let t=0;t<10;t+=.5){trainer.applyPose(reactionPose(poseFrames('squat')[0],kind,t,.9),'squat');for(const [name,length]of Object.entries(trainer.segmentLengths()))assert.ok(Math.abs(length-lengths[name])<.001,kind+' '+name)}
 for(const animation of ['band-w','band-curl','band-triceps'])for(let t=0;t<=1;t+=.05){trainer.applyPose(samplePose(animation,t),animation,true);assert.ok(trainer.handPosition('l').distanceTo(trainer.handPosition('r'))<.61,animation+' band span')}
});
