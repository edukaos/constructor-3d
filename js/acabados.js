'use strict';
// Constructor 3D: textura, dividir para la cama, importar, aspecto, acomodar, sección y estimar.
// Los scripts de js/ comparten el ámbito global y se cargan en orden desde index.html.
// ===== Revisión general: rail plegable, acciones rápidas, vistas y zoom =====
setTimeout(()=>{
  const rail=$('#lrail'); let fold={}; try{fold=JSON.parse(localStorage.getItem('c3d_fold')||'{}');}catch(e){}
  rail.querySelectorAll('.grp').forEach(g=>{const l=g.querySelector('.lbl'); if(!l)return; const k=l.textContent.trim();
    if(fold[k])g.classList.add('fold');
    l.addEventListener('click',()=>{if(innerWidth<=760)return; g.classList.toggle('fold'); fold[k]=g.classList.contains('fold'); try{localStorage.setItem('c3d_fold',JSON.stringify(fold));}catch(e){} hint();});});
  const hint=()=>rail.classList.toggle('more',innerWidth>760&&rail.scrollTop+rail.clientHeight<rail.scrollHeight-6);
  rail.addEventListener('scroll',hint); addEventListener('resize',hint); setInterval(hint,500); hint();
  setTimeout(()=>{const e=$('#msg'); if(e&&!msg.t)e.classList.add('off');},12000);
},0);
{
  const wrap=$('#wrap'), q=document.createElement('div'); q.id='quick'; q.hidden=true;
  for(const id of ['dup','del']){const src=$('#'+id), b=document.createElement('button'); b.type='button'; b.title=src.title; b.innerHTML=src.innerHTML; b.onclick=()=>src.click(); q.appendChild(b);}
  wrap.appendChild(q);
  let last=-1; setInterval(()=>{const n=sel.length; if(n!==last){last=n; q.hidden=!n;}},200);
}

// ===== Textura (fuzzy skin), con vista previa en vivo =====
$('#fuzzbtn').onclick=()=>openPanel('#fuzzp');
// 1) subdivide la malla hasta que las aristas midan como máximo "size" y calcula normales
function fuzzPrep(vp0,tv0,size,MAXT){
  const P=Array.from(vp0); let T=Array.from(tv0);
  for(let pass=0;pass<12;pass++){
    const mid=new Map(), out=[], s2=size*size; let any=false;
    const edge=(a,b)=>{const lo=a<b?a:b, hi=a<b?b:a, k=lo*4194304+hi; let m=mid.get(k);
      if(m===undefined){m=P.length/3; mid.set(k,m); P.push((P[a*3]+P[b*3])/2,(P[a*3+1]+P[b*3+1])/2,(P[a*3+2]+P[b*3+2])/2);} return m;};
    const L=(a,b)=>{const x=P[a*3]-P[b*3],y=P[a*3+1]-P[b*3+1],z=P[a*3+2]-P[b*3+2]; return x*x+y*y+z*z>s2;};
    for(let i=0;i<T.length;i+=3){
      let a=T[i],b=T[i+1],c=T[i+2], m0=L(a,b), m1=L(b,c), m2=L(c,a), n=m0+m1+m2;
      if(!n){out.push(a,b,c); continue;} any=true;
      if(n===3){const ab=edge(a,b),bc=edge(b,c),ca=edge(c,a); out.push(a,ab,ca, ab,b,bc, ca,bc,c, ab,bc,ca);}
      else{
        for(let r=0;r<3;r++){ if(n===1?m0:(m0&&m1)) break; const t=a; a=b; b=c; c=t; const q=m0; m0=m1; m1=m2; m2=q; }
        if(n===1){const ab=edge(a,b); out.push(a,ab,c, ab,b,c);}
        else{const ab=edge(a,b),bc=edge(b,c); out.push(a,ab,bc, a,bc,c, ab,b,bc);}
      }
    }
    T=out; if(!any)break; if(T.length/3>MAXT)return null;
  }
  const n=P.length/3, N=new Float32Array(n*3);
  for(let i=0;i<T.length;i+=3){
    const a=T[i]*3,b=T[i+1]*3,c=T[i+2]*3, ux=P[b]-P[a],uy=P[b+1]-P[a+1],uz=P[b+2]-P[a+2], wx=P[c]-P[a],wy=P[c+1]-P[a+1],wz=P[c+2]-P[a+2];
    const nx=uy*wz-uz*wy, ny=uz*wx-ux*wz, nz=ux*wy-uy*wx;
    for(const q of [a,b,c]){N[q]+=nx; N[q+1]+=ny; N[q+2]+=nz;}
  }
  for(let v=0;v<n;v++){const l=Math.hypot(N[v*3],N[v*3+1],N[v*3+2])||1; N[v*3]/=l; N[v*3+1]/=l; N[v*3+2]/=l;}
  return {P:Float32Array.from(P),T:new Uint32Array(T),N,n,size};
}
// 2) mueve cada vértice sobre su normal (rápido: se repite al mover los deslizadores)
const fzHash=(x,y,z)=>{let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^Math.imul(z|0,2147483647);
  h=Math.imul(h^(h>>>13),1274126177); h^=h>>>16; h=Math.imul(h,2246822519); h^=h>>>13; return (h>>>0)/4294967296;};
