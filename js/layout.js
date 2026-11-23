'use strict';
// Constructor 3D: pantalla ancha: cinta, inspector, buscador y ayuda.
// Los scripts de js/ comparten el ámbito global y se cargan en orden desde index.html.
// ===== Aviso en pantallas muy chicas + accesibilidad básica =====
{ const ss=$('#smallscr'); let dismissed=false;
  const chk=()=>{ss.hidden=dismissed||innerWidth>=761;}; chk(); addEventListener('resize',chk);
  $('#smallok').onclick=()=>{dismissed=true; chk();};
  canvas.setAttribute('role','img'); canvas.setAttribute('aria-label','Vista 3D del proyecto');
  document.querySelectorAll('button[title]:not([aria-label])').forEach(b=>b.setAttribute('aria-label',b.getAttribute('title')));
}
// ===== Ayuda, color, panel compacto, Esc =====
function toggleHelp(v){const h=$('#help'); h.hidden=v===undefined?!h.hidden:!v;}
$('#vhelp').onclick=()=>toggleHelp(true); $('#hclose').onclick=()=>toggleHelp(false);
$('#help').addEventListener('click',e=>{if(e.target.id==='help')toggleHelp(false);});
$('#col').addEventListener('input',e=>{sel.forEach(o=>o.material.color.set(e.target.value)); renderList();});

addEventListener('keydown',e=>{
  if(e.key!=='Escape'||e.target.tagName==='INPUT'||e.target.tagName==='SELECT')return;
  if(!$('#help').hidden){toggleHelp(false); return;}
  if(openDrop){closeDrop(); return;}
  if(tool){setTool(null); msg('Herramienta cancelada.'); return;}
  if(splitting){endSplit(); return;}
  PANELS.forEach(p=>{$(p).hidden=true;}); clearOpenLines();
});

function resize(){const w=wrap.clientWidth,h=wrap.clientHeight;renderer.setSize(w,h,false);if(composer)composer.setSize(w,h);camP.aspect=w/h;camP.updateProjectionMatrix();camO.left=-ORTH_H/2*w/h;camO.right=ORTH_H/2*w/h;camO.top=ORTH_H/2;camO.bottom=-ORTH_H/2;camO.updateProjectionMatrix();}
new ResizeObserver(resize).observe(wrap); resize();
renderer.setAnimationLoop(()=>{
  stepCam(); if(camAnim)wake(); if(orbit.update())wake();
  const now=performance.now();
  if(now>awakeUntil&&$('#busy').hidden&&now-lastDraw<1000)return;
  lastDraw=now; secKnobScale(); vcube.tick();fitPreviewTick();updateScaleUI();updateSelFx();updateOverlays();renderFrame();
});
{const P0={t:'box',w:25,h:25,d:25,r:0,soft:true}; const m0=addMesh(buildGeo(P0)); m0.userData.p={...P0}; m0.position.y=12.5; updateDims(); cur=snap();}
loadBed(); buildBed(); checkBed();
idbGet().then(s=>{
  if(!s)return;
  try{loadProject(JSON.parse(s)); hist.length=0; redoSt.length=0; cur=snap(); refreshBtns(); msg('Se recuperó tu trabajo anterior (autoguardado en este navegador).');}
  catch(e){restore(cur);}
});
(()=>{
  document.querySelectorAll('.bar').forEach(bar=>{
    const names=(bar.dataset.names||'').split(','), isTop=!bar.classList.contains('rail');
    let g=[]; const groups=[];
    [...bar.children].forEach(el=>{ if(el.classList.contains('sep')){groups.push(g);g=[];el.remove();} else g.push(el); });
    groups.push(g);
    groups.forEach((els,i)=>{
      const d=document.createElement('div'); d.className='grp';
      const row=document.createElement('div'); row.className='row';
      els.forEach(e=>row.appendChild(e));
      const l=document.createElement('span'); l.className='lbl'; l.textContent=names[i]||'';
      if(!isTop){d.append(l,row); bar.appendChild(d); return;}
      // arriba: cuando no entra, el grupo se pliega en un botón con menú
      const hd=document.createElement('button'); hd.className='ghead'; hd.type='button'; hd.title=names[i]||'';
      const ic=els.find(e=>e.querySelector&&e.querySelector('svg')); hd.innerHTML=(ic?ic.querySelector('svg').outerHTML:'')+(names[i]||'')+' ▾';
      hd.onclick=e=>{e.stopPropagation(); const was=openDrop===d; closeDrop(); if(was)return; d.classList.add('open'); openDrop=d;
        const r=hd.getBoundingClientRect(), z=zf(); row.style.left='8px'; row.style.top=(r.bottom/z+4)+'px'; const w=row.offsetWidth; row.style.left=Math.max(8,Math.min(r.left/z,innerWidth/z-w-8))+'px';};
      row.addEventListener('click',e=>{if(d.classList.contains('col')&&e.target.closest('button'))setTimeout(closeDrop,0);});
      d.append(hd,row,l); bar.appendChild(d);
    });
  });
  addEventListener('resize',fitBar); fitBar();
})();
msg(matchMedia('(min-width:1100px) and (pointer:fine) and (prefers-reduced-transparency:no-preference)').matches?'Tocá el + amarillo (o la tecla A) para agregar una forma. Shift+clic elige varias piezas. Buscador: Ctrl K · Atajos: ?':'Agregá formas desde la barra. Para elegir varias piezas: Shift+clic o Shift+arrastrar en un espacio vacío. Atajos: tecla ?');

