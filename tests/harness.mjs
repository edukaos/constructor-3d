import {chromium} from 'playwright';
import fs from 'fs';
import http from 'http';
import path from 'path';
const L=process.env.C3D_LIBS||new URL('./node_modules/',import.meta.url).pathname;
const map=[
 [/\/npm\/three@0\.160\.0\/(.*)$/, p=>L+'three/'+p],
 [/\/npm\/three-mesh-bvh@0\.7\.3\/(.*)$/, p=>L+'three-mesh-bvh/'+p],
 [/\/npm\/three-bvh-csg@0\.0\.16\/(.*)$/, p=>L+'three-bvh-csg/'+p],
 [/\/npm\/manifold-3d@3\.5\.4\/(.*)$/, p=>L+'manifold-3d/'+p],
];
// La app se sirve por http (los módulos de js/ no cargan desde file://).
const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml','.wasm':'application/wasm'};
let server=null;
async function serve(root){
  if(server)return server.port;
  const srv=http.createServer((req,res)=>{
    const u=decodeURIComponent(new URL(req.url,'http://x').pathname); let fp=path.join(root,u.endsWith('/')?u+'index.html':u);
    if(!fp.startsWith(root)||!fs.existsSync(fp)){res.writeHead(404);res.end();return;}
    res.writeHead(200,{'content-type':TYPES[path.extname(fp)]||'application/octet-stream'}); fs.createReadStream(fp).pipe(res);
  });
  await new Promise(r=>srv.listen(0,'127.0.0.1',r)); srv.unref(); server={port:srv.address().port}; return server.port;
}
export async function open(file=new URL('../index.html',import.meta.url).pathname,{w=1280,h=800}={}){
  const browser=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const ctx=await browser.newContext({viewport:{width:w,height:h},acceptDownloads:true,serviceWorkers:'block'});
  const page=await ctx.newPage();
  const errs=[]; page.on('pageerror',e=>errs.push('PAGEERROR: '+e.message)); page.on('console',m=>{if(m.type()==='error')errs.push('CONSOLE: '+m.text());});
  await page.route(/cdn\.jsdelivr\.net/,route=>{
    const u=new URL(route.request().url());
    for(const [re,f] of map){const m=u.pathname.match(re); if(m){const fp=f(m[1]); if(fs.existsSync(fp))return route.fulfill({body:fs.readFileSync(fp),contentType:fp.endsWith('.wasm')?'application/wasm':fp.endsWith('.json')?'application/json':'text/javascript'}); }}
    route.abort();
  });
  // Sin recorrido inicial ni avisos de primera vez.
  await page.addInitScript(()=>{try{localStorage.setItem('c3d_tour','1');localStorage.setItem('c3d_plusseen','1');}catch(e){}});
  const port=await serve(path.dirname(file));
  await page.goto('http://127.0.0.1:'+port+'/'+path.basename(file));
  await page.waitForTimeout(1500);
  adaptToLayout(page);
  return {browser,page,errs};
}

// Adaptación al diseño en cinta: muchos botones originales quedan ocultos porque la cinta muestra
// un botón espejo, y las piezas nuevas aparecen como fantasma que hay que apoyar.
// Así las pruebas siguen hablando de los botones y campos de siempre.
const loc=(page,sel)=>page.locator(sel).first();
const visible=(page,sel)=>loc(page,sel).isVisible().catch(()=>false);
async function settlePlace(page){
  // Pieza nueva en modo fantasma: se apoya donde está (en el centro de la cama).
  await page.evaluate(()=>{const b=document.getElementById('placebar'); if(b&&!b.hidden)document.getElementById('placeok').click();});
}
function adaptToLayout(page){
  const click=page.click.bind(page), fill=page.fill.bind(page), select=page.selectOption.bind(page), press=page.keyboard.press.bind(page.keyboard);
  page.click=async(sel,opts)=>{
    if(await visible(page,sel)) await click(sel,opts); else await loc(page,sel).evaluate(e=>e.click());
    await page.waitForTimeout(40); await settlePlace(page);
  };
  page.fill=async(sel,v,opts)=>{
    if(await visible(page,sel)) return fill(sel,v,opts);
    await loc(page,sel).evaluate((e,v)=>{e.value=v; e.dispatchEvent(new Event('input',{bubbles:true}));},String(v));
  };
  page.selectOption=async(sel,v,opts)=>{
    if(await visible(page,sel)) return select(sel,v,opts);
    await loc(page,sel).evaluate((e,v)=>{e.value=v; e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true}));},String(v));
  };
  page.keyboard.press=async(k,opts)=>{await press(k,opts); if(/^[1-5]$/.test(k)){await page.waitForTimeout(60); await settlePlace(page);}};
}
