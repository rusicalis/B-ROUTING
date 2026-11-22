import test from 'node:test';
import assert from 'node:assert/strict';
import {configForSession,sameRoutineConfig} from '../session-config.mjs';

test('active configuration is derived from its snapshot and current target, independent of next selection',()=>{
 const s={config:{mode:'custom',customIds:['squat'],targetMinutes:30,regions:['legs']},plan:{targetMinutes:40,regions:['legs'],exercises:[{id:'squat'}]},intensity:'hard'};
 const config=configForSession(s);assert.equal(config.mode,'custom');assert.equal(config.targetMinutes,40);assert.equal(config.intensity,'hard');assert.deepEqual(config.customIds,['squat']);config.customIds.push('pushup');assert.deepEqual(s.config.customIds,['squat']);
});
test('legacy cardio sessions retain cardio identity when no configuration snapshot exists',()=>{
 const c=configForSession({trackKey:'cardio:quiet',plan:{kind:'cardio',estimatedMinutes:29.6,exercises:[{id:'quiet-march'}]}});assert.equal(c.mode,'cardio');assert.equal(c.targetMinutes,30);
});
test('legacy saved and custom sessions recover their original selection identities',()=>{
 assert.deepEqual(configForSession({trackKey:'custom:pushup|squat',plan:{targetMinutes:40,variant:2}}).customIds,['pushup','squat']);
 const c=configForSession({plan:{kind:'preset',presetId:'saved-x',day:4,targetMinutes:50,doseMode:'goal',bridgeVariant:'glute'}});assert.equal(c.mode,'preset');assert.equal(c.presetId,'saved-x');assert.equal(c.planDay,4);assert.equal(c.doseMode,'goal');assert.equal(c.bridgeVariant,'glute');
});
test('selection equality ignores date and live intensity but respects duration and preset dose',()=>{
 const c={mode:'preset',presetId:'saved-x',planDay:1,targetMinutes:30,doseMode:'fit',bridgeVariant:'reverse'};
 assert.equal(sameRoutineConfig(c,{...c,intensity:'hard',selectionDate:'tomorrow'}),true);
 for(const change of [{targetMinutes:40},{presetId:'other'},{planDay:2},{doseMode:'goal'},{bridgeVariant:'glute'}])assert.equal(sameRoutineConfig(c,{...c,...change}),false);
 assert.equal(sameRoutineConfig({mode:'auto',regions:['chest','back'],variant:2,targetMinutes:30},{mode:'auto',regions:['back','chest'],variant:2,targetMinutes:30}),true);
});
