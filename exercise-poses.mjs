const clone=p=>Object.fromEntries(Object.entries(p).map(([k,v])=>[k,[...v]]));
export const standingPose=()=>({hip:[0,1.42,0],chest:[0,2.12,0],head:[0,2.72,0],ls:[-.318,2.18,0],rs:[.318,2.18,0],le:[-.34,1.81,.07],re:[.34,1.81,.07],lh:[-.34,1.44,.07],rh:[.34,1.44,.07],lk:[-.171,.76,.1],rk:[.171,.76,.1],lf:[-.171,.13,-.13],rf:[.171,.13,-.13]});
// The floor chain rotates around planted ankles; it does not shorten the legs.
function floorPose(degrees=22){const a=degrees*Math.PI/180,s=Math.sin(a),c=Math.cos(a),p=standingPose(),y=.1+1.2939*s-.06675*c,z=-1.72+1.2939*c+.06675*s;p.hip=[0,y,z];p.chest=[0,y+.7*s,z+.7*c];p.head=[0,y+1.2*s,z+1.2*c];p.ls=[-.318,y+.76*s,z+.76*c];p.rs=[.318,y+.76*s,z+.76*c];p.le=[-.34,.47,.20];p.re=[.34,.47,.20];p.lh=[-.318,.1,.20];p.rh=[.318,.1,.20];p.lk=[-.171,.31,-1.08];p.rk=[.171,.31,-1.08];p.lf=[-.171,.1,-1.72];p.rf=[.171,.1,-1.72];return p}
function supine(){return {hip:[0,.23,-.18],chest:[0,.23,.52],head:[0,.23,1.02],ls:[-.318,.2,.58],rs:[.318,.2,.58],le:[-.55,.12,.23],re:[.55,.12,.23],lh:[-.43,.12,-.10],rh:[.43,.12,-.10],lk:[-.171,.72,-.62],rk:[.171,.72,-.62],lf:[-.171,.13,-.98],rf:[.171,.13,-.98]}}
function prone(){const p=floorPose(0);p.hip=[0,.16,-.5];p.chest=[0,.16,.2];p.head=[0,.16,.7];p.lf=[-.171,.15,-1.78];p.rf=[.171,.15,-1.78];p.lk=[-.171,.16,-1.1];p.rk=[.171,.16,-1.1];return p}

