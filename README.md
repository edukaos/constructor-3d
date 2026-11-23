# Constructor 3D

App web simple, estilo Microsoft 3D Builder. Dirección oficial: **https://constructor.quiron3d.com** (la vieja, edukaos.github.io/constructor-3d, ofrece mudar el trabajo guardado con un clic).

## Qué hace
- **Formas:** cubo, esfera, cilindro, cono, toroide, tubo, media esfera, pirámide, prisma hexagonal y cuña (25 mm por defecto). Aparecen en el centro de la cama.
- **Texto 3D:** 7 tipografías con ñ y acentos, acostado o parado, alto de letra y espesor en mm. Se puede editar después.
- **Mover, rotar y escalar** (escalado con caja exterior y cotas en mm), con snap opcional.
- **Unir, restar, intersectar y dividir** con el motor Manifold: los resultados salen siempre cerrados. Unir e Intersectar aceptan varias piezas a la vez.
- **Hueco**, como en Tinkercad: una pieza marcada como hueco se resta al unirla con otras.
- **Lista de piezas:** elegir, renombrar, ocultar y bloquear.
- **Apoyar** en la base o sobre la pieza de abajo, y **apoyar por una cara**.
- **Patrón:** copias en línea, en grilla o en círculo.
- **Medir** la distancia entre dos puntos.
- Medidas, posición, rotación y color editables; bordes redondeados o chaflán en cubo y cilindro.
- Alinear, centrar, espejo, duplicar, copiar y pegar.
- **Encuadrar** con F y vistas de cámara desde el menú Cámara.
- Cama de impresión configurable, con aviso si una pieza sobresale.
- **Revisar malla:** detecta huecos, caras dadas vuelta, caras repetidas y uniones de espesor cero, muestra los bordes abiertos y calcula volumen y peso aproximado en PLA. Reparar tapa huecos, da vuelta las caras y borra las sobrantes.
- **Importar STL. Exportar** a STL (todo junto o una pieza por archivo) o a 3MF con nombres, colores y posición en la cama. Las piezas ocultas y los huecos no se exportan.
- Guardar y abrir proyecto (JSON), autoguardado en el navegador, deshacer y rehacer.
- Disposición en pantalla ancha (rediseño): barra superior fina con archivo, historial, buscador de acciones (Ctrl K) y Exportar; riel izquierdo de íconos con tooltips y el botón Agregar (A) que abre el menú de formas; inspector a la derecha con la lista de Piezas y las Propiedades; barra de acciones sobre el visor al elegir piezas (Unir, Restar, Intersectar, Duplicar, Alinear, Apoyar, Hueco, Borrar); barra de vista abajo (Transparente, Cama, Aspecto, Frente/Arriba/Lado/3D, Encuadrar) y pie de estado con medidas, triángulos y cama. En pantallas chicas y celulares se mantiene la disposición anterior con menús.

## Atajos
1–5 formas · A agregar · Ctrl K buscador de acciones · T texto · M mover · R rotar · S escalar · F encuadrar · O cámara ortográfica · L lista de piezas · H hueco · G apoyar · Ctrl+Z / Ctrl+Y · Ctrl+S · Ctrl+D · Ctrl+C / Ctrl+V · Ctrl+G agrupar · Ctrl+Shift+G desagrupar · Supr · Shift/Ctrl + clic para sumar

## Uso
Abrir `index.html` en un servidor web (https recomendado). No necesita build ni backend. Desde una copia local: `python3 -m http.server` en la carpeta y abrir http://localhost:8000 (abriendo el archivo con doble clic no carga, porque usa módulos).

## Cómo está organizado el código
- `index.html`: la estructura de la pantalla (botones, paneles) y el orden en que se cargan los scripts.
- `css/app.css` (estilos de la app) y `css/marca.css` (marca Quirón).
- `js/libs.js` importa Three.js, Manifold y las demás librerías. Después se cargan en orden y comparten el ámbito global: `nucleo.js` (escena, piezas, historial, formas, alinear), `operaciones.js` (unir/restar con Manifold, revisión de mallas), `interfaz.js` (paneles, lista, vistas, selección, herramientas, texto, patrón), `exportar.js`, `formas.js` (SVG, vaciar, biblioteca de formas, redondear, historial editable), `sketch.js`, `acabados.js` (textura, dividir para la cama, importar, aspecto, acomodar, sección, estimar) y `layout.js` (cinta, inspector, buscador, ayuda).
- `js/aviso-version.js` (service worker y aviso de versión nueva), `js/mudanza.js` y `js/marca.js`.
- `sw.js`: si se agrega un archivo nuevo a css/ o js/, sumarlo a la lista `CORE` y subir el número de `CACHE`.
Las librerías (Three.js, Manifold, three-mesh-bvh y three-bvh-csg, que queda de respaldo para mallas que no están cerradas) y las tipografías se cargan desde jsDelivr, así que hace falta conexión.

