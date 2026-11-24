'use strict';
// Constructor 3D: SVG, vaciar, biblioteca de formas, redondear, historial editable y biblioteca de piezas.
// Los scripts de js/ comparten el ámbito global y se cargan en orden desde index.html.
// ===== Utilidades para crear piezas con Manifold =====
function pieceFromGeo(geo,name,color,pos){
  geo.computeBoundingBox(); const b=geo.boundingBox, c=b.getCenter(new THREE.Vector3());
  geo.translate(-c.x,-b.min.y,-c.z);
  const m=addMesh(geo,new THREE.MeshStandardMaterial({color:color??colors[ci++%colors.length],roughness:0.55,metalness:0.05}),name);
  recenter(m); if(pos)m.position.add(new THREE.Vector3(pos[0],pos[1]||0,pos[2]||0)); return m;
}
function needManifold(){if(!MF){msg('Esta función necesita el motor nuevo (Manifold) y no se pudo cargar. Revisá la conexión a internet.'); return false;} return true;}
// geometría en Z arriba (como sale de Manifold) a Y arriba
const yUp=g=>g.rotateX(-Math.PI/2);
function replacePiece(o,meshes){
  scene.remove(o); const i=objs.indexOf(o); if(i>=0)objs.splice(i,1);
  meshes.forEach(m=>{if(!objs.includes(m)){scene.add(m); objs.push(m);}});
}

// ===== SVG a 3D =====
let svgData=null;
$('#svgbtn').onclick=()=>openPanel('#svgp');
$('#svgpick').onclick=()=>$('#svgfile').click();
$('#svgfile').addEventListener('change',async e=>{
  const f=e.target.files[0]; if(!f)return;
  svgData={name:f.name.replace(/\.svg$/i,''),text:await f.text()}; $('#svgname').textContent='Archivo: '+f.name; e.target.value='';
});
async function svgGeometry(text,widthMM,depth){
  const {SVGLoader}=await import('three/addons/loaders/SVGLoader.js');
  const data=new SVGLoader().parse(text), items=[];
  for(const p of data.paths){
    const st=(p.userData&&p.userData.style)||{};
    if(!st.fill||st.fill==='none'||st.fillOpacity===0)continue;
    const polys=p.subPaths.map(sp=>sp.getPoints(12).map(v=>[v.x,-v.y])).filter(a=>a.length>=3);
    if(polys.length)items.push({polys,rule:st.fillRule==='evenodd'?'EvenOdd':'NonZero',path:p});
  }
  if(!items.length)return null;
  let x0=1e9,x1=-1e9; items.forEach(it=>it.polys.forEach(pl=>pl.forEach(v=>{x0=Math.min(x0,v[0]); x1=Math.max(x1,v[0]);})));
  const k=widthMM/Math.max(1e-6,x1-x0);
  items.forEach(it=>{it.polys=it.polys.map(pl=>pl.map(v=>[v[0]*k,v[1]*k]));});
  await loadManifold(); let geo;
  if(MF){
    const secs=items.map(it=>new MF.CrossSection(it.polys,it.rule)), all=MF.CrossSection.union(secs); secs.forEach(c=>c.delete());
    const m=all.extrude(depth); all.delete(); geo=fromManifold(m); m.delete();
  } else {
    const shapes=items.flatMap(it=>SVGLoader.createShapes(it.path)); shapes.forEach(sh=>{});
    geo=new THREE.ExtrudeGeometry(shapes,{depth,bevelEnabled:false,curveSegments:12}); geo.scale(k,-k,1);
  }
  return yUp(geo);
}
$('#svgadd').onclick=async()=>{
  if(!svgData){msg('Primero elegí un archivo SVG.'); return;}
  const w=Math.max(1,parseFloat($('#svgw').value)||40), d=Math.max(0.2,parseFloat($('#svgd').value)||3);
  await busyOn('Convirtiendo el SVG…');
  try{
    const geo=await svgGeometry(svgData.text,w,d);
    if(!geo){msg('Ese SVG no tiene áreas rellenas (solo líneas). Convertí los trazos a contornos y probá de nuevo.'); return;}
    pieceFromGeo(geo,'SVG: '+svgData.name.slice(0,24)); updateDims(); commit();
    msg('SVG agregado: '+w+' mm de ancho y '+d+' mm de espesor. Uní la pieza con otra para hacer un relieve.');
  }catch(err){console.error(err); msg('No se pudo leer ese SVG.');}
  finally{busyOff();}
};