export function poseFrames(animation){
 let a=standingPose(),b=clone(a);
 if(['squat','goblet-squat','sumo'].includes(animation)){
  const wide=animation==='sumo'?.53:.29;for(const p of [a,b]){p.lf[0]=-wide;p.rf[0]=wide;p.lh=[-.18,2.05,.38];p.rh=[.18,2.05,.38];p.le=[-.45,1.7,.3];p.re=[.45,1.7,.3]}
  Object.assign(b,{hip:[0,.81,-.43],chest:[0,1.46,-.04],head:[0,2.05,.12],ls:[-.318,1.5,-.02],rs:[.318,1.5,-.02],lk:[-wide,.64,.34],rk:[wide,.64,.34],le:[-.45,1.16,.3],re:[.45,1.16,.3],lh:[-.18,1.49,.4],rh:[.18,1.49,.4]});
  if(animation==='sumo')for(const p of [a,b]){const low=p===a?1.49:.79;p.lh=[-.12,low,.17];p.rh=[.12,low,.17];p.le=[-.24,low+.35,.12];p.re=[.24,low+.35,.12]}
 }else if(['hinge','good-morning','row'].includes(animation)){
  Object.assign(b,{hip:[0,1.26,-.34],chest:[0,1.68,.22],head:[0,2.04,.70],ls:[-.318,1.7,.25],rs:[.318,1.7,.25],lk:[-.171,.68,.18],rk:[.171,.68,.18],le:[-.29,1.33,.28],re:[.29,1.33,.28],lh:[-.12,.98,.30],rh:[.12,.98,.30]});
  if(animation==='good-morning')for(const p of [a,b]){p.lh=[-.14,p.chest[1],p.chest[2]+.18];p.rh=[.14,p.chest[1],p.chest[2]+.18];p.le=[-.43,p.chest[1]-.22,p.chest[2]+.1];p.re=[.43,p.chest[1]-.22,p.chest[2]+.1]}
  if(animation==='row'){a=clone(b);a.lf=[-.25,.13,.35];a.lk=[-.25,.65,.42];a.rf=[.25,.13,-.48];a.rk=[.25,.65,-.25];a.lh=[-.27,1.02,.33];a.le=[-.35,1.36,.32];a.rh=[.33,1.04,.28];a.re=[.35,1.39,.27];b=clone(a);b.rh=[.33,1.48,.18];b.re=[.35,1.78,-.15]}
 }else if(['lunge','split-squat'].includes(animation)){
  if(animation==='split-squat'){a.lf=[-.171,.13,.35];a.rf=[.171,.15,-.50]}
  Object.assign(b,{hip:[0,.93,-.02],chest:[0,1.63,.02],head:[0,2.23,.05],ls:[-.318,1.65,.03],rs:[.318,1.65,.03],le:[-.34,1.30,.05],re:[.34,1.30,.05],lh:[-.34,.93,.07],rh:[.34,.93,.07],lk:[-.171,.65,.43],rk:[.171,.2,-.45],lf:[-.171,.13,.43],rf:[.171,.16,-.85]});
 }else if(animation==='calf'){for(const p of Object.values(b))p[1]+=.09;b.lf[1]=b.rf[1]=.22}
 else if(['pushup','wide-pushup','close-pushup','knee-pushup','close-knee','scapular','plank','pike','shoulder-tap','climber','birddog'].includes(animation)){
  a=floorPose(22);b=floorPose(15.5);
  if(animation.includes('knee'))for(const [i,p] of [a,b].entries()){
   const angle=(i===0?22:15.5)*Math.PI/180,s=Math.sin(angle),c=Math.cos(angle),y=.13+.64*s-.01*c,z=-.96+.64*c+.034*s;
   p.hip=[0,y,z];p.chest=[0,y+.7*s,z+.7*c];p.head=[0,y+1.2*s,z+1.2*c];p.ls=[-.318,y+.76*s,z+.76*c];p.rs=[.318,y+.76*s,z+.76*c];
   p.lk=[-.171,.13,-.92];p.rk=[.171,.13,-.92];p.lf=[-.171,.32,-1.58];p.rf=[.171,.32,-1.58];
  }
  if(animation==='wide-pushup')for(const p of [a,b]){p.lh[0]=-.49;p.rh[0]=.49}
  if(animation.includes('close'))for(const p of [a,b]){p.lh[0]=-.23;p.rh[0]=.23}
  a.le=[a.lh[0]-.10,.38,.10];a.re=[a.rh[0]+.10,.38,.10];
  b.le=[a.lh[0]-.10,.18,.10];b.re=[a.rh[0]+.10,.18,.10];
  if(animation==='scapular'){b=floorPose(21.3);for(const p of [a,b]){p.le=p.ls.map((v,i)=>(v+p.lh[i])/2);p.re=p.rs.map((v,i)=>(v+p.rh[i])/2)}}
  if(animation==='plank'){a=floorPose(12);a.le=[-.318,.12,.30];a.re=[.318,.12,.30];a.lh=[-.318,.12,.65];a.rh=[.318,.12,.65];b=clone(a)}
  if(animation==='pike'){a=standingPose();Object.assign(a,{hip:[0,1.26,-.45],chest:[0,.80,.18],head:[0,.49,.60],ls:[-.318,.84,.18],rs:[.318,.84,.18],le:[-.35,.46,.18],re:[.35,.46,.18],lh:[-.318,.1,.18],rh:[.318,.1,.18],lk:[-.171,.66,-.79],rk:[.171,.66,-.79],lf:[-.171,.1,-1.10],rf:[.171,.1,-1.10]});b=clone(a);b.hip=[0,1.18,-.45];b.chest=[0,.58,.12];b.head=[0,.20,.49];b.le=[-.44,.27,.05];b.re=[.44,.27,.05]}
  if(animation==='shoulder-tap'){b=clone(a);b.rh=[-.28,.77,.24];b.re=[.13,.70,.45]}
  if(animation==='climber'){b=clone(a);b.rk=[.171,.06,0];b.rf=[.171,.13,-.95]}
  if(animation==='birddog'){a=floorPose(0);Object.assign(a,{hip:[0,.79,-.5],chest:[0,.79,.2],head:[0,.79,.7],lh:[-.318,.1,.26],rh:[.318,.1,.26],le:[-.33,.46,.26],re:[.33,.46,.26],lk:[-.171,.14,-.47],rk:[.171,.14,-.47],lf:[-.171,.13,-1.15],rf:[.171,.13,-1.15]});b=clone(a);b.rh=[.318,.825,.99];b.re=[.318,.83,.64];b.lk=[-.171,.79,-1.10];b.lf=[-.171,.79,-1.79]}
 }else if(['prone-w','prone-y','snow-angel','back-extension'].includes(animation)){
  a=prone();a.le=[-.65,.18,.27];a.re=[.65,.18,.27];a.lh=[-.65,.18,.61];a.rh=[.65,.18,.61];
  if(animation==='prone-y'){a.le=[-.56,.18,.55];a.re=[.56,.18,.55];a.lh=[-.795,.18,.826];a.rh=[.795,.18,.826]}
  if(animation==='snow-angel'){a.le=[-.41,.20,-.10];a.re=[.41,.20,-.10];a.lh=[-.495,.20,-.458];a.rh=[.495,.20,-.458]}
  b=clone(a);for(const k of ['le','re','lh','rh'])b[k][1]+=.10;
  if(animation==='snow-angel'){b.le=[-.56,.26,.55];b.re=[.56,.26,.55];b.lh=[-.795,.26,.826];b.rh=[.795,.26,.826]}
  if(animation==='back-extension'){a.lh=[-.40,.16,-.10];a.rh=[.40,.16,-.10];a.le=[-.46,.16,.23];a.re=[.46,.16,.23];b=clone(a);b.chest[1]+=.06;b.head[1]+=.10;for(const k of ['le','re','lh','rh'])b[k][1]+=.04}
 }else if(['bridge','single-bridge','floor-press','deadbug'].includes(animation)){
  a=supine();b=clone(a);
  if(animation.includes('bridge')){b.hip[1]=.62;b.chest[1]=.32;if(animation==='single-bridge'){a.rk=[.171,.45,-.75];a.rf=[.171,.65,-1.30];b.rk=[.171,.82,-.75];b.rf=[.171,1.0,-1.30]}}
  if(animation==='floor-press'){a.re=[.65,.12,.52];a.rh=[.65,.49,.52];b=clone(a);b.re=[.45,.56,.50];b.rh=[.318,.93,.58]}
  if(animation==='deadbug'){a.le=[-.318,.56,.58];a.re=[.318,.56,.58];a.lh=[-.318,.93,.58];a.rh=[.318,.93,.58];a.lk=[-.171,.89,-.147];a.rk=[.171,.89,-.147];a.lf=[-.171,.89,-.83];a.rf=[.171,.89,-.83];b=clone(a);b.rh=[.318,.25,1.30];b.re=[.318,.25,.95];b.lk=[-.171,.17,-.78];b.lf=[-.171,.13,-1.45]}
 }else if(animation==='sideplank'){
  a={hip:[0,.47,-.42],chest:[0,.59,.27],head:[0,.69,.86],ls:[0,.25,.34],rs:[0,.84,.34],le:[0,.12,.35],re:[0,1.19,.34],lh:[-.35,.12,.35],rh:[0,1.56,.34],lk:[0,.27,-1.03],rk:[0,.30,-1.03],lf:[-.1,.13,-1.70],rf:[.10,.16,-1.60]};b=clone(a);
 }else if(animation==='curl'){a.lh=[-.13,1.48,.23];a.rh=[.13,1.48,.23];a.le=[-.30,1.83,.10];a.re=[.30,1.83,.10];b=clone(a);b.lh=[-.13,2.09,.30];b.rh=[.13,2.09,.30]}
 else if(animation==='band-w'){for(const p of [a,b]){p.le=[-.31,1.83,.03];p.re=[.31,1.83,.03]}a.lh=[-.11,1.83,.32];a.rh=[.11,1.83,.32];b.lh=[-.21,1.83,.34];b.rh=[.21,1.83,.34]}
 else if(animation==='band-curl'){a.lh=[-.06,1.54,.20];a.rh=[.14,1.54,.26];a.re=[.31,1.83,.06];b=clone(a);b.rh=[.14,1.93,.30]}
 else if(animation==='band-triceps'){a.lh=[.08,1.98,.18];a.rh=[.16,1.76,.23];a.re=[.31,1.90,.07];b=clone(a);b.rh=[.21,1.45,.20]}
 else if(['march','step-jack','punch','side-step','knee-lift'].includes(animation)){
  if(animation==='march'||animation==='knee-lift'){b.rk=[.171,1.04,.40];b.rf=[.171,.61,.14];b.lh=[-.30,1.95,.22];b.le=[-.39,1.77,.13]}
  if(animation==='knee-lift'){b.rk=[.171,1.28,.50];b.rf=[.171,.83,.15]}
  if(animation==='step-jack'){b.rf=[.44,.13,-.13];b.rh=[.984,2.491,.06];b.re=[.65,2.34,.15];b.lh=[-.984,2.491,.06];b.le=[-.65,2.34,.15]}
  if(animation==='punch'){a.lh=[-.23,2.09,.30];a.rh=[.23,2.09,.30];a.le=[-.42,1.83,.12];a.re=[.42,1.83,.12];b=clone(a);b.rh=[.29,2.13,.71];b.re=[.31,2.17,.35]}
  if(animation==='side-step'){b.hip[0]=.18;b.chest[0]=.18;b.head[0]=.18;b.rf=[.43,.13,-.13];b.lf=[.04,.13,-.13]}
 }
 return [a,b];
}
export function samplePose(animation,progress){const [a,b]=poseFrames(animation),t=Math.max(0,Math.min(1,progress)),p=Object.fromEntries(Object.keys(a).map(k=>[k,a[k].map((v,i)=>v+(b[k][i]-v)*t)]));if(animation==='snow-angel'){const angle=2.9-(2.2*t);for(const side of [-1,1]){const s=side<0?'l':'r';p[s+'h']=[side*(.318+.735*Math.sin(angle)),.20+.06*t,.26+.735*Math.cos(angle)];p[s+'e']=[side*(.318+.37*Math.sin(angle)),.23+.04*t,.26+.37*Math.cos(angle)]}}if(animation==='step-jack'){const angle=t*115*Math.PI/180;for(const side of [-1,1]){const s=side<0?'l':'r';p[s+'h']=[side*(.318+.735*Math.sin(angle)),2.18-.735*Math.cos(angle),.06];p[s+'e']=[side*(.318+.36*Math.sin(angle)),2.18-.36*Math.cos(angle),.15]}}return p}
