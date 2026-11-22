function makeKitchen() {
  const palette = look === 'wood'
    ? {wall:0x3c6667,tile:0x46726c,seam:0x305b57,floor:0xa6663d,table:0x9c4e29,board:0xc28043,trim:0xc48747,shade:0x794125}
    : {wall:0x6fa59b,tile:0x7eb7a8,seam:0x559186,floor:0xd29874,table:0xbd7654,board:0xe4a975,trim:0xe2b77d,shade:0x996449};
  scene.background = new T.Color(palette.wall);
  scene.add(new T.HemisphereLight(0xfff0ce,0x91aecc,.68));
  const key = new T.DirectionalLight(0xffe7b8,1.35);
  key.position.set(-3,6,4); key.castShadow = true; key.shadow.mapSize.set(1024,1024);
  Object.assign(key.shadow.camera,{left:-4,right:4,top:4,bottom:-4,near:.5,far:17});
  key.shadow.bias = -.00025; key.shadow.normalBias = .024;
  scene.add(key);
  const fill = new T.DirectionalLight(0xb7e5e8,.24); fill.position.set(3,2,0); scene.add(fill);
  const rim = new T.DirectionalLight(0xffcb92,.43); rim.position.set(2,4,-5); scene.add(rim);
  block(scene,palette.floor,0,-.12,0,14,.23,12);
  for (let i=-7;i<8;i++) block(scene,palette.shade,i*.59,-.002,0,.012,.006,12).castShadow=false;
  block(scene,palette.wall,0,2.5,-3.57,14,5.2,.19);
  block(scene,palette.seam,0,.82,-3.42,14,1.65,.16);
  for(let x=-7;x<=7;x++) for(let y=0;y<5;y++) {
    block(scene,(x+y)%3===0?palette.wall:palette.tile,x*.49,.18+y*.315,-3.32,.473,.298,.053).castShadow=false;
  }
  block(scene,palette.trim,0,1.63,-3.25,9,.1,.17);
  block(scene,palette.shade,0,.15,-3.22,9,.12,.18);
  // Tuscan arch, with the warm pantry behind it.
  const ax=.05, ay=1.03, az=-3.15;
  const archPts=[[-.72,0],[.72,0],[.72,1.11]];
  for(let j=0;j<=18;j++){const a=j*Math.PI/18;archPts.push([Math.cos(a)*.72,1.11+Math.sin(a)*.72]);}
  mesh(scene,faceShape(archPts,.018,0),0x315255,ax,ay,az);
  const bricks = [.14,.145,.145,.145,.14];
  for(let side of [-1,1]) bricks.forEach((_,j)=>{
    block(scene,palette.trim,ax+side*.80,ay+.11+j*.23,az+.04,.18,.214,.14);
  });
  for(let j=0;j<11;j++){
    const a=j*Math.PI/10;
    const b=block(scene,palette.trim,ax+.81*Math.cos(a),ay+1.11+.81*Math.sin(a),az+.04,.19,.21,.14);
    b.rotation.z=a-Math.PI/2;
  }
  for(let x of [-2.45,2.32]){
    block(scene,palette.shade,x,.97,-2.94,1.37,.115,.59);
    block(scene,palette.trim,x,.59,-3.04,1.24,.70,.4);
    block(scene,palette.shade,x,2.38,-3.03,1.52,.095,.42);
    block(scene,palette.trim,x,2.48,-3.08,1.5,.075,.37);
  }
  for(let i=0;i<3;i++){
    const x=-2.92+i*.43;
    tube(scene,0x9a533b,x,2.60,-2.99,.13,.27,.12);
    tube(scene,0xd88f65,x,2.755,-2.99,.147,.055,.13);
  }
  [0xbc5f3f,0xd08949,0x9d543a].forEach((c,i)=>{
    const x=1.88+i*.38, y=1.97-i*.07;
    ball(scene,c,x,y,-3.17,.133+i*.012,.14,.04,.47);
    bar(scene,0x835644,[[x,y+.10,-3.15],[x,y+.24,-3.15],[x+.045,y+.34,-3.18]],.021);
  });
  for(let i=0;i<4;i++){
    const x=1.8+i*.21;
    ball(scene,i%2?0xe9cc9b:0xe9e1bf,x,2.58,-3.03,.11,.117,.035);
  }
  ball(scene,0xb9683e,-2.34,1.14,-2.97,.26,.18,.21);
  tube(scene,0xe5a76e,-2.34,1.31,-2.97,.16,.045,.15);
  // L13-inspired pine worktable. The eggs share one tabletop height.
  block(scene,palette.table,0,.91,.01,3.21,.18,1.54);
  for(let i=0;i<5;i++){
    block(scene,i%2?palette.board:palette.trim,0,1.001,-.592+i*.3,3.18,.028,.289);
  }
  block(scene,palette.shade,0,.78,.709,3.08,.17,.085);
  for(let x of [-1.44,1.44]) for(let z of [-.59,.6]) {
    block(scene,palette.table,x,.459,z,.17,.89,.17);
  }
  const board = mesh(scene,faceShape([[-.52,-.29],[.49,-.29],[.56,-.21],[.56,.2],[.47,.27],[-.47,.27],[-.55,.17],[-.55,-.19]],.034,.018),palette.board,0,1.017,-.40);
  board.rotation.x=-Math.PI/2;
  for(let j=0;j<3;j++){
    bar(scene,palette.shade,[[-.41,1.068,-.57+j*.17],[-.1,1.069,-.59+j*.174],[.42,1.068,-.56+j*.17]],.003);
  }
  const bowl=group(scene,-1.06,1.032,.05);
  const bowlGeo=new T.LatheGeometry([[.02,0],[.13,.005],[.23,.074],[.27,.158],[.263,.175],[.247,.169],[.21,.086],[.125,.04],[.02,.033]].map(a=>new T.Vector2(...a)),28);
  mesh(bowl,bowlGeo,0x45867c,0,0,0);
  const cloth=block(scene,0xc25a4e,1.03,1.024,.29,.46,.021,.36);
  cloth.rotation.y=-.23;
}