// ===== Vaciar, con vista previa en vivo =====
$('#shellbtn').onclick=()=>openPanel('#shellp');
// calcula la pieza hueca a partir del sólido A (Manifold). Devuelve {R,av,iv} o {err}
function shellCompute(A,t,open){
  let I=null,H=null,T=null,R=null;
  try{
    const mesh=A.getMesh(), np=mesh.numProp, vp=mesh.vertProperties, tv=mesh.triVerts, n=vp.length/np;
    // cada vértice se corre hacia adentro lo justo para que todas sus caras queden a "t" de la pared original
    const S=new Float64Array(n*6), B=new Float64Array(n*3);
    for(let i=0;i<tv.length;i+=3){
      const a=tv[i],b=tv[i+1],c=tv[i+2], ux=vp[b*np]-vp[a*np],uy=vp[b*np+1]-vp[a*np+1],uz=vp[b*np+2]-vp[a*np+2], wx=vp[c*np]-vp[a*np],wy=vp[c*np+1]-vp[a*np+1],wz=vp[c*np+2]-vp[a*np+2];
      let nx=uy*wz-uz*wy, ny=uz*wx-ux*wz, nz=ux*wy-uy*wx; const l=Math.hypot(nx,ny,nz); if(l<1e-12)continue; nx/=l; ny/=l; nz/=l;
      for(const v of [a,b,c]){const q=v*6; S[q]+=nx*nx; S[q+1]+=nx*ny; S[q+2]+=nx*nz; S[q+3]+=ny*ny; S[q+4]+=ny*nz; S[q+5]+=nz*nz; B[v*3]+=nx; B[v*3+1]+=ny; B[v*3+2]+=nz;}
    }
    const inner=new Float32Array(n*3);
    for(let v=0;v<n;v++){
      const q=v*6, lam=1e-4, m11=S[q]+lam, m12=S[q+1], m13=S[q+2], m22=S[q+3]+lam, m23=S[q+4], m33=S[q+5]+lam, bx=-t*B[v*3], by=-t*B[v*3+1], bz=-t*B[v*3+2];
      const det=m11*(m22*m33-m23*m23)-m12*(m12*m33-m23*m13)+m13*(m12*m23-m22*m13);
      let dx=0,dy=0,dz=0;
      if(Math.abs(det)>1e-12){
        dx=(bx*(m22*m33-m23*m23)-m12*(by*m33-m23*bz)+m13*(by*m23-m22*bz))/det;
        dy=(m11*(by*m33-m23*bz)-bx*(m12*m33-m23*m13)+m13*(m12*bz-by*m13))/det;
        dz=(m11*(m22*bz-by*m23)-m12*(m12*bz-by*m13)+bx*(m12*m23-m22*m13))/det;
      }
      const L=Math.hypot(dx,dy,dz), cap=2.5*t; if(L>cap){dx*=cap/L; dy*=cap/L; dz*=cap/L;}
      inner[v*3]=vp[v*np]+dx; inner[v*3+1]=vp[v*np+1]+dy; inner[v*3+2]=vp[v*np+2]+dz;
    }
    const im=new MF.Mesh({numProp:3,vertProperties:inner,triVerts:tv}); im.merge(); I=new MF.Manifold(im);
    const av=A.volume(), iv=I.volume();
    if(!(iv>1e-3)||iv>=av)return {err:'El grosor de pared es demasiado grande para esta pieza. Probá con uno menor.'};
    let cutter=I;
    if(open){const bb=A.boundingBox(), H0=bb.max[1]-bb.min[1]; T=I.translate([0,H0,0]); H=MF.Manifold.hull([I,T]); cutter=H;}
    R=A.subtract(cutter);
    if(!open&&Math.abs(R.volume()-(av-iv))>0.03*av){R.delete(); return {err:'No se pudo vaciar con ese grosor: la forma es muy compleja o la pared es muy gruesa. Probá con menos.'};}
    if(R.isEmpty()){R.delete(); return {err:'No se pudo vaciar la pieza.'};}
    const out={R,av,iv}; R=null; return out;
  }catch(e){console.error(e); try{R&&R.delete();}catch(_){} return {err:'No se pudo vaciar esta pieza.'};}
  finally{[I,H,T].forEach(x=>{try{x&&x.delete();}catch(e){}});}
}
// vista previa: la pieza hueca (en coordenadas del mundo) reemplaza a la original mientras el panel está abierto.
// Con "Ver corte por la mitad" se muestra la mitad de atrás como una pieza cerrada: afuera con el color de la pieza,
// adentro (el hueco) en gris claro y la pared cortada tapada con un rayado, para que se lea el grosor.
// Es solo para ver: lo que se crea al vaciar es siempre la pieza entera (vz.R).
let vz=null, shBusy=false, shTimer=0, shErr='';
const SH_IN=0xc9d3e3, SH_IN_ALT=0x5f7aa3, SH_CAP='#fff4dc', SH_CAP_LINE='#e9c98a';
let shHatch=null;
function shHatchTex(){
  if(shHatch)return shHatch;
  const c=document.createElement('canvas'); c.width=c.height=64; const x=c.getContext('2d');
  x.fillStyle=SH_CAP; x.fillRect(0,0,64,64); x.strokeStyle=SH_CAP_LINE; x.lineWidth=5;
  for(let i=-64;i<128;i+=16){x.beginPath(); x.moveTo(i,64); x.lineTo(i+64,0); x.stroke();}
  shHatch=new THREE.CanvasTexture(c); shHatch.wrapS=shHatch.wrapT=THREE.RepeatWrapping; shHatch.colorSpace=THREE.SRGBColorSpace; return shHatch;
}
// color del hueco: gris claro, salvo que la pieza ya sea clara y sin color (ahí, un azul grisáceo para que se distinga)
function shInnerColor(c){const h={}; c.getHSL(h); return (h.s<.25&&h.l>.55)?SH_IN_ALT:SH_IN;}
window.shPreviewOf=()=>vz&&vz.mesh?vz.o:null;
const shVals=()=>({t:Math.max(0.2,parseFloat($('#shellt').value)||2), open:$('#shello').checked});
function shDropMesh(){ if(vz&&vz.mesh){scene.remove(vz.mesh); vz.mesh.geometry.dispose(); [].concat(vz.mesh.material).forEach(m=>m.dispose()); vz.mesh=null;} }
function shStop(){
  clearTimeout(shTimer);
  if(vz){ shDropMesh(); try{vz.R&&vz.R.delete();}catch(e){} try{vz.A.delete();}catch(e){} vz.o.visible=!M_(vz.o).h; vz=null; }
  $('#shelllegend').hidden=true;
}
async function shStart(){
  if(vz||shBusy||$('#shellp').hidden)return; const o=sel[sel.length-1]; if(!o)return; shBusy=true;
  try{
    await loadManifold(); if(!MF||$('#shellp').hidden)return;
    shErr=''; const A0=toManifoldAuto(o), A=A0.asOriginal(), bb=A.boundingBox(); A0.delete(); // asOriginal: le da un número propio para distinguir sus caras de las del hueco
    vz={o,A,R:null,mesh:null,key:'',zc:(bb.min[2]+bb.max[2])/2}; shUpdate();
  }catch(err){console.error(err); shErr=(err&&err.userMsg)||'No se pudo preparar la pieza para vaciarla.'; $('#shellinfo').textContent=shErr;}
  finally{shBusy=false;}
}
// arma la malla de la vista previa: entera, o la mitad de atrás cerrada con la tapa del corte
function shCut(){
  if(!vz||!vz.R)return; const on=$('#shellcut').checked; shDropMesh();
  const aid=vz.A.originalID(), base=vz.R.getMesh(), inner=new Set();
  for(const id of base.runOriginalID)if(id!==aid)inner.add(id);
  let M=vz.R, trimmed=null;
  if(on){try{trimmed=vz.R.trimByPlane([0,0,-1],-vz.zc); if(trimmed.isEmpty()){trimmed.delete(); trimmed=null;} else M=trimmed;}catch(e){console.error(e); trimmed=null;}}
  const mesh=M===vz.R?base:M.getMesh(), g=fromManifold(M), ri=mesh.runIndex, ro=mesh.runOriginalID, uv=g.attributes.uv, pos=g.attributes.position;
  g.clearGroups();
  for(let r=0;r<ro.length;r++){
    const a=ri[r], b=ri[r+1], k=ro[r]===aid?0:inner.has(ro[r])?1:2; if(b<=a)continue; g.addGroup(a,b-a,k);
    if(k===2)for(let i=a;i<b;i++)uv.setXY(i,pos.getX(i)/4,pos.getY(i)/4);
  }
  uv.needsUpdate=true; if(trimmed)trimmed.delete();
  const out=vz.o.material.clone(); out.emissive.setHex(0); out.clippingPlanes=[]; out.side=THREE.FrontSide;
  const inC=shInnerColor(out.color);
  const mats=[out,new THREE.MeshStandardMaterial({color:inC,roughness:.85,metalness:0}),new THREE.MeshBasicMaterial({map:shHatchTex()})];
  const m=new THREE.Mesh(g,mats); m.raycast=()=>{}; m.castShadow=true; m.receiveShadow=true; m.frustumCulled=false;
  scene.add(m); vz.mesh=m; vz.o.visible=false;
  const lg=$('#shelllegend'); lg.hidden=!on;
  lg.querySelector('[data-k=out]').style.background='#'+out.color.getHexString();
  lg.querySelector('[data-k=in]').style.background='#'+new THREE.Color(inC).getHexString();
  wake();
}
function shUpdate(){
  if(!vz)return; const v=shVals(), key=v.t+'|'+v.open; if(key===vz.key&&vz.mesh)return; vz.key=key;
  if(vz.R){try{vz.R.delete();}catch(e){} vz.R=null;}
  shDropMesh();
  const r=shellCompute(vz.A,v.t,v.open);
  if(r.err){ vz.o.visible=!M_(vz.o).h; $('#shelllegend').hidden=true; $('#shellinfo').textContent=r.err; return; }
  vz.R=r.R; vz.av=r.av; vz.iv=r.iv;
  shCut();
  $('#shellinfo').textContent='Paredes de '+v.t+' mm'+(v.open?', abierta arriba':'')+'. Ahorrás '+Math.round(100*(1-(r.av-r.iv)/r.av))+'% de material.';
}
renderer.localClippingEnabled=true;
const shSoon=()=>{clearTimeout(shTimer); shTimer=setTimeout(shUpdate,140);};
$('#shellt').addEventListener('input',()=>{const v=parseFloat($('#shellt').value); if(v>=0.4&&v<=10)$('#shells').value=v; shSoon();});
$('#shells').addEventListener('input',()=>{$('#shellt').value=$('#shells').value; shSoon();});
$('#shello').addEventListener('change',shSoon);
$('#shellcut').addEventListener('change',shCut);
new MutationObserver(()=>{ if($('#shellp').hidden)shStop(); else shStart(); }).observe($('#shellp'),{attributes:true,attributeFilter:['hidden']});
setInterval(()=>{ if($('#shellp').hidden)return; const o=sel[sel.length-1]; if(vz&&vz.o!==o)shStop(); if(!vz)shStart(); },300);
async function makeShell(){
  if(!vz&&!shBusy)await shStart();
  if(!vz){msg(shErr||'Elegí la pieza que querés vaciar.'); return;}
  clearTimeout(shTimer); shUpdate();
  if(!vz.R){msg($('#shellinfo').textContent); return;}
  const o=vz.o, v=shVals();
  try{
    const g=fromManifold(vz.R), m=new THREE.Mesh(g,o.material.clone()); m.material.emissive.setHex(0); recenter(m);
    m.userData.m={n:M_(o).n+' (hueca)',h:false,l:false,k:!!M_(o).k}; fxRecord('shell',{t:v.t,open:v.open},[o],m);
    const pct=Math.round(100*(1-(vz.av-vz.iv)/vz.av));
    shStop(); replacePiece(o,[m]); select([m]); commit(); $('#shellp').hidden=true;
    msg('Pieza vaciada con paredes de '+v.t+' mm'+(v.open?', abierta arriba':'')+'. Ahorrás material: '+pct+'% menos de volumen.');
  }catch(err){console.error(err); msg('No se pudo vaciar esta pieza.');}
}
$('#shellgo').onclick=makeShell;

