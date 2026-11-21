import test from 'node:test';
import assert from 'node:assert/strict';
import {exerciseProfile,rankExercises} from '../exercise-policy.mjs';
const e=(id,groups=['chest','shoulders','triceps'],extra={})=>({id,groups,equipment:id.startsWith('kb-')?'kettlebell':'bodyweight',...extra});
const pushPool=[e('archer-pushup',undefined,{advanced:true}),e('pushup-rotation',undefined,{advanced:true}),e('plank-triceps-extension',['triceps','shoulders','core'],{advanced:true}),e('hindu-pushup',undefined,{advanced:true}),e('floor-triceps-dip'),e('pushup'),e('kb-floor-press'),e('pike-pushup'),e('bodyweight-triceps',['triceps'])];
const challenges=list=>list.filter(exercise=>exerciseProfile(exercise).difficulty>=3);

test('common efficient basics precede unusual new assistance at baseline regardless of input order',()=>{
 const ranked=rankExercises([e('side-lying-biceps-curl',['biceps','core']),e('kb-concentration-curl',['biceps']),e('kb-row',['back','biceps']),e('kb-curl',['biceps'])],['biceps'],0);
 assert.equal(ranked[0].id,'kb-row');
 assert.ok(ranked.findIndex(x=>x.id==='kb-curl')<ranked.findIndex(x=>x.id==='side-lying-biceps-curl'));
 assert.equal(challenges(rankExercises(pushPool,['chest','triceps'],0)).length,0);
});

test('earned level4 introduces one controlled challenge early despite its advanced catalog flag',()=>{
 const below=rankExercises(pushPool,['triceps'],3),ready=rankExercises(pushPool,['triceps'],4);
 assert.equal(challenges(below).length,0);assert.deepEqual(challenges(ready).map(x=>x.id),['plank-triceps-extension']);
 assert.ok(ready.findIndex(x=>x.id==='plank-triceps-extension')<=2);
 assert.equal(exerciseProfile(pushPool.find(x=>x.id==='plank-triceps-extension')).automatic,true);
});

test('level8 allows two relevant controlled challenges while archer waits until10',()=>{
 for(let level=0;level<=12;level++){
  const ranked=rankExercises(pushPool,['chest','shoulders','triceps'],level);
  assert.ok(challenges(ranked).length<=(level>=8?2:level>=4?1:0));
 }
 const ready=rankExercises(pushPool,['chest','shoulders','triceps'],8);
 assert.deepEqual(challenges(ready).map(x=>x.id),['plank-triceps-extension','pushup-rotation']);
 assert.ok(ready.findIndex(x=>x.id==='pushup-rotation')<=4);
 assert.deepEqual(rankExercises([e('archer-pushup')],['chest'],9),[]);
 assert.equal(rankExercises([e('archer-pushup')],['chest'],10)[0].id,'archer-pushup');
});

test('leg and stability challenges unlock after comfortable completions, not dates',()=>{
 const pool=[e('single-bridge',['legs','core'],{daysSinceStart:365}),e('side-plank',['core','shoulders'],{completedDays:365}),e('squat',['legs']),e('plank',['core'])];
 assert.equal(challenges(rankExercises(pool,['legs','core'],0)).length,0);
 assert.equal(challenges(rankExercises(pool,['legs','core'],4)).length,1);
 assert.equal(challenges(rankExercises(pool,['legs','core'],8)).length,2);
 assert.equal(challenges(rankExercises(pool,['legs','core'],new Date('2099-01-01'))).length,0);
 assert.equal(challenges(rankExercises(pool,['legs','core'],{days:100,level:0})).length,0);
});

test('technical kettlebell moves never enter automatic plans at any earned level',()=>{
 const technical=['kb-windmill','kb-hang-clean','kb-swing','kb-push-press','kb-figure-eight','kb-lunge-pass'].map(id=>e(id,['legs','back','shoulders','core'],{advanced:true}));
 for(const exercise of technical){assert.equal(exerciseProfile(exercise).automatic,false);assert.equal(exerciseProfile(exercise).difficulty,4)}
 for(const level of [0,4,8,12,999])assert.deepEqual(rankExercises(technical,['full'],level),[]);
 assert.deepEqual(rankExercises([e('future-trick',['chest'],{advanced:true})],['chest'],12),[]);
});

test('ranking respects target fit and spreads basic movement patterns before duplicate variants',()=>{
 const pool=[e('wide-pushup',['chest']),e('pushup',['chest']),e('squat',['legs']),e('kb-row',['back']),e('kb-floor-press',['chest'])];
 const chest=rankExercises(pool,['chest'],0);assert.equal(chest[0].id,'pushup');assert.ok(chest.every(x=>x.groups.includes('chest')));
 const full=rankExercises(pool,['full'],0);
 assert.ok(full.findIndex(x=>x.id==='kb-row')<full.findIndex(x=>x.id==='wide-pushup'));
 assert.ok(full.findIndex(x=>x.id==='squat')<full.findIndex(x=>x.id==='kb-floor-press'));
});

test('profiles are app heuristics; ranking deduplicates and preserves input metadata',()=>{
 const original=structuredClone(pushPool),ranked=rankExercises([...pushPool,pushPool[5]],['triceps'],8);
 assert.deepEqual(pushPool,original);assert.equal(new Set(ranked.map(x=>x.id)).size,ranked.length);
 for(const exercise of ranked)assert.ok(pushPool.includes(exercise));
 const profile=exerciseProfile(e('kb-row',['back']));assert.ok([1,2,3,4].includes(profile.difficulty));assert.equal(profile.pattern,'horizontal-pull');assert.equal(profile.role,'compound');assert.equal(typeof profile.priority,'number');
 profile.priority=-999;assert.notEqual(exerciseProfile(e('kb-row')).priority,-999);
});

test('basic assistance in a missing pattern precedes several redundant pushup variants',()=>{
 const pool=[e('pushup'),e('knee-pushup'),e('wide-pushup'),e('kb-floor-press'),e('pike-pushup'),e('bodyweight-triceps',['triceps']),e('scapular-pushup',['chest','shoulders'])];
 const ranked=rankExercises(pool,['chest','shoulders','triceps'],0);
 assert.ok(ranked.findIndex(x=>x.id==='scapular-pushup')<ranked.findIndex(x=>x.id==='wide-pushup'));
 assert.ok(ranked.findIndex(x=>x.id==='bodyweight-triceps')<ranked.findIndex(x=>x.id==='kb-floor-press'));
 assert.equal(ranked[0].id,'pushup');
});
