'use strict';
// Constructor 3D: escena, piezas, historial, formas y alinear.
// Los scripts de js/ comparten el ámbito global y se cargan en orden desde index.html.
THREE.Mesh.prototype.raycast=acceleratedRaycast; THREE.BufferGeometry.prototype.computeBoundsTree=computeBoundsTree;

const $=s=>document.querySelector(s), msg=t=>{const e=$('#msg'); e.textContent=t; e.classList.remove('off'); clearTimeout(msg.t); msg.t=setTimeout(()=>e.classList.add('off'),t.length>90?9000:6000);};
const canvas=$('#c'), wrap=$('#wrap');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true}); renderer.setClearColor(0x000000,0);
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
// Dibujo bajo demanda: solo se redibuja si hubo actividad (mouse, teclado, cámara, cambios) o cada 1 s como red de seguridad
let awakeUntil=0, lastDraw=0; const wake=(ms=1500)=>{awakeUntil=Math.max(awakeUntil,performance.now()+ms);};
['pointerdown','pointermove','pointerup','wheel','keydown','keyup','input','change','click','dblclick','resize','focus','dragover','drop','touchstart','touchmove','contextmenu'].forEach(t=>addEventListener(t,()=>wake(),{capture:true,passive:true}));
addEventListener('visibilitychange',()=>wake(3000)); wake(4000);
const scene=new THREE.Scene();
const camP=new THREE.PerspectiveCamera(50,1,0.1,1000); camP.position.set(60,50,80);
const camO=new THREE.OrthographicCamera(-60,60,60,-60,-2000,4000), ORTH_H=120; let cam=camP, ortho=false;
const hemi=new THREE.HemisphereLight(0xffffff,0x555566,1.1); scene.add(hemi);
const dl=new THREE.DirectionalLight(0xffffff,1.4); dl.position.set(5,10,7); scene.add(dl);
const grid=new THREE.GridHelper(20,20,0x7fa6d8,0x4f6f9e); grid.material.transparent=true; grid.material.opacity=0.25; grid.material.depthWrite=false; grid.scale.setScalar(10); scene.add(grid);

const orbit=new OrbitControls(cam,canvas); orbit.enableDamping=true;
const tc=new TransformControls(cam,canvas); scene.add(tc);
tc.addEventListener('dragging-changed',e=>orbit.enabled=!e.value);
// Imán de rotación: se pega a múltiplos de 45° (0, 45, 90…) cerca de ellos. Shift lo desactiva.
let shiftDown=false; addEventListener('keydown',e=>{if(e.key==='Shift')shiftDown=true;}); addEventListener('keyup',e=>{if(e.key==='Shift')shiftDown=false;}); addEventListener('blur',()=>{shiftDown=false;});
const MAG_STEP=THREE.MathUtils.degToRad(45), MAG_TOL=THREE.MathUtils.degToRad(4);
function magnetRot(o){
  if(!o||shiftDown)return; const r=o.rotation; let hit=false;
  ['x','y','z'].forEach(ax=>{const n=Math.round(r[ax]/MAG_STEP)*MAG_STEP; if(Math.abs(r[ax]-n)<MAG_TOL&&r[ax]!==n){r[ax]=n; hit=true;}});
  if(hit)o.updateMatrixWorld(true);
}
tc.addEventListener('objectChange',()=>{ if(tc.mode==='rotate'&&tc.dragging)magnetRot(tc.object); updateDims(); });
tc.addEventListener('mouseUp',()=>{const o=sel[sel.length-1]; if(o&&o.userData.p&&tc.mode==='scale'){rebuild(o);updateDims();} commit();});

const objs=[]; let sel=[];
// cada pieza tiene nombre (n), oculta (h), bloqueada (l), hueco (k) y, si es texto, sus datos (tx)
const nameCount={};
function newName(base){nameCount[base]=(nameCount[base]||0)+1; return base+' '+nameCount[base];}
function M_(o){return o.userData.m||(o.userData.m={n:newName('Pieza'),h:false,l:false,k:false});}
const pickable=()=>objs.filter(o=>o.visible&&!M_(o).l);
const colors=[0x4f8cff,0xff7a59,0x4cc38a,0xf5c542,0xb07cff];
let ci=0;
const shapes={
  box:()=>new THREE.BoxGeometry(25,25,25),
  sphere:()=>new THREE.SphereGeometry(12.5,32,24),
  cylinder:()=>new THREE.CylinderGeometry(12.5,12.5,25,48),
  cone:()=>cleanGeo(new THREE.ConeGeometry(12.5,25,48)),
  torus:()=>new THREE.TorusGeometry(8.75,3.75,16,48),
  tube:()=>{const V=THREE.Vector2; return cleanGeo(new THREE.LatheGeometry([new V(8,-12.5),new V(12.5,-12.5),new V(12.5,12.5),new V(8,12.5),new V(8,-12.5)],64));},
  hemi:()=>{const V=THREE.Vector2, p=[new V(0,0)]; for(let i=0;i<=16;i++){const a=Math.PI/2*i/16; p.push(new V(12.5*Math.cos(a),12.5*Math.sin(a)));} return cleanGeo(new THREE.LatheGeometry(p,48));},
  pyramid:()=>cleanGeo(new THREE.ConeGeometry(12.5*Math.SQRT2,25,4).rotateY(Math.PI/4)),
  hex:()=>new THREE.CylinderGeometry(12.5,12.5,25,6),
  wedge:()=>{const V=THREE.Vector2; return new THREE.ExtrudeGeometry(new THREE.Shape([new V(-12.5,-12.5),new V(12.5,-12.5),new V(-12.5,12.5)]),{depth:25,bevelEnabled:false}).translate(0,0,-12.5);}
};
const SHAPE_NAMES={box:'Cubo',sphere:'Esfera',cylinder:'Cilindro',cone:'Cono',torus:'Toroide',tube:'Tubo',hemi:'Media esfera',pyramid:'Pirámide',hex:'Prisma',wedge:'Cuña'};
function cleanGeo(g){const w=weldGeo(g,1e-5), t=cleanTris(w.vp,w.tv); return geoFromIndexed(new Float32Array(w.vp),new Uint32Array(t));}
const mat=()=>new THREE.MeshStandardMaterial({color:colors[ci++%colors.length],roughness:0.55,metalness:0.05});

function addMesh(geo,m=mat(),name){
  const mesh=new THREE.Mesh(geo,m); mesh.userData.m={n:name||newName('Pieza'),h:false,l:false,k:false};
  scene.add(mesh); objs.push(mesh); select([mesh]); return mesh;
}
function select(list){wake(); setTimeout(()=>{try{arrUpdate(); estUpdate();}catch(_){}},0);
  sel.forEach(o=>o.material.emissive.setHex(0));
  sel=list;
  sel.forEach(o=>o.material.emissive.setHex(0x5a4410));
  if(sel.length&&!M_(sel[sel.length-1]).l) tc.attach(sel[sel.length-1]); else tc.detach();
  updateDims();
}

document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{
  const t=b.dataset.add, P={box:{t:'box',w:25,h:25,d:25,r:0,soft:true},cylinder:{t:'cyl',w:25,h:25,d:25,r:0,soft:true}}[t]; const m=addMesh(P?buildGeo(P):shapes[t](),undefined,newName(SHAPE_NAMES[t]||'Pieza')); if(P){m.userData.p={...P};updateDims();} m.geometry.computeBoundingBox(); const hb=m.geometry.boundingBox;
  // aparece como fantasma que sigue al cursor hasta que se apoya (ver 'Ubicar pieza nueva')
  m.position.set(0,-hb.min.y,0); updateDims(); startPlace(m);
});
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{
  freeUI=b.dataset.mode==='free'; scaleUI=b.dataset.mode==='scale'||freeUI; tc.setMode(scaleUI?'translate':b.dataset.mode); tc.enabled=!scaleUI; if(freeUI)msg('Manipular: arrastrá la pieza para moverla, los puntos para escalar, las flechas curvas para rotar y la flecha amarilla para subirla.'); else if(scaleUI)msg('Escalar: arrastrá los puntos de las esquinas (proporcional) o los de las caras (un solo eje).');
  document.querySelectorAll('[data-mode]').forEach(x=>x.classList.toggle('on',x===b));
});