function fuzzShape(pr,amp,mode,walls,base,out){
  const {P,N,n,size}=pr, K=Math.PI*2/(size*4), sm=t=>t*t*(3-2*t), lerp=(a,b,t)=>a+(b-a)*t, F=size*2, H=fzHash;
  const vnoise=(x,y,z)=>{x/=F;y/=F;z/=F; const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z), fx=sm(x-ix),fy=sm(y-iy),fz=sm(z-iz);
    const g=(i,j,k)=>H(ix+i,iy+j,iz+k);
    return lerp(lerp(lerp(g(0,0,0),g(1,0,0),fx),lerp(g(0,1,0),g(1,1,0),fx),fy),lerp(lerp(g(0,0,1),g(1,0,1),fx),lerp(g(0,1,1),g(1,1,1),fx),fy),fz);};
  for(let v=0;v<n;v++){
    const x=P[v*3],y=P[v*3+1],z=P[v*3+2], nx=N[v*3],ny=N[v*3+1],nz=N[v*3+2];
    let w=1; if(walls){const t=(0.9-Math.abs(ny))/0.3; w=t<=0?0:t>=1?1:sm(t); if(y<0.05)w=0;}
    let r;
    if(mode==='smooth')r=vnoise(x,y,z);
    else if(mode==='lines')r=0.5+0.5*Math.sin(y*K);
    else if(mode==='ribs')r=0.5+0.5*Math.sin((x+z*0.37)*K)*Math.cos((z-x*0.37)*K*0.5);
    else if(mode==='dots')r=0.5+0.5*Math.sin(x*K)*Math.sin(y*K)*Math.sin(z*K);
    else if(mode==='weave')r=0.5+0.5*Math.sin((x+z)*K)*Math.sin(y*K+ (x-z)*K*0.3);
    else r=H(Math.round(x*1000),Math.round(y*1000),Math.round(z*1000));
    const d=(r-0.5)*amp*w; out[v*3]=x+nx*d; out[v*3+1]=y+base+ny*d; out[v*3+2]=z+nz*d;
  }
}
// 3) vista previa: una copia temporal (en coordenadas del mundo) reemplaza a la pieza mientras el panel está abierto
let fz=null, fzBusy=false, fzTimer=0, fzRaf=0;
const fzVals=()=>({amp:parseFloat($('#fuzza').value)||0.6, size:Math.max(0.2,parseFloat($('#fuzzs').value)||0.8), mode:$('#fuzzm').value, walls:$('#fuzzw').checked});
function fzStop(){
  clearTimeout(fzTimer); cancelAnimationFrame(fzRaf);
  if(fz){ if(fz.mesh){scene.remove(fz.mesh); fz.mesh.geometry.dispose();} fz.o.visible=!M_(fz.o).h; fz=null; }
}
async function fzStart(){
  if(fz||fzBusy||$('#fuzzp').hidden)return;
  const o=sel[sel.length-1]; if(!o)return; fzBusy=true;
  let A=null;
  try{
    await loadManifold(); if(!MF)return;
    A=toManifold(o); const mesh=A.getMesh(), np=mesh.numProp, src=mesh.vertProperties, n=src.length/np, vp=new Float32Array(n*3);
    if(!mesh.triVerts.length)return;
    const base=A.boundingBox().min[1];
    for(let i=0;i<n;i++){vp[i*3]=src[i*np]; vp[i*3+1]=src[i*np+1]-base; vp[i*3+2]=src[i*np+2];}
    if($('#fuzzp').hidden)return;
    fz={o,vp,tv:mesh.triVerts.slice(),base,prep:null,mesh:null,capped:false};
    fzUpdate(true);
  }catch(err){console.error(err);}
  finally{try{A&&A.delete();}catch(e){} fzBusy=false;}
}
function fzUpdate(rebuild){
  if(!fz)return; const v=fzVals();
  if(rebuild||!fz.prep||fz.prep.size!==v.size){
    const pr=fuzzPrep(fz.vp,fz.tv,v.size,300000);
    if(!pr){ fz.capped=true; $('#fuzzinfo').textContent='Grano demasiado fino para ver en vivo en esta pieza. Subí el tamaño del grano.'; return; }
    fz.capped=false; fz.prep=pr;
    if(fz.mesh){scene.remove(fz.mesh); fz.mesh.geometry.dispose();}
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(pr.n*3),3)); g.setIndex(new THREE.BufferAttribute(pr.T,1));
    const m=new THREE.Mesh(g,fz.o.material); m.raycast=()=>{}; m.castShadow=true; m.receiveShadow=true; m.frustumCulled=false; scene.add(m); fz.mesh=m; fz.o.visible=false;
  }
  if(!fz.prep)return;
  const g=fz.mesh.geometry, pa=g.attributes.position; fuzzShape(fz.prep,v.amp,v.mode,v.walls,fz.base,pa.array); pa.needsUpdate=true;
  g.computeVertexNormals(); g.computeBoundingSphere();
  $('#fuzzinfo').textContent=Math.round(fz.prep.T.length/3/1000)+' mil triángulos';
}
const fzSoon=()=>{cancelAnimationFrame(fzRaf); fzRaf=requestAnimationFrame(()=>fzUpdate(false));};
$('#fuzzs').addEventListener('input',()=>{clearTimeout(fzTimer); fzTimer=setTimeout(()=>fzUpdate(true),90);});
['#fuzza','#fuzzm','#fuzzw'].forEach(i=>$(i).addEventListener('input',fzSoon));
new MutationObserver(()=>{ if($('#fuzzp').hidden)fzStop(); else fzStart(); }).observe($('#fuzzp'),{attributes:true,attributeFilter:['hidden']});
setInterval(()=>{ if($('#fuzzp').hidden)return; const o=sel[sel.length-1]; if(fz&&fz.o!==o)fzStop(); if(!fz)fzStart(); },300);
async function makeFuzzy(){
  if(!fz&&!fzBusy)await fzStart();
  if(!fz||!fz.prep){msg(sel.length?'Esta pieza no se puede texturar con estos valores. Probá con un grano más grande.':'Elegí la pieza que querés texturar.'); return;}
  const o=fz.o; await busyOn('Texturando la pieza…');
  try{
    const v=fzVals(); let pr=fz.prep;
    if(pr.size!==v.size||fz.capped){pr=fuzzPrep(fz.vp,fz.tv,v.size,1500000); if(!pr){msg('Quedarían demasiados triángulos. Subí el tamaño del grano o texturá una pieza más chica.'); return;}}
    const pos=new Float32Array(pr.n*3); fuzzShape(pr,v.amp,v.mode,v.walls,fz.base,pos);
    const g=geoFromIndexed(pos,pr.T.slice()), m=new THREE.Mesh(g,o.material.clone()); m.material.emissive.setHex(0); recenter(m);
    m.userData.m={n:M_(o).n+' (textura)',h:false,l:false,k:!!M_(o).k};
    fzStop(); replacePiece(o,[m]); select([m]); commit(); $('#fuzzp').hidden=true;
    msg('Textura aplicada ('+Math.round(pr.T.length/3/1000)+' mil triángulos). Si no te gusta, deshacé con Ctrl+Z.');
  }catch(err){console.error(err); msg('No se pudo texturar esta pieza.');}
  finally{busyOff();}
}
$('#fuzzgo').onclick=makeFuzzy;
[['#fuzzs','#fuzzsv'],['#fuzza','#fuzzav']].forEach(([i,o])=>{const f=()=>{$(o).textContent=parseFloat($(i).value).toLocaleString('es-AR',{maximumFractionDigits:2})+' mm';}; $(i).addEventListener('input',f); f();});

