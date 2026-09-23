---
title: 'Docker Compose'
date: '2026-09-21'
updated: '2026-09-21'
layout: 'learning'
language: 'es'
disableNunjucks: true
icon: 'docker'
categories: ['Toolkit']
intro: 'Cómo describir una aplicación en compose.yaml, construir su imagen y administrar sus contenedores, puertos y archivos.'
heading: 'Docker Compose'
eyebrow: 'Configuración y ejecución'
learning_classes: 'learning-page learning-docker learning-page-cards'
background: 'bg-gradient-to-r from-sky-700 to-blue-700 !text-white'
---

## 1. Qué administra Compose

Docker Compose permite guardar la configuración de una aplicación en `compose.yaml` y administrarla desde la terminal. Es útil incluso con un solo contenedor: los puertos, la imagen y los archivos compartidos quedan definidos en un archivo que puede reutilizarse.

La [base de Docker](/docker.html) explica imágenes, contenedores y puertos. Aquí se continúa con la misma web informativa de una biblioteca, servida por Nginx, sin añadir otros componentes.

| Elemento         | Función                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------- |
| `docker compose` | Herramienta del cliente Docker que interpreta la configuración y envía órdenes al motor. |
| `compose.yaml`   | Archivo de texto que describe los componentes de la aplicación y cómo deben ejecutarse.  |
| Servicio         | Definición de un componente. En esta web se llamará `web`.                               |
| Contenedor       | Instancia en ejecución creada a partir de esa definición y de una imagen.                |
| Proyecto         | Agrupación con la que Compose identifica los contenedores y la red de una aplicación.    |

Compose no es un servidor que se ejecuta dentro del contenedor. Al terminar el comando, el motor puede mantener los servicios activos. Tampoco sustituye al Dockerfile: este define **cómo construir la imagen**, mientras Compose define **cómo ejecutar la aplicación** y puede solicitar su construcción.

```text
compose.yaml → build → Dockerfile + archivos → imagen
      └────── puertos y montajes ───────────────┐
                                imagen + configuración → contenedor
```

## 2. Describir la web en compose.yaml

### Archivos y punto de partida

Se necesita Docker arrancado y Compose disponible. `docker compose version` comprueba la herramienta. Los comandos siguientes se ejecutan desde la carpeta `web-docker` del host, con esta estructura:

```text
web-docker/
├── compose.yaml
├── Dockerfile
└── sitio/
    └── index.html
```

El ejemplo utiliza el Dockerfile de la guía [Dockerfile](/docker-dockerfile.html), donde se explican sus instrucciones y el contexto de construcción. Su contenido es:

```dockerfile
FROM nginx:stable-alpine
WORKDIR /usr/share/nginx/html
COPY sitio/ ./
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Parte de una imagen con Nginx, copia `sitio` a la carpeta que sirve el servidor y establece su arranque en primer plano. `EXPOSE` documenta el puerto; su publicación hacia el host se configura aparte.

El archivo `sitio/index.html` contiene la página:

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

`title` da nombre a la pestaña; `h1` y `p` representan el título visible y el párrafo. Nginx devuelve el archivo al navegador.

### Configuración completa

Crear `compose.yaml` junto al Dockerfile:

```yaml
services:
  web:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "127.0.0.1:8080:80"
```

YAML expresa la jerarquía mediante **espacios de sangría**, sin tabulaciones. `services` agrupa los servicios; `web` es el nombre elegido para este componente. El guion bajo `ports` introduce un elemento de una lista.

| Configuración            | Significado                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------ |
| `build`                  | Describe cómo obtener una imagen a partir de archivos locales.                       |
| `context: .`             | Usa como contexto de construcción la carpeta que contiene `compose.yaml`.            |
| `dockerfile: Dockerfile` | Selecciona el archivo de instrucciones, relativo al contexto.                        |
| `ports`                  | Publica puertos del contenedor en el host.                                           |
| `127.0.0.1:8080:80`      | Conecta el puerto local 8080 con el 80 del contenedor, accesible desde esta máquina. |

`context` determina qué archivos puede utilizar `COPY`; `dockerfile` determina qué instrucciones se leen. Aquí ambos apuntan a la misma carpeta. La forma breve `build: .` también serviría, porque `Dockerfile` es el nombre predeterminado de la receta.

Un servicio también puede usar una imagen existente mediante `image: nginx:stable-alpine` en lugar del bloque `build`. Esa imagen serviría la bienvenida de Nginx, porque no contiene el HTML de la biblioteca. **`image` y `build` pueden coexistir**: al construir, `image` permite asignar un nombre al resultado. Esta configuración solo usa `build`, y Compose genera el nombre. La [referencia de construcción](https://docs.docker.com/reference/compose-file/build/) detalla estas opciones.

## 3. Crear el servicio y comprobarlo

Si sigue activo el contenedor manual `web-base` de la guía Base, detenerlo con `docker stop web-base` para liberar el puerto 8080. Compose creará su propio contenedor.

Desde `web-docker`:

```bash
docker compose config
docker compose up -d --build
docker compose ps
```

`config` valida el archivo y muestra la configuración interpretada; no arranca nada. `up` crea o actualiza los recursos descritos. `--build` solicita construir la imagen antes del arranque; `-d` deja el contenedor en segundo plano y devuelve el control a la terminal.

Compose construye la imagen, prepara la red del proyecto, crea el contenedor y aplica sus puertos. El proceso de Nginx arranca con la configuración de la imagen. `ps` muestra el estado y la publicación resultantes.

Abrir `http://127.0.0.1:8080` debe mostrar **Biblioteca del barrio**. Si el puerto está ocupado por otro programa, elegir uno libre, por ejemplo `8082`, y cambiarlo tanto en `compose.yaml` como en la dirección del navegador.