['x','y','z'].forEach(k=>$('#p'+k).addEventListener('input',e=>{const o=sel[sel.length-1],v=parseFloat(e.target.value);if(!o||isNaN(v))return;o.position[k]=v;}));
const hist=[], redoSt=[]; let cur=[];
const snap=()=>objs.map(o=>{geoSeen.add(o.geometry); return {g:o.geometry,c:o.material.color.getHex(),p:o.position.clone(),q:o.quaternion.clone(),s:o.scale.clone(),u:o.userData.p?{...o.userData.p}:null,f:o.userData.fx||null,m:JSON.parse(JSON.stringify(M_(o)))};});
const keyMemo=new WeakMap();
const key=s=>{let k=keyMemo.get(s); if(k===undefined){k=JSON.stringify(s.map(d=>[d.g.uuid,d.c,d.p.toArray(),d.q.toArray(),d.s.toArray(),d.m,d.f?d.f.id:0])); keyMemo.set(s,k);} return k;};
// Libera de la memoria de video las geometrías que ya no están en el historial ni en escena (dispose() es seguro: se vuelve a subir si hiciera falta)
const geoSeen=new Set();
function sweepGeos(){
  const used=new Set(); objs.forEach(o=>used.add(o.geometry));
  [...hist,...redoSt,cur].forEach(st=>st&&st.forEach(d=>used.add(d.g)));
  geoSeen.forEach(g=>{if(!used.has(g)){g.dispose(); geoSeen.delete(g);}});
}
function commit(){wake(2500); setTimeout(()=>{try{estUpdate();}catch(_){}},0); const n=snap(); if(key(n)===key(cur))return; hist.push(cur); if(hist.length>60)hist.shift(); cur=n; redoSt.length=0; sweepGeos(); refreshBtns(); scheduleSave(); markDirty(true); renderList();}
function restore(st){wake(2500);
  objs.forEach(o=>scene.remove(o)); objs.length=0; sel=[]; tc.detach();
  st.forEach(d=>{const m=new THREE.Mesh(d.g,new THREE.MeshStandardMaterial({color:d.c,roughness:0.55,metalness:0.05}));
    m.position.copy(d.p); m.quaternion.copy(d.q); m.scale.copy(d.s); if(d.u)m.userData.p={...d.u}; if(d.f)m.userData.fx=d.f; if(d.m)m.userData.m=JSON.parse(JSON.stringify(d.m)); scene.add(m); objs.push(m);});
  updateDims();
}
function refreshBtns(){
  const set=(s,off)=>{const b=document.querySelector(s); if(b)b.disabled=off;};
  set('#undo',!hist.length); set('#redo',!redoSt.length);
  set('[data-op="union"]',sel.length<2); set('[data-op="intersect"]',sel.length<2); set('[data-op="subtract"]',!sel.length);
  set('#hole',!sel.length); set('#pattern',!sel.length); set('#face',!objs.length); set('#measure',!objs.length);
  {const hb=document.querySelector('#hole'); if(hb)hb.classList.toggle('on',sel.length>0&&sel.every(o=>M_(o).k));}
  set('#dup',!sel.length); set('#dividir',!sel.length); set('#ground',!sel.length); set('#alinear',!sel.length); set('#del',!sel.length); set('#stl',!objs.length); set('#chk',!objs.length);
}
let secOn=false, wireOn=false, ghostOn=false, dimOn=!matchMedia('(pointer:coarse)').matches;
function applyGhost(){
  objs.forEach(o=>{
    if(typeof placing!=='undefined'&&placing&&placing.m===o)return;
    const mm=M_(o), k=mm.k, dim=!ghostOn&&dimOn&&sel.length>0&&objs.length>1&&!sel.includes(o), g=(ghostOn&&sel.length>0&&!sel.includes(o))||dim, m=o.material, tr=g||k;
    if(m.transparent!==tr){m.transparent=tr;m.needsUpdate=true;}
    m.opacity=k?(g?0.15:0.4):dim?0.55:g?0.25:1; m.depthWrite=dim?true:!tr;
    if(m.visible===wireOn)m.visible=!wireOn; wireEdges(o,wireOn&&!mm.h&&!k,sel.includes(o));
    o.visible=!mm.h; holeEdges(o,k);
  });
}
// Wireframe: solo las aristas de forma (sin triángulos internos en caras planas)
const wireLn=new WeakMap(), wireMatN=new THREE.LineBasicMaterial({color:0xdce8ff,transparent:true,opacity:.95,depthTest:false}), wireMatS=new THREE.LineBasicMaterial({color:0xFFB020,transparent:true,opacity:1,depthTest:false});
function wireEdges(o,on,isSel){
  let ln=wireLn.get(o);
  if(ln&&(!on||ln.userData.g!==o.geometry)){o.remove(ln); ln.geometry.dispose(); wireLn.delete(o); ln=null;}
  if(on&&!ln&&o.geometry.attributes.position.count<=300000){ln=new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry,1),wireMatN); ln.userData.g=o.geometry; ln.renderOrder=5; o.add(ln); wireLn.set(o,ln);}
  if(ln)ln.material=isSel?wireMatS:wireMatN;
}
// los huecos se ven translúcidos y con sus aristas marcadas
const holeLn=new WeakMap(), holeMat=new THREE.LineBasicMaterial({color:0x5b6170,transparent:true,opacity:0.9});
function holeEdges(o,on){
  let ln=holeLn.get(o);
  if(ln&&(!on||ln.userData.g!==o.geometry)){o.remove(ln); ln.geometry.dispose(); holeLn.delete(o); ln=null;}
  if(on&&!ln&&o.geometry.attributes.position.count<=300000){ln=new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry,25),holeMat); ln.userData.g=o.geometry; o.add(ln); holeLn.set(o,ln);}
}
$('#wire').onclick=()=>{wireOn=!wireOn;$('#wire').classList.toggle('on',wireOn);applyGhost();msg(wireOn?'Wireframe: se ven solo las aristas de las piezas.':'Wireframe desactivado.');};
$('#ghost').onclick=()=>{ghostOn=!ghostOn;$('#ghost').classList.toggle('on',ghostOn);applyGhost();msg(ghostOn?'Modo transparente: los objetos no seleccionados se ven semitransparentes.':'Modo transparente desactivado.');};
let splitting=null; const tp=new TransformControls(cam,canvas); scene.add(tp);
tp.addEventListener('dragging-changed',e=>orbit.enabled=!e.value);
function setAxis(ax){
  if(!splitting)return;
  const pl=splitting.plane, c=new THREE.Box3().setFromObject(splitting.obj).getCenter(new THREE.Vector3());
  pl.position.copy(c); pl.rotation.set(ax==='y'?-Math.PI/2:0, ax==='x'?Math.PI/2:0, 0);
  document.querySelectorAll('[data-ax]').forEach(b=>b.classList.toggle('on',b.dataset.ax===ax));
}
function startSplit(){
  const o=sel[sel.length-1]; if(!o){msg('Seleccioná la pieza que querés dividir.');return;}
  const sz=new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3()), L=Math.max(sz.x,sz.y,sz.z);
  const pl=new THREE.Mesh(new THREE.PlaneGeometry(L*1.6,L*1.6),new THREE.MeshBasicMaterial({color:0xff5a5f,transparent:true,opacity:0.3,side:THREE.DoubleSide,depthWrite:false}));
  pl.add(new THREE.LineSegments(new THREE.EdgesGeometry(pl.geometry),new THREE.LineBasicMaterial({color:0xff5a5f})));
  scene.add(pl); splitting={obj:o,plane:pl,L};
  PANELS.forEach(p=>$(p).hidden=true); clearOpenLines(); if(tool)setTool(null);
  tc.detach(); $('#dims').style.display='none'; $('#splitp').hidden=false; $('#dividir').classList.add('on');
  setAxis('y'); tp.setMode('translate'); tp.attach(pl);
  msg('Mové o rotá el plano (botones Mover / Rotar) y tocá Dividir en el panel.');
}
function endSplit(){
  if(!splitting)return;
  tp.detach(); scene.remove(splitting.plane); splitting.plane.geometry.dispose(); splitting=null;
  $('#splitp').hidden=true; $('#dims').style.display=''; $('#dividir').classList.remove('on');
  if(sel.length&&objs.includes(sel[sel.length-1])) tc.attach(sel[sel.length-1]);
}
async function busyOn(t){wake(); let tri=0; sel.forEach(o=>{const g=o.geometry; tri+=(g.index?g.index.count:g.attributes.position.count)/3;}); if(tri>400000)t+=' (pieza pesada: puede tardar)'; const b=$('#busy'); b.textContent=t; b.hidden=false; await new Promise(r=>requestAnimationFrame(()=>setTimeout(r,30)));}
function busyOff(){$('#busy').hidden=true; wake(2500);}
async function applySplit(){
  if(!splitting)return;
  const {obj:o,plane:pl,L}=splitting;
  await busyOn('Dividiendo la pieza…');
  try{
  pl.updateMatrixWorld(true);
  const N=new THREE.Vector3(0,0,1).applyQuaternion(pl.quaternion), S=L*6;
  let meshes=null, fallback=false;
  await loadManifold();
  let A=null; if(MF){try{A=toManifold(o);}catch(e){A=null;}}
  if(A){
    // Manifold: corte exacto por el plano, las dos mitades salen cerradas
    let parts=[];
    try{
      parts=A.splitByPlane([N.x,N.y,N.z],N.dot(pl.position));
      if(parts.some(p=>p.isEmpty())){msg('El plano no corta la pieza. Movélo hasta que la atraviese.');return;}
      const geos=[fromManifold(parts[1]),fromManifold(parts[0])];
      meshes=geos.map((g,i)=>{const m=new THREE.Mesh(g,i?mat():o.material.clone()); m.material.emissive.setHex(0); recenter(m); return m;});
    }finally{A.delete(); parts.forEach(p=>p.delete());}
  } else {
  fallback=true;
  const mk=(geo,pos,q,sc)=>{const b=new Brush(geo); b.position.copy(pos); b.quaternion.copy(q); b.scale.copy(sc); b.updateMatrixWorld(true); return b;};
  const A=mk(o.geometry.clone(),o.position,o.quaternion,o.scale);
  const B=mk(new THREE.BoxGeometry(S,S,S),pl.position.clone().addScaledVector(N,S/2),pl.quaternion,new THREE.Vector3(1,1,1));
  const out=[SUBTRACTION,INTERSECTION].map(op=>{const r=ev.evaluate(A,B,op); r.updateMatrixWorld(true); return r;});
  if(out.some(r=>!r.geometry.attributes.position||r.geometry.attributes.position.count===0)){msg('El plano no corta la pieza. Movélo hasta que la atraviese.');return;}
  meshes=out.map((r,i)=>{const m=new THREE.Mesh(r.geometry.clone(),i?mat():o.material.clone()); m.material.emissive.setHex(0); r.matrix.decompose(m.position,m.quaternion,m.scale); recenter(m); return m;});
  }
  meshes.forEach((m,i)=>{m.userData.m={n:M_(o).n+(i?' B':' A'),h:false,l:false,k:!!M_(o).k};});
  endSplit();
  scene.remove(o); objs.splice(objs.indexOf(o),1);
  meshes.forEach(m=>{scene.add(m); objs.push(m);});
  select([meshes[1]]); commit();
  msg('Pieza dividida en 2. Podés mover cada parte por separado.'+(fallback?' Ojo: la pieza no estaba cerrada y las mitades pueden tener huecos. Tocá Revisar para repararlas.':''));
  }catch(err){console.error(err); msg('No se pudo dividir esta pieza.');}
  finally{busyOff();}
}
$('#dividir').onclick=()=>splitting?endSplit():startSplit();
$('#sapply').onclick=applySplit; $('#scancel').onclick=endSplit;
document.querySelectorAll('[data-ax]').forEach(b=>b.onclick=()=>setAxis(b.dataset.ax));
document.querySelectorAll('.bar').forEach(bb=>bb.addEventListener('click',e=>{
  if(!splitting||e.target.closest('#dividir'))return;
  const mb=e.target.closest('[data-mode]');
  if(mb){tp.setMode(mb.dataset.mode==='rotate'?'rotate':'translate');return;}
  endSplit();
},true));
$('#ground').onclick=()=>{
  if(!sel.length)return; let onTop=0;
  sel.forEach(o=>{const others=objs.filter(x=>x.visible&&!sel.includes(x)&&!M_(x).k); const base=bbox(o).min.y, d=dropDistance(o,others); o.position.y-=d; if(d<base-1e-3)onTop++;});
  updateDims(); commit(); msg(onTop?(sel.length===1?'Pieza apoyada sobre la pieza de abajo.':'Piezas apoyadas.'):(sel.length===1?'Pieza apoyada sobre la base.':'Piezas apoyadas sobre la base.'));
};
// cuánto puede bajar una pieza hasta tocar la base o la superficie de otra pieza que esté debajo
function dropDistance(o,others){
  o.updateMatrixWorld(true);
  const minY=bbox(o).min.y; let best=minY;
  if(!others.length)return best;
  others.forEach(t=>{if(!t.geometry.boundsTree)t.geometry.computeBoundsTree();});
  const pos=o.geometry.attributes.position, n=pos.count, step=Math.max(1,Math.floor(n/2500)), v=new THREE.Vector3(), rc=new THREE.Raycaster();
  rc.ray.direction.set(0,-1,0);
  for(let i=0;i<n;i+=step){
    v.fromBufferAttribute(pos,i).applyMatrix4(o.matrixWorld); if(v.y<=0)continue;
    rc.ray.origin.set(v.x,v.y+1e-3,v.z); rc.far=v.y+1e-3;
    const h=rc.intersectObjects(others,false).find(h=>h.point.y<=minY+1e-3);
    if(h)best=Math.min(best,v.y-h.point.y);
  }
  return best;
}
const snapStep=()=>parseFloat($('#snapstep').value)||1;
function applySnap(){const on=$('#snap').classList.contains('on'), st=snapStep(); [tc,tp].forEach(c=>{c.setTranslationSnap(on?st:null); c.setRotationSnap(on?THREE.MathUtils.degToRad(15):null); c.setScaleSnap(on?0.1:null);});}
$('#snap').onclick=()=>{
  const on=$('#snap').classList.toggle('on'); applySnap();
  msg(on?'Snap activado: mover de a '+snapStep()+' mm, rotar de a 15°, escalar de a 0,1. El paso se cambia en Cama.':'Snap desactivado.');
};
const bbox=o=>{o.updateMatrixWorld(true); return new THREE.Box3().setFromObject(o,true);};
$('#alinear').onclick=()=>openPanel('#toolp');
// ===== Alinear y simetría =====
const AL_SVG=(g,r)=>'<svg viewBox="0 0 30 20"><path class="g" d="'+g+'"/>'+r.map(q=>'<rect class="r" x="'+q[0]+'" y="'+q[1]+'" width="'+q[2]+'" height="'+q[3]+'"/>').join('')+'</svg>';
const AL_DEF={
  x:{t:'Izquierda · Derecha',m:{min:['Izquierda','M3 2v16',[[5,4,14,5],[5,11,9,5]]],mid:['Centro','M15 2v16',[[7,4,16,5],[10,11,10,5]]],max:['Derecha','M27 2v16',[[11,4,14,5],[16,11,9,5]]]},side:{min:'lado izquierdo',mid:'centro',max:'lado derecho'},keep:'su altura ni su profundidad'},
  y:{t:'Abajo · Arriba',m:{min:['Abajo','M2 17h26',[[6,7,6,10],[16,11,6,6]]],mid:['Medio','M2 10h26',[[6,4,6,12],[16,7,6,6]]],max:['Arriba','M2 3h26',[[6,3,6,12],[16,3,6,7]]]},side:{min:'base',mid:'centro',max:'parte de arriba'},keep:'su posición a lo ancho ni a lo profundo'},
  z:{t:'Atrás · Frente (profundidad)',m:{min:['Atrás','M2 3h26',[[5,4,8,6],[16,4,8,10]]],mid:['Centro','M2 10h26',[[5,6,8,8],[16,4,8,12]]],max:['Frente','M2 17h26',[[5,10,8,7],[16,6,8,11]]]},side:{min:'parte de atrás',mid:'centro',max:'parte del frente'},keep:'su ancho ni su altura'}
};
const MIR_DEF={x:['Izq. ↔ Der.','M15 2v16',['M12 5L4 10l8 5z','M18 5l8 5-8 5z'],'de izquierda a derecha','pegada al lado derecho'],y:['Arriba ↔ Abajo','M3 10h24',['M8 8l7-6 7 6z','M8 12l7 6 7-6z'],'de arriba hacia abajo','encima'],z:['Frente ↔ Atrás','M3 10h24',['M6 8l5-5h8l5 5z','M6 12l5 5h8l5-5z'],'de adelante hacia atrás','pegada al frente']};
(function buildAlign(){
  const P=$('#toolp'); let h='<div class="row"><b>Alinear y simetría</b><button id="tclose" title="Cerrar">✕</button></div><div id="alst" class="alst"></div><h5>Alinear a la referencia</h5>';
  ['x','y','z'].forEach(k=>{ const d=AL_DEF[k]; h+='<div class="alax"><span class="chip '+k+'">'+k.toUpperCase()+'</span>'+d.t+'</div><div class="altri">'+['min','mid','max'].map(m=>'<button type="button" class="alb" data-al="'+k+':'+m+'">'+AL_SVG(d.m[m][1],d.m[m][2])+d.m[m][0]+'</button>').join('')+'</div>'; });
  h+='<div class="alinfo" id="alinfo"></div><h5>Centrar</h5><button type="button" id="tcenter" class="alwide"><span class="ic">⊕</span><span><b>Centrar en la cama</b><small>Pone la selección en el medio de la cama. La altura no cambia.</small></span></button>';
  h+='<h5>Simetría (espejo)</h5><div class="altri">'+['x','y','z'].map(k=>'<button type="button" class="alb" data-mir="'+k+'"><svg viewBox="0 0 30 20"><path class="g" d="'+MIR_DEF[k][1]+'"/>'+MIR_DEF[k][2].map(p=>'<path d="'+p+'"/>').join('')+'</svg>'+MIR_DEF[k][0]+'</button>').join('')+'</div>';
  h+='<label class="alck"><input type="checkbox" id="mircopy"><span>Hacer una copia espejada (la original queda)</span></label>';
  P.innerHTML=h;
})();
const alNm=o=>'«'+M_(o).n+'»';
const alWho=()=>sel.length===1?alNm(sel[0]):'las '+sel.length+' piezas';
const AL_DEFAULT='Pasá el mouse por un botón (o tocalo) para ver qué va a pasar.';
function alInfo(t){const e=$('#alinfo'); if(e)e.textContent=t||AL_DEFAULT;}
function alUpdate(){
  const st=$('#alst'); if(!st)return; const n=sel.length;
  st.innerHTML=n===0?'<b>No hay piezas elegidas.</b> Elegí 2 o más (Shift+clic) para alinearlas, o una sola para centrarla o espejarla.':n===1?'<b>1 pieza elegida: '+alNm(sel[0])+'.</b> Para alinear necesitás 2 o más (Shift+clic). Centrar y simetría sí funcionan con una.':'<b>'+n+' piezas elegidas.</b> Referencia: <b>'+alNm(sel[n-1])+'</b> (la última que tocaste). Esa no se mueve; las otras se acomodan a ella.';
  document.querySelectorAll('#toolp [data-al]').forEach(b=>b.disabled=n<2);
  document.querySelectorAll('#toolp [data-mir],#tcenter').forEach(b=>b.disabled=n<1);
  if(!document.querySelector('#toolp :hover'))alInfo();
}
function alText(b){
  const n=sel.length;
  if(b.dataset.al){ if(n<2)return 'Elegí 2 o más piezas para poder alinearlas.'; const [k,m]=b.dataset.al.split(':'), d=AL_DEF[k], ref=alNm(sel[n-1]), who=n===2?alNm(sel[0]):'las otras '+(n-1)+' piezas';
    return '<b>Va a pasar:</b> '+who+(n===2?' se mueve':' se mueven')+(m==='mid'?' hasta que su centro quede en línea con el centro de '+ref:' hasta que su '+d.side[m]+' toque el '+d.side[m]+' de '+ref)+'. No cambia '+d.keep+'.'; }
  if(b.dataset.mir){ if(n<1)return 'Elegí una pieza para espejarla.'; const k=b.dataset.mir, cp=$('#mircopy').checked;
    return '<b>Va a pasar:</b> '+(cp?'se agrega una copia espejada '+MIR_DEF[k][4]+' de '+alWho()+'. La original no se toca.':'se da vuelta '+alWho()+' como en un espejo ('+MIR_DEF[k][3]+'). Se queda en su lugar.'); }
  if(b.id==='tcenter'){ if(n<1)return 'Elegí algo para centrar.'; return '<b>Va a pasar:</b> '+alWho()+' se mueve al medio de la cama (X y Z). La altura no cambia.'; }
  return '';
}
(function bindAlign(){
  const P=$('#toolp');
  P.addEventListener('pointerover',e=>{const b=e.target.closest('button[data-al],button[data-mir],#tcenter'); if(b)$('#alinfo').innerHTML=alText(b)||AL_DEFAULT;});
  P.addEventListener('pointerout',e=>{if(e.target.closest('button'))alInfo();});
  $('#mircopy').onchange=()=>alInfo();
  $('#tclose').onclick=()=>{P.hidden=true;};
  document.querySelectorAll('[data-al]').forEach(b=>b.onclick=()=>{
    if(sel.length<2){msg('Seleccioná 2 o más objetos (Shift+clic). Se alinean al último que elegiste.');return;}
    const [k,m]=b.dataset.al.split(':'), rb=bbox(sel[sel.length-1]);
    const val=bb=>m==='min'?bb.min[k]:m==='max'?bb.max[k]:(bb.min[k]+bb.max[k])/2;
    sel.slice(0,-1).forEach(o=>{o.position[k]+=val(rb)-val(bbox(o));});
    updateDims(); commit(); msg('Objetos alineados a '+alNm(sel[sel.length-1])+'.');
  });
  $('#tcenter').onclick=()=>{
    if(!sel.length){msg('Seleccioná algo para centrar.');return;}
    const bb=new THREE.Box3(); sel.forEach(o=>bb.union(bbox(o)));
    const c=bb.getCenter(new THREE.Vector3());
    sel.forEach(o=>{o.position.x-=c.x; o.position.z-=c.z;});
    updateDims(); commit(); msg('Centrado en la cama.');
  };
})();
function flipWinding(g){
  if(g.index){const a=g.index.array; for(let i=0;i<a.length;i+=3){const t=a[i+1];a[i+1]=a[i+2];a[i+2]=t;} g.index.needsUpdate=true;}
  else for(const nm in g.attributes){const at=g.attributes[nm], s=at.itemSize, a=at.array; for(let i=0;i+2<at.count;i+=3){for(let c=0;c<s;c++){const i1=(i+1)*s+c, i2=(i+2)*s+c, t=a[i1]; a[i1]=a[i2]; a[i2]=t;}} at.needsUpdate=true;}
}
function reflectGeo(o,axName){
  const ax={x:new THREE.Vector3(1,0,0),y:new THREE.Vector3(0,1,0),z:new THREE.Vector3(0,0,1)}[axName];
  const n=ax.clone().applyQuaternion(o.quaternion.clone().invert()).normalize();
  const g=o.geometry.clone(); g.computeBoundingBox();
  const c=g.boundingBox.getCenter(new THREE.Vector3());
  g.translate(-c.x,-c.y,-c.z);
  g.applyMatrix4(new THREE.Matrix4().set(1-2*n.x*n.x,-2*n.x*n.y,-2*n.x*n.z,0, -2*n.x*n.y,1-2*n.y*n.y,-2*n.y*n.z,0, -2*n.x*n.z,-2*n.y*n.z,1-2*n.z*n.z,0, 0,0,0,1));
  g.translate(c.x,c.y,c.z); flipWinding(g); return g;
}
document.querySelectorAll('[data-mir]').forEach(b=>b.onclick=()=>{
  if(!sel.length){msg('Seleccioná una pieza para reflejarla.');return;}
  const k=b.dataset.mir;
  if($('#mircopy').checked){
    const bbs=sel.map(o=>bbox(o)), M=Math.max(...bbs.map(q=>q.max[k])), copies=[];
    sel.forEach((o,i)=>{
      const m=addMesh(o.geometry.clone(),o.material.clone(),M_(o).n+' (espejo)'); m.userData.m.k=!!M_(o).k; if(M_(o).tx)m.userData.m.tx={...M_(o).tx};
      m.position.copy(o.position); m.quaternion.copy(o.quaternion); m.scale.copy(o.scale); if(o.userData.p)m.userData.p={...o.userData.p};
      m.geometry=reflectGeo(m,k); m.position[k]+=2*M-(bbs[i].min[k]+bbs[i].max[k]); copies.push(m);
    });
    select(copies); updateDims(); commit(); msg('Copia espejada agregada '+MIR_DEF[k][4]+'.'); return;
  }
  sel.forEach(o=>{ o.geometry=reflectGeo(o,k); delete o.userData.fx; });
  updateDims(); commit(); msg('Pieza reflejada.');
});

