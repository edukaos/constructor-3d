// La app no pide nada a internet: librerías, motor y tipografías salen del propio sitio
import {open,check,summary,exportStl} from './lib.mjs';
import {chromium} from 'playwright';
const {browser,page,errs}=await open();
const external=[];
page.on('request',r=>{const u=new URL(r.url()); if(u.hostname!=='127.0.0.1'&&u.protocol!=='data:'&&u.protocol!=='blob:')external.push(r.url());});
await page.reload(); await page.waitForTimeout(2000);
await page.click('#pnew'); await page.waitForTimeout(200);
await page.keyboard.press('1'); await page.waitForTimeout(300);
await page.click('#textbtn'); await page.fill('#tstr','Hola'); await page.click('#tadd'); await page.waitForTimeout(2500);
check('Texto 3D se arma sin internet',await page.evaluate(()=>objs.length)===2);
await page.evaluate(()=>{select([objs[0]]);}); await page.click('#fitbtn').catch(()=>{}); 
check('Ninguna petición a otro servidor',external.length===0,external.slice(0,3).join(' | '));
check('Sin errores',errs.length===0,errs.join('|'));
summary(); await browser.close();