// ===== Layout v2 (pantalla ancha): inspector, barra de acciones, barra de vista, estado y buscador =====
{
  const mq=matchMedia('(min-width:1100px) and (pointer:fine) and (prefers-reduced-transparency:no-preference)');
  const body=document.body, wrapEl=$('#wrap'), isMac=/Mac|iPhone|iPad/.test(navigator.platform);
  const svgOf=sel=>{const e=$(sel), s=e&&e.querySelector('svg'); return s?s.outerHTML:'';};
  const keyOf=b=>b.dataset.k||((b.title||'').match(/\(([A-Za-z0-9+?]{1,10})\)/)||[])[1]||'';
  const labelOf=b=>b.dataset.tip||[...b.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim()||(b.title||'').replace(/\s*\(.*$/,'').split(':')[0];
  const mkEl=(tag,id,cls)=>{const e=document.createElement(tag); if(id)e.id=id; if(cls)e.className=cls; return e;};

  // --- botones espejo: llaman al botón de siempre, así todo sigue funcionando igual ---
  const prox=[];
  const addProxy=(parent,sel,lab,icon,cls)=>{
    const src=$(sel); if(!src)return null;
    const b=mkEl('button'); b.type='button'; b.title=src.title; b.dataset.tip=lab; if(cls)b.className=cls;
    b.innerHTML=svgOf(sel)+(icon?'':'<span>'+esc(lab)+'</span>');
    if(icon){b.classList.add('ic'); b.setAttribute('aria-label',lab);}
    b.onclick=()=>src.click(); parent.appendChild(b); prox.push([b,src]); return b;
  };
  const sp=()=>mkEl('span',null,'sp');

  // barra de acciones de la selección
  const ctx=mkEl('div','ctx'); ctx.hidden=true; ctx.setAttribute('role','toolbar'); ctx.setAttribute('aria-label','Acciones de la selección');
  const cnt=mkEl('span',null,'cnt'); ctx.appendChild(cnt);
  addProxy(ctx,'[data-op="union"]','Unir'); addProxy(ctx,'[data-op="subtract"]','Restar'); addProxy(ctx,'[data-op="intersect"]','Intersectar');
  ctx.appendChild(sp());
  addProxy(ctx,'#dup','Duplicar'); addProxy(ctx,'#alinear','Alinear',true); addProxy(ctx,'#ground','Apoyar en la cama',true); addProxy(ctx,'#hole','Hueco',true);
  addProxy(ctx,'#del','Borrar',true,'danger');
  wrapEl.appendChild(ctx);

  // barra de vista
  const vbar=mkEl('div','vbar'); vbar.setAttribute('role','toolbar'); vbar.setAttribute('aria-label','Vista');
    const seg=mkEl('div',null,'seg'); seg.setAttribute('role','group'); seg.setAttribute('aria-label','Punto de vista');
  for(const [v,l] of [['front','Frente'],['top','Arriba'],['right','Lado'],['iso','3D']]) addProxy(seg,'[data-view="'+v+'"]',l);
  vbar.appendChild(seg); vbar.appendChild(sp()); addProxy(vbar,'#projbtn','Ortográfica'); addProxy(vbar,'#vfit','Encuadrar');
  wrapEl.appendChild(vbar);

  // pie de estado
  const st=mkEl('div','status'); st.innerHTML='<span id="stSel"></span><span id="stDim" class="mono"></span><span id="stTri" class="mono"></span><span class="grow"></span><span id="stBed"></span>';
  wrapEl.appendChild(st);
  const nosel=mkEl('div','nosel'); nosel.textContent='Elegí una pieza para ver y cambiar sus medidas, posición y color.';
  $('#dims').after(nosel);

  const fmt=n=>(+n.toFixed(1)).toLocaleString('es-AR',{minimumFractionDigits:0,maximumFractionDigits:1});
  const sync=()=>{
    if(!mq.matches)return;
    prox.forEach(([b,src])=>{b.disabled=src.disabled; b.classList.toggle('on',src.classList.contains('on')); b.classList.toggle('warn',src.classList.contains('warn'));});
    const n=sel.length; ctx.hidden=!n; cnt.textContent=n===1?'1 pieza':n+' piezas';
    const list=n?sel:objs.filter(o=>o.visible), box=new THREE.Box3(); list.forEach(o=>box.union(new THREE.Box3().setFromObject(o)));
    let tri=0; objs.forEach(o=>{const g=o.geometry; tri+=(g.index?g.index.count:g.attributes.position.count)/3;});
    $('#stSel').textContent=n?(n===1?'1 pieza seleccionada':n+' piezas seleccionadas'):(objs.length===1?'1 pieza':objs.length+' piezas');
    const sz=box.getSize(new THREE.Vector3()); $('#stDim').textContent=list.length?fmt(sz.x)+' × '+fmt(sz.y)+' × '+fmt(sz.z)+' mm':'';
    $('#stTri').textContent=Math.round(tri).toLocaleString('es-AR')+' triángulos';
    $('#stBed').textContent='Cama '+bed.w+' × '+bed.d+' mm';
    savest.classList.toggle('dirty',!!dirty); savest.lastChild.textContent=dirty?'Cambios sin guardar':'Todo guardado';
    const op=DOCK.find(p=>!p.hidden); const oid=op?op.id:''; if(oid&&oid!==lastOpen)setItab('props'); lastOpen=oid;
  };
  setInterval(sync,250);

  // --- tooltips con nombre y atajo (los botones son solo íconos) ---
  const tip=mkEl('div','tip'); tip.hidden=true; body.appendChild(tip);
  const hideTip=()=>{tip.hidden=true;};
  document.addEventListener('mouseover',e=>{
    if(!mq.matches)return;
    const b=e.target.closest&&e.target.closest('#topbar button,#trail button,#vbar button');
    if(!b){hideTip();return;}
    const lab=labelOf(b), k=keyOf(b); if(!lab){hideTip();return;}
    tip.innerHTML='<span>'+esc(lab)+'</span>'+(k?'<kbd>'+esc(k)+'</kbd>':''); tip.hidden=false;
    const r=b.getBoundingClientRect(), w=tip.offsetWidth, h=tip.offsetHeight; let x,y;
    if(b.closest('#trail')){x=r.right+10; y=r.top+r.height/2-h/2;}
    else if(b.closest('#topbar')){x=r.left+r.width/2-w/2; y=r.bottom+8;}
    else{x=r.left+r.width/2-w/2; y=r.top-h-8;}
    { const z=zf(); tip.style.left=Math.max(8,Math.min(x/z,innerWidth/z-w-8))+'px'; tip.style.top=Math.max(8,y/z)+'px'; }
  });
  document.addEventListener('pointerdown',hideTip,true); document.addEventListener('scroll',hideTip,true);

  // --- Agregar: menú de formas junto al riel ---
  const lrail=$('#lrail'), add=mkEl('button','addbtn'); add.type='button'; add.title='Agregar una forma, texto, SVG o ejemplo (A)';
  add.innerHTML='<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Agregar'; lrail.appendChild(add);
  const setAdd=v=>{body.classList.toggle('addopen',v===undefined?!body.classList.contains('addopen'):v);};
  add.onclick=e=>{e.stopPropagation(); setAdd();};
  $('#rrail').addEventListener('click',e=>{if(e.target.closest('button'))setTimeout(()=>setAdd(false),0);});
  document.addEventListener('pointerdown',e=>{if(body.classList.contains('addopen')&&!e.target.closest('#rrail,#addbtn'))setAdd(false);},true);

  // --- cinta con pestañas ---
  const TABS=[
   ['crear','Crear',[['Agregar',[['#textbtn','Texto 3D'],['#svgbtn','SVG']]],['Boceto',[['#skbtn','Sketch 2D']]],['Archivo',[['#imp','Importar'],['#libbtn','Biblioteca']]]]],
   ['transformar','Objeto',[['Mover',[['[data-mode="free"]','Manipular'],['[data-mode="translate"]','Mover'],['[data-mode="rotate"]','Rotar'],['[data-mode="scale"]','Escalar']]],['Alinear',[['#alinear','Alinear'],['#ground','Apoyar'],['#face','Cara abajo'],['#arrange','Acomodar']]],['Repetir',[['#pattern','Patrón'],['#dup','Duplicar'],['#del','Borrar']]],['Ayudas',[['#snap','Snap'],['#multi','Selección'],['#measure','Medir']]]]],
   ['modificar','Editar',[['Combinar',[['[data-op="union"]','Unir'],['[data-op="subtract"]','Restar'],['[data-op="intersect"]','Intersectar'],['#hole','Hueco']]],['Dar forma',[['#shellbtn','Vaciar'],['#rndbtn','Redondear'],['#fuzzbtn','Textura']]],['Dividir',[['#fitbtn','Dividir']]]]],
   ['acabados','Aspecto',[['Vista',[['#lookbtn','Aspecto'],['#ghost','Transparente'],['#wire','Wireframe'],['#secbtn','Sección']]]]],
   ['preparar','Preparar',[['Imprimir',[['#bedbtn','Cama'],['#chk','Revisar'],['#estbtn','Estimar'],['#stl','Exportar STL']]]]]
  ];
  const rib=mkEl('div','ribbon'), rtabs=mkEl('div',null,'rtabs'), rbody=mkEl('div',null,'rbody'); rtabs.setAttribute('role','tablist');
  rib.append(rtabs,rbody); body.appendChild(rib);
  const setTab=n=>{
    body.dataset.rtab=n;
    rtabs.querySelectorAll('button[data-t]').forEach(b=>{const on=b.dataset.t===n; b.classList.toggle('on',on); b.setAttribute('aria-selected',on);});
    rbody.querySelectorAll('.rpane').forEach(p=>p.classList.toggle('on',p.dataset.t===n));
    try{localStorage.setItem('c3d_rtab',n);}catch(e){}
  };
  for(const [id,name,groups] of TABS){
    const tb=mkEl('button'); tb.type='button'; tb.dataset.t=id; tb.textContent=name; tb.setAttribute('role','tab'); tb.onclick=()=>setTab(id); rtabs.appendChild(tb);
    const pane=mkEl('div',null,'rpane'); pane.dataset.t=id; pane.setAttribute('role','tabpanel'); rbody.appendChild(pane);
    for(const [gt,items] of groups){
      const g=mkEl('div',null,'rg'), t=mkEl('div',null,'rgt'), r=mkEl('div',null,'rgr'); t.textContent=gt; g.append(t,r); pane.appendChild(g);
      for(const [sel2,lab] of items) addProxy(r,sel2,lab);
    }
  }

  // --- botón + (formas), siempre a mano en cualquier pestaña ---
  const plus=mkEl('button',null,'rplus'); plus.type='button'; plus.title='Agregar una forma (A)'; plus.setAttribute('aria-haspopup','true'); plus.setAttribute('aria-expanded','false'); plus.setAttribute('aria-label','Agregar una forma');
  plus.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4.6" stroke-linecap="round"><path d="M12 4v16M4 12h16"/></svg><span>Agregar</span>'; body.appendChild(plus);
  const pmenu=mkEl('div','plusmenu'); pmenu.hidden=true; pmenu.setAttribute('role','menu'); const pgrid=mkEl('div',null,'pmgrid'); pmenu.appendChild(pgrid);
  [['box','Cubo'],['sphere','Esfera'],['cylinder','Cilindro'],['cone','Cono'],['torus','Toroide'],['tube','Tubo'],['hemi','Media esfera'],['pyramid','Pirámide'],['hex','Prisma hex.'],['wedge','Cuña']].forEach(([k,l])=>addProxy(pgrid,'[data-add="'+k+'"]',l));
  addProxy(pmenu,'#shpbtn','Más formas',false,'pmmore'); document.body.appendChild(pmenu);
  let plusSeen=false; try{plusSeen=localStorage.getItem('c3d_plusseen')==='1';}catch(e){} if(!plusSeen)plus.classList.add('hint');
  const plusUsed=()=>{ if(plus.classList.contains('hint')){plus.classList.remove('hint'); try{localStorage.setItem('c3d_plusseen','1');}catch(e){}} };
  const plusClose=()=>{pmenu.hidden=true; plus.setAttribute('aria-expanded','false'); plus.classList.remove('on');};
  const plusOpen=()=>{ plusUsed(); const r=plus.getBoundingClientRect(), z=zf(); pmenu.style.left=r.left/z+'px'; pmenu.style.top=(r.bottom+6)/z+'px'; pmenu.hidden=false; plus.setAttribute('aria-expanded','true'); plus.classList.add('on'); };
  plus.onclick=e=>{e.stopPropagation(); pmenu.hidden?plusOpen():plusClose();};
  pmenu.addEventListener('click',()=>setTimeout(plusClose,0));
  document.addEventListener('pointerdown',e=>{ if(!pmenu.hidden&&!pmenu.contains(e.target)&&e.target!==plus&&!plus.contains(e.target))plusClose(); },true);
  addEventListener('keydown',e=>{ if(e.key==='Escape'&&!pmenu.hidden){plusClose();return;} if(e.key.toLowerCase()==='a'&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!(e.target.closest&&e.target.closest('input,select,textarea'))&&!(typeof sk!=='undefined'&&sk)){e.preventDefault(); pmenu.hidden?plusOpen():plusClose();} });
  let t0='crear'; try{t0=localStorage.getItem('c3d_rtab')||'crear';}catch(e){} setTab(TABS.some(t=>t[0]===t0)?t0:'crear');

  // --- riel de transformación (izquierda) ---
  const trail=mkEl('div','trail'); trail.setAttribute('role','toolbar'); trail.setAttribute('aria-label','Transformar');
  addProxy(trail,'[data-mode="free"]','Manipular',true); addProxy(trail,'[data-mode="translate"]','Mover',true); addProxy(trail,'[data-mode="rotate"]','Rotar',true); addProxy(trail,'[data-mode="scale"]','Escalar',true);
  trail.appendChild(sp()); addProxy(trail,'#snap','Snap',true); addProxy(trail,'#multi','Selección múltiple',true);
  wrapEl.appendChild(trail);

  // --- logo y estado de guardado en la barra superior ---
  const logo=mkEl('span',null,'logo'); logo.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" fill="rgba(110,160,255,.28)" stroke="#8db9ff"/><path d="M4 7.5l8 4.5 8-4.5" stroke="#8db9ff"/><path d="M12 12v9" stroke="#F5C451"/><path d="M12 3l8 4.5-8 4.5-8-4.5z" fill="rgba(245,196,81,.3)" stroke="#F5C451"/></svg><span>Constructor 3D</span>';
  $('#topbar').appendChild(logo);
  const savest=mkEl('span','savest'); savest.innerHTML='<i></i><span>Todo guardado</span>'; $('#topbar').appendChild(savest);

  // --- inspector con pestañas; los paneles de herramientas se acoplan arriba ---
  const insp=$('#insp'), itabs=mkEl('div','itabs'); itabs.setAttribute('role','tablist');
  itabs.innerHTML='<button type="button" data-i="props" role="tab">Propiedades</button><button type="button" data-i="list" role="tab">Piezas</button>';
  insp.prepend(itabs);
  const setItab=n=>{body.classList.toggle('itab-props',n==='props'); body.classList.toggle('itab-list',n==='list'); itabs.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.i===n));};
  itabs.onclick=e=>{const b=e.target.closest('button'); if(b)setItab(b.dataset.i);};
  setItab('props');
  const DOCK=[...new Set([...document.querySelectorAll('.pnl'),...['#splitp','#toolp','#bedp','#chkp'].map(s=>$(s)).filter(Boolean)])];
  let lastOpen='';

  // --- buscador de acciones (Ctrl K) ---
  const ACT=[
    ['Archivo','Nuevo proyecto','#pnew'],['Archivo','Abrir proyecto','#popen'],['Archivo','Guardar proyecto','#psave'],['Archivo','Importar STL, OBJ o 3MF','#imp'],['Archivo','Exportar STL','#stl'],['Archivo','Revisar malla para imprimir','#chk'],
    ['Historial','Deshacer','#undo'],['Historial','Rehacer','#redo'],
    ['Herramienta','Manipular (mover, escalar y rotar a mano)','[data-mode="free"]'],['Herramienta','Mover','[data-mode="translate"]'],['Herramienta','Rotar','[data-mode="rotate"]'],['Herramienta','Escalar','[data-mode="scale"]'],['Herramienta','Snap (mover de a pasos)','#snap'],['Herramienta','Selección múltiple','#multi'],
    ['Editar','Unir','[data-op="union"]'],['Editar','Restar','[data-op="subtract"]'],['Editar','Intersectar','[data-op="intersect"]'],['Editar','Marcar como hueco','#hole'],
    ['Editar','Vaciar','#shellbtn'],['Editar','Textura (fuzzy skin)','#fuzzbtn'],['Editar','Redondear o achaflanar','#rndbtn'],['Editar','Dividir (con un plano o en partes iguales)','#fitbtn'],
    ['Crear','Sketch 2D (extruir y revolucionar)','#skbtn'],['Objeto','Alinear y reflejar','#alinear'],['Objeto','Apoyar en la cama','#ground'],['Objeto','Acomodar en la cama','#arrange'],['Objeto','Apoyar por una cara','#face'],['Objeto','Patrón (repetir)','#pattern'],['Objeto','Medir','#measure'],['Objeto','Duplicar','#dup'],['Objeto','Borrar','#del'],
    ['Agregar','Cubo','[data-add="box"]'],['Agregar','Esfera','[data-add="sphere"]'],['Agregar','Cilindro','[data-add="cylinder"]'],['Agregar','Cono','[data-add="cone"]'],['Agregar','Toroide','[data-add="torus"]'],
    ['Agregar','Tubo','[data-add="tube"]'],['Agregar','Media esfera','[data-add="hemi"]'],['Agregar','Pirámide','[data-add="pyramid"]'],['Agregar','Prisma hexagonal','[data-add="hex"]'],['Agregar','Cuña','[data-add="wedge"]'],
    ['Agregar','Más formas (biblioteca)','#shpbtn'],['Agregar','Texto 3D','#textbtn'],['Agregar','Importar SVG','#svgbtn'],['Agregar','Biblioteca de piezas','#libbtn'],
    ['Vista','Vista de frente','[data-view="front"]'],['Vista','Vista desde arriba','[data-view="top"]'],['Vista','Vista de costado','[data-view="right"]'],['Vista','Vista en 3D','[data-view="iso"]'],['Vista','Cámara ortográfica / perspectiva','#projbtn'],['Vista','Encuadrar','#vfit'],
    ['Vista','Modo transparente','#ghost'],['Vista','Wireframe (solo aristas)','#wire'],['Imprimir','Estimar peso, filamento, tiempo y costo','#estbtn'],['Vista','Vista en sección (cortar para ver por dentro)','#secbtn'],['Vista','Tamaño de la cama','#bedbtn'],['Vista','Aspecto y luces','#lookbtn'],['Ayuda','Recorrido inicial','#tourbtn'],['Ayuda','Atajos de teclado','#vhelp']
  ];
  const cmdk=mkEl('div','cmdk'); cmdk.innerHTML='<div class="box" role="dialog" aria-label="Buscar acción"><input type="text" placeholder="Buscar una acción…" autocomplete="off" aria-label="Buscar acción"><div class="list" role="listbox"></div></div>';
  body.appendChild(cmdk);
  const cin=cmdk.querySelector('input'), clist=cmdk.querySelector('.list'); let rows=[], ci2=0;
  const norm=t=>t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
  const draw=()=>{
    const q=norm(cin.value.trim());
    rows=ACT.map(([g,l,s])=>({g,l,s,el:$(s)})).filter(a=>a.el&&!a.el.disabled&&(!q||norm(a.l+' '+a.g).includes(q)));
    ci2=Math.min(ci2,Math.max(0,rows.length-1));
    clist.innerHTML=rows.length?rows.map((a,i)=>{const k=keyOf(a.el); return '<div class="it'+(i===ci2?' on':'')+'" role="option" data-i="'+i+'">'+svgOf(a.s)+'<span class="nm">'+esc(a.l)+'</span><span class="gr">'+esc(a.g)+'</span>'+(k?'<kbd>'+esc(k)+'</kbd>':'')+'</div>';}).join(''):'<div class="empty">No hay acciones que coincidan.</div>';
    const on=clist.querySelector('.on'); if(on)on.scrollIntoView({block:'nearest'});
  };
  const openCmd=()=>{setAdd(false); cmdk.classList.add('open'); cin.value=''; ci2=0; draw(); cin.focus();};
  const closeCmd=()=>{cmdk.classList.remove('open'); cin.blur();};
  const runCmd=i=>{const a=rows[i]; if(!a)return; closeCmd(); setTimeout(()=>a.el.click(),0);};
  cin.addEventListener('input',()=>{ci2=0; draw();});
  cin.addEventListener('keydown',e=>{
    if(e.key==='ArrowDown'){e.preventDefault(); ci2=Math.min(rows.length-1,ci2+1); draw();}
    else if(e.key==='ArrowUp'){e.preventDefault(); ci2=Math.max(0,ci2-1); draw();}
    else if(e.key==='Enter'){e.preventDefault(); e.stopPropagation(); runCmd(ci2);}
    else if(e.key==='Escape'){e.preventDefault(); e.stopPropagation(); closeCmd();}
  });
  clist.addEventListener('click',e=>{const r=e.target.closest('.it'); if(r)runCmd(+r.dataset.i);});
  clist.addEventListener('mousemove',e=>{const r=e.target.closest('.it'); if(r&&+r.dataset.i!==ci2){ci2=+r.dataset.i; clist.querySelectorAll('.it').forEach((x,i)=>x.classList.toggle('on',i===ci2));}});
  cmdk.addEventListener('pointerdown',e=>{if(e.target===cmdk)closeCmd();});
  const cb=mkEl('button','cmdbtn'); cb.type='button'; cb.title='Buscar una acción ('+(isMac?'⌘ K':'Ctrl K')+')';
  cb.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><span>Buscar acción…</span><kbd>'+(isMac?'⌘ K':'Ctrl K')+'</kbd>';
  cb.onclick=openCmd; $('#topbar').appendChild(cb);
  addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault(); e.stopPropagation(); cmdk.classList.contains('open')?closeCmd():openCmd(); return;}
    if(!mq.matches||e.ctrlKey||e.metaKey||e.altKey)return;
    const t=e.target.tagName; if(t==='INPUT'||t==='SELECT'||t==='TEXTAREA')return;
    if(e.key==='Escape'){setAdd(false);}
    else if(e.key.toLowerCase()==='a'){e.preventDefault(); setTab('crear');}
  },true);

  // --- aplicar / quitar el layout al cambiar el tamaño ---
  const apply=()=>{
    const on=mq.matches; body.classList.toggle('v2',on); const lp=$('#listp');
    if(on){lp.hidden=false; renderList(true); DOCK.forEach(p=>insp.insertBefore(p,$('#dims')));}
    else {lp.hidden=true; $('#listbtn').classList.remove('on'); setAdd(false); DOCK.forEach(p=>wrapEl.appendChild(p));}
    hideTip(); try{fitBar();}catch(e){} sync();
  };
  mq.addEventListener('change',apply); apply();
}

// barra de scroll: se muestra mientras se desplaza
document.addEventListener('scroll',e=>{const t=e.target; if(t&&t.classList){t.classList.add('scrolling'); clearTimeout(t._sb); t._sb=setTimeout(()=>t.classList.remove('scrolling'),900);}},true);
