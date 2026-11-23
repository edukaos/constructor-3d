'use strict';
// Constructor 3D: agrupar piezas sin fusionarlas.
// Un grupo es una marca en cada pieza (M_(o).g). Al elegir una pieza del grupo se eligen todas,
// así se mueven, alinean, duplican y borran juntas. El panel Grupo escala y gira el conjunto.
// Los scripts de js/ comparten el ámbito global y se cargan en orden desde index.html.

const grpOf=o=>M_(o).g||null;
const grpMembers=g=>objs.filter(o=>grpOf(o)===g);
// sacar una pieza de la selección (Shift + clic): si está en un grupo, sale el grupo entero
const selWithout=o=>sel.filter(x=>x!==o&&!(grpOf(o)&&grpOf(x)===grpOf(o)));
const newGroupId=()=>'g'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);

// select() expande la selección al grupo entero. Si se saca una pieza de un grupo (y no queda ninguna de ese grupo en la lista), sale el grupo entero;
// con Shift + clic sobre una pieza de un grupo ya elegido, el grupo sale entero.
{
  const selectBase=select;
  select=function(list){
    const prev=sel.slice(), kept=new Set(list.map(grpOf).filter(Boolean)), dropped=new Set(prev.filter(o=>!list.includes(o)).map(grpOf).filter(g=>g&&!kept.has(g)));
    let out=list.filter(o=>!dropped.has(grpOf(o)));
    const gs=new Set(out.map(grpOf).filter(Boolean));
    if(gs.size){
      const last=out[out.length-1], extra=objs.filter(o=>gs.has(grpOf(o))&&!out.includes(o)&&o.visible);
      out=[...out.filter(o=>o!==last),...extra,last].filter(Boolean);
    }
    return selectBase(out);
  };
}
// La selección actual es exactamente un grupo
function selGroup(){const gs=new Set(sel.map(grpOf)); if(gs.size!==1)return null; const g=[...gs][0]; return g&&grpMembers(g).every(o=>sel.includes(o))?g:null;}

function groupSel(){
  if(sel.length<2){msg('Elegí dos o más piezas (Shift + clic) para agruparlas.'); return;}
  if(selGroup()){openGroupPanel(); return;}
  const g=newGroupId(); sel.forEach(o=>{M_(o).g=g;});
  commit(); renderList(true); updateDims(); openGroupPanel();
  msg('Agrupadas '+sel.length+' piezas: ahora se eligen y se mueven juntas. Desagrupar (Ctrl+Shift+G) las separa.');
}
function ungroupSel(){
  const gs=new Set(sel.map(grpOf).filter(Boolean));
  if(!gs.size){msg('La selección no tiene grupos.'); return;}
  objs.forEach(o=>{if(gs.has(grpOf(o)))delete M_(o).g;});
  $('#grpp').hidden=true; commit(); renderList(true); updateDims();
  msg(gs.size===1?'Grupo deshecho: las piezas vuelven a ser independientes.':gs.size+' grupos deshechos.');
}

// Escalar y girar el grupo entero alrededor del centro de su base
function groupBox(){const b=new THREE.Box3(); sel.forEach(o=>b.union(bbox(o))); return b;}
function groupPivot(){const b=groupBox(), c=b.getCenter(new THREE.Vector3()); c.y=b.min.y; return c;}
function groupScale(k){
  if(!sel.length||!(k>0)||k===1)return;
  const c=groupPivot();
  sel.forEach(o=>{o.position.sub(c).multiplyScalar(k).add(c); o.scale.multiplyScalar(k); if(o.userData.p)rebuild(o);});
  updateDims(); commit(); groupPanelInfo();
}
function groupRotate(deg){
  if(!sel.length)return;
  const c=groupPivot(), q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),THREE.MathUtils.degToRad(deg));
  sel.forEach(o=>{o.position.sub(c).applyQuaternion(q).add(c); o.quaternion.premultiply(q);});
  updateDims(); commit(); groupPanelInfo();
}
function groupPanelInfo(){
  const b=groupBox(), s=b.getSize(new THREE.Vector3()), r=v=>Math.round(v*10)/10;
  $('#grpinfo').textContent=sel.length+' piezas · '+r(s.x)+' × '+r(s.z)+' × '+r(s.y)+' mm (ancho × fondo × alto)';
  $('#grpw').value=r(s.x);
}
function openGroupPanel(){ if(!sel.length)return; openPanel('#grpp',true); groupPanelInfo(); }

$('#grpbtn').onclick=groupSel;
$('#ungrp').onclick=ungroupSel;
$('#grppct').addEventListener('change',e=>{const v=parseFloat(e.target.value); if(v>0)groupScale(v/100); e.target.value=100;});
$('#grpw').addEventListener('change',e=>{const v=parseFloat(e.target.value), w=groupBox().getSize(new THREE.Vector3()).x; if(v>0&&w>0)groupScale(v/w);});
$('#grpl').onclick=()=>groupRotate(90);
$('#grpr').onclick=()=>groupRotate(-90);
$('#grpun').onclick=ungroupSel;
addEventListener('keydown',e=>{
  if(e.target.tagName==='INPUT'||e.target.tagName==='SELECT'||e.target.tagName==='TEXTAREA')return;
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='g'){e.preventDefault(); e.shiftKey?ungroupSel():groupSel();}
});

// Duplicar con un grupo elegido copia el grupo entero, como un grupo nuevo
{
  const dupBase=$('#dup').onclick;
  $('#dup').onclick=()=>{
    if(!sel.some(grpOf))return dupBase();
    const remap={}, made=[];
    sel.forEach(o=>{
      const m=new THREE.Mesh(o.geometry.clone(),o.material.clone()); m.userData.m=JSON.parse(JSON.stringify(M_(o)));
      m.userData.m.n=M_(o).n+' (copia)'; m.userData.m.h=false; m.userData.m.l=false;
      const g=grpOf(o); if(g)m.userData.m.g=remap[g]||(remap[g]=newGroupId());
      m.position.copy(o.position).add(new THREE.Vector3(10,0,10)); m.quaternion.copy(o.quaternion); m.scale.copy(o.scale);
      if(o.userData.p)m.userData.p={...o.userData.p}; if(o.userData.fx)m.userData.fx=o.userData.fx;
      scene.add(m); objs.push(m); made.push(m);
    });
    select(made); updateDims(); commit(); msg('Grupo duplicado.');
  };
}
// Pegar: las piezas pegadas forman grupos nuevos (no se suman al grupo original)
{
  const pasteBase=pasteSel;
  pasteSel=function(){
    const n0=objs.length; pasteBase(); const made=objs.slice(n0), remap={};
    made.forEach(o=>{const g=grpOf(o); if(g)M_(o).g=remap[g]||(remap[g]=newGroupId());});
    if(Object.keys(remap).length){select(made); commit();}
  };
}