El nombre del proyecto se obtiene normalmente de la carpeta, aquí `web-docker`. Compose genera nombres para sus recursos, pero los comandos utilizan **el nombre del servicio**, `web`:

```bash
docker compose logs --tail 30 web
docker compose exec web cat /usr/share/nginx/html/index.html
```

`logs` consulta la salida del servicio; `--tail 30` limita el resultado a sus últimas 30 líneas. `exec` ejecuta un proceso adicional dentro del contenedor activo. Aquí el programa `cat` muestra el archivo que Nginx puede servir, lo que permite comprobar su contenido real.

Repetir `up` administra el mismo proyecto; no añade otro contenedor en cada llamada. Si cambian la imagen o la configuración, puede sustituir el existente para aplicar esos cambios, como describe la [referencia de up](https://docs.docker.com/reference/cli/docker/compose/up/).

## 4. Aplicar cambios: construir, recrear o reiniciar

El HTML se ha copiado a la imagen. Editar `sitio/index.html` en el host no modifica esa copia. Para incorporar un horario nuevo:

```bash
docker compose up -d --build
```

La construcción vuelve a incorporar el archivo y Compose recrea el contenedor cuando cambia su imagen. **Recrear** significa retirar una instancia y crear otra con la imagen y configuración correspondientes. Los archivos guardados únicamente en la capa propia del contenedor anterior se pierden.

Las operaciones pueden ejecutarse por separado:

```bash
docker compose build
docker compose up -d
```

`build` solo prepara las imágenes; no inicia ni actualiza los contenedores existentes. El posterior `up` aplica la imagen construida. La construcción puede reutilizar pasos cuyo contenido no ha cambiado.

| Cambio o necesidad                                                    | Operación                       |
| --------------------------------------------------------------------- | ------------------------------- |
| Cambió el HTML copiado o el Dockerfile                                | `docker compose up -d --build`. |
| Cambió un puerto o montaje en `compose.yaml`                          | `docker compose up -d`.         |
| Se necesita reiniciar el mismo proceso con la configuración existente | `docker compose restart web`.   |

`restart` detiene y arranca el mismo contenedor. No reconstruye imágenes ni aplica cambios de `compose.yaml`. Tampoco `up` reconstruye automáticamente una imagen existente por detectar que se ha editado el HTML: para ese caso se indica `--build`.

## 5. Editar el HTML mediante un montaje

Durante la edición puede resultar útil que Nginx lea directamente los archivos del host. Para ello, sustituir el contenido de `compose.yaml` por esta variante completa:

```yaml
services:
  web:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "127.0.0.1:8080:80"
    volumes:
      - "./sitio:/usr/share/nginx/html:ro"
```

Aunque la clave se llame `volumes`, esta entrada define un **bind mount**, un montaje de una carpeta del host:

| Parte                   | Función                                                                  |
| ----------------------- | ------------------------------------------------------------------------ |
| `./sitio`               | Carpeta del host, relativa a `compose.yaml`; debe contener `index.html`. |
| `/usr/share/nginx/html` | Ruta donde esa carpeta aparece dentro del contenedor.                    |
| `ro`                    | Solo lectura: Nginx puede leer esos archivos sin modificarlos.           |

Aplicar la configuración:

```bash
docker compose up -d
```

Ahora, al cambiar `sitio/index.html` y recargar el navegador, aparece el contenido actualizado sin reconstruir. **El montaje oculta la copia de esa carpeta incluida en la imagen** mientras está activo; no la borra ni la actualiza.

El Dockerfile sigue copiando el HTML cuando se construye, pero el contenedor configurado con este montaje sirve la carpeta del host. Reconstruir la imagen no cambia esa prioridad. Al retirar `volumes` y ejecutar de nuevo `up -d`, vuelve a servirse la copia de la imagen. Si debe incluir las últimas ediciones, utilizar `up -d --build`.

## 6. Red, parada y retirada del proyecto

### Qué dirección se utiliza

Compose conecta el servicio a una red predeterminada. Dentro de esa red, Docker puede resolver `web` mediante su DNS interno, el sistema que convierte nombres en direcciones de red.

| Desde dónde se accede                    | Dirección de esta web    |
| ---------------------------------------- | ------------------------ |
| Navegador del host                       | `http://127.0.0.1:8080`. |
| Otro contenedor conectado a la misma red | `http://web:80`.         |
| El propio contenedor `web`               | `http://localhost:80`.   |

Dentro de un contenedor, `localhost` identifica ese mismo contenedor. Otro servicio usaría `web` y el puerto interno 80; el 8080 se ha publicado para acceder desde el host. La web actual solo necesita un servicio. La [documentación de redes de Compose](https://docs.docker.com/compose/how-tos/networking/) desarrolla esta separación.

### Conservar o retirar los contenedores

```bash
docker compose stop
docker compose start
```

`stop` detiene los servicios conservando sus contenedores. `start` arranca esas mismas instancias; no aplica una configuración nueva.

Para retirar el proyecto en ejecución:

```bash
docker compose down
```

`down` detiene y elimina los contenedores y la red predeterminada creados por Compose. Conserva las imágenes construidas y los archivos del host, incluidos `compose.yaml` y `sitio/index.html`. El siguiente `up -d` puede crear de nuevo el servicio.

Si la página no aparece, `docker compose ps -a` incluye también los contenedores detenidos. Sus registros permiten distinguir un fallo de arranque de un problema de acceso. Si aparece una versión antigua, comprobar primero si Nginx está leyendo el HTML incorporado a la imagen o la carpeta montada del host.
