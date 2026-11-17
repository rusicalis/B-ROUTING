import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {EXERCISES} from '../workout-engine.mjs';
import {EXERCISE_MEDIA,LOCAL_MEDIA_ASSETS,getExerciseMedia} from '../exercise-media-data.mjs';
import {guideTiming} from '../guide-timing.mjs';

test('each exercise has an illustrated guide and all bundled frames exist',async()=>{
 assert.equal(EXERCISE_MEDIA.length,EXERCISES.length);assert.equal(new Set(EXERCISE_MEDIA.map(m=>m.id)).size,EXERCISES.length);
 for(const e of EXERCISES){const media=getExerciseMedia(e.id);assert.ok(media,e.id);assert.ok(['gif','unavailable'].includes(media.provider));assert.equal(media.frames.length,0);if(media.provider==='gif'){const url=new URL(media.url);assert.ok(url.hostname==='raw.githubusercontent.com'||url.hostname==='wsrv.nl');assert.ok(media.source.includes('Gym visual'))}else assert.ok(media.note.length>20)}

 for(const path of LOCAL_MEDIA_ASSETS)assert.ok((await fs.stat(new URL('../'+path,import.meta.url))).size>150,path);
});
test('working illustrations follow the set clock, reverse side exactly once and stop at completion',()=>{
 const e={reps:10,cycleSeconds:4,eachSide:true};
 assert.equal(guideTiming(e,{phase:'work',setElapsed:0}).step,0);
 assert.equal(guideTiming(e,{phase:'work',setElapsed:2}).step,1);
 assert.equal(guideTiming(e,{phase:'work',setElapsed:3.5}).step,2);
 assert.equal(guideTiming(e,{phase:'work',setElapsed:39.9}).side,0);
 assert.equal(guideTiming(e,{phase:'work',setElapsed:40}).side,1);
 assert.equal(guideTiming(e,{phase:'work',setElapsed:80}).ended,true);
 assert.equal(guideTiming(e,{phase:'work',setElapsed:85}).phase,0);
});
test('holds stay in the target pose and paused/rest guides retain their exact preview frame',()=>{
 assert.equal(guideTiming({holdSeconds:25},{phase:'work',setElapsed:12}).imageIndex,1);
 for(const phase of ['paused','rest'])assert.equal(guideTiming({reps:10,cycleSeconds:4},{phase,setElapsed:200},.61,1).phase,.61);
 assert.equal(guideTiming({workSeconds:50,cycleSeconds:2,alternating:true},{phase:'work',setElapsed:2}).side,1);
});
test('active application contains no human-video player or runtime3D dependency',async()=>{
 for(const path of ['app.js','index.html','illustrated-guide.mjs','exercise-media-data.mjs','service-worker.js']){const source=await fs.readFile(new URL('../'+path,import.meta.url),'utf8');assert.doesNotMatch(source,/youtube|youtu\.be|vimeo|dvidshub|<video|<iframe|\.mp4|three\.module|trainer\.glb|MotionStudio|WebGLRenderer/,path)}
});
