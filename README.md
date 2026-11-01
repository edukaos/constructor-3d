# Constructor 3D

App web simple, estilo Microsoft 3D Builder, en un solo archivo (`index.html`).

## Qué hace
- **Formas:** cubo, esfera, cilindro, cono, toroide, tubo, media esfera, pirámide, prisma hexagonal y cuña (25 mm por defecto). Aparecen en el centro de la cama.
- **Texto 3D:** 7 tipografías con ñ y acentos, acostado o parado, alto de letra y espesor en mm. Se puede editar después.
- **Mover, rotar y escalar** (escalado con caja exterior y cotas en mm), con snap opcional.
- **Unir, restar, intersectar y dividir** con el motor Manifold: los resultados salen siempre cerrados. Unir e Intersectar aceptan varias piezas a la vez.
- **Agujero**, como en Tinkercad: una pieza marcada como agujero se resta al unirla con otras.
- **Lista de piezas:** elegir, renombrar, ocultar y bloquear.
- **Apoyar** en la base o sobre la pieza de abajo, y **apoyar por una cara**.
- **Patrón:** copias en línea, en grilla o en círculo.
- **Medir** la distancia entre dos puntos.
- Medidas, posición, rotación y color editables; bordes redondeados o chaflán en cubo y cilindro.
- Alinear, centrar, espejo, duplicar, copiar y pegar.
- **Vistas de cámara** (frente, arriba, lado, 3D) y encuadrar con F.
- Cama de impresión configurable, con aviso si una pieza sobresale.
- **Revisar malla:** detecta huecos, caras dadas vuelta, caras repetidas y uniones de espesor cero, muestra los bordes abiertos y calcula volumen y peso aproximado en PLA. Reparar tapa huecos, da vuelta las caras y borra las sobrantes.
- **Importar STL. Exportar** a STL (todo junto o una pieza por archivo) o a 3MF con nombres, colores y posición en la cama. Las piezas ocultas y los agujeros no se exportan.
- Guardar y abrir proyecto (JSON), autoguardado en el navegador, deshacer y rehacer.
- La barra se pliega en menús cuando la pantalla es angosta.

## Atajos
1–5 formas · T texto · M mover · R rotar · E escalar · F encuadrar · L lista de piezas · H agujero · G apoyar · Ctrl+Z / Ctrl+Y · Ctrl+S · Ctrl+D · Ctrl+C / Ctrl+V · Supr · Shift/Ctrl + clic para sumar a la selección · Shift + arrastrar en vacío para un rectángulo · Esc cancela · ? muestra la ayuda.

## Uso
Abrir `index.html` en un servidor web (https recomendado). No necesita build ni backend.
Las librerías (Three.js, Manifold, three-mesh-bvh y three-bvh-csg, que queda de respaldo para mallas que no están cerradas) y las tipografías se cargan desde jsDelivr, así que hace falta conexión.
