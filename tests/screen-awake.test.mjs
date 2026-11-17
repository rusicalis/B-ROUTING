import test from 'node:test';
import assert from 'node:assert/strict';
import {ScreenAwakeController} from '../screen-awake.mjs';
const lock=()=>{const listeners={};return {released:false,addEventListener:(n,f)=>listeners[n]=f,async release(){this.released=true;listeners.release?.()}}};
test('screen wake lock requests are deduplicated and acquired state is truthful',async()=>{
 let calls=0,resolve;const sentinel=lock(),controller=new ScreenAwakeController({request:()=>{calls++;return new Promise(r=>resolve=r)},isVisible:()=>true});
 controller.setEnabled(true);const first=controller.sync(),second=controller.sync();assert.equal(calls,1);resolve(sentinel);await Promise.all([first,second]);assert.equal(controller.status,'active');assert.equal(controller.held,sentinel);await controller.setEnabled(false);assert.equal(sentinel.released,true);assert.equal(controller.status,'off');
});
test('a late lock is immediately released if visibility changed during the request',async()=>{
 let visible=true,resolve;const sentinel=lock(),controller=new ScreenAwakeController({request:()=>new Promise(r=>resolve=r),isVisible:()=>visible});
 controller.setEnabled(true);const pending=controller.sync();visible=false;await controller.sync();resolve(sentinel);await pending;assert.equal(sentinel.released,true);assert.equal(controller.held,null);assert.equal(controller.status,'waiting');
});
test('visibility return reacquires and external release waits for a retry event',async()=>{
 let visible=true,calls=0;const controller=new ScreenAwakeController({request:async()=>{calls++;return lock()},isVisible:()=>visible});controller.setEnabled(true);await controller.sync();const first=controller.held;visible=false;await controller.sync();assert.equal(first.released,true);visible=true;await controller.sync();assert.equal(calls,2);await controller.held.release();assert.equal(controller.status,'waiting');assert.equal(calls,2);await controller.sync();assert.equal(calls,3);
});
test('unsupported and denied wake locks never report success or break the app',async()=>{
 const unavailable=new ScreenAwakeController({isVisible:()=>true});unavailable.setEnabled(true);await unavailable.sync();assert.equal(unavailable.status,'unsupported');
 const denied=new ScreenAwakeController({request:async()=>{throw new Error('NotAllowedError')},isVisible:()=>true});denied.setEnabled(true);await denied.sync();assert.equal(denied.status,'unavailable');assert.equal(denied.held,null);
});
