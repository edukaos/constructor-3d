# Constructor 3D — Studio v3 (versión de prueba)

## Para continuar con Claude u otro editor

Rama: `feature/studio-v3`. Base: `309888f007980953e1c5e5e69358349549d38ab6` de `main` (14/11/2026).

Actualizar el repositorio y cambiar a esta rama antes de editar. No partir de un `index.html` antiguo adjunto a un chat. La rama principal y el despliegue público no se modificaron. El workflow existente publica solamente los pushes a main (o una ejecución manual).

## Alcance implementado

- Interfaz azul/dorada con superficies opacas, riel con nombres y grupos Agregar, Modificar, Preparar y Biblioteca. Se conservan herramientas anteriores mediante botones originales y buscador Ctrl+K. En pantallas pequeñas se conserva la disposición compacta previa.
- Resta guiada de **dos piezas**: selectores Conservar/Quitar, intercambiar, vista previa calculada con Manifold, aplicar/cancelar. Si se conservan originales, se ocultan para evitar exportaciones duplicadas. Se usa el resultado de la vista previa al aplicar. Cancelar no agrega entradas al deshacer.
- Indicador de autoguardado local: pendiente, guardando, guardado, error y pausa por escena pesada. Reintento al tocar el indicador. Cola de escritura para no invertir versiones; una transacción vieja no marca cambios nuevos como guardados. Las escenas pesadas conservan la última copia en vez de borrarla. Deshacer/rehacer también se guardan.
- Preparar para imprimir: revisión de piezas visibles no marcadas como agujero; posición respecto de cama y análisis de malla, con accesos a reparar, apoyar, cama, cortar y exportar. Al cambiar el modelo se invalida el resultado. No evalúa soportes ni garantiza imprimibilidad.
- Cortes: vista previa real de las partes y encastres antes de aplicar. Selector automático/manual y grilla de hasta cuatro posiciones normalizadas por plano. Rechaza posiciones sin material suficiente, en lugar de generar espigas fuera de la pieza. La grilla se aplica a todos los planos; no es edición libre individual de cada espiga.
- Mi biblioteca: guardar selección (una o varias piezas), buscar, insertar centrada y apoyada, descargar JSON y quitar con deshacer inmediato. Persistencia local en IndexedDB, no sincronización en la nube. Los JSON se pueden abrir con Abrir proyecto.
- No se implementó historial paramétrico editable. El deshacer/rehacer existente permanece.

## Archivos y arquitectura

- `index.html`: motor y UI anteriores; hooks de guardado, `buildCutMeshes` compartido, selección de espigas e integración explícita al final del módulo.
- `studio-v3.js`: `installStudio(api)` recibe las dependencias del motor; contiene paneles, biblioteca y gestión de previews. Los meshes temporales no entran en `objs`, no se serializan ni exportan. Se liberan al cancelar o invalidar.
- `studio-v3.css`: overrides de presentación, después del CSS original.
- `sw.js`: nueva versión de caché y ambos assets nuevos para uso offline. Solo limpia cachés `c3d-`.
- `tests/v3-basic.mjs`: validaciones sin instalar dependencias.

Convención del motor: **Y es altura; X ancho; Z profundidad**. Mantenerla coherente en UI y exportación. No cambiar los ejes siguiendo literalmente la imagen conceptual.

## Verificación realizada

Ejecutado `node tests/v3-basic.mjs`: sintaxis de los tres scripts, éxito/fallo/reintento de autoguardado, conservación de copia con escena pesada, carreras de guardado, limpieza ante cortes fallidos y hooks de deshacer/rehacer. Todos pasan.

Estas pruebas aíslan funciones con dependencias simuladas: **no validan WebGL, Manifold real ni interacción visual**. No se ejecutó la suite Playwright anterior ni una revisión visual del navegador. La prueba manual se acordó con Eduardo para reducir iteraciones y consumo. No considerar esta rama lista para producción sin esa prueba.

## Cómo abrir esta versión

1. Descargar o clonar esta rama completa, incluyendo `studio-v3.js` y `studio-v3.css`.
2. Servir su carpeta mediante un servidor local (por ejemplo, `python -m http.server 8000` o Live Server).
3. Abrir `http://localhost:8000`. No abrir index.html directamente con doble clic: usa módulos.
4. Necesita conexión para cargar las dependencias CDN la primera vez. Abrir desde el mismo origen para recuperar el autoguardado; otro puerto/origen tiene almacenamiento diferente.

## Checklist para Eduardo

- [ ] Abrir la app sin errores; probar escritorio y ventana angosta, modo claro/oscuro.
- [ ] Abrir un proyecto existente, agregar forma, texto y SVG; mover/rotar/escalar; unir y exportar STL/3MF.
- [ ] Cambiar una pieza, esperar Guardado local, refrescar; deshacer y refrescar de nuevo.
- [ ] Restar cilindro de cubo: previsualizar, cancelar, intercambiar, aplicar, deshacer. Repetir con Conservar originales.
- [ ] Guardar selección en biblioteca, refrescar, agregarla, descargarla y abrir ese JSON. Quitar y deshacer.
- [ ] Cortar una pieza grande con espigas automáticas, luego manuales; comprobar posiciones en la vista previa y exportar cada parte. Probar también una ubicación inválida.
- [ ] En Preparar: probar pieza flotante, fuera de cama y malla abierta. Verificar que un cambio invalide la revisión.
- [ ] Revisar los STL en el laminador y hacer una pequeña prueba física de encastre; la holgura es radial como en el motor anterior.

Pendiente de esa revisión: ajuste fino visual, rendimiento sobre modelos grandes y compatibilidad geométrica con archivos reales. Si se agregan modificaciones, ejecutar nuevamente las pruebas y actualizar este archivo.
