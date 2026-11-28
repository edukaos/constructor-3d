'use strict';
// Constructor 3D: paneles, lista, vistas, selección, herramientas, texto y patrón.
// Los scripts de js/ comparten el ámbito global y se cargan en orden desde index.html.
// ===== Paneles: uno a la vez a la derecha =====
const PANELS=['#estp','#arrp','#secp','#libp','#toolp','#bedp','#chkp','#textp','#patp','#expp','#svgp','#shellp','#fuzzp','#rndp','#shpp','#fitp','#lookp','#grpp'];
function openPanel(id,force){
  const el=$(id), show=force!==undefined?force:el.hidden;
  PANELS.forEach(p=>{if(p!==id)$(p).hidden=true;});
  if(id!=='#chkp')clearOpenLines();
  if(show&&splitting)endSplit();
  el.hidden=!show; return show;
}
document.querySelectorAll('.pnl [data-close]').forEach(b=>b.onclick=()=>{b.closest('.pnl').hidden=true;});

// ===== Barra que se pliega en menús cuando no entra =====
let openDrop=null;
function closeDrop(){if(openDrop){openDrop.classList.remove('open'); openDrop=null;}}
function fitBar(){
  const bar=$('#topbar'), gs=[...bar.querySelectorAll('.grp')]; closeDrop();
  gs.forEach(g=>g.classList.remove('col'));
  if(document.body.classList.contains('v2'))return;
  const cs=getComputedStyle(bar), avail=bar.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight);
  const used=()=>{const k=[...bar.children].filter(c=>c.offsetParent); if(!k.length)return 0; return k[k.length-1].getBoundingClientRect().right-k[0].getBoundingClientRect().left;};
  for(const i of [3,2,0,1,4]){ if(used()<=avail+1&&bar.scrollWidth<=bar.clientWidth+1)break; if(gs[i])gs[i].classList.add('col'); }
}
document.addEventListener('pointerdown',e=>{if(openDrop&&!openDrop.contains(e.target))closeDrop();});

// ===== Lista de piezas =====
let listSig='';
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const IC={eye:'<svg viewBox="0 0 24 24"><path class="f" d="M2.5 12s3.8-6.5 9.5-6.5S21.5 12 21.5 12s-3.8 6.5-9.5 6.5S2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/></svg>',
  eyeoff:'<svg viewBox="0 0 24 24"><path d="M3.5 3.5l17 17M10.6 5.2A9.5 9.5 0 0 1 12 5.5c5.7 0 9.5 6.5 9.5 6.5a16 16 0 0 1-3 3.6M6.6 6.8C4 8.6 2.5 12 2.5 12s3.8 6.5 9.5 6.5a9.3 9.3 0 0 0 4.6-1.2"/></svg>',
  lock:'<svg viewBox="0 0 24 24"><rect class="f" x="5" y="11" width="14" height="9.5" rx="2.5"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/></svg>',
  unlock:'<svg viewBox="0 0 24 24"><rect class="f" x="5" y="11" width="14" height="9.5" rx="2.5"/><path d="M8 11V7.5a4 4 0 0 1 7.6-1.7"/></svg>'};
function renderList(force){
  const p=$('#listp'); if(!p||p.hidden)return;
  if(!force&&$('#lrows').querySelector('input'))return;
  const sig=objs.map(o=>{const m=M_(o); return o.id+'/'+m.n+'/'+m.h+'/'+m.l+'/'+m.k+'/'+(m.g||'')+'/'+o.material.color.getHex()+'/'+(sel.includes(o)?1:0);}).join('|');
  if(!force&&sig===listSig)return; listSig=sig;
  $('#lcount').textContent=objs.length;
  $('#lrows').innerHTML=objs.length?objs.map((o,i)=>{const m=M_(o);
    return '<div class="li'+(sel.includes(o)?' on':'')+(m.h?' off':'')+'" data-i="'+i+'"><span class="sw" style="background:#'+o.material.color.getHexString()+'"></span><span class="nm" title="Doble clic para renombrar">'+esc(m.n)+'</span>'+(m.k?'<span class="tag">hueco</span>':'')+(m.g?'<span class="tag" title="Está en un grupo: se elige y se mueve junto con las otras piezas del grupo">grupo</span>':'')+
      '<button class="ic'+(m.h?' act':'')+'" data-act="h" title="'+(m.h?'Mostrar':'Ocultar')+'">'+(m.h?IC.eyeoff:IC.eye)+'</button>'+
      '<button class="ic'+(m.l?' act':'')+'" data-act="l" title="'+(m.l?'Desbloquear':'Bloquear: no se puede mover ni elegir en el visor')+'">'+(m.l?IC.lock:IC.unlock)+'</button></div>';}).join('')
    :'<small>'+(document.body.classList.contains('v2')?'No hay piezas. Tocá el + amarillo para agregar una forma.':'No hay piezas. Agregá una forma desde la barra.')+'</small>';
}
function toggleList(v){const p=$('#listp'); if(document.body.classList.contains('v2')){p.hidden=false; renderList(true); return;} p.hidden=v===undefined?!p.hidden:!v; $('#listbtn').classList.toggle('on',!p.hidden); renderList(true);}
$('#listbtn').onclick=()=>toggleList();
$('#lclose').onclick=()=>toggleList(false);
$('#lrows').addEventListener('click',e=>{
  const row=e.target.closest('.li'); if(!row||e.target.closest('input'))return;
  const o=objs[+row.dataset.i]; if(!o)return; const m=M_(o), act=e.target.closest('[data-act]');
  if(act){
    if(act.dataset.act==='h'){m.h=!m.h; if(m.h&&sel.includes(o))select(sel.filter(x=>x!==o)); msg(m.h?'"'+m.n+'" quedó oculta. Mientras esté oculta no se exporta.':'"'+m.n+'" visible otra vez.');}
    else {m.l=!m.l; select(sel.slice()); msg(m.l?'"'+m.n+'" bloqueada: no se puede mover ni elegir en el visor.':'"'+m.n+'" desbloqueada.');}
    applyGhost(); updateDims(); commit(); return;
  }
  if(m.h){m.h=false; applyGhost(); commit();}
  const add=e.ctrlKey||e.metaKey||e.shiftKey||multi;
  select(add?(sel.includes(o)?selWithout(o):[...sel,o]):[o]);
});
$('#lrows').addEventListener('dblclick',e=>{
  const nm=e.target.closest('.nm'); if(!nm)return; const o=objs[+nm.closest('.li').dataset.i]; if(!o)return;
  const inp=document.createElement('input'); inp.value=M_(o).n; inp.maxLength=60; nm.replaceWith(inp); inp.focus(); inp.select();
  let done=false;
  const fin=ok=>{if(done)return; done=true; const v=inp.value.trim(); if(ok&&v&&v!==M_(o).n){M_(o).n=v; commit();} renderList(true);};
  inp.addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault(); ev.stopPropagation(); fin(true);} else if(ev.key==='Escape'){ev.stopPropagation(); fin(false);}});
  inp.addEventListener('blur',()=>fin(true));
});

