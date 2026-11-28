'use strict';
// Constructor 3D: motor de operaciones (Manifold) y revisión de mallas.
// Los scripts de js/ comparten el ámbito global y se cargan en orden desde index.html.
// ===== Motor de operaciones: Manifold (resultados siempre cerrados) =====
let MF=null, mfLoading=null;
function loadManifold(){
  if(!mfLoading) mfLoading=import('manifold-3d').then(async mod=>{const w=await mod.default(); w.setup(); MF=w; return w;})
    .catch(e=>{console.warn('Manifold no cargó, se usa el motor anterior',e); mfLoading=null; return null;});
  return mfLoading;
}
loadManifold();
// geometría con su posición, rotación y escala aplicadas, con los vértices soldados
function toManifold(o){
  o.updateMatrixWorld(true);
  const g=o.geometry, pos=g.attributes.position, idx=g.index, n=idx?idx.count:pos.count, M=o.matrixWorld, e=M.elements, f=Math.fround;
  const map=new Map(), vp=[], tv=new Uint32Array(n);
  for(let i=0;i<n;i++){
    const j=idx?idx.getX(i):i, x0=pos.getX(j), y0=pos.getY(j), z0=pos.getZ(j);
    const x=f(e[0]*x0+e[4]*y0+e[8]*z0+e[12]), y=f(e[1]*x0+e[5]*y0+e[9]*z0+e[13]), z=f(e[2]*x0+e[6]*y0+e[10]*z0+e[14]);
    const key=x+','+y+','+z; let id=map.get(key);
    if(id===undefined){id=vp.length/3; map.set(key,id); vp.push(x,y,z);} tv[i]=id;
  }
  const flip=M.determinant()<0, out=[];
  for(let i=0;i+2<n;i+=3){const a=tv[i],b=tv[i+1],c=tv[i+2]; if(a!==b&&b!==c&&a!==c){if(flip)out.push(a,c,b); else out.push(a,b,c);}}
  const mesh=new MF.Mesh({numProp:3,vertProperties:new Float32Array(vp),triVerts:new Uint32Array(out)});
  mesh.merge();
  return new MF.Manifold(mesh);
}
function geoFromIndexed(vp,tv){
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(vp,3));
  geo.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(vp.length/3*2),2));
  geo.setIndex(new THREE.BufferAttribute(tv,1));
  return toCreasedNormals(geo,THREE.MathUtils.degToRad(30));
}
function fromManifold(m){
  const g=m.getMesh(), np=g.numProp, src=g.vertProperties, n=src.length/np, vp=new Float32Array(n*3);
  for(let i=0;i<n;i++){vp[i*3]=src[i*np]; vp[i*3+1]=src[i*np+1]; vp[i*3+2]=src[i*np+2];}
  return geoFromIndexed(vp,g.triVerts.slice());
}
// Igual que toManifold, pero si la pieza no es una malla cerrada intenta repararla (soldar vértices, quitar caras
// repetidas, orientar y tapar huecos chicos) y vuelve a probar. Si no se puede, avisa con un mensaje claro.
function toManifoldAuto(o){
  try{return toManifold(o);}catch(e1){
    try{
      const r=repairMesh(o.geometry), t=new THREE.Mesh(geoFromIndexed(r.vp,r.tv)); t.position.copy(o.position); t.quaternion.copy(o.quaternion); t.scale.copy(o.scale); t.updateMatrixWorld(true);
      return toManifold(t);
    }catch(e2){
      const er=new Error('no cerrada'); er.userMsg='Esta pieza no es una malla cerrada y no se pudo reparar sola, por eso no se puede usar acá. Probá con Revisar (Preparar › Revisar) o rehacé la pieza.'; throw er;
    }
  }
}

