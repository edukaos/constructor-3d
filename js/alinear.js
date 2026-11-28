'use strict';
// Constructor 3D: Alinear en el visor, con el funcionamiento de Tinkercad.
// Con 2 o más piezas elegidas, el botón Alinear muestra puntos sobre la caja del conjunto: 3 por eje
// (un extremo, el centro y el otro extremo). Pasar el mouse por un punto muestra cómo quedarían; clic las alinea.
// Clic en una de las piezas elegidas la marca como referencia: esa no se mueve y las demás se alinean a ella.
// Clic en otro lado o Esc sale. Con una sola pieza, Alinear abre el panel (centrar y espejo).
// Los grupos se mueven enteros, como una sola pieza.
// Los scripts de js/ comparten el ámbito global y se cargan en orden desde index.html.

const AL_COL={x:0xff6b6b,y:0x5fd38a,z:0x5aa2ff};
const alG=new THREE.Group(); alG.visible=false; scene.add(alG);
const alDots=[]; // {m (malla para tocar y ver), k (eje), w ('min'|'mid'|'max')}
['x','y','z'].forEach(k=>['min','mid','max'].forEach(w=>{
  const m=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),new THREE.MeshBasicMaterial({color:AL_COL[k],depthTest:false,transparent:true}));
  m.renderOrder=999; const ring=new THREE.Mesh(new THREE.SphereGeometry(1.35,16,12),new THREE.MeshBasicMaterial({color:0x0b1a33,depthTest:false,transparent:true,opacity:.85}));
  ring.renderOrder=998; m.add(ring); m.userData={k,w}; alG.add(m); alDots.push({m,k,w});
}));
// líneas guía: una por eje, uniendo sus tres puntos
const alLines={}; ['x','y','z'].forEach(k=>{ const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),new THREE.LineBasicMaterial({color:AL_COL[k],depthTest:false,transparent:true,opacity:.6})); l.renderOrder=997; l.frustumCulled=false; alG.add(l); alLines[k]=l; });
const alBar=document.createElement('div'); alBar.id='albar'; alBar.hidden=true;
alBar.innerHTML='<span id="altxt"></span><button type="button" id="almore">Espejo y centrar…</button><button type="button" id="alexit" class="pri">Listo</button>';
$('#wrap').appendChild(alBar);

// "unidades": cada pieza suelta, o cada grupo entero
function alUnits(){
  const out=[], seen=new Map();
  sel.forEach(o=>{ const g=grpOf(o); if(g){ if(!seen.has(g)){const u={objs:[]}; seen.set(g,u); out.push(u);} seen.get(g).objs.push(o); } else out.push({objs:[o]}); });
  return out;
}
const alBox=u=>{const b=new THREE.Box3(); u.objs.forEach(o=>b.union(bbox(o))); return b;};
const alVal=(b,k,w)=>w==='min'?b.min[k]:w==='max'?b.max[k]:(b.min[k]+b.max[k])/2;
// caja a la que se alinea: la de la referencia si hay, si no la del conjunto
function alTarget(){ return alMode.ref?alBox(alMode.ref):groupBox(); }

function alPlace(){
  if(!alMode)return;
  const b=alTarget(), c=b.getCenter(new THREE.Vector3()), k0=camK(c);
  const off=k0*0.06, zs=cam.position.z>=c.z?1:-1, xs=cam.position.x>=c.x?1:-1;
  const zf=(zs>0?b.max.z:b.min.z)+zs*off, xf=(xs>0?b.max.x:b.min.x)+xs*off, y0=b.min.y;
  const pos=(k,w)=>{ const v=alVal(b,k,w);
    if(k==='x')return new THREE.Vector3(v,y0,zf);          // a lo largo de la arista de adelante, en el piso
    if(k==='z')return new THREE.Vector3(xf,y0,v);          // a lo largo de la arista del costado, en el piso
    return new THREE.Vector3(xf+xs*off*1.3,v,zf+zs*off*1.3); };  // vertical, afuera de la esquina que mira a la cámara
  alDots.forEach(d=>{ d.m.position.copy(pos(d.k,d.w)); d.m.scale.setScalar(camK(d.m.position)*(alMode.hover===d?0.014:0.0095)); });
  ['x','y','z'].forEach(k=>{ const P=alLines[k].geometry.attributes.position, a=pos(k,'min'), z=pos(k,'max'); P.setXYZ(0,a.x,a.y,a.z); P.setXYZ(1,z.x,z.y,z.z); P.needsUpdate=true; });
}
function alStatus(){
  if(!alMode)return;
  const n=alUnits().length;
  $('#altxt').innerHTML=alMode.hover?alHint(alMode.hover):(alMode.ref?'Referencia: <b>'+M_(alMode.ref.objs[0]).n.replace(/</g,'&lt;')+'</b> (no se mueve). Pasá el mouse por un punto para ver cómo quedan; clic para alinear.':'Alinear '+n+' piezas: pasá el mouse por un punto para ver cómo quedan y hacé clic. Tocá una pieza para usarla de referencia.');
}
const AL_NAME={x:{min:'a la izquierda',mid:'al centro (X)',max:'a la derecha'},y:{min:'abajo',mid:'a media altura',max:'arriba'},z:{min:'atrás',mid:'al centro (Z)',max:'adelante'}};
function alHint(d){ return 'Clic para alinear <b>'+AL_NAME[d.k][d.w]+'</b>'+(alMode.ref?' de la referencia':'')+'.'; }