async function saveFile(filename,data,note){
  const dl=window.claude?await claude.use('downloads').catch(()=>null):null;
  if(!dl){const a=document.createElement('a'); a.href=URL.createObjectURL(data instanceof Blob?data:new Blob([data])); a.download=filename; a.click(); return true;}
  try{await dl.save({filename,data}); msg('Archivo guardado: '+filename+(note?'. '+note:'')); return true;}
  catch(e){msg(e&&e.code==='declined'?'Descarga cancelada.':'No se pudo guardar el archivo.');}
}
function crc32(u){
  const t=crc32.t||(crc32.t=Array.from({length:256},(_,n)=>{let c=n; for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1; return c>>>0;}));
  let crc=-1; for(let i=0;i<u.length;i++)crc=t[(crc^u[i])&255]^(crc>>>8); return (crc^-1)>>>0;
}
function makeZip(name,data){
  const nb=new TextEncoder().encode(name), crc=crc32(data), n=data.length;
  const lh=new DataView(new ArrayBuffer(30));
  lh.setUint32(0,0x04034b50,true); lh.setUint16(4,20,true); lh.setUint16(12,0x21,true); lh.setUint32(14,crc,true); lh.setUint32(18,n,true); lh.setUint32(22,n,true); lh.setUint16(26,nb.length,true);
  const ch=new DataView(new ArrayBuffer(46));
  ch.setUint32(0,0x02014b50,true); ch.setUint16(4,20,true); ch.setUint16(6,20,true); ch.setUint16(14,0x21,true); ch.setUint32(16,crc,true); ch.setUint32(20,n,true); ch.setUint32(24,n,true); ch.setUint16(28,nb.length,true);
  const ed=new DataView(new ArrayBuffer(22));
  ed.setUint32(0,0x06054b50,true); ed.setUint16(8,1,true); ed.setUint16(10,1,true); ed.setUint32(12,46+nb.length,true); ed.setUint32(16,30+nb.length+n,true);
  return new Blob([lh,nb,data,ch,nb,ed]);
}
function saveStl(dv,name){ name=name||'modelo.stl';
  const u=new Uint8Array(dv.buffer,dv.byteOffset,dv.byteLength);
  if(!window.claude){saveFile(name,new Blob([u],{type:'model/stl'})); return;}
  saveFile(name.replace(/\.stl$/,'.zip'),makeZip(name,u),'Descomprimí el ZIP para abrir '+name+' en tu laminador.');
}

