'use strict';
// Constructor 3D: exportar, colores y regla.
// Los scripts de js/ comparten el ámbito global y se cargan en orden desde index.html.
// ===== Exportar =====
// triángulos en mm con Z hacia arriba, como los usan los laminadores
function worldTris(o){
  o.updateMatrixWorld(true);
  const g=o.geometry, pos=g.attributes.position, idx=g.index, n=idx?idx.count:pos.count, out=new Float32Array(n*3), v=new THREE.Vector3(), flip=o.matrixWorld.determinant()<0;
  for(let i=0;i<n;i++){
    const k=flip&&i%3?(i%3===1?i+1:i-1):i, j=idx?idx.getX(k):k;
    v.fromBufferAttribute(pos,j).applyMatrix4(o.matrixWorld); out[i*3]=v.x; out[i*3+1]=-v.z; out[i*3+2]=v.y;
  }
  return out;
}
function stlBinary(arrs){
  let nt=0; arrs.forEach(a=>{nt+=a.length/9;});
  const buf=new ArrayBuffer(84+nt*50), dv=new DataView(buf), hdr='Constructor 3D';
  for(let i=0;i<hdr.length;i++)dv.setUint8(i,hdr.charCodeAt(i));
  dv.setUint32(80,nt,true); let off=84;
  for(const a of arrs)for(let i=0;i<a.length;i+=9){
    const ux=a[i+3]-a[i],uy=a[i+4]-a[i+1],uz=a[i+5]-a[i+2],vx=a[i+6]-a[i],vy=a[i+7]-a[i+1],vz=a[i+8]-a[i+2];
    const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,l=Math.hypot(nx,ny,nz)||1;
    dv.setFloat32(off,nx/l,true); dv.setFloat32(off+4,ny/l,true); dv.setFloat32(off+8,nz/l,true);
    for(let k=0;k<9;k++)dv.setFloat32(off+12+k*4,a[i+k],true);
    off+=50;
  }
  return new Uint8Array(buf);
}
function zipFiles(files,type){
  const enc=new TextEncoder(), parts=[], cen=[]; let off=0;
  files.forEach(f=>{
    const nb=enc.encode(f.name), d=f.data, crc=crc32(d), lh=new DataView(new ArrayBuffer(30)), ch=new DataView(new ArrayBuffer(46));
    lh.setUint32(0,0x04034b50,true); lh.setUint16(4,20,true); lh.setUint16(6,0x0800,true); lh.setUint32(14,crc,true); lh.setUint32(18,d.length,true); lh.setUint32(22,d.length,true); lh.setUint16(26,nb.length,true);
    ch.setUint32(0,0x02014b50,true); ch.setUint16(4,20,true); ch.setUint16(6,20,true); ch.setUint16(8,0x0800,true); ch.setUint32(16,crc,true); ch.setUint32(20,d.length,true); ch.setUint32(24,d.length,true); ch.setUint16(28,nb.length,true); ch.setUint32(42,off,true);
    parts.push(lh,nb,d); cen.push(ch,nb); off+=30+nb.length+d.length;
  });
  let cl=0; cen.forEach(c=>{cl+=c.byteLength;});
  const ed=new DataView(new ArrayBuffer(22)); ed.setUint32(0,0x06054b50,true); ed.setUint16(8,files.length,true); ed.setUint16(10,files.length,true); ed.setUint32(12,cl,true); ed.setUint32(16,off,true);
  return new Blob([...parts,...cen,ed],{type:type||'application/zip'});
}
function build3mf(list){
  const enc=new TextEncoder(), ox=bed.w/2, oy=bed.d/2, F=x=>x.toFixed(4);
  const mats=list.map(o=>'<base name="'+esc(M_(o).n)+'" displaycolor="#'+o.material.color.getHexString().toUpperCase()+'FF"/>').join('');
  let objsX='', items='';
  list.forEach((o,i)=>{
    const a=worldTris(o), map=new Map(), vs=[], ts=[];
    for(let t=0;t<a.length;t+=9){
      const ids=[0,1,2].map(c=>{const x=F(a[t+c*3]+ox),y=F(a[t+c*3+1]+oy),z=F(a[t+c*3+2]), key=x+','+y+','+z; let q=map.get(key); if(q===undefined){q=vs.length; map.set(key,q); vs.push('<vertex x="'+x+'" y="'+y+'" z="'+z+'"/>');} return q;});
      if(ids[0]!==ids[1]&&ids[1]!==ids[2]&&ids[0]!==ids[2])ts.push('<triangle v1="'+ids[0]+'" v2="'+ids[1]+'" v3="'+ids[2]+'"/>');
    }
    objsX+='<object id="'+(i+2)+'" type="model" name="'+esc(M_(o).n)+'" pid="1" pindex="'+i+'"><mesh><vertices>'+vs.join('')+'</vertices><triangles>'+ts.join('')+'</triangles></mesh></object>';
    items+='<item objectid="'+(i+2)+'"/>';
  });
  const model='<?xml version="1.0" encoding="UTF-8"?>\n<model unit="millimeter" xml:lang="es-AR" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"><metadata name="Application">Constructor 3D</metadata><resources><basematerials id="1">'+mats+'</basematerials>'+objsX+'</resources><build>'+items+'</build></model>';
  const types='<?xml version="1.0" encoding="UTF-8"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>';
  const rels='<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>';
  return zipFiles([{name:'[Content_Types].xml',data:enc.encode(types)},{name:'_rels/.rels',data:enc.encode(rels)},{name:'3D/3dmodel.model',data:enc.encode(model)}],'model/3mf');
}
const exportList=()=>objs.filter(o=>o.visible&&!M_(o).k);
const exportBox=l=>{const b=new THREE.Box3(); l.forEach(o=>b.expandByObject(o)); return b;};
const exportTag=l=>{const b=exportBox(l), z=b.getSize(new THREE.Vector3()); return '_'+[z.x,z.z,z.y].map(v=>Math.round(v*10)/10).join('x')+'mm';};
const bedWarn=l=>{const b=exportBox(l), w=[]; if(b.min.y>0.5)w.push('el modelo flota '+(Math.round(b.min.y*10)/10)+' mm sobre la cama (usá Apoyar)'); if(b.min.y<-0.5)w.push('parte del modelo queda debajo de la cama'); const z=b.getSize(new THREE.Vector3()); if(z.x>bed.w+0.5||z.z>bed.d+0.5)w.push('no entra en la cama ('+bed.w+'×'+bed.d+' mm; usá Dividir para la cama)'); return w.length?' Ojo: '+w.join('; ')+'.':'';};
const exportNote=l=>{const n=objs.length-l.length; return n?' '+(n===1?'1 pieza quedó afuera':n+' piezas quedaron afuera')+' (ocultas o huecos).':'';};
async function doExport(kind){
  const l=exportList(); if(!l.length){msg('No hay piezas visibles para exportar (las ocultas y los huecos no se exportan).'); return;}
  await busyOn('Exportando…');
  try{
    if(kind==='stl'){const u=stlBinary(l.map(worldTris)); saveStl(new DataView(u.buffer),'modelo'+exportTag(l)+'.stl'); msg('STL exportado: modelo'+exportTag(l)+'.stl.'+exportNote(l)+bedWarn(l));}
    else if(kind==='parts'){
      const used={}, files=l.map(o=>{let b=(M_(o).n.replace(/[\\/:*?"<>|]+/g,'_').trim()||'pieza'); if(used[b]){used[b]++; b+=' ('+used[b]+')';} else used[b]=1; return {name:b+'.stl',data:stlBinary([worldTris(o)])};});
      await saveFile('piezas.zip',zipFiles(files),'Hay un STL por pieza adentro del ZIP.'); msg((files.length===1?'1 pieza exportada':files.length+' piezas exportadas')+' en piezas.zip.'+exportNote(l));
    } else {if(kind==='png'){const th=tc.visible; tc.visible=false; renderFrame(); const bl=await new Promise(r=>canvas.toBlob(r,'image/png')); tc.visible=th; await saveFile('imagen3d.png',bl,'Fondo transparente.'); msg('Imagen exportada: imagen3d.png.');}
      else {const nm='modelo'+exportTag(l)+'.3mf'; await saveFile(nm,build3mf(l),'Abrilo con tu laminador.'); msg('3MF exportado: '+nm+', con '+(l.length===1?'1 pieza.':l.length+' piezas.')+exportNote(l)+bedWarn(l));}}
    $('#expp').hidden=true;
  }catch(err){console.error(err); msg('No se pudo exportar.');}
  finally{busyOff();}
}
$('#ex1').onclick=()=>doExport('stl'); $('#ex2').onclick=()=>doExport('parts'); $('#ex3').onclick=()=>doExport('3mf'); $('#ex4').onclick=()=>doExport('png');

// ===== Colores rápidos =====
const PAL=['#4f8cff','#ff7a59','#4cc38a','#f5c542','#b07cff','#e5484d','#ffffff','#9aa0a6','#2b2b2b','#8b5a2b'];
{const p=$('#pal'); PAL.forEach(c=>{const b=document.createElement('button'); b.type='button'; b.className='sw'; b.style.background=c; b.title='Pintar con '+c; b.onclick=()=>{if(!sel.length){msg('Elegí una pieza para pintarla.');return;} sel.forEach(o=>o.material.color.set(c)); $('#col').value=c; renderList(); commit();}; p.appendChild(b);});}

// ===== Regla sobre la cama e imán =====
function gridOp(){let v=null; try{v=localStorage.getItem('c3d_grid');}catch(e){} v=v===null?30:+v; return 0.4*Math.max(0,Math.min(100,v))/100;}
var rulerG;
function rulerLabel(t){
  const c=document.createElement('canvas'); c.width=96; c.height=48; const x=c.getContext('2d');
  x.font='bold 30px sans-serif'; x.textAlign='center'; x.textBaseline='middle'; x.fillStyle='#2f6df6'; x.fillText(t,48,26);
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),depthTest:false,transparent:true}));
  sp.scale.set(10,5,1); sp.renderOrder=997; return sp;
}
function buildRuler(){
  if(rulerG){scene.remove(rulerG); rulerG.traverse(o=>{if(o.material){if(o.material.map)o.material.map.dispose(); o.material.dispose();}});}
  const chk=document.getElementById('rulerchk');
  rulerG=new THREE.Group(); rulerG.visible=!!(chk&&chk.checked); scene.add(rulerG);
  const w=bed.w, d=bed.d, st=Math.max(w,d)>160?20:10;
  for(let k=0;k*st<=w;k++){const sp=rulerLabel(String(k*st)); sp.position.set(-w/2+k*st,0.5,d/2+5); rulerG.add(sp);}
  for(let k=1;k*st<=d;k++){const sp=rulerLabel(String(k*st)); sp.position.set(-w/2-6,0.5,d/2-k*st); rulerG.add(sp);}
}
{let r=null; try{r=localStorage.getItem('c3d_ruler');}catch(e){} $('#rulerchk').checked=r==='1'; buildRuler();}
$('#rulerchk').addEventListener('change',e=>{rulerG.visible=e.target.checked; try{localStorage.setItem('c3d_ruler',e.target.checked?'1':'0');}catch(_){}});
{let v=null; try{v=localStorage.getItem('c3d_grid');}catch(e){} $('#gridop').value=v===null?30:v;}
$('#gridop').addEventListener('input',e=>{try{localStorage.setItem('c3d_grid',e.target.value);}catch(_){} if(bedGrid)bedGrid.material.opacity=gridOp();});
$('#snapstep').addEventListener('change',()=>{applySnap(); if($('#snap').classList.contains('on'))msg('Imán de '+snapStep()+' mm.');});
