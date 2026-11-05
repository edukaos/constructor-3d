# Pruebas automáticas

Abren `../index.html` en Chromium (Playwright) y usan las librerías desde `node_modules` en vez de internet.

    cd tests && npm install && npx playwright install chromium && npm test

Cada archivo `tN.mjs` prueba una parte (formas, exportar, importar, textura, etc.) e imprime `OK` o la lista de fallas.
