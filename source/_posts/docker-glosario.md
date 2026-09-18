---
title: 'Docker · Glosario'
date: '2026-09-18'
updated: '2026-09-19'
layout: 'learning'
language: 'es'
disableNunjucks: true
icon: 'docker'
categories: ['Toolkit']
intro: 'Comandos y conceptos con su contexto: qué recurso cambia cada uno, dónde se ejecuta y qué conviene observar después.'
heading: 'Glosario de Docker'
eyebrow: 'Referencia rápida · Docker'
learning_classes: 'learning-page learning-docker learning-glossary'
background: 'bg-gradient-to-r from-sky-700 to-blue-700 !text-white'
---

## Conceptos de ejecución

### Imagen y contenedor

La imagen contiene archivos y metadatos para arrancar. El contenedor es una instancia con configuración, capa escribible y proceso principal. Cambiar un contenedor no modifica la imagen; construir una imagen nueva no actualiza automáticamente contenedores existentes. [Fundamentos](/docker.html).

### Cliente, motor y contexto

`docker` es el cliente; el motor administra recursos y procesos. El contexto selecciona el motor al que se conecta. En la terminal del host, `docker context show` y `docker version` permiten comprobar destino y conexión. Docker Desktop puede alojar el motor Linux en una máquina virtual.

### Registro, etiqueta y digest

Un registro almacena imágenes. En `redis:8-alpine`, `redis` identifica el repositorio y `8-alpine` la etiqueta. Una etiqueta puede cambiar; un digest identifica contenido concreto. Descargar no equivale a arrancar. [Producción](/docker-produccion.html).

## Crear y manejar contenedores

### run

```bash
docker run -d --name redis-apuntes -p 127.0.0.1:6379:6379 redis:8-alpine
```

Se ejecuta en el host y crea un contenedor nuevo. `-d` lo separa de la terminal; `--name` lo identifica; `-p` publica un puerto. Si ya existe ese nombre, `run` no lo reutiliza: revisa su estado o elige otro recurso conscientemente.

### ps, logs y exec

```bash
docker ps -a
docker logs --tail=50 redis-apuntes
docker exec redis-apuntes redis-cli PING
```

`ps -a` incluye detenidos; `logs` lee stdout/stderr del contenedor; `exec` crea otro proceso dentro de uno activo. El último comando ejecuta el cliente Redis y debe responder `PONG`; no comprueba todavía el acceso desde otro contenedor.

### stop, start y rm

`stop` termina el proceso conservando el contenedor. `start` arranca ese mismo contenedor con su configuración. `rm` lo elimina y descarta su capa escribible. Los volúmenes con nombre tienen identidad independiente. `--rm` en `run` elimina automáticamente ese contenedor cuando termina.

## Construcción

### Contexto y dockerignore

```bash
docker build -t web-articulos:dev .
```

El punto selecciona la carpeta cuyos archivos puede copiar el build. `.dockerignore` excluye archivos, como secretos, `.venv` y datos de desarrollo. El contexto no es la carpeta activa dentro del contenedor. [Dockerfile completo](/docker-dockerfile.html).

### FROM, RUN, COPY y WORKDIR

`FROM` selecciona base; `RUN` ejecuta durante la construcción; `COPY` incorpora archivos del contexto; `WORKDIR` fija la carpeta para instrucciones y ejecución posteriores. Separar la copia de dependencias de la del código facilita reutilizar capas del build.

### CMD, ENTRYPOINT y EXPOSE

`CMD` establece el comando o argumentos predeterminados. `ENTRYPOINT` define un ejecutable de entrada con reglas de combinación distintas. `EXPOSE` documenta un puerto; no lo publica. La forma de lista de un comando evita un shell intermedio innecesario.

## Redes y almacenamiento

### Puerto publicado y localhost

En `127.0.0.1:6380:6379`, 6380 es el puerto del host y 6379 el del contenedor. `localhost` apunta al entorno donde corre el cliente. Entre servicios Compose se utiliza el nombre del servicio y su puerto interno, como `redis:6379`. [Redes y datos](/docker-redes-datos.html).

### Volumen y bind mount

Un volumen es almacenamiento gestionado por Docker con ciclo de vida propio. Un bind mount expone una ruta elegida del host. Ambos montan sobre una ruta y tapan temporalmente el contenido de la imagen en ella. Un volumen no obliga a Redis a persistir memoria: el servidor también debe escribir archivos.

### UID y permisos

Los permisos de archivos dependen de identidades numéricas y del sistema de montaje. Un usuario llamado `app` dentro no coincide necesariamente con el propietario del código del host. Un error al escribir SQLite puede ser de permisos, no de red ni de SQL.

## Compose y diagnóstico

### Servicio y proyecto

Un servicio es una definición de ejecución; el proyecto agrupa servicios, redes y volúmenes de Compose. Los nombres de servicio sirven para descubrimiento dentro de su red. Cambiar el nombre del proyecto puede seleccionar recursos distintos. [Compose](/docker-compose.html).

### up, exec y run

```bash
docker compose up -d --build
docker compose exec web python manage.py check
docker compose run --rm web python manage.py check
```

Estos comandos requieren el `compose.yaml` de la guía. `up` reconcilia servicios; `exec` usa la web activa; `run` crea una instancia temporal. `restart` reinicia un contenedor, pero no incorpora por sí solo dependencias o variables nuevas.

### environment, env_file y .env

`.env` puede aportar valores para interpolar `${...}` en Compose. `environment` y `env_file` configuran variables del proceso del contenedor. Son mecanismos relacionados, pero un archivo usado para interpolación no entrega automáticamente todas sus variables a la aplicación.

### Healthcheck y depends_on

Un healthcheck ejecuta una comprobación y registra salud. `depends_on` con `service_healthy` puede ordenar la puesta en marcha. No garantiza disponibilidad futura ni reinicia por sí solo todos los dependientes. Las conexiones siguen necesitando timeouts y política de errores.

### down y down -v

`docker compose down` retira contenedores y redes del proyecto. Añadir `-v` solicita eliminar también sus volúmenes gestionados correspondientes y, con ellos, sus datos. Revisa el alcance antes de usarlo como limpieza habitual.

### inspect y stats

`inspect` muestra configuración y estado; selecciona campos concretos si vas a compartir el resultado para no exponer variables sensibles. `stats` muestra recursos y `system df` resume espacio. [Diagnóstico](/docker-diagnostico.html) explica cómo conectar estas observaciones con síntomas reales.
