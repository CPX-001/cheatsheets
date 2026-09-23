---
title: 'Docker · Dockerfile'
date: '2026-09-21'
updated: '2026-09-21'
layout: 'learning'
language: 'es'
disableNunjucks: true
icon: 'docker'
categories: ['Toolkit']
intro: 'Cómo definir una imagen: instrucciones del Dockerfile, contexto de construcción, caché y ciclo de actualización de un servidor Nginx.'
heading: 'Dockerfile'
eyebrow: 'Construcción de imágenes'
learning_classes: 'learning-page learning-docker learning-page-cards'
background: 'bg-gradient-to-r from-sky-700 to-blue-700 !text-white'
---

## 1. Del Dockerfile al contenedor

Un **Dockerfile** es un archivo de texto que describe cómo preparar una imagen: de qué entorno partir, qué archivos incorporar y qué comando utilizar al arrancar. Docker lee sus instrucciones durante la **construcción**. El resultado es una imagen que permite crear contenedores con ese contenido.

```text
Dockerfile + archivos del proyecto
              ↓ docker build
            imagen
              ↓ docker run
          contenedor activo
```

Construir no equivale a arrancar la aplicación. La imagen conserva archivos y valores de configuración; el contenedor ejecuta el programa. Crear otro contenedor utiliza esa imagen sin repetir las instrucciones del Dockerfile.

Esta guía desarrolla la construcción presentada en [Docker · Base](/docker.html). Se necesita Docker instalado, el motor arrancado y una terminal Bash conectada al motor local. `docker version` debe mostrar información de cliente y servidor.

El ejemplo será una página de una biblioteca servida por **Nginx**, un servidor web que recibe peticiones HTTP y devuelve archivos. Su imagen oficial ya incluye el programa; la imagen propia añadirá el HTML y declarará su arranque.

## 2. Preparar los archivos del proyecto

Los archivos se guardan en el **host**, la máquina desde la que se trabaja. Desde la carpeta en la que se guardará el proyecto:

```bash
mkdir -p web-docker/sitio
cd web-docker
```

`mkdir -p` crea las carpetas necesarias y acepta las que ya existen. Si el proyecto de la guía Base ya está preparado, se puede reutilizar entrando directamente en `web-docker`. Los siguientes comandos se ejecutan desde esa carpeta.

Con un editor, preparar esta estructura:

```text
web-docker/
├── Dockerfile
├── .dockerignore
└── sitio/
    └── index.html
```

`Dockerfile`, sin extensión, contiene las instrucciones. `.dockerignore` filtra los archivos disponibles durante la construcción. `sitio/index.html` será la página que se incorpora a la imagen:

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

HTML describe el documento que interpreta el navegador. `doctype` declara el formato; `lang` indica el idioma y `charset` permite representar las tildes. `title` da nombre a la pestaña. Dentro de `body`, `h1` contiene el encabezado y `p`, un párrafo. Nginx entrega este archivo sin ejecutar Python ni consultar una base de datos.

## 3. Leer las instrucciones del Dockerfile

Guardar este contenido en `web-docker/Dockerfile`:

