'use strict';
// Constructor 3D: grabar texto en una cara de una pieza.
// Elegís la pieza y «Grabar en la pieza»: el texto aparece sobre ella. Lo movés tocando la cara (sigue al puntero),
// elegís la profundidad en el panel (se ve al cambiarla) y «Confirmar grabado» lo resta con el mismo motor que Restar.
// Escape cancela. Los scripts de js/ comparten el ámbito global y se cargan en orden desde index.html.

let grab=null; // {T: pieza, m: texto de vista previa, tx: datos del texto, aim: {pt, n} punto y normal de la cara}
const grabSetUI=on=>{ const b=$('#tgrab'); b.textContent=on?'Confirmar grabado':'Grabar en la pieza'; b.title=on?'Restar el texto de la pieza con la posición y profundidad actuales':'Grabar el texto en la cara de la pieza elegida'; };
// centra la forma del texto en el origen, así el punto que se toca queda en el medio del texto
const grabCentrar=geo=>{ geo.computeBoundingBox(); const c=geo.boundingBox.getCenter(new THREE.Vector3()); geo.translate(-c.x,-c.y,-c.z); return geo; };
// pone el texto sobre la cara: la base queda 1 mm afuera y el texto se hunde su profundidad
const grabPlace=(m,a,d)=>{ m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),a.n); m.position.copy(a.pt).addScaledVector(a.n,1-d/2); m.updateMatrixWorld(true); };
// avisa cuando el texto sobresale de la cara (solo cuando cambia, para no llenar la barra de mensajes)
function grabFit(){
  if(!grab||!grab.aim)return;
  const {T,m}=grab, tb=bbox(T), wb=new THREE.Box3().setFromObject(m), n=grab.aim.n;
  const k=Math.abs(n.x)>0.5?0:Math.abs(n.y)>0.5?1:2, ax=['x','y','z'];
  const over=[0,1,2].filter(i=>i!==k&&(wb.max[ax[i]]-wb.min[ax[i]])>(tb.max[ax[i]]-tb.min[ax[i]])+0.05);
  const warn=over.length>0;
  if(warn!==!!grab.warn){ grab.warn=warn;
    if(warn){const i=over[0], t=wb.max[ax[i]]-wb.min[ax[i]], f=tb.max[ax[i]]-tb.min[ax[i]];
      msg('El texto ('+t.toFixed(0)+' mm) es más grande que la cara ('+f.toFixed(0)+' mm): sobresale. Bajá la altura de letra en el panel del texto.');}
    else msg('Texto dentro de la cara. Tocá para fijarlo, o «Confirmar grabado».'); }
}
// punto de la cara de la pieza elegida bajo el puntero
function grabAim(e){
  setRay(e); const h=ray2.intersectObject(grab.T,false)[0];
  if(!h||!h.face)return null;
  const n=h.face.normal.clone().applyMatrix3(new THREE.Matrix3().getNormalMatrix(grab.T.matrixWorld)).normalize();
  return {pt:h.point.clone(), n};
}
function grabEnd(){
  if(!grab)return; const {T,m}=grab; grab=null;
  scene.remove(m); const i=objs.indexOf(m); if(i>=0)objs.splice(i,1); m.geometry.dispose();
  grabSetUI(false); if(objs.includes(T))select([T]);
}

async function grabarTexto(){
  if(grab)return grabConfirmar();
  const T=sel[sel.length-1];
  if(!T||M_(T).tx){msg('Elegí primero la pieza donde querés grabar el texto (no otro texto).'); return;}
  const tx=readTx(); if(!tx.s.trim()){msg('Escribí el texto primero.'); return;}
  await busyOn('Preparando el texto…');
  try{
    const {geo,miss}=await textGeometry({...tx,lay:true});
    if(!geo){msg('Esa tipografía no tiene ninguna de esas letras.'); return;}
    grabCentrar(geo);
    const m=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:0xffffff}));
    scene.add(m); objs.push(m); M_(m).n='Texto grabado'; M_(m).g=null; m.userData.grab=true;
    const bb=bbox(T), c=bb.getCenter(new THREE.Vector3());
    grab={T,m,tx,miss,aim:{pt:new THREE.Vector3(c.x,bb.max.y,c.z),n:new THREE.Vector3(0,1,0)}};
    grabPlace(m,grab.aim,tx.depth);
    grabSetUI(true); grabFit(); select([T]);
    msg('Tocá la cara de "'+M_(T).n+'" donde querés el texto: sigue al puntero y se fija con un clic. Profundidad en el panel del texto. Después «Confirmar grabado». Escape cancela.');
  }catch(err){
    console.error(err); msg('No se pudo preparar el texto. Revisá la conexión a internet.'); grabEnd();
  }finally{ busyOff(); }
}
async function grabConfirmar(){
  const {T,m,miss}=grab; grab=null; grabSetUI(false);
  try{
    select([T,m]);
    await runOp('subtract');
    msg('Texto grabado en "'+M_(T).n+'"'+(miss&&miss.length?'. Estas letras no están en la tipografía: '+miss.join(' '):'.')+' Si la cara es curva, el texto puede salirse; probá con una cara plana.');
  }catch(err){
    console.error(err); msg('No se pudo grabar el texto. Revisá la conexión a internet.');
    scene.remove(m); const i=objs.indexOf(m); if(i>=0)objs.splice(i,1); select([T]);
  }
}
// mover: el texto sigue al puntero sobre la cara; un clic lo fija
let grabDown=null;
canvas.addEventListener('pointerdown',e=>{ grabDown=[e.clientX,e.clientY]; },true);
canvas.addEventListener('pointermove',e=>{
  if(!grab)return; const a=grabAim(e); if(a){grab.aim=a; grabPlace(grab.m,a,grab.tx.depth); grabFit();}
});
canvas.addEventListener('pointerup',e=>{
  if(!grab||e.button!==0)return;
  if(grabDown&&Math.hypot(e.clientX-grabDown[0],e.clientY-grabDown[1])>4)return; // fue un giro de cámara
  const a=grabAim(e);
  if(a){ // clic sobre la cara: fija la posición, sin cambiar la selección
    e.stopImmediatePropagation(); grab.aim=a; grabPlace(grab.m,a,grab.tx.depth); grabFit(); return; }
  // clic fuera de la pieza: se cancela el grabado y el clic sigue de largo (así el visor vuelve a responder)
  grabEnd(); msg('Grabado cancelado: tocaste fuera de la pieza.');
},true);
// si se borra la pieza mientras se ubica el texto, la vista previa se descarta
setInterval(()=>{ if(grab&&!objs.includes(grab.T))grabEnd(); },300);
// cambiar la profundidad rehace la forma del texto sobre la misma posición
$('#tdepth').addEventListener('input',async()=>{
  if(!grab)return; const g=grab, tx={...readTx(),lay:true};
  const {geo}=await textGeometry(tx); if(!geo||grab!==g)return; grabCentrar(geo);
  g.m.geometry.dispose(); g.m.geometry=geo; g.tx.depth=tx.depth; grabPlace(g.m,g.aim,tx.depth); grabFit();
});
addEventListener('keydown',e=>{ if(grab&&e.key==='Escape'){e.preventDefault(); grabEnd(); msg('Grabado cancelado.');} });
$('#tgrab').onclick=grabarTexto;
