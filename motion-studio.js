import * as T from './vendor/three.module.min.js';

const copy=p=>Object.fromEntries(Object.entries(p).map(([k,v])=>[k,[...v]]));
const stand=()=>({hip:[0,1.35,0],chest:[0,2.05,0],head:[0,2.65,0],ls:[-.43,2.08,0],rs:[.43,2.08,0],le:[-.55,1.57,.02],re:[.55,1.57,.02],lh:[-.55,1.1,.1],rh:[.55,1.1,.1],lk:[-.23,.72,.02],rk:[.23,.72,.02],lf:[-.24,.12,.12],rf:[.24,.12,.12]});
const floor=()=>({hip:[0,.56,-.45],chest:[0,.67,.55],head:[0,.68,1.04],ls:[-.38,.67,.62],rs:[.38,.67,.62],le:[-.4,.38,.75],re:[.4,.38,.75],lh:[-.4,.1,.9],rh:[.4,.1,.9],lk:[-.2,.3,-1.03],rk:[.2,.3,-1.03],lf:[-.22,.1,-1.6],rf:[.22,.1,-1.6]});
const supine=()=>({hip:[0,.23,-.18],chest:[0,.24,.57],head:[0,.24,1.12],ls:[-.38,.24,.6],rs:[.38,.24,.6],le:[-.55,.12,.18],re:[.55,.12,.18],lh:[-.5,.1,-.18],rh:[.5,.1,-.18],lk:[-.23,.7,-.65],rk:[.23,.7,-.65],lf:[-.24,.1,-.94],rf:[.24,.1,-.94]});

