---
title: 'Docker · Base'
date: '2026-09-18'
updated: '2026-09-21'
layout: 'learning'
language: 'es'
disableNunjucks: true
icon: 'docker'
categories: ['Toolkit']
intro: 'Imágenes, contenedores, puertos y archivos: cómo ejecutar una aplicación, construir su imagen y mantener su configuración con Compose.'
heading: 'Base'
eyebrow: 'Fundamentos'
learning_classes: 'learning-page learning-docker learning-page-cards'
background: 'bg-gradient-to-r from-sky-700 to-blue-700 !text-white'
---

## 1. Qué ejecuta Docker

### Imagen, contenedor y motor

Una aplicación necesita programas, bibliotecas y archivos para funcionar. Docker permite reunir ese entorno en una **imagen** y ejecutar una instancia aislada llamada **contenedor**. Así, el servidor web puede usar sus propias dependencias sin instalarlas junto a las demás aplicaciones del ordenador.

La imagen contiene archivos y una configuración de arranque. El contenedor añade un proceso principal, configuración propia y una capa de archivos modificable. Varios contenedores pueden usar la misma imagen: cambiar un archivo dentro de uno no modifica la imagen ni los demás.

Un contenedor Linux comparte el núcleo del sistema que lo ejecuta; no necesita arrancar un sistema operativo completo. Docker Desktop utiliza un entorno Linux virtualizado cuando hace falta. El **host** es la máquina que aloja el motor; aquí será el entorno local de desarrollo.

```text
Terminal → cliente docker → motor de Docker → contenedor → servidor web
                                  ↑
                         imagen local o registro
```

El cliente `docker` envía órdenes al **motor**, que administra imágenes, contenedores, redes y almacenamiento. Un **registro**, como Docker Hub, distribuye imágenes. Descargar una imagen y ejecutar su programa son operaciones distintas.

### Preparar la terminal