// ===== Revisión y reparación de mallas (sin servidor) =====
// Suelda vértices por posición, cuenta bordes abiertos, aristas con más de 2 caras,
// caras invertidas y piezas sueltas; repara lo que se puede reparar en forma segura.
function weldGeo(geo,eps){
  const pos=geo.attributes.position, idx=geo.index, n=idx?idx.count:pos.count;
  const map=new Map(), vp=[], tv=new Uint32Array(n), q=1/eps;
  for(let i=0;i<n;i++){
    const j=idx?idx.getX(i):i, x=pos.getX(j), y=pos.getY(j), z=pos.getZ(j);
    const key=Math.round(x*q)+','+Math.round(y*q)+','+Math.round(z*q);
    let id=map.get(key); if(id===undefined){id=vp.length/3; map.set(key,id); vp.push(x,y,z);} tv[i]=id;
  }
  return {vp:new Float64Array(vp),tv};
}
function triArea2(vp,a,b,c){
  const ux=vp[b*3]-vp[a*3],uy=vp[b*3+1]-vp[a*3+1],uz=vp[b*3+2]-vp[a*3+2];
  const vx=vp[c*3]-vp[a*3],vy=vp[c*3+1]-vp[a*3+1],vz=vp[c*3+2]-vp[a*3+2];
  const cx=uy*vz-uz*vy, cy=uz*vx-ux*vz, cz=ux*vy-uy*vx; return Math.sqrt(cx*cx+cy*cy+cz*cz);
}
function cleanTris(vp,tv,stats){
  const out=[], seen=new Set(); let deg=0, dup=0;
  for(let i=0;i<tv.length;i+=3){
    const a=tv[i],b=tv[i+1],c=tv[i+2];
    if(a===b||b===c||a===c||triArea2(vp,a,b,c)<1e-12){deg++;continue;}
    const k=[a,b,c].sort((x,y)=>x-y).join(',');
    if(seen.has(k)){dup++;continue;} seen.add(k); out.push(a,b,c);
  }
  if(stats){stats.degenerate=deg; stats.duplicate=dup;}
  return out;
}
const ekey=(a,b)=>a<b?a*4294967296+b:b*4294967296+a;
function edgeInfo(t){
  // por arista sin dirección: lista de caras y cuántas veces aparece en cada sentido
  const E=new Map();
  for(let f=0;f<t.length/3;f++)for(let j=0;j<3;j++){
    const a=t[f*3+j], b=t[f*3+(j+1)%3], k=ekey(a,b);
    let e=E.get(k); if(!e){e={a:Math.min(a,b),b:Math.max(a,b),faces:[],fw:0,bw:0}; E.set(k,e);}
    e.faces.push(f); if(a<b)e.fw++; else e.bw++;
  }
  return E;
}
function shellsOf(t,E){
  const nf=t.length/3, comp=new Int32Array(nf).fill(-1); let nc=0;
  for(let s=0;s<nf;s++){ if(comp[s]>=0)continue; const st=[s]; comp[s]=nc;
    while(st.length){const f=st.pop(); for(let j=0;j<3;j++){const e=E.get(ekey(t[f*3+j],t[f*3+(j+1)%3])); for(const g of e.faces)if(comp[g]<0){comp[g]=nc; st.push(g);}}}
    nc++; }
  return {comp,nc};
}
function signedVol(vp,t,comp,nc){
  const v=new Float64Array(nc);
  for(let f=0;f<t.length/3;f++){const a=t[f*3]*3,b=t[f*3+1]*3,c=t[f*3+2]*3;
    v[comp[f]]+=(vp[a]*(vp[b+1]*vp[c+2]-vp[b+2]*vp[c+1])-vp[a+1]*(vp[b]*vp[c+2]-vp[b+2]*vp[c])+vp[a+2]*(vp[b]*vp[c+1]-vp[b+1]*vp[c]))/6;}
  return v;
}
function analyzeMesh(geo){
  const st={}, {vp,tv}=weldGeo(geo,1e-4), t=cleanTris(vp,tv,st), E=edgeInfo(t);
  let open=0, nonMan=0, flip=0; const openSeg=[];
  E.forEach(e=>{const n=e.faces.length;
    if(n===1){open++; openSeg.push(vp[e.a*3],vp[e.a*3+1],vp[e.a*3+2],vp[e.b*3],vp[e.b*3+1],vp[e.b*3+2]);}
    else if(n>2)nonMan++;
    else if(e.fw!==1)flip++;});
  const {comp,nc}=shellsOf(t,E), vol=signedVol(vp,t,comp,nc);
  let inverted=0, total=0; vol.forEach(x=>{total+=x; if(x<0)inverted++;});
  return {tris:tv.length/3, degenerate:st.degenerate, duplicate:st.duplicate, open, nonManifold:nonMan, flipped:flip,
    shells:nc, inverted:flip?0:inverted, volume:Math.abs(total), openSeg:new Float32Array(openSeg),
    ok:!open&&!nonMan&&!flip&&!st.degenerate&&!st.duplicate&&!inverted};
}
function repairMesh(geo){
  const {vp:vp0,tv}=weldGeo(geo,1e-3), log={};
  let t=cleanTris(vp0,tv,log); const vp=Array.from(vp0);
  // las aristas con más de 2 caras (dos partes que se tocan en una línea) no se tocan:
  // borrar caras ahí deformaría la pieza. Se informan para que se corrijan a mano.
  let E=edgeInfo(t);
  // 2) orientar las caras de forma coherente dentro de cada pieza
  const nf=t.length/3, done=new Uint8Array(nf); let flipped=0;
  const has=(f,a,b)=>{for(let j=0;j<3;j++)if(t[f*3+j]===a&&t[f*3+(j+1)%3]===b)return true; return false;};
  const flipF=f=>{const x=t[f*3+1]; t[f*3+1]=t[f*3+2]; t[f*3+2]=x;};
  for(let s=0;s<nf;s++){ if(done[s])continue; done[s]=1; const q=[s];
    while(q.length){const f=q.pop(); for(let j=0;j<3;j++){const a=t[f*3+j], b=t[f*3+(j+1)%3], e=E.get(ekey(a,b));
      if(e.faces.length!==2)continue; const g=e.faces[0]===f?e.faces[1]:e.faces[0]; if(done[g])continue;
      if(has(g,a,b)){flipF(g); flipped++;} done[g]=1; q.push(g);}}}
  log.flipped=flipped;
  // 3) cerrar huecos: recorrer los bordes abiertos y taparlos con un abanico desde el centro
  E=edgeInfo(t); const nxt=new Map();
  for(let f=0;f<t.length/3;f++)for(let j=0;j<3;j++){const a=t[f*3+j], b=t[f*3+(j+1)%3];
    if(E.get(ekey(a,b)).faces.length===1){ if(!nxt.has(b))nxt.set(b,[]); nxt.get(b).push(a); }}
  let holes=0, added=0;
  for(const start of [...nxt.keys()]){
    while(nxt.has(start)&&nxt.get(start).length){
      const loop=[start]; let cur=start, guard=0;
      while(guard++<200000){const l=nxt.get(cur); if(!l||!l.length)break; const nx=l.pop(); if(!l.length)nxt.delete(cur); if(nx===start)break; loop.push(nx); cur=nx;}
      if(loop.length<3)continue;
      holes++;
      if(loop.length===3){t.push(loop[0],loop[1],loop[2]); added++; continue;}
      let cx=0,cy=0,cz=0; loop.forEach(v=>{cx+=vp[v*3];cy+=vp[v*3+1];cz+=vp[v*3+2];});
      const c=vp.length/3; vp.push(cx/loop.length,cy/loop.length,cz/loop.length);
      for(let i=0;i<loop.length;i++){t.push(loop[i],loop[(i+1)%loop.length],c); added++;}
    }
  }
  log.holes=holes; log.addedTris=added;
  // 4) que cada pieza apunte hacia afuera (volumen positivo)
  E=edgeInfo(t); const {comp,nc}=shellsOf(t,E), vol=signedVol(vp,t,comp,nc); let inv=0;
  for(let f=0;f<t.length/3;f++)if(vol[comp[f]]<0)flipF(f);
  vol.forEach(x=>{if(x<0)inv++;}); log.inverted=inv;
  return {vp:new Float32Array(vp),tv:new Uint32Array(t),log};
}
let chkData=[], openLinesOn=false;
function clearOpenLines(){objs.forEach(o=>{if(o.userData.openLn){o.remove(o.userData.openLn); o.userData.openLn.geometry.dispose(); delete o.userData.openLn;}}); openLinesOn=false; $('#cshow').classList.remove('on');}
function showOpenLines(){
  chkData.forEach(({o,a})=>{ if(!a.openSeg.length||o.userData.openLn)return;
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(a.openSeg,3));
    const ln=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:0xff2d2d,depthTest:false,transparent:true}));
    ln.renderOrder=997; o.add(ln); o.userData.openLn=ln; });
  openLinesOn=true; $('#cshow').classList.add('on');
}
const fmt=n=>n.toLocaleString('es-AR',{maximumFractionDigits:1}), pl=(n,a,b)=>fmt(n)+' '+(n===1?a:b);
function renderCheck(){
  const many=chkData.length>1; let anyBad=false, anyOpen=false;
  $('#cres').innerHTML=chkData.map(({o,a},i)=>{
    anyBad=anyBad||!a.ok; anyOpen=anyOpen||a.open>0;
    const li=(bad,t)=>'<li class="'+(bad?'bad':'')+'">'+t+'</li>', info=t=>'<li class="info">'+t+'</li>';
    const sc=Math.abs(o.scale.x*o.scale.y*o.scale.z), cm3=a.volume*sc/1000;
    const sw='<span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:#'+o.material.color.getHexString()+'"></span>';
    return '<div class="obj">'+(many?'<div class="row"><span>'+sw+' Pieza '+(i+1)+'</span></div>':'')+
      '<div class="verdict '+(a.ok?'good':'bad')+'">'+(a.ok?'Lista para el laminador':'Tiene problemas para imprimir')+'</div><ul>'+
      li(a.open>0,a.open?pl(a.open,'borde abierto (hueco)','bordes abiertos (huecos)'):'Cerrada, sin huecos')+
      li(a.flipped>0||a.inverted>0,a.flipped?'Caras dadas vuelta en algunas zonas':a.inverted?'La pieza está al revés (adentro hacia afuera)':'Todas las caras miran hacia afuera')+
      li(a.nonManifold>0,a.nonManifold?pl(a.nonManifold,'arista','aristas')+' donde dos partes se tocan con espesor cero (no se repara solo)':'Sin uniones de espesor cero')+
      li(a.degenerate+a.duplicate>0,(a.degenerate+a.duplicate)?pl(a.degenerate+a.duplicate,'cara repetida o sin superficie','caras repetidas o sin superficie'):'Sin caras repetidas ni vacías')+
      (a.shells>1?info(a.shells+' partes separadas dentro del objeto'):'')+
      info(fmt(a.tris)+' triángulos')+
      (a.ok?info('Volumen: '+fmt(cm3)+' cm³ (≈ '+fmt(cm3*1.24)+' g en PLA macizo)'):'')+
      '</ul></div>';
  }).join('');
  $('#cfix').hidden=!chkData.some(({a})=>a.open||a.flipped||a.inverted||a.degenerate||a.duplicate); $('#cshow').hidden=!anyOpen;
}
async function runCheck(quiet){
  const list=sel.length?sel.slice():objs.slice();
  if(!list.length){msg('No hay piezas para revisar.');return;}
  clearOpenLines(); openPanel('#chkp',true);
  await busyOn('Revisando la malla…');
  try{ chkData=list.map(o=>({o,a:analyzeMesh(o.geometry)})); renderCheck(); }
  catch(err){console.error(err); msg('No se pudo revisar esta malla.');}
  finally{busyOff();}
  if(!quiet){const bad=chkData.filter(d=>!d.a.ok).length; msg(bad?(bad===1&&chkData.length===1?'La pieza tiene problemas. Tocá Reparar.':bad+' pieza(s) con problemas. Tocá Reparar.'):(chkData.length===1?'La pieza está lista para imprimir.':'Todas las piezas están listas para imprimir.'));}
}
async function runRepair(){
  const list=chkData.filter(d=>!d.a.ok&&objs.includes(d.o)); if(!list.length)return;
  clearOpenLines();
  await busyOn('Reparando la malla…');
  const tot={holes:0,flipped:0,removed:0,inverted:0}; let fixed=0;
  try{
    list.forEach(({o})=>{
      const r=repairMesh(o.geometry);
      tot.holes+=r.log.holes; tot.flipped+=r.log.flipped; tot.inverted+=r.log.inverted; tot.removed+=r.log.degenerate+r.log.duplicate;
      o.geometry=geoFromIndexed(r.vp,r.tv); delete o.userData.p; delete o.userData.fx; sgCache.g=null;
    });
    commit();
    chkData=chkData.map(({o})=>({o,a:analyzeMesh(o.geometry)})); renderCheck();
    fixed=list.filter(({o})=>chkData.find(d=>d.o===o).a.ok).length;
  }catch(err){console.error(err); restore(cur); msg('No se pudo reparar esta malla.'); busyOff(); return;}
  busyOff(); updateDims();
  const parts=[]; if(tot.holes)parts.push(pl(tot.holes,'hueco tapado','huecos tapados')); if(tot.flipped)parts.push(pl(tot.flipped,'cara dada vuelta','caras dadas vuelta')); if(tot.inverted)parts.push(pl(tot.inverted,'pieza puesta al derecho','piezas puestas al derecho')); if(tot.removed)parts.push(pl(tot.removed,'cara sobrante borrada','caras sobrantes borradas'));
  const nm=chkData.some(d=>d.a.nonManifold>0);
  msg((fixed===list.length?'Reparado':'Reparado en parte')+(parts.length?': '+parts.join(', '):'')+'.'+(nm?' Quedan partes que se tocan en una línea: separalas un poco o hacé que se superpongan más y volvé a unir.':'')+' Ctrl+Z para deshacer.');
}
$('#chk').onclick=()=>runCheck();
$('#cagain').onclick=()=>runCheck();
$('#cfix').onclick=runRepair;
$('#cshow').onclick=()=>openLinesOn?clearOpenLines():showOpenLines();
$('#cclose').onclick=()=>{$('#chkp').hidden=true; clearOpenLines();};