// ===== Cortar para que entre en la cama, con espigas =====
$('#fitbtn').onclick=()=>{if(openPanel('#fitp'))fitAuto();};
function fitAuto(){
  const o=sel[sel.length-1], info=$('#fitinfo');
  if(!o){info.textContent='Elegí una pieza.'; return;}
  const b=bbox(o), sz=b.getSize(new THREE.Vector3()), L=$('#fitpeg').checked?Math.max(6,(parseFloat($('#fitpd').value)||5)*1.5):0;
  let nx=Math.max(1,Math.ceil(sz.x/Math.max(10,bed.w-4-L))), nz=Math.max(1,Math.ceil(sz.z/Math.max(10,bed.d-4-L))), fits=nx*nz===1;
  if(fits){ if(sz.x>=sz.z)nx=2; else nz=2; } // ya entra: igual se puede cortar en 2 para encastrar
  $('#fitnx').value=nx; $('#fitnz').value=nz;
  info.textContent='Pieza: '+sz.x.toFixed(0)+' × '+sz.z.toFixed(0)+' mm (ancho × fondo). Cama: '+bed.w+' × '+bed.d+' mm.'+(fits?' Ya entra en la cama, pero igual podés cortarla en partes con uniones: cambiá la cantidad de partes.':'');
}
$('#fitauto').onclick=fitAuto;
function cutAxis(M,axis,n,peg,pd,clr,owned,jt='peg'){
  // axis: 0 = X, 2 = Z. Devuelve n partes. owned recibe todo lo que hay que liberar
  // jt: 'peg' perno redondo, 'key' espiga y ranura, 'dove' cola de milano
  const out=[]; let rem=M; const r=pd/2, L=Math.max(6,pd*1.5);
  const bb=rem.boundingBox(), lo=bb.min[axis], step=(bb.max[axis]-lo)/n;
  const nrm=axis===0?[1,0,0]:[0,0,1];
  const own=m=>{owned.push(m); return m;};
  const cyl=(rad,len,c0,u,v)=>{ // cilindro a lo largo del eje, desde c0 hasta c0+len, en la posición (u,v) de los otros dos ejes
    let c=MF.Manifold.cylinder(len,rad,rad,32,false); owned.push(c);
    if(axis===0){const r2=c.rotate([0,90,0]); owned.push(r2); const t=r2.translate([c0,u,v]); owned.push(t); return t;}
    const t=c.translate([u,v,c0]); owned.push(t); return t;
  };
  // Prisma con perfil (a = a lo largo de la normal, b = ancho) extruido a lo largo de Y (largo sl) desde y0; wc = centro del ancho
  const prism=(poly,sl,y0,p,wc,grow)=>{
    let cs=new MF.CrossSection([poly],'NonZero'); owned.push(cs);
    if(grow>0){const o2=cs.offset(grow,'Miter',4); owned.push(o2); cs=o2;}
    const ex=cs.extrude(sl+2*grow); owned.push(ex);
    const M3=axis===0?[1,0,0, 0,0,-1, 0,1,0, p,y0-grow,wc]:[0,0,1, 1,0,0, 0,1,0, wc,y0-grow,p];
    const t=ex.transform([M3[0],M3[1],M3[2],0, M3[3],M3[4],M3[5],0, M3[6],M3[7],M3[8],0, M3[9],M3[10],M3[11],1]); owned.push(t); return t;
  };
  const yAx=1;
  for(let k=1;k<n;k++){
    const p=lo+step*k, parts=rem.splitByPlane(nrm,p); owned.push(...parts);
    const ba=parts[0].boundingBox(), bb2=parts[1].boundingBox();
    let low=ba.max[axis]<=bb2.max[axis]?parts[0]:parts[1], high=low===parts[0]?parts[1]:parts[0];
    if(low.isEmpty()||high.isEmpty()){rem=null; break;}
    if(peg){
      const b=rem.boundingBox(), oa=axis===0?[1,2]:[0,1];
      let lowP=low, highP=high;
      if(jt==='dove'){
        // Cola de milano: cuello angosto en el plano de corte y cabeza ancha; ranura abierta de arriba a abajo
        const w0=pd, w1=pd*1.7, Ld=Math.max(4,pd*1.1), y0=b.min[yAx]-1, sl=b.max[yAx]-b.min[yAx]+2;
        const wmin=b.min[axis===0?2:0], wmax=b.max[axis===0?2:0], span=wmax-wmin;
        const fr=span>pd*6?[0.3,0.7]:[0.5];
        for(const f of fr){
          const wc=wmin+span*f;
          const pinP=[[-1,-w0/2],[0,-w0/2],[Ld,-w1/2],[Ld,w1/2],[0,w0/2],[-1,w0/2]];
          const holeP=[[-0.1,-w0/2],[0,-w0/2],[Ld,-w1/2],[Ld,w1/2],[0,w0/2],[-0.1,w0/2]];
          const pr=prism(pinP,sl,y0,p,wc,0), pin=own(pr.intersect(rem));
          if(pin.isEmpty()||pin.volume()<0.2*pr.volume())continue;
          const hole=prism(holeP,sl,y0,p,wc,clr);
          lowP=own(lowP.add(pin)); highP=own(highP.subtract(hole));
        }
      }else{
        const mk=(grow,a0,a1)=>{
          if(jt==='key'){ // lengüeta rectangular: ancho 2*pd, espesor pd
            const bw=pd, th=pd; return {grow, make:(wc,yc)=>prism([[a0,-bw],[a1,-bw],[a1,bw],[a0,bw]],th,yc-th/2,p,wc,grow)};
          }
          return {grow, make:(wc,yc)=>null};
        };
        let pts=[];
        for(const wall of [1.5,0.8])if(!pts.length)for(const fu of [0.2,0.35,0.5,0.65,0.8])for(const fv of [0.2,0.35,0.5,0.65,0.8]){
          const u=b.min[oa[0]]+(b.max[oa[0]]-b.min[oa[0]])*fu, v=b.min[oa[1]]+(b.max[oa[1]]-b.min[oa[1]])*fv;
          const probe=jt==='key'?mk(wall+clr,-L,L).make(axis===0?v:u,axis===0?u:v):cyl(r+clr+wall,2*L,p-L,u,v), inter=probe.intersect(rem); owned.push(inter);
          if(inter.volume()>=0.999*probe.volume())pts.push([u,v]);
        }
        const pick=[]; if(pts.length){pick.push(pts[0]); while(pick.length<Math.min(4,pts.length)){let best=null,bd=-1; for(const q of pts){if(pick.includes(q))continue; const d=Math.min(...pick.map(a=>Math.hypot(a[0]-q[0],a[1]-q[1]))); if(d>bd){bd=d;best=q;}} pick.push(best);}}
        for(const [u,v] of pick){
          let pin,hole;
          if(jt==='key'){const wc=axis===0?v:u, yc=axis===0?u:v; pin=mk(0,-1,L).make(wc,yc); hole=mk(clr,-0.1,L+0.5).make(wc,yc);}
          else{pin=cyl(r,L+1,p-1,u,v); hole=cyl(r+clr,L+0.5,p-0.1,u,v);}
          lowP=lowP.add(pin); owned.push(lowP); highP=highP.subtract(hole); owned.push(highP);
        }
      }
      low=lowP; high=highP;
    }
    out.push(low); rem=high;
  }
  if(rem)out.push(rem);
  return out;
}
async function makeCut(){
  const o=sel[sel.length-1]; if(!o){msg('Elegí la pieza que querés cortar.'); return;}
  const nx=Math.max(1,Math.min(12,parseInt($('#fitnx').value)||1)), nz=Math.max(1,Math.min(12,parseInt($('#fitnz').value)||1));
  if(nx*nz===1){msg('Con 1 parte en cada eje no hay nada que cortar. Poné 2 o más en alguno.'); return;}
  const peg=$('#fitpeg').checked, jt=$('#fitjt').value, pd=Math.max(2,parseFloat($('#fitpd').value)||5), clr=Math.max(0,parseFloat($('#fitclr').value)||0);
  await busyOn('Cortando la pieza…');
  const owned=[];
  try{
    await loadManifold(); if(!needManifold())return;
    const A=toManifold(o); owned.push(A);
    const slabs=cutAxis(A,0,nx,peg,pd,clr,owned,jt); if(slabs.length<nx){msg('No se pudo cortar en X.'); return;}
    const cells=[]; // [ix][iz]
    for(const s of slabs){const c=cutAxis(s,2,nz,peg,pd,clr,owned,jt); if(c.length<nz){msg('No se pudo cortar en Z.'); return;} cells.push(c);}
    const meshes=[], gap=8, base=M_(o).n;
    cells.forEach((col,ix)=>col.forEach((cm,iz)=>{
      const m=new THREE.Mesh(fromManifold(cm),o.material.clone()); m.material.emissive.setHex(0); recenter(m);
      m.position.x+=(ix-(nx-1)/2)*gap; m.position.z+=(iz-(nz-1)/2)*gap;
      m.userData.m={n:base+' '+(nx>1?String.fromCharCode(65+ix):'')+(nz>1?(iz+1):''),h:false,l:false,k:!!M_(o).k};
      meshes.push(m);
    }));
    replacePiece(o,meshes); select(meshes); commit(); $('#fitp').hidden=true; fitPrevClear();
    msg('Pieza cortada en '+meshes.length+' partes'+(peg?(jt==='dove'?' con colas de milano':jt==='key'?' con espigas y ranuras':' con pernos y huecos de encastre'):'')+'. Usá Piezas para elegirlas y exportá una por archivo.');
  }catch(err){console.error(err); msg('No se pudo cortar esta pieza.');}
  finally{owned.forEach(x=>{try{x.delete();}catch(e){}}); busyOff();}
}
$('#fitgo').onclick=makeCut;

