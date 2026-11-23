/* Mudanza: la dirección oficial es constructor.quiron3d.com. Desde edukaos.github.io se pasa el trabajo guardado (autoguardado y biblioteca) con un clic. */
(function(){
var NEW='https://constructor.quiron3d.com',OLD='https://edukaos.github.io';
function db(){return new Promise(function(res,rej){var r=indexedDB.open('constructor3d',1);r.onupgradeneeded=function(){r.result.createObjectStore('kv');};r.onsuccess=function(){res(r.result);};r.onerror=function(){rej(r.error);};});}
function get(k){return db().then(function(d){return new Promise(function(res){var q=d.transaction('kv').objectStore('kv').get(k);q.onsuccess=function(){d.close();res(q.result);};q.onerror=function(){d.close();res(null);};});}).catch(function(){return null;});}
function put(k,v){return db().then(function(d){return new Promise(function(res){var t=d.transaction('kv','readwrite');t.objectStore('kv').put(v,k);t.oncomplete=function(){d.close();res(true);};t.onerror=function(){d.close();res(false);};});}).catch(function(){return false;});}
var host=location.hostname;
if(host==='edukaos.github.io'){
  var done=false;try{done=localStorage.getItem('c3d_mudado')==='1';}catch(e){}
  Promise.all([get('auto'),get('lib')]).then(function(r){
    var auto=r[0],lib=Array.isArray(r[1])?r[1]:[];
    if(done||(!auto&&!lib.length)){location.replace(NEW+'/');return;}
    var css='position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;padding:16px;background:rgba(5,12,24,.72);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#F4F6FC';
    var o=document.createElement('div');o.setAttribute('role','dialog');o.setAttribute('aria-modal','true');o.style.cssText=css;
    o.innerHTML='<div style="max-width:440px;width:100%;padding:28px;border-radius:24px;background:#0E1E32;box-shadow:inset 0 0 0 1px rgba(159,185,229,.18),0 30px 80px rgba(0,0,0,.5)">'+
      '<div style="font-size:22px;font-weight:700;letter-spacing:-.02em;margin-bottom:8px">El Constructor 3D se mudó</div>'+
      '<p style="margin:0 0 6px;color:#C9D7EC">Ahora está en <b style="color:#F7CE70">constructor.quiron3d.com</b>.</p>'+
      '<p style="margin:0 0 20px;color:#C9D7EC">Tenés trabajo guardado acá'+(lib.length?' ('+(auto?'tu último proyecto y ':'')+lib.length+' pieza'+(lib.length>1?'s':'')+' en tu biblioteca)':' (tu último proyecto)')+'. Pasalo con un clic y seguí en la dirección nueva.</p>'+
      '<button type="button" id="c3dMig" style="width:100%;min-height:50px;display:flex;align-items:center;justify-content:center;text-align:center;border:0;border-radius:16px;background:#F5C451;color:#1A1405;font:inherit;font-weight:700;cursor:pointer">Pasar mi trabajo y seguir</button>'+
      '<p id="c3dMsg" role="status" style="min-height:22px;margin:12px 0 0;font-size:14px;color:#F7CE70"></p>'+
      '<a href="'+NEW+'/" id="c3dSkip" style="display:inline-block;margin-top:4px;font-size:14px;color:#AFC5E6">Ir sin pasar nada</a></div>';
    document.body.appendChild(o);
    var w=null,t=null,msg=document.getElementById('c3dMsg'),btn=document.getElementById('c3dMig');
    window.addEventListener('message',function(e){
      if(e.origin!==NEW||!e.data)return;
      if(e.data.type==='c3d-ready'&&w){w.postMessage({type:'c3d-migrate',auto:auto||null,lib:lib},NEW);}
      if(e.data.type==='c3d-done'){clearTimeout(t);try{localStorage.setItem('c3d_mudado','1');}catch(x){}
        msg.textContent='¡Listo! Tu trabajo ya está en constructor.quiron3d.com, en la otra pestaña. Podés cerrar esta.';btn.disabled=true;btn.style.opacity='.6';}
    });
    btn.onclick=function(){msg.textContent='Pasando tu trabajo…';w=window.open(NEW+'/#migrar','_blank');
      if(!w){msg.textContent='El navegador bloqueó la ventana nueva. Permití ventanas emergentes y probá de nuevo.';return;}
      t=setTimeout(function(){msg.textContent='No se pudo pasar. Guardá tu proyecto con «Guardar proyecto» y abrilo en la dirección nueva.';},20000);};
  });
}else if(location.hash==='#migrar'&&window.opener){
  history.replaceState(null,'',location.pathname+location.search);
  window.addEventListener('message',function(e){
    if(e.origin!==OLD||!e.data||e.data.type!=='c3d-migrate')return;
    Promise.all([get('auto'),get('lib')]).then(function(r){
      var jobs=[],lib=Array.isArray(r[1])?r[1]:[],inc=Array.isArray(e.data.lib)?e.data.lib:[];
      if(e.data.auto)jobs.push(put('auto',e.data.auto));
      if(inc.length){var have={};lib.forEach(function(x){have[JSON.stringify(x)]=1;});jobs.push(put('lib',lib.concat(inc.filter(function(x){return !have[JSON.stringify(x)];}))));}
      return Promise.all(jobs);
    }).then(function(){try{window.opener.postMessage({type:'c3d-done'},OLD);}catch(x){}location.reload();});
  });
  window.opener.postMessage({type:'c3d-ready'},OLD);
}
})();