const b64=ta=>{const u=new Uint8Array(ta.buffer,ta.byteOffset,ta.byteLength); let s=''; for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000)); return btoa(s);};
const unb64=(s,C)=>{const bin=atob(s), u=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i); return new C(u.buffer);};
$('#psave').onclick=()=>{
  if(!objs.length){msg('No hay nada para guardar.');return;}
  const data={app:'constructor3d',v:1,objs:objs.map(o=>{const g=o.geometry, a=g.attributes;
    return {fx:o.userData.fx?packFx(o.userData.fx):null,p:o.userData.p||null,m:M_(o),c:o.material.color.getHex(),pos:o.position.toArray(),q:o.quaternion.toArray(),s:o.scale.toArray(),
      g:o.userData.p?null:{pos:b64(a.position.array),nor:a.normal?b64(a.normal.array):null,idx:g.index?{t:g.index.array instanceof Uint16Array?16:32,d:b64(g.index.array)}:null}};})};
  saveFile('proyecto3d.json',JSON.stringify(data),'Para seguir después, usá el botón Abrir.');
};
$('#popen').onclick=()=>$('#pfile').click();
$('#pfile').addEventListener('change',async e=>{
  const f=e.target.files[0]; if(!f)return;
  try{
    const d=JSON.parse(await f.text()); loadProject(d); commit(); msg('Proyecto abierto: '+f.name+'.');
  }catch(err){restore(cur); msg('No se pudo abrir ese archivo de proyecto.');}
  e.target.value='';
});
function recenter(m){
  m.geometry.computeBoundingBox();
  const c=m.geometry.boundingBox.getCenter(new THREE.Vector3());
  m.geometry.translate(-c.x,-c.y,-c.z);
  m.position.add(c.multiply(m.scale).applyQuaternion(m.quaternion));
  m.geometry.computeBoundingBox();
}

// al tocar el visor se suelta el campo numérico que tenía el foco, así el panel de medidas siempre se actualiza
canvas.addEventListener('pointerdown',()=>{const a=document.activeElement; if(a&&a!==document.body&&a.closest&&a.closest('#dims'))a.blur();},true);
let scaleUI=true, freeUI=true, sdrag=null, placing=null, placeSkip=false, fdrag=null; const sgCache={g:null,min:null,max:null};
// marco de la caja de escalar: la pieza, o el grupo entero (en coordenadas del mundo, con grp = sus piezas)
let sgF=null; const IDF={matrixWorld:new THREE.Matrix4(),scale:new THREE.Vector3(1,1,1),updateMatrixWorld(){}};
const sg=new THREE.Group(); sg.visible=false; scene.add(sg);
const edges=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1,1,1)),new THREE.LineBasicMaterial({color:0xF5C451,depthTest:false,transparent:true}));
edges.renderOrder=998; sg.add(edges);
const sh=[];
[-1,0,1].forEach(x=>[-1,0,1].forEach(y=>[-1,0,1].forEach(z=>{
  const nz=(x!==0)+(y!==0)+(z!==0); if(nz===0||nz===2)return;
  const face=nz===1;
  const m=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),new THREE.MeshBasicMaterial({color:face?0xff8a3d:0xF5C451,depthTest:false,transparent:true}));
  m.renderOrder=999; m.visible=false; m.material.visible=false; m.userData={s:new THREE.Vector3(x,y,z),face}; scene.add(m); sh.push(m);
})));
const hvArr=new Float32Array(sh.length*3), hvAttr=new THREE.BufferAttribute(hvArr,3);
const mkHv=(col,size,ro)=>{const g=new THREE.BufferGeometry(); g.setAttribute('position',hvAttr); const p=new THREE.Points(g,new THREE.PointsMaterial({color:col,size,sizeAttenuation:false,depthTest:false,transparent:true})); p.renderOrder=ro; p.frustumCulled=false; p.visible=false; scene.add(p); return p;};
const hvBack=mkHv(0x10203a,11,998), hvFront=mkHv(0xffffff,7.5,999);
// --- Manipular: flechas curvas de rotación, flecha para subir, anillo al rotar, cotas al origen ---
const frArrow=new THREE.Mesh(new THREE.ConeGeometry(1,2,18),new THREE.MeshBasicMaterial({color:0xF5C451,depthTest:false,transparent:true})); frArrow.renderOrder=999; frArrow.visible=false; scene.add(frArrow);
const rotTex=flip=>{ const c=document.createElement('canvas'); c.width=c.height=96; const g=c.getContext('2d'); g.lineCap='round'; g.lineJoin='round';
  const cx=48, cy=flip?36:60, R=24, t0=flip?Math.PI*0.12:Math.PI*1.12, t1=flip?Math.PI*0.88:Math.PI*1.88, P=t=>[cx+R*Math.cos(t),cy+R*Math.sin(t)];
  const head=(t,dir)=>{const [x,y]=P(t), tx=-Math.sin(t)*dir, ty=Math.cos(t)*dir, nx=Math.cos(t), ny=Math.sin(t); g.beginPath(); g.moveTo(x+tx*10,y+ty*10); g.lineTo(x+nx*6.5,y+ny*6.5); g.lineTo(x-nx*6.5,y-ny*6.5); g.closePath();};
  [['#0b1a33',7],['#ffffff',3]].forEach(([col,w])=>{ g.strokeStyle=col; g.fillStyle=col; g.lineWidth=w; g.beginPath(); g.arc(cx,cy,R,t0,t1); g.stroke(); head(t0,-1); g.lineWidth=w>4?6:2; g.fill(); g.stroke(); head(t1,1); g.fill(); g.stroke(); });
  return new THREE.CanvasTexture(c); };
