import {open,check,summary,screenOf,clk} from './lib.mjs';
const {browser,page,errs}=await open();
await clk(page,'[data-add=box]'); await page.waitForTimeout(400);
await page.click('[data-mode=scale]'); await page.waitForTimeout(300);
await page.click('#dx'); await page.fill('#dx','30'); await page.waitForTimeout(300);   // el foco queda en el campo
const p=await screenOf(page,[15,25,12.5]);
await page.mouse.move(p.x,p.y); await page.mouse.down(); await page.mouse.move(p.x+90,p.y-60,{steps:8}); await page.mouse.up(); await page.waitForTimeout(400);
const dx=await page.inputValue('#dx'), dy=await page.inputValue('#dy'), dz=await page.inputValue('#dz');
const cot=await page.evaluate(()=>['#cx','#cy','#cz'].map(i=>document.querySelector(i).textContent));
console.log({dx,dy,dz,cot});
const f=t=>parseFloat(t.replace(',','.'));
check('Panel y cotas coinciden en X',Math.abs(parseFloat(dx)-f(cot[0]))<0.06,dx+' vs '+cot[0]);
check('Panel y cotas coinciden en Y',Math.abs(parseFloat(dy)-f(cot[1]))<0.06,dy+' vs '+cot[1]);
check('Panel y cotas coinciden en Z',Math.abs(parseFloat(dz)-f(cot[2]))<0.06,dz+' vs '+cot[2]);
summary(); await browser.close();
