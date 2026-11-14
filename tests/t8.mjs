import {open,check,msg,exportStl,summary,clk} from './lib.mjs';
import fs from 'fs';
const {browser,page,errs}=await open();
const near=(a,b,tol)=>Math.abs(a-b)<=tol;
async function reset(){ await page.evaluate(()=>{}); await page.click('#pnew'); await page.waitForTimeout(300); const d=await page.$('#dgo'); if(d&&await d.isVisible())await d.click(); await page.waitForTimeout(200);}
async function fresh(shape){ await reset(); if(shape)await clk(page,`[data-add=${shape}]`); await page.waitForTimeout(200);}
// --- Vaciar cubo
await fresh('box');
await page.click('#shellbtn'); await page.fill('#shellt','2'); await page.click('#shellgo'); await page.waitForTimeout(1500);
let st=await exportStl(page);
check('Vaciar cubo: volumen ≈ 6364',near(st.vol,6364,60),JSON.stringify({vol:st.vol,open:st.openEdges})); check('Vaciar cubo: cerrado',st.openEdges===0);
console.log(await msg(page));
// abierto arriba
await fresh('box'); await page.click('#shellbtn'); await page.check('#shello'); await page.click('#shellgo'); await page.waitForTimeout(1500);
st=await exportStl(page); check('Vaciar abierto arriba: volumen ≈ 5482',near(st.vol,5482,80),JSON.stringify({vol:st.vol,open:st.openEdges})); check('Vaciar abierto: cerrado',st.openEdges===0);
// esfera
await fresh('sphere'); await page.click('#shellbtn'); await page.uncheck('#shello'); await page.click('#shellgo'); await page.waitForTimeout(2000);
st=await exportStl(page); const sv=4/3*Math.PI*(12.5**3-10.5**3); check('Vaciar esfera ≈ vol',near(st.vol,sv,sv*0.08),JSON.stringify({vol:st.vol,esp:sv,open:st.openEdges})); check('Vaciar esfera cerrada',st.openEdges===0);
// grosor excesivo
await fresh('box'); await page.click('#shellbtn'); await page.fill('#shellt','20'); await page.click('#shellgo'); await page.waitForTimeout(800);
check('Grosor excesivo avisa',/demasiado grande|No se pudo/.test(await msg(page)),await msg(page));
// --- SVG
fs.writeFileSync('/tmp/t.svg','<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M10 10 H90 V90 H10Z M30 30 V70 H70 V30Z"/></svg>');
await fresh(null); await page.click('#del').catch(()=>{});
await fresh(null);
await clk(page,'#svgbtn'); await page.setInputFiles('#svgfile','/tmp/t.svg'); await page.waitForTimeout(200); await page.fill('#svgw','40'); await page.fill('#svgd','3'); await page.click('#svgadd'); await page.waitForTimeout(1200);
console.log(await msg(page));
// borrar el cubo inicial para medir solo SVG
await page.evaluate(()=>{}); 
st=await exportStl(page); check('SVG agregado (vol total incluye cubo inicial)',near(st.vol,3600,20),JSON.stringify({vol:st.vol}));
check('SVG cerrado',st.openEdges===0);
// --- Cortar
await fresh('box');
await clk(page,'#bedbtn'); await page.selectOption('#bpre','200x200'); await page.click('#bclose');
await page.click('#dmore').catch(()=>{});
await page.fill('#dx','300'); await page.dispatchEvent('#dx','change'); await page.waitForTimeout(300);
await page.click('#fitbtn'); await page.waitForTimeout(200);
check('Auto calcula 2 partes en X',(await page.inputValue('#fitnx'))==='2',await page.textContent('#fitinfo'));
await page.uncheck('#fitpeg'); await page.click('#fitgo'); await page.waitForTimeout(1500);
st=await exportStl(page); check('Cortar sin espigas: vol 187500',near(st.vol,187500,200),JSON.stringify({vol:st.vol,open:st.openEdges})); check('Cortar sin espigas cerrado',st.openEdges===0);
console.log(await msg(page));
await fresh('box'); await page.fill('#dx','300'); await page.dispatchEvent('#dx','change'); await page.waitForTimeout(300);
await page.click('#fitbtn'); await page.check('#fitpeg'); await page.click('#fitgo'); await page.waitForTimeout(2500);
st=await exportStl(page); check('Cortar con espigas: vol cercano',near(st.vol,187500,1500),JSON.stringify({vol:st.vol,open:st.openEdges})); check('Cortar con espigas cerrado',st.openEdges===0);
console.log(await msg(page));
// --- OBJ
fs.writeFileSync('/tmp/c.obj','v 0 0 0\nv 10 0 0\nv 10 10 0\nv 0 10 0\nv 0 0 10\nv 10 0 10\nv 10 10 10\nv 0 10 10\nf 1 3 2\nf 1 4 3\nf 5 6 7\nf 5 7 8\nf 1 2 6\nf 1 6 5\nf 2 3 7\nf 2 7 6\nf 3 4 8\nf 3 8 7\nf 4 1 5\nf 4 5 8\n');
await fresh(null); await page.setInputFiles('#file','/tmp/c.obj'); await page.waitForTimeout(1500);
console.log(await msg(page)); check('Importa OBJ',/Importado: c.obj/.test(await msg(page)));
// --- 3MF roundtrip
await fresh('box'); await page.click('#stl'); 
const [dl]=await Promise.all([page.waitForEvent('download',{timeout:15000}),page.click('#ex3')]); const p3=await dl.path(); fs.copyFileSync(p3,'/tmp/r.3mf'); console.log(dl.suggestedFilename());
await page.waitForTimeout(300);
await fresh(null); await page.setInputFiles('#file','/tmp/r.3mf'); await page.waitForTimeout(2000);
console.log(await msg(page)); check('Importa 3MF',/Importado: r.3mf/.test(await msg(page)));
// --- Paleta
await page.click('#dmore').catch(()=>{}); 
const before=await page.inputValue('#col'); await page.click('.pal button.sw:nth-child(6)'); const after=await page.inputValue('#col'); check('Paleta cambia color',before!==after&&after==='#e5484d',before+'→'+after);
// --- Regla / imán
await clk(page,'#bedbtn'); await page.check('#rulerchk'); await page.selectOption('#snapstep','5'); await page.click('#snap'); await page.waitForTimeout(200);
check('Regla y snap sin errores',errs.length===0,errs.join(' | ')); console.log(await msg(page));
await page.screenshot({path:'/tmp/s8.png'});
summary(); console.log(errs); await browser.close();