const rotTexs=[rotTex(false),rotTex(true)];
const frRot=[0,1].map(i=>{const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:rotTexs[i],depthTest:false,transparent:true,sizeAttenuation:false})); sp.scale.set(0.05,0.05,1); sp.renderOrder=999; sp.visible=false; scene.add(sp);
  const pk=new THREE.Mesh(new THREE.SphereGeometry(1,8,6),new THREE.MeshBasicMaterial({visible:false})); pk.visible=false; scene.add(pk); sp.userData.pk=pk; return sp;});
const rotFx=new THREE.Group(); rotFx.visible=false; scene.add(rotFx);
{ const ring=new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({length:97},(_,i)=>new THREE.Vector3(Math.cos(i/96*Math.PI*2),0,Math.sin(i/96*Math.PI*2)))),new THREE.LineBasicMaterial({color:0x6ad0ff,depthTest:false,transparent:true})); ring.renderOrder=996; rotFx.add(ring);
  const disc=new THREE.Mesh(new THREE.CircleGeometry(1,64),new THREE.MeshBasicMaterial({color:0x6ad0ff,transparent:true,opacity:.12,depthTest:false,depthWrite:false,side:THREE.DoubleSide})); disc.rotation.x=-Math.PI/2; disc.renderOrder=995; rotFx.add(disc);
  const pts=[]; for(let i=0;i<24;i++){const a=i/24*Math.PI*2, r0=i%3===0?0.86:0.93; pts.push(new THREE.Vector3(Math.cos(a)*r0,0,Math.sin(a)*r0),new THREE.Vector3(Math.cos(a),0,Math.sin(a)));}
  const ticks=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0x9fe4ff,depthTest:false,transparent:true})); ticks.renderOrder=996; rotFx.add(ticks);
  const wedge=new THREE.Mesh(new THREE.CircleGeometry(1,2),new THREE.MeshBasicMaterial({color:0xFF9A3D,transparent:true,opacity:.4,depthTest:false,depthWrite:false,side:THREE.DoubleSide})); wedge.rotation.x=-Math.PI/2; wedge.renderOrder=997; rotFx.add(wedge); rotFx.userData.wedge=wedge; }
function rotWedge(a0,dl){ const w=rotFx.userData.wedge; w.geometry.dispose(); const st=dl>=0?a0:a0+dl, len=Math.max(0.001,Math.abs(dl)); w.geometry=new THREE.CircleGeometry(1,Math.max(2,Math.ceil(len/0.1)),st,len); }
const mvLines=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()]),new THREE.LineBasicMaterial({color:0xffffff,depthTest:false,transparent:true,opacity:.9})); mvLines.renderOrder=997; mvLines.frustumCulled=false; mvLines.visible=false; scene.add(mvLines);
function showMoveDims(o){
  const bb=bbox(o), px=(bb.min.x+bb.max.x)/2<0?bb.max.x:bb.min.x, pz=(bb.min.z+bb.max.z)/2<0?bb.max.z:bb.min.z, y=0.15, V=THREE.Vector3;
  const P=mvLines.geometry.attributes.position; [new V(px,y,pz),new V(0,y,pz),new V(px,y,pz),new V(px,y,0)].forEach((v,i)=>P.setXYZ(i,v.x,v.y,v.z)); P.needsUpdate=true; mvLines.visible=true;
  const f=v=>Math.abs(v).toLocaleString('es-AR',{maximumFractionDigits:1})+' mm';
  [['#cx',new V(px/2,y,pz),px],['#cz',new V(px,y,pz/2),pz]].forEach(([id,pt,val])=>{const el=$(id); el.hidden=false; el.textContent=f(val); place(el,pt);});
  $('#cy').hidden=true;
}
function updateFreeUI(o,on){
  frArrow.visible=on; frRot.forEach(r=>{r.visible=on; r.userData.pk.visible=on;}); if(!on)return;
  const bb=selGroup()?groupBox():bbox(o), c=bb.getCenter(new THREE.Vector3()), k=camK(new THREE.Vector3(c.x,bb.max.y,c.z));
  frArrow.position.set(c.x,bb.max.y+k*0.07,c.z); frArrow.scale.setScalar(k*0.007);
  const ps=[new THREE.Vector3(c.x,bb.max.y+k*0.19,c.z),new THREE.Vector3(c.x,bb.min.y-k*0.06,c.z)];
  frRot.forEach((r,i)=>{r.position.copy(ps[i]); r.userData.pk.position.copy(ps[i]); r.userData.pk.scale.setScalar(k*0.018);});
}
function updateScaleUI(){
  const o=sel[sel.length-1], grp=!!(freeUI&&selGroup()), on=!!(scaleUI&&o&&!splitting&&!M_(o).l&&!placing&&(!freeUI||sel.length===1||grp));
  if(!o){updateFreeUI(null,false);}
  sg.visible=on; sh.forEach(h=>h.visible=on);
  if(scaleUI)tc.visible=false; else if(tc.object)tc.visible=true;
  updateFreeUI(o,on&&freeUI);
  if(!on){hideCotas(); mvLines.visible=false; hvBack.visible=hvFront.visible=false; sgF=null; return;}
  if(sgCache.g!==o.geometry){o.geometry.computeBoundingBox(); sgCache.g=o.geometry; sgCache.min=o.geometry.boundingBox.min.clone(); sgCache.max=o.geometry.boundingBox.max.clone();}
  // con un grupo elegido, la caja es la del conjunto entero (coordenadas del mundo); si no, la de la pieza
  if(selGroup()){const b=groupBox(); sgF={grp:[...sel], mn:b.min.clone(), mx:b.max.clone(), p:new THREE.Vector3(), q:new THREE.Quaternion(), s:new THREE.Vector3(1,1,1), cota:IDF};}
  else sgF={grp:null, mn:sgCache.min, mx:sgCache.max, p:o.position, q:o.quaternion, s:o.scale, cota:o};
  const {mn,mx,p:fp,q:fq,s:fs}=sgF, c=mn.clone().add(mx).multiplyScalar(0.5);
  sg.position.copy(fp); sg.quaternion.copy(fq); sg.scale.copy(fs);
  edges.position.copy(c); edges.scale.copy(mx.clone().sub(mn));
  sh.forEach(h=>{
    const s=h.userData.s, lp=new THREE.Vector3(s.x>0?mx.x:s.x<0?mn.x:c.x, s.y>0?mx.y:s.y<0?mn.y:c.y, s.z>0?mx.z:s.z<0?mn.z:c.z);
    h.position.copy(lp.multiply(fs).applyQuaternion(fq).add(fp));
    h.scale.setScalar(camK(h.position)*0.016);
  });
  sh.forEach((h,i)=>{hvArr[i*3]=h.position.x; hvArr[i*3+1]=h.position.y; hvArr[i*3+2]=h.position.z;}); hvAttr.needsUpdate=true; hvBack.visible=hvFront.visible=true;
  if(sdrag)showCotas(sgF.cota,mn,mx,{x:sdrag.s.x!==0,y:sdrag.s.y!==0,z:sdrag.s.z!==0}); else if(fdrag&&fdrag.k==='body')showMoveDims(o); else {hideCotas(); mvLines.visible=false;}
}
const ray2=new THREE.Raycaster(), pt2=new THREE.Vector2();
const setRay=e=>{const r=canvas.getBoundingClientRect(); pt2.set(((e.clientX-r.left)/r.width)*2-1,-((e.clientY-r.top)/r.height)*2+1); ray2.setFromCamera(pt2,cam);};
canvas.addEventListener('pointerdown',e=>{
  const o=sel[sel.length-1]; if(e.button!==0||!scaleUI||!o||splitting||tool||!sgF)return;
  setRay(e);
  const hit=ray2.intersectObjects(sh.filter(h=>h.visible),false)[0]; if(!hit)return;
  e.stopImmediatePropagation(); e.preventDefault(); down=null; orbit.enabled=false; canvas.setPointerCapture(e.pointerId);
  const s=hit.object.userData.s, g=sgF, c=g.mn.clone().add(g.mx).multiplyScalar(0.5), h=new THREE.Vector3(), a=new THREE.Vector3();
  ['x','y','z'].forEach(k=>{h[k]=s[k]>0?g.mx[k]:s[k]<0?g.mn[k]:c[k]; a[k]=s[k]>0?g.mn[k]:s[k]<0?g.mx[k]:c[k];});
  const hw=h.clone().multiply(g.s).applyQuaternion(g.q).add(g.p);
  const A=a.clone().multiply(g.s).applyQuaternion(g.q).add(g.p);
  const r=canvas.getBoundingClientRect(), scr=V=>{const v=V.clone().project(cam); return new THREE.Vector2(r.left+(v.x+1)/2*r.width, r.top+(1-v.y)/2*r.height);};
  const v0=scr(hw).sub(scr(A)); let len=v0.length();
  if(len<80){ if(len>1e-3)v0.multiplyScalar(80/len); else v0.set(56,-56); len=80; }
  const grp=g.grp;
  sdrag={o,s,h,a,A,s0:grp?new THREE.Vector3(1,1,1):o.scale.clone(),q:grp?new THREE.Quaternion():o.quaternion.clone(),p0:o.position.clone(),
    P0:new THREE.Vector2(e.clientX,e.clientY),dir:v0.clone().normalize(),len,
    grp, init:grp?new Map(grp.map(m=>[m,{p:m.position.clone(),s:m.scale.clone()}])):null};
},true);
canvas.addEventListener('pointermove',e=>{
  if(!sdrag)return;
  const {o,s,h,a,A,s0,q}=sdrag;
  const w0=k=>s0[k]*(h[k]-a[k]);
  const ks=['x','y','z'].filter(k=>s[k]!==0&&Math.abs(w0(k))>1e-9);
  if(!ks.length)return;
  // el factor sale del movimiento del mouse en pantalla, a lo largo de la línea punto fijo → punto agarrado:
  // así se siente igual desde cualquier ángulo de cámara
  // curva: lineal cerca del punto de partida (el punto sigue al mouse) y progresiva hacia los extremos,
  // para que un objeto muy chico pueda hacerse muy grande sin arrastres enormes, y nunca llegue a 0 ni se invierta
  const x=new THREE.Vector2(e.clientX,e.clientY).sub(sdrag.P0).dot(sdrag.dir)/Math.max(40,sdrag.len);
  const u=x>=1?2*Math.exp((x-1)/2):x>=-0.5?1+x:0.5*Math.exp((x+0.5)/0.5);
  let f={x:1,y:1,z:1};
  if(ks.length===1){f[ks[0]]=u;} else {f={x:u,y:u,z:u};}
  if($('#snap').classList.contains('on')){
    const k=ks.reduce((m,kk)=>Math.abs(w0(kk))>Math.abs(w0(m))?kk:m,ks[0]);
    const size0=Math.abs(w0(k)), r=Math.max(snapStep(),Math.round(size0*Math.max(0.001,f[k])/snapStep())*snapStep())/size0;
    if(ks.length===1)f[k]=r; else f={x:r,y:r,z:r};
  }
  ['x','y','z'].forEach(k=>{f[k]=Math.max(0.001,f[k]);});
  const sn=new THREE.Vector3(s0.x*f.x,s0.y*f.y,s0.z*f.z);
  if(sdrag.grp){
    // grupo: todas las piezas se escalan desde el punto fijo A (la manija opuesta)
    const F=new THREE.Vector3(f.x,f.y,f.z);
    sdrag.grp.forEach(m=>{const m0=sdrag.init.get(m); m.scale.copy(m0.s).multiply(F); m.position.copy(m0.p).sub(A).multiply(F).add(A);});
  } else {
    o.scale.copy(sn);
    o.position.copy(A).sub(a.clone().multiply(sn).applyQuaternion(q));
  }
  updateDims();
});
const endScale=()=>{
  if(!sdrag)return; const members=sdrag.grp||[sdrag.o]; sdrag=null; orbit.enabled=true;
  members.forEach(m=>{if(m.userData.p)rebuild(m);});
  updateDims(); commit(); if(members.length>1)groupPanelInfo();
};
canvas.addEventListener('pointerup',endScale); canvas.addEventListener('pointercancel',endScale);
// Red de seguridad: si un arrastre quedó "pegado" (soltar fuera del visor, cancelar, cambiar de ventana,
// o quitar la selección en pleno arrastre), se libera para poder deseleccionar y orbitar de nuevo.
function liberarArrastre(){
  for(const c of [tc,tp]){ if(c.dragging){ c.pointerUp({button:0}); c.dragging=false; } c.axis=null; }
  if(!sdrag&&!rsel)orbit.enabled=true;
}
for(const c of [tc,tp]){ const det=c.detach.bind(c); c.detach=function(){ if(c.dragging){c.dragging=false;} return det(); }; }
document.addEventListener('pointerup',liberarArrastre);
document.addEventListener('pointercancel',liberarArrastre);
canvas.addEventListener('lostpointercapture',()=>setTimeout(()=>{if(!sdrag&&!rsel&&(tc.dragging||tp.dragging))liberarArrastre();},0));
addEventListener('blur',liberarArrastre);
document.addEventListener('visibilitychange',()=>{if(document.hidden)liberarArrastre();});
document.addEventListener('pointerdown',e=>{ if(e.pointerType==='mouse'&&(tc.dragging||tp.dragging)&&!sdrag&&!rsel)liberarArrastre(); },true);

