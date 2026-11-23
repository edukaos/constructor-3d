if('serviceWorker' in navigator && location.protocol.startsWith('http') && !window.claude){addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));}
// aviso de versión nueva: compara la fecha y el tamaño de los archivos publicados de la app (index.html, css/ y js/) con los de cuando se abrió
if(location.protocol.startsWith('http') && !window.claude){(function(){
  let base=null, shown=false;
  const files=()=>[location.href.split('#')[0].split('?')[0],...[...document.querySelectorAll('script[src],link[rel=stylesheet]')].map(e=>e.src||e.href).filter(u=>u&&new URL(u).origin===location.origin)];
  const one=async u=>{const r=await fetch(u,{method:'HEAD',cache:'no-store'}); return (r.headers.get('last-modified')||'')+'|'+(r.headers.get('content-length')||'');};
  const sig=async()=>{try{const m=(await Promise.all(files().map(one))).join(';'); return /^[|;]*$/.test(m)?null:m;}catch(e){return null;}};
  const show=()=>{shown=true; const d=document.createElement('div'); d.id='newver'; d.innerHTML='<span>Hay una versión nueva</span><button type="button" id="nvgo">Actualizar</button><button type="button" id="nvx" title="Más tarde">✕</button>'; document.body.appendChild(d); d.querySelector('#nvgo').onclick=()=>window.c3dReload?window.c3dReload():location.reload(); d.querySelector('#nvx').onclick=()=>d.remove();};
  const chk=async()=>{if(shown)return; const x=await sig(); if(!x)return; if(base===null){base=x; return;} if(x!==base)show();};
  addEventListener('load',()=>setTimeout(chk,3000)); setInterval(chk,300000); document.addEventListener('visibilitychange',()=>{if(!document.hidden)chk();});
})();}
