# Constructor 3D

App web muy simple, estilo Microsoft 3D Builder, en un solo archivo (`index.html`).

## Qué hace
- Primitivas: cubo, esfera, cilindro, cono y toroide (25 mm por defecto).
- Mover, rotar y escalar (escalado con caja exterior), con snap opcional.
- Unir, restar, intersectar y dividir con un plano.
- Medidas, posición y rotación editables con números; bordes redondeados o chaflán en cubo y cilindro.
- Alinear, centrar, espejo, apoyar en la base, duplicar, copiar y pegar.
- Cama de impresión configurable con aviso si una pieza sobresale.
- Importar STL y exportar STL (Z hacia arriba, en mm).
- Guardar y abrir proyecto (JSON), autoguardado en el navegador, deshacer y rehacer.

## Atajos
M mover · R rotar · E escalar · 1–5 agregan formas · Ctrl+Z / Ctrl+Y · Ctrl+S · Ctrl+D · Ctrl+C / Ctrl+V · Supr · Shift/Ctrl + clic para selección múltiple.

## Uso
Abrir `index.html` en un servidor web (https recomendado). No necesita build ni backend.
Las librerías (Three.js, three-bvh-csg) se cargan desde jsDelivr, así que hace falta conexión.
