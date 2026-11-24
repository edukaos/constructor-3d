// Panel Sketch: si se guardó una posición vieja (más abajo que la pantalla), al abrir queda entero dentro
import {open,check,summary} from './lib.mjs';
const {browser,page,errs}=await open();
await page.evaluate(()=>{localStorage.setItem('c3d_skpos',JSON.stringify([400,900]));});
await page.reload(); await page.waitForTimeout(800);
await page.click('#skbtn'); await page.waitForTimeout(400);
const r=await page.evaluate(()=>{const w=document.querySelector('#wrap').getBoundingClientRect(); const q=sk.bar.getBoundingClientRect(); return {bottom:q.bottom, wrapBottom:w.bottom, top:q.top};});
check('El panel Sketch queda dentro de la pantalla aunque se haya guardado más abajo',r.bottom<=r.wrapBottom+1,JSON.stringify(r));
check('Sin errores',errs.length===0,errs.join('|'));
summary(); await browser.close();
