// A continuous implicit body surface, weighted to a shared FK/IK rig.
const STYLE = {
  wood:{coat:0x855332,skin:0xd6a270,hair:0x513124,trim:0xe1b783,pants:0x655349,shoe:0x513c31,grain:.075},
  clay:{coat:0xa84c2f,skin:0xdc9b72,hair:0x593528,trim:0xe9b783,pants:0x665349,shoe:0x594236,grain:.023}
};
const P = [
  [0,.93,0], [0,1.29,0], [0,1.60,0],
  [-.243,1.415,0],[-.421,1.15,0],[-.526,.895,.018],
  [.243,1.415,0],[.421,1.15,0],[.526,.895,.018],
  [-.125,.92,0],[-.151,.53,.016],[-.175,.13,.022],
  [.125,.92,0],[.151,.53,.016],[.175,.13,.022]
].map(x=>V(...x));
const END = [[0,1.5,0],[0,1.65,0],[0,1.82,0],P[4],P[5],[-.565,.80,.018],P[7],P[8],[.565,.80,.018],P[10],P[11],[-.175,.09,.185],P[13],P[14],[.175,.09,.185]]
  .map(p=>Array.isArray(p)?V(...p):p);
const TETS=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]];
const CORNERS=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]];
function smin(a,b,k) {
  const h=Math.max(k-Math.abs(a-b),0)/k;
  return Math.min(a,b)-h*h*k*.25;
}
function ellipse(x,y,z,rx,ry,rz){
  const a=Math.hypot(x/rx,y/ry,z/rz), b=Math.hypot(x/(rx*rx),y/(ry*ry),z/(rz*rz));
  return b>1e-8?a*(a-1)/b:-Math.min(rx,ry,rz);
}
function capsule(x,y,z,a,b,r0,r1){
  const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z;
  const px=x-a.x,py=y-a.y,pz=z-a.z;
  const t=clamp((px*dx+py*dy+pz*dz)/(dx*dx+dy*dy+dz*dz));
  return Math.hypot(px-dx*t,py-dy*t,pz-dz*t)-mix(r0,r1,t);
}
function surface(field,min,max,step) {
  const [nx,ny,nz]=max.map((v,i)=>Math.ceil((v-min[i])/step)+1);
  const at=(x,y,z)=>x+nx*(y+ny*z);
  const points=[],values=new Float32Array(nx*ny*nz);
  for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
    const p=[min[0]+x*step,min[1]+y*step,min[2]+z*step],i=at(x,y,z);
    points[i]=p;values[i]=field(...p);
  }
  const vertices=[],indices=[],edges=new Map();
  function crossing(i,j){
    const key=Math.min(i,j)+':'+Math.max(i,j);
    if(edges.has(key))return edges.get(key);
    const t=values[i]/(values[i]-values[j]);
    const position=points[i].map((v,k)=>mix(v,points[j][k],t));
    const n=vertices.length/3;vertices.push(...position);edges.set(key,n);return n;
  }
  function triangle(a,b,c,inside){
    const point=i=>V(vertices[i*3],vertices[i*3+1],vertices[i*3+2]);
    const q=point(a),normal=point(b).sub(q).cross(point(c).sub(q));
    const inward=V(...points[inside]).sub(q);
    indices.push(a,...(normal.dot(inward)>0?[c,b]:[b,c]));
  }
  for(let z=0;z<nz-1;z++)for(let y=0;y<ny-1;y++)for(let x=0;x<nx-1;x++){
    const cell=CORNERS.map(([i,j,k])=>at(x+i,y+j,z+k));
    const count=cell.filter(i=>values[i]<0).length;
    if(!count||count===8)continue;
    for(const tet of TETS){
      const ids=tet.map(i=>cell[i]),negative=ids.filter(i=>values[i]<0),positive=ids.filter(i=>values[i]>=0);
      if(!negative.length||!positive.length)continue;
      if(negative.length===2){
        const [a,b]=negative,[c,d]=positive;
        const ac=crossing(a,c),ad=crossing(a,d),bc=crossing(b,c),bd=crossing(b,d);
        triangle(ac,ad,bc,a);triangle(ad,bd,bc,b);
      }else{
        const lone=negative.length===1?negative[0]:positive[0];
        const rest=negative.length===1?positive:negative;
        triangle(...rest.map(i=>crossing(lone,i)),negative[0]);
      }
    }
  }
  const g=new T.BufferGeometry();
  g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();
  return g;
}
const fingers=[V(.556,.829,.018),V(.570,.768,.035),V(.532,.850,.080),V(.553,.796,.093)];
const neck=[V(0,1.446,0),V(0,1.68,0)];
function bodyField(x,y,z){
  let d=Math.min(ellipse(x,y-1.225,z,.265,.319,.155),ellipse(x,y-.985,z,.235,.235,.145));
  d=smin(d,capsule(x,y,z,...neck,.105,.089),.086);
  for(const side of [-1,1]){
    const arm=side<0?3:6,leg=side<0?9:12;
    let armField=smin(capsule(x,y,z,P[arm],P[arm+1],.100,.080),capsule(x,y,z,P[arm+1],P[arm+2],.081,.056),.060);
    const palm=ellipse(x-side*.548,y-.861,z-.025,.066,.109,.051);
    armField=smin(armField,palm,.048);
    armField=smin(armField,capsule(Math.abs(x),y,z,fingers[0],fingers[1],.042,.031),.035);
    armField=smin(armField,capsule(Math.abs(x),y,z,fingers[2],fingers[3],.034,.023),.035);
    d=smin(d,armField,.105);
    const upper=capsule(x,y,z,P[leg],P[leg+1],.126,.090);
    const lower=capsule(x,y,z,P[leg+1],P[leg+2],.091,.065);
    const foot=ellipse(x-side*.175,y-.083,z-.077,.090,.076,.153);
    d=smin(d,smin(smin(upper,lower,.057),foot,.059),.106);
  }
  return d;
}
function colorGeometry(g,style,scheme) {
  const pos=g.getAttribute('position'),colors=[];
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
    const c=new T.Color(scheme(x,y,z)).convertSRGBToLinear();
    const grain=Math.sin(y*(style.grain>.05?64:105)+2*Math.sin(x*13)+z*29)*.52+Math.sin(x*121+y*19+z*69)*.24;
    c.multiplyScalar(1+style.grain*grain);
    colors.push(c.r,c.g,c.b);
  }
  g.setAttribute('color',new T.Float32BufferAttribute(colors,3));
}
function bodyGeometry(style){
  const g=surface(bodyField,[-.73,-.025,-.23],[.73,1.79,.28],.020);
  colorGeometry(g,style,(x,y)=>{
    if((Math.abs(x)>.489&&y<.985&&y>.72)||y>1.505)return style.skin;
    if(y<.22)return style.shoe;
    if(y<.83)return style.pants;
    return style.coat;
  });
  const indices=[],weights=[],pos=g.getAttribute('position');
  function add(...pairs) {
    for(let i=0;i<4;i++){indices.push(pairs[i]?.[0]??0);weights.push(pairs[i]?.[1]??0);}
  }
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i),y=pos.getY(i),side=x<0;
    if(Math.abs(x)>.222&&(y>.80||Math.abs(x)>.35)){
      const bone=side?3:6,shoulder=smooth(.225,.355,Math.abs(x));
      const elbow=shoulder*smooth(.330,.500,Math.abs(x)),hand=elbow*(1-smooth(.848,.989,y));
      add([1,1-shoulder],[bone,shoulder-elbow],[bone+1,elbow-hand],[bone+2,hand]);
    }else if(y<.93){
      const bone=side?9:12,hip=1-smooth(.77,.96,y);
      const knee=hip*(1-smooth(.45,.62,y)),foot=knee*(1-smooth(.13,.23,y));
      add([0,1-hip],[bone,hip-knee],[bone+1,knee-foot],[bone+2,foot]);
    }else{
      const chest=smooth(.94,1.18,y),neck=smooth(1.47,1.66,y);
      add([0,1-chest],[1,chest-neck],[2,neck]);
    }
  }
  g.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));
  g.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
  return g;
}
function sculpt(parent,g,style,paint){
  colorGeometry(g,style,paint);
  const o=new T.Mesh(g,new T.MeshStandardMaterial({vertexColors:true,roughness:.79}));
  o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;
}
function makeFace(head,style){
  const faceField=(x,y,z)=>{
    let d=ellipse(x,y-.034,z,.251,.275,.219);
    d=smin(d,ellipse(x,y+.055,z-.216,.053,.048,.060),.064);
    d=smin(d,ellipse(Math.abs(x)-.234,y+.040,z-.017,.049,.067,.043),.045);
    return d;
  };
  sculpt(head,surface(faceField,[-.33,-.27,-.25],[.33,.34,.33],.016),style,()=>style.skin);
  const hairField=(x,y,z)=>{
    const cap=ellipse(x,y-.111,z+.024,.272,.234,.223);
    const sweep=ellipse(x+.096,y-.208+.29*x,z-.087,.208,.123,.165);
    const front=.112+.032*Math.sin((x+.065)*11)+.37*z;
    return smin(-smin(-cap,y-front,.046),sweep,.092);
  };
  sculpt(head,surface(hairField,[-.36,-.10,-.29],[.34,.40,.29],.013),style,()=>style.hair);
  const eyes=[-1,1].map(side=>{
    const pivot=group(head,side*.094,.040,.202);pivot.rotation.y=side*.19;
    const white=ball(pivot,0xf1ddbf,0,0,0,.053,.047,.017);
    const iris=ball(pivot,0x593729,0,0,.014,.023,.027,.009);
    const shine=ball(pivot,0xffe7c6,-.006,.008,.022,.005,.005,.004);
    const brow=bar(head,style.hair,[[side*.094-.044,.125,.196],[side*.094,.137,.204],[side*.094+.044,.123,.193]],.010);
    return {side,pivot,white,iris,shine,brow};
  });
  const mouthGeometry=new T.BufferGeometry();
  const mouthVertices=new Float32Array(33*3),triangles=[];
  for(let i=1;i<=32;i++)triangles.push(0,i,i===32?1:i+1);
  mouthGeometry.setIndex(triangles);
  mouthGeometry.setAttribute('position',new T.BufferAttribute(mouthVertices,3).setUsage(T.DynamicDrawUsage));
  const mouth=new T.Mesh(mouthGeometry,new T.MeshBasicMaterial({color:0x482723,side:T.DoubleSide}));
  mouth.frustumCulled=false;head.add(mouth);
  const teeth=ball(head,0xf2e0be,0,-.115,.196,.046,.009,.007);teeth.castShadow=false;
  const lip=ball(head,0xb66d54,0,-.153,.176,.041,.006,.010);lip.castShadow=false;
  return {eyes,mouth,teeth,lip};
}
function makePercy(variant){
  const style=STYLE[variant],root=group(scene);
  const bones=P.map(p=>{const b=new T.Bone();b.position.copy(p);return b;});
  const body=new T.SkinnedMesh(bodyGeometry(style),new T.MeshStandardMaterial({vertexColors:true,roughness:.84,skinning:true}));
  bones.forEach(b=>body.add(b));root.add(body);
  body.updateMatrixWorld(true);body.bind(new T.Skeleton(bones));
  body.castShadow=true;body.receiveShadow=true;body.frustumCulled=false;
  const head=group(bones[2],0,.164,0);
  const face=makeFace(head,style);
  const collar=bar(bones[1],style.trim,[[-.098,.200,.024],[-.075,.166,.096],[0,.133,.117],[.075,.166,.096],[.098,.200,.024]],.012);
  const piping=bar(bones[1],style.trim,[[0,.13,.123],[0,.033,.156],[.005,-.12,.151],[.006,-.252,.138]],.012);
  for(let i=0;i<3;i++)ball(bones[1],style.trim,.064,-.022-i*.09,.152,.014,.014,.008);
  return {root,bones,body,head,face,collar,piping};
}
function aimBone(bones,i,from,to){
  const direction=to.clone().sub(from).normalize();
  const bind=END[i].clone().sub(P[i]).normalize();
  const bone=bones[i];bone.position.copy(from);bone.quaternion.setFromUnitVectors(bind,direction);
}