// vista previa: mueve las piezas y guarda dónde estaban para poder volver
function alPreview(d){
  alRestore(); if(!d)return;
  const b=alTarget(), t=alVal(b,d.k,d.w), save=[];
  alUnits().forEach(u=>{ if(alMode.ref&&u.objs[0]===alMode.ref.objs[0])return; const dl=t-alVal(alBox(u),d.k,d.w); if(Math.abs(dl)<1e-9)return; u.objs.forEach(o=>{save.push([o,o.position[d.k]]); o.position[d.k]+=dl;}); });
  alMode.saved=save; alMode.savedK=d.k; updateDims();
}
function alRestore(){ if(!alMode||!alMode.saved)return; const k=alMode.savedK; alMode.saved.forEach(([o,v])=>{o.position[k]=v;}); alMode.saved=null; updateDims(); }

function alSetRef(u){
  if(alMode.ref)alMode.ref.objs.forEach(o=>o.material.emissive.setHex(0x5a4410));
  alMode.ref=u&&(!alMode.ref||alMode.ref.objs[0]!==u.objs[0])?u:null;
  if(alMode.ref)alMode.ref.objs.forEach(o=>o.material.emissive.setHex(0x0a3a7a));
  alPlace(); alStatus();
}
function alStart(){
  if(alMode){alEnd(); return;}
  if(alUnits().length<2){ openPanel('#toolp'); return; }
  alMode={ref:null,hover:null,saved:null,sel:sel.slice()};
  $('#msg').classList.add('off'); alG.visible=true; alBar.hidden=false; $('#alinear').classList.add('on'); updateScaleUI(); alPlace(); alStatus();
}
function alEnd(){
  if(!alMode)return; alRestore();
  if(alMode.ref)alMode.ref.objs.forEach(o=>{ if(sel.includes(o))o.material.emissive.setHex(0x5a4410); else o.material.emissive.setHex(0); });
  alMode=null; alG.visible=false; alBar.hidden=true; $('#alinear').classList.remove('on'); canvas.style.cursor=''; updateScaleUI();
}
$('#alinear').onclick=alStart;
$('#alexit').onclick=alEnd;
$('#almore').onclick=()=>{ alEnd(); openPanel('#toolp'); };

const alPick=e=>{ setRay(e); const h=ray2.intersectObjects(alDots.map(d=>d.m),false)[0]; return h?alDots.find(d=>d.m===h.object):null; };
canvas.addEventListener('pointerdown',e=>{
  if(!alMode||e.button!==0)return;
  const d=alPick(e);
  if(d){
    e.stopImmediatePropagation(); e.preventDefault(); down=null;
    alPreview(d); alMode.saved=null; // la vista previa queda aplicada
    commit(); msg('Alineadas '+AL_NAME[d.k][d.w]+(alMode.ref?' de la referencia':'')+'.'); alPlace(); alStatus(); return;
  }
  setRay(e); const hp=ray2.intersectObjects(pickable(),false)[0];
  if(hp&&sel.includes(hp.object)){
    e.stopImmediatePropagation(); e.preventDefault(); down=null;
    const u=alUnits().find(u=>u.objs.includes(hp.object)); alSetRef(u); return;
  }
  alEnd(); // clic en otro lado: sale y el clic sigue su curso normal (elegir, girar la cámara…)
},true);
canvas.addEventListener('pointermove',e=>{
  if(!alMode||e.buttons)return;
  const d=alPick(e);
  if(d!==alMode.hover){ alMode.hover=d; alPreview(d); alPlace(); alStatus(); }
  if(d)canvas.style.cursor='pointer'; else { setRay(e); const hp=ray2.intersectObjects(pickable(),false)[0]; canvas.style.cursor=hp&&sel.includes(hp.object)?'crosshair':''; }
});
canvas.addEventListener('pointerleave',()=>{ if(alMode&&alMode.hover){alMode.hover=null; alPreview(null); alPlace(); alStatus();} });
addEventListener('keydown',e=>{ if(alMode&&e.key==='Escape'){ e.stopImmediatePropagation(); alEnd(); } },true);
// si la selección cambia por otro lado, el modo se cierra; los puntos siguen a la cámara
(function alWatch(){
  requestAnimationFrame(alWatch);
  if(!alMode)return;
  if(sel.length!==alMode.sel.length||sel.some((o,i)=>o!==alMode.sel[i])||splitting||placing||tool){ alEnd(); return; }
  alPlace();
})();