$('#del').onclick=()=>{ sel.forEach(o=>{scene.remove(o);objs.splice(objs.indexOf(o),1);}); sel=[]; tc.detach(); updateDims(); commit(); };
addEventListener('keydown',e=>{
  if(e.target.tagName==='INPUT'||e.target.tagName==='SELECT'||splitting)return;
  const k=e.key.toLowerCase();
  if(e.key==='Delete')$('#del').click();
  else if((e.ctrlKey||e.metaKey)&&k==='z'){e.preventDefault(); e.shiftKey?redoAct():undo();}
  else if((e.ctrlKey||e.metaKey)&&k==='y'){e.preventDefault(); redoAct();}
  else if((e.ctrlKey||e.metaKey)&&k==='d'){e.preventDefault(); $('#dup').click();}
  else if((e.ctrlKey||e.metaKey)&&k==='c'){ if(sel.length){e.preventDefault(); copySel();} }
  else if((e.ctrlKey||e.metaKey)&&k==='v'){ if(clip.length){e.preventDefault(); pasteSel();} }
  else if(!e.ctrlKey&&!e.metaKey&&!e.altKey){
    const mode={v:'free',m:'translate',r:'rotate',s:'scale'}[k];
    if(mode){const b=document.querySelector('[data-mode="'+mode+'"]'); if(b)b.click();}
    else if(e.key==='?')toggleHelp();
    else if(k==='f')setView(); else if(k==='o')$('#projbtn').click(); else if(k==='l')$('#listbtn').click(); else if(k==='h')$('#hole').click(); else if(k==='g')$('#ground').click();
    else if(k==='t'){e.preventDefault(); $('#textbtn').click();}
    else{const sh={1:'box',2:'sphere',3:'cylinder',4:'cone',5:'torus'}[e.key]; if(sh){const b=document.querySelector('[data-add="'+sh+'"]'); if(b)b.click();}}
  }
});
// Enter o Esc en un campo numérico lo suelta, así los atajos de teclado vuelven a funcionar
addEventListener('keydown',e=>{
  if((e.key==='Enter'||e.key==='Escape')&&(e.target.tagName==='INPUT'||e.target.tagName==='SELECT')){
    e.target.dispatchEvent(new Event('change',{bubbles:true})); e.target.blur();
  }
});
let clip=[], pasteN=0;
function copySel(){
  clip=sel.map(o=>({g:o.geometry,c:o.material.color.getHex(),p:o.position.clone(),q:o.quaternion.clone(),s:o.scale.clone(),u:o.userData.p?{...o.userData.p}:null,f:o.userData.fx||null,m:JSON.parse(JSON.stringify(M_(o)))}));
  pasteN=0; msg(clip.length===1?'1 objeto copiado.':clip.length+' objetos copiados.');
}
function pasteSel(){
  pasteN++; const off=new THREE.Vector3(10*pasteN,0,10*pasteN), made=[];
  clip.forEach(d=>{
    const m=new THREE.Mesh(d.g.clone(),new THREE.MeshStandardMaterial({color:d.c,roughness:0.55,metalness:0.05}));
    m.position.copy(d.p).add(off); m.quaternion.copy(d.q); m.scale.copy(d.s); if(d.u)m.userData.p={...d.u}; if(d.f)m.userData.fx=d.f;
    m.userData.m={...(d.m||{}),n:((d.m&&d.m.n)||'Pieza')+' (copia)',h:false,l:false};
    scene.add(m); objs.push(m); made.push(m);
  });
  select(made); commit(); msg(made.length===1?'Objeto pegado.':made.length+' objetos pegados.');
}