// ===== Biblioteca de formas =====
const SH_R=Math.PI/180;
const shFin=g=>{g=g.index?g.toNonIndexed():g; g=toCreasedNormals(g,35*SH_R); if(!g.attributes.uv)g.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(g.attributes.position.count*2),2)); return g;};
const shXZ=g=>{g.computeBoundingBox(); const b=g.boundingBox; g.translate(-(b.min.x+b.max.x)/2,0,-(b.min.z+b.max.z)/2); return g;};
const shExt=(sh,d)=>new THREE.ExtrudeGeometry(sh,{depth:d,bevelEnabled:false,curveSegments:32});
const shUp=(sh,d)=>shFin(shXZ(shExt(sh,d).translate(0,0,-d/2)));
const shFlat=(sh,d)=>shFin(shXZ(shExt(sh,d).rotateX(-Math.PI/2)));
const shPoly=pts=>{const s=new THREE.Shape(); pts.forEach((q,i)=>i?s.lineTo(q[0],q[1]):s.moveTo(q[0],q[1])); s.closePath(); return s;};
const shHole=(s,x,y,r)=>{const h=new THREE.Path(); h.absarc(x,y,r,0,Math.PI*2,true); s.holes.push(h); return s;};
const shLathe=(pts,n=48)=>cleanGeo(new THREE.LatheGeometry(pts.map(q=>new THREE.Vector2(q[0],q[1])),n));
const shWedge=(prof,phi,seg)=>{
  const V=prof.map(q=>new THREE.Vector2(q[0],q[1])), lg=new THREE.LatheGeometry(V,seg,0,phi).toNonIndexed(), P=Array.from(lg.attributes.position.array);
  for(const [a,b,c] of THREE.ShapeUtils.triangulateShape(V,[])){
    for(const i of [a,b,c])P.push(0,V[i].y,V[i].x);
    for(const i of [a,c,b])P.push(V[i].x*Math.sin(phi),V[i].y,V[i].x*Math.cos(phi));
  }
  let vol=0; for(let i=0;i<P.length;i+=9){const ax=P[i],ay=P[i+1],az=P[i+2],bx=P[i+3],by=P[i+4],bz=P[i+5],cx=P[i+6],cy=P[i+7],cz=P[i+8]; vol+=ax*(by*cz-bz*cy)-ay*(bx*cz-bz*cx)+az*(bx*cy-by*cx);}
  if(vol<0)for(let i=0;i<P.length;i+=9)for(let k=0;k<3;k++){const t=P[i+3+k]; P[i+3+k]=P[i+6+k]; P[i+6+k]=t;}
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(P),3)); return cleanGeo(g);
};
const SHAPELIB=[
 {id:'rbox',n:'Cubo redondeado',cat:'Básicas',p:{t:'box',w:25,h:25,d:25,r:5,soft:true}},
 {id:'rcyl',n:'Cilindro redondeado',cat:'Básicas',p:{t:'cyl',w:25,h:25,d:25,r:5,soft:true}},
 {id:'hcyl',n:'Medio cilindro',cat:'Básicas',mk:()=>{const s=new THREE.Shape(); s.moveTo(-12.5,0); s.absarc(0,0,12.5,Math.PI,0,true); s.closePath(); return shUp(s,25);}},
 {id:'qsph',n:'Cuarto de esfera',cat:'Básicas',mk:()=>{const R=12.5,prof=[[0,-R]]; for(let i=1;i<=24;i++){const a=-Math.PI/2+Math.PI*i/24; prof.push([Math.max(0,R*Math.cos(a)),R*Math.sin(a)]);} return shFin(shXZ(shWedge(prof,Math.PI/2,24).rotateZ(Math.PI/2)));}},
 {id:'caps',n:'Cápsula',cat:'Básicas',mk:()=>{const R=8,L=10,pts=[[0,-(L/2+R)]]; for(let i=1;i<=12;i++){const a=-Math.PI/2+Math.PI/2*i/12; pts.push([R*Math.cos(a),-L/2+R*Math.sin(a)]);} for(let i=0;i<=12;i++){const a=Math.PI/2*i/12; pts.push([R*Math.cos(a),L/2+R*Math.sin(a)]);} pts.push([0,L/2+R]); return shLathe(pts);}},
 {id:'elip',n:'Elipsoide',cat:'Básicas',mk:()=>cleanGeo(new THREE.SphereGeometry(12.5,48,32).scale(1.4,0.8,1))},
 {id:'gota',n:'Gota',cat:'Básicas',mk:()=>{const R=10,d=22,phi=Math.acos(R/d),ae=Math.atan2(R*Math.cos(phi),R*Math.sin(phi)),pts=[]; for(let i=0;i<=24;i++){const a=-Math.PI/2+(ae+Math.PI/2)*i/24; pts.push([Math.max(0,R*Math.cos(a)),R*Math.sin(a)]);} pts.push([0,d]); return shLathe(pts);}},
 {id:'tpri',n:'Prisma triangular',cat:'Polígonos',mk:()=>shUp(shPoly([[-12.5,0],[12.5,0],[0,21.65]]),25)},
 {id:'ppri',n:'Prisma pentagonal',cat:'Polígonos',mk:()=>new THREE.CylinderGeometry(12.5,12.5,25,5)},
 {id:'opri',n:'Prisma octogonal',cat:'Polígonos',mk:()=>new THREE.CylinderGeometry(12.5,12.5,25,8)},
 {id:'star',n:'Estrella',cat:'Polígonos',mk:()=>{const pts=[]; for(let i=0;i<10;i++){const r=i%2?6.5:15, a=Math.PI/2+i*Math.PI/5; pts.push([r*Math.cos(a),r*Math.sin(a)]);} return shFlat(shPoly(pts),6);}},
 {id:'hear',n:'Corazón',cat:'Polígonos',mk:()=>{const s=new THREE.Shape(); s.moveTo(0,-14); s.bezierCurveTo(-3,-10,-15,-4,-15,4); s.bezierCurveTo(-15,10,-9,13,-5,13); s.bezierCurveTo(-2,13,0,11,0,9); s.bezierCurveTo(0,11,2,13,5,13); s.bezierCurveTo(9,13,15,10,15,4); s.bezierCurveTo(15,-4,3,-10,0,-14); return shFlat(s,6);}},
 {id:'stai',n:'Escalera',cat:'Estructurales',mk:()=>shUp(shPoly([[0,0],[25,0],[25,5],[20,5],[20,10],[15,10],[15,15],[10,15],[10,20],[5,20],[5,25],[0,25]]),25)},
 {id:'arch',n:'Arco',cat:'Estructurales',mk:()=>{const s=new THREE.Shape(); s.moveTo(-12.5,0); s.lineTo(-7,0); s.lineTo(-7,12); s.absarc(0,12,7,Math.PI,0,true); s.lineTo(7,0); s.lineTo(12.5,0); s.lineTo(12.5,25); s.lineTo(-12.5,25); s.closePath(); return shUp(s,12);}},
 {id:'roof',n:'Techo a dos aguas',cat:'Estructurales',mk:()=>shUp(shPoly([[-12.5,0],[12.5,0],[12.5,12],[0,24],[-12.5,12]]),25)},
 {id:'wash',n:'Anillo plano',cat:'Estructurales',mk:()=>{const s=new THREE.Shape(); s.absarc(0,0,12.5,0,Math.PI*2,false); shHole(s,0,0,6); return shFlat(s,4);}},
 {id:'lper',n:'Perfil en L',cat:'Estructurales',mk:()=>shUp(shPoly([[0,0],[25,0],[25,5],[5,5],[5,25],[0,25]]),25)},
 {id:'uper',n:'Perfil en U',cat:'Estructurales',mk:()=>shUp(shPoly([[0,0],[25,0],[25,25],[20,25],[20,5],[5,5],[5,25],[0,25]]),25)},
 {id:'cros',n:'Cruz',cat:'Estructurales',mk:()=>shFlat(shPoly([[-4,-15],[4,-15],[4,-4],[15,-4],[15,4],[4,4],[4,15],[-4,15],[-4,4],[-15,4],[-15,-4],[-4,-4]]),8)},
 {id:'keyc',n:'Llavero',cat:'Taller',mk:()=>{const W=20,H=10,r=6,s=new THREE.Shape(); s.moveTo(-W+r,-H); s.lineTo(W-r,-H); s.absarc(W-r,-H+r,r,-Math.PI/2,0,false); s.lineTo(W,H-r); s.absarc(W-r,H-r,r,0,Math.PI/2,false); s.lineTo(-W+r,H); s.absarc(-W+r,H-r,r,Math.PI/2,Math.PI,false); s.lineTo(-W,-H+r); s.absarc(-W+r,-H+r,r,Math.PI,Math.PI*1.5,false); shHole(s,-W+7,0,3.2); return shFlat(s,3);}},
 {id:'nut',n:'Tuerca hexagonal',cat:'Taller',p:{t:'nut',th:'M5',af:8,h:4,bore:5.2}},
 {id:'bolt',n:'Tornillo con rosca',cat:'Taller',p:{t:'bolt',th:'M8',L:20,head:'hex'}},
 {id:'nutt',n:'Tuerca con rosca',cat:'Taller',p:{t:'nut',th:'M8',af:13,h:6.5,bore:8.2,thr:true,cl:0.25}},
 {id:'gear',n:'Engranaje',cat:'Taller',p:{t:'gear',N:12,od:28,td:2.5,bore:8,h:6}},
 {id:'arro',n:'Flecha',cat:'Taller',mk:()=>shFlat(shPoly([[-15,-4],[2,-4],[2,-10],[15,0],[2,10],[2,4],[-15,4]]),6)},
 {id:'brac',n:'Escuadra con hueco',cat:'Taller',mk:()=>{const s=shPoly([[0,0],[30,0],[0,30]]); shHole(s,8,8,3); return shFlat(s,5);}}
];
function addLibShape(it){
  let g; try{g=it.p?buildGeo(it.p):it.mk();}catch(e){console.error(e); msg('No se pudo crear esa forma.'); return;}
  const m=addMesh(g,undefined,newName(it.n)); if(it.p)m.userData.p={...it.p};
  m.geometry.computeBoundingBox(); m.position.set(0,-m.geometry.boundingBox.min.y,0); updateDims(); commit();
}
{
  let thumbs=null, cat='Todas';
  const mkThumbs=()=>{
    const out={}, W=128, r=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true}); r.setSize(W,W,false); r.setPixelRatio(1);
    const sc=new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xffffff,0x555566,1.4)); const d=new THREE.DirectionalLight(0xffffff,1.6); d.position.set(4,8,6); sc.add(d);
    const cm=new THREE.PerspectiveCamera(35,1,0.1,500);
    for(const it of SHAPELIB){
      try{
        const g=it.p?buildGeo(it.p):it.mk(); g.computeBoundingBox(); const b=g.boundingBox, c=b.getCenter(new THREE.Vector3()), sz=b.getSize(new THREE.Vector3()), L=sz.length();
        const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:0x6ea3ff,roughness:0.5,metalness:0.05})); m.position.copy(c).negate(); sc.add(m);
        cm.position.set(L*0.9,L*0.75,L*1.15); cm.lookAt(0,0,0); r.render(sc,cm); out[it.id]=r.domElement.toDataURL('image/png'); sc.remove(m); g.dispose(); m.material.dispose();
      }catch(e){console.error(e);}
    }
    r.dispose(); try{r.forceContextLoss();}catch(e){}
    return out;
  };
  const cats=['Todas',...new Set(SHAPELIB.map(i=>i.cat))];
  const draw=()=>{
    const q=$('#shpq').value.trim().toLowerCase(), g=$('#shpgrid'); g.textContent='';
    if(!$('#shpcats select')){const sl=document.createElement('select'); sl.setAttribute('aria-label','Categoría'); cats.forEach(c=>{const o=document.createElement('option'); o.value=c; o.textContent=c; sl.appendChild(o);}); sl.onchange=()=>{cat=sl.value; draw();}; $('#shpcats').appendChild(sl);} $('#shpcats select').value=cat;
    SHAPELIB.filter(it=>(cat==='Todas'||it.cat===cat)&&(!q||it.n.toLowerCase().includes(q)||it.cat.toLowerCase().includes(q))).forEach(it=>{
      const b=document.createElement('button'); b.type='button'; b.dataset.id=it.id; b.title='Agregar: '+it.n;
      const im=thumbs&&thumbs[it.id]?Object.assign(document.createElement('img'),{src:thumbs[it.id],alt:''}):Object.assign(document.createElement('div'),{className:'ph'});
      b.append(im,document.createTextNode(it.n)); b.onclick=()=>addLibShape(it); g.appendChild(b);
    });
    if(!g.children.length)g.textContent='No hay formas con ese nombre.';
  };
  $('#shpbtn').onclick=()=>{openPanel('#shpp'); draw(); if(!thumbs)setTimeout(()=>{try{thumbs=mkThumbs();}catch(e){console.error(e); thumbs={};} draw();},30);};
  $('#shpq').addEventListener('input',draw);
}

