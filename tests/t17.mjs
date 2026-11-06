import {open,check,summary,exportStl} from './lib.mjs';
import fs from 'fs';
const glb=fs.readFileSync(process.env.GLB||new URL('./cube.glb',import.meta.url).pathname);
const {browser,page,errs}=await open();
const calls=[]; let polls=0;
await page.route('https://openapi.tripo3d.com/**',async route=>{
  const u=new URL(route.request().url()), m=route.request().method(), h=route.request().headers();
  calls.push(m+' '+u.pathname+' '+(h.authorization||'')+' '+(route.request().postData()||'').slice(0,120).replace(/\r?\n/g,' '));
  const J=d=>route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'},body:JSON.stringify(d)});
  if(m==='OPTIONS')return route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'}});
  if(u.pathname.endsWith('/account/balance'))return J({code:0,data:{balance:120.5,frozen:10}});
  if(u.pathname.endsWith('/files'))return J({code:0,data:{file_token:'file_abc'}});
  if(u.pathname.includes('/generation/'))return J({code:0,data:{task_id:'t1'}});
  if(u.pathname.includes('/tasks/')){polls++; return J({code:0,data:{task_id:'t1',status:polls<2?'running':'success',progress:polls<2?40:100,output:{model_url:'https://dl.tripo.test/m.glb'}}});}
  route.abort();
});
await page.route('https://dl.tripo.test/**',r=>r.fulfill({status:200,contentType:'model/gltf-binary',headers:{'access-control-allow-origin':'*'},body:glb}));
await page.click('#pnew'); await page.waitForTimeout(300); const d=await page.$('#dgo'); if(d&&await d.isVisible())await d.click();
await page.click('#aibtn'); await page.waitForTimeout(200);
await page.fill('#aikey','tsk_test123'); await page.dispatchEvent('#aikey','change');
await page.click('#aibal'); await page.waitForFunction(()=>/Saldo: 120.5/.test(document.querySelector('#aibalv').textContent)); check('Saldo se muestra',true);
await page.fill('#aitext','un dragon'); await page.fill('#aisize','30');
await page.click('#aigo'); await page.waitForFunction(()=>/^Listo/.test(document.querySelector('#aiinfo').textContent),null,{timeout:30000});
check('Texto: pedido correcto',calls.some(c=>c.includes('POST /v3/generation/text-to-model Bearer tsk_test123')&&c.includes('"prompt":"un dragon"')&&c.includes('"model"')),calls.join('\n'));
const st=await exportStl(page); const ext=[0,1,2].map(k=>+(st.mx[k]-st.mn[k]).toFixed(2));
check('Modelo importado y escalado a 30 mm',Math.max(...ext)>29.9&&Math.max(...ext)<30.1&&st.tris>=12,JSON.stringify(ext)+' tris '+st.tris); await page.keyboard.press('Escape');
check('Apoyado en la cama',Math.abs(st.mn[2])<0.01,st.mn[2]);
// modo foto
await page.click('#pnew'); await page.waitForTimeout(300); const d2=await page.$('#dgo'); if(d2&&await d2.isVisible())await d2.click();
await page.click('#aibtn'); await page.selectOption('#aimode','image'); polls=0;
fs.writeFileSync('/tmp/x.png',Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64'));
await page.setInputFiles('#aifile','/tmp/x.png'); await page.click('#aigo'); await page.waitForFunction(()=>/^Listo/.test(document.querySelector('#aiinfo').textContent),null,{timeout:30000});
check('Foto: sube archivo y pide image-to-model con token',calls.some(c=>c.includes('POST /v3/files'))&&calls.some(c=>c.includes('image-to-model')&&c.includes('"input":"file_abc"')&&c.includes('"face_limit":20000')),calls.slice(-4).join('\n'));
// error de clave
await page.click('#pnew'); await page.waitForTimeout(300); const d3=await page.$('#dgo'); if(d3&&await d3.isVisible())await d3.click();
await page.unroute('https://openapi.tripo3d.com/**'); await page.route('https://openapi.tripo3d.com/**',r=>r.request().method()==='OPTIONS'?r.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'}}):r.fulfill({status:401,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({code:1001,message:'invalid key'})}));
await page.click('#aibtn').catch(()=>{}); await page.selectOption('#aimode','text'); await page.fill('#aitext','x'); await page.click('#aigo'); await page.waitForFunction(()=>/rechaz/.test(document.querySelector('#aiinfo').textContent),null,{timeout:10000});
check('Clave inválida da mensaje claro',true);
const ok=await page.evaluate(()=>!document.querySelector('#aigo').disabled); check('El botón vuelve a habilitarse',ok);
check('Sin errores de página',errs.filter(e=>!/401|Failed to load resource/.test(e)).length===0,JSON.stringify(errs)); summary(); await browser.close();