// Vista previa del corte: planos dorados translúcidos donde se va a cortar (se actualiza sola con las partes y la pieza elegida)
const fitPrev=new THREE.Group(); scene.add(fitPrev); let fitKey='';
function fitPrevClear(){while(fitPrev.children.length){const c=fitPrev.children.pop(); c.traverse(n=>{if(n.geometry)n.geometry.dispose(); if(n.material)n.material.dispose();});} fitKey='';}
function fitPreviewTick(){
  const o=sel[sel.length-1];
  if($('#fitp').hidden||!o||!o.visible){if(fitPrev.children.length)fitPrevClear(); return;}
  const nx=Math.max(1,Math.min(12,parseInt($('#fitnx').value)||1)), nz=Math.max(1,Math.min(12,parseInt($('#fitnz').value)||1));
  const b=bbox(o), key=o.uuid+'|'+nx+'|'+nz+'|'+b.min.toArray().map(v=>v.toFixed(2))+'|'+b.max.toArray().map(v=>v.toFixed(2));
  if(key===fitKey)return; fitPrevClear(); fitKey=key;
  const sz=b.getSize(new THREE.Vector3()), c=b.getCenter(new THREE.Vector3()), pad=4;
  const addPlane=(w,h,x,y,z,ry)=>{
    const g=new THREE.PlaneGeometry(w,h), m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:0xF5C451,transparent:true,opacity:0.2,side:THREE.DoubleSide,depthWrite:false}));
    const ln=new THREE.LineSegments(new THREE.EdgesGeometry(g),new THREE.LineBasicMaterial({color:0xF5C451}));
    const grp=new THREE.Group(); grp.add(m,ln); grp.position.set(x,y,z); grp.rotation.y=ry; grp.renderOrder=5; fitPrev.add(grp);
  };
  for(let k=1;k<nx;k++)addPlane(sz.z+pad*2,sz.y+pad*2,b.min.x+sz.x/nx*k,c.y,c.z,Math.PI/2);
  for(let k=1;k<nz;k++)addPlane(sz.x+pad*2,sz.y+pad*2,c.x,c.y,b.min.z+sz.z/nz*k,0);
}