// ===== Redondear y chaflán, con vista previa =====
$('#rndbtn').onclick=()=>openPanel('#rndp');
function rdCompute(A,r,kind,which){
  const S=kind==='chamfer'?MF.Manifold.hull([[r,0,0],[-r,0,0],[0,r,0],[0,-r,0],[0,0,r],[0,0,-r]]):MF.Manifold.sphere(r,16), tmp=[S];
  try{
    const av=A.volume(); let cur=A;
    if(which!=='in'){const e=cur.minkowskiDifference(S); tmp.push(e); if(e.isEmpty()||e.volume()<av*0.02)return {err:'El radio es demasiado grande para esta pieza.'}; cur=e.minkowskiSum(S); tmp.push(cur);}
    if(which!=='out'){const d=cur.minkowskiSum(S); tmp.push(d); cur=d.minkowskiDifference(S); tmp.push(cur);}
    if(cur===A||cur.isEmpty())return {err:'No se pudo redondear esta pieza.'};
    const keep=cur, rv=keep.volume(); tmp.splice(tmp.indexOf(keep),1);
    return {R:keep,av,rv};
  }catch(e){console.error(e); return {err:'No se pudo redondear esta pieza (la forma es muy compleja).'};}
  finally{tmp.forEach(x=>{try{x.delete();}catch(e){}});}
}
let rd=null, rdBusy=false, rdTimer=0, rdErr='';
const rdVals=()=>({r:Math.max(0.1,parseFloat($('#rndr').value)||2), k:$('#rndk').value, w:$('#rndw').value});
function rdStop(){
  clearTimeout(rdTimer);
  if(rd){ if(rd.mesh){scene.remove(rd.mesh); rd.mesh.geometry.dispose(); rd.mesh.material.dispose();} try{rd.R&&rd.R.delete();}catch(e){} try{rd.A.delete();}catch(e){} rd.o.visible=!M_(rd.o).h; rd=null; }
}
async function rdStart(){
  if(rd||rdBusy||$('#rndp').hidden)return; const o=sel[sel.length-1]; if(!o)return; rdBusy=true;
  try{
    await loadManifold(); if(!MF||$('#rndp').hidden)return;
    rdErr=''; const A=toManifoldAuto(o), bb=A.boundingBox(); rd={o,A,R:null,mesh:null,key:'',zc:(bb.min[2]+bb.max[2])/2}; rdUpdate();
  }catch(err){console.error(err); rdErr=(err&&err.userMsg)||'No se pudo preparar la pieza para redondearla.'; $('#rndinfo').textContent=rdErr;}
  finally{rdBusy=false;}
}
function rdCut(){ if(!rd||!rd.mesh)return; const on=$('#rndcut').checked; rd.mesh.material.clippingPlanes=on?[new THREE.Plane(new THREE.Vector3(0,0,-1),rd.zc)]:[]; rd.mesh.material.side=on?THREE.DoubleSide:THREE.FrontSide; rd.mesh.material.needsUpdate=true; }
function rdUpdate(force){
  if(!rd)return; const v=rdVals(), key=v.r+'|'+v.k+'|'+v.w; if(!force&&key===rd.key&&(rd.mesh||rd.err||rd.manual))return; rd.key=key; rd.err=false; rd.manual=false;
  if(rd.R){try{rd.R.delete();}catch(e){} rd.R=null;}
  if(rd.mesh){scene.remove(rd.mesh); rd.mesh.geometry.dispose(); rd.mesh.material.dispose(); rd.mesh=null;}
  const heavy=rd.A.numTri()*(v.k==='chamfer'?8:128)*(v.w==='both'?2:1)>15000;
  if(heavy&&!force){rd.manual=true; rd.o.visible=!M_(rd.o).h; $('#rndcalc').hidden=false; $('#rndinfo').textContent='Esta pieza es compleja y el cálculo puede tardar varios segundos. Elegí los valores y tocá "Calcular vista previa".'; return;}
  $('#rndcalc').hidden=true; $('#rndinfo').textContent='Calculando… (puede tardar)';
  const my=rd; setTimeout(()=>{
    if(rd!==my||my.key!==key)return;
    const res=rdCompute(my.A,v.r,v.k,v.w);
    if(rd!==my||my.key!==key){res.R&&res.R.delete(); return;}
    if(res.err){my.err=true; my.o.visible=!M_(my.o).h; $('#rndinfo').textContent=res.err; return;}
    my.R=res.R; my.av=res.av; my.rv=res.rv;
    const g=fromManifold(res.R), mt=my.o.material.clone(); mt.emissive.setHex(0); const m=new THREE.Mesh(g,mt); m.raycast=()=>{}; m.castShadow=true; m.receiveShadow=true; m.frustumCulled=false;
    scene.add(m); my.mesh=m; my.o.visible=false; rdCut();
    const ch=Math.round(100*(res.rv-res.av)/res.av*10)/10;
    $('#rndinfo').textContent=(v.k==='chamfer'?'Chaflán':'Redondeado')+' de '+v.r+' mm. Cambio de volumen: '+(ch>0?'+':'')+ch+'%.'+(res.rv<res.av*0.7?' Ojo: se pierden partes finas.':'');
  },30);
}
$('#rndcalc').onclick=()=>rdUpdate(true);
const rdSoon=()=>{clearTimeout(rdTimer); rdTimer=setTimeout(rdUpdate,220);};
$('#rndr').addEventListener('input',()=>{const v=parseFloat($('#rndr').value); if(v>=0.2&&v<=10)$('#rnds').value=v; rdSoon();});
$('#rnds').addEventListener('input',()=>{$('#rndr').value=$('#rnds').value; rdSoon();});
$('#rndk').addEventListener('change',rdSoon); $('#rndw').addEventListener('change',rdSoon); $('#rndcut').addEventListener('change',rdCut);
new MutationObserver(()=>{ if($('#rndp').hidden)rdStop(); else rdStart(); }).observe($('#rndp'),{attributes:true,attributeFilter:['hidden']});
setInterval(()=>{ if($('#rndp').hidden)return; const o=sel[sel.length-1]; if(rd&&rd.o!==o)rdStop(); if(!rd)rdStart(); },300);
$('#rndgo').onclick=async()=>{
  if(!rd&&!rdBusy)await rdStart();
  if(!rd){msg(rdErr||'Elegí la pieza que querés redondear.'); return;}
  clearTimeout(rdTimer); if(!rd.R||rd.manual)rdUpdate(true);
  const t0=Date.now(); while(rd&&!rd.R&&!rd.err&&Date.now()-t0<240000)await new Promise(r=>setTimeout(r,50));
  if(!rd||!rd.R){msg($('#rndinfo').textContent||'No se pudo redondear.'); return;}
  const o=rd.o, v=rdVals();
  try{
    const g=fromManifold(rd.R), m=new THREE.Mesh(g,o.material.clone()); m.material.emissive.setHex(0); recenter(m);
    m.userData.m={n:M_(o).n+(v.k==='chamfer'?' (chaflán)':' (redondeada)'),h:false,l:false,k:!!M_(o).k}; fxRecord('round',{r:v.r,k:v.k,w:v.w},[o],m);
    rdStop(); replacePiece(o,[m]); select([m]); commit(); $('#rndp').hidden=true;
    msg((v.k==='chamfer'?'Chaflán':'Redondeado')+' aplicado con radio de '+v.r+' mm.');
  }catch(err){console.error(err); msg('No se pudo aplicar.');}
};

