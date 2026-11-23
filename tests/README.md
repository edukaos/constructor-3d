# Pruebas automáticas

Abren `../index.html` en Chromium (Playwright) y usan las librerías desde `node_modules` en vez de internet.

    cd tests && npm install && npx playwright install chromium && npm test

Cada archivo `tN.mjs` prueba una parte (formas, exportar, importar, textura, etc.) e imprime `OK` o la lista de fallas.

`harness.mjs` adapta las pruebas al diseño en cinta: si un botón original está oculto (porque la cinta muestra un botón espejo) lo acciona igual, y las piezas nuevas que aparecen como fantasma se apoyan en el centro de la cama. Así las pruebas siguen usando los botones y campos de siempre (`#dup`, `#px`, `[data-add=box]`…).