Se necesita Docker instalado y arrancado según la [guía oficial de instalación](https://docs.docker.com/get-started/get-docker/). Docker Desktop incluye el motor, el cliente y Compose; en Linux también pueden instalarse Docker Engine y el complemento Compose. Los comandos usan una terminal Bash, disponible en Linux, macOS o WSL, con un motor local:

```bash
docker version
docker compose version
docker context show
```

`docker version` debe mostrar información de cliente y servidor; si solo funciona el cliente, falta conexión con el motor. El segundo comando comprueba Compose, la herramienta que leerá la configuración de la aplicación. El tercero muestra el **contexto**, la conexión de Docker seleccionada: determina qué motor recibe las órdenes.

## 2. Ejecutar un servidor y publicar su puerto

### Un contenedor con una función concreta

Nginx es un servidor web: recibe peticiones HTTP y devuelve archivos como páginas HTML. Su imagen oficial incluye el programa y una página de bienvenida. Desde la terminal del host:

```bash
docker run -d --name web-base -p 127.0.0.1:8080:80 nginx:stable-alpine
docker ps
```

`run` crea y arranca un contenedor; si la imagen no existe localmente, la descarga. Devuelve un identificador largo. Cada parte tiene una función:

| Parte                  | Significado                                                                                   |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| `-d`                   | Ejecuta el contenedor en segundo plano y devuelve el control a la terminal.                   |
| `--name web-base`      | Asigna el nombre `web-base` para las operaciones posteriores.                                 |
| `-p 127.0.0.1:8080:80` | Conecta el puerto local 8080 con el puerto 80 del contenedor.                                 |
| `nginx`                | Nombre de la imagen del servidor web.                                                         |
| `stable-alpine`        | Etiqueta que selecciona la variante estable basada en Alpine, una distribución Linux pequeña. |

Una etiqueta puede actualizarse en el registro; no identifica para siempre los mismos archivos. `docker ps` muestra los contenedores activos, incluyendo nombre, estado y puertos.

Al abrir `http://127.0.0.1:8080`, el recorrido es:

```text
Navegador → host:8080 → contenedor:80 → Nginx → página de bienvenida
```

El puerto **8080** pertenece al host y el **80** al contenedor. No tienen por qué coincidir. `127.0.0.1` limita la publicación a la interfaz local. Si 8080 está ocupado, puede sustituirse por 8081 en el comando y en la dirección del navegador.

La publicación no configura el servidor: Nginx ya escucha en el puerto 80 por su configuración de imagen. El contenedor permanece activo mientras continúa su proceso principal.

## 3. Incorporar archivos propios a una imagen

### Una página con ubicación definida

La siguiente imagen servirá una página informativa. En el host, crear una carpeta y entrar en ella:

```bash
mkdir web-docker
cd web-docker
mkdir sitio
```

Con un editor, crear estos archivos. Los comandos de construcción se ejecutan dentro de `web-docker`:

```text
web-docker/
├── Dockerfile
├── .dockerignore
└── sitio/
    └── index.html
```

Contenido de `sitio/index.html`:

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <title>Biblioteca</title>
  </head>
  <body>
    <h1>Biblioteca del barrio</h1>
    <p>Horario: de lunes a viernes, de 9:00 a 18:00.</p>
  </body>
</html>
```

HTML describe la página que interpreta el navegador. `doctype` declara el formato; `lang` indica el idioma y `charset` permite representar las tildes. `title` da nombre a la pestaña. `body` contiene el contenido visible: `h1` es el encabezado y `p`, un párrafo. Nginx envía este archivo; no ejecuta Python ni necesita una base de datos.

### La receta de construcción

En `Dockerfile`, sin extensión:

```dockerfile
FROM nginx:stable-alpine
COPY sitio/ /usr/share/nginx/html/
```

`FROM` selecciona la imagen de partida, que ya contiene Nginx. `COPY` copia el contenido de `sitio/` desde el contexto de construcción hasta `/usr/share/nginx/html/`, la carpeta que esta imagen sirve por defecto. El nuevo `index.html` sustituye la bienvenida.

También se hereda el arranque configurado por la imagen base. Una instrucción `CMD` definiría un comando de arranque predeterminado; aquí Nginx ya lo proporciona. La construcción prepara archivos, mientras que el servidor se inicia después, al ejecutar un contenedor.

En `.dockerignore`:

```text
.git
.env
```

Cada línea excluye una ruta del contexto enviado al constructor: `.git` contiene el historial del repositorio y `.env` suele contener configuración local. No es necesario que existan ahora. Este archivo evita enviar las rutas excluidas durante la construcción; no modifica los montajes configurados al ejecutar contenedores.

El tema [Dockerfile](/docker-dockerfile.html) desarrolla la lectura de las instrucciones, el contexto, la caché de construcción y la diferencia entre preparar una imagen y arrancar su programa.

## 4. Construir, ejecutar y entender el ciclo de vida

### La imagen propia

Desde `web-docker`, construir la imagen:

```bash
docker build -t biblioteca-web:1 .
```

`build` lee el `Dockerfile`. `-t` asigna el nombre `biblioteca-web` y la etiqueta `1`, elegida para esta imagen local. El punto final indica que la carpeta actual es el **contexto de construcción**, de donde puede obtener archivos `COPY`.

Docker puede reutilizar resultados de pasos anteriores para acelerar construcciones. Cuando cambia `sitio/index.html`, vuelve a ejecutar la copia correspondiente. La imagen contiene una copia del HTML: no queda vinculada automáticamente al archivo del host.

Para liberar el nombre y el puerto utilizados por la bienvenida y arrancar la imagen propia:

```bash
docker stop web-base
docker rm web-base
docker run -d --name web-base -p 127.0.0.1:8080:80 biblioteca-web:1
```

Ahora `http://127.0.0.1:8080` muestra la biblioteca. La imagen permanece en el motor local; no se ha enviado a un registro.

### Detener no equivale a eliminar

| Operación               | Resultado                                                              |
| ----------------------- | ---------------------------------------------------------------------- |
| `docker stop web-base`  | Solicita terminar el proceso principal y detiene el contenedor.        |
| `docker start web-base` | Arranca ese mismo contenedor con su imagen y configuración originales. |
| `docker ps -a`          | Incluye también contenedores detenidos.                                |
| `docker rm web-base`    | Elimina el contenedor detenido y su capa de archivos propia.           |

Detener conserva los archivos de esa capa; eliminarla los pierde. La imagen sigue disponible para crear otro contenedor. Ejecutar otra vez `run` con un nombre existente produce un conflicto: `run` crea, mientras que `start` reutiliza.

Construir una imagen actualizada no cambia los contenedores existentes. Para utilizar el nuevo contenido hay que recrearlos: eliminar la instancia anterior y crear otra desde la imagen nueva.

## 5. Compartir archivos y conservar datos

### Un montaje para trabajar con el HTML local

Un **bind mount** hace visible una carpeta del host dentro del contenedor. Permite que Nginx lea directamente el HTML local durante la edición, sin reconstruir una imagen tras cada cambio.

Desde `web-docker`, sustituir el contenedor anterior por uno con montaje:

```bash
docker stop web-base
docker rm web-base
docker run -d --name web-base -p 127.0.0.1:8080:80 \
  --mount "type=bind,source=$(pwd)/sitio,target=/usr/share/nginx/html,readonly" \
  nginx:stable-alpine
```

La barra `\` continúa el mismo comando en otra línea. `--mount` describe el montaje: `type=bind` selecciona una ruta del host; `source` identifica su origen y `target`, dónde aparece en el contenedor. Bash sustituye `$(pwd)` por la ruta de la carpeta actual. `readonly` permite al contenedor leer esos archivos sin modificarlos.

Tras cambiar el horario en `sitio/index.html` y recargar el navegador, Nginx sirve el nuevo contenido. El montaje oculta los archivos que la imagen traía en esa carpeta mientras está activo; no los modifica. La carpeta `sitio` debe existir en el host del motor.

### Un volumen tiene otra finalidad

Un **volumen con nombre** es un almacenamiento administrado por Docker que se monta en una ruta del contenedor y puede reutilizarse al recrearlo. Resulta apropiado para archivos generados por una aplicación que deben sobrevivir a su sustitución, como documentos recibidos de sus usuarios.

| Ubicación                            | Uso habitual                             | Al eliminar el contenedor                |
| ------------------------------------ | ---------------------------------------- | ---------------------------------------- |
| Capa propia del contenedor           | Archivos temporales de ejecución         | Se elimina.                              |
| Carpeta del host mediante bind mount | Código o archivos editados desde el host | La carpeta permanece.                    |
| Volumen con nombre                   | Datos gestionados por la aplicación      | Permanece hasta eliminarlo expresamente. |

Un volumen solo conserva lo que la aplicación escribe en su ruta montada. No guarda cualquier archivo del contenedor ni sustituye una copia de seguridad. Esta web solo lee su HTML, por lo que no necesita un volumen para datos.

## 6. Describir la aplicación con Compose

### La configuración queda en un archivo

Compose permite guardar la configuración en `compose.yaml` y gestionar el conjunto mediante comandos. Un **servicio** es la definición de un componente ejecutable; aquí habrá uno llamado `web`.

Crear `compose.yaml` junto al `Dockerfile`:

```yaml
services:
  web:
    build: .
    ports:
      - "127.0.0.1:8080:80"
```

`services` agrupa las definiciones. `web` es el nombre elegido para identificar este servicio. `build: .` pide construir la imagen desde la carpeta del archivo. `ports` declara una lista de publicaciones con el mismo formato utilizado en `-p`. YAML expresa la jerarquía mediante espacios de indentación; no deben sustituirse por tabulaciones.

Esta configuración usa el HTML copiado por el Dockerfile. No declara el montaje anterior: los cambios posteriores en `sitio` requerirán reconstruir la imagen.

Liberar el contenedor creado manualmente y arrancar Compose desde `web-docker`:

```bash
docker stop web-base
docker rm web-base
docker compose config
docker compose up -d --build
docker compose ps
```

`config` comprueba y muestra la configuración interpretada. `up` crea o actualiza los recursos necesarios; `--build` construye antes de arrancar y `-d` deja los contenedores en segundo plano. `ps` muestra los servicios en ejecución. La biblioteca continúa disponible en la misma dirección.

Compose agrupa los recursos en un **proyecto**, cuyo nombre se obtiene normalmente de la carpeta. Genera nombres de contenedor e imagen a partir de él. Sus comandos usan `web`, el nombre del servicio, sin exigir conocer el nombre completo del contenedor.

### La red interna

Compose crea una red predeterminada. Otro servicio en esa red podría acceder a Nginx como `http://web:80`: `web` se resuelve mediante el DNS interno de Docker, que traduce nombres a direcciones de red. Desde el navegador del host se usa `http://127.0.0.1:8080`.

Dentro de cada contenedor, `localhost` apunta a ese mismo contenedor. Para comunicarse con otro se utiliza su nombre de servicio y su puerto interno; no hace falta pasar por el puerto publicado en el host.

El tema [Docker Compose](/docker-compose.html) explica con más detalle cómo se conectan el archivo YAML y el Dockerfile, cómo declarar montajes y cómo aplicar los cambios de la aplicación.

## 7. Aplicar cambios sin confundir las operaciones

### Código, imagen y contenedor se actualizan por separado

Para incorporar una modificación del HTML o del Dockerfile en esta configuración:

```bash
docker compose up -d --build
```

Compose construye y sustituye el contenedor cuando cambia su imagen. Si solo cambia `compose.yaml`, por ejemplo el puerto del host, `docker compose up -d` aplica esa configuración y recrea lo necesario. Reiniciar un contenedor existente no cambia cómo fue creado.

Para actualizar la imagen base Nginx durante la construcción:

```bash
docker compose build --pull
docker compose up -d
```

`build --pull` intenta obtener una versión actual de las imágenes base antes de construir. El posterior `up` aplica la imagen construida. Descargar una base actualizada, construir la imagen propia y recrear el contenedor son pasos diferentes.

| Operación                            | Qué cambia                                                                                         |
| ------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Editar `sitio/index.html`            | El archivo del host; con bind mount, Nginx lo ve directamente.                                     |
| `git pull`, si existe un repositorio | Los archivos del proyecto desde Git.                                                               |
| `docker pull nginx:stable-alpine`    | La imagen descargada, sin sustituir contenedores.                                                  |
| `docker compose pull`                | Descarga imágenes declaradas con `image:`; no obtiene código desde Git ni construye el Dockerfile. |
| `docker compose up -d --build`       | Construye el proyecto y aplica la imagen a los contenedores necesarios.                            |

El ejemplo utiliza `build:`, por lo que su actualización se hace construyendo. `image:` se utiliza cuando el servicio debe partir de una imagen identificada, por ejemplo `nginx:stable-alpine`.

## 8. Inspeccionar, detener y resolver los primeros fallos

### Ver lo que ocurre dentro

Desde la carpeta del proyecto:

```bash
docker compose logs --tail 30 web
docker compose exec web cat /usr/share/nginx/html/index.html
```

`logs` muestra la salida registrada por el servicio; `--tail 30` limita la consulta a las últimas 30 líneas. Nginx registra peticiones y errores. `exec` ejecuta un proceso adicional en el contenedor activo: aquí `cat` muestra el archivo que realmente puede servir Nginx.

Para una inspección interactiva, `docker compose exec web sh` abre un intérprete de comandos dentro del contenedor. `exit` cierra ese intérprete; Nginx sigue activo. Los cambios manuales hechos allí no quedan incorporados al Dockerfile.

### Detener el proyecto

`docker compose stop` detiene los servicios conservando sus contenedores; `docker compose start` vuelve a arrancarlos. Para retirar los contenedores y la red creada para el proyecto:

```bash
docker compose down
```

Los archivos del host y las imágenes construidas permanecen. Los volúmenes con nombre tampoco se eliminan por defecto; `down --volumes` solicita eliminar los volúmenes gestionados por ese proyecto y sus datos.

| Síntoma                              | Comprobación concreta                                                               |
| ------------------------------------ | ----------------------------------------------------------------------------------- |
| No se conecta con el motor           | `docker version`, motor arrancado y contexto seleccionado.                          |
| Nombre de contenedor ocupado         | `docker ps -a`: puede existir aunque esté detenido.                                 |
| Puerto ya asignado                   | Liberar el contenedor anterior o cambiar el puerto del host.                        |
| El servicio termina al arrancar      | `docker compose ps -a` y los registros de `web`.                                    |
| La página muestra contenido anterior | Revisar si usa una copia de la imagen o un montaje; reconstruir cuando corresponda. |
| Error al montar `sitio`              | Comprobar la carpeta actual y que la ruta del host existe.                          |

Un estado activo confirma que el proceso sigue ejecutándose. La comprobación funcional consiste en abrir la página y verificar que contiene el HTML esperado.

Referencias: la [imagen oficial de Nginx](https://hub.docker.com/_/nginx) documenta su carpeta web y arranque; la [referencia de Dockerfile](https://docs.docker.com/reference/dockerfile/) define las instrucciones; la [construcción con Compose](https://docs.docker.com/reference/compose-file/build/) detalla `build` y la [referencia de servicios](https://docs.docker.com/reference/compose-file/services/) describe las opciones de ejecución.