$('#stl').onclick=()=>{ if(!objs.length){msg('No hay nada para exportar.');return;} openPanel('#expp',true); };

// selección por clic (ignora arrastres)
const ray=new THREE.Raycaster(), p=new THREE.Vector2(); let down=null; let multi=false;
$('#multi').onclick=()=>{multi=!multi; $('#multi').classList.toggle('on',multi); msg(multi?'Selección múltiple activada: cada clic suma o saca un objeto, y el rectángulo suma a lo elegido.':'Selección múltiple desactivada.');};
canvas.addEventListener('pointerdown',e=>down=[e.clientX,e.clientY]);
canvas.addEventListener('pointerup',e=>{
  // el botón derecho no cambia la selección: lo usa el menú contextual
  if(e.button!==0||!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>4||tc.dragging||splitting)return;
  if(tool==='measure'){measureClick(e);return;} if(tool==='face'){faceClick(e);return;} if(tool==='wp'){wpClick(e);return;}
  const r=canvas.getBoundingClientRect();
  p.set(((e.clientX-r.left)/r.width)*2-1,-((e.clientY-r.top)/r.height)*2+1);
  ray.setFromCamera(p,cam);
  const hit=ray.intersectObjects(pickable(),false)[0];
  if(!hit){if(!multi)select([]);return;}
  const o=hit.object;
  const add=e.shiftKey||e.ctrlKey||e.metaKey||multi;
  if(add) select(sel.includes(o)?selWithout(o):[...sel,o]); else select([o]);
  msg(sel.length===1?'1 objeto seleccionado.':sel.length+' objetos seleccionados.');
});