// ===== Vistas de cámara =====
let camAnim=null;
function sceneBox(list){
  const b=new THREE.Box3(); (list&&list.length?list:objs.filter(o=>o.visible)).forEach(o=>b.union(bbox(o)));
  if(b.isEmpty())b.set(new THREE.Vector3(-30,0,-30),new THREE.Vector3(30,25,30)); return b;
}
const VIEWS={front:[0,0.15,1],top:[0,1,0.0001],right:[1,0.15,0],iso:[0.75,0.6,1]};
const VIEWS_O={front:[0,0,1],top:[0,1,0.0001],right:[1,0,0],iso:[1,1,1]};
// tamaño aparente de un punto: en perspectiva depende de la distancia; en ortográfica, del zoom
const camK=p=>ortho?(ORTH_H/cam.zoom)*0.9:cam.position.distanceTo(p);
function setView(name){
  const b=sceneBox(sel), c=b.getCenter(new THREE.Vector3()), r=Math.max(b.getSize(new THREE.Vector3()).length()/2,8);
  const dir=name?new THREE.Vector3(...(Array.isArray(name)?name:(ortho?VIEWS_O:VIEWS)[name])).normalize():cam.position.clone().sub(orbit.target).normalize();
  const hf=THREE.MathUtils.degToRad(camP.fov)/2, fit=Math.min(hf,Math.atan(Math.tan(hf)*camP.aspect));
  const dist=r/Math.sin(fit)*1.08, to=c.clone().addScaledVector(dir,dist);
  cam.far=Math.max(ortho?4000:1000,dist*10); if(ortho){cam.near=-dist*10; cam.zoom=Math.max(.01,(ORTH_H/2)/(dist*Math.tan(hf)))/1.22;} cam.updateProjectionMatrix();
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){cam.position.copy(to); orbit.target.copy(c); return;}
  camAnim={p0:cam.position.clone(),t0:orbit.target.clone(),p1:to,t1:c,s:performance.now()};
}
function setProj(on){
  if(on===ortho)return;
  const t=orbit.target, dir=cam.position.clone().sub(t).normalize(), hf=THREE.MathUtils.degToRad(camP.fov)/2, next=on?camO:camP;
  if(on){const d=cam.position.distanceTo(t); camO.zoom=(ORTH_H/2)/(d*Math.tan(hf)); camO.position.copy(t).addScaledVector(dir,d); camO.near=-d*10;}
  else{const d=(ORTH_H/2)/camO.zoom/Math.tan(hf); camP.position.copy(t).addScaledVector(dir,d);}
  next.quaternion.copy(cam.quaternion); next.up.copy(cam.up);
  cam=next; ortho=on; camAnim=null;
  orbit.object=cam; tc.camera=cam; tp.camera=cam; resize(); orbit.update();
  if(composer){try{composer.dispose&&composer.dispose();}catch(e){} composer=null;}
  const pb=$('#projbtn'); pb.classList.toggle('on',ortho);
  msg(ortho?'Cámara ortográfica: sin perspectiva, ideal para medir. Frente, Arriba y Lado son vistas planas; 3D es la isométrica.':'Cámara en perspectiva.');
}
$('#projbtn').onclick=()=>setProj(!ortho);
function stepCam(){
  if(!camAnim)return; const k=Math.min(1,(performance.now()-camAnim.s)/280), e=1-Math.pow(1-k,3);
  cam.position.lerpVectors(camAnim.p0,camAnim.p1,e); orbit.target.lerpVectors(camAnim.t0,camAnim.t1,e); if(k>=1)camAnim=null;
}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
$('#vfit').onclick=()=>setView();

// ===== Cubo de vistas (arriba a la derecha del visor): clic en una cara = esa vista, arrastrar = orbitar =====
const vcube=(()=>{
  const root=document.createElement('div'); root.id='vcube'; root.title='Cubo de vistas: clic en una cara para ir a esa vista, arrastrá para orbitar';
  const box=document.createElement('div'); box.className='vc3'; root.appendChild(box);
  const faces=[['Frente','translateZ(var(--h))',[0,0,1]],['Atrás','rotateY(180deg) translateZ(var(--h))',[0,0,-1]],['Der','rotateY(90deg) translateZ(var(--h))',[1,0,0]],['Izq','rotateY(-90deg) translateZ(var(--h))',[-1,0,0]],['Arriba','rotateX(90deg) translateZ(var(--h))',[0,1,0.0001]],['Abajo','rotateX(-90deg) translateZ(var(--h))',[0,-1,0.0001]]];
  faces.forEach(([t,tr,dir])=>{const f=document.createElement('div'); f.className='vcf'; f.textContent=t; f.style.transform=tr; f.dataset.d=JSON.stringify(dir); box.appendChild(f);});
  $('#wrap').appendChild(root);
  let drag=null;
  root.addEventListener('pointerdown',e=>{ if(e.button!==0)return; e.preventDefault(); e.stopPropagation(); camAnim=null; drag={x:e.clientX,y:e.clientY,moved:false,f:e.target.closest('.vcf')}; root.setPointerCapture(e.pointerId); });
  root.addEventListener('pointermove',e=>{
    if(!drag)return; const dx=e.clientX-drag.x, dy=e.clientY-drag.y;
    if(!drag.moved&&Math.hypot(dx,dy)<4)return; drag.moved=true; drag.x=e.clientX; drag.y=e.clientY;
    const off=cam.position.clone().sub(orbit.target), sp=new THREE.Spherical().setFromVector3(off);
    sp.theta-=dx*0.012; sp.phi=Math.max(0.02,Math.min(Math.PI-0.02,sp.phi-dy*0.012));
    off.setFromSpherical(sp); cam.position.copy(orbit.target).add(off); cam.lookAt(orbit.target); orbit.update();
  });
  const end=e=>{ if(!drag)return; const d=drag; drag=null; try{root.releasePointerCapture(e.pointerId);}catch(_){} if(!d.moved&&d.f&&e.type==='pointerup')setView(JSON.parse(d.f.dataset.d)); };
  root.addEventListener('pointerup',end); root.addEventListener('pointercancel',end);
  const q=new THREE.Quaternion(), key=[0,0,0,0], m=new THREE.Matrix4();
  return {tick(){
    if(!root.offsetParent)return; const c=cam.quaternion;
    if(c.x===key[0]&&c.y===key[1]&&c.z===key[2]&&c.w===key[3])return; key[0]=c.x; key[1]=c.y; key[2]=c.z; key[3]=c.w;
    q.copy(c).invert(); m.makeRotationFromQuaternion(q); const e=m.elements; e[1]=-e[1]; e[4]=-e[4]; e[6]=-e[6]; e[9]=-e[9];
    box.style.transform='matrix3d('+e.join(',')+')';
  }};
})();


