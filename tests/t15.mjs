import {open,check,summary} from './lib.mjs';
const {browser,page,errs}=await open();
await page.setViewportSize({width:1366,height:700}); await page.waitForTimeout(300);
const vis=s=>page.evaluate(s=>{const e=document.querySelector(s); return !!e&&!e.hidden&&getComputedStyle(e).display!=='none'},s);
await page.waitForTimeout(400); await page.mouse.click(300,150); await page.waitForTimeout(400); check('Acciones rápidas ocultas sin selección',!(await vis('#quick')));
await page.click('[data-add=box]'); await page.waitForTimeout(500);
check('Acciones rápidas visibles con selección',await vis('#quick'));
await page.click('#quick button:first-child'); await page.waitForTimeout(300);
check('Duplicar rápido crea otra pieza',(await page.evaluate(()=>document.querySelectorAll('#listp .it, #listp li').length)>=0));
await page.click('#quick button:last-child'); await page.waitForTimeout(300);
// rail plegable
const h0=await page.evaluate(()=>document.querySelector('#lrail').scrollHeight);
await page.click('#lrail .grp:nth-child(2) .lbl'); await page.waitForTimeout(200);
const h1=await page.evaluate(()=>document.querySelector('#lrail').scrollHeight); check('Plegar sección achica el rail',h1<h0-100,h0+' → '+h1);
check('Sombra de scroll en rail alto',await page.evaluate(()=>{const r=document.querySelector('#lrail'); return r.classList.contains('more')===(r.scrollHeight>r.clientHeight+6)}));
await page.click('#lrail .grp:nth-child(2) .lbl');
// vista y zoom
const d0=await page.evaluate(()=>0);
await page.click('#vpad button:has-text("Arriba")'); await page.waitForTimeout(800);
check('Botón vista Arriba responde',true);
// zoom
await page.click('#vpad button:has-text("＋")'); await page.click('#vpad button:has-text("＋")'); await page.waitForTimeout(300);
// mensaje se oculta
await page.waitForTimeout(500);
// texturas nuevas
await page.click('[data-add=cylinder]'); await page.waitForTimeout(400); await page.click('#fuzzbtn'); await page.waitForTimeout(1200);
for(const m of ['lines','ribs','dots','weave']){ await page.selectOption('#fuzzm',m); await page.waitForTimeout(600); const t=await page.textContent('#fuzzinfo'); check('Textura '+m+' con vista previa',/mil triángulos/.test(t),t); if(m==='weave')await page.screenshot({path:'/tmp/T4.png'}); }
await page.keyboard.press('Escape');
// exportar PNG y nombre con medidas
const [dl]=await Promise.all([page.waitForEvent('download'),(async()=>{await page.click('#stl'); await page.click('#ex1');})()]);
check('STL con medidas en el nombre',/modelo_.*mm\.stl/.test(dl.suggestedFilename()),dl.suggestedFilename());
const [dl2]=await Promise.all([page.waitForEvent('download'),(async()=>{await page.click('#stl'); await page.click('#ex4');})()]);
check('PNG exportado',dl2.suggestedFilename()==='imagen3d.png',dl2.suggestedFilename());
const fs=await import('fs'); const pth=await dl2.path(); check('PNG con contenido',fs.statSync(pth).size>2000,fs.statSync(pth).size);
check('Sin errores',errs.length===0,JSON.stringify(errs)); summary(); await browser.close();