// ===== Importar OBJ y 3MF =====
async function importModel(f,opts={}){
  try{
    await busyOn('Importando '+f.name+'…');
    const ext=f.name.split('.').pop().toLowerCase(), base=f.name.replace(/\.[^.]+$/,'');
    let root;
    if(ext==='glb'||ext==='gltf'){const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js'); const buf=ext==='glb'?await f.arrayBuffer():await f.text(); const gl=await new Promise((ok,no)=>new GLTFLoader().parse(buf,'',ok,no)); root=gl.scene;}
    else if(ext==='obj'){const {OBJLoader}=await import('three/addons/loaders/OBJLoader.js'); root=new OBJLoader().parse(await f.text());}
    else {const {ThreeMFLoader}=await import('three/addons/loaders/3MFLoader.js'); root=new ThreeMFLoader().parse(await f.arrayBuffer());}
    root.updateMatrixWorld(true);
    const found=[]; root.traverse(c=>{if(c.isMesh&&c.geometry&&c.geometry.attributes.position&&c.geometry.attributes.position.count>=3)found.push(c);});
    if(!found.length){msg('Ese archivo no tiene piezas para importar.'); return;}
    const geos=found.map(c=>{
      let g=c.geometry.clone(); g.applyMatrix4(c.matrixWorld);
      if(ext==='3mf')g.rotateX(-Math.PI/2);
      if(g.index)g=g.toNonIndexed();
      for(const k of Object.keys(g.attributes))if(k!=='position')g.deleteAttribute(k);
      g=toCreasedNormals(g,THREE.MathUtils.degToRad(opts.crease||30));
      g.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
      return g;
    });
    const box=new THREE.Box3(); geos.forEach(g=>{g.computeBoundingBox(); box.union(g.boundingBox);});
    if(opts.fit){const L0=Math.max(...box.getSize(new THREE.Vector3()).toArray()); if(L0>0){const k=opts.fit/L0; geos.forEach(g=>g.scale(k,k,k)); box.makeEmpty(); geos.forEach(g=>{g.computeBoundingBox(); box.union(g.boundingBox);});}}
    const c=box.getCenter(new THREE.Vector3()), sz=box.getSize(new THREE.Vector3());
    const metas=found.map((c0,i)=>{const mt=Array.isArray(c0.material)?c0.material[0]:c0.material; return {name:opts.name?(found.length>1?opts.name+' '+(i+1):opts.name):(c0.name||'').trim()||(found.length>1?base+' '+(i+1):base), color:ext==='3mf'&&mt&&mt.color?mt.color.getHex():null};});
    const added=[];
    geos.forEach((g,i)=>{
      g.translate(-c.x,-box.min.y,-c.z);
      const m=addMesh(g,new THREE.MeshStandardMaterial({color:metas[i].color??colors[ci++%colors.length],roughness:0.55,metalness:0.05}),metas[i].name); recenter(m); added.push(m);
    });
    select(added); updateDims();
    const L=Math.max(sz.x,sz.y,sz.z);
    if(L>40){orbit.target.set(0,sz.y/2,0); cam.position.set(L*1.4,L*1.1,L*1.6); cam.far=Math.max(1000,L*20); cam.updateProjectionMatrix(); if(ortho)setView(); grid.scale.setScalar(Math.max(10,Math.ceil(L/10)));}
    commit();
    msg('Importado: '+f.name+' ('+(added.length===1?'1 pieza':added.length+' piezas')+', '+sz.x.toFixed(1)+' × '+sz.y.toFixed(1)+' × '+sz.z.toFixed(1)+' mm).'+(ext==='obj'?' Si quedó acostado, rotalo con Rotar.':''));
  }catch(err){console.error(err); msg('No se pudo leer ese archivo '+f.name.split('.').pop().toUpperCase()+'.');}
  finally{busyOff();}
}

// ===== Aspecto: luz, reflejos, sombras, aristas, oclusión ambiental y materiales =====
const LOOK={q:'good',mat:'plastic',edges:true};
try{Object.assign(LOOK,JSON.parse(localStorage.getItem('c3d_look')||'{}'));}catch(e){}
if(LOOK.q==='max')LOOK.q='good';
const saveLook=()=>{try{localStorage.setItem('c3d_look',JSON.stringify(LOOK));}catch(e){}};
const MATS={plastic:{r:.55,m:.05,e:.6},matte:{r:.85,m:0,e:.35},glossy:{r:.22,m:.05,e:1}};
const fillL=new THREE.DirectionalLight(0xbcd4ff,0.5); fillL.position.set(60,30,30); scene.add(fillL);
const rimL=new THREE.DirectionalLight(0xffffff,0.45); rimL.position.set(-10,40,-90); scene.add(rimL);
scene.add(dl.target);
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
dl.shadow.mapSize.set(2048,2048); dl.shadow.bias=-0.0004; dl.shadow.normalBias=0.4;
const catcher=new THREE.Mesh(new THREE.PlaneGeometry(4000,4000),new THREE.ShadowMaterial({opacity:0.3,depthWrite:false}));
catcher.rotation.x=-Math.PI/2; catcher.position.y=-0.03; catcher.receiveShadow=true; catcher.renderOrder=-1; catcher.visible=false; scene.add(catcher);
let envTex=null;
import('three/addons/environments/RoomEnvironment.js').then(({RoomEnvironment})=>{const pm=new THREE.PMREMGenerator(renderer); envTex=pm.fromScene(new RoomEnvironment(),0.04).texture; pm.dispose();}).catch(()=>{});
const edgeMat=new THREE.LineBasicMaterial({color:0x0b0e14,transparent:true,opacity:0.5}), edgeLn=new WeakMap();
const clayM=new THREE.MeshStandardMaterial({color:0xd9d3c8,roughness:0.95,metalness:0,envMapIntensity:0.5}), claySel=clayM.clone(); claySel.emissive.setHex(0x5a4410);
let lookN=0, lookHeavy=false, lookWarned=false, lastQ='', lastEnv='', composer=null, compLoading=false, aoOn=false, bgTex=null, bgDark=null;
const effQ=()=>lookHeavy?'simple':LOOK.q;
function themeBg(){
  const dark=document.documentElement.dataset.theme!=='light';
  if(bgTex&&bgDark===dark)return bgTex;
  const c=document.createElement('canvas'); c.width=c.height=512; const x=c.getContext('2d'), g=x.createRadialGradient(256,180,10,256,200,420);
  const st=dark?['#1d2242','#0f1226','#080a16']:['#ffffff','#e9ecf1','#d3d8e1']; g.addColorStop(0,st[0]); g.addColorStop(.55,st[1]); g.addColorStop(1,st[2]); x.fillStyle=g; x.fillRect(0,0,512,512);
  if(bgTex)bgTex.dispose(); bgTex=new THREE.CanvasTexture(c); bgTex.colorSpace=THREE.SRGBColorSpace; bgDark=dark; return bgTex;
}
async function ensureComposer(){
  compLoading=true;
  try{
    const [A,B,C,D]=await Promise.all([import('three/addons/postprocessing/EffectComposer.js'),import('three/addons/postprocessing/RenderPass.js'),import('three/addons/postprocessing/GTAOPass.js'),import('three/addons/postprocessing/OutputPass.js')]);
    const w=wrap.clientWidth,h=wrap.clientHeight, c=new A.EffectComposer(renderer); c.setPixelRatio(renderer.getPixelRatio()); c.setSize(w,h);
    c.renderTarget1.samples=4; c.renderTarget2.samples=4;
    c.addPass(new B.RenderPass(scene,cam));
    const g=new C.GTAOPass(scene,cam,w,h); g.updateGtaoMaterial({radius:10,distanceExponent:1.2,thickness:3,scale:1.6,samples:16,distanceFallOff:1}); g.blendIntensity=1.25; g.updatePdMaterial({lumaPhi:10,depthPhi:2,normalPhi:3,radius:6,radiusExponent:1,rings:2,samples:16});
    // el cálculo de oclusión solo ve las piezas, no las guías, la grilla ni los marcadores
    const orig=g.render.bind(g); g.render=(...a)=>{const hid=[]; scene.children.forEach(ch=>{if(!objs.includes(ch)&&ch.visible){hid.push(ch); ch.visible=false;}}); try{orig(...a);}finally{hid.forEach(ch=>{ch.visible=true;});}};
    c.addPass(g); c.addPass(new D.OutputPass()); composer=c;
  }catch(e){console.warn('AO no disponible',e); LOOK.q='good'; saveLook(); syncLookUI(); msg('Este dispositivo no soporta la oclusión ambiental. Se usa el aspecto Mejor.');}
  compLoading=false;
}
const good0=()=>effQ()!=='simple';
function updateLook(){
  if(lookN++%30===0){
    let tri=0; objs.forEach(o=>{const g=o.geometry; tri+=(g.index?g.index.count:g.attributes.position.count)/3;});
    const h=tri>800000; if(h&&!lookHeavy&&!lookWarned&&LOOK.q!=='simple'){lookWarned=true; msg('Hay piezas muy pesadas: el aspecto se simplificó para que siga fluido.');} if(!h)lookWarned=false; lookHeavy=h;
    const box=new THREE.Box3(new THREE.Vector3(-bed.w/2,0,-bed.d/2),new THREE.Vector3(bed.w/2,40,bed.d/2)); objs.forEach(o=>{if(o.visible)box.union(new THREE.Box3().setFromObject(o));});
    const c=box.getCenter(new THREE.Vector3()), r=box.getSize(new THREE.Vector3()).length()/2+5, sc=dl.shadow.camera;
    if(Math.abs(sc.right-r)>1){sc.left=-r; sc.right=r; sc.top=r; sc.bottom=-r; sc.near=0.5; sc.far=r*6; sc.updateProjectionMatrix();}
    dl.target.position.copy(c); dl.target.updateMatrixWorld(); dl.position.copy(c).add(new THREE.Vector3(good0()?-6:5,10,good0()?5:7).normalize().multiplyScalar(r*2.5));
  }
  const q=effQ(), good=q!=='simple', mp=MATS[LOOK.mat]||MATS.plastic, wantEdges=LOOK.edges&&!lookHeavy;
  const envWant=good?envTex:null, envKey=good?(envTex?'e':'n'):'-';
  if(lastQ!==q||lastEnv!==envKey){
    lastQ=q; lastEnv=envKey; renderer.shadowMap.enabled=good; dl.castShadow=good; catcher.visible=good; fillL.visible=rimL.visible=good;
    hemi.intensity=good?0.45:1.1; dl.intensity=good?1.55:1.4; scene.environment=envWant; objs.forEach(o=>{o.material.needsUpdate=true;}); clayM.needsUpdate=claySel.needsUpdate=true;
  }
  const wantAO=q==='max'&&!lookHeavy; if(wantAO&&!composer&&!compLoading)ensureComposer();
  aoOn=wantAO&&!!composer; const bg=aoOn?themeBg():null; if(scene.background!==bg)scene.background=bg;
  objs.forEach(o=>{
    const m=o.material, tr=m.transparent;
    o.castShadow=good&&!tr&&o.visible; o.receiveShadow=good&&!tr;
    if(m.roughness!==mp.r)m.roughness=mp.r; if(m.metalness!==mp.m)m.metalness=mp.m; const e=good?mp.e:1; if(m.envMapIntensity!==e)m.envMapIntensity=e;
    if(!m.polygonOffset){m.polygonOffset=true; m.polygonOffsetFactor=1; m.polygonOffsetUnits=1;}
    let ln=edgeLn.get(o);
    if(ln&&(!wantEdges||ln.userData.g!==o.geometry)){o.remove(ln); ln.geometry.dispose(); edgeLn.delete(o); ln=null;}
    if(wantEdges&&!ln&&o.geometry.attributes.position.count<=450000&&(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)<=60000){ln=new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry,28),edgeMat); ln.userData.g=o.geometry; ln.raycast=()=>{}; o.add(ln); edgeLn.set(o,ln);}
    if(ln)ln.visible=!tr&&!M_(o).k;
    secCap(o,m,tr);
  });
  if(secOn&&$('#secp').hidden)secOff();
}
function renderFrame(){
  updateLook();
  const swapped=[];
  if(LOOK.mat==='clay')objs.forEach(o=>{if(!o.material.transparent){swapped.push([o,o.material]); o.material=sel.includes(o)?claySel:clayM;}});
  try{if(aoOn&&composer)composer.render(); else renderer.render(scene,cam);}
  finally{swapped.forEach(([o,m])=>{o.material=m;});}
}
function syncLookUI(){$('#lookq').value=LOOK.q; $('#lookm').value=LOOK.mat; $('#looke').checked=!!LOOK.edges;}
syncLookUI();
$('#lookbtn').onclick=()=>{openPanel('#lookp'); syncLookUI();};
$('#lookq').addEventListener('change',e=>{LOOK.q=e.target.value; saveLook();});
$('#lookm').addEventListener('change',e=>{LOOK.mat=e.target.value; saveLook();});
$('#looke').addEventListener('change',e=>{LOOK.edges=e.target.checked; saveLook();});