async function idbSetK(k,v){try{const db=await idb(); await new Promise((res,rej)=>{const t=db.transaction('kv','readwrite'); t.objectStore('kv').put(v,k); t.oncomplete=res; t.onerror=()=>rej(t.error);}); db.close(); return true;}catch(e){return false;}}
async function idbGetK(k){try{const db=await idb(); const v=await new Promise((res,rej)=>{const q=db.transaction('kv').objectStore('kv').get(k); q.onsuccess=()=>res(q.result); q.onerror=()=>rej(q.error);}); db.close(); return v;}catch(e){return null;}}
const idb=()=>new Promise((res,rej)=>{const r=indexedDB.open('constructor3d',1); r.onupgradeneeded=()=>r.result.createObjectStore('kv'); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error);});
async function idbSet(v){try{const db=await idb(); await new Promise((res,rej)=>{const t=db.transaction('kv','readwrite'); t.objectStore('kv').put(v,'auto'); t.oncomplete=res; t.onerror=()=>rej(t.error);}); db.close();}catch(e){}}
async function idbGet(){try{const db=await idb(); const v=await new Promise((res,rej)=>{const q=db.transaction('kv').objectStore('kv').get('auto'); q.onsuccess=()=>res(q.result); q.onerror=()=>rej(q.error);}); db.close(); return v;}catch(e){return null;}}
function projectData(){return {app:'constructor3d',v:1,objs:serializeObjs(objs)};}
function serializeObjs(list){
  return list.map(o=>{const g=o.geometry, a=g.attributes;
    return {fx:o.userData.fx?packFx(o.userData.fx):null,p:o.userData.p||null,m:M_(o),c:o.material.color.getHex(),pos:o.position.toArray(),q:o.quaternion.toArray(),s:o.scale.toArray(),
      g:o.userData.p?null:{pos:b64(a.position.array),nor:a.normal?b64(a.normal.array):null,idx:g.index?{t:g.index.array instanceof Uint16Array?16:32,d:b64(g.index.array)}:null}};});
}
function objFromData(it){
    let geo;
    if(it.p){geo=buildGeo(it.p);} else {
      geo=new THREE.BufferGeometry(); const pos=unb64(it.g.pos,Float32Array);
      geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
      if(it.g.nor)geo.setAttribute('normal',new THREE.BufferAttribute(unb64(it.g.nor,Float32Array),3)); else geo.computeVertexNormals();
      geo.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(pos.length/3*2),2));
      if(it.g.idx)geo.setIndex(new THREE.BufferAttribute(unb64(it.g.idx.d,it.g.idx.t===16?Uint16Array:Uint32Array),1));
    }
    const m=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:it.c,roughness:0.55,metalness:0.05}));
    m.position.fromArray(it.pos); m.quaternion.fromArray(it.q); m.scale.fromArray(it.s);
    if(it.p)m.userData.p={...it.p};
    if(it.fx){try{m.userData.fx=unpackFx(it.fx);}catch(e){console.warn('historial no cargado',e);}}
    m.userData.m=it.m?{...it.m}:{n:newName('Pieza'),h:false,l:false,k:false};
  return m;
}
function loadProject(d){
  if(!d||d.app!=='constructor3d')throw new Error('formato');
  objs.forEach(o=>scene.remove(o)); objs.length=0; sel=[]; tc.detach(); resetTransient();
  d.objs.forEach(it=>{const m=objFromData(it); scene.add(m); objs.push(m);});
  updateDims();
}
let saveT=null, warnedHeavy=false;
function scheduleSave(){
  clearTimeout(saveT);
  saveT=setTimeout(()=>{
    let n=0; objs.forEach(o=>{if(!o.userData.p)n+=o.geometry.attributes.position.count;});
    if(n>900000){idbSet(null); if(!warnedHeavy){warnedHeavy=true; msg('La escena es muy pesada para el autoguardado. Usá Guardar para no perder el trabajo.');} return;}
    try{idbSet(JSON.stringify(projectData()));}catch(e){}
  },400);
}
function resetTransient(){ clearMeasure(); if(tool)setTool(tool); if(placing)cancelPlace(true); }
$('#pnew').onclick=()=>{
  objs.forEach(o=>scene.remove(o)); objs.length=0; sel=[]; tc.detach(); resetTransient(); updateDims(); commit();
  msg('Proyecto nuevo. Ctrl+Z para volver atrás.');
};
let dirty=false;
function markDirty(v){
  dirty=v; const b=$('#psave'); if(!b)return;
  b.classList.toggle('dirty',v);
  b.title=v?'Guardar el proyecto en un archivo (hay cambios sin guardar)':'Guardar el proyecto en un archivo';
}
async function saveProject(){
  if(!objs.length){msg('No hay nada para guardar.');return false;}
  const ok=await saveFile('proyecto3d.json',JSON.stringify(projectData()),'Para seguir después, usá el botón Abrir.');
  if(ok)markDirty(false);
  return !!ok;
}
$('#psave').onclick=saveProject;
addEventListener('beforeunload',e=>{if(dirty&&objs.length){e.preventDefault(); e.returnValue='';}});
addEventListener('keydown',e=>{
  const mod=e.ctrlKey||e.metaKey, k=e.key.toLowerCase();
  if(mod&&k==='s'){e.preventDefault(); saveProject(); return;}
  if((e.key==='F5'||(mod&&k==='r'))&&dirty&&objs.length){e.preventDefault(); $('#dlg').hidden=false;}
});
$('#dcancel').onclick=()=>{$('#dlg').hidden=true;};
$('#dgo').onclick=()=>{dirty=false; location.reload();};
window.c3dReload=()=>{ if(dirty)$('#dlg').hidden=false; else location.reload(); };
$('#dsave').onclick=async()=>{if(await saveProject()){$('#dlg').hidden=true; location.reload();}};
const bed={w:220,d:220}; let bedGrid=null, bedOutline=null, bedOut=-1;
function loadBed(){try{const s=JSON.parse(localStorage.getItem('c3d_bed')||'null'); if(s&&s.w>=10&&s.d>=10){bed.w=s.w; bed.d=s.d;}}catch(e){}}
function buildBed(){
  grid.visible=false;
  [bedGrid,bedOutline].forEach(m=>{if(m){scene.remove(m); m.geometry.dispose(); m.material.dispose();}});
  const w=bed.w, d=bed.d, p=[];
  for(let k=Math.ceil(-w/20);k<=Math.floor(w/20);k++)p.push(k*10,0,-d/2,k*10,0,d/2);
  for(let k=Math.ceil(-d/20);k<=Math.floor(d/20);k++)p.push(-w/2,0,k*10,w/2,0,k*10);
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
  bedGrid=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:0x9aa3e6,transparent:true,opacity:gridOp(),depthWrite:false}));
  const og=new THREE.BufferGeometry(); og.setAttribute('position',new THREE.Float32BufferAttribute([-w/2,0.02,-d/2, w/2,0.02,-d/2, w/2,0.02,d/2, -w/2,0.02,d/2],3));
  bedOutline=new THREE.LineLoop(og,new THREE.LineBasicMaterial({color:0xF5C451,transparent:true,opacity:0.9}));
  scene.add(bedGrid,bedOutline); bedOut=-1; buildRuler();
}
function checkBed(){
  if(!bedOutline)return;
  const hx=bed.w/2+0.01, hz=bed.d/2+0.01; let out=0;
  objs.forEach(o=>{const b=new THREE.Box3().setFromObject(o); if(b.min.x<-hx||b.max.x>hx||b.min.z<-hz||b.max.z>hz)out++;});
  bedOutline.material.color.setHex(out?0xe5484d:0xF5C451);
  $('#bedbtn').classList.toggle('warn',out>0);
  if(out!==bedOut){
    if(bedOut!==-1||out>0)msg(out?(out+' pieza(s) sobresalen de la cama ('+bed.w+' × '+bed.d+' mm).'):'Todas las piezas entran en la cama.');
    bedOut=out;
  }
}
function syncBedUI(){
  $('#bw').value=bed.w; $('#bd').value=bed.d;
  const k=bed.w+'x'+bed.d; $('#bpre').value=[...$('#bpre').options].some(op=>op.value===k)?k:'custom';
}
function setBed(w,d){
  if(!(w>=10&&d>=10))return;
  bed.w=w; bed.d=d; buildBed();
  try{localStorage.setItem('c3d_bed',JSON.stringify(bed));}catch(e){}
  syncBedUI(); checkBed();
}
$('#bedbtn').onclick=()=>{openPanel('#bedp'); syncBedUI();};
$('#bclose').onclick=()=>{$('#bedp').hidden=true;};
$('#bpre').addEventListener('change',e=>{if(e.target.value==='custom')return; const [w,d]=e.target.value.split('x').map(Number); setBed(w,d);});
['#bw','#bd'].forEach(s=>$(s).addEventListener('change',()=>setBed(parseFloat($('#bw').value),parseFloat($('#bd').value))));
function undo(){if(!hist.length){msg('No hay nada para deshacer.');return;} redoSt.push(cur); cur=hist.pop(); restore(cur); msg('Deshecho.');}
function redoAct(){if(!redoSt.length){msg('No hay nada para rehacer.');return;} hist.push(cur); cur=redoSt.pop(); restore(cur); msg('Rehecho.');}
$('#undo').onclick=undo; $('#redo').onclick=redoAct;
$('#dims').addEventListener('change',()=>commit());