// Nunca dejar que la página se desplace (zoom, pellizco, foco): la interfaz queda fija.
(function(){const fix=()=>{if(scrollX||scrollY)scrollTo(0,0);for(const e of [document.documentElement,document.body,document.getElementById('wrap'),document.getElementById('main')]){if(e&&(e.scrollTop||e.scrollLeft)){e.scrollTop=0;e.scrollLeft=0;}}};
  ['scroll','resize'].forEach(t=>addEventListener(t,fix,true)); if(window.visualViewport)visualViewport.addEventListener('scroll',fix); setInterval(fix,500);})();

// ===== Etiquetas sobre el visor =====
function place(el,p){
  const v=p.clone().project(cam); if(v.z>1){el.style.visibility='hidden'; return;}
  const x=(v.x+1)/2*wrap.clientWidth, y=(1-v.y)/2*wrap.clientHeight;
  if(x<-40||y<-40||x>wrap.clientWidth+40||y>wrap.clientHeight+40){el.style.visibility='hidden'; return;}
  el.style.visibility=''; el.style.left=x+'px'; el.style.top=y+'px';
}
function hideCotas(){['#cx','#cy','#cz'].forEach(i=>{$(i).hidden=true;});}
function showCotas(o,mn,mx,axes){
  o.updateMatrixWorld(true); const V=THREE.Vector3, W=v=>v.applyMatrix4(o.matrixWorld), s=mx.clone().sub(mn).multiply(o.scale);
  const f=v=>Math.abs(v).toLocaleString('es-AR',{maximumFractionDigits:1})+' mm';
  [[new V(mn.x,mn.y,mx.z),new V(mx.x,mn.y,mx.z),'#cx',s.x],[new V(mx.x,mn.y,mx.z),new V(mx.x,mx.y,mx.z),'#cy',s.y],[new V(mx.x,mn.y,mn.z),new V(mx.x,mn.y,mx.z),'#cz',s.z]]
    .forEach(([a,b,id,val],i)=>{const el=$(id); if(axes&&!axes['xyz'[i]]){el.hidden=true; return;} el.hidden=false; if(!el.dataset.edit)el.textContent=f(val); place(el,W(a).add(W(b)).multiplyScalar(0.5));});
}
function updateOverlays(){
  if(!meas.g.children.length)return;
  meas.g.children.forEach(c=>{if(c.userData.dot)c.scale.setScalar(camK(c.position)*0.008);});
  if(meas.pts.length===2)place($('#mlabel'),meas.pts[0].clone().add(meas.pts[1]).multiplyScalar(0.5));
}

// ===== Ubicar pieza nueva: fantasma que sigue al cursor, después manijas y cotas =====
const placeMark=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({color:0xF5C451,transparent:true,opacity:.22,depthTest:false,depthWrite:false,side:THREE.DoubleSide}));
placeMark.rotation.x=-Math.PI/2; placeMark.renderOrder=5; placeMark.visible=false;
placeMark.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(1,1)),new THREE.LineBasicMaterial({color:0xF5C451,depthTest:false,transparent:true}))); scene.add(placeMark);
const placeBar=document.createElement('div'); placeBar.id='placebar'; placeBar.hidden=true;
placeBar.innerHTML='<span id="placetxt"></span><button type="button" id="placeok" class="pri">✔ Apoyar aquí</button><button type="button" id="placeno">✕ Cancelar</button>';
$('#wrap').appendChild(placeBar);
function startPlace(m){
  if(placing)cancelPlace(true);
  const mt=m.material; placing={m,orig:{t:mt.transparent,o:mt.opacity,w:mt.depthWrite,e:mt.emissive.getHex()}};
  mt.transparent=true; mt.opacity=.45; mt.depthWrite=false; mt.emissive.setHex(0x16396b);
  tc.detach(); m.geometry.computeBoundingBox(); placeUpdateMark(m);
  const touch=matchMedia('(pointer:coarse)').matches;
  $('#placetxt').textContent=touch?'Tocá dónde ponerla y confirmá':'Clic para apoyar · Esc cancela';
  placeBar.hidden=false; canvas.style.cursor='copy'; updateDims();
  msg(touch?'Tocá el lugar donde querés la pieza y después "Apoyar aquí".':'Mové el mouse para ubicar la pieza. Clic para apoyarla, Esc para cancelar. Se apoya sobre la cama o arriba de otra pieza.');
}
function placeUpdateMark(m){
  const bb=m.geometry.boundingBox, w=Math.max(0.5,bb.max.x-bb.min.x), d=Math.max(0.5,bb.max.z-bb.min.z);
  placeMark.scale.set(w,d,1); placeMark.position.set(m.position.x+(bb.max.x+bb.min.x)/2,m.position.y+bb.min.y+0.06,m.position.z+(bb.max.z+bb.min.z)/2); placeMark.visible=true;
}
function placeAt(e){
  const m=placing.m, bb=m.geometry.boundingBox; setRay(e);
  const hit=ray2.intersectObjects(objs.filter(o=>o!==m&&o.visible),false)[0]; let pt=null, y0=0;
  if(hit&&hit.face){const n=hit.face.normal.clone().transformDirection(hit.object.matrixWorld); if(n.y>0.7){pt=hit.point.clone(); y0=hit.point.y;}}
  if(!pt){pt=new THREE.Vector3(); if(!ray2.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),pt))return;}
  let x=pt.x, z=pt.z; if($('#snap').classList.contains('on')){const st=snapStep(); x=Math.round(x/st)*st; z=Math.round(z/st)*st;}
  m.position.set(x,y0-bb.min.y,z); placeUpdateMark(m);
}
function finishPlace(){
  if(!placing)return; const {m,orig}=placing, mt=m.material; placing=null;
  mt.transparent=orig.t; mt.opacity=orig.o; mt.depthWrite=orig.w; mt.emissive.setHex(0x5a4410);
  placeMark.visible=false; placeBar.hidden=true; canvas.style.cursor='';
  select([m]); updateDims(); commit();
  const sb=document.querySelector('[data-mode=free]'); if(sb)sb.click();
  msg('Pieza apoyada. Arrastrala para moverla, usá los puntos para escalar, las flechas curvas para girar (X roja, Y verde, Z azul) y la flecha amarilla para subirla. Clic en una cota para escribir la medida.');
}
function cancelPlace(silent){
  if(!placing)return; const m=placing.m; placing=null;
  scene.remove(m); const i=objs.indexOf(m); if(i>=0)objs.splice(i,1);
  placeMark.visible=false; placeBar.hidden=true; canvas.style.cursor=''; select([]); if(!silent)msg('Cancelado: la pieza no se agregó.');
}
canvas.addEventListener('pointerdown',e=>{
  if(!placing||e.button!==0)return; e.stopImmediatePropagation(); e.preventDefault(); down=null; placeAt(e);
  if(e.pointerType==='mouse'){finishPlace(); placeSkip=true;}
},true);
canvas.addEventListener('pointerup',e=>{ if(placeSkip||placing){ placeSkip=false; e.stopImmediatePropagation(); } },true);
canvas.addEventListener('pointermove',e=>{ if(placing&&e.pointerType==='mouse')placeAt(e); });
$('#placeok').onclick=()=>finishPlace(); $('#placeno').onclick=()=>cancelPlace();
addEventListener('keydown',e=>{ if(placing&&e.key==='Escape'){e.stopImmediatePropagation(); e.preventDefault(); cancelPlace();} },true);
// cotas con clic: escribir la medida exacta
['#cx','#cy','#cz'].forEach((id,i)=>{
  const el=$(id); el.style.pointerEvents='auto'; el.style.cursor='text'; el.title='Clic para escribir la medida';
  el.addEventListener('pointerdown',e=>e.stopPropagation());
  el.addEventListener('click',()=>{
    const o=sel[sel.length-1]; if(!o||el.dataset.edit)return; const k=['x','y','z'][i], real=$('#d'+k);
    el.dataset.edit='1'; const inp=document.createElement('input'); inp.type='number'; inp.step='0.1'; inp.min='0.01'; inp.value=real.value; inp.style.cssText='width:64px;font:inherit;font-weight:600'; el.textContent=''; el.append(inp,' mm'); inp.focus(); inp.select();
    const end=ok=>{ if(!el.dataset.edit)return; delete el.dataset.edit; if(ok){const v=parseFloat(inp.value); if(v>0){real.value=v; real.dispatchEvent(new Event('input',{bubbles:true})); real.dispatchEvent(new Event('change',{bubbles:true}));}} };
    inp.onkeydown=ev=>{ev.stopPropagation(); if(ev.key==='Enter')end(true); else if(ev.key==='Escape')end(false);}; inp.onblur=()=>end(true);
  });
});