// ===== Acomodar en la cama =====
function arrTargets(){ const free=objs.filter(o=>!M_(o).l); return sel.length>=2?sel.filter(o=>!M_(o).l):free; }
function arrClusters(list){
  const bbs=list.map(o=>bbox(o)), par=list.map((_,i)=>i), f=i=>par[i]===i?i:(par[i]=f(par[i]));
  for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++)if(bbs[i].intersectsBox(bbs[j]))par[f(i)]=f(j);
  const g=new Map(); list.forEach((o,i)=>{const r=f(i); if(!g.has(r))g.set(r,[]); g.get(r).push(o);}); return [...g.values()];
}
function arrPlan(clusters,gap,rot){
  const edge=Math.min(2,gap), W=bed.w-2*edge, D=bed.d-2*edge;
  const items=clusters.map(cl=>{const b=new THREE.Box3(); cl.forEach(o=>b.union(bbox(o))); let w=b.max.x-b.min.x, d=b.max.z-b.min.z, r=false; if(rot&&d>w){[w,d]=[d,w]; r=true;} return {cl,w,d,r};});
  items.sort((a,b)=>b.d-a.d||b.w-a.w);
  let x=0,z=0,rowD=0; const placed=[], over=[];
  for(const it of items){
    if(x>0&&x+it.w>W+1e-6){x=0; z+=rowD+gap; rowD=0;}
    if(it.w>W+1e-6||z+it.d>D+1e-6){over.push(it); continue;}
    it.x=x; it.z=z; x+=it.w+gap; rowD=Math.max(rowD,it.d); placed.push(it);
  }
  return {placed,over,edge};
}
function arrRead(){return {gap:Math.max(0,Math.min(50,parseFloat($('#arrgap').value)||0)),rot:$('#arrrot').checked};}
function arrUpdate(){
  if($('#arrp').hidden)return;
  const list=arrTargets(), cl=arrClusters(list), {gap,rot}=arrRead(), pl=arrPlan(cl,gap,rot);
  $('#arrcount').innerHTML='<b>'+list.length+(list.length===1?' pieza':' piezas')+'</b> ('+(sel.length>=2?'las elegidas':'todas')+')'+(cl.length<list.length?' · '+cl.length+' grupos':'');
  $('#arrinfo').textContent=!list.length?'No hay piezas para acomodar.':pl.over.length?'⚠ No entran todas: sobrarían '+pl.over.length+'. Quedarían a la derecha de la cama.':'✔ Entran todas en la cama.';
}
function arrApply(){
  const list=arrTargets(); if(!list.length){msg('No hay piezas para acomodar.'); return;}
  const {gap,rot}=arrRead(), cl=arrClusters(list), pl=arrPlan(cl,gap,rot), qy=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI/2);
  const unionBox=it=>{const b=new THREE.Box3(); it.cl.forEach(o=>b.union(bbox(o))); return b;};
  const put=(it,tx,tz)=>{
    if(it.r){const c=unionBox(it).getCenter(new THREE.Vector3()); it.cl.forEach(o=>{const d=o.position.clone().sub(c).applyQuaternion(qy); o.position.set(c.x+d.x,o.position.y,c.z+d.z); o.quaternion.premultiply(qy);});}
    const b=unionBox(it); it.cl.forEach(o=>{o.position.x+=tx-b.min.x; o.position.z+=tz-b.min.z; o.updateMatrixWorld(true);});
  };
  pl.placed.forEach(it=>put(it,-bed.w/2+pl.edge+it.x,-bed.d/2+pl.edge+it.z));
  let oz=-bed.d/2; pl.over.forEach(it=>{put(it,bed.w/2+20,oz); oz+=it.d+gap;});
  sgCache.g=null; updateDims(); commit();
  msg(pl.over.length?'Acomodadas '+pl.placed.reduce((n,i)=>n+i.cl.length,0)+'. No entraron '+pl.over.reduce((n,i)=>n+i.cl.length,0)+': quedaron a la derecha de la cama. Ctrl+Z para deshacer.':'Piezas acomodadas en la cama. Ctrl+Z para deshacer.');
  arrUpdate();
}
$('#arrange').onclick=()=>{ if(!objs.length){msg('Agregá piezas para poder acomodarlas.'); return;} if(openPanel('#arrp',true))arrUpdate(); };
$('#arrgo').onclick=arrApply;
['#arrgap','#arrrot'].forEach(q=>$(q).addEventListener('input',arrUpdate));

