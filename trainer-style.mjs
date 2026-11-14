import * as T from './vendor/three.module.min.js';

function surface(rows,columns,point){
  const positions=[],indices=[];
  for(let row=0;row<=rows;row++)for(let col=0;col<=columns;col++)positions.push(...point(row/rows,col/columns));
  for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){const a=row*(columns+1)+col,b=a+columns+1;indices.push(a,b,a+1,a+1,b,b+1)}
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}
function lock(points,width,material){
  const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
  const geometry=surface(18,8,(t,u)=>{
    const p=curve.getPoint(t),tangent=curve.getTangent(t).normalize();
    const normal=new T.Vector3(0,0,1);normal.addScaledVector(tangent,-normal.dot(tangent)).normalize();
    const across=tangent.clone().cross(normal).normalize(),taper=.2+.8*Math.sin(Math.PI*(.08+.84*t));
    return p.addScaledVector(across,Math.cos(u*Math.PI*2)*width*taper).addScaledVector(normal,Math.sin(u*Math.PI*2)*.009*taper).toArray();
  });return new T.Mesh(geometry,material);
}
function tube(points,radius,material){return new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),28,radius,6,false),material)}

// Accessories are authored in the reference model coordinates, then attached rigidly to Head.
export function addTrainerStyle(model,bones){
  const hair=new T.Group();hair.name='TrainerHair';hair.position.set(0,1.70,-.015);
  const brown=new T.MeshStandardMaterial({color:'#ffffff',vertexColors:true,roughness:.75,side:T.DoubleSide});
  const cap=surface(28,64,(t,u)=>{const phi=u*Math.PI*2,front=Math.max(0,Math.sin(phi)),theta=t*(1.98-front*(.65+.30*Math.cos(phi))),groove=.0018*Math.sin(phi*11+theta*2.6);return [(.106+groove)*Math.sin(theta)*Math.cos(phi)+.008*(1-t)*(1-t),.140*Math.cos(theta)+groove*.35,(.113+groove)*Math.sin(theta)*Math.sin(phi)]});
  const colors=[];for(let row=0;row<=28;row++)for(let col=0;col<=64;col++){const t=row/28,phi=col/64*Math.PI*2,shade=.35+.15*Math.sin(phi*11+t*3);new T.Color('#3d291e').lerp(new T.Color('#75523b'),shade).toArray(colors,colors.length)}cap.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  hair.add(new T.Mesh(cap,brown));
  const fringe=new T.MeshStandardMaterial({color:'#62432f',roughness:.78,side:T.DoubleSide});
  hair.add(lock([[.068,.112,.018],[.035,.119,.082],[-.020,.073,.126],[-.076,.018,.111]],.026,fringe));
  hair.add(lock([[.043,.129,-.006],[.007,.132,.066],[-.052,.089,.109],[-.092,.038,.083]],.021,new T.MeshStandardMaterial({color:'#513728',roughness:.8,side:T.DoubleSide})));
  hair.add(lock([[.083,.101,.012],[.064,.104,.072],[.024,.064,.120],[-.010,.025,.121]],.022,new T.MeshStandardMaterial({color:'#6c4b34',roughness:.8,side:T.DoubleSide})));
  const glasses=new T.Group();glasses.name='TrainerGlasses';glasses.position.set(0,1.699,.111);
  const frame=new T.MeshStandardMaterial({color:'#2c3437',roughness:.45,metalness:.2});
  for(const sign of [-1,1]){
    const points=Array.from({length:49},(_,i)=>{const angle=i/48*Math.PI*2;return [sign*.037+Math.cos(angle)*.030,Math.sin(angle)*.032,.003-Math.abs(Math.cos(angle))*.004]});
    glasses.add(tube(points,.0031,frame));
    glasses.add(tube([[sign*.066,.007,-.001],[sign*.087,.006,-.027],[sign*.098,-.004,-.070],[sign*.095,-.017,-.085]],.0025,frame));
    const shape=new T.Shape();shape.absellipse(sign*.037,0,.028,.030,0,Math.PI*2,false,0);
    const lens=new T.Mesh(new T.ShapeGeometry(shape,28),new T.MeshStandardMaterial({color:'#b7d7df',transparent:true,opacity:.055,roughness:.15,depthWrite:false,side:T.DoubleSide}));lens.position.z=-.001;glasses.add(lens);
  }
  glasses.add(tube([[-.008,.010,.003],[0,.014,.012],[.008,.010,.003]],.0024,frame));
  for(const group of [hair,glasses]){model.add(group);model.updateMatrixWorld(true);bones.get('Head').attach(group)}
  return {hair,glasses};
}
