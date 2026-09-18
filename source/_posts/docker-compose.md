---
title: 'Docker · Compose y desarrollo'
date: '2026-09-18'
updated: '2026-09-19'
layout: 'learning'
language: 'es'
disableNunjucks: true
icon: 'docker'
categories: ['Toolkit']
intro: 'Cómo describir y ejecutar una aplicación con varios servicios; qué conecta Compose y qué sigue siendo responsabilidad de cada proceso.'
heading: 'Compose y desarrollo'
eyebrow: 'Ruta 04 de 6 · Une las piezas'
learning_classes: 'learning-page learning-docker learning-page-cards'
---

## 1. Qué añade Compose

### Declarar servicios relacionados

Con `docker run` puedes crear una web, un Redis, una red y sus montajes. Compose reúne esas decisiones en YAML y permite reproducirlas como un proyecto. Un **servicio** es la definición de un componente; un contenedor es una instancia ejecutada de esa definición. Un archivo `compose.yaml` no es una máquina virtual ni un proceso que sustituya a Django o Redis.

Usaremos el proyecto Django de [Dockerfile](/docker-dockerfile.html), con `manage.py`, el paquete `config`, `requirements.txt` y el Dockerfile ya explicados. Los comandos de este tema se ejecutan en la terminal del host, desde esa carpeta.

## 2. Leer la configuración completa

### Web y Redis comparten red, no localhost

Crea `compose.yaml` junto al Dockerfile:

```yaml
services:
  web:
    build: .
    command: python manage.py runserver 0.0.0.0:8000
    user: '${LOCAL_UID:-1000}:${LOCAL_GID:-1000}'
    ports:
      - '127.0.0.1:8000:8000'
    environment:
      REDIS_URL: redis://redis:6379/0
    volumes:
      - .:/app
    depends_on:
      redis:
        condition: service_healthy

  redis:
    image: redis:8-alpine
    command: redis-server --appendonly yes --appendfsync everysec
    volumes:
      - redis-datos:/data
    healthcheck:
      test: ['CMD', 'redis-cli', 'PING']
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  redis-datos:
```

`build: .` construye la imagen web a partir de la carpeta actual. `command` establece su comando para este entorno de desarrollo. `.:/app` monta el código del host; la base SQLite de desarrollo también se escribe en esa carpeta si mantienes los settings iniciales. El volumen `redis-datos`, en cambio, lo administra Docker y contiene los archivos de persistencia de Redis.

Compose crea una red del proyecto y registra nombres de servicio. Desde `web`, el destino es `redis:6379`, no `localhost`. Redis no tiene `ports`, porque para este ejemplo solo necesita ser accesible desde esa red. La web sí publica 8000 en la interfaz local del host.

### El usuario del bind mount es una decisión de desarrollo

La opción `user` permite que el proceso use el UID/GID propietario del código montado en Linux. Antes de iniciar, en Bash o una terminal compatible:

```bash
export LOCAL_UID=$(id -u)
export LOCAL_GID=$(id -g)
```

Esas variables pertenecen al entorno que ejecuta Compose. En Docker Desktop, los montajes tienen una intermediación adicional; adapta esta opción si tu plataforma gestiona permisos de otra manera. La imagen ya tiene un usuario no root para ejecutarse sin bind mount; esta configuración de desarrollo no es una recomendación para sobrescribir el usuario en producción.

## 3. Arrancar y conectar la aplicación

### Una variable de entorno no instala una integración

```bash
docker compose config --quiet
docker compose up -d --build
docker compose exec web python manage.py migrate
docker compose ps
docker compose logs --tail=50 web
docker compose exec redis redis-cli PING
```

`config --quiet` valida el archivo sin imprimir valores de configuración. `up` crea o reconcilia los servicios; `--build` solicita construir antes. `exec web ...` ejecuta en la instancia web ya activa. `migrate` prepara su base; el último comando verifica el servidor Redis desde su propio contenedor.

Aunque `REDIS_URL` exista, Django no la utiliza automáticamente. Para conectar su caché, añade a los settings que realmente carga `web`:

```python
import os

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": os.environ["REDIS_URL"],
    }
}
```

El cliente `redis` ya aparece en el archivo de dependencias. Esta opción cambia el backend de caché; la aplicación debe usar `django.core.cache.cache` para leer o escribir entradas. No cachea todas las consultas ni cambia la base de datos o las sesiones. [Redis con Django](/redis-django.html) desarrolla esa integración y su invalidación.

### Healthcheck y depends_on

El healthcheck ejecuta `redis-cli PING` periódicamente y marca el servicio según su resultado. `condition: service_healthy` hace esperar a `web` durante la puesta en marcha hasta que Redis se considere saludable. No garantiza que Redis no falle después, ni reinicia automáticamente la web cuando Redis cambia de estado.

Por eso una aplicación debe tener timeouts y decidir cómo responde a una dependencia caída. El orden de arranque reduce una carrera inicial; el manejo de errores protege la operación continua.

## 4. Qué comando corresponde a cada cambio

### Reiniciar no equivale a reconstruir

| Cambio                                       | Acción habitual en esta configuración                           |
| -------------------------------------------- | --------------------------------------------------------------- |
| Editar una view o template                   | El bind mount lo expone; `runserver` recarga lo que corresponda |
| Cambiar dependencias o Dockerfile            | `docker compose up -d --build`                                  |
| Cambiar variables o configuración de Compose | `docker compose up -d` para recrear lo necesario                |
| Reiniciar un proceso con igual configuración | `docker compose restart web`                                    |
| Ejecutar un comando en la web existente      | `docker compose exec web ...`                                   |
| Ejecutar un contenedor temporal del servicio | `docker compose run --rm web ...`                               |

`run` crea otra instancia para el comando; no es una sesión dentro de la existente y no publica automáticamente todos los puertos del servicio. `exec` necesita que el contenedor ya esté ejecutándose. Repetir `restart` no instala una dependencia que faltaba en la imagen.

## 5. Variables, proyectos y datos

### Interpolación de Compose y entorno del proceso

Compose usa variables del shell y de su archivo `.env` para sustituir expresiones `${...}` en YAML. Eso no implica que todas ellas aparezcan dentro del contenedor. `environment` y `env_file` son mecanismos para definir su entorno. La URL de Redis está en `environment`; `LOCAL_UID` se usa para resolver `user`.

El nombre del proyecto agrupa redes, contenedores y volúmenes. Puedes fijarlo con `docker compose -p nombre ...`, pero debes usar el mismo nombre en operaciones posteriores para actuar sobre el mismo conjunto. Cambiarlo puede crear otro volumen con otros datos y hacerte creer que se perdió la base anterior.

`docker compose down` elimina los contenedores y la red del proyecto, conservando los volúmenes con nombre por defecto. `docker compose down -v` también solicita eliminar los volúmenes gestionados correspondientes: en este ejemplo borraría la persistencia de Redis. El bind mount del código sigue siendo una carpeta del host y tiene otro ciclo de vida.

Cuando algo no encaje, sigue el recorrido de [diagnóstico](/docker-diagnostico.html): configuración resuelta, estado del proceso, logs, red y almacenamiento.
