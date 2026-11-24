'use strict';
// Constructor 3D: menú contextual (clic derecho sobre el visor).
// Muestra las operaciones más comunes según lo elegido: una pieza, dos o más, o un grupo.
// Usa las mismas funciones y botones de la cinta, y toma sus iconos para que se vean iguales.
// Los scripts de js/ comparten el ámbito global y se cargan en orden desde index.html.

const ctxm=document.createElement('div');
ctxm.id='ctxm'; ctxm.hidden=true; ctxm.setAttribute('role','menu');
document.body.appendChild(ctxm);
let ctxDown=null;
const ctxClose=()=>{ctxm.hidden=true; ctxm.innerHTML='';};
// icono del botón de la cinta que ya existe (si no hay, el texto solo)
const ctxIcon=sel=>{const e=document.querySelector(sel), s=e&&e.querySelector('svg'); return s?s.cloneNode(true):null;};

// cada fila: [texto, acción, selector del icono, se muestra]
function ctxRows(){
  const n=sel.length, selG=selGroup(), hasG=n>0&&sel.some(grpOf), clipOn=clip.length>0;
  const copy=['Copiar',()=>copySel(),null,n>0];
  const paste=['Pegar',()=>pasteSel(),null,clipOn];
  const dup=['Duplicar',()=>$('#dup').click(),'#dup',n>0];
  const del=['Borrar',()=>$('#del').click(),'#del',n>0];
  const align=['Alinear y reflejar',()=>$('#alinear').click(),'#alinear',n>0];
  const bed=['Apoyar en la cama',()=>$('#ground').click(),'#ground',n>0];
  const union=['Unir',()=>runOp('union'),'[data-op="union"]',n>=2];
  const sub=['Restar',()=>runOp('subtract'),'[data-op="subtract"]',n>=2];
  const inter=['Intersectar',()=>runOp('intersect'),'[data-op="intersect"]',n>=2];
  const group=['Agrupar piezas',()=>groupSel(),'#grpbtn',n>=2&&!selG];
  const ungroup=['Desagrupar',()=>ungroupSel(),'#ungrp',hasG];
  const all=['Seleccionar todo',()=>select(objs.filter(o=>o.visible)),null,objs.length>0&&n<objs.length];
  if(n===0)return [paste,all];
  if(n===1)return [copy,paste,dup,del,'-',bed,align,'-',ungroup];
  return [copy,paste,dup,del,'-',union,sub,inter,'-',group,ungroup,'-',align];
}
function ctxOpen(x,y){
  ctxm.innerHTML='';
  // solo las filas visibles; un separador entre bloques, sin separadores sobrantes
  let pendingHr=false, any=false;
  ctxRows().forEach(r=>{
    if(r==='-'){ if(any)pendingHr=true; return; }
    if(!r[3])return;
    if(pendingHr){const hr=document.createElement('hr'); hr.setAttribute('role','separator'); ctxm.appendChild(hr); pendingHr=false;}
    const [label,act,icon]=r, b=document.createElement('button');
    b.type='button'; b.setAttribute('role','menuitem');
    const ic=icon?ctxIcon(icon):null; if(ic){ic.setAttribute('class','ci'); b.appendChild(ic);}
    const t=document.createElement('span'); t.textContent=label; b.appendChild(t);
    b.onclick=()=>{ctxClose(); act();};
    ctxm.appendChild(b); any=true;
  });
  ctxm.hidden=false;
  const W=innerWidth, H=innerHeight, w=ctxm.offsetWidth, h=ctxm.offsetHeight;
  ctxm.style.left=Math.max(4,Math.min(x,W-w-8))+'px';
  ctxm.style.top=Math.max(4,Math.min(y,H-h-8))+'px';
}
canvas.addEventListener('pointerdown',e=>{ ctxDown=e.button===2?{x:e.clientX,y:e.clientY}:null; },true);
canvas.addEventListener('contextmenu',e=>{
  e.preventDefault();
  // si el botón derecho se usó para girar la cámara, no abre el menú
  if(ctxDown&&Math.hypot(e.clientX-ctxDown.x,e.clientY-ctxDown.y)>5)return;
  if(tool||splitting||placing)return;
  setRay(e);
  const hit=ray2.intersectObjects(objs.filter(o=>o.visible),false)[0];
  if(hit&&!sel.includes(hit.object))select([hit.object]);
  ctxOpen(e.clientX,e.clientY);
});
addEventListener('pointerdown',e=>{ if(!ctxm.hidden&&!ctxm.contains(e.target))ctxClose(); },true);
addEventListener('keydown',e=>{ if(e.key==='Escape')ctxClose(); });
addEventListener('wheel',ctxClose,{passive:true});
addEventListener('resize',ctxClose);