// ===== Vista en sección: un plano corta la vista y se ve el interior con la cara cortada rellena =====
const secPlane=new THREE.Plane(new THREE.Vector3(0,-1,0),0), secArr=[secPlane], WHITE=new THREE.Color(0xffffff);
let secAx='y', secSide=-1, secVal=0, secMin=0, secMax=1, secDrag=null;
renderer.localClippingEnabled=true;
const secMesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({color:0x6ad0ff,transparent:true,opacity:.1,side:THREE.DoubleSide,depthWrite:false,depthTest:false}));
secMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(1,1)),new THREE.LineBasicMaterial({color:0x6ad0ff,depthTest:false,transparent:true})));
secMesh.renderOrder=4; secMesh.visible=false; secMesh.raycast=()=>{}; scene.add(secMesh);
const secKnob=new THREE.Mesh(new THREE.SphereGeometry(1,14,10),new THREE.MeshBasicMaterial({color:0xffffff,depthTest:false,transparent:true})); secKnob.renderOrder=6; secKnob.visible=false; scene.add(secKnob);
const secBack=new WeakMap();
function secCap(o,m,tr){
  const want=secOn&&!tr&&!wireOn&&o.visible; let b=secBack.get(o);
  if(b&&(!want||b.userData.g!==o.geometry)){o.remove(b); b.material.dispose(); secBack.delete(o); b=null;}
  if(want&&!b){b=new THREE.Mesh(o.geometry,new THREE.MeshBasicMaterial({side:THREE.BackSide,clippingPlanes:secArr})); b.userData.g=o.geometry; b.raycast=()=>{}; o.add(b); secBack.set(o,b);}
  if(b)b.material.color.copy(m.color).lerp(WHITE,.55);
  const cp=secOn?secArr:null; if(m.clippingPlanes!==cp){m.clippingPlanes=cp; m.needsUpdate=true;}
}
function secMats(){const cp=secOn?secArr:null; [edgeMat,wireMatN,wireMatS,clayM,claySel].forEach(x=>{x.clippingPlanes=cp; x.needsUpdate=true;});}
const secIdx={x:0,y:1,z:2}, secVec=a=>new THREE.Vector3(a==='x'?1:0,a==='y'?1:0,a==='z'?1:0);
function secRange(reset){
  const b=new THREE.Box3(); objs.forEach(o=>{if(o.visible)b.union(bbox(o));}); if(b.isEmpty())b.set(new THREE.Vector3(-10,0,-10),new THREE.Vector3(10,20,10));
  const i=secIdx[secAx]; secMin=Math.floor(b.min.getComponent(i)); secMax=Math.ceil(b.max.getComponent(i));
  if(reset)secVal=(secMin+secMax)/2;
  secVal=Math.max(secMin,Math.min(secMax,secVal)); const r=$('#secr'); r.min=secMin; r.max=secMax; secSync(); return b;
}
function secSync(){
  secPlane.normal.copy(secVec(secAx)).multiplyScalar(secSide); secPlane.constant=-secSide*secVal;
  $('#secr').value=secVal; if(document.activeElement!==$('#secv'))$('#secv').value=+secVal.toFixed(2);
  const b=new THREE.Box3(); objs.forEach(o=>{if(o.visible)b.union(bbox(o));}); if(b.isEmpty())b.set(new THREE.Vector3(-10,0,-10),new THREE.Vector3(10,20,10));
  b.expandByScalar(8); const c=b.getCenter(new THREE.Vector3()), sz=b.getSize(new THREE.Vector3());
  secMesh.position.copy(c); secMesh.position.setComponent(secIdx[secAx],secVal); secMesh.rotation.set(0,0,0);
  if(secAx==='x'){secMesh.rotation.y=Math.PI/2; secMesh.scale.set(sz.z,sz.y,1);} else if(secAx==='y'){secMesh.rotation.x=-Math.PI/2; secMesh.scale.set(sz.x,sz.z,1);} else secMesh.scale.set(sz.x,sz.y,1);
  const kp=secMesh.position.clone(); if(secAx==='y')kp.z=b.max.z; else kp.y=b.max.y; if(secAx==='x')kp.z=c.z; secKnob.position.copy(kp); secKnob.userData.k=true;
  secMesh.visible=secKnob.visible=secOn; wake(2000);
}
function secOnNow(){ if(!secOn){secOn=true; secMats();} secRange(true); secAxUI(); }
function secOff(){ if(!secOn)return; secOn=false; secMats(); secMesh.visible=secKnob.visible=false; $('#secp').hidden=true; $('#secbtn').classList.remove('on'); wake(2000); }
function secAxUI(){document.querySelectorAll('#secax [data-ax]').forEach(b=>b.classList.toggle('on',b.dataset.ax===secAx)); $('#secbtn').classList.add('on');}
$('#secbtn').onclick=()=>{ if(!objs.length){msg('Agregá una pieza para ver su interior.'); return;} if(openPanel('#secp',!secOn||$('#secp').hidden)){secOnNow(); msg('Vista en sección: mové el control o el punto blanco del plano. Al cerrar el panel se quita el corte.');} else secOff(); };
$('#secoff').onclick=secOff;
$('#secflip').onclick=()=>{secSide=-secSide; secSync();};
document.querySelectorAll('#secax [data-ax]').forEach(b=>b.onclick=()=>{secAx=b.dataset.ax; secRange(true); secAxUI();});
$('#secr').addEventListener('input',e=>{secVal=parseFloat(e.target.value)||0; secSync();});
$('#secv').addEventListener('input',e=>{const v=parseFloat(e.target.value); if(isNaN(v))return; secVal=Math.max(secMin,Math.min(secMax,v)); secSync();});
// arrastrar el punto blanco del plano
canvas.addEventListener('pointerdown',e=>{
  if(!secOn||e.button!==0||!secKnob.visible)return; setRay(e);
  const lt=ray2.intersectObject(secKnob,false)[0]; if(!lt)return;
  const hit=secKnobHit(e); if(hit===null)return;
  e.stopImmediatePropagation(); e.preventDefault(); secDrag={off:hit-secVal}; orbit.enabled=false; try{canvas.setPointerCapture(e.pointerId);}catch(_){}
},true);
function secKnobHit(e){ // coordenada sobre el eje del punto más cercano al rayo
  setRay(e); const u=secVec(secAx), d=ray2.ray.direction, w=ray2.ray.origin.clone(), bb=d.dot(u), den=1-bb*bb; if(den<1e-4)return null;
  return (u.dot(w)-bb*d.dot(w))/den;
}
addEventListener('pointermove',e=>{ if(!secDrag)return; const t=secKnobHit(e); if(t===null)return; secVal=Math.max(secMin,Math.min(secMax,t-secDrag.off)); secSync(); },true);
const secEnd=()=>{ if(secDrag){secDrag=null; orbit.enabled=true;} }; addEventListener('pointerup',secEnd,true); addEventListener('pointercancel',secEnd,true);
const secKnobScale=()=>{ if(secOn)secKnob.scale.setScalar(camK(secKnob.position)*0.012); };

