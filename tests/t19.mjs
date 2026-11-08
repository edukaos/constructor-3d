import {open,check,summary,exportStl} from './lib.mjs';
const {browser,page,errs}=await open();
await page.setViewportSize({width:1366,height:800});
async function reset(){ await page.click('#pnew'); await page.waitForTimeout(250); const d=await page.$('#dgo'); if(d&&await d.isVisible())await d.click(); await page.waitForTimeout(150);}
const info=()=>page.textContent('#rndinfo');
const setv=(id,v)=>page.evaluate(([id,v])=>{const i=document.querySelector(id); i.value=v; i.dispatchEvent(new Event('input',{bubbles:true}));},[id,v]);
async function waitDone(){ await page.waitForFunction(()=>/Cambio de volumen|demasiado|No se pudo/.test(document.querySelector('#rndinfo').textContent),null,{timeout:60000}); }
await reset(); await page.click('[data-add=box]'); await page.waitForTimeout(300);
await page.click('#rndbtn'); const t0=Date.now(); await waitDone(); console.log('box r=2 ms',Date.now()-t0,await info());
check('Redondeo exterior reduce el volumen un poco',/-\d/.test(await info())&&!/-(\d{2,})%/.test(await info()),await info());
await setv('#rndr',4); await page.waitForTimeout(500); await waitDone(); const tx=await info(); console.log(tx);
await page.screenshot({path:'/tmp/Q1.png'});
await page.selectOption('#rndk','chamfer'); await page.waitForTimeout(500); await waitDone(); console.log('chaflán',await info());
await page.selectOption('#rndk','round');
await setv('#rndr',4); await page.waitForTimeout(600); await waitDone();
await page.click('#rndgo'); await page.waitForTimeout(1500);
const st=await exportStl(page); console.log(st.vol,st.tris,st.openEdges); check('Aplicado: sólido cerrado con volumen menor',st.openEdges===0&&st.vol<15625&&st.vol>14000,st.vol+' '+st.openEdges); await page.keyboard.press('Escape');
// interiores sobre una L
await reset(); await page.click('#shpbtn'); await page.click('#shpgrid button[data-id=lper]'); await page.waitForTimeout(300); await page.click('#shpp [data-close]');
await page.click('#rndbtn'); await page.selectOption('#rndw','in'); await setv('#rndr',2); await page.waitForTimeout(500); await waitDone(); console.log('L interior',await info());
check('Interior (rincón) agrega volumen',/\+\d/.test(await info()),await info());
await page.selectOption('#rndw','both'); await page.waitForTimeout(500); await waitDone(); console.log('L ambas',await info());
// engranaje: complejo -> manual
await page.click('#rndp [data-close]'); await reset(); await page.click('#shpbtn'); await page.click('#shpgrid button[data-id=gear]'); await page.waitForTimeout(300); await page.click('#shpp [data-close]');
await page.click('#rndbtn'); await page.waitForFunction(()=>/tocá "Calcular/.test(document.querySelector('#rndinfo').textContent),null,{timeout:20000}); check('Pieza compleja pide cálculo manual',await page.isVisible('#rndcalc'));
const ok0=await page.evaluate(()=>1); await page.click('#rndp [data-close]'); await page.waitForTimeout(300);
const st2=await exportStl(page); check('Cerrar sin calcular deja el engranaje',st2.vol>2000&&st2.vol<3500,st2.vol);
check('Sin errores',errs.length===0,JSON.stringify(errs)); summary(); await browser.close();
