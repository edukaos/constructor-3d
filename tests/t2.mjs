import {open,check,msg,saveProj,clickObj,summary,screenOf} from './lib.mjs';
const {browser,page,errs}=await open();
const cnt=async()=> (await saveProj(page)).objs.length;
const set=async(id,v)=>{await page.fill('#'+id,String(v)); await page.waitForTimeout(80);};
async function fresh(){ await page.click('#pnew'); await page.waitForTimeout(200); }
async function addAt(key,x,z){ await page.keyboard.press(key); await page.waitForTimeout(150); await set('px',x); await set('pz',z); await page.evaluate(()=>document.activeElement&&document.activeElement.blur()); }
async function sel(pos,shift){ await clickObj(page,pos,{shift}); }

// 1. UNIR
await fresh(); await addAt('1',-10,0); await addAt('2',8,0);
await sel([-18,12.5,0]); await sel([16,12.5,0],true);
check('Unir: 2 seleccionados',/2 objetos/.test(await msg(page)),await msg(page));
await page.click('[data-op=union]'); await page.waitForTimeout(500);
check('Unir: resultado',/Listo\. Resultado: Unir/.test(await msg(page)),await msg(page));
check('Unir: 2→1 objeto',await cnt()===1);
// 2. DESHACER / REHACER
await page.keyboard.press('Control+z'); await page.waitForTimeout(200);
check('Ctrl+Z deshace la unión (vuelven 2)',await cnt()===2);
await page.keyboard.press('Control+y'); await page.waitForTimeout(200);
check('Ctrl+Y rehace (1)',await cnt()===1);
// 3. RESTAR con un solo seleccionado
await fresh(); await addAt('1',-10,0); await addAt('2',8,0);
await sel([16,12.5,0]);   // esfera = la que corta
await page.click('[data-op=subtract]'); await page.waitForTimeout(500);
check('Restar (solo uno seleccionado)',/Listo\. Resultado: Restar/.test(await msg(page)),await msg(page));
check('Restar: queda 1 objeto',await cnt()===1);
// 4. INTERSECTAR
await fresh(); await addAt('1',-10,0); await addAt('2',8,0);
await sel([-18,12.5,0]); await sel([16,12.5,0],true);
await page.click('[data-op=intersect]'); await page.waitForTimeout(500);
check('Intersectar: resultado',/Listo\. Resultado: Intersectar/.test(await msg(page)),await msg(page));
check('Intersectar: queda 1',await cnt()===1);
// 5. DIVIDIR
await fresh(); await page.keyboard.press('1'); await page.waitForTimeout(200);
await set('px',0); await set('pz',0); await page.evaluate(()=>document.activeElement&&document.activeElement.blur());
await sel([0,12.5,0]);
await page.click('#dividir'); await page.waitForTimeout(200);
check('Dividir: aparece panel',await page.$eval('#splitp',e=>!e.hidden));
await page.click('#sapply'); await page.waitForTimeout(600);
check('Dividir: 1→2 piezas',await cnt()===2,await msg(page));
check('Dividir: panel se cierra',await page.$eval('#splitp',e=>e.hidden));
console.log('errores:',errs);
summary(); await browser.close();
