import {open,check,msg,saveProj,summary,clk} from './lib.mjs';
const {browser,page,errs}=await open(undefined,{w:1280,h:800});
const cnt=async()=> (await saveProj(page)).objs.length;
// disposición (pantalla ancha con cinta de pestañas)
const box=async s=>page.$eval(s,e=>{const r=e.getBoundingClientRect();return {x:r.x,w:r.width,y:r.y,h:r.height};});
const vis=s=>page.locator(s).first().isVisible();
const R=await box('#trail'), I=await box('#insp'), W=await box('#wrap');
check('Riel Mover/Rotar/Escalar a la IZQUIERDA',R.x+R.w<=W.x+W.w/3&&R.w<130);
check('Inspector (Propiedades y Piezas) a la DERECHA',I.x>=W.x+W.w/2&&I.w>=280);
const tabs=await page.$$eval('#ribbon .rtabs button',b=>b.map(x=>x.textContent.trim()));
check('Cinta con pestañas Crear, Objeto, Editar, Aspecto, Preparar',tabs.join(',')==='Crear,Objeto,Editar,Aspecto,Preparar',tabs.join(','));
await page.click('#ribbon .rtabs [data-t=modificar]'); await page.waitForTimeout(150);
const grps=await page.$$eval('#ribbon .rpane.on .rgt',g=>g.map(x=>x.textContent.trim()));
check('Pestaña Editar tiene el grupo Dividir',grps.includes('Dividir'),grps.join(','));
// Agregar: botón + con el menú de formas
check('Menú de formas cerrado al inicio',await page.$eval('#plusmenu',e=>e.hidden));
await page.click('.rplus'); await page.waitForTimeout(200);
const adds=await page.$$eval('#plusmenu .pmgrid button',b=>b.map(x=>x.getBoundingClientRect().height>0));
check('10 formas visibles en el menú +',adds.length===10&&adds.every(Boolean),String(adds.length));
await page.click('#plusmenu .pmgrid button:first-child'); await page.waitForTimeout(250);
check('El menú + se cierra al elegir una forma',await page.$eval('#plusmenu',e=>e.hidden));
// barra superior: buscador y Exportar a la derecha
const sb=await box('#cmdbtn'), ex=await box('#stl');
check('Barra superior: buscador y Exportar a la derecha',sb.x>500&&ex.x>900);
// con una pieza elegida: medidas en el inspector, barra de vista y pie de estado
check('Medidas visibles con una pieza elegida',await vis('#dx'));
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
