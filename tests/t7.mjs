import {open,check,msg,saveProj,summary,clk} from './lib.mjs';
const {browser,page,errs}=await open('/home/claude/constructor-3d/index.html',{w:1280,h:800});
const cnt=async()=> (await saveProj(page)).objs.length;
// disposición
const box=async s=>page.$eval(s,e=>{const r=e.getBoundingClientRect();return {x:r.x,w:r.width,y:r.y,h:r.height};});
const L=await box('#lrail'), I=await box('#insp'), W=await box('#wrap'), T=await box('#topbar');
check('Herramientas a la IZQUIERDA (riel de íconos)',L.x+L.w<=W.x+W.w/3&&L.w<130&&/Transformar|Mover/.test(await page.$eval('#lrail',e=>e.textContent+[...e.querySelectorAll('button')].map(b=>b.title).join(' '))));
check('Inspector (Piezas y Propiedades) a la DERECHA',I.x>=W.x+W.w/2&&I.w>=280&&await page.$eval('#insp #listp',e=>e.offsetHeight>0));
// Agregar: menú de formas junto al riel
check('Menú Agregar cerrado al inicio',await page.$eval('#rrail',e=>getComputedStyle(e).display==='none'));
await page.click('#addbtn'); await page.waitForTimeout(200);
const adds=await page.$$eval('#rrail [data-add],#rrail #textbtn',b=>b.map(x=>({v:x.getBoundingClientRect().height>0,k:x.dataset.add||'texto'})));
check('11 formas/herramientas visibles en Agregar',adds.length===11&&adds.every(a=>a.v),adds.map(a=>a.k).join(','));
await page.click('[data-add=sphere]'); await page.waitForTimeout(200);
check('Agregar se cierra al elegir una forma',await page.$eval('#rrail',e=>getComputedStyle(e).display==='none'));
// barra superior: buscador al centro y Exportar a la derecha
const sb=await box('#cmdbtn'), ex=await box('#stl');
check('Barra superior: buscador centrado y Exportar a la derecha',Math.abs(sb.x+sb.w/2-640)<260&&ex.x>900);
// barra de acciones, barra de vista y pie de estado
check('Barra de acciones visible con una pieza elegida',await page.$eval('#ctx',e=>!e.hidden&&e.offsetHeight>0));
check('Barra de vista y pie de estado visibles',await page.$eval('#vbar',e=>e.offsetHeight>0)&&await page.$eval('#status',e=>/triángulos/.test(e.textContent)));
// buscador Ctrl K
await page.keyboard.press('Control+k'); await page.waitForTimeout(200);
check('Ctrl K abre el buscador',await page.$eval('#cmdk',e=>e.classList.contains('open')));
await page.keyboard.type('duplic'); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
check('Buscador: "duplic" + Enter duplica la pieza',(await cnt())===3,'piezas '+(await cnt()));
check('No hay botón "Más"',(await page.$('#more'))===null);
// agregar cada forma con su botón
await page.click('#pnew'); await page.waitForTimeout(200);
for(const k of ['box','sphere','cylinder','cone','torus','tube','hemi','pyramid','hex','wedge']){ await page.click('#addbtn'); await page.waitForTimeout(80); await page.click(`#rrail [data-add=${k}]`); await page.waitForTimeout(120); }
check('Cada botón agrega su forma (10 piezas)',await cnt()===10,'n='+await cnt());
// modos
for(const [m,k] of [['rotate','r'],['scale','e'],['translate','m']]){ await page.click(`#lrail [data-mode=${m}]`); check('Modo '+m+' activo',await page.$eval(`[data-mode=${m}]`,b=>b.classList.contains('on'))); }
// Texto
await clk(page,'#textbtn'); await page.waitForTimeout(200);
check('Texto abre su panel',await page.$eval('#textp',e=>!e.hidden));
console.log('errores:',errs);
summary(); await browser.close();