// ===== Historial editable por pieza =====
// Cada pieza que sale de Redondear, Vaciar, Unir, Restar o Intersectar guarda de dónde vino (userData.fx).
// Los pasos de Redondear y Vaciar se recalculan con otros valores; en las operaciones con varias piezas,
// "Editar piezas" devuelve las originales para moverlas y volver a aplicar.
var fxId=0, fxShown='';
const fxItem=s=>({geo:s.geometry,pos:s.position.toArray(),q:s.quaternion.toArray(),sc:s.scale.toArray(),c:s.material.color.getHex(),meta:JSON.parse(JSON.stringify(M_(s))),p:s.userData.p?{...s.userData.p}:null,fx:s.userData.fx||null});
function fxRecord(k,params,srcs,res){ res.updateMatrix(); res.userData.fx={id:++fxId,k,params,items:srcs.map(fxItem),res0:res.matrix.toArray()}; }
function fxMeshFrom(it){
  const m=new THREE.Mesh(it.geo,new THREE.MeshStandardMaterial({color:it.c,roughness:0.55,metalness:0.05}));
  m.position.fromArray(it.pos); m.quaternion.fromArray(it.q); m.scale.fromArray(it.sc); m.updateMatrix(); m.updateMatrixWorld(true); return m;
}
function packGeoFx(g){const a=g.attributes; return {pos:b64(a.position.array),nor:a.normal?b64(a.normal.array):null,idx:g.index?{t:g.index.array instanceof Uint16Array?16:32,d:b64(g.index.array)}:null};}
function unpackGeoFx(d){
  const geo=new THREE.BufferGeometry(), pos=unb64(d.pos,Float32Array);
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  if(d.nor)geo.setAttribute('normal',new THREE.BufferAttribute(unb64(d.nor,Float32Array),3)); else geo.computeVertexNormals();
  geo.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(pos.length/3*2),2));
  if(d.idx)geo.setIndex(new THREE.BufferAttribute(unb64(d.idx.d,d.idx.t===16?Uint16Array:Uint32Array),1));
  return geo;
}
function packFx(n){return {k:n.k,params:n.params,res0:n.res0,items:n.items.map(it=>({g:it.p?null:packGeoFx(it.geo),pos:it.pos,q:it.q,sc:it.sc,c:it.c,meta:it.meta,p:it.p,fx:it.fx?packFx(it.fx):null}))};}
function unpackFx(d){return {id:++fxId,k:d.k,params:d.params,res0:d.res0,items:d.items.map(it=>({geo:it.p?buildGeo(it.p):unpackGeoFx(it.g),pos:it.pos,q:it.q,sc:it.sc,c:it.c,meta:it.meta,p:it.p,fx:it.fx?unpackFx(it.fx):null}))};}
// recalcula un paso de Redondear o Vaciar; devuelve {geo,W} (W = matriz de la pieza resultado) o {err}
function fxEval(node){
  if(node.k==='sketch')return sketchBuild(node.params);
  const src=fxMeshFrom(node.items[0]); let A=null, res=null;
  try{
    A=toManifold(src);
    res=node.k==='shell'?shellCompute(A,node.params.t,node.params.open):rdCompute(A,node.params.r,node.params.k,node.params.w);
    if(res.err)return {err:res.err};
    const m=new THREE.Mesh(fromManifold(res.R),src.material); recenter(m); m.updateMatrix();
    return {geo:m.geometry,W:m.matrix.clone()};
  }catch(e){console.error(e); return {err:'No se pudo recalcular este paso.'};}
  finally{try{res&&res.R&&res.R.delete();}catch(e){} try{A&&A.delete();}catch(e){}}
}
const fxChain=o=>{const c=[]; for(let n=o.userData.fx;n;n=(n.k!=='bool'&&n.items[0])?n.items[0].fx:null)c.push(n); return c;};
let fxBusy=false;
async function fxEdit(o,depth,patch){
  if(fxBusy)return; const chain=fxChain(o), tgt=chain[depth]; if(!tgt||tgt.k==='bool')return;
  fxBusy=true; await busyOn('Recalculando…');
  try{
    await loadManifold(); if(!MF)throw new Error('mf');
    o.updateMatrix(); let below=null, prev=null, last=null;
    const posM=it=>new THREE.Matrix4().compose(new THREE.Vector3().fromArray(it.pos),new THREE.Quaternion().fromArray(it.q),new THREE.Vector3().fromArray(it.sc));
    for(let i=depth;i>=0;i--){
      const old=chain[i];
      const node=i===depth?{...old,id:++fxId,params:{...old.params,...patch}}:{...old,id:++fxId,items:[{...old.items[0],geo:prev.geo,pos:prev.pos,q:prev.q,sc:prev.sc,fx:below}]};
      const r=fxEval(node); if(r.err){msg(r.err); return;}
      const Mn=i>0?posM(chain[i-1].items[0]):o.matrix.clone();
      const D=Mn.multiply(new THREE.Matrix4().fromArray(old.res0).invert()), Wf=D.multiply(r.W);
      node.res0=r.W.toArray(); below=node;
      const p=new THREE.Vector3(), q=new THREE.Quaternion(), sc=new THREE.Vector3(); Wf.decompose(p,q,sc);
      prev={geo:r.geo,pos:p.toArray(),q:q.toArray(),sc:sc.toArray()}; last=node;
    }
    o.geometry=prev.geo; o.position.fromArray(prev.pos); o.quaternion.fromArray(prev.q); o.scale.fromArray(prev.sc); o.userData.fx=last; sgCache.g=null;
    fxShown=''; updateDims(); commit(); msg('Paso recalculado.');
  }catch(err){console.error(err); msg('No se pudo recalcular.');}
  finally{busyOff(); fxBusy=false;}
}
function fxExplode(o){
  const fx=o.userData.fx; if(!fx||fx.k!=='bool')return;
  const meshes=fx.items.map(it=>{const m=fxMeshFrom(it); m.userData.m=JSON.parse(JSON.stringify(it.meta)); if(it.p)m.userData.p={...it.p}; if(it.fx)m.userData.fx=it.fx; return m;});
  replacePiece(o,meshes); select(meshes); commit();
  msg('Volvieron las '+meshes.length+' piezas originales. Movelas o cambialas y volvé a usar '+({union:'Unir',subtract:'Restar',intersect:'Intersectar'}[fx.params.kind]||'la operación')+'.');
}
function renderFx(o){
  const box=$('#fxrow'); if(!box)return; const fx=o&&o.userData.fx;
  if(!fx){box.hidden=true; fxShown=''; return;}
  box.hidden=false; const key=fx.id+'|'+o.uuid; if(key===fxShown)return; fxShown=key;
  const list=$('#fxlist'); list.textContent=''; let d=0;
  const num=(v,title,step,min,cb)=>{const l=document.createElement('label'); l.className='ax'; l.title=title; const sp=document.createElement('span'); sp.textContent=title.charAt(0); const i=document.createElement('input'); i.type='number'; i.step=step; i.min=min; i.value=v; i.onchange=()=>{const x=parseFloat(i.value); if(x>=+min)cb(x); else i.value=v;}; l.append(sp,i); return l;};
  for(let n=fx;n;n=(n.k!=='bool'&&n.items[0])?n.items[0].fx:null,d++){
    const depth=d, row=document.createElement('div'), b=document.createElement('b'); row.className='fxr';
    if(n.k==='shell'){
      b.textContent='Vaciar'; row.append(b,num(n.params.t,'Espesor de pared (mm)','0.1','0.2',x=>fxEdit(o,depth,{t:x})));
      const l=document.createElement('label'); l.className='fxck'; const c=document.createElement('input'); c.type='checkbox'; c.checked=!!n.params.open; c.onchange=()=>fxEdit(o,depth,{open:c.checked}); l.append(c,' abierta arriba'); row.append(l);
    } else if(n.k==='round'){
      b.textContent=n.params.k==='chamfer'?'Chaflán':'Redondeado'; row.append(b,num(n.params.r,'Radio (mm)','0.1','0.1',x=>fxEdit(o,depth,{r:x})));
      const s=document.createElement('select'); s.innerHTML='<option value="round">Redondeada</option><option value="chamfer">Chaflán</option>'; s.value=n.params.k; s.onchange=()=>fxEdit(o,depth,{k:s.value}); row.append(s);
    } else if(n.k==='sketch'){
      const rv=n.params.mode==='revolve'; b.textContent='Boceto · '+(rv?'Revolucionar':'Extruir'); row.append(b);
      if(rv)row.append(num(n.params.deg,'Giro (grados)','5','1',x=>fxEdit(o,depth,{deg:Math.min(360,x)}))); else row.append(num(n.params.h,'Altura (mm)','0.5','0.1',x=>fxEdit(o,depth,{h:x})));
      if(depth===0){const bt=document.createElement('button'); bt.type='button'; bt.textContent='Editar boceto'; bt.onclick=()=>skStart({plane:n.params.plane,shapes:n.params.shapes,mode:n.params.mode,h:n.params.h,deg:n.params.deg,piece:o}); row.append(bt);}
    } else {
      const nm={union:'Unir',subtract:'Restar',intersect:'Intersectar'}[n.params.kind]||'Combinar';
      b.textContent=nm+' ('+n.items.length+' piezas)'; const bt=document.createElement('button'); bt.type='button'; bt.textContent='Editar piezas'; bt.title='Devuelve las piezas originales para moverlas y volver a aplicar'; bt.onclick=()=>fxExplode(o); row.append(b,bt);
    }
    list.appendChild(row);
  }
}



