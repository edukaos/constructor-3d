'use strict';
// Constructor 3D: selección múltiple con el comportamiento de Tinkercad.
// - Varias piezas elegidas se tratan como un conjunto: se mueven, giran, escalan, suben y duplican juntas.
// - Duplicar (Ctrl+D) copia todas las elegidas en el mismo lugar. Si movés/girás la copia y volvés a duplicar,
//   la nueva copia repite ese mismo movimiento (duplicar y repetir).
// - Flechas: mueven la selección por la cama según hacia dónde mira la cámara (Shift = ×10). Ctrl+↑/↓ suben y bajan.
// - Ctrl+A elige todas las piezas.
// Los scripts de js/ comparten el ámbito global y se cargan en orden desde index.html.

// Hay más de una pieza elegida (o un grupo): se usa la caja del conjunto
function multiSel(){ return sel.length>1||!!selGroup(); }

// Copias exactas en el mismo lugar. Las piezas de un mismo grupo forman un grupo nuevo.
function dupObjs(list){
  const remap={}, made=[];
  list.forEach(o=>{
    const m=new THREE.Mesh(o.geometry.clone(),o.material.clone()); m.material.emissive.setHex(0);
    m.userData.m=JSON.parse(JSON.stringify(M_(o))); m.userData.m.n=M_(o).n+' (copia)'; m.userData.m.h=false; m.userData.m.l=false;
    const g=grpOf(o); if(g)m.userData.m.g=remap[g]||(remap[g]=newGroupId());
    m.position.copy(o.position); m.quaternion.copy(o.quaternion); m.scale.copy(o.scale);
    if(o.userData.p)m.userData.p={...o.userData.p}; if(o.userData.fx)m.userData.fx=o.userData.fx;
    scene.add(m); objs.push(m); made.push(m);
  });
  return made;
}

// Duplicar y repetir: recuerda de qué piezas salieron las últimas copias
let dupMem=null;
function dupSel(){
  if(!sel.length)return;
  const src=sel.slice(), made=dupObjs(src);
  let rep=false;
  if(dupMem&&dupMem.copies.length===src.length&&src.every((o,i)=>o===dupMem.copies[i])){
    // la selección son las copias anteriores: si se movieron respecto del original, la nueva copia repite ese cambio
    const a=dupMem.src[dupMem.src.length-1], b=src[src.length-1];
    if(objs.includes(a)){
      a.updateMatrixWorld(true); b.updateMatrixWorld(true);
      const D=b.matrixWorld.clone().multiply(a.matrixWorld.clone().invert());
      const I=new THREE.Matrix4(), moved=D.elements.some((v,i)=>Math.abs(v-I.elements[i])>1e-6);
      if(moved){ made.forEach(m=>{m.updateMatrixWorld(true); m.matrix.copy(D).multiply(m.matrixWorld); m.matrix.decompose(m.position,m.quaternion,m.scale);}); rep=true; }
    }
  }
  dupMem={src,copies:made};
  select(made); made.forEach(m=>{if(m.userData.p)rebuild(m);}); updateDims(); commit();
  msg(rep?'Duplicado repitiendo el último movimiento. Volvé a apretar Ctrl+D para seguir.'
     :(made.length===1?'Copia creada en el mismo lugar: arrastrala a donde quieras.':made.length+' copias creadas en el mismo lugar: arrastralas a donde quieras.')+' Si después duplicás de nuevo, se repite ese movimiento.');
}
$('#dup').onclick=dupSel;

// ===== Mover y Rotar (gizmo de ejes) con varias piezas: el gizmo se pone en el centro del conjunto =====
const selPivot=new THREE.Object3D(); scene.add(selPivot);
let pivBase=null, pivSig='';
function pivotPlace(){
  const b=groupBox(); b.getCenter(selPivot.position); selPivot.quaternion.identity(); selPivot.scale.set(1,1,1); selPivot.updateMatrixWorld(true);
  pivSig=sel.map(o=>o.position.toArray().join(',')+o.quaternion.toArray().join(',')).join('|');
}
{
  const selectPrev=select;
  select=function(list){
    const r=selectPrev(list);
    if(sel.length>1&&!sel.some(o=>M_(o).l)&&!splitting){ pivotPlace(); tc.attach(selPivot); }
    return r;
  };
}
tc.addEventListener('mouseDown',()=>{
  if(tc.object!==selPivot)return; selPivot.updateMatrixWorld(true);
  pivBase={inv:selPivot.matrixWorld.clone().invert(), m:sel.map(o=>{o.updateMatrixWorld(true); return o.matrixWorld.clone();})};
});
tc.addEventListener('objectChange',()=>{
  if(tc.object!==selPivot||!pivBase)return; selPivot.updateMatrixWorld(true);
  const D=selPivot.matrixWorld.clone().multiply(pivBase.inv);
  sel.forEach((o,i)=>{ if(!pivBase.m[i])return; o.matrix.copy(D).multiply(pivBase.m[i]); o.matrix.decompose(o.position,o.quaternion,o.scale); o.updateMatrixWorld(true); });
  updateDims();
});
tc.addEventListener('mouseUp',()=>{ if(tc.object===selPivot){pivBase=null; pivotPlace();} });
// si el conjunto se movió por otro lado (arrastre, flechas, alinear…), el gizmo vuelve a su centro
(function pivotWatch(){
  requestAnimationFrame(pivotWatch);
  if(tc.object!==selPivot||tc.dragging)return;
  if(sel.length<2){ if(!splitting){ if(sel.length&&!M_(sel[0]).l)tc.attach(sel[0]); else tc.detach(); } return; }
  const s=sel.map(o=>o.position.toArray().join(',')+o.quaternion.toArray().join(',')).join('|');
  if(s!==pivSig)pivotPlace();
})();