$('#imp').onclick=()=>$('#file').click();
$('#file').addEventListener('change',async e=>{
  const f=e.target.files[0]; if(!f)return;
  if(/\.(obj|3mf|glb|gltf)$/i.test(f.name)){await importModel(f); e.target.value=''; return;}
  try{
    await busyOn('Importando '+f.name+'…');
    const geo=new STLLoader().parse(await f.arrayBuffer());
    geo.rotateX(-Math.PI/2);
    geo.computeBoundingBox();
    const bb=geo.boundingBox, c=new THREE.Vector3(); bb.getCenter(c);
    geo.translate(-c.x,-bb.min.y,-c.z);
    const n=geo.attributes.position.count;
    geo.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(n*2),2));
    geo.setIndex(Array.from({length:n},(_,i)=>i));
    geo.computeBoundingBox();
    const sz=new THREE.Vector3(); geo.boundingBox.getSize(sz);
    const m=addMesh(geo,undefined,f.name.replace(/\.stl$/i,'')||newName('Importada')); recenter(m); updateDims();
    const L=Math.max(sz.x,sz.y,sz.z);
    if(L>40){orbit.target.set(0,sz.y/2,0); cam.position.set(L*1.4,L*1.1,L*1.6); cam.far=Math.max(1000,L*20); cam.updateProjectionMatrix(); if(ortho)setView(); grid.scale.setScalar(Math.max(10,Math.ceil(L/10)));}
    commit();
    let note='';
    if(n/3<=1500000){try{const a=analyzeMesh(geo); if(!a.ok)note=' La malla tiene problemas para imprimir: tocá Revisar para verlos y repararlos.';}catch(e){}}
    msg('Importado: '+f.name+' ('+sz.x.toFixed(1)+' × '+sz.y.toFixed(1)+' × '+sz.z.toFixed(1)+' mm). Peso: '+(n/3|0)+' triángulos.'+note);
  }catch(err){msg('No se pudo leer ese archivo STL.');}
  busyOff();
  e.target.value='';
});

