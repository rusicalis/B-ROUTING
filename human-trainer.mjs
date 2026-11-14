import * as T from './vendor/three.module.min.js';
import {addTrainerStyle} from './trainer-style.mjs';
const v=p=>new T.Vector3(...p);
const supineMotions=new Set(['bridge','single-bridge','floor-press','deadbug']);
const plantedHands=new Set(['pushup','wide-pushup','close-pushup','knee-pushup','close-knee','scapular','pike','plank','shoulder-tap','climber','birddog']);

// Pose a real skinned human. Bone translations/scales and mesh topology stay intact.
export class HumanTrainer{
  constructor(model){
    this.model=model;model.scale.setScalar(1.5);model.updateMatrixWorld(true);
    this.bones=new Map();this.reference=new Map();this.meshes=[];
    model.traverse(o=>{if(o.isBone)this.bones.set(o.name,o);if(o.isSkinnedMesh){o.frustumCulled=false;o.castShadow=true;this.meshes.push(o)}});
    for(const [name,bone]of this.bones){const child=bone.children.find(c=>c.isBone);this.reference.set(name,{local:bone.quaternion.clone(),position:bone.getWorldPosition(new T.Vector3()),quaternion:bone.getWorldQuaternion(new T.Quaternion()),direction:child?child.getWorldPosition(new T.Vector3()).sub(bone.getWorldPosition(new T.Vector3())).normalize():null})}
    this.segments=[['upperarm_l','lowerarm_l','hand_l'],['upperarm_r','lowerarm_r','hand_r'],['thigh_l','calf_l','foot_l'],['thigh_r','calf_r','foot_r']];
    this.lengths=this.segments.map(([a,b,c])=>[this.pos(a).distanceTo(this.pos(b)),this.pos(b).distanceTo(this.pos(c))]);
    this.hingeReference=new Map();for(const [a,b,c]of this.segments){const axis=this.pos(c).sub(this.pos(a)).normalize(),bend=this.pos(b).sub(this.pos(a));bend.addScaledVector(axis,-bend.dot(axis));const normal=axis.cross(bend).normalize();this.hingeReference.set(a,normal);this.hingeReference.set(b,normal)}
    this.fingerAxes=new Map();
    this.handReference=new Map();
    for(const side of ['l','r']){const along=this.pos('middle_01_'+side).sub(this.pos('hand_'+side)).normalize(),across=this.pos('index_01_'+side).sub(this.pos('pinky_01_'+side)).normalize(),normal=along.clone().cross(across).multiplyScalar(side==='l'?1:-1).normalize();this.handReference.set(side,{along:along.clone(),normal:normal.clone()});
      for(const finger of ['index','middle','ring','pinky','thumb'])for(let i=1;i<=3;i++){const name=finger+'_0'+i+'_'+side,bone=this.bones.get(name),child=bone.children.find(c=>c.isBone);const dir=child.getWorldPosition(new T.Vector3()).sub(this.pos(name)).normalize();this.fingerAxes.set(name,dir.cross(normal).normalize().applyQuaternion(bone.getWorldQuaternion(new T.Quaternion()).invert()))}
    }
    this.styleModel();
    this.accessories=addTrainerStyle(model,this.bones);
  }
  pos(name){return this.bones.get(name).getWorldPosition(new T.Vector3())}
  styleModel(){
    const skin=new T.Color('#c99578'),shirt=new T.Color('#26695f'),shorts=new T.Color('#18343c'),shoes=new T.Color('#d6e3e3'),brow=new T.Color('#352b27');
    for(const mesh of this.meshes){const attr=mesh.geometry.attributes.position,colors=new Float32Array(attr.count*3);
      for(let i=0;i<attr.count;i++){const x=attr.getX(i),y=attr.getY(i),z=attr.getZ(i);let color=skin;
        if(mesh.name==='Eyebrows')color=brow;
        else if(mesh.name==='Eyes'){const pupil=Math.abs(Math.abs(x)-.030)<.007&&Math.abs(y-1.699)<.009&&z>.074;color=new T.Color(pupil?'#342d27':'#eee9df')}
        else if(y<.115)color=shoes;
        else if(y>.65&&y<1.07)color=shorts;
        else if(y>=1.07&&y<1.50&&Math.abs(x)<.265)color=shirt;
        color.toArray(colors,i*3);
      }
      mesh.geometry.setAttribute('color',new T.BufferAttribute(colors,3));mesh.material=new T.MeshStandardMaterial({vertexColors:true,roughness:.78,metalness:0,side:T.FrontSide});
    }
  }
  worldQuaternion(name,q){const bone=this.bones.get(name);bone.quaternion.copy(bone.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q));bone.updateWorldMatrix(false,true)}
  aim(name,direction){const ref=this.reference.get(name);this.worldQuaternion(name,new T.Quaternion().setFromUnitVectors(ref.direction,direction.clone().normalize()).multiply(ref.quaternion))}
  aimInPlane(name,direction,normal){
    const ref=this.reference.get(name),fromY=ref.direction.clone(),fromX=this.hingeReference.get(name).clone();fromX.addScaledVector(fromY,-fromX.dot(fromY)).normalize();
    const toY=direction.clone().normalize(),toX=normal.clone();toX.addScaledVector(toY,-toX.dot(toY)).normalize();
    const from=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(fromX,fromY,fromX.clone().cross(fromY))),to=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(toX,toY,toX.clone().cross(toY)));
    this.worldQuaternion(name,to.multiply(from.invert()).multiply(ref.quaternion));
  }
  solve(index,target,pole){
    const [a,b,c]=this.segments[index],[upper,lower]=this.lengths[index],start=this.pos(a),toward=target.clone().sub(start),distance=T.MathUtils.clamp(toward.length(),Math.abs(upper-lower)+.005,upper+lower-.003),axis=toward.normalize();
    let bend=index>=2?this.bodyFront.clone().addScaledVector(this.bodyRight,index===2?.12:-.12):pole.clone().sub(start).addScaledVector(this.bodyRight,index===0?.035:-.035);bend.addScaledVector(axis,-bend.dot(axis));if(bend.lengthSq()<.00001)bend=new T.Vector3(0,0,1).addScaledVector(axis,-axis.z);bend.normalize();
    const adjacent=(upper*upper+distance*distance-lower*lower)/(2*distance),height=Math.sqrt(Math.max(0,upper*upper-adjacent*adjacent));
    const elbow=start.clone().addScaledVector(axis,adjacent).addScaledVector(bend,height),goal=start.clone().addScaledVector(axis,distance);
    const normal=axis.clone().cross(bend).normalize();this.aimInPlane(a,elbow.clone().sub(start),normal);this.aimInPlane(b,goal.sub(this.pos(b)),normal);
  }
  orientHand(side,along,normal){const ref=this.handReference.get(side),basis=(y,z)=>{y=y.clone().normalize();z=z.clone().addScaledVector(y,-z.dot(y)).normalize();return new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(y.clone().cross(z),y,z))};this.worldQuaternion('hand_'+side,basis(along,normal).multiply(basis(ref.along,ref.normal).invert()).multiply(this.reference.get('hand_'+side).quaternion))}
  tiltHead(angle){const neck=this.bones.get('neck_01');neck.quaternion.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),T.MathUtils.clamp(angle,-.12,.12)));neck.updateWorldMatrix(false,true)}
  grip(side,closed){for(const finger of ['index','middle','ring','pinky','thumb'])for(let i=1;i<=3;i++){const id=finger+'_0'+i+'_'+side,bone=this.bones.get(id);bone.quaternion.copy(this.reference.get(id).local);if(closed)bone.quaternion.multiply(new T.Quaternion().setFromAxisAngle(this.fingerAxes.get(id),(finger==='thumb'?.3:.8)*(i===1?.8:1)))}this.model.updateMatrixWorld(true)}
  applyPose(points,animation,kettlebell=false,side=0){
    const p=Object.fromEntries(Object.entries(points).map(([name,point])=>[name,[...point]]));
    if(side){for(const pair of [['ls','rs'],['le','re'],['lh','rh'],['lk','rk'],['lf','rf']])[p[pair[0]],p[pair[1]]]=[p[pair[1]],p[pair[0]]];for(const point of Object.values(p))point[0]*=-1}
    if(supineMotions.has(animation))for(const point of Object.values(p))point[0]*=-1;
    for(const [name,bone]of this.bones)bone.quaternion.copy(this.reference.get(name).local);
    this.model.updateMatrixWorld(true);
    const up=v(p.chest).sub(v(p.hip)).normalize(),right=v(p.rs).sub(v(p.ls)).normalize(),front=right.clone().cross(up).normalize();right.copy(up).cross(front).normalize();
    const frame=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(right,up,front));
    this.bodyFront=front.clone();this.bodyRight=right.clone();
    const pelvis=this.bones.get('pelvis');pelvis.position.copy(pelvis.parent.worldToLocal(v(p.hip)));pelvis.updateWorldMatrix(false,true);
    for(const name of ['pelvis','spine_01','spine_02','spine_03','neck_01','Head','clavicle_l','clavicle_r'])this.worldQuaternion(name,frame.clone().multiply(this.reference.get(name).quaternion));
    this.solve(0,v(p.rh),v(p.re));this.solve(1,v(p.lh),v(p.le));
    const squat=['squat','goblet-squat','sumo'].includes(animation);
    this.solve(2,v(p.rf),squat?this.pos('thigh_l').add(new T.Vector3(.18,-.5,1)):v(p.rk));this.solve(3,v(p.lf),squat?this.pos('thigh_r').add(new T.Vector3(-.18,-.5,1)):v(p.lk));
    for(const suffix of ['l','r']){
      const hand='hand_'+suffix,forearm='lowerarm_'+suffix;
      const planted=plantedHands.has(animation)&&!(animation==='shoulder-tap'&&suffix===(side?'r':'l'));
      const desired=planted?new T.Vector3(0,0,1):this.pos(hand).sub(this.pos(forearm)).normalize();
      let palm=planted?new T.Vector3(0,-1,0):right.clone().multiplyScalar(suffix==='l'?-.8:.8).addScaledVector(front,.6);
      if(animation==='shoulder-tap'&&!planted){desired.copy(right).multiplyScalar(suffix==='l'?-1:1);palm=front.clone().negate()}
      this.orientHand(suffix,desired,palm);
      const footFrame=squat?new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),(suffix==='l'?1:-1)*(animation==='sumo'?.35:.18)):(supineMotions.has(animation)||!plantedHands.has(animation)?new T.Quaternion():frame.clone());
      // Feet use their own support angle; following the prone torso drives toes below the floor.
      if(['pushup','wide-pushup','close-pushup','scapular','plank','pike','shoulder-tap','climber'].includes(animation))footFrame.setFromAxisAngle(new T.Vector3(1,0,0),-.14);
      if(['birddog','prone-w','prone-y','snow-angel','back-extension'].includes(animation))footFrame.setFromAxisAngle(new T.Vector3(1,0,0),2.18);
      if(animation==='calf')footFrame.setFromAxisAngle(new T.Vector3(1,0,0),Math.max(0,Math.min(1,((p.lf[1]+p.rf[1])/2-.13)/.09))*.48);
      this.worldQuaternion('foot_'+suffix,footFrame.multiply(this.reference.get('foot_'+suffix).quaternion));
      if(animation==='calf')this.worldQuaternion('ball_'+suffix,this.reference.get('ball_'+suffix).quaternion.clone());
      this.grip(suffix,kettlebell&&(!['row','floor-press','suitcase'].includes(animation)||suffix===(side?'r':'l')));
    }
    this.model.updateMatrixWorld(true);for(const mesh of this.meshes)mesh.skeleton.update();
  }
  segmentLengths(){return Object.fromEntries(this.segments.flatMap(([a,b,c])=>[[a,this.pos(a).distanceTo(this.pos(b))],[b,this.pos(b).distanceTo(this.pos(c))]]))}
  handPosition(side='l'){return this.pos('hand_'+side)}
}
