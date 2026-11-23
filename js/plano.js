'use strict';
// Constructor 3D: plano de trabajo sobre una cara, como en Tinkercad.
// Tocás una cara de una pieza y las piezas nuevas se apoyan sobre ese plano (inclinado o vertical también),
// con la base mirando hacia la cara. Tocar un espacio vacío, o el botón Cama, vuelve a la cama.
// Los scripts de js/ comparten el ámbito global y se cargan en orden desde index.html.

let wp=null;   // {o: punto en la cara, n: normal, q: giro de +Y a la normal, u y v: ejes del plano}
const WP_SIZE=60;
const wpViz=new THREE.Group(); wpViz.visible=false; wpViz.renderOrder=6; scene.add(wpViz);
{
  const grid=new THREE.GridHelper(WP_SIZE,WP_SIZE/5,0xF5C451,0xF5C451);
  grid.material.transparent=true; grid.material.opacity=.45; grid.material.depthTest=false; grid.renderOrder=6;
  const fill=new THREE.Mesh(new THREE.PlaneGeometry(WP_SIZE,WP_SIZE).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xF5C451,transparent:true,opacity:.1,depthWrite:false,side:THREE.DoubleSide}));
  const arrow=new THREE.ArrowHelper(new THREE.Vector3(0,1,0),new THREE.Vector3(),12,0xF5C451,4,3);
  arrow.line.material.depthTest=false; arrow.cone.material.depthTest=false;
  wpViz.add(fill,grid,arrow);
}
function wpSet(origin,normal){
  const n=normal.clone().normalize(), q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),n);
  wp={o:origin.clone(),n,q,u:new THREE.Vector3(1,0,0).applyQuaternion(q),v:new THREE.Vector3(0,0,1).applyQuaternion(q)};
  wpViz.position.copy(wp.o).addScaledVector(n,0.05); wpViz.quaternion.copy(q); wpViz.visible=true;
  $('#wpbtn').classList.add('act'); wpBadge(); wake();
}
function wpClear(silent){
  if(!wp)return; wp=null; wpViz.visible=false; $('#wpbtn').classList.remove('act'); wpBadge(); wake();
  if(!silent)msg('Plano de trabajo: de vuelta en la cama.');
}
function wpBadge(){const b=$('#wpoff'); if(b)b.disabled=!wp;}
wpBadge();

// herramienta: tocar una cara
{
  const setToolBase=setTool;
  setTool=function(t){
    setToolBase(t);
    $('#wpbtn').classList.toggle('on',tool==='wp');
    if(tool==='wp')msg('Plano de trabajo: tocá la cara de una pieza donde querés armar. Tocá un espacio vacío para volver a la cama. Esc cancela.');
  };
}
function wpClick(e){
  setRay(e); const h=ray2.intersectObjects(objs.filter(o=>o.visible),false)[0];
  setTool(null);
  if(!h||!h.face){wpClear(); return;}
  const o=h.object; o.updateMatrixWorld(true);
  const n=h.face.normal.clone().applyMatrix3(new THREE.Matrix3().getNormalMatrix(o.matrixWorld)).normalize();
  wpSet(h.point,n);
  msg('Plano de trabajo sobre "'+M_(o).n+'". Las piezas nuevas se apoyan acá. Botón Cama (o Esc dos veces) para volver.');
}
$('#wpbtn').onclick=()=>{if(splitting)endSplit(); setTool('wp');};
$('#wpoff').onclick=()=>wpClear();
addEventListener('keydown',e=>{ if(e.key==='Escape'&&wp&&!tool&&!placing&&!sk&&sel.length===0)wpClear(); });

// ubicar pieza nueva sobre el plano
function wpPose(m,pt){
  const bb=m.geometry.boundingBox, c=new THREE.Vector3((bb.min.x+bb.max.x)/2,bb.min.y,(bb.min.z+bb.max.z)/2);
  m.quaternion.copy(wp.q);
  m.position.copy(pt).sub(c.multiply(m.scale).applyQuaternion(wp.q));
}
{
  const startBase=startPlace;
  startPlace=function(m){
    if(wp){m.geometry.computeBoundingBox(); wpPose(m,wp.o);}
    startBase(m); if(wp)placeMark.visible=false;
  };
  const placeAtBase=placeAt;
  placeAt=function(e){
    if(!wp)return placeAtBase(e);
    const m=placing.m; setRay(e); const pt=new THREE.Vector3();
    if(!ray2.ray.intersectPlane(new THREE.Plane().setFromNormalAndCoplanarPoint(wp.n,wp.o),pt))return;
    if($('#snap').classList.contains('on')){
      const st=snapStep(), d=pt.clone().sub(wp.o), u=Math.round(d.dot(wp.u)/st)*st, v=Math.round(d.dot(wp.v)/st)*st;
      pt.copy(wp.o).addScaledVector(wp.u,u).addScaledVector(wp.v,v);
    }
    wpPose(m,pt); placeMark.visible=false;
  };
}
// proyecto nuevo o abierto: vuelve a la cama
{
  const resetBase=resetTransient;
  resetTransient=function(){resetBase(); wpClear(true);};
}