// ===== Manipular: mover arrastrando, rotar con el anillo, subir con la flecha =====
const flab=document.createElement('div'); flab.id='flab'; flab.className='dimlbl'; flab.hidden=true; $('#wrap').appendChild(flab);
const fUp=new THREE.Vector3(0,1,0);
function flabShow(e,t){const r=$('#wrap').getBoundingClientRect(), z=zf(); flab.textContent=t; flab.hidden=false; flab.style.left=((e.clientX-r.left)/z+46)+'px'; flab.style.top=((e.clientY-r.top)/z-8)+'px';}
function freeOk(e){return freeUI&&!placing&&!splitting&&!tool&&!sk&&!(e.shiftKey||e.ctrlKey||e.metaKey||multi);}
function freePick(e){
  setRay(e); const o=sel[sel.length-1], ok=!!o&&!sel.some(q=>M_(q).l);
  if(ok){
    const hr=ray2.intersectObjects([frArrow,...frRot.map(r=>r.userData.pk)].filter(h=>h.visible),false)[0];
    if(hr)return hr.object===frArrow?{k:'lift',o}:{k:'rot',o,ax:hr.object.userData.ax||'y'};
  }
  const hp=ray2.intersectObjects(pickable(),false)[0]; if(hp)return {k:'body',o:hp.object,point:hp.point.clone()};
  return null;
}
const fPlane=(e,pl)=>{setRay(e); const p=new THREE.Vector3(); return ray2.ray.intersectPlane(pl,p)?p:null;};
canvas.addEventListener('pointerdown',e=>{
  if(e.button!==0||!freeOk(e))return; const h=freePick(e); if(!h)return;
  e.stopImmediatePropagation(); e.preventDefault(); down=null; orbit.enabled=false; canvas.setPointerCapture(e.pointerId);
  const o=h.o; let d={k:h.k,o,moved:false,x0:e.clientX,y0:e.clientY};
  if(h.k==='body'){ if(!sel.includes(o))select([o]);
    // Alt + arrastrar: arrastra una copia y deja el original en su lugar (como en Tinkercad)
    if(e.altKey){ const i=sel.indexOf(o), cp=dupObjs(sel); select(cp); d.o=sel[i]||sel[sel.length-1]; d.dup=true; }
    d.pl=new THREE.Plane(fUp,-h.point.y); d.P0=h.point.clone(); d.base=sel.map(q=>q.position.clone());
    // apoyar al arrastrar (Tinkercad): se guarda la altura de partida y con qué piezas puede chocar
    const b0=multiSel()?groupBox():bbox(d.o); d.minY0=b0.min.y; d.others=pickable().filter(q=>!sel.includes(q)&&!M_(q).k);
    // si al empezar estaba apoyada sobre otra pieza, al sacarla de encima vuelve a la cama; si flotaba, conserva su altura
    d.restY=d.others.some(q=>{const b=bbox(q); return Math.abs(b.max.y-b0.min.y)<0.05&&b.max.x>b0.min.x&&b.min.x<b0.max.x&&b.max.z>b0.min.z&&b.min.z<b0.max.z;})?0:d.minY0; }
  else if(h.k==='rot'){
    // girar alrededor de un eje (X, Y o Z del mundo) que pasa por el centro de la selección; el anillo se dibuja en el plano de giro
    const grp=multiSel(), bb=grp?groupBox():bbox(o), c=bb.getCenter(new THREE.Vector3()), ax=h.ax, sz=bb.getSize(new THREE.Vector3());
    d.ax=ax; d.axis=new THREE.Vector3(ax==='x'?1:0,ax==='y'?1:0,ax==='z'?1:0); d.c=c; d.pl=new THREE.Plane(d.axis,-d.axis.dot(c));
    d.qf=new THREE.Quaternion().setFromUnitVectors(fUp,d.axis); d.qfi=d.qf.clone().invert();
    const P=fPlane(e,d.pl)||c, L=P.clone().sub(c).applyQuaternion(d.qfi); d.a0=Math.atan2(-L.z,L.x); d.q0=o.quaternion.clone(); d.grp=grp?sel.map(q=>({o:q,p:q.position.clone(),q:q.quaternion.clone()})):null;
    d.r=0.5*(ax==='x'?Math.hypot(sz.y,sz.z):ax==='y'?Math.hypot(sz.x,sz.z):Math.hypot(sz.x,sz.y))+14;
    rotFx.position.copy(c); if(ax==='y')rotFx.position.y=bb.min.y+0.15; rotFx.quaternion.copy(d.qf); rotFx.scale.setScalar(d.r); rotWedge(d.a0,0); rotFx.visible=true; }
  else { const bb=multiSel()?groupBox():bbox(o), c=bb.getCenter(new THREE.Vector3()), n=new THREE.Vector3(cam.position.x-c.x,0,cam.position.z-c.z); if(n.lengthSq()<1e-6)n.set(0,0,1); n.normalize(); d.pl=new THREE.Plane(n,-n.dot(c)); const P=fPlane(e,d.pl)||c; d.y0=P.y; d.p0=o.position.y; d.ys=sel.map(q=>q.position.y); }
  fdrag=d;
},true);
canvas.addEventListener('pointermove',e=>{
  if(!fdrag){ if(freeUI&&!placing&&!splitting&&!tool&&!sk&&e.buttons===0&&!tc.dragging){ setRay(e); const hs=sh.length&&sel.length?ray2.intersectObjects(sh.filter(q=>q.visible),false)[0]:null;
      if(hs){ const bc=bbox(sel[sel.length-1]).getCenter(new THREE.Vector3()).project(cam), pp=hs.object.position.clone().project(cam), an=Math.atan2(pp.y-bc.y,(pp.x-bc.x)*cam.aspect)*180/Math.PI, k8=((Math.round(an/45)%8)+8)%8; canvas.style.cursor=hs.object.userData.face?['ew-resize','nesw-resize','ns-resize','nwse-resize'][k8%4]:((pp.x-bc.x)*(pp.y-bc.y)>=0?'nesw-resize':'nwse-resize'); return; }
      const h=freeOk(e)?freePick(e):null; canvas.style.cursor=!h?'':h.k==='lift'?'ns-resize':h.k==='rot'?'grab':'move'; } return; }
  const d=fdrag, o=d.o; if(!d.moved){ if(Math.hypot(e.clientX-d.x0,e.clientY-d.y0)<3)return; d.moved=true; }
  const snapOn=$('#snap').classList.contains('on'), st=snapStep();
  if(d.k==='body'){
    // apoyar al arrastrar (Tinkercad): si bajo el mouse hay la cara de arriba de otra pieza, el punto agarrado va a ese lugar de la cara
    // y la selección se apoya ahí; si no, se mueve a su altura de siempre (o vuelve a la cama si estaba apoyada sobre otra)
    setRay(e); const hp=ray2.intersectObjects(d.others,false).find(hh=>hh.face&&hh.face.normal.clone().transformDirection(hh.object.matrixWorld).y>0.7);
    const dy=(hp?hp.point.y:d.restY)-d.minY0; d.on=hp?hp.object:null;
    let P; if(hp)P=hp.point.clone(); else { d.pl.constant=-(d.P0.y+dy); P=fPlane(e,d.pl); } if(!P)return; let dx=P.x-d.P0.x, dz=P.z-d.P0.z;
    if(snapOn){ const b0=d.base[sel.indexOf(o)]||d.base[0]; dx=Math.round((b0.x+dx)/st)*st-b0.x; dz=Math.round((b0.z+dz)/st)*st-b0.z; }
    sel.forEach((q,i)=>{q.position.x=d.base[i].x+dx; q.position.z=d.base[i].z+dz; q.position.y=d.base[i].y+dy;});
    flabShow(e,'X '+(Math.round(o.position.x*10)/10)+' · Z '+(Math.round(o.position.z*10)/10)+(d.on?' · sobre '+M_(d.on).n:'')+'\n'+distLabel(o)); updateDims();
  } else if(d.k==='rot'){
    const P=fPlane(e,d.pl); if(!P)return; const L=P.clone().sub(d.c).applyQuaternion(d.qfi); let dl=Math.atan2(-L.z,L.x)-d.a0;
    dl=((dl+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;
    // como en Tinkercad: dentro del anillo va de a 22,5° (con el imán prendido), afuera del anillo de a 1°; Shift, de a 45°
    const out=Math.hypot(L.x,L.z)>d.r, stp=e.shiftKey?45:out?1:snapOn?22.5:0;
    if(stp){const s=stp*Math.PI/180; dl=Math.round(dl/s)*s;}
    rotWedge(d.a0,dl);
    const R=new THREE.Quaternion().setFromAxisAngle(d.axis,dl);
    if(d.grp){ d.grp.forEach(g=>{g.o.position.copy(g.p).sub(d.c).applyQuaternion(R).add(d.c); g.o.quaternion.copy(R).multiply(g.q);}); }
    else o.quaternion.copy(R).multiply(d.q0);
    const deg=Math.round(dl*180/Math.PI*10)/10; flabShow(e,d.ax.toUpperCase()+' '+(deg>0?'+':'')+deg+'°'+(out?' (de a 1°)':'')); updateDims();
  } else {
    const P=fPlane(e,d.pl); if(!P)return; let y=d.p0+(P.y-d.y0); if(snapOn)y=Math.round(y/st)*st;
    const dy=y-d.p0; sel.forEach((q,i)=>{q.position.y=d.ys[i]+dy;}); const bx=()=>multiSel()?groupBox():bbox(o), m0=bx().min.y; if(m0<0)sel.forEach(q=>{q.position.y-=m0;});
    flabShow(e,'Altura del piso: '+(Math.round(bx().min.y*10)/10)+' mm'); updateDims();
  }
});
const endFree=()=>{ if(!fdrag)return; const d=fdrag; fdrag=null; flab.hidden=true; rotFx.visible=false; mvLines.visible=false; orbit.enabled=true; if(d.moved||d.dup){updateDims(); commit(); if(d.dup)msg(sel.length===1?'Copia creada.':sel.length+' copias creadas.');} else if(d.k==='rot'){ msg('Arrastrá la flecha curva para girar: X roja, Y verde, Z azul. Lejos del anillo va de a 1°.'); } };
canvas.addEventListener('pointerup',endFree); canvas.addEventListener('pointercancel',endFree);

// ===== Selección bien marcada: contorno brillante + cartel con la cantidad =====
const hullGeos=new WeakMap(), hulls=new Map();
const hullMat=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{uPx:{value:3},uRes:{value:new THREE.Vector2(1,1)},uCol:{value:new THREE.Color(0xFFD23F)}},
  vertexShader:'attribute vec3 aNorm; uniform float uPx; uniform vec2 uRes; void main(){ vec4 clip=projectionMatrix*modelViewMatrix*vec4(position,1.0); vec3 nv=normalize(normalMatrix*aNorm); vec2 nd=(projectionMatrix*vec4(nv,0.0)).xy; float l=length(nd); if(l>1e-5)nd/=l; clip.xy+=nd*(uPx*2.0/uRes)*clip.w; gl_Position=clip; }',
  fragmentShader:'uniform vec3 uCol; void main(){ gl_FragColor=vec4(uCol,1.0); }'});
