import {open,check,summary,screenOf,clk} from './lib.mjs';
const {browser,page,errs}=await open();
await clk(page,'[data-add=box]'); await page.waitForTimeout(400);
await page.click('[data-mode=scale]'); await page.waitForTimeout(300);
await page.click('#dx'); await page.fill('#dx','30'); await page.waitForTimeout(300);   // el foco queda en el campo
// esquina de abajo con Shift (crece parejo): se ven las tres cotas mientras se arrastra
const p=await screenOf(page,[15,0,12.5]), p2=await screenOf(page,[25,0,22]);
await page.keyboard.down('Shift'); await page.mouse.move(p.x,p.y); await page.mouse.down(); await page.mouse.move(p2.x,p2.y,{steps:8}); await page.waitForTimeout(150);
const cot=await page.evaluate(()=>['#cx','#cy','#cz'].map(i=>document.querySelector(i).textContent));
await page.mouse.up(); await page.keyboard.up('Shift'); await page.waitForTimeout(400);
const dx=await page.inputValue('#dx'), dy=await page.inputValue('#dy'), dz=await page.inputValue('#dz');
console.log({dx,dy,dz,cot});
const f=t=>parseFloat(t.replace(',','.'));
check('Panel y cotas coinciden en X',Math.abs(parseFloat(dx)-f(cot[0]))<0.06,dx+' vs '+cot[0]);
check('Panel y cotas coinciden en Y',Math.abs(parseFloat(dy)-f(cot[1]))<0.06,dy+' vs '+cot[1]);
check('Panel y cotas coinciden en Z',Math.abs(parseFloat(dz)-f(cot[2]))<0.06,dz+' vs '+cot[2]);
summary(); await browser.close();
