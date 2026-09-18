# Sheet Codes

Apuntes de Django, Docker y Redis en español: 22 temas y 3 glosarios.

**Web:** https://app.sheet-codes.workers.dev

## Desarrollo local

```bash
nvm use
npx pnpm@10.32.1 install --frozen-lockfile
npm run dev
```

Abre http://localhost:4000. Los 25 documentos están en `source/_posts/`.
La plantilla de lectura es `themes/coo/layout/learning.ejs`; los estilos comunes,
`themes/coo/source/css/learning.css`. El catálogo conserva los tres menús de temas
de la versión publicada. Las rutas existentes se mantienen.

Los temas usan `learning-page-cards`; los tres glosarios comparten
`learning-glossary`. `disableNunjucks: true` permite explicar templates Django
sin que Hexo intente ejecutar su sintaxis. El índice se genera a partir de los
encabezados del documento.

## Verificación

```bash
npm run lint:check
npm run build
npm run test:build
```

La comprobación exige exactamente las 25 rutas, las tres familias del catálogo,
estilos de lectura consistentes, todos los encabezados renderizados y enlaces
internos válidos. Los cambios de interfaz requieren además comprobar búsqueda,
menús, copia de código, navegación con teclado y pantallas estrechas.

Los ejemplos explican en qué terminal, archivo o intérprete se ejecutan.
Django utiliza la serie 5.2; los ejemplos de contenedores, Python 3.12 y Redis 8.
El contenido enlaza tutoriales didácticos para ampliar los conceptos.

## Publicación en Cloudflare

El destino es el Worker `app` de **`sheet-codes.workers.dev`**. La cuenta conectada
debe ser la propietaria de ese subdominio y Worker antes de publicar. Una cuenta
con el mismo nombre de Worker en otro subdominio no es el destino correcto.

```bash
npx wrangler@4.131.1 whoami
npm run deploy
```

El despliegue genera `public/`, valida el sitio y publica los assets mediante
`wrangler.jsonc`. GitHub Actions comprueba los cambios; publicar en GitHub y
desplegar el Worker son operaciones independientes. No se guardan credenciales
de Cloudflare en el repositorio.

Después de desplegar, comprueba el contenido cambiado y `site-version.json`
en la URL pública. El workflow manual `Check public site` verifica todas las
rutas del catálogo y puede exigir un commit concreto. Un build o dry-run no
demuestra que el sitio público esté actualizado.

## Procedencia y licencia

La interfaz y organización por temas se recuperaron de la versión publicada el
18 de septiembre de 2026, que no estaba incorporada en `origin/main`.
El proyecto conserva la base de [Fechin/reference](https://github.com/Fechin/reference)
y sus atribuciones. Consulta [NOTICE](NOTICE), [CHANGELOG.md](CHANGELOG.md)
y [LICENSE](LICENSE). Licencia **GPL-3.0**.