function hullGeo(g){
  if(hullGeos.has(g))return hullGeos.get(g);
  const pos=g.attributes.position, idx=g.index, n=idx?idx.count:pos.count; let out=null;
  if(n/3<=150000){
    const key=i=>Math.round(pos.getX(i)*1000)+','+Math.round(pos.getY(i)*1000)+','+Math.round(pos.getZ(i)*1000), acc=new Map(), A=new THREE.Vector3(), B=new THREE.Vector3(), C=new THREE.Vector3(), N=new THREE.Vector3();
    const vi=t=>idx?idx.getX(t):t;
    for(let t=0;t<n;t+=3){ const a=vi(t),b=vi(t+1),c=vi(t+2); A.fromBufferAttribute(pos,a); B.fromBufferAttribute(pos,b); C.fromBufferAttribute(pos,c); N.crossVectors(B.clone().sub(A),C.clone().sub(A));
      [a,b,c].forEach(v=>{const k=key(v); const s0=acc.get(k); if(s0)s0.add(N); else acc.set(k,N.clone());}); }
    const nr=new Float32Array(pos.count*3), T=new THREE.Vector3();
    for(let i=0;i<pos.count;i++){ T.copy(acc.get(key(i))||N.set(0,1,0)).normalize(); nr[i*3]=T.x; nr[i*3+1]=T.y; nr[i*3+2]=T.z; }
    out=new THREE.BufferGeometry(); out.setAttribute('position',pos); if(idx)out.setIndex(idx); out.setAttribute('aNorm',new THREE.BufferAttribute(nr,3));
  }
  hullGeos.set(g,out); return out;
}
const selBadge=document.createElement('div'); selBadge.id='selbadge'; selBadge.hidden=true; $('#wrap').appendChild(selBadge);
let badgeKey='';
function updateSelFx(){
  // mientras Vaciar muestra su vista previa, la pieza original está oculta: su contorno taparía la vista previa
  const pv=window.shPreviewOf?window.shPreviewOf():null;
  const want=new Set(placing||wireOn||secOn?[]:sel.filter(o=>o!==pv));
  hulls.forEach((m,o)=>{ if(!want.has(o)||!objs.includes(o)||m.userData.g!==o.geometry){scene.remove(m); hulls.delete(o);} });
  const dpr=canvas.width/Math.max(1,canvas.clientWidth); hullMat.uniforms.uRes.value.set(canvas.width,canvas.height); hullMat.uniforms.uPx.value=4.5*dpr;
  want.forEach(o=>{
    if(!o.visible)return; let m=hulls.get(o);
    if(!m){ const hg=hullGeo(o.geometry); if(!hg)return; m=new THREE.Mesh(hg,hullMat); m.frustumCulled=false; m.matrixAutoUpdate=false; m.renderOrder=1; m.userData.g=o.geometry; scene.add(m); hulls.set(o,m); }
    o.updateMatrixWorld(); m.matrix.copy(o.matrixWorld);
  });
  const k=placing?'':sel.map(o=>o.id+M_(o).n).join('|');
  if(k!==badgeKey){ badgeKey=k;
    if(sel.length>=2&&!placing){ const nm=sel.map(o=>M_(o).n), shown=nm.slice(0,4).join(' · ')+(nm.length>4?' · +'+(nm.length-4)+' más':''); selBadge.innerHTML='<b>'+sel.length+' piezas seleccionadas</b><span>'+shown.replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</span>'; selBadge.hidden=false; } else selBadge.hidden=true; }
}

// ===== Selección con rectángulo (Shift + arrastrar en vacío, o en modo Multi) =====
let rsel=null;
// Como en Tinkercad: con el mouse, arrastrar desde un espacio vacío dibuja el rectángulo (la cámara gira con el botón derecho).
// Shift/Ctrl/Multi suman a lo que ya estaba elegido; si no, el rectángulo reemplaza la selección. En pantallas táctiles, solo con Multi.
canvas.addEventListener('pointerdown',e=>{
  const add=e.shiftKey||e.ctrlKey||e.metaKey||multi;
  if(e.button!==0||!(add||e.pointerType==='mouse')||splitting||tool||sk||placing||tc.axis)return;
  setRay(e); if(ray2.intersectObjects(pickable(),false).length)return;
  if(typeof secOn!=='undefined'&&secOn&&secKnob.visible&&ray2.intersectObject(secKnob,false).length)return;
  e.stopImmediatePropagation(); e.preventDefault(); down=null; canvas.setPointerCapture(e.pointerId);
  rsel={x0:e.clientX,y0:e.clientY,r:wrap.getBoundingClientRect(),base:add?sel.slice():[],add};
},true);
canvas.addEventListener('pointermove',e=>{
  if(!rsel)return; const {x0,y0,r}=rsel, el=$('#rect'), w=Math.abs(e.clientX-x0), h=Math.abs(e.clientY-y0);
  const z=zf(); Object.assign(el.style,{left:(Math.min(x0,e.clientX)-r.left)/z+'px',top:(Math.min(y0,e.clientY)-r.top)/z+'px',width:w/z+'px',height:h/z+'px'}); el.hidden=w<3&&h<3;
});
canvas.addEventListener('pointerup',e=>{
  if(!rsel)return; const {x0,y0,base,add}=rsel; rsel=null; $('#rect').hidden=true;
  const x1=Math.min(x0,e.clientX), x2=Math.max(x0,e.clientX), y1=Math.min(y0,e.clientY), y2=Math.max(y0,e.clientY);
  // clic en un espacio vacío (sin arrastrar): suelta la selección
  if(x2-x1<4&&y2-y1<4){ if(!add)select([]); return; }
  const cr=canvas.getBoundingClientRect(), v=new THREE.Vector3();
  const inside=pickable().filter(o=>{bbox(o).getCenter(v).project(cam); const sx=cr.left+(v.x+1)/2*cr.width, sy=cr.top+(1-v.y)/2*cr.height; return v.z<1&&sx>=x1&&sx<=x2&&sy>=y1&&sy<=y2;});
  select([...new Set([...base,...inside])]);
  msg(inside.length?(sel.length===1?'1 objeto seleccionado.':sel.length+' objetos seleccionados.'):'No hay piezas dentro del rectángulo.');
});
canvas.addEventListener('pointercancel',()=>{rsel=null; $('#rect').hidden=true;});

// ===== Herramientas de clic: medir y apoyar por cara =====
let tool=null; const meas={pts:[],g:new THREE.Group()}; scene.add(meas.g);
function setTool(t){
  tool=(t&&tool!==t)?t:null;
  $('#measure').classList.toggle('on',tool==='measure'); $('#face').classList.toggle('on',tool==='face');
  if(tool!=='measure')clearMeasure();
  canvas.style.cursor=tool?'crosshair':'';
  if(tool==='measure')msg('Medir: tocá dos puntos sobre las piezas o la base. Esc para salir.');
  else if(tool==='face')msg('Apoyar por una cara: tocá la cara de la pieza que querés que quede abajo. Esc para cancelar.');
}
$('#measure').onclick=()=>{if(splitting)endSplit(); setTool('measure');};
$('#face').onclick=()=>{if(splitting)endSplit(); setTool('face');};
function clearMeasure(){meas.pts=[]; meas.g.children.slice().forEach(c=>{c.geometry.dispose(); c.material.dispose(); meas.g.remove(c);}); $('#mlabel').hidden=true;}
function measureClick(e){
  setRay(e); const h=ray2.intersectObjects(objs.filter(o=>o.visible),false)[0]; let p=h?h.point.clone():null;
  if(!p){const q=new THREE.Vector3(); if(ray2.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),q))p=q;}
  if(!p)return;
  if(meas.pts.length>=2)clearMeasure();
  meas.pts.push(p);
  const dot=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),new THREE.MeshBasicMaterial({color:0xff3b30,depthTest:false,transparent:true}));
  dot.renderOrder=999; dot.position.copy(p); dot.userData.dot=1; meas.g.add(dot);
  if(meas.pts.length<2){msg('Ahora tocá el segundo punto.'); return;}
  const [a,b]=meas.pts, ln=new THREE.Line(new THREE.BufferGeometry().setFromPoints([a,b]),new THREE.LineBasicMaterial({color:0xff3b30,depthTest:false,transparent:true}));
  ln.renderOrder=998; meas.g.add(ln);
  const f=v=>v.toLocaleString('es-AR',{maximumFractionDigits:2}), d=a.distanceTo(b);
  $('#mlabel').innerHTML='<b>'+f(d)+' mm</b><span>X '+f(Math.abs(b.x-a.x))+' · Y '+f(Math.abs(b.y-a.y))+' · Z '+f(Math.abs(b.z-a.z))+'</span>'; $('#mlabel').hidden=false;
  msg('Distancia: '+f(d)+' mm. Tocá otro punto para medir de nuevo, o Esc para salir.');
}
function faceClick(e){
  setRay(e); const h=ray2.intersectObjects(pickable(),false)[0];
  if(!h||!h.face){msg('Tocá una cara de una pieza.'); return;}
  const o=h.object; o.updateMatrixWorld(true);
  const n=h.face.normal.clone().applyMatrix3(new THREE.Matrix3().getNormalMatrix(o.matrixWorld)).normalize();
  const q=new THREE.Quaternion().setFromUnitVectors(n,new THREE.Vector3(0,-1,0)), c=bbox(o).getCenter(new THREE.Vector3());
  o.quaternion.premultiply(q); o.position.sub(c).applyQuaternion(q).add(c);
  o.updateMatrixWorld(true); o.position.y-=bbox(o).min.y;
  setTool(null); select([o]); commit(); msg('Pieza apoyada sobre esa cara.');
}

