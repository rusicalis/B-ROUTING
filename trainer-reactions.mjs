import * as T from './vendor/three.module.min.js';
const clamp=n=>Math.max(0,Math.min(1,Number(n)||0));
export function trainerReaction(context={}){
  const phase=context.phase||'ready',progress=clamp(context.completedSets/Math.max(1,context.totalSets||1)),fatigue=clamp(Math.max((context.activeSeconds||0)/1200,progress*.85));
  let kind='preview';
  if(phase==='work')kind='exercise';
  else if(phase==='rest'){const t=context.restElapsed||0;kind=t<3?'breathe':t<6?'wipe':t<9?'encourage':'recover'}
  else if(phase==='paused')kind='breathe';
  else if(['done','feedback'].includes(phase))kind='celebrate';
  const takesOverPose=['breathe','wipe','encourage','recover','celebrate'].includes(kind);
  const speech={breathe:'후— 천천히 호흡해요.',wipe:'땀 닦고, 숨 고르고!',encourage:'한 세트 더, 할 수 있어요!',recover:fatigue>.6?'힘들지만, 조금만 더!':'호흡이 돌아오면 다시 시작해요.',celebrate:'해냈어요! 오늘 운동 완료.'}[kind]||'';
  return {kind,fatigue,takesOverPose,speech,effort:kind==='preview'?0:kind==='celebrate'?.12:.15+fatigue*.8,smile:['encourage','celebrate'].includes(kind)?.85:0,sweatCount:fatigue<.18?0:Math.min(6,1+Math.floor((fatigue-.18)*7))};
}
export function reactionPose(base,kind,time=0,fatigue=0){
  const p=Object.fromEntries(Object.entries(base).map(([k,a])=>[k,[...a]]));
  p.le=[-.61,1.75,.06];p.re=[.61,1.75,.06];p.lh=[-.34,1.49,.12];p.rh=[.34,1.49,.12];
  if(kind==='wipe'){p.rh=[.06+.12*Math.sin((time-3)*3.3),2.57,.23];p.re=[.61,2.15,.20]}
  if(kind==='encourage'){p.rh=[.40,2.31+.04*Math.sin(time*5),.23];p.re=[.60,1.91,.15]}
  if(kind==='celebrate'){p.lh=[-.53,2.54,.12];p.rh=[.53,2.54,.12];p.le=[-.70,2.12,.08];p.re=[.70,2.12,.08]}
  if(kind==='recover'&&fatigue>.45){p.hip=[0,1.32,-.10];p.chest=[0,1.97,.22];p.head=[0,2.55,.32];p.lh=[-.29,1.05,.36];p.rh=[.29,1.05,.36];p.le=[-.46,1.50,.27];p.re=[.46,1.50,.27]}
  return p;
}

// Small GPU morph targets keep facial expressions attached to the skinned face.
export class TrainerExpressions{
  constructor(model,bones){
    this.faces=[];
    model.traverse(mesh=>{
      if(!mesh.isSkinnedMesh)return;const position=mesh.geometry.attributes.position,targets=Array.from({length:4},()=>new Float32Array(position.count*3));
      for(let i=0;i<position.count;i++){
        const x=position.getX(i),y=position.getY(i),z=position.getZ(i),front=z>.045;
        if(mesh.name==='Eyebrows'){targets[0][i*3+1]=-.006*(1-Math.min(1,Math.abs(x)/.06));targets[1][i*3+1]=.003;}
        else if(mesh.name==='Eyes'){const upper=Math.max(0,y-1.699);targets[0][i*3+1]=-upper*.28;targets[1][i*3+1]=-upper*.15;targets[3][i*3+1]=(1.699-y)*.9;}
        else if(front){
          if(Math.abs(x)<.04&&Math.abs(y-1.647)<.021){const mouth=Math.exp(-Math.pow((y-1.647)/.012,2)-Math.pow(x/.04,2));targets[0][i*3+1]=(y<1.647?-.006:.001)*mouth;targets[1][i*3+1]=.005*Math.exp(-Math.pow((Math.abs(x)-.023)/.015,2)-Math.pow((y-1.647)/.012,2))}
          if(y>1.15&&y<1.47&&Math.abs(x)<.22)targets[2][i*3+2]=.006*Math.sin((y-1.15)/.32*Math.PI);
          if(Math.abs(Math.abs(x)-.030)<.021&&Math.abs(y-1.699)<.017)targets[3][i*3+1]=(1.699-y)*.7;
        }
      }
      mesh.geometry.morphTargetsRelative=true;mesh.geometry.morphAttributes.position=targets.map(a=>new T.BufferAttribute(a,3));mesh.updateMorphTargets();this.faces.push(mesh);
    });
    this.sweat=new T.Group();this.sweat.name='TrainerSweat';this.sweat.position.set(0,1.72,.074);this.drops=[];
    const geometry=new T.SphereGeometry(1,10,8),material=new T.MeshStandardMaterial({color:'#8cddea',transparent:true,opacity:.85,roughness:.15,metalness:.05});
    for(let i=0;i<6;i++){const drop=new T.Mesh(geometry,material);drop.scale.set(.0045,.009,.003);this.sweat.add(drop);this.drops.push(drop)}
    model.add(this.sweat);model.updateMatrixWorld(true);bones.get('Head').attach(this.sweat);this.sweat.visible=false;
  }
  update(state,time,reduceMotion=false){
    const blink=reduceMotion?0:Math.max(0,1-Math.abs((time%4.6)-4.35)/.12),breath=(.5+.5*Math.sin(time*(1.8+state.fatigue)))*state.fatigue;
    for(const mesh of this.faces){mesh.morphTargetInfluences[0]=state.effort;mesh.morphTargetInfluences[1]=state.smile;mesh.morphTargetInfluences[2]=breath;mesh.morphTargetInfluences[3]=blink;}
    this.sweat.visible=state.sweatCount>0;
    this.drops.forEach((drop,i)=>{drop.visible=i<state.sweatCount;const travel=reduceMotion?.3:(time*.23+i*.19)%1;drop.position.set((i%2?1:-1)*(.071+(i%3)*.003),.028-travel*.055,-(i%3)*.008);drop.scale.y=.006+travel*.006;if(state.kind==='wipe')drop.visible=drop.visible&&i>1});
  }
}