// ===== Cortar unificado (partes iguales / con un plano) =====
$('#fitmode [data-fm=plane]').onclick=()=>{ $('#fitp').hidden=true; fitPrevClear(); if(!sel.length){msg('Elegí la pieza que querés dividir.'); return;} startSplit(); };
$('#sparts').onclick=()=>{ endSplit(); setTimeout(()=>$('#fitbtn').click(),0); };

// ===== Recorrido inicial =====
const TOUR_STEPS=[
  {t:'Bienvenido a Constructor 3D',x:'Te muestro lo básico en menos de un minuto. Podés saltearlo cuando quieras y volver a verlo desde la ayuda (?).'},
  {q:['.rplus','#ribbon','#shapes','#quick'],t:'Agregá formas',x:'Tocá el + amarillo para elegir una forma y ponerla en el centro de la cama (también con la tecla A). En la pestaña Crear están el Texto 3D, el SVG, el Sketch 2D y tu Biblioteca.'},
  {q:['#trail','#lrail'],t:'Mové, rotá y escalá',x:'Elegí una pieza y usá estos botones, o arrastrá las flechas de colores que aparecen sobre ella.'},
  {q:['#ribbon .rtabs [data-t=modificar]','[data-op=union]'],t:'Combiná y dá forma',x:'Unir, Restar e Intersectar combinan piezas. Con Hueco una pieza se resta. Vaciar, Redondear y Dividir le dan forma.'},
  {q:['#insp #dims','#dims'],t:'Medidas exactas',x:'Con la pieza elegida podés escribir medidas, posición, rotación y color en números.'},
  {q:['#vcube'],t:'Cubo de vistas',x:'Tocá una cara para mirar desde ahí, o arrastralo para orbitar. Con clic derecho o dos dedos movés la vista.'},
  {q:['#stl','#cmdbtn'],t:'Exportá para imprimir',x:'Exportar genera el STL o el 3MF con las medidas en mm. Tus cambios se guardan solos en este navegador.'}
];
var tourI=-1;
function tourEl(q){ for(const sel of (q||[])){ const e=document.querySelector(sel); if(e){const r=e.getBoundingClientRect(); if(r.width>4&&r.height>4)return e;} } return null; }
function tourEnd(done){ const c=$('#tour'); if(c)c.remove(); const h=$('#tourhl'); if(h)h.remove(); tourI=-1; try{localStorage.setItem('c3d_tour','1');}catch(e){} }
function tourShow(i){
  const steps=TOUR_STEPS.map((st,k)=>({st,k,el:st.q?tourEl(st.q):null})).filter(o=>!o.st.q||o.el);
  if(i<0)i=0; if(i>=steps.length){tourEnd(true); return;} tourI=i;
  const o=steps[i]; $('#tour')&&$('#tour').remove(); $('#tourhl')&&$('#tourhl').remove();
  const card=document.createElement('div'); card.id='tour'; card.setAttribute('role','dialog');
  card.innerHTML='<b></b><p></p><div class="row"><small></small><span><button type="button" data-a="skip">Saltar</button><button type="button" data-a="prev">Anterior</button><button type="button" data-a="next" class="pri"></button></span></div>';
  card.querySelector('b').textContent=o.st.t; card.querySelector('p').textContent=o.st.x; card.querySelector('small').textContent=(i+1)+' de '+steps.length;
  const last=i===steps.length-1; card.querySelector('[data-a=next]').textContent=last?'Listo':'Siguiente'; if(i===0)card.querySelector('[data-a=prev]').hidden=true;
  document.body.appendChild(card); const z=zf();
  let L=Math.max(8,innerWidth/2-150)*1, T=Math.max(8,innerHeight/2-70);
  if(o.el){
    const r=o.el.getBoundingClientRect(), hl=document.createElement('div'); hl.id='tourhl'; hl.style.cssText='left:'+(r.left-4)/z+'px;top:'+(r.top-4)/z+'px;width:'+(r.width+8)/z+'px;height:'+(r.height+8)/z+'px'; document.body.appendChild(hl);
    const cw=card.offsetWidth*z, ch=card.offsetHeight*z;
    if(r.bottom+ch+16<innerHeight){T=r.bottom+10; L=r.left;} else if(r.top-ch-16>0){T=r.top-ch-10; L=r.left;} else if(r.left>cw+16){L=r.left-cw-10; T=Math.max(8,r.top);} else {L=r.right+10; T=Math.max(8,r.top);}
    L=Math.min(Math.max(8,L),innerWidth-cw-8); T=Math.min(Math.max(8,T),innerHeight-ch-8);
  }
  card.style.left=L/z+'px'; card.style.top=T/z+'px';
  card.onclick=e=>{const a=e.target.dataset&&e.target.dataset.a; if(!a)return; if(a==='skip')tourEnd(); else if(a==='next')tourShow(i+1); else tourShow(i-1);};
  card.querySelector('[data-a=next]').focus();
}
function tourStart(){ tourEnd(); tourShow(0); }
$('#tourbtn').onclick=()=>{toggleHelp(false); tourStart();};
addEventListener('keydown',e=>{ if(tourI>=0&&e.key==='Escape'){e.stopImmediatePropagation(); tourEnd();} },true);
{ let seen=false, used=false; try{seen=localStorage.getItem('c3d_tour')==='1'; used=['c3d_bed','c3d_look','c3d_grid','c3d_ruler','c3d_fold'].some(k=>localStorage.getItem(k)!==null);}catch(e){}
  if(!seen&&!used&&!navigator.webdriver&&!window.claude)setTimeout(tourStart,1800); }
