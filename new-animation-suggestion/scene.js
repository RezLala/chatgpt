const T = THREE;
const W = 540, H = 960, FPS = 24, SECONDS = 15;
const V = (x=0,y=0,z=0) => new T.Vector3(x,y,z);
const clamp = (x,a=0,b=1) => Math.max(a,Math.min(b,x));
const mix = (a,b,t) => a+(b-a)*t;
const smooth = (a,b,t) => {const u=clamp((t-a)/(b-a));return u*u*(3-2*u);};
const peak = (t,start,plateau,end) => smooth(start,plateau,t)*(1-smooth(plateau,end,t));
const renderer = new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(W,H);
renderer.outputEncoding = T.sRGBEncoding;
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = .87;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;
document.querySelector('#stage').append(renderer.domElement);
const camera = new T.PerspectiveCamera(32,W/H,.05,30);
const sphere = new T.SphereGeometry(1,36,24);
const cylinder = new T.CylinderGeometry(1,1,1,24);
const cube = new T.BoxGeometry(1,1,1);
let scene, look, rig, tableEgg, heldEgg, shell, streak, filmMaterials;
function material(color,roughness=.85) {
  const key = color+'/'+roughness;
  if(!filmMaterials.has(key))filmMaterials.set(key,new T.MeshStandardMaterial({color,roughness}));
  return filmMaterials.get(key);
}
function mesh(parent,geometry,color,x=0,y=0,z=0,sx=1,sy=1,sz=1,roughness=.85) {
  const object = new T.Mesh(geometry,material(color,roughness));
  object.position.set(x,y,z);object.scale.set(sx,sy,sz);
  object.castShadow=true;object.receiveShadow=true;parent.add(object);
  return object;
}
function ball(p,c,x,y,z,a,b,d,r){return mesh(p,sphere,c,x,y,z,a,b,d,r);}
function block(p,c,x,y,z,a,b,d){return mesh(p,cube,c,x,y,z,a,b,d);}
function tube(p,c,x,y,z,a,b,d=a){return mesh(p,cylinder,c,x,y,z,a,b,d);}
function group(p,x=0,y=0,z=0){const g=new T.Group();p.add(g);g.position.set(x,y,z);return g;}
function faceShape(points,depth=.07,bevel=.02) {
  const outline = new T.Shape();
  points.forEach(([x,y],i)=>i?outline.lineTo(x,y):outline.moveTo(x,y));
  outline.closePath();
  return new T.ExtrudeGeometry(outline,{depth,bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelSegments:2,steps:1});
}
function bar(p,c,points,radius=.02){
  const curve=new T.CatmullRomCurve3(points.map(q=>V(...q)));
  return mesh(p,new T.TubeGeometry(curve,20,radius,9,false),c);
}
const eggGeo = new T.LatheGeometry(Array.from({length:33},(_,i)=>{
  const a=i*Math.PI/32;return new T.Vector2(Math.sin(a)*(.102+.015*Math.cos(a)),-.14*Math.cos(a));
}),40);
const halfGeo=faceShape([[-.085,-.039],[-.083,.043],[-.047,.085],[.019,.089],[.062,.055],[.082,.019],[.025,.03],[.042,-.024],[-.012,.004],[-.024,-.055]],.028,.01);
const EGG_AT=V(-.24,1.208,-.40);
function setupScene(style) {
  if(scene) {
    const keep = new Set([sphere,cylinder,cube,eggGeo,halfGeo]);
    scene.traverse(o=>{if(o.geometry&&!keep.has(o.geometry))o.geometry.dispose();if(o.material?.vertexColors)o.material.dispose();});
    for(const m of filmMaterials.values())m.dispose();
  }
  look=style;scene=new T.Scene();filmMaterials=new Map();
  makeKitchen();
  rig=makePercy(style);
  tableEgg=mesh(scene,eggGeo,0xffebcb,...EGG_AT.toArray());
  mesh(scene,eggGeo,0xf3ddbc,.27,1.208,-.38);
  heldEgg=mesh(scene,eggGeo,0xffebcb);
  shell=group(scene);
  for(const side of [-1,1]){
    const piece=mesh(shell,halfGeo,0xffe9c3,side*.037,0,0,.71,.71,.69);
    piece.rotation.z=side*.6;
  }
  streak=ball(scene,0xf2ae32,0,0,0,.037,.088,.025,.64);
}
