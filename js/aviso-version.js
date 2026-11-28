if('serviceWorker' in navigator && location.protocol.startsWith('http') && !window.claude){addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));}
// aviso de versión nueva: compara la fecha y el tamaño de los archivos publicados de la app (index.html, css/ y js/) con los de cuando se abrió
if(location.protocol.startsWith('http') && !window.claude){(function(){
  let base=null, shown=false;
  const files=()=>[location.href.split('#')[0].split('?')[0],...[...document.querySelectorAll('script[src],link[rel=stylesheet]')].map(e=>e.src||e.href).filter(u=>u&&new URL(u).origin===location.origin)];
  const one=async u=>{const r=await fetch(u,{method:'HEAD',cache:'no-store'}); return (r.headers.get('last-modified')||'')+'|'+(r.headers.get('content-length')||'');};
  const sig=async()=>{try{const m=(await Promise.all(files().map(one))).join(';'); return /^[|;]*$/.test(m)?null:m;}catch(e){return null;}};
  // número de la versión publicada (de js/version.js), para mostrarlo en el aviso
  const pubVer=async()=>{try{const t=await (await fetch('js/version.js',{cache:'no-store'})).text(); const m=t.match(/C3D_VERSION\s*=\s*(\d+)/); return m?+m[1]:null;}catch(e){return null;}};
  const show=async()=>{shown=true; const v=await pubVer(); const d=document.createElement('div'); d.id='newver'; d.innerHTML='<span>Hay una versión nueva'+(v&&v!==window.C3D_VERSION?' (v'+v+')':'')+'</span><button type="button" id="nvgo">Actualizar</button><button type="button" id="nvx" title="Más tarde">✕</button>'; document.body.appendChild(d); d.querySelector('#nvgo').onclick=()=>window.c3dReload?window.c3dReload():location.reload(); d.querySelector('#nvx').onclick=()=>d.remove();};
  const chk=async()=>{if(shown)return; const x=await sig(); if(!x)return; if(base===null){base=x; return;} if(x!==base)show();};
  addEventListener('load',()=>setTimeout(chk,3000)); setInterval(chk,300000); document.addEventListener('visibilitychange',()=>{if(!document.hidden)chk();});
})();}
// después de actualizar: un cartel una sola vez con el número nuevo y sus novedades (la primera vez que se abre la app no se muestra)
if(window.C3D_VERSION){addEventListener('load',()=>{
  let prev=null; try{prev=+localStorage.getItem('c3d_ver')||null; localStorage.setItem('c3d_ver',String(C3D_VERSION));}catch(e){return;}
  if(!prev||prev>=C3D_VERSION)return;
  const N=window.C3D_NOVEDADES||{}, notas=[]; for(let v=prev+1;v<=C3D_VERSION;v++)if(N[v])notas.push(N[v]);
  const d=document.createElement('div'); d.id='updver';
  const esc=t=>String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;');
  d.innerHTML='<div><b>Actualizado a v'+C3D_VERSION+'</b>'+notas.slice(-3).map(t=>'<p>'+esc(t)+'</p>').join('')+'</div><button type="button" title="Cerrar">✕</button>';
  document.body.appendChild(d); const bye=()=>d.remove(); d.querySelector('button').onclick=bye; setTimeout(bye,15000);
});}
