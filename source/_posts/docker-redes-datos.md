---
title: 'Docker · Redes y datos'
date: '2026-09-18'
updated: '2026-09-19'
layout: 'learning'
language: 'es'
disableNunjucks: true
icon: 'docker'
categories: ['Toolkit']
intro: 'Cómo llegan las conexiones a un contenedor y dónde sobreviven sus archivos: puertos, nombres de servicio, volúmenes y bind mounts.'
heading: 'Redes y datos'
eyebrow: 'Ruta 03 de 6 · Conecta y conserva'
learning_classes: 'learning-page learning-docker learning-page-cards'
---

## 1. localhost depende de quién lo diga

### Cada entorno tiene su propia interfaz local

Desde Python ejecutado en tu ordenador, `127.0.0.1` apunta a tu ordenador. Desde Python dentro de un contenedor, apunta a ese contenedor. Por eso una aplicación web en un contenedor no llega a un contenedor Redis hermano usando `localhost:6379`.

En una red creada por Docker, los contenedores pueden resolver nombres de otros contenedores conectados. En Compose se utilizan normalmente nombres de **servicio**, como `redis`. Un nombre resoluble y un puerto abierto siguen sin demostrar que el servicio esté preparado o que acepte tus credenciales.

| Quién se conecta                       | Destino de Redis en los ejemplos |
| -------------------------------------- | -------------------------------- |
| Python del host, puerto publicado 6379 | `redis://127.0.0.1:6379/0`       |
| Servicio `web` de Compose              | `redis://redis:6379/0`           |
| `redis-cli` ejecutado dentro de Redis  | `127.0.0.1:6379`                 |

El `/0` de la URL elige una base lógica de Redis; no es una ruta HTTP. La sintaxis completa se explica en [Redis](/redis.html).

## 2. Publicar puertos y escuchar son decisiones distintas

### Hay dos números porque hay dos lados

En `-p 127.0.0.1:6380:6379`, 6380 pertenece al host y 6379 al contenedor. Un cliente del host debe usar 6380. Otro contenedor de la misma red usa el nombre del servicio y 6379; no atraviesa necesariamente esa publicación del host.

Además, el servidor debe escuchar en una dirección accesible dentro del contenedor. Un servidor web enlazado solo a `127.0.0.1:8000` puede funcionar con `curl` dentro y resultar inaccesible desde fuera. `0.0.0.0:8000` escucha en sus interfaces IPv4. El puerto publicado conecta esa frontera con el host; `EXPOSE` en el Dockerfile solo documenta la intención.

### Una red explícita para observar el recorrido

Estos comandos se ejecutan en el host. Crean una red de desarrollo y un Redis sin publicar un puerto al exterior:

```bash
docker network create red-apuntes
docker run -d --name redis-red --network red-apuntes redis:8-alpine
docker run --rm --network red-apuntes redis:8-alpine redis-cli -h redis-red PING
```

El último comando crea un contenedor temporal cuyo proceso principal es el cliente. El cliente resuelve `redis-red` dentro de esa red y debería recibir `PONG`. `--rm` elimina ese cliente temporal cuando termina, no el servidor `redis-red`.

## 3. Dónde se escriben los archivos

### Imagen, capa escribible y montaje

La imagen aporta archivos iniciales. Cada contenedor tiene una capa escribible que conserva cambios mientras el contenedor exista. Un **montaje** hace que una ruta del contenedor corresponda a almacenamiento externo a esa capa.

Un **volumen con nombre** lo gestiona Docker y tiene identidad propia. Un **bind mount** conecta una ruta concreta del host con una ruta del contenedor. El volumen suele convenir para datos de servicios; el bind mount resulta útil para editar código desde el host durante el desarrollo. El montaje tapa el contenido que la imagen tuviera en esa ruta mientras esté montado; no fusiona automáticamente ambas carpetas.

```text
imagen → archivos iniciales
contenedor → cambios sin montaje, ligados a ese contenedor
volumen → almacenamiento con ciclo de vida propio
bind mount → carpeta elegida del host visible en el contenedor
```

## 4. Persistencia: el servidor también debe escribir

### Un volumen vacío no convierte memoria en datos durables

Redis mantiene sus datos de trabajo en memoria. Para recuperar información tras reiniciar necesita una política de persistencia. Este ejemplo activa AOF, que registra escrituras, y monta el directorio donde Redis guarda sus archivos:

```bash
docker volume create redis-apuntes-datos
docker run -d --name redis-persistente \
  --mount source=redis-apuntes-datos,target=/data \
  redis:8-alpine redis-server --appendonly yes --appendfsync everysec
docker exec redis-persistente redis-cli SET explicacion "persistencia"
```

El cliente devuelve `OK`. `--appendfsync everysec` realiza sincronización periódica; existe una ventana de pérdida ante determinadas caídas. No representa una garantía de pérdida cero. Para observar la recuperación ordenada, detén y elimina solo el contenedor, dejando el volumen:

```bash
docker stop redis-persistente
docker rm redis-persistente
docker run -d --name redis-persistente \
  --mount source=redis-apuntes-datos,target=/data \
  redis:8-alpine redis-server --appendonly yes --appendfsync everysec
docker exec redis-persistente redis-cli GET explicacion
```

La respuesta esperada es `persistencia`: el contenedor nuevo lee los archivos del mismo volumen. Un reinicio ordenado no prueba la ventana de pérdida de una caída abrupta ni la integridad de tus copias. [Operaciones de Redis](/redis-operaciones.html) desarrolla RDB, AOF y recuperación.

## 5. Bind mounts y permisos

### El usuario del proceso debe poder escribir donde corresponde

`--mount type=bind,source=...,target=/app` hace visible tu carpeta de código dentro del contenedor. Editar la carpeta del host cambia lo que ve el proceso, pero la recarga depende del servidor: `runserver` puede recargar; un proceso sin recarga necesita reiniciarse.

En Linux, los permisos se relacionan con UID y GID numéricos. Un usuario con nombre `app` dentro puede no corresponder al propietario de tu carpeta del host. Un fallo al crear `db.sqlite3` puede ser un problema de permisos, no de Django ni de la conexión SQL. Evita resolverlo con permisos de escritura para todo el mundo; ajusta propiedad o usuario para ese montaje de desarrollo.

Un volumen conserva datos frente a la sustitución de un contenedor, pero sigue dependiendo del almacenamiento del host. No es una copia de seguridad ni se replica por crear varias instancias de la aplicación.

## 6. Retirar recursos sin perder de vista sus nombres

### La limpieza debe seguir el ciclo de vida de cada recurso

Los contenedores de ejemplo se llaman `redis-red` y `redis-persistente`. Puedes detenerlos y eliminarlos por nombre cuando termines. La red `red-apuntes` puede eliminarse después de desconectar sus contenedores. El volumen `redis-apuntes-datos` debe conservarse si quieres conservar sus datos; `docker volume rm redis-apuntes-datos` los destruye una vez no esté en uso.

En Compose, `down` y `down -v` tienen consecuencias diferentes sobre volúmenes. El [tema siguiente](/docker-compose.html) conecta estos conceptos con una aplicación web y un servicio Redis definidos en un único archivo.