// Explicit start/end joint positions for every supported motion family.
export function poseFrames(animation){
  let a=stand(),b=copy(a);
  if(['squat','goblet-squat','sumo'].includes(animation)){
    const wide=animation==='sumo'?.62:.34;
    for(const p of [a,b]){p.lf[0]=-wide;p.rf[0]=wide;p.lk[0]=-wide;p.rk[0]=wide;p.lh=[-.18,2.05,.38];p.rh=[.18,2.05,.38];p.le=[-.45,1.7,.3];p.re=[.45,1.7,.3]}
    Object.assign(b,{hip:[0,.81,-.43],chest:[0,1.46,-.04],head:[0,2.05,.12],ls:[-.43,1.5,-.02],rs:[.43,1.5,-.02],lk:[-wide,.64,.34],rk:[wide,.64,.34],le:[-.45,1.16,.3],re:[.45,1.16,.3],lh:[-.18,1.49,.4],rh:[.18,1.49,.4]});
    if(animation==='sumo')for(const p of [a,b]){p.lh=[-.14,p.hip[1]-.3,.25];p.rh=[.14,p.hip[1]-.3,.25];p.le=[-.28,p.chest[1]-.45,.13];p.re=[.28,p.chest[1]-.45,.13]}
  }else if(['hinge','good-morning','row'].includes(animation)){
    Object.assign(b,{hip:[0,1.15,-.45],chest:[0,1.57,.27],head:[0,1.85,.71],ls:[-.4,1.6,.3],rs:[.4,1.6,.3],lk:[-.23,.68,.18],rk:[.23,.68,.18],le:[-.4,1.05,.34],re:[.4,1.05,.34],lh:[-.16,.53,.38],rh:[.16,.53,.38]});
    if(animation==='good-morning')for(const p of [a,b]){p.lh=[-.16,p.chest[1],p.chest[2]+.25];p.rh=[.16,p.chest[1],p.chest[2]+.25];p.le=[-.48,p.chest[1]-.25,p.chest[2]+.1];p.re=[.48,p.chest[1]-.25,p.chest[2]+.1]}
    if(animation==='row'){a=copy(b);a.lf=[-.3,.1,.55];a.lk=[-.3,.65,.55];a.rf=[.3,.1,-.65];a.rk=[.3,.7,-.4];a.lh=[-.3,.82,.55];a.le=[-.36,1.17,.55];a.rh=[.45,.48,.35];b=copy(a);b.rh=[.42,1.1,.05];b.re=[.45,1.63,-.36]}
  }else if(['lunge','split-squat'].includes(animation)){
    if(animation==='split-squat'){a.lf=[-.23,.1,.5];a.lk=[-.23,.72,.35];a.rf=[.23,.15,-.62];a.rk=[.23,.72,-.35]}
    Object.assign(b,{hip:[0,.8,0],chest:[0,1.5,.03],head:[0,2.1,.05],ls:[-.43,1.53,.03],rs:[.43,1.53,.03],le:[-.5,1.05,.05],re:[.5,1.05,.05],lh:[-.5,.58,.1],rh:[.5,.58,.1],lk:[-.23,.62,.6],rk:[.23,.13,-.53],lf:[-.23,.1,.64],rf:[.23,.12,-1.08]});
  }else if(animation==='calf'){for(const [k,v]of Object.entries(b))v[1]+=.18;b.lf[1]=b.rf[1]=.18}
  else if(['pushup','wide-pushup','close-pushup','knee-pushup','close-knee','scapular','plank','pike','shoulder-tap','climber','birddog'].includes(animation)){
    a=floor();b=copy(a);
    if(animation.includes('knee'))for(const p of [a,b]){p.lk=[-.2,.1,-.73];p.rk=[.2,.1,-.73];p.lf=[-.2,.35,-1.18];p.rf=[.2,.35,-1.18]}
    if(animation.includes('wide'))for(const p of [a,b]){p.lh[0]=-.65;p.rh[0]=.65}
    if(animation.includes('close'))for(const p of [a,b]){p.lh[0]=-.22;p.rh[0]=.22}
    for(const k of ['hip','chest','head','ls','rs'])b[k][1]-=animation==='scapular'?.07:.31;
    b.le=[a.lh[0]-.14,.24,.5];b.re=[a.rh[0]+.14,.24,.5];
    if(animation==='scapular')for(const p of [a,b])for(const side of ['l','r'])p[side+'e']=p[side+'s'].map((v,i)=>(v+p[side+'h'][i])/2);
    if(animation==='plank'){a.le=[-.36,.1,.7];a.re=[.36,.1,.7];a.lh=[-.36,.1,1.15];a.rh=[.36,.1,1.15];a.chest[1]=a.ls[1]=a.rs[1]=.48;a.head[1]=.5;a.hip[1]=.42;b=copy(a)}
    if(animation==='pike'){a.hip=[0,1.22,-.38];a.chest=[0,.85,.42];a.head=[0,.63,.85];a.ls=[-.36,.85,.42];a.rs=[.36,.85,.42];a.lk=[-.22,.62,-.92];a.rk=[.22,.62,-.92];b=copy(a);for(const k of ['chest','head','ls','rs'])b[k][1]-=.32;b.le=[-.5,.25,.65];b.re=[.5,.25,.65]}
    if(animation==='shoulder-tap'){b=copy(a);b.rh=[-.34,.73,.61];b.re=[.23,.9,.8]}
    if(animation==='climber'){b=copy(a);b.rk=[.23,.37,.25];b.rf=[.24,.13,-.25]}
    if(animation==='birddog'){a.lk=[-.2,.1,-.42];a.rk=[.2,.1,-.42];a.lf=[-.2,.1,-1];a.rf=[.2,.1,-1];a.hip[1]=.68;b=copy(a);b.rh=[.38,.71,1.68];b.re=[.38,.7,1.12];b.lk=[-.2,.67,-1.05];b.lf=[-.2,.65,-1.64]}
  }else if(['prone-w','prone-y','snow-angel'].includes(animation)){
    a=floor();for(const v of Object.values(a))v[1]=.16;a.head[1]=.22;a.le=[-.7,.12,.8];a.re=[.7,.12,.8];a.lh=[-.65,.12,1.17];a.rh=[.65,.12,1.17];
    if(animation==='prone-y'){a.le=[-.6,.1,1.02];a.re=[.6,.1,1.02];a.lh=[-.8,.1,1.47];a.rh=[.8,.1,1.47]}
    if(animation==='snow-angel'){a.le=[-.7,.2,.1];a.re=[.7,.2,.1];a.lh=[-.45,.2,-.4];a.rh=[.45,.2,-.4]}
    b=copy(a);for(const k of ['le','re','lh','rh'])b[k][1]+=.22;
    if(animation==='snow-angel'){b.le=[-.65,.3,1];b.re=[.65,.3,1];b.lh=[-.8,.3,1.5];b.rh=[.8,.3,1.5]}
  }else if(['bridge','single-bridge','floor-press','deadbug'].includes(animation)){
    a=supine();b=copy(a);
    if(animation.includes('bridge')){b.hip[1]=.67;b.chest[1]=.34;if(animation==='single-bridge'){a.rk=[.23,.45,-.74];a.rf=[.23,.65,-1.26];b.rk=[.23,.87,-.74];b.rf=[.23,1.06,-1.26]}}
    if(animation==='floor-press'){a.re=[.64,.13,.43];a.rh=[.64,.65,.43];b=copy(a);b.re=[.35,.76,.57];b.rh=[.32,1.31,.57]}
    if(animation==='deadbug'){a.lh=[-.3,1.3,.57];a.rh=[.3,1.3,.57];a.le=[-.3,.78,.57];a.re=[.3,.78,.57];a.lk=[-.2,.88,-.18];a.rk=[.2,.88,-.18];a.lf=[-.2,.88,-.75];a.rf=[.2,.88,-.75];b=copy(a);b.rh=[.3,.28,1.64];b.re=[.3,.29,1.1];b.lk=[-.2,.32,-.76];b.lf=[-.2,.21,-1.36]}
  }else if(animation==='sideplank'){
    a={hip:[0,.53,-.35],chest:[0,.65,.52],head:[0,.7,1.06],ls:[0,.4,.59],rs:[0,.95,.59],le:[0,.1,.65],re:[0,1.4,.59],lh:[-.45,.1,.7],rh:[0,1.88,.59],lk:[0,.3,-.95],rk:[0,.3,-.95],lf:[-.12,.1,-1.6],rf:[.12,.1,-1.5]};b=copy(a);
  }else if(animation==='curl'){a.lh=[-.14,1.2,.3];a.rh=[.14,1.2,.3];b=copy(a);b.lh=[-.14,2.05,.4];b.rh=[.14,2.05,.4];b.le=[-.4,1.6,.12];b.re=[.4,1.6,.12]}
  return [a,b];
}

