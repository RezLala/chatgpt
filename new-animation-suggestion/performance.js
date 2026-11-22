const AUDIO_START = 2.36; // Dialogue edit maps source 65.89 to scene 8.25.
const MOUTH = {
  rest:[.049,.004,0], MBP:[.045,.0015,0], FV:[.049,.009,-.002],
  TDN:[.047,.013,0], EE:[.061,.014,0], AH:[.048,.034,-.005],
  OH:[.033,.030,-.006], OO:[.024,.018,-.004], S:[.055,.011,0], R:[.042,.020,-.002]
};
// Starts are in the source voice's time, relative to 60 seconds.
const WORDS = [
  [6.02,6.12,'Ugh',[['AH',0],['TDN',.78]]],
  [6.22,6.46,'raw',[['R',0],['OH',.32]]],
  [6.80,6.98,"it's",[['EE',0],['TDN',.45],['S',.68]]],
  [6.98,7.16,'running',[['R',0],['AH',.22],['TDN',.54],['EE',.77]]],
  [7.16,7.42,'down',[['TDN',0],['AH',.20],['OO',.54],['TDN',.82]]],
  [7.42,7.62,'my',[['MBP',0],['AH',.33],['EE',.71]]],
  [7.62,7.88,'nose',[['TDN',0],['OH',.28],['S',.75]]],
  [7.88,8.20,'and',[['AH',0],['TDN',.52]]],
  [8.20,8.38,'into',[['EE',0],['TDN',.42],['OO',.68]]],
  [8.38,8.56,'my',[['MBP',0],['AH',.33],['EE',.72]]],
  [8.56,8.78,'best',[['MBP',0],['EE',.30],['S',.65],['TDN',.86]]],
  [8.78,9.06,'collar',[['TDN',0],['AH',.26],['R',.73]]]
];
const speech = WORDS.flatMap(([start,end,word,shapes])=>shapes.map(([shape,fraction],i)=>({
  word,shape,start:start+AUDIO_START+(end-start)*fraction,
  end:start+AUDIO_START+(end-start)*(shapes[i+1]?.[1]??1)
})));
const BEAT={stop:3.30,inspect:3.65,grip:3.94,raise:5.44,tap:6.24,release:6.39,spill:7.73,down:9.84};
function speechPose(t){
  const cue=speech.find(p=>t>=p.start-.022&&t<p.end+.035);
  if(!cue)return {shape:MOUTH.rest,talk:false,teeth:false};
  const index=speech.indexOf(cue),previous=speech[index-1],after=speech[index+1];
  const contiguousPrevious=previous&&(cue.start-previous.end)<.065;
  const contiguousNext=after&&(after.start-cue.end)<.065;
  const from=MOUTH[contiguousPrevious?previous.shape:'rest'];
  const to=MOUTH[contiguousNext?after.shape:'rest'];
  const at=MOUTH[cue.shape],span=Math.min(.044,(cue.end-cue.start)*.42);
  const blend=t<cue.start+span?smooth(cue.start-.022,cue.start+span,t):smooth(cue.end-span,cue.end+.035,t);
  const shape=at.map((v,i)=>t<cue.start+span?mix(from[i],v,blend):mix(v,to[i],blend));
  return {shape,talk:true,teeth:['TDN','EE','FV','S'].includes(cue.shape)};
}
function limbJoint(a,b,upper,lower,plane) {
  const line=b.clone().sub(a),length=clamp(line.length(),.012,upper+lower-.004);
  const unit=line.normalize();
  const reach=(upper*upper-lower*lower+length*length)/(2*length);
  const width=Math.sqrt(Math.max(.0001,upper*upper-reach*reach));
  const bow=plane.clone().addScaledVector(unit,-plane.dot(unit)).normalize();
  return a.clone().addScaledVector(unit,reach).addScaledVector(bow,width);
}
function leftWalk(t) {
  const knots=[
    [0,-2.55,-.88],[.60,-2.20,-.90],[1.28,-1.69,-.95],[1.95,-1.14,-.95],[2.62,-.63,-.91],[3.30,-.055,-.91]
  ];
  for(let n=1;n<knots.length;n++){
    const [b,x1,z1]=knots[n],[a,x0,z0]=knots[n-1];
    if(t<=b){
      const u=(t-a)/(b-a),v=n===knots.length-1?u+u*u-u*u*u:u;
      return V(mix(x0,x1,v),0,mix(z0,z1,v));
    }
  }
  return V(knots.at(-1)[1],0,knots.at(-1)[2]);
}
// A stance foot stays in world space until its next swing window.
const STEPS=[
  [[0,-2.58,-.74],[.12,.52,-2.09,-.73],[.85,1.23,-1.55,-.77],[1.52,1.90,-1.01,-.77],[2.19,2.57,-.49,-.76],[2.83,3.23,-.216,-.878]],
  [[0,-2.74,-1.02],[.46,.88,-1.82,-1.04],[1.16,1.56,-1.27,-1.07],[1.83,2.23,-.74,-1.09],[2.49,2.91,-.21,-1.08],[3.08,3.49,.107,-.892]]
];
function footAt(index,t){
  const steps=STEPS[index];
  let old=V(steps[0][1],.104,steps[0][2]);
  for(const [start,end,x,z] of steps.slice(1)){
    if(t<start)return old;
    const now=V(x,.104,z);
    if(t<=end){const phase=clamp((t-start)/(end-start));return old.lerp(now,smooth(0,1,phase)).add(V(0,.112*Math.sin(Math.PI*phase),0));}
    old=now;
  }
  return old;
}
function facePerformance(t,anticipation,surprise,anger,annoy,eggFocus) {
  const blink=Math.max(peak(t,1.18,1.24,1.32),peak(t,3.22,3.27,3.33),peak(t,7.24,7.29,7.38),peak(t,12.25,12.30,12.40),peak(t,14.25,14.30,14.39));
  const mouth=speechPose(t);
  const {eyes,teeth,lip}=rig.face;
  for(const e of eyes){
    const aperture=(1+surprise*.30-annoy*.47-anger*.26-anticipation*.11)*(1-blink*.94);
    e.pivot.scale.y=Math.max(.07,aperture);
    const gaze=-.61*eggFocus+.43*annoy-.12*anger;
    e.iris.position.set(gaze*.025,.011*anticipation-.016*annoy-.014*anger,.014);
    e.shine.position.set(e.iris.position.x-.006,e.iris.position.y+.008,.023);
    e.brow.rotation.z=e.side*(.30*anger-.27*surprise)+(.18*annoy-.09*anticipation);
    e.brow.position.y=surprise*.030-anger*.013+(e.side<0?.025*annoy+anticipation*.013:0);
  }
  let [width,height,offset]=mouth.shape;
  if(!mouth.talk){
    width+=.011*anticipation-.009*surprise;
    height+=.039*surprise+.008*anger;
  }
  const smile=.018*anticipation-.012*annoy-.010*anger;
  const center=-.122+offset;
  const depth=(x,y)=>.219*Math.sqrt(Math.max(.12,1-(x/.251)**2-((y-.034)/.275)**2))+.015;
  const verts=rig.face.mouth.geometry.getAttribute('position');
  verts.setXYZ(0,0,center,depth(0,center));
  for(let i=0;i<32;i++){
    const p=2*Math.PI*i/32,xx=width*Math.cos(p);
    const yy=center+height*Math.sin(p)+smile*Math.cos(p)**2+.010*anticipation*Math.cos(p);
    verts.setXYZ(i+1,xx,yy,depth(xx,yy));
  }
  verts.needsUpdate=true;
  teeth.visible=mouth.teeth&&height>.008;
  teeth.position.set(0,center+height*.39,depth(0,center+height*.39)+.002);
  teeth.scale.set(width*.70,Math.min(.006,height*.24),.002);
  lip.position.set(0,center-height-.0005,depth(0,center-height)-.008);
  lip.scale.x=width*.62;
  lip.visible=mouth.talk&&height>.018;
}
function animate(t){
  const root=rig.root,bones=rig.bones;
  root.position.copy(leftWalk(t));
  const stride=(1-smooth(2.78,3.47,t))*.93;
  root.rotation.y=1.23*(1-smooth(2.54,3.38,t));
  root.updateMatrixWorld(true);
  const reach=smooth(BEAT.inspect,BEAT.grip,t);
  const lift=smooth(BEAT.grip,BEAT.raise,t);
  const hit=smooth(5.82,BEAT.tap,t);
  const recoil=peak(t,BEAT.tap,6.45,7.07);
  const lower=smooth(6.45,7.63,t);
  const anticipation=smooth(3.60,4.54,t)*(1-smooth(6.11,6.32,t));
  const surprise=peak(t,6.24,6.60,7.78);
  const anger=peak(t,8.08,8.85,10.32);
  const annoy=smooth(9.40,10.75,t)*(1-.5*smooth(13.7,14.9,t));
  const eggFocus=smooth(3.07,3.61,t)*(1-smooth(6.18,6.45,t));
  const gait=Math.cos(t*2*Math.PI/.67)*stride;
  const lean=-.07*lift+.115*recoil+.045*annoy;
  const shift=V(.038*gait-.035*lift,.014*Math.sin(t*4*Math.PI/.67)*stride-.043*recoil,.073*reach-.035*lift-.112*recoil);
  bones[0].position.copy(P[0]).addScaledVector(shift,.28);
  bones[0].rotation.set(-.01,0,lean*.35);
  bones[1].position.copy(P[1]).add(shift);
  bones[1].rotation.set(.12*reach-.11*lift-.20*recoil+.09*annoy,-.16*lift+.07*anger,.062*gait+lean);
  bones[2].position.copy(P[2]).addScaledVector(shift,1.21);
  bones[2].rotation.set(.16*eggFocus-.30*surprise+.19*annoy-.075*anger,-.23*eggFocus+.115*annoy,lean+.14*surprise-.08*annoy);
  const r=bones[1].quaternion;
  const shoulder=(i)=>P[i].clone().sub(P[1]).applyQuaternion(r).add(bones[1].position);
  const grips=[V(-.49,.94,.037-.13*gait),V(.49,.94,.037+.13*gait)];
  const eggContact=root.worldToLocal(EGG_AT.clone()).sub(V(.023,.093,.031));
  grips[0].lerp(eggContact,reach);
  const up=V(-.47,1.73,.218);
  const near=V(-.218,1.76,.278);
  grips[0].lerp(up,lift).lerp(near,hit).lerp(V(-.39,1.152,.235),lower);
  const counterHand=root.worldToLocal(V(.278,1.070,-.644));
  grips[1].lerp(counterHand,smooth(3.10,4.02,t));
  grips[1].y+=.18*peak(t,10.62,11.23,12.05);
  for(let i=0;i<2;i++){
    const arm=i?6:3,leg=i?12:9,side=i?1:-1;
    const end=grips[i],s=shoulder(arm);
    const elbow=limbJoint(s,end,.321,.300,V(side*.75,-1,.47));
    aimBone(bones,arm,s,elbow);aimBone(bones,arm+1,elbow,end);
    const hold=i?0:reach;
    const handAim=end.clone().add(V(side*.05,.071*hold-.091*(1-hold),.06*hold));
    aimBone(bones,arm+2,end,handAim);
    const hip=P[leg].clone().addScaledVector(shift,.3);
    const foot=root.worldToLocal(footAt(i,t));
    const knee=limbJoint(hip,foot,.410,.414,V(0,0,1));
    aimBone(bones,leg,hip,knee);aimBone(bones,leg+1,knee,foot);
    bones[leg+2].position.copy(foot);
    bones[leg+2].rotation.set(0,i?.09:-.08,0);
  }
  root.updateMatrixWorld(true);
  const heldAt=root.localToWorld(grips[0].clone().add(V(.023,.093,.031)));
  tableEgg.visible=t<BEAT.grip;
  heldEgg.visible=t>=BEAT.grip&&t<BEAT.tap;
  heldEgg.position.copy(heldAt);heldEgg.rotation.set(-.25*lift,.23, -.40*lift+.38*hit);
  shell.visible=t>=BEAT.tap;shell.position.copy(heldAt);shell.rotation.copy(heldEgg.rotation);
  shell.children.forEach((o,i)=>{const d=i?1:-1;o.position.x=d*(.04+.062*recoil);o.rotation.z=d*(.66+.34*recoil);});
  streak.visible=t>=BEAT.release;
  const travel=smooth(BEAT.spill,BEAT.down,t);
  const faceY=mix(.091,-.151,smooth(6.39,8.53,t));
  const yolkStart=rig.head.localToWorld(V(.045,faceY,.231));
  const yolkEnd=bones[1].localToWorld(V(.049,-.019,.154));
  streak.position.copy(yolkStart.lerp(yolkEnd,travel));streak.scale.set(.030+.016*travel,.06-.028*travel,.018);
  facePerformance(t,anticipation,surprise,anger,annoy,eggFocus);
}
function cameraAt(t){
  if(t<2.87){
    const track=leftWalk(t).x+.06;
    camera.position.set(track-1.04,1.47,2.665);
    camera.lookAt(track+.12,.947,-.87);camera.fov=34;
  }else if(t<5.68){
    camera.position.set(-.78,2.03,2.33-.14*smooth(2.87,5.68,t));
    camera.lookAt(-.13,1.42,-.63);camera.fov=31;
  }else if(t<11.55){
    const push=smooth(5.68,7.3,t);
    camera.position.set(.18,1.94,2.28-.34*push);
    camera.lookAt(-.099,1.64,-.78);camera.fov=27;
  }else{
    camera.position.set(-.74,1.95,2.3);
    camera.lookAt(-.15,1.42,-.66);camera.fov=31;
  }
  camera.updateProjectionMatrix();
}
function render(t){animate(clamp(t,0,15-1/240));cameraAt(t);renderer.render(scene,camera);}
const audio=document.querySelector('audio');
const silentPlay=document.querySelector('#silent-play');
let silentTime=0, silentPlaying=false;
setupScene(new URLSearchParams(location.search).get('look')==='clay'?'clay':'wood');
render(0);
window.renderPercy=(style,t)=>{
  if(style!==look)setupScene(style);
  render(t);return renderer.domElement.toDataURL('image/jpeg',.96).split(',')[1];
};
window.percyTest=()=>({seconds:SECONDS,fps:FPS,weightedVertices:rig.body.geometry.getAttribute('position').count,bodyParts:rig.body.isSkinnedMesh?1:0,walkingFootprint:STEPS.length,speechCues:speech.length});
document.querySelectorAll('[data-look]').forEach(button=>button.addEventListener('click',()=>{setupScene(button.dataset.look);render(audio.error?silentTime:audio.currentTime);}));
audio.addEventListener('seeked',()=>render(audio.currentTime));
audio.addEventListener('play',function play(){render(audio.currentTime);if(!audio.paused)requestAnimationFrame(play);});
function showSilentControls(){audio.hidden=true;silentPlay.hidden=false;}
audio.addEventListener('error',showSilentControls);
if(audio.error)showSilentControls();
silentPlay.addEventListener('click',()=>{
  silentPlaying=!silentPlaying;
  if(!silentPlaying){silentPlay.textContent='Resume silent preview';return;}
  if(silentTime>=SECONDS)silentTime=0;
  silentPlay.textContent='Pause silent preview';
  const begin=performance.now()-silentTime*1000;
  function play(now){
    if(!silentPlaying)return;
    silentTime=Math.min(SECONDS,(now-begin)/1000);
    render(silentTime);
    if(silentTime<SECONDS)requestAnimationFrame(play);
    else{silentPlaying=false;silentPlay.textContent='Replay silent preview';}
  }
  requestAnimationFrame(play);
});