```dockerfile
FROM nginx:stable-alpine
WORKDIR /usr/share/nginx/html
COPY sitio/ ./
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Seleccionar una base y copiar archivos

**`FROM`** selecciona la imagen de partida. `nginx` es su nombre; `stable-alpine` es una etiqueta que identifica la variante estable basada en Alpine, una distribución Linux pequeña. Se heredan los archivos de Nginx y su configuración. La etiqueta puede actualizarse en el registro y no identifica para siempre los mismos archivos.

**`WORKDIR`** fija el directorio de trabajo dentro de la imagen. En este caso, `/usr/share/nginx/html` es la carpeta que la configuración de Nginx sirve por defecto. Si la ruta no existe, Docker la crea. También será el directorio de trabajo predeterminado al ejecutar el contenedor.

**`COPY`** incorpora archivos del proyecto. Sus dos rutas pertenecen a entornos distintos:

| Parte    | Dónde se interpreta                           | Resultado                                    |
| -------- | --------------------------------------------- | -------------------------------------------- |
| `sitio/` | Dentro del contexto de construcción del host. | Selecciona el contenido de la carpeta local. |
| `./`     | Dentro de la imagen, respecto a `WORKDIR`.    | Lo coloca en `/usr/share/nginx/html/`.       |

El archivo resultante es `/usr/share/nginx/html/index.html` y sustituye la bienvenida de Nginx. `WORKDIR` no cambia la carpeta de la terminal del host ni el origen desde el que busca `COPY`. La copia queda incorporada a la imagen; no establece una conexión permanente con el archivo local.

### Declarar el puerto y el arranque

**`EXPOSE 80`** documenta el puerto que utiliza el servicio. No configura Nginx ni publica el puerto hacia el host. Nginx ya escucha en el puerto 80 por su configuración; el acceso desde el navegador se establecerá al ejecutar el contenedor.

**`CMD`** guarda el comando predeterminado de arranque en una lista. Cada elemento tiene una función:

| Elemento        | Función                                                                                      |
| --------------- | -------------------------------------------------------------------------------------------- |
| `"nginx"`       | Nombre del programa que inicia el servidor.                                                  |
| `"-g"`          | Opción de Nginx que permite indicar una directiva global.                                    |
| `"daemon off;"` | Directiva que mantiene el servidor en primer plano; el punto y coma pertenece a su sintaxis. |

El contenedor permanece activo mientras su proceso principal continúa. Mantener Nginx en primer plano permite que Docker gestione su ejecución. Este comando no se ejecuta durante la construcción.

La imagen oficial ya declara ese puerto y ese `CMD`; aquí aparecen explícitamente para mostrar su función. Además, se hereda su **`ENTRYPOINT`**, el programa `/docker-entrypoint.sh`: prepara la configuración y después ejecuta el comando de `CMD`. En este ejemplo no es necesario reemplazarlo.

### Distinguir RUN de CMD

**`RUN`** ejecuta un comando durante la construcción, por ejemplo para instalar dependencias cuyos archivos deben permanecer en la imagen. Esta web no lo necesita porque Nginx ya viene instalado.

`CMD` define el arranque futuro; `RUN` realiza una operación para preparar la imagen. Iniciar un servidor mediante `RUN` no lo convierte en el proceso principal de los contenedores posteriores. Su arranque se configura mediante `CMD` y, cuando existe, `ENTRYPOINT`.

## 4. Entender el contexto y la caché

El **contexto de construcción** es el conjunto de archivos disponibles para construir una imagen. En este proyecto será la carpeta `web-docker`: incluye el Dockerfile y `sitio/`. `COPY` busca su origen dentro de ese contexto, aunque el destino sea una ruta completamente distinta dentro de la imagen.

En `.dockerignore`, guardar:

```text
.git
.env
```

Cada línea excluye una ruta. `.git` contiene el historial de un repositorio y `.env` suele guardar configuración local; no necesitan existir para incluirlos en el filtro. Los archivos excluidos no están disponibles para `COPY`. Este archivo afecta a la construcción, no a los montajes que puedan configurarse después al ejecutar un contenedor.

Docker puede **reutilizar resultados anteriores** cuando una instrucción y sus entradas no han cambiado. Por eso una segunda construcción suele ser más rápida. Si cambia `sitio/index.html`, el siguiente `build` debe actualizar el paso `COPY` y los pasos que dependan de él.

El orden importa: las operaciones costosas que no cambian con frecuencia suelen colocarse antes de copiar archivos que se editan continuamente. Aquí la imagen base ya contiene el programa, de modo que basta con copiar la página. No hace falta desactivar la caché para incorporar una modificación normal del HTML.

## 5. Construir la imagen y comprobar el resultado

Desde `web-docker`:

```bash
docker build -t biblioteca-web:1 .
```

`build` inicia la construcción. `-t` asigna el nombre `biblioteca-web` y la etiqueta `1`, elegida para esta imagen local. El punto final selecciona la carpeta actual como contexto; allí se busca el archivo predeterminado `Dockerfile`. `biblioteca-web:1` es el nombre de una imagen, no una carpeta.

Al terminar, crear un contenedor:

```bash
docker run -d --name web-dockerfile -p 127.0.0.1:8081:80 biblioteca-web:1
docker ps
```

`-d` deja el proceso en segundo plano. `--name` asigna un nombre al contenedor para administrarlo después. `-p` conecta el puerto local **8081** con el **80** del contenedor; `127.0.0.1` limita el acceso a la máquina local. Si 8081 está libre, permite ejecutar este contenedor junto al ejemplo de Base que utiliza 8080.

Abrir `http://127.0.0.1:8081` debe mostrar «Biblioteca del barrio». `docker ps` confirma que el contenedor está activo; ver la página confirma que sirve el contenido esperado. La imagen permanece local: construirla no la publica en un registro.

Si la página no aparece, consultar:

```bash
docker logs --tail 30 web-dockerfile
```

`logs` muestra la salida del programa; `--tail 30` limita la consulta a sus últimas 30 líneas. Los errores de Nginx ayudan a distinguir un problema de arranque de uno de acceso al puerto.

## 6. Incorporar cambios y recrear el contenedor

Modificar el horario en `sitio/index.html` cambia el archivo del host. El contenedor sigue sirviendo la copia de su imagen. Para aplicar el cambio:

```bash
docker build -t biblioteca-web:1 .
docker stop web-dockerfile
docker rm web-dockerfile
docker run -d --name web-dockerfile -p 127.0.0.1:8081:80 biblioteca-web:1
```

La construcción actualiza la imagen asociada al nombre `biblioteca-web:1`. `stop` detiene el contenedor anterior y `rm` lo elimina; el nuevo `run` crea otro con la imagen actualizada. Recargar el navegador debe mostrar el nuevo horario.

**Una imagen actualizada no modifica contenedores existentes.** Detener y volver a iniciar el mismo contenedor conserva su imagen original. En este ejemplo no se guardan datos generados dentro del contenedor: el HTML se conserva en el proyecto y puede incorporarse otra vez.

Para buscar una versión actualizada de la imagen base durante la construcción:

```bash
docker build --pull -t biblioteca-web:1 .
```

`--pull` solicita comprobar la imagen de partida en el registro. Después sigue siendo necesario recrear el contenedor para utilizar el resultado.

[Docker Compose](/docker-compose.html) explica cómo guardar en un archivo la construcción, los puertos y otras opciones de ejecución. El Dockerfile conserva su función: definir la imagen que Compose podrá construir y utilizar.

Referencias: [instrucciones de Dockerfile](https://docs.docker.com/reference/dockerfile/), [contexto de construcción](https://docs.docker.com/build/concepts/context/), [caché de construcción](https://docs.docker.com/build/cache/) e [imagen oficial de Nginx](https://hub.docker.com/_/nginx).
