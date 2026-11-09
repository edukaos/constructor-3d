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
- **Encuadrar** con F y vistas de cámara desde el menú Cámara.
- Cama de impresión configurable, con aviso si una pieza sobresale.
- **Revisar malla:** detecta huecos, caras dadas vuelta, caras repetidas y uniones de espesor cero, muestra los bordes abiertos y calcula volumen y peso aproximado en PLA. Reparar tapa huecos, da vuelta las caras y borra las sobrantes.
- **Importar STL. Exportar** a STL (todo junto o una pieza por archivo) o a 3MF con nombres, colores y posición en la cama. Las piezas ocultas y los agujeros no se exportan.
- Guardar y abrir proyecto (JSON), autoguardado en el navegador, deshacer y rehacer.
- Herramientas separadas por función: Archivo, Historial, Vista, Cámara y Ayuda arriba, centrados y juntos; Transformar, Combinar y Editar a la izquierda; Crear a la derecha, con todas las formas a la vista. En pantallas angostas la barra de arriba se pliega en menús y las columnas pasan a franjas.

## Atajos
1–5 formas · T texto · M mover · R rotar · S escalar · F encuadrar · L lista de piezas · H agujero · G apoyar · Ctrl+Z / Ctrl+Y · Ctrl+S · Ctrl+D · Ctrl+C / Ctrl+V · Supr · Shift/Ctrl + clic para sumar a la selección · Shift + arrastrar en vacío para un rectángulo · Esc cancela · ? muestra la ayuda.

## Uso
Abrir `index.html` en un servidor web (https recomendado). No necesita build ni backend.
Las librerías (Three.js, Manifold, three-mesh-bvh y three-bvh-csg, que queda de respaldo para mallas que no están cerradas) y las tipografías se cargan desde jsDelivr, así que hace falta conexión.

## Instalar como app
Abrí https://edukaos.github.io/constructor-3d/ en Chrome/Edge y usá el ícono de instalar de la barra de direcciones (o menú ⋮ → Instalar). En Android/iOS: menú → "Agregar a pantalla de inicio". Después de la primera carga funciona sin conexión.

## Novedades
- **SVG a 3D**: importa un SVG con áreas rellenas y le da espesor y ancho en mm.
- **Vaciar**: deja una pieza hueca con paredes del grosor elegido (opcional: abierta arriba).
- **Cortar para la cama**: divide una pieza grande en partes que entren, con espigas y agujeros de encastre.
- **Colores**: paleta rápida junto al selector de color.
- **Importar OBJ y 3MF** además de STL.
- **Regla** sobre la cama (en mm) e **imán** configurable de 1, 5 o 10 mm (panel Cama).
- **Ejemplos**: llavero, caja con tapa y soporte en L.
- **Iconos 3D glossy** propios: las formas básicas son renders reales en 3D (WebP incrustado) y el resto son ilustraciones SVG con degradado y brillo, con una escala de espaciado única (múltiplos de 4 px). Los scripts para regenerarlos están en `tools/iconos/`.
- **Sistema de diseño** estilo Apple: tipografía del sistema con escala 11.5/12.5/13.5/15, controles de 32 px, selectores propios, interruptores tipo iOS, foco accesible solo con teclado, barra de scroll fina que aparece al usarla, paneles que entran con un fundido corto (respeta «reducir movimiento»).
- **Estilo liquid glass**: en escritorio el visor ocupa toda la pantalla y barras, paneles y diálogos flotan encima como vidrio translúcido (desenfoque, brillo de borde, deslizadores en gota), en modo oscuro y claro. En celulares y pantallas táctiles se usa una versión plana y liviana, sin desenfoque, brillos ni sombras.
- **Aspecto** (botón en Vista): calidad Simple / Mejor / Máxima, material (plástico, mate, brillante, arcilla) y aristas marcadas. Mejor suma luces, reflejos y sombra en el piso; Máxima agrega oclusión ambiental. Con piezas muy pesadas se simplifica solo.
- **Textura** (columna izquierda, con vista previa en vivo): fuzzy skin (rugosa u ondulada), líneas horizontales o verticales, puntos y tejido; tamaño del grano e intensidad con deslizadores; puede dejar lisas la tapa y la base.
- **Duplicar / Borrar** rápidos sobre el visor, secciones plegables en la columna izquierda.
- **Exportar**: STL, ZIP por pieza, 3MF e **imagen PNG** con fondo transparente; los archivos llevan las medidas en el nombre y avisa si el modelo flota o no entra en la cama.
- **Biblioteca de formas** (columna derecha, "Más formas"): 24 piezas por categoría con buscador (cilindro y caja redondeados, esfera cuarta, prismas, estrella, corazón, escalera, arco, techo, arandela, perfiles L/U, cruz, llave, tuerca, engranaje, flecha, escuadra…).
- **Redondear / chaflán** (columna izquierda, con vista previa): redondea o achaflana todas las aristas de la pieza, hacia afuera, hacia adentro o ambos. Las piezas complejas piden "Calcular vista previa" porque tarda varios segundos.
- **Pruebas**: carpeta `tests/`.