export class MotionStudio{
  constructor(host,onError){
    this.host=host;this.speed=1;this.playing=!matchMedia('(prefers-reduced-motion: reduce)').matches;this.phase=0;this.yaw=.62;this.last=performance.now();this.external=false;this.side=0;this.active=false;
    try{
      this.renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.3;host.append(this.renderer.domElement);this.renderer.domElement.setAttribute('aria-label','회전 가능한 3D 운동 동작 가이드');this.renderer.domElement.setAttribute('role','img');
      this.scene=new T.Scene();this.camera=new T.PerspectiveCamera(36,1,.1,50);
      this.scene.add(new T.HemisphereLight(0xd7f9ff,0x273b40,2.2));
      for(const [color,intensity,x,y,z]of [[0xffffff,4,3,6,4],[0x69d9c5,3,-4,3,-3]]){const l=new T.DirectionalLight(color,intensity);l.position.set(x,y,z);l.castShadow=true;l.shadow.mapSize.set(1024,1024);l.shadow.camera.left=-4;l.shadow.camera.right=4;l.shadow.camera.top=5;l.shadow.camera.bottom=-4;this.scene.add(l)}
      this.root=new T.Group();this.scene.add(this.root);
      this.sphere=new T.SphereGeometry(1,24,20);this.cylinder=new T.CylinderGeometry(1,1,1,20);
      this.neutral=new T.MeshStandardMaterial({color:0xb7c8ca,roughness:.45,metalness:.23});this.dark=new T.MeshStandardMaterial({color:0x25383c,roughness:.65});this.highlight=new T.MeshStandardMaterial({color:0x49d5b9,roughness:.4,metalness:.22,emissive:0x113c34,emissiveIntensity:.3});
      this.bones=[];for(const [start,end,radius,group]of [['ls','le',.12,'arms'],['le','lh',.095,'arms'],['rs','re',.12,'arms'],['re','rh',.095,'arms'],['hip','lk',.155,'legs'],['hip','rk',.155,'legs'],['lk','lf',.115,'legs'],['rk','rf',.115,'legs']]){const mesh=new T.Mesh(this.sphere,this.neutral);mesh.castShadow=true;this.root.add(mesh);this.bones.push({start,end,radius,group,mesh})}
      this.torso=this.mesh(this.neutral);this.abdomen=this.mesh(this.dark);this.pelvis=this.mesh(this.dark);this.neck=this.mesh(this.neutral);this.head=this.mesh(this.neutral);this.nose=this.mesh(this.neutral);
      this.pecs=[this.mesh(this.neutral),this.mesh(this.neutral)];this.delts=[this.mesh(this.neutral),this.mesh(this.neutral)];this.hands=[this.mesh(this.neutral),this.mesh(this.neutral)];this.feet=[this.mesh(this.dark),this.mesh(this.dark)];
      this.kb=new T.Group();const ball=new T.Mesh(this.sphere,new T.MeshStandardMaterial({color:0x3ebca7,metalness:.75,roughness:.3}));ball.scale.set(.19,.2,.17);ball.position.y=-.24;this.kb.add(ball);const handle=new T.Mesh(new T.TorusGeometry(.13,.031,12,28),this.dark);handle.position.y=-.04;this.kb.add(handle);this.root.add(this.kb);
      const platform=new T.Mesh(new T.CylinderGeometry(2.15,2.18,.09,96),new T.MeshStandardMaterial({color:0x14272d,roughness:.8,metalness:.2}));platform.position.y=-.055;platform.receiveShadow=true;this.scene.add(platform);
      const ring=new T.Mesh(new T.TorusGeometry(2.13,.012,8,100),new T.MeshBasicMaterial({color:0x4fc5b4}));ring.rotation.x=Math.PI/2;ring.position.y=-.003;this.scene.add(ring);
      const grid=new T.GridHelper(4,16,0x244950,0x1a353c);grid.position.y=-.006;this.scene.add(grid);
      this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(host);
      let drag=null;host.addEventListener('pointerdown',e=>{drag={x:e.clientX,yaw:this.yaw};host.setPointerCapture(e.pointerId)});host.addEventListener('pointermove',e=>{if(drag)this.yaw=drag.yaw+(e.clientX-drag.x)*.012});host.addEventListener('pointerup',()=>drag=null);host.addEventListener('pointercancel',()=>drag=null);
      this.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();this.failed=true;onError()});
      this.resize();this.loop=()=>{this.raf=requestAnimationFrame(this.loop);const now=performance.now(),dt=Math.min((now-this.last)/1000,.1);this.last=now;if(!this.active||document.hidden||this.failed)return;if(this.playing&&!this.external)this.phase=(this.phase+dt*this.speed/(this.exercise?.cycleSeconds||4))%1;this.draw()};this.loop();
    }catch(error){this.failed=true;onError(error)}
  }
  mesh(material){const m=new T.Mesh(this.sphere,material);m.castShadow=true;this.root.add(m);return m}
  resize(){if(!this.renderer)return;const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix()}
  setExercise(ex){this.exercise=ex;this.frames=poseFrames(ex.animation);this.phase=0;this.side=0;this.external=false;this.draw()}
  setView(view){this.yaw={front:0,side:Math.PI/2,back:Math.PI,angle:.62}[view]??.62;this.draw()}
  segment(mesh,a,b,r,width=1){const av=new T.Vector3(...a),bv=new T.Vector3(...b);mesh.position.copy(av).add(bv).multiplyScalar(.5);mesh.scale.set(r*width,av.distanceTo(bv)/2+r*.35,r);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),bv.sub(av).normalize())}
  draw(){
    if(this.failed||!this.frames)return;
    const [a,b]=this.frames,t=(1-Math.cos(this.phase*Math.PI*2))/2,p={};for(const k of Object.keys(a))p[k]=a[k].map((v,i)=>v+(b[k][i]-v)*t);
    const mirror=this.side? -1:1;for(const v of Object.values(p))v[0]*=mirror;
    this.root.rotation.y=this.yaw;const groups=this.exercise.groups;
    for(const bone of this.bones){let from=p[bone.start];if(bone.start==='hip')from=[bone.end==='lk'?-.22*mirror:.22*mirror,p.hip[1],p.hip[2]];this.segment(bone.mesh,from,p[bone.end],bone.radius);bone.mesh.material=groups.includes(bone.group)?this.highlight:this.neutral}
    const mid=p.hip.map((v,i)=>v+(p.chest[i]-v)*.5);this.segment(this.abdomen,p.hip,mid,.23,1.12);this.segment(this.torso,mid,p.chest,.29,1.33);this.torso.material=groups.includes('back')?this.highlight:this.neutral;this.abdomen.material=groups.includes('core')?this.highlight:this.dark;
    this.pelvis.position.set(...p.hip);this.pelvis.scale.set(.3,.22,.23);this.pelvis.material=groups.includes('glutes')?this.highlight:this.dark;
    const up=new T.Vector3(...p.head).sub(new T.Vector3(...p.chest)).normalize();const orient=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),up);
    if(['bridge','single-bridge','floor-press','deadbug'].includes(this.exercise.animation))orient.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.PI));
    this.segment(this.neck,p.chest,p.head.map((v,i)=>v-up.getComponent(i)*.18),.105);
    this.head.position.set(...p.head);this.head.scale.set(.19,.255,.2);this.head.quaternion.copy(orient);this.nose.position.copy(this.head.position).add(new T.Vector3(0,-.02,.19).applyQuaternion(orient));this.nose.scale.set(.038,.05,.045);this.nose.quaternion.copy(orient);
    for(let i=0;i<2;i++){const s=p[i?'rs':'ls'];this.delts[i].position.set(...s);this.delts[i].scale.set(.17,.18,.18);this.delts[i].material=groups.includes('shoulders')?this.highlight:this.neutral;this.pecs[i].position.set(...p.chest);this.pecs[i].position.add(new T.Vector3((i?.17:-.17)*mirror,-.06,.2).applyQuaternion(orient));this.pecs[i].scale.set(.17,.18,.085);this.pecs[i].quaternion.copy(orient);this.pecs[i].material=groups.includes('chest')?this.highlight:this.neutral;this.hands[i].position.set(...p[i?'rh':'lh']);this.hands[i].scale.set(.075,.1,.07);this.feet[i].position.set(...p[i?'rf':'lf']);this.feet[i].scale.set(.105,.085,.19)}
    this.kb.visible=this.exercise.equipment==='kettlebell';if(this.kb.visible){const one=['row','floor-press','suitcase'].includes(this.exercise.animation);const hand=one?p.rh:p.lh.map((v,i)=>(v+p.rh[i])/2);this.kb.position.set(...hand)}
    const floorPose=['pushup','knee-pushup','wide-pushup','close-pushup','close-knee','plank','pike','scapular','shoulder-tap','climber','birddog','bridge','single-bridge','floor-press','deadbug','sideplank','prone-w','prone-y','snow-angel'].includes(this.exercise.animation);
    this.camera.position.set(0,floorPose?3.7:2.7,floorPose?6.1:6.8);this.camera.lookAt(0,floorPose?.5:1.3,0);this.renderer.render(this.scene,this.camera);
  }
}