## Instalar como app
Abrí https://constructor.quiron3d.com en Chrome/Edge y usá el ícono de instalar de la barra de direcciones (o menú ⋮ → Instalar). En Android/iOS: menú → "Agregar a pantalla de inicio". Después de la primera carga funciona sin conexión.

## Novedades
- **Tornillos y tuercas con rosca real** (Más formas › Taller): rosca métrica ISO de paso grueso, M2 a M20, con largo y cabeza hexagonal o sin cabeza (varilla). La tuerca puede tener rosca interior con holgura ajustable (0,25 mm por defecto) para que el tornillo impreso entre. Malla cerrada, lista para imprimir; avisa que debajo de M6 las roscas impresas salen empastadas.
- **Plano de trabajo** (Crear › Plano de trabajo › Elegir cara): tocás una cara de una pieza, de arriba, de costado o inclinada, y las piezas nuevas se apoyan sobre ella con la base mirando a la cara (con imán, sobre la grilla del plano). «Cama», tocar un espacio vacío o un proyecto nuevo vuelven a la cama.
- **Agrupar sin unir** (Objeto › Grupo, Ctrl+G): las piezas agrupadas se eligen, mueven, alinean, duplican y borran juntas sin fusionarse. El panel Grupo cambia el ancho o la escala del conjunto y lo gira 90°. Desagrupar (Ctrl+Shift+G) las vuelve independientes. Se guarda en el proyecto y en el historial.
- **Menús renombrados**: la pestaña Editar ahora se llama **Objeto** (mover, alinear, repetir), Modificar se llama **Editar** (unir, restar, vaciar, redondear…) y Cortar se llama **Dividir**.
- **Calcar una imagen** (Sketch 2D → Calcar): ponés una foto o dibujo de fondo (se mueve y escala arrastrando, con ancho real en mm y transparencia) y dibujás encima, o tocás «Crear contorno» para que detecte la silueta sola. La imagen no se guarda en el proyecto.
- **Estimar impresión** (Preparar): volumen, peso, filamento, tiempo y costo del material de las piezas elegidas (o todas), con material, precio por kg, relleno y velocidad editables. Es una estimación.
- **Acomodar en la cama** (Objeto → Alinear): ordena las piezas una al lado de la otra con la separación que elijas, girando 90° si entran mejor. Las piezas que se tocan se mueven juntas. Se puede deshacer.
- **Vista en sección** (Aspecto): un plano (X, Y o Z) corta la vista y la cara cortada se ve rellena, para mirar por dentro. No modifica las piezas.
- **Más liviana:** dibuja solo cuando hay actividad (menos batería y calor), resolución limitada a 2×, y libera memoria de video de piezas viejas del historial.
- **Pantallas muy chicas:** aparece un aviso de que la app es para computadora.
- **Selección bien marcada**: contorno amarillo brillante en cada pieza elegida, las demás se atenúan, y un cartel indica cuántas piezas están seleccionadas y sus nombres.
- **Manipular (V)**, modo por defecto: con la pieza seleccionada se mueve arrastrándola, se escala con los puntos, se rota con el anillo de abajo y se sube con la flecha amarilla, con las cotas siempre a la vista. Mover, Rotar y Escalar siguen para trabajar con precisión por ejes.
- **Pieza nueva con fantasma**: al elegir una forma aparece translúcida siguiendo al cursor (sobre la cama o arriba de otra pieza); un clic la apoya y quedan las manijas de escala con cotas, donde se puede escribir la medida exacta. Esc cancela.
- **Botón + amarillo** a la izquierda de las pestañas (o tecla A): menú con las formas básicas y Más formas, disponible en cualquier pestaña. La pestaña Crear queda con Texto 3D, SVG, Sketch 2D, Importar y Biblioteca.
- **Recorrido inicial** la primera vez que abrís la app (se vuelve a ver desde la ayuda, ?).
- **Dividir unificado** (antes «Cortar»): un solo botón con dos modos, en partes iguales con uniones o con un plano. En el celular queda solo el corte con un plano.
- **Celular simplificado**: se ocultan las funciones avanzadas. Aspecto sin la calidad Máxima y panel de medidas sin Más/Menos.
- **Biblioteca de piezas** (Crear › Archivo): guardá las piezas elegidas con un nombre, con su historial editable, y volvé a usarlas en cualquier proyecto. Se guarda en el navegador y se puede exportar e importar como archivo.
- **Sketch 2D** (Crear › Boceto): dibujá con línea, arco, rectángulo y círculo en Planta o Frente, con imán y cotas editables, y dale volumen con Extruir o Revolucionar. Se puede dibujar arrastrando; el boceto queda editable desde el Historial.
- **Esquinas redondeadas en el Sketch**: herramienta Esquina (poné el radio y tocá una esquina recta), volver a tocarla con otro radio para cambiarla, y Redondear todas / Esquinas rectas desde el panel de la forma.
- **Historial editable**: Vaciar, Redondear, uniones/restas y bocetos guardan sus valores; se pueden cambiar después desde el panel Propiedades, y "Editar piezas" recupera las originales de una unión.
- **Cortar en partes** con tres tipos de unión (perno redondo, espiga y ranura, cola de milano) y holgura; funciona con cualquier pieza, aunque ya entre en la cama.
- **Cubo de vistas** arriba a la derecha: clic en una cara para mirar desde ahí, arrastrar para orbitar.
- **Barras sin borde** y zoom al 90% en ventanas de menos de 1920 px.
- **Reparación automática** al Vaciar y Redondear, con mensajes claros si la malla no se puede arreglar.
- **SVG a 3D**: importa un SVG con áreas rellenas y le da espesor y ancho en mm.
- **Vaciar**: deja una pieza hueca con paredes del grosor elegido (opcional: abierta arriba).
- **Cortar para la cama**: divide una pieza grande en partes que entren, con espigas y huecos de encastre.
- **Colores**: paleta rápida junto al selector de color.
- **Importar OBJ y 3MF** además de STL.
- **Regla** sobre la cama (en mm) e **imán** configurable de 1, 5 o 10 mm (panel Cama).
- **Iconos 3D glossy** propios: las formas básicas son renders reales en 3D (WebP incrustado) y el resto son ilustraciones SVG con degradado y brillo, con una escala de espaciado única (múltiplos de 4 px). Los scripts para regenerarlos están en `tools/iconos/`.
- **Sistema de diseño** estilo Apple: tipografía del sistema con escala 11.5/12.5/13.5/15, controles de 32 px, selectores propios, interruptores tipo iOS, foco accesible solo con teclado, barra de scroll fina que aparece al usarla, paneles que entran con un fundido corto (respeta «reducir movimiento»).
- **Estilo liquid glass**: en escritorio el visor ocupa toda la pantalla y barras, paneles y diálogos flotan encima como vidrio translúcido (desenfoque, brillo de borde, deslizadores en gota), en modo oscuro y claro. En celulares y pantallas táctiles se usa una versión plana y liviana, sin desenfoque, brillos ni sombras.
- **Aspecto** (botón en Vista): calidad Simple / Mejor / Máxima, material (plástico, mate, brillante, arcilla) y aristas marcadas. Mejor suma luces, reflejos y sombra en el piso; Máxima agrega oclusión ambiental. Con piezas muy pesadas se simplifica solo.
- **Textura** (columna izquierda, con vista previa en vivo): fuzzy skin (rugosa u ondulada), líneas horizontales o verticales, puntos y tejido; tamaño del grano e intensidad con deslizadores; puede dejar lisas la tapa y la base.
- **Duplicar / Borrar** rápidos sobre el visor, secciones plegables en la columna izquierda.
- **Exportar**: STL, ZIP por pieza, 3MF e **imagen PNG** con fondo transparente; los archivos llevan las medidas en el nombre y avisa si el modelo flota o no entra en la cama.
- **Biblioteca de formas** (columna derecha, "Más formas"): 24 piezas por categoría con buscador (cilindro y caja redondeados, esfera cuarta, prismas, estrella, corazón, escalera, arco, techo, arandela, perfiles L/U, cruz, llave, tuerca, engranaje, flecha, escuadra…).
- **Redondear / chaflán** (columna izquierda, con vista previa): redondea o achaflana todas las aristas de la pieza, hacia afuera, hacia adentro o ambos. Las piezas complejas piden "Calcular vista previa" porque tarda varios segundos.
- **Rediseño de la interfaz** (pantalla ancha): inspector con Piezas y Propiedades, barra de acciones de la selección, barra de vista, pie de estado, menú Agregar y buscador Ctrl K, sobre la base del artefacto "Rediseño Constructor 3D", conservando el estilo liquid glass, los íconos 3D y los atajos (S = Escalar).
- **Paleta azul y dorado** (como Qlamps), en oscuro y claro, e **íconos duotono** (línea azul, relleno translúcido, detalle dorado); las formas de Agregar siguen siendo renders 3D.
- **Cinta con pestañas** (pantalla ancha): Crear, Objeto, Editar, Aspecto y Preparar, con botones grandes agrupados; riel de Mover/Rotar/Escalar a la izquierda e inspector con pestañas Propiedades y Piezas, donde se acopla el panel de la herramienta activa. Tablet y celular no cambian.
- **Cámara ortográfica** (botón en la barra de vista o tecla O): Frente, Arriba y Lado sin perspectiva y 3D como isométrica.
- **Imán de rotación**: al rotar con el gizmo la pieza se pega a los múltiplos de 45° (Shift lo desactiva).
- **Engranaje y tuerca paramétricos** (Más formas › Taller): dientes, profundidad y hueco; rosca M2–M12.
- **Vista previa de Cortar para la cama**: planos dorados que muestran dónde se corta.
- Se quitaron "Ejemplos" y la integración con Tripo.
- **Pruebas**: carpeta `tests/`.
