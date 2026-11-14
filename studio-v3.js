// Constructor 3D — Studio v3. UI and workflows; geometry stays in index.html.
export function installStudio(api) {
  const {THREE, scene, objs, M, bbox, select, commit, openPanel, msg, busyOn, busyOff} = api;
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const el = (tag, text, cls) => {const e=document.createElement(tag); if(text)e.textContent=text; if(cls)e.className=cls; return e;};
  document.body.classList.add('studio');
  const brand=el('strong','Constructor 3D','studio-brand');$('#topbar').prepend(brand);
  const state=el('button','Guardado local: comprobando…','save-state'); state.id='save-state'; state.type='button'; state.setAttribute('aria-live','polite'); state.title='Autoguardado en este navegador. Guardar descarga una copia independiente.'; $('#topbar').append(state);
  state.onclick=()=>api.retrySave();
  const version=el('span','v3 · prueba','studio-version'); $('#topbar').append(version);
  function panel(id,title,html){const p=el('section',null,'pnl studio-panel');p.id=id;p.hidden=true;p.setAttribute('aria-label',title);p.innerHTML='<div class="row"><b>'+title+'</b><button type="button" data-close aria-label="Cerrar">✕</button></div>'+html;$('#wrap').append(p);api.panels.push('#'+id);p.querySelector('[data-close]').onclick=()=>{p.hidden=true;clearPreview();};return p;}
  function proxy(parent,src,label){const b=el('button',label);b.type='button';b.onclick=()=>$(src).click();parent.append(b);return b;}
  function nav(id,label,icon,fn){const b=el('button');b.id=id;b.type='button';b.title=label;b.setAttribute('aria-label',label);b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+icon+'</svg><span>'+label+'</span>';b.onclick=fn;$('#lrail').append(b);return b;}
  const mod=panel('modify-panel','Modificar','<div class="studio-tools"></div><small>Elegí una herramienta. Las operaciones se pueden deshacer con Ctrl+Z.</small>');
  const actions=[['Unir','[data-op="union"]'],['Restar','[data-op="subtract"]'],['Intersectar','[data-op="intersect"]'],['Agujero','#hole'],['Vaciar','#shellbtn'],['Textura','#fuzzbtn'],['Redondear','#rndbtn'],['Dividir','#dividir'],['Cortar y encastrar','#fitbtn'],['Alinear / espejo','#alinear'],['Repetir','#pattern'],['Apoyar por una cara','#face'],['Duplicar','#dup'],['Borrar','#del']];
  actions.forEach(([label,src])=>proxy(mod.querySelector('.studio-tools'),src,label));
  nav('modify-btn','Modificar','<path d="m14 4 6 6-10 10H4v-6zM12 6l6 6"/>',()=>openPanel('#modify-panel'));
  const prep=panel('prepare-panel','Preparar para imprimir','<small>Se revisan las piezas visibles y sólidas que se exportarán.</small><div id="prepare-summary" role="status"></div><button id="prepare-check" class="pri">Revisar ahora</button><div class="studio-tools"></div><small>La revisión geométrica no sustituye la vista de capas del laminador: verificá orientación, soportes y espesor de paredes.</small>');
  [['Cama de impresión','#bedbtn'],['Revisar / reparar malla','#chk'],['Apoyar selección','#ground'],['Apoyar por una cara','#face'],['Cortar para la cama','#fitbtn'],['Exportar','#stl']].forEach(([lab,src])=>proxy(prep.querySelector('.studio-tools'),src,lab));
  nav('prepare-btn','Preparar','<path d="m3 7 9-4 9 4-9 4zM3 12l9 4 9-4M3 17l9 4 9-4"/>',()=>{openPanel('#prepare-panel');prepareSummary(false);});
  const subtract=panel('subtract-panel','Restar con vista previa','<label>Conservar <select id="sub-target" aria-label="Pieza que se conserva"></select></label><label>Quitar <select id="sub-cutter" aria-label="Pieza que corta"></select></label><button id="sub-swap">Intercambiar piezas</button><label>Conservar originales <input id="sub-keep" type="checkbox"></label><small>Si conservás originales, quedarán ocultos para no exportar geometría duplicada.</small><div id="sub-info" role="status">Elegí las piezas y calculá la vista previa.</div><button id="sub-preview">Calcular vista previa</button><div class="row"><button id="sub-cancel">Cancelar</button><button id="sub-apply" class="pri" disabled>Aplicar</button></div>');
  let preview=null, generation=0;
  const fingerprint=()=>JSON.stringify(objs.map(o=>[o.uuid,o.geometry.uuid,o.position.toArray(),o.quaternion.toArray(),o.scale.toArray(),M(o)]));
  function clearPreview(){generation++;if(!preview)return;for(const m of preview.meshes){scene.remove(m);m.geometry.dispose();m.material.dispose();} preview=null;api.applyGhost();$('#sub-apply').disabled=true;$('#fitgo').disabled=false;}
  function showPreview(kind,meshes,originals,sig){clearPreview();preview={kind,meshes,originals,sig};meshes.forEach(m=>{m.raycast=()=>{};scene.add(m);});originals.forEach(o=>o.visible=false);api.detach();}
  function acceptPreview(){const p=preview;preview=null;generation++;p.meshes.forEach(m=>{delete m.raycast;});return p;}
  const candidate=()=>objs.filter(o=>!M(o).h&&!M(o).l);
  function fillSubtract(){clearPreview();const list=candidate();if(list.length<2){msg('Necesitás dos piezas visibles y desbloqueadas para restar.');return;}const sel=api.selection().filter(o=>list.includes(o));const target=sel.length>1?sel[0]:list.find(o=>o!==sel[0])||list[0],cut=sel.at(-1)||list.find(o=>o!==target);
    for(const id of ['#sub-target','#sub-cutter'])$(id).innerHTML=list.map(o=>'<option value="'+o.uuid+'">'+esc(M(o).n)+'</option>').join('');
    $('#sub-target').value=target.uuid;$('#sub-cutter').value=cut.uuid;openPanel('#subtract-panel',true);$('#sub-info').textContent='Azul: resultado. Los originales no cambian hasta Aplicar.';
  }
  $('[data-op="subtract"]').onclick=fillSubtract;
  function invalidateSub(){clearPreview();$('#sub-info').textContent='Calculá la vista previa con estos valores.';}
  $('#sub-target').onchange=$('#sub-cutter').onchange=invalidateSub;
  $('#sub-swap').onclick=()=>{const a=$('#sub-target').value;$('#sub-target').value=$('#sub-cutter').value;$('#sub-cutter').value=a;invalidateSub();};
  $('#sub-cancel').onclick=()=>{clearPreview();subtract.hidden=true;api.refreshSelection();};
  $('#sub-preview').onclick=async()=>{
    clearPreview();const a=objs.find(o=>o.uuid===$('#sub-target').value),b=objs.find(o=>o.uuid===$('#sub-cutter').value);
    if(!a||!b||a===b){$('#sub-info').textContent='Elegí dos piezas diferentes.';return;}
    const sig=fingerprint(),token=generation;await busyOn('Calculando la resta…');let geo;
    try{await api.loadManifold();geo=api.subtractGeometry(a,b);if(!geo)throw Error('No se pudo calcular. Revisá las mallas primero.');if(!geo.attributes.position.count)throw Error('El corte elimina toda la pieza. Cambiá las piezas o sus posiciones.');
      if(token!==generation||sig!==fingerprint()||subtract.hidden){geo.dispose();return;}
      const m=new THREE.Mesh(geo,a.material.clone());m.material.emissive.setHex(0);api.recenter(m);m.userData.m={n:M(a).n+' (resta)',h:false,l:false,k:false};showPreview('subtract',[m],[a,b],sig);geo=null;$('#sub-apply').disabled=false;$('#sub-info').textContent='Vista previa lista. Aplicar confirma este resultado.';
    }catch(e){if(geo)geo.dispose();$('#sub-info').textContent=e.message;}finally{busyOff();}
  };
  $('#sub-apply').onclick=()=>{if(!preview||preview.kind!=='subtract'||preview.sig!==fingerprint()){invalidateSub();return;}const p=acceptPreview();if($('#sub-keep').checked)p.originals.forEach(o=>{M(o).h=true;o.visible=false;});else p.originals.forEach(api.remove);p.meshes.forEach(m=>objs.push(m));select(p.meshes);commit();subtract.hidden=true;msg('Resta aplicada. Ctrl+Z para deshacer.');};
  // Cut preview uses the exact same geometry builder as Apply, including selected pins.
  const fit=$('#fitp');const pinBox=el('div',null,'pin-editor');pinBox.innerHTML='<label>Ubicación de espigas <select id="fit-placement"><option value="auto">Automática</option><option value="manual">Elegir posiciones</option></select></label><div id="pin-options" hidden><small>Elegí hasta 4 posiciones por plano. Vista de frente al corte: arriba = altura Y; horizontal = Z en cortes X, o X en cortes Z. Si una posición no entra en material sólido, se avisa.</small><div class="pin-grid" role="group" aria-label="Posiciones de espigas"></div></div><button id="fit-preview">Vista previa del resultado</button><div id="fit-preview-info" role="status"></div>';
  fit.insertBefore(pinBox,fit.querySelector('.row:last-of-type'));
  const chosen=new Set(['0,0','0,2','2,0','2,2']);
  for(let y=2;y>=0;y--)for(let x=0;x<3;x++){const k=y+','+x,b=el('button','●');b.type='button';b.dataset.pin=k;b.setAttribute('aria-label','Altura '+[20,50,80][y]+'%, lateral '+[20,50,80][x]+'%');b.setAttribute('aria-pressed',chosen.has(k));b.onclick=()=>{if(chosen.has(k))chosen.delete(k);else if(chosen.size<4)chosen.add(k);else{msg('Elegí hasta 4 espigas por plano.');return;}b.setAttribute('aria-pressed',chosen.has(k));invalidateCut();};pinBox.querySelector('.pin-grid').append(b);}
  function pinConfig(){return $('#fit-placement').value==='manual'?[...chosen].map(k=>k.split(',').map(n=>[.2,.5,.8][+n])):null;}
  function invalidateCut(){clearPreview();$('#fit-preview-info').textContent='Calculá una vista previa para comprobar los encastres.';}
  $('#fit-placement').onchange=()=>{$('#pin-options').hidden=$('#fit-placement').value!=='manual';invalidateCut();};
  fit.querySelectorAll('input').forEach(e=>e.addEventListener('input',invalidateCut));
  const cutSignature=()=>fingerprint()+'|'+[...fit.querySelectorAll('input')].map(e=>e.type==='checkbox'?e.checked:e.value).join('|')+'|'+JSON.stringify(pinConfig());
  $('#fit-preview').onclick=async()=>{clearPreview();const o=api.selection().at(-1);if(!o){msg('Elegí la pieza para cortar.');return;}const sig=cutSignature(),token=generation;await busyOn('Calculando cortes y encastres…');try{const meshes=await api.buildCutMeshes(o);if(token!==generation||sig!==cutSignature()||fit.hidden){meshes.forEach(m=>{m.geometry.dispose();m.material.dispose();});return;}showPreview('cut',meshes,[o],sig);$('#fit-preview-info').textContent=meshes.length+' partes. Esta geometría es la que se aplicará. Las separaciones son solo para ver el resultado.';}catch(e){$('#fit-preview-info').textContent=e.message;}finally{busyOff();}};
  $('#fitgo').textContent='Aplicar corte';
  $('#fitgo').onclick=async()=>{if(!preview||preview.kind!=='cut'||preview.sig!==cutSignature()){await $('#fit-preview').onclick();if(preview?.kind==='cut')$('#fit-preview-info').textContent+=' Tocá Aplicar corte para confirmar.';return;}const p=acceptPreview();p.originals.forEach(api.remove);p.meshes.forEach(m=>objs.push(m));select(p.meshes);commit();fit.hidden=true;api.clearCutPlanes();msg('Corte aplicado. Exportá un STL por pieza para organizarlas en el laminador.');};
  // Preparation checks match export filtering; results explicitly become stale after edits.
  let prepSignature='';
  function prepareSummary(full){const out=$('#prepare-summary'),list=objs.filter(o=>!M(o).h&&!M(o).k);out.replaceChildren();if(!list.length){out.textContent='No hay piezas visibles y sólidas para exportar.';return;}
    for(const o of list){const b=bbox(o),issues=[];if(b.min.x<-api.bed.w/2-.01||b.max.x>api.bed.w/2+.01||b.min.z<-api.bed.d/2-.01||b.max.z>api.bed.d/2+.01)issues.push('sobresale de la cama');if(b.min.y>.05)issues.push('flota sobre la cama');if(b.min.y<-.05)issues.push('parte bajo la cama');if(full){const a=api.analyzeMesh(o.geometry);if(!a.ok)issues.push('malla con errores');}
      const row=el('div',null,'prepare-row');row.append(el('b',M(o).n),el('span',issues.length?'⚠ '+issues.join(' · '):full?'✓ Sin errores en estas comprobaciones':'✓ Posición dentro de la cama; falta revisar malla'));out.append(row);}
    prepSignature=full?fingerprint()+'|'+api.bed.w+'|'+api.bed.d:'';
  }
  $('#prepare-check').onclick=async()=>{await busyOn('Revisando piezas para exportar…');try{prepareSummary(true);}catch(e){$('#prepare-summary').textContent='No se pudo completar la revisión. Usá Revisar / reparar malla.';}finally{busyOff();}};
  // Reusable parts live in IndexedDB, separate from the automatic scene snapshot.
  const lib=panel('library-panel','Mi biblioteca','<small>Piezas guardadas en este navegador. Descargá una copia para llevarlas a otro equipo.</small><label>Nombre <input id="library-name" maxlength="80" placeholder="Base, soporte, pieza…"></label><button id="library-save" class="pri">Guardar selección</button><input id="library-search" type="search" placeholder="Buscar piezas…" aria-label="Buscar piezas guardadas"><div id="library-items"></div><div id="library-info" role="status"></div>');
  nav('library-btn','Biblioteca','<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 10v10"/>',()=>{openPanel('#library-panel');renderLibrary();});
  async function libraryData(){return await api.storageGet('library')||[];}
  async function renderLibrary(){try{const all=await libraryData(),q=$('#library-search').value.toLocaleLowerCase(),box=$('#library-items');box.replaceChildren();const rows=all.filter(x=>x.name.toLocaleLowerCase().includes(q));if(!rows.length)box.append(el('small','No hay piezas guardadas que coincidan.'));
      for(const item of rows){const card=el('div',null,'library-card');card.append(el('b',item.name),el('small',item.data.objs.length+' pieza(s)'));const row=el('div',null,'row');for(const [label,fn] of [['Agregar',()=>api.insertProject(item.data)],['Descargar',()=>api.saveFile(item.name.replace(/[^\p{L}\p{N}_-]/gu,'_')+'.json',JSON.stringify(item.data))],['Quitar',async()=>{const latest=await libraryData();await api.storageSet(latest.filter(x=>x.id!==item.id),'library');await renderLibrary();$('#library-info').replaceChildren(el('span','Pieza quitada. '));const undo=el('button','Deshacer');undo.onclick=async()=>{try{const a=await libraryData();if(!a.some(x=>x.id===item.id))await api.storageSet([...a,item],'library');await renderLibrary();$('#library-info').textContent='Pieza recuperada.';}catch(e){libraryError();}};$('#library-info').append(undo);} ]]){const b=el('button',label);b.type='button';b.onclick=async()=>{try{await fn();}catch(e){libraryError();}};row.append(b);}card.append(row);box.append(card);}
    }catch(e){libraryError();}}
  function libraryError(){$('#library-info').textContent='No se pudo acceder a la biblioteca local. Guardá el proyecto como archivo.';}
  $('#library-search').oninput=renderLibrary;
  $('#library-save').onclick=async()=>{const picked=api.selection();if(!picked.length){$('#library-info').textContent='Elegí una o más piezas para guardar.';return;}const name=$('#library-name').value.trim()||M(picked[0]).n;const data=api.serializeSelection(picked);$('#library-save').disabled=true;try{const all=await libraryData();all.push({id:crypto.randomUUID(),name,data,created:Date.now()});await api.storageSet(all,'library');await renderLibrary();$('#library-info').textContent='Guardado: '+name;}catch(e){libraryError();}finally{$('#library-save').disabled=false;}};
  // Invalidate previews before any scene edits or another tool. Orbiting stays available.
  document.addEventListener('click',e=>{if(!preview)return;if(e.target.closest('#subtract-panel,#fitp,#c,#vbar,#prepare-panel'))return;clearPreview();api.refreshSelection();},true);
  window.addEventListener('keydown',e=>{if(!preview)return;if(e.key==='Escape'){clearPreview();subtract.hidden=true;fit.hidden=true;api.refreshSelection();}else if(!e.target.closest('input,select,textarea')&&((e.ctrlKey||e.metaKey)||/^[12345mrgth]$/i.test(e.key)||e.key==='Delete'))clearPreview();},true);
  let lastPreviewCheck=0;
  function tick(){if(!preview)return;const hidden=preview.kind==='cut'?fit.hidden:subtract.hidden;if(hidden){clearPreview();return;}const now=performance.now();if(now-lastPreviewCheck>150){lastPreviewCheck=now;const sig=preview.kind==='cut'?cutSignature():fingerprint();if(sig!==preview.sig){clearPreview();return;}}preview.originals.forEach(o=>o.visible=false);}
  setInterval(()=>{if(prep.hidden||!prepSignature)return;if(prepSignature!==fingerprint()+'|'+api.bed.w+'|'+api.bed.d){prepSignature='';$('#prepare-summary').replaceChildren(el('small','El diseño cambió. Tocá Revisar ahora para actualizar el resultado.'));}},500);
  const mq=matchMedia('(min-width:1100px) and (pointer:fine)');function layout(){document.body.classList.toggle('studio-wide',mq.matches);$('#addbtn').title='Agregar formas, texto o SVG (A)';}mq.addEventListener('change',layout);layout();
  return {tick,pinConfig,clearPreview,setSaveState(kind,text){state.dataset.state=kind;state.textContent=text;state.title=kind==='error'?'No se guardó automáticamente. Guardá un archivo con Ctrl+S o tocá aquí para reintentar.':'Autoguardado local en este navegador. Ctrl+S descarga una copia independiente.';}};
}