// ===== Biblioteca de piezas propias =====
var LIB=[];
async function libLoad(){const v=await idbGetK('lib'); LIB=Array.isArray(v)?v:[]; libRender();}
async function libPersist(){const ok=await idbSetK('lib',LIB); if(!ok)msg('No se pudo guardar la biblioteca en este navegador.'); return ok;}
function libRender(){
  const box=$('#liblist'); if(!box)return; box.textContent='';
  if(!LIB.length){const e=document.createElement('small'); e.textContent='Todavía no guardaste piezas. Elegí una o varias piezas, poné un nombre y tocá Guardar.'; box.appendChild(e); return;}
  LIB.forEach(it=>{
    const r=document.createElement('div'); r.className='librow'; const t=document.createElement('span'); t.className='libn'; t.textContent=it.n; const sm=document.createElement('small'); sm.textContent=(it.objs.length>1?it.objs.length+' piezas · ':'')+(it.d?it.d.map(x=>Math.round(x)).join(' × ')+' mm':''); t.appendChild(sm);
    const u=document.createElement('button'); u.type='button'; u.className='pri'; u.textContent='Usar'; u.onclick=()=>libUse(it);
    const x=document.createElement('button'); x.type='button'; x.textContent='✕'; x.title='Borrar de la biblioteca'; x.onclick=async()=>{LIB=LIB.filter(q=>q!==it); await libPersist(); libRender();};
    r.append(t,u,x); box.appendChild(r);
  });
}
$('#libbtn').onclick=()=>{ if(openPanel('#libp')){ const o=sel[sel.length-1]; $('#libname').value=o?M_(o).n:''; libLoad(); } };
$('#libsave').onclick=async()=>{
  if(!sel.length){msg('Elegí la pieza (o las piezas) que querés guardar.'); return;}
  const name=($('#libname').value||'').trim()||M_(sel[0]).n, bb=new THREE.Box3(); sel.forEach(o=>{o.updateMatrixWorld(true); bb.union(new THREE.Box3().setFromObject(o));});
  const sz=bb.getSize(new THREE.Vector3()), it={id:Date.now()+'-'+Math.random().toString(36).slice(2,6),n:name,t:Date.now(),d:[sz.x,sz.y,sz.z],objs:serializeObjs(sel)};
  LIB.unshift(it); if(await libPersist()){libRender(); msg('Guardada en la biblioteca: '+name+'.');} else LIB.shift();
};
function libUse(it){
  const ms=it.objs.map(objFromData); const bb=new THREE.Box3();
  ms.forEach(m=>{m.updateMatrixWorld(true); bb.union(new THREE.Box3().setFromObject(m));});
  const c=bb.getCenter(new THREE.Vector3()), dx=-c.x, dz=-c.z, dy=-bb.min.y;
  ms.forEach(m=>{m.position.x+=dx; m.position.z+=dz; m.position.y+=dy; m.userData.m=Object.assign({},m.userData.m,{n:newName(String(m.userData.m&&m.userData.m.n||'Pieza').replace(/ \d+$/,''))}); scene.add(m); objs.push(m);});
  select(ms); updateDims(); commit(); msg('Agregada desde la biblioteca: '+it.n+'.');
}
$('#libexp').onclick=async()=>{ if(!LIB.length){msg('La biblioteca está vacía.'); return;} await saveFile('biblioteca3d.json',JSON.stringify({app:'constructor3d-lib',v:1,items:LIB}),'Para recuperarla en otro navegador, usá Importar en la Biblioteca.'); };
$('#libimp').onclick=()=>$('#libfile').click();
$('#libfile').onchange=async e=>{
  const f=e.target.files[0]; e.target.value=''; if(!f)return;
  try{const d=JSON.parse(await f.text()); if(!d||d.app!=='constructor3d-lib'||!Array.isArray(d.items))throw new Error('formato');
    let n=0; d.items.forEach(it=>{if(it&&it.n&&Array.isArray(it.objs)&&!LIB.some(q=>q.id===it.id)){LIB.push(it); n++;}});
    await libPersist(); libRender(); msg(n?('Se importaron '+n+' pieza(s) a la biblioteca.'):'Esas piezas ya estaban en la biblioteca.');
  }catch(err){msg('Ese archivo no es una biblioteca de Constructor 3D.');}
};
