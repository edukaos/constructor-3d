import {open} from '../../tests/harness.mjs';
import fs from 'fs';
const {browser,page,errs}=await open();
const out=await page.evaluate(async()=>{
  const T=await import('three'); const {RoomEnvironment}=await import('three/addons/environments/RoomEnvironment.js');
  const N=224; const cv=document.createElement('canvas'); cv.width=cv.height=N;
  const r=new T.WebGLRenderer({canvas:cv,antialias:true,alpha:true,preserveDrawingBuffer:true}); r.setSize(N,N,false); r.setPixelRatio(1);
  r.toneMapping=T.ACESFilmicToneMapping; r.toneMappingExposure=.95; r.setClearColor(0,0);
  const pm=new T.PMREMGenerator(r); const env=pm.fromScene(new RoomEnvironment(),0.04).texture;
  const {RoundedBoxGeometry}=await import('three/addons/geometries/RoundedBoxGeometry.js');
  const ext=(shape,depth,bev=.07)=>{const g=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelThickness:bev,bevelSize:bev,bevelSegments:6,curveSegments:48}); g.translate(0,0,-depth/2); return g;};
  const flat=g=>{g=g.toNonIndexed(); g.computeVertexNormals(); return g;};
  const geos={
    box:()=>new RoundedBoxGeometry(1,1,1,8,.13),
    sphere:()=>new T.SphereGeometry(.62,64,48),
    cylinder:()=>new T.CylinderGeometry(.5,.5,1,64,1),
    cone:()=>new T.ConeGeometry(.55,1.05,64),
    torus:()=>new T.TorusGeometry(.5,.22,48,96).rotateX(.5).rotateY(-.35),
    tube:()=>{const s=new T.Shape(); s.absarc(0,0,.52,0,Math.PI*2,false); const h=new T.Path(); h.absarc(0,0,.27,0,Math.PI*2,true); s.holes.push(h); return ext(s,.8,.05).rotateX(Math.PI/2);},
    hemi:()=>new T.SphereGeometry(.7,64,32,0,Math.PI*2,0,Math.PI/2).translate(0,-.25,0),
    pyramid:()=>flat(new T.ConeGeometry(.72,1,4).rotateY(Math.PI/4)),
    hex:()=>{const s=new T.Shape(); for(let i=0;i<6;i++){const a=i*Math.PI/3; const x=.5*Math.cos(a),y=.5*Math.sin(a); i?s.lineTo(x,y):s.moveTo(x,y);} s.closePath(); return ext(s,.7,.06).rotateX(Math.PI/2);},
    wedge:()=>{const s=new T.Shape(); s.moveTo(-.55,-.35); s.lineTo(.55,-.35); s.lineTo(-.55,.45); s.closePath(); return ext(s,.7,.06);}
  };
  const res={};
  for(const [k,mk] of Object.entries(geos)){ if(!mk)continue;
    const sc=new T.Scene(); sc.environment=env;
    const g=mk(); const mat=new T.MeshPhysicalMaterial({color:0x3f7be6,roughness:.2,metalness:0,clearcoat:1,clearcoatRoughness:.06,envMapIntensity:.85,sheen:.3,sheenColor:new T.Color(0xF5C451),sheenRoughness:.4});
    const m=new T.Mesh(g,mat); sc.add(m);
    const k1=new T.DirectionalLight(0xffffff,1.6); k1.position.set(-2,3,3); sc.add(k1);
    const rim=new T.DirectionalLight(0xffd27a,2.0); rim.position.set(3,1,-3); sc.add(rim);
    sc.add(new T.AmbientLight(0x4a7cff,.35));
    g.computeBoundingSphere(); const R=g.boundingSphere.radius;
    const cam=new T.PerspectiveCamera(30,1,.1,50); const d=R*4.3; cam.position.set(d*.6,d*.52,d*.8); cam.lookAt(g.boundingSphere.center);
    r.render(sc,cam); res[k]=cv.toDataURL('image/png');
  }
  return res;
});
for(const [k,v] of Object.entries(out)) fs.writeFileSync(new URL('./'+k+'.png',import.meta.url),Buffer.from(v.split(',')[1],'base64'));
console.log(Object.keys(out),errs);
await browser.close();