// ===== Estimar impresión: volumen, peso, filamento, tiempo y costo =====
const EST={mat:1.24,price:20000,inf:15,spd:60}; try{Object.assign(EST,JSON.parse(localStorage.getItem('c3d_est')||'{}'));}catch(_){}
function estGeo(o){ // volumen (mm³) y superficie (mm²) con la escala de la pieza
  const g=o.geometry, P=g.attributes.position, I=g.index, n=I?I.count:P.count, sc=o.scale, a=new THREE.Vector3(), b=new THREE.Vector3(), c=new THREE.Vector3(), t=new THREE.Vector3();
  let V=0, A=0;
  for(let i=0;i<n;i+=3){
    const i0=I?I.getX(i):i, i1=I?I.getX(i+1):i+1, i2=I?I.getX(i+2):i+2;
    a.fromBufferAttribute(P,i0).multiply(sc); b.fromBufferAttribute(P,i1).multiply(sc); c.fromBufferAttribute(P,i2).multiply(sc);
    V+=a.dot(t.crossVectors(b,c))/6; A+=t.crossVectors(b.clone().sub(a),c.clone().sub(a)).length()/2;
  }
  return {V:Math.abs(V),A};
}
function estCalc(o){
  const {V,A}=estGeo(o), shell=Math.min(V,A*1.2), eff=shell+(EST.inf/100)*(V-shell), g=eff/1000*EST.mat, flow=EST.spd*0.4*0.2*0.7;
  return {V,g,len:eff/2.405/1000,sec:eff/flow,cost:g/1000*EST.price};
}
const estFmt=(n,d=1)=>n.toLocaleString('es-AR',{maximumFractionDigits:d}), estTime=s=>{const m=Math.round(s/60); return m>=60?Math.floor(m/60)+' h '+(m%60)+' min':m+' min';};
function estUpdate(){
  if($('#estp').hidden)return;
  const list=(sel.length?sel:objs).filter(o=>!M_(o).h);
  if(!list.length){$('#esttot').textContent='No hay piezas para estimar.'; $('#estlist').textContent=''; return;}
  const rows=list.map(o=>({n:M_(o).n||'Pieza',...estCalc(o)})), T=rows.reduce((t,r)=>({V:t.V+r.V,g:t.g+r.g,len:t.len+r.len,sec:t.sec+r.sec,cost:t.cost+r.cost}),{V:0,g:0,len:0,sec:0,cost:0});
  $('#esttot').innerHTML='<b>Total ('+rows.length+(rows.length===1?' pieza':' piezas')+(sel.length?', elegidas':'')+')</b><br>Volumen: '+estFmt(T.V/1000)+' cm³<br>Peso: ≈ '+estFmt(T.g,0)+' g<br>Filamento: ≈ '+estFmt(T.len)+' m<br>Tiempo: ≈ '+estTime(T.sec)+'<br>Costo del material: ≈ $ '+estFmt(T.cost,0);
  $('#estlist').innerHTML=rows.slice(0,8).map(r=>esc(r.n)+' · '+estFmt(r.g,0)+' g · '+estTime(r.sec)+' · $ '+estFmt(r.cost,0)).join('<br>')+(rows.length>8?'<br>… y '+(rows.length-8)+' más':'');
}
function estSave(){try{localStorage.setItem('c3d_est',JSON.stringify(EST));}catch(_){}}
function estSyncUI(){$('#estmat').value=String(EST.mat); $('#estprice').value=EST.price; $('#estinf').value=EST.inf; $('#estspd').value=EST.spd;}
$('#estbtn').onclick=()=>{ if(openPanel('#estp')){estSyncUI(); estUpdate();} };
[['#estmat','mat'],['#estprice','price'],['#estinf','inf'],['#estspd','spd']].forEach(([q,k])=>$(q).addEventListener('input',e=>{const v=parseFloat(e.target.value); if(isNaN(v))return; EST[k]=v; estSave(); estUpdate();}));