// ===== Hueco =====
$('#hole').onclick=()=>{
  if(!sel.length){msg('Seleccioná la pieza que querés convertir en hueco.'); return;}
  const on=sel.some(o=>!M_(o).k); sel.forEach(o=>{M_(o).k=on;});
  applyGhost(); updateDims(); commit();
  msg(on?(sel.length===1?'Pieza marcada como hueco.':'Piezas marcadas como hueco.')+' Elegí también la pieza a perforar y tocá Unir.':'Vuelven a ser piezas sólidas.');
};

// ===== Texto 3D =====
const FONTS={sansb:'droid/droid_sans_bold',sans:'droid/droid_sans_regular',serifb:'droid/droid_serif_bold',serif:'droid/droid_serif_regular',gentb:'gentilis_bold',gent:'gentilis_regular',mono:'droid/droid_sans_mono_regular'};
const fontCache={};
const FONT_CDN=['./vendor/three/fonts/'];   // tipografías incluidas en la app (no hace falta internet)
function loadFont(k){
  if(!fontCache[k])fontCache[k]=(async()=>{
    let err; for(let t=0;t<2;t++)for(const base of FONT_CDN){ try{ return await new FontLoader().loadAsync(base+FONTS[k]+'.typeface.json'); }catch(e){err=e;} }
    throw err;
  })().catch(e=>{delete fontCache[k]; throw e;});
  return fontCache[k];
}
setTimeout(()=>{ try{loadFont('sansb').catch(()=>{});}catch(e){} },4000); // precarga la tipografía principal
async function textGeometry(tx){
  const font=await loadFont(tx.f); await loadManifold();
  const miss=[...new Set([...tx.s].filter(c=>c.trim()&&!font.data.glyphs[c]))];
  const shapes=font.generateShapes(tx.s,tx.size); let geo=null;
  if(MF){
    // cada letra se arma en 2D y se extruye con Manifold: sale siempre cerrada
    const secs=[];
    for(const sh of shapes){const {shape,holes}=sh.extractPoints(6); const polys=[shape,...holes].map(p=>p.map(v=>[v.x,v.y])).filter(p=>p.length>=3); if(polys.length)secs.push(new MF.CrossSection(polys,'EvenOdd'));}
    if(!secs.length)return {geo:null,miss};
    const all=MF.CrossSection.union(secs); secs.forEach(c=>c.delete()); const m=all.extrude(tx.depth); all.delete();
    geo=fromManifold(m); m.delete();
  } else {
    if(!shapes.length)return {geo:null,miss};
    geo=new THREE.ExtrudeGeometry(shapes,{depth:tx.depth,bevelEnabled:false,curveSegments:6});
  }
  if(tx.lay)geo.rotateX(-Math.PI/2);
  geo.computeBoundingBox(); const c=geo.boundingBox.getCenter(new THREE.Vector3()); geo.translate(-c.x,-c.y,-c.z); geo.computeBoundingBox();
  return {geo,miss};
}
const readTx=()=>({s:$('#tstr').value.replace(/\s+$/,''),f:$('#tfont').value,size:Math.max(1,parseFloat($('#tsize').value)||10),depth:Math.max(0.2,parseFloat($('#tdepth').value)||3),lay:$('#tlay').value==='flat'});
let lastTextSel=null;
function syncText(){
  const o=sel[sel.length-1], tx=o&&M_(o).tx; lastTextSel=o||null; $('#tupd').hidden=!tx;
  if(tx){$('#tstr').value=tx.s; $('#tfont').value=tx.f; $('#tsize').value=tx.size; $('#tdepth').value=tx.depth; $('#tlay').value=tx.lay?'flat':'up';}
}
function textSelSync(){const p=$('#textp'); if(p&&!p.hidden&&sel[sel.length-1]!==lastTextSel)syncText();}
$('#textbtn').onclick=()=>{if(openPanel('#textp',true)){syncText(); setTimeout(()=>$('#tstr').focus(),0);}};
async function makeTextObj(update){
  const tx=readTx(); if(!tx.s.trim()){msg('Escribí el texto primero.'); return;}
  await busyOn(update?'Actualizando el texto…':'Armando el texto…');
  try{
    const {geo,miss}=await textGeometry(tx);
    if(!geo){msg('Esa tipografía no tiene ninguna de esas letras.'); return;}
    const nm='Texto: '+tx.s.slice(0,24);
    if(update&&sel.length&&M_(sel[sel.length-1]).tx){
      const o=sel[sel.length-1], oldMin=bbox(o).min.y; o.geometry=geo; delete o.userData.p; delete o.userData.fx; M_(o).tx=tx; M_(o).n=nm; sgCache.g=null;
      o.updateMatrixWorld(true); o.position.y+=oldMin-bbox(o).min.y; updateDims();
    } else {
      const m=addMesh(geo,undefined,nm); M_(m).tx=tx; m.position.set(0,-geo.boundingBox.min.y,0); updateDims();
    }
    commit(); syncText();
    msg((update?'Texto actualizado.':'Texto agregado.')+(miss.length?' Estas letras no están en la tipografía: '+miss.join(' '):''));
  }catch(err){console.error(err); msg('No se pudo cargar la tipografía. Revisá la conexión a internet.');}
  finally{busyOff();}
}
$('#tadd').onclick=()=>makeTextObj(false);
$('#tupd').onclick=()=>makeTextObj(true);
$('#tstr').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault(); e.stopPropagation(); makeTextObj(!$('#tupd').hidden);}});

