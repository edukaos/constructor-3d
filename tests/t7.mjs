import {open,check,msg,saveProj,summary} from './lib.mjs';
const {browser,page,errs}=await open(''+new URL('../index.html',import.meta.url).pathname+'',{w:1280,h:800});
const cnt=async()=> (await saveProj(page)).objs.length;
// disposición
const box=async s=>page.$eval(s,e=>{const r=e.getBoundingClientRect();return {x:r.x,w:r.width,y:r.y,h:r.height};});
const L=await box('#lrail'), R=await box('#rrail'), W=await box('#wrap'), T=await box('#topbar');
check('Transformar/Combinar/Editar a la IZQUIERDA',L.x<W.x&&/Transformar/.test(await page.textContent('#lrail'))&&/Editar/.test(await page.textContent('#lrail')));
check('Crear a la DERECHA',R.x>W.x&&/Formas básicas/.test(await page.textContent('#rrail')));
const heads=await page.$$eval('#topbar .grp',g=>g.map(x=>x.getBoundingClientRect()));
const left=heads[0].left, right=heads.at(-1).right;
check('Barra superior centrada',Math.abs(left+right-1280)<4,`margen izq ${left.toFixed(0)} / der ${(1280-right).toFixed(0)}`);
check('Barra superior junta (sin huecos entre grupos)',heads.slice(1).every((h,i)=>h.left-heads[i].right<=1.5));
// las 11 formas visibles, sin botón Más
const adds=await page.$$eval('#rrail [data-add],#rrail #textbtn',b=>b.map(x=>({v:x.getBoundingClientRect().height>0,k:x.dataset.add||'texto'})));
check('11 formas/herramientas visibles en Crear',adds.length===11&&adds.every(a=>a.v),adds.map(a=>a.k).join(','));
check('No hay botón "Más"',(await page.$('#more'))===null);
// agregar cada forma con su botón
await page.click('#pnew'); await page.waitForTimeout(200);
for(const k of ['box','sphere','cylinder','cone','torus','tube','hemi','pyramid','hex','wedge']){ await page.click(`#rrail [data-add=${k}]`); await page.waitForTimeout(120); }
check('Cada botón agrega su forma (10 piezas)',await cnt()===10,'n='+await cnt());
// modos
for(const [m,k] of [['rotate','r'],['scale','e'],['translate','m']]){ await page.click(`#lrail [data-mode=${m}]`); check('Modo '+m+' activo',await page.$eval(`[data-mode=${m}]`,b=>b.classList.contains('on'))); }
// Texto
await page.click('#textbtn'); await page.waitForTimeout(200);
check('Texto abre su panel',await page.$eval('#textp',e=>!e.hidden));
console.log('errores:',errs);
summary(); await browser.close();