const NUTS={M2:[4,1.6],M3:[5.5,2.4],M4:[7,3.2],M5:[8,4],M6:[10,5],M8:[13,6.5],M10:[16,8],M12:[18,10]}; // [ancho entre caras, grosor]
function buildGear(p){
  const N=Math.max(6,Math.round(p.N)), R=p.od/2, td=Math.min(p.td,R*0.6), Rr=R-td, P=Math.PI*2/N, pts=[];
  for(let i=0;i<N;i++){const a=i*P; for(const [r,o] of [[Rr,-0.28],[R,-0.15],[R,0.15],[Rr,0.28]])pts.push([r*Math.cos(a+o*P),r*Math.sin(a+o*P)]);}
  const s=shPoly(pts); if(p.bore>0.05)shHole(s,0,0,Math.min(p.bore/2,Rr*0.9)); return shFlat(s,p.h);
}
function buildNut(p){
  const Rc=p.af/Math.sqrt(3), pts=[]; for(let i=0;i<6;i++){const a=i*Math.PI/3; pts.push([Rc*Math.cos(a),Rc*Math.sin(a)]);}
  const s=shPoly(pts); shHole(s,0,0,Math.min(p.bore/2,p.af/2*0.9)); return shFlat(s,p.h);
}
function buildGeo(p){
  if(p.t==='gear')return buildGear(p);
  if(p.t==='nut')return buildNut(p);
  const {w,h,d}=p;
  if(p.t==='box'){
    const r=Math.min(p.r,Math.min(w,h,d)/2*0.999);
    return r>0.001?new RoundedBoxGeometry(w,h,d,p.soft?4:1,r):new THREE.BoxGeometry(w,h,d);
  }
  const R=w/2,H=h/2,r=Math.min(p.r,R*0.98,H*0.98);
  if(r<=0.001) return new THREE.CylinderGeometry(R,R,h,48);
  const n=p.soft?6:1, V=THREE.Vector2, pts=[new V(0,-H)];
  for(let i=0;i<=n;i++){const a=-Math.PI/2+(Math.PI/2)*i/n; pts.push(new V(R-r+Math.cos(a)*r,-H+r+Math.sin(a)*r));}
  for(let i=0;i<=n;i++){const a=(Math.PI/2)*i/n; pts.push(new V(R-r+Math.cos(a)*r,H-r+Math.sin(a)*r));}
  pts.push(new V(0,H));
  return cleanGeo(new THREE.LatheGeometry(pts,48));
}
function rebuild(o,patch){
  const p=o.userData.p; if(!p)return;
  if(p.t==='gear'||p.t==='nut'){
    const sx=o.scale.x, sz=o.scale.z, sy=o.scale.y, k=Math.abs(Math.log(sx))>=Math.abs(Math.log(sz))?sx:sz;
    if(p.t==='gear'){p.od*=k; p.td*=k; p.bore*=k; p.h*=sy;} else {p.af*=k; p.bore*=k; p.h*=sy;}
    Object.assign(p,patch||{}); o.geometry.dispose(); o.geometry=buildGeo(p); o.scale.set(1,1,1); return;
  }
  o.geometry.computeBoundingBox();
  const s=new THREE.Vector3(); o.geometry.boundingBox.getSize(s); s.multiply(o.scale);
  Object.assign(p,{w:s.x,h:s.y,d:s.z},patch||{});
  if(p.t==='cyl')p.d=p.w;
  o.geometry.dispose(); o.geometry=buildGeo(p); o.scale.set(1,1,1);
}
const num=(id,v)=>{const e=$(id); if(document.activeElement!==e)e.value=+(+v).toFixed(2);};
function syncParam(p){
  const g=p&&p.t==='gear', n=p&&p.t==='nut'; $('#prow').hidden=!(g||n); $('#pgear').hidden=!g; $('#pnut').hidden=!n;
  if(g){$('#ptitle').firstChild.nodeValue='Engranaje '; num('#gN',p.N); num('#gTd',p.td); num('#gBore',p.bore);}
  if(n){$('#ptitle').firstChild.nodeValue='Tuerca '; if(document.activeElement!==$('#nTh'))$('#nTh').value=p.th; num('#nBore',p.bore);}
}
function applyParam(patch){
  const o=sel[sel.length-1]; if(!o||!o.userData.p)return; const p=o.userData.p; if(p.t!=='gear'&&p.t!=='nut')return;
  const y0=bbox(o).min.y; o.scale.set(1,1,1); rebuild(o,patch); o.position.y+=y0-bbox(o).min.y; updateDims();
}
const pv=(id,min)=>{const v=parseFloat($(id).value); return isNaN(v)?null:Math.max(min,v);};
$('#gN').addEventListener('input',()=>{const v=pv('#gN',6); if(v!==null)applyParam({N:Math.round(Math.min(80,v))});});
$('#gTd').addEventListener('input',()=>{const v=pv('#gTd',0.3); if(v!==null)applyParam({td:v});});
$('#gBore').addEventListener('input',()=>{const v=pv('#gBore',0); if(v!==null)applyParam({bore:v});});
$('#nBore').addEventListener('input',()=>{const v=pv('#nBore',0.5); if(v!==null)applyParam({bore:v});});
$('#nTh').addEventListener('change',()=>{const k=$('#nTh').value, [af,h]=NUTS[k]; applyParam({th:k,af,h,bore:+(parseFloat(k.slice(1))+0.2).toFixed(2)});});
['#gN','#gTd','#gBore','#nBore'].forEach(i=>$(i).addEventListener('change',()=>{commit();}));
$('#nTh').addEventListener('change',()=>{commit();});
function applyRound(){
  const o=sel[sel.length-1]; if(!o||!o.userData.p)return;
  rebuild(o,{r:Math.max(0,parseFloat($('#rad').value)||0),soft:$('#rtype').value==='soft'});
  updateDims();
}
$('#rad').addEventListener('input',applyRound);
$('#rtype').addEventListener('change',applyRound);
['x','y','z'].forEach(k=>$('#r'+k).addEventListener('input',e=>{const o=sel[sel.length-1],v=parseFloat(e.target.value); if(!o||isNaN(v))return; o.rotation[k]=THREE.MathUtils.degToRad(v); updateDims();}));
function updateDims(){
  refreshBtns(); alUpdate();
  applyGhost();
  checkBed(); renderList(); textSelSync();
  const box=$('#dims'), o=sel[sel.length-1];
  if(!o){box.hidden=true;return;}
  box.hidden=false;
  o.geometry.computeBoundingBox();
  const s=new THREE.Vector3(); o.geometry.boundingBox.getSize(s); s.multiply(o.scale);
  ['x','y','z'].forEach(k=>{const inp=$('#d'+k); if(document.activeElement!==inp) inp.value=+s[k].toFixed(3);});
  ['x','y','z'].forEach(k=>{const inp=$('#p'+k); if(document.activeElement!==inp) inp.value=+o.position[k].toFixed(3);});
  ['x','y','z'].forEach(k=>{const inp=$('#r'+k); if(document.activeElement!==inp) inp.value=+THREE.MathUtils.radToDeg(o.rotation[k]).toFixed(2);});
  const rp=o.userData.p, rnd=!!rp&&(rp.t==='box'||rp.t==='cyl'); $('#rrow').hidden=!rnd;
  if(rnd){ if(document.activeElement!==$('#rad')) $('#rad').value=+rp.r.toFixed(3); $('#rtype').value=rp.soft?'soft':'chamfer'; }
  syncParam(rp); renderFx(o);
  if(document.activeElement!==$('#col')) $('#col').value='#'+o.material.color.getHexString();
  const lk=M_(o).l; box.querySelectorAll('input,select').forEach(i=>{if(i.id!=='col')i.disabled=lk;});
}
['x','y','z'].forEach(k=>$('#d'+k).addEventListener('input',e=>{
  const o=sel[sel.length-1], v=parseFloat(e.target.value);
  if(!o||!(v>0))return;
  const g=new THREE.Vector3(); o.geometry.computeBoundingBox(); o.geometry.boundingBox.getSize(g);
  if(g[k]<1e-9)return;
  if($('#dlock').checked) o.scale.multiplyScalar(v/(g[k]*o.scale[k])); else if(o.userData.p&&o.userData.p.t==='cyl'&&k!=='y'){o.scale.x=o.scale.z=v/g[k];} else o.scale[k]=v/g[k];
  rebuild(o);
  updateDims();
}));

const ev=new Evaluator();
// motor de respaldo (three-bvh-csg) para piezas que no están cerradas
function bvhCombine(solids,holes,op){
  const mk=o=>{const br=new Brush(o.geometry.clone(),o.material); br.position.copy(o.position); br.quaternion.copy(o.quaternion); br.scale.copy(o.scale); br.updateMatrixWorld(true); return br;};
  let acc=mk(solids[0]);
  const step=(o,OP)=>{const r=ev.evaluate(acc,mk(o),OP); r.updateMatrixWorld(true); const nb=new Brush(r.geometry); r.matrix.decompose(nb.position,nb.quaternion,nb.scale); nb.updateMatrixWorld(true); acc=nb;};
  solids.slice(1).forEach(o=>step(o,op==='intersect'?INTERSECTION:ADDITION));
  holes.forEach(o=>step(o,SUBTRACTION));
  const mesh=new THREE.Mesh(acc.geometry.clone(),solids[0].material.clone());
  acc.matrix.decompose(mesh.position,mesh.quaternion,mesh.scale); recenter(mesh); return mesh;
}
// Manifold: une (o intersecta) todas las piezas sólidas y después resta todos los huecos
function mfCombine(solids,holes,op){
  if(!MF)return null; const made=new Set(), keep=m=>{made.add(m); return m;};
  try{
    const ms=solids.map(o=>keep(toManifold(o))), hs=holes.map(o=>keep(toManifold(o)));
    let R=ms[0];
    if(ms.length>1)R=keep(op==='intersect'?ms.slice(1).reduce((a,b)=>keep(a.intersect(b)),ms[0]):MF.Manifold.union(ms));
    if(hs.length){const H=hs.length>1?keep(MF.Manifold.union(hs)):hs[0]; R=keep(R.subtract(H));}
    return fromManifold(R);
  }catch(e){console.warn('Manifold no pudo con estas piezas, se usa el motor anterior',e); return null;}
  finally{made.forEach(m=>{try{m.delete();}catch(e){}});}
}
document.querySelectorAll('[data-op]').forEach(b=>b.onclick=()=>runOp(b.dataset.op));
async function runOp(op){
  let jobs=[];
  if(op==='subtract'){
    if(!sel.length){msg('Seleccioná el objeto que querés restar (el que corta).');return;}
    const cut=sel[sel.length-1]; let targets=sel.slice(0,-1);
    if(!targets.length){const cb=bbox(cut); targets=objs.filter(o=>o!==cut&&o.visible&&bbox(o).intersectsBox(cb));}
    if(!targets.length){msg('El objeto seleccionado no toca a ningún otro. Acercalo al que querés recortar.');return;}
    jobs=targets.map(t=>({solids:[t],holes:[cut],op:'union',name:M_(t).n}));
  } else {
    if(sel.length<2){msg('Seleccioná 2 o más piezas (Shift o Ctrl + clic, o Shift + arrastrar un rectángulo).');return;}
    const list=sel.slice(), solids=op==='union'?list.filter(o=>!M_(o).k):list, holes=op==='union'?list.filter(o=>M_(o).k):[];
    if(!solids.length){msg('Todas las piezas elegidas son huecos. Sumá al menos una pieza sólida.');return;}
    jobs=[{solids,holes,op,name:op==='intersect'?newName('Intersección'):solids.length>1?newName('Unión'):M_(solids[0]).n}];
  }
  await busyOn('Procesando: '+{union:'unir',subtract:'restar',intersect:'intersectar'}[op]+'…');
  let ok=false, fallback=false; const results=[], gone=new Set();
  try{
    await loadManifold();
    for(const j of jobs){
      let mesh; const geo=mfCombine(j.solids,j.holes,j.op);
      if(geo){mesh=new THREE.Mesh(geo,j.solids[0].material.clone()); recenter(mesh);}
      else {fallback=true; mesh=bvhCombine(j.solids,j.holes,j.op);}
      [...j.solids,...j.holes].forEach(o=>gone.add(o));
      if(mesh.geometry.attributes.position.count){mesh.material.emissive.setHex(0); mesh.userData.m={n:j.name,h:false,l:false,k:false}; if(geo)fxRecord('bool',{op:j.op,ns:j.solids.length,kind:op},[...j.solids,...j.holes],mesh); results.push(mesh);}
    }
    if(!results.length)throw new Error('vacio');
    gone.forEach(o=>{scene.remove(o); const i=objs.indexOf(o); if(i>=0)objs.splice(i,1);});
    results.forEach(m=>{scene.add(m); objs.push(m);});
    ok=true;
  }catch(err){if(err.message!=='vacio')console.error(err); restore(cur); msg(err.message==='vacio'?'El resultado queda vacío: las piezas no se tocan o el corte las borra enteras.':'No se pudo completar la operación con estas piezas.');}
  finally{busyOff();}
  if(!ok)return;
  sel=[]; tc.detach(); select(results.slice(-1)); commit();
  const nh=op==='union'?jobs[0].holes.length:0, ns=jobs[0].solids.length;
  msg((nh?'Listo: '+(ns>1?ns+' piezas unidas y ':'')+nh+(nh===1?' hueco restado.':' huecos restados.'):'Listo. Resultado: '+{union:'Unir',subtract:'Restar',intersect:'Intersectar'}[op]+'.')+(fallback?' Ojo: alguna pieza no estaba cerrada y el resultado puede tener huecos. Tocá Revisar para repararla.':''));
}