// ===== Patrón =====
function syncPat(force){
  const t=$('#ptype').value; document.querySelectorAll('#patp [data-pt]').forEach(el=>{el.hidden=!el.dataset.pt.split(' ').includes(t);});
  $('#pdxl').textContent=t==='grid'?'Separación X (mm)':'Separación (mm)';
  const s=sceneBox(sel).getSize(new THREE.Vector3()), ax=t==='line'&&$('#pax').value==='z'?'z':'x';
  if(force||!$('#pdx').dataset.touched)$('#pdx').value=+(s[ax]+5).toFixed(1);
  if(force||!$('#pdz').dataset.touched)$('#pdz').value=+(s.z+5).toFixed(1);
}
$('#pattern').onclick=()=>{if(!sel.length){msg('Seleccioná la pieza que querés repetir.'); return;} if(openPanel('#patp',true)){delete $('#pdx').dataset.touched; delete $('#pdz').dataset.touched; syncPat(true);}};
$('#ptype').addEventListener('change',()=>syncPat());
$('#pax').addEventListener('change',()=>{delete $('#pdx').dataset.touched; syncPat();});
['#pdx','#pdz'].forEach(i=>$(i).addEventListener('input',e=>{e.target.dataset.touched=1;}));
$('#papply').onclick=()=>{
  if(!sel.length){msg('Seleccioná la pieza que querés repetir.'); return;}
  const t=$('#ptype').value, src=sel.slice(), made=[], int=(id,a,b)=>Math.max(a,Math.min(b,parseInt($(id).value)||a));
  const c0=sceneBox(src).getCenter(new THREE.Vector3());
  const copy=(dx,dz,ang)=>{src.forEach(o=>{
    const m=new THREE.Mesh(o.geometry.clone(),o.material.clone()); m.material.emissive.setHex(0);
    m.position.copy(o.position); m.quaternion.copy(o.quaternion); m.scale.copy(o.scale);
    if(ang){const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),ang); m.position.applyQuaternion(q); if($('#prot').checked)m.quaternion.premultiply(q);}
    m.position.x+=dx; m.position.z+=dz;
    if(o.userData.p)m.userData.p={...o.userData.p}; if(o.userData.fx)m.userData.fx=o.userData.fx;
    m.userData.m=JSON.parse(JSON.stringify(M_(o))); m.userData.m.n=M_(o).n+' ('+(made.length+2)+')'; m.userData.m.l=false;
    scene.add(m); objs.push(m); made.push(m);});};
  if(t==='line'){const n=int('#pn',2,100), d=parseFloat($('#pdx').value)||0, z=$('#pax').value==='z'; for(let i=1;i<n;i++)copy(z?0:d*i,z?d*i:0,0);}
  else if(t==='grid'){const cols=int('#pcols',1,30), rows=int('#prows',1,30), dx=parseFloat($('#pdx').value)||0, dz=parseFloat($('#pdz').value)||0;
    if(cols*rows<2){msg('Poné al menos 2 columnas o 2 filas.'); return;}
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){if(r||c)copy(dx*c,dz*r,0);}}
  else {const n=int('#pn',2,100); if(Math.hypot(c0.x,c0.z)<1){msg('Para el patrón en círculo, alejá la pieza del centro de la cama: esa distancia es el radio.'); return;}
    for(let i=1;i<n;i++)copy(0,0,Math.PI*2*i/n);}
  if(!made.length)return;
  select([...src,...made]); commit();
  msg((made.length===1?'1 copia creada.':made.length+' copias creadas.')+' Quedaron todas elegidas: podés unirlas con Unir.');
};
