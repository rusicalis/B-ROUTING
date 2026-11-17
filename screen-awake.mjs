export class ScreenAwakeController{
 constructor({request=globalThis.navigator?.wakeLock?.request?.bind(globalThis.navigator.wakeLock),isVisible=()=>globalThis.document?.visibilityState!=='hidden',onChange=()=>{}}={}){this.request=request;this.isVisible=isVisible;this.onChange=onChange;this.enabled=false;this.held=null;this.pending=null;this.status='off'}
 report(status){this.status=status;this.onChange(status)}
 setEnabled(enabled){this.enabled=!!enabled;return this.sync()}
 async releaseHeld(){const previous=this.held;this.held=null;if(previous&&!previous.released)try{await previous.release()}catch{}}
 sync(){
  if(!this.enabled){this.report('off');return this.releaseHeld()}
  if(!this.isVisible()){this.report('waiting');return this.releaseHeld()}
  if(!this.request){this.report('unsupported');return Promise.resolve()}
  if(this.held&&!this.held.released){this.report('active');return Promise.resolve()}
  if(this.pending)return this.pending;
  this.report('requesting');
  this.pending=(async()=>{
   try{
    const sentinel=await this.request('screen');
    if(!this.enabled||!this.isVisible()){try{await sentinel.release()}catch{}this.report(this.enabled?'waiting':'off');return}
    this.held=sentinel;sentinel.addEventListener('release',()=>{if(this.held===sentinel){this.held=null;this.report(this.enabled?'waiting':'off')}});this.report('active');
   }catch{this.report(this.enabled?(this.isVisible()?'unavailable':'waiting'):'off')}
  })().finally(()=>{this.pending=null});return this.pending;
 }
 dispose(){this.enabled=false;return this.sync()}
}
