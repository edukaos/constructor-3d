// Selección múltiple como en Tinkercad: rectángulo, mover/girar/escalar/subir juntas, flechas, Ctrl+D y repetir, Alt+arrastrar, Ctrl+A, cámara con el botón derecho
import {open,screenOf,check,results} from './lib.mjs';
const {browser,page,errs}=await open();
const add=async(t,x)=>{await page.click('[data-add='+t+']'); await page.waitForTimeout(250);
  await page.evaluate(x=>{const b=document.getElementById('placeok'); if(b&&!document.getElementById('placebar').hidden)b.click(); sel[0].position.x=x; updateDims(); commit();},x);};
await page.evaluate(()=>{objs.slice().forEach(o=>scene.remove(o)); objs.length=0; select([]); commit();});
await add('box',-30); await add('box',30); await page.evaluate(()=>select([]));
await page.waitForTimeout(200);
const P=()=>page.evaluate(()=>objs.map(o=>[+o.position.x.toFixed(1),+o.position.y.toFixed(1),+o.position.z.toFixed(1)]));
const A=await screenOf(page,[-30,12.5,0]), B=await screenOf(page,[30,12.5,0]);
// rectángulo desde vacío
const c=await page.$eval('#c',c=>{const b=c.getBoundingClientRect();return b;});
await page.mouse.move(300,600); await page.mouse.down(); await page.mouse.move(1000,150,{steps:10}); await page.mouse.up();
check('Rectángulo desde vacío elige las 2',await page.evaluate(()=>sel.length)===2);
// clic vacío deselecciona
await page.mouse.click(300,600); check('Clic en vacío suelta la selección',await page.evaluate(()=>sel.length)===0);
// shift+clic, arrastrar juntas
await page.mouse.click(A.x,A.y); await page.keyboard.down('Shift'); await page.mouse.click(B.x,B.y); await page.keyboard.up('Shift');
await page.mouse.move(A.x,A.y); await page.mouse.down(); await page.mouse.move(A.x+60,A.y+10,{steps:10}); await page.mouse.up();
let p=await P(); check('Arrastrar mueve las dos juntas',Math.abs((p[1][0]-p[0][0])-60)<0.01&&p[0][0]!==-30,JSON.stringify(p));
// flechas
let p0=await P(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('Shift+ArrowUp'); await page.keyboard.press('Control+ArrowUp');
p=await P(); check('Flechas mueven las dos',p.every((q,i)=>Math.abs(Math.hypot(q[0]-p0[i][0],q[2]-p0[i][2])-Math.hypot(1,10))<0.01&&Math.abs(q[1]-p0[i][1]-1)<0.01),JSON.stringify([p0,p]));
const h0=await page.evaluate(()=>hist.length);
// duplicar las dos
await page.keyboard.press('Control+d'); await page.waitForTimeout(100);
check('Ctrl+D duplica las dos en el mismo lugar',await page.evaluate(()=>objs.length===4&&sel.length===2&&objs[2].position.equals(objs[0].position)));
await page.keyboard.press('Shift+ArrowRight'); await page.keyboard.press('Shift+ArrowRight');
await page.keyboard.press('Control+d'); await page.waitForTimeout(100);
const dd=await page.evaluate(()=>{const v=(a,b)=>b.position.clone().sub(a.position); const d1=v(objs[0],objs[2]), d2=v(objs[2],objs[4]); return [d1.toArray(),d2.toArray(),objs.length];});
check('Duplicar y repetir',dd[2]===6&&dd[0].every((x,i)=>Math.abs(x-dd[1][i])<1e-6)&&Math.abs(Math.hypot(...dd[0])-20)<1e-6,JSON.stringify(dd));
// modo Mover con gizmo: tc en el pivote
await page.keyboard.press('m');
check('Mover (M) con 2: gizmo en el centro del conjunto',await page.evaluate(()=>tc.object===selPivot));
await page.evaluate(()=>{tc.dispatchEvent({type:'mouseDown'}); selPivot.position.x+=7; selPivot.updateMatrixWorld(true); tc.dispatchEvent({type:'objectChange'}); tc.dispatchEvent({type:'mouseUp'});});
p=await P(); check('Mover gizmo mueve ambas',Math.abs(p[4][0]-p[0][0]-47)<0.01&&Math.abs(p[5][0]-p[1][0]-47)<0.01,JSON.stringify(p));
await page.keyboard.press('v');
// Alt + arrastrar
await page.evaluate(()=>{objs.slice().forEach(o=>scene.remove(o)); objs.length=0; select([]); commit();});
await add('box',-30); await page.waitForTimeout(200);
await page.mouse.move(A.x,A.y); await page.keyboard.down('Alt'); await page.mouse.down(); await page.mouse.move(A.x+60,A.y,{steps:10}); await page.mouse.up(); await page.keyboard.up('Alt');
p=await P(); check('Alt+arrastrar deja el original y mueve la copia',p.length===2&&p[0][0]===-30&&p[1][0]>-30,JSON.stringify(p));
// Ctrl+A
await page.keyboard.press('Control+a'); check('Ctrl+A elige todo',await page.evaluate(()=>sel.length)===2);
// caja de escalar para 2 sueltas
check('Caja de escalar visible con 2 sueltas',await page.evaluate(()=>{updateScaleUI(); return sg.visible&&!!sgF&&sgF.grp&&sgF.grp.length===2;}));
check('Sin errores',errs.length===0,errs.join(' | '));
await browser.close();
{
const {browser,page,errs}=await open();
const add=async(t,x)=>{await page.click('[data-add='+t+']'); await page.waitForTimeout(250);
  await page.evaluate(x=>{const b=document.getElementById('placeok'); if(b&&!document.getElementById('placebar').hidden)b.click(); sel[0].position.x=x; updateDims(); commit();},x);};
await page.evaluate(()=>{objs.slice().forEach(o=>scene.remove(o)); objs.length=0; select([]); commit(); cam.position.set(200,170,270); orbit.update();});
await add('box',-30); await add('box',30); await page.keyboard.press('Control+a'); await page.waitForTimeout(300);
const scr=v=>page.evaluate(v=>{const p=new THREE.Vector3(...v).project(cam), r=canvas.getBoundingClientRect(); return {x:r.left+(p.x+1)/2*r.width,y:r.top+(1-p.y)/2*r.height};},v);
// manija de cara +X de la caja del conjunto
const w0=await page.evaluate(()=>groupBox().getSize(new THREE.Vector3()).x);
const h=await page.evaluate(()=>{const m=sh.find(h=>h.userData.face&&h.userData.s.x===1); return m.position.toArray();});
const H=await scr(h); await page.mouse.move(H.x,H.y); await page.mouse.down(); await page.mouse.move(H.x+60,H.y,{steps:8}); await page.mouse.up();
const w1=await page.evaluate(()=>groupBox().getSize(new THREE.Vector3()).x);
check('Escalar el conjunto con la manija X',w1>w0+5&&await page.evaluate(()=>sel.length)===2,w0.toFixed(1)+' → '+w1.toFixed(1));
await page.keyboard.press('Control+z'); await page.waitForTimeout(150); await page.keyboard.press('Control+a');
// rotar el conjunto con la flecha curva
const r=await page.evaluate(()=>{updateScaleUI(); return frRot[0].position.toArray();}); const R=await scr(r);
const q0=await page.evaluate(()=>objs.map(o=>o.position.toArray()));
await page.mouse.move(R.x,R.y); await page.mouse.down(); await page.mouse.move(R.x+80,R.y+40,{steps:8}); await page.mouse.up();
const q1=await page.evaluate(()=>objs.map(o=>o.position.toArray()));
check('Girar el conjunto mueve las dos alrededor del centro',JSON.stringify(q0)!==JSON.stringify(q1),JSON.stringify(q1.map(a=>a.map(v=>+v.toFixed(1)))));
// flecha de subir con 2
const u=await page.evaluate(()=>frArrow.position.toArray()); const U=await scr(u);
await page.mouse.move(U.x,U.y); await page.mouse.down(); await page.mouse.move(U.x,U.y-60,{steps:8}); await page.mouse.up();
check('Subir el conjunto con la flecha',await page.evaluate(()=>objs.every(o=>bbox(o).min.y>1)),await page.evaluate(()=>objs.map(o=>bbox(o).min.y.toFixed(1)).join(',')));
// botón derecho gira la cámara
const c0=await page.evaluate(()=>cam.position.toArray());
await page.mouse.move(200,650); await page.mouse.down({button:'right'}); await page.mouse.move(300,640,{steps:8}); await page.mouse.up({button:'right'}); await page.waitForTimeout(300);
const c1=await page.evaluate(()=>cam.position.toArray());
check('Botón derecho gira la cámara',JSON.stringify(c0)!==JSON.stringify(c1));
check('Girar con el derecho no abre el menú',await page.evaluate(()=>document.getElementById('ctxm').hidden));
await page.mouse.click(200,650,{button:'right'}); await page.waitForTimeout(150);
check('Clic derecho sin mover abre el menú',!(await page.evaluate(()=>document.getElementById('ctxm').hidden)));
check('Sin errores',errs.length===0,errs.join(' | '));
await browser.close();
}
console.log(results.every(r=>r.ok)?results.length+'\/'+results.length+' OK':'FALLAN');