// ===== Teclado =====
let arrowMoved=false;
const typing=t=>!!(t&&(t.tagName==='INPUT'||t.tagName==='SELECT'||t.tagName==='TEXTAREA'||t.isContentEditable));
addEventListener('keydown',e=>{
  if(typing(e.target)||splitting||placing||(typeof sk!=='undefined'&&sk))return;
  const mod=e.ctrlKey||e.metaKey;
  if(mod&&!e.shiftKey&&!e.altKey&&e.key.toLowerCase()==='a'){
    e.preventDefault(); const all=pickable(); select(all); if(all.length)msg(all.length===1?'1 objeto seleccionado.':all.length+' objetos seleccionados.'); return;
  }
  const AR={ArrowUp:1,ArrowDown:1,ArrowLeft:1,ArrowRight:1};
  if(!AR[e.key]||!sel.length)return;
  const list=sel.filter(o=>!M_(o).l); if(!list.length)return;
  e.preventDefault();
  const snapOn=$('#snap').classList.contains('on'), st=(snapOn?snapStep():1)*(e.shiftKey?10:1), v=new THREE.Vector3();
  if(mod&&(e.key==='ArrowUp'||e.key==='ArrowDown')){ v.y=e.key==='ArrowUp'?st:-st; }
  else{
    // "adelante" es hacia donde mira la cámara, llevado al eje de la cama más cercano
    const f=new THREE.Vector3(); cam.getWorldDirection(f); f.y=0;
    if(f.lengthSq()<1e-8){ f.set(0,1,0).applyQuaternion(cam.quaternion); f.y=0; } // vista desde arriba: "adelante" es hacia arriba en pantalla
    if(Math.abs(f.x)>Math.abs(f.z))f.set(Math.sign(f.x),0,0); else f.set(0,0,Math.sign(f.z)||-1);
    const r=new THREE.Vector3(-f.z,0,f.x); // derecha en pantalla
    const d={ArrowUp:f,ArrowDown:f.clone().negate(),ArrowRight:r,ArrowLeft:r.clone().negate()}[e.key];
    v.copy(d).multiplyScalar(st);
  }
  list.forEach(o=>o.position.add(v)); arrowMoved=true; updateDims();
  const o=list[list.length-1];
  msg('X '+(Math.round(o.position.x*10)/10)+' · Y '+(Math.round(o.position.y*10)/10)+' · Z '+(Math.round(o.position.z*10)/10)+' mm');
});
// una sola entrada en el historial por cada tanda de flechas
addEventListener('keyup',e=>{ if(arrowMoved&&e.key.startsWith('Arrow')){ arrowMoved=false; commit(); } });
addEventListener('blur',()=>{ if(arrowMoved){arrowMoved=false; commit();} });

// ===== Panel de propiedades con varias piezas: trabaja sobre el conjunto =====
// Medidas y Posición son las de la caja del conjunto. Rotación: el número escrito se suma como giro alrededor del centro.
// Se aplica al confirmar (Enter o salir del campo), así un número a medio escribir no mueve nada.
['x','y','z'].forEach(k=>{
  const cap=(id,fn)=>{ const el=$(id);
    el.addEventListener('input',e=>{ if(multiSel())e.stopImmediatePropagation(); },true);
    el.addEventListener('change',e=>{ if(!multiSel())return; const v=parseFloat(e.target.value); if(isNaN(v)){updateDims();return;} fn(v); updateDims(); },true);
  };
  cap('#d'+k,v=>{
    if(!(v>0))return; const b=groupBox(), sz=b.getSize(new THREE.Vector3()); if(sz[k]<1e-9)return;
    const r=v/sz[k], F=$('#dlock').checked?new THREE.Vector3(r,r,r):new THREE.Vector3(k==='x'?r:1,k==='y'?r:1,k==='z'?r:1);
    const A=b.getCenter(new THREE.Vector3()); A.y=b.min.y; // crece desde el centro y sin despegarse de donde está apoyado
    let baked=0; sel.forEach(o=>{ if(scaleWorld(o,{p:o.position.clone(),q:o.quaternion.clone(),s:o.scale.clone()},F,A,true))baked++; else if(o.userData.p)rebuild(o); });
    if(baked)msg(baked===1?'La pieza girada se escaló sin deformarse.':baked+' piezas giradas se escalaron sin deformarse.');
  });
  cap('#p'+k,v=>{ const c=groupBox().getCenter(new THREE.Vector3()), d=v-c[k]; sel.forEach(o=>{o.position[k]+=d;}); });
  cap('#r'+k,v=>{
    if(!v)return; const c=groupBox().getCenter(new THREE.Vector3()), ax=new THREE.Vector3(k==='x'?1:0,k==='y'?1:0,k==='z'?1:0), q=new THREE.Quaternion().setFromAxisAngle(ax,THREE.MathUtils.degToRad(v));
    sel.forEach(o=>{o.position.sub(c).applyQuaternion(q).add(c); o.quaternion.premultiply(q);});
    $('#r'+k).value=0;
  });
});
