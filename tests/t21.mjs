// Plano de trabajo: elegir una cara (de arriba o de costado) y que la pieza nueva se apoye sobre ella
import {open,check,summary,screenOf} from './lib.mjs';
const {browser,page,errs}=await open();
const st=()=>page.evaluate(()=>{const o=objs[objs.length-1], b=bbox(o); return {min:b.min.toArray(),max:b.max.toArray(),n:objs.length};});
const r1=v=>Math.round(v*10)/10;
await page.click('#pnew'); await page.waitForTimeout(200);
check('Botón Cama desactivado sin plano',await page.$eval('#wpoff',b=>b.disabled));
await page.keyboard.press('1'); await page.waitForTimeout(150);   // cubo 25 mm en el centro
// cara de arriba del cubo
await page.click('#wpbtn'); check('Herramienta Plano activa',await page.$eval('#wpbtn',b=>b.classList.contains('on')));
let s=await screenOf(page,[0,25,0]); await page.mouse.click(s.x,s.y); await page.waitForTimeout(200);
check('Plano creado sobre la tapa',await page.evaluate(()=>!!wp&&Math.abs(wp.n.y-1)<1e-3&&Math.abs(wp.o.y-25)<1e-3));
check('Botón Cama activo con plano',!(await page.$eval('#wpoff',b=>b.disabled)));
await page.keyboard.press('1'); await page.waitForTimeout(150);
let b=await st(); check('Cubo nuevo apoyado arriba del primero (base a 25 mm)',Math.abs(b.min[1]-25)<0.05&&Math.abs(b.max[1]-50)<0.05,JSON.stringify(b.min.map(r1)));
// cara del costado (+X) del primer cubo
await page.evaluate(()=>{select([]);}); await page.click('#wpbtn');
s=await screenOf(page,[12.5,12.5,0]); await page.mouse.click(s.x,s.y); await page.waitForTimeout(200);
check('Plano sobre la cara de costado (normal +X)',await page.evaluate(()=>!!wp&&Math.abs(wp.n.x-1)<1e-3));
await page.keyboard.press('2'); await page.waitForTimeout(150);   // esfera 25 mm
b=await st(); check('Esfera apoyada contra el costado (x de 12,5 a 37,5)',Math.abs(b.min[0]-12.5)<0.2&&Math.abs(b.max[0]-37.5)<0.2,JSON.stringify([b.min[0],b.max[0]].map(r1)));
// volver a la cama
await page.click('#wpoff'); await page.waitForTimeout(100);
check('Cama: se quita el plano',await page.evaluate(()=>wp===null));
await page.keyboard.press('1'); await page.waitForTimeout(150);
b=await st(); check('Pieza nueva otra vez sobre la cama',Math.abs(b.min[1])<0.05,JSON.stringify(b.min.map(r1)));
// tocar el vacío vuelve a la cama; nuevo proyecto también
await page.click('#wpbtn'); s=await screenOf(page,[0,25,0]); await page.mouse.click(s.x,s.y); await page.waitForTimeout(100);
await page.click('#pnew'); await page.waitForTimeout(200); const d=await page.$('#dgo'); if(d&&await d.isVisible())await d.click(); await page.waitForTimeout(150);
check('Proyecto nuevo vuelve a la cama',await page.evaluate(()=>wp===null));
check('Sin errores',errs.length===0,errs.join('|'));
summary(); await browser.close();
