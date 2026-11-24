'use strict';
// Constructor 3D: grabar texto en la cara de una pieza.
// Elegís la pieza, escribís el texto y «Grabar en la pieza»: el texto se apoya sobre la cara de arriba
// de esa pieza, con su espesor hundido, y se resta con el mismo motor que Restar. Resultado: la pieza con el texto grabado.
// Los scripts de js/ comparten el ámbito global y se cargan en orden desde index.html.

async function grabarTexto(){
  const T=sel[sel.length-1];
  if(!T||M_(T).tx){msg('Elegí primero la pieza donde querés grabar el texto (no otro texto).'); return;}
  const tx=readTx(); if(!tx.s.trim()){msg('Escribí el texto primero.'); return;}
  await busyOn('Grabando el texto…');
  let m=null;
  try{
    const {geo,miss}=await textGeometry({...tx,lay:true});
    if(!geo){msg('Esa tipografía no tiene ninguna de esas letras.'); return;}
    const bb=bbox(T), c=bb.getCenter(new THREE.Vector3()), d=tx.depth;
    m=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:0xffffff}));
    scene.add(m); objs.push(m); M_(m).n='Texto grabado'; M_(m).g=null;
    // el texto va de 1 mm por encima de la cara hasta d mm por debajo
    m.position.set(c.x, bb.max.y+1-d/2, c.z); m.updateMatrixWorld(true);
    m.userData.grab=true;
    busyOff();
    select([T,m]);
    await runOp('subtract');
    msg('Texto grabado en "'+M_(T).n+'"'+(miss.length?'. Estas letras no están en la tipografía: '+miss.join(' '):'.')+' Si la cara es curva, el texto puede salirse; probá con una cara plana.');
  }catch(err){
    console.error(err); msg('No se pudo grabar el texto. Revisá la conexión a internet.');
    if(m){scene.remove(m); const i=objs.indexOf(m); if(i>=0)objs.splice(i,1); select([T]);}
  }finally{ busyOff(); }
}
$('#tgrab').onclick=grabarTexto;
