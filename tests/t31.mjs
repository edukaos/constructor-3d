// Grabado: un clic fuera de la pieza cancela la ubicación y el visor vuelve a responder
import {open,check,summary} from './lib.mjs';
const {browser,page,errs}=await open();
await page.click('#pnew'); await page.waitForTimeout(200);
await page.keyboard.press('1'); await page.waitForTimeout(100);
await page.click('#textbtn'); await page.waitForTimeout(200);
await page.fill('#tstr','OK');
await page.evaluate(()=>{select([objs[0]]);});
const n0=await page.evaluate(()=>objs.length);
await page.click('#tgrab'); await page.waitForTimeout(800);
// clic en un punto vacío del visor (lejos del cubo)
await page.mouse.click(300,650); await page.waitForTimeout(300);
check('Clic fuera de la pieza cancela el grabado',await page.evaluate(()=>objs.length)===n0,'');
check('El botón vuelve a Grabar en la pieza',(await page.textContent('#tgrab')).includes('Grabar'),'');
// el visor responde: un clic sobre el cubo lo selecciona
const c=await page.evaluate(()=>{const r=canvas.getBoundingClientRect(); const v=objs[0].position.clone().project(cam); return {x:r.left+(v.x+1)/2*r.width,y:r.top+(1-v.y)/2*r.height};});
await page.mouse.click(c.x,c.y); await page.waitForTimeout(200);
check('Después se puede seleccionar otra pieza con el mouse',await page.evaluate(()=>sel.length===1&&sel[0]===objs[0]),'');
check('Sin errores',errs.length===0,errs.join('|'));
summary(); await browser.close();
