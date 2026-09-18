---
title: 'Docker · Imágenes y Dockerfile'
date: '2026-09-18'
updated: '2026-09-19'
layout: 'learning'
language: 'es'
disableNunjucks: true
icon: 'docker'
categories: ['Toolkit']
intro: 'Cómo una carpeta de código se convierte en una imagen; qué ocurre durante el build y qué se ejecuta al arrancar un contenedor.'
heading: 'Imágenes y Dockerfile'
eyebrow: 'Ruta 02 de 6 · Construye tu aplicación'
learning_classes: 'learning-page learning-docker learning-page-cards'
---

## 1. Construcción y ejecución son momentos distintos

### Un Dockerfile describe cómo preparar el entorno

`docker build` lee instrucciones, copia archivos e instala dependencias para producir una imagen. `docker run` crea un contenedor desde esa imagen y ejecuta su comando principal. Una base de datos o una clave de producción no tiene por qué estar disponible durante la construcción; normalmente pertenece al entorno donde arrancará la aplicación.

El **contexto de build** es el conjunto de archivos que Docker puede usar para copiar al construir. En `docker build -t web-articulos:dev .`, el punto selecciona la carpeta actual como contexto. Un `COPY` no puede tomar libremente archivos de cualquier parte del ordenador. `.dockerignore` excluye archivos antes de enviarlos al constructor.

## 2. Un Dockerfile con una aplicación concreta

### Proyecto Django y dependencias

Usaremos el proyecto Django `config` con `manage.py` creado en [el primer tema de Django](/django.html). El ejemplo asume sus settings de desarrollo y no sustituye el código de la aplicación. Si todavía no tienes ese proyecto, crea primero su estructura mínima; Docker no genera `manage.py` ni instala una aplicación que no hayas copiado.

Junto a `manage.py`, crea `requirements.txt`:

```text
Django>=5.2,<5.3
redis>=6,<9
gunicorn>=23,<24
```

Django ejecuta la aplicación; `redis` es el cliente que utilizaremos al conectar la caché; Gunicorn permite el ejemplo de servidor de producción. Este rango acota versiones compatibles para los ejemplos, pero un entorno que exige reconstrucciones exactas debe fijar también versiones resueltas y la imagen base.

Crea este `Dockerfile` en la misma carpeta:

```dockerfile
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app
COPY requirements.txt .
RUN python -m pip install --no-cache-dir -r requirements.txt

RUN useradd --create-home --uid 10001 --user-group app \
    && chown app:app /app
COPY --chown=app:app . .
USER app

EXPOSE 8000
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
```

### Leer las instrucciones por su efecto

`FROM` elige la base que ya contiene Python. `WORKDIR` establece la carpeta para instrucciones siguientes y para el comando inicial. `COPY requirements.txt` introduce el manifiesto; `RUN ... pip install` se ejecuta al construir y sus archivos quedan en la imagen. `COPY . .` incorpora el código. Crear un usuario y seleccionarlo con `USER` evita ejecutar la aplicación como root.

Las variables `PYTHONDONTWRITEBYTECODE` y `PYTHONUNBUFFERED` afectan a Python: evitan archivos bytecode y facilitan que los logs lleguen sin el buffer habitual. `EXPOSE 8000` documenta el puerto previsto, pero no lo publica en el host. `CMD` establece el comando predeterminado de ejecución. La forma de lista evita un shell intermedio para ese comando.

Aquí `runserver` mantiene un entorno de desarrollo. Escucha en `0.0.0.0` dentro del contenedor porque escuchar solo en `127.0.0.1` limitaría el servicio a su propia interfaz local. El siguiente tema detalla por qué eso es independiente del puerto que publicas en el host.

### Excluir lo que no debe formar parte de la imagen

Crea `.dockerignore` junto al Dockerfile:

```text
.git
.venv
__pycache__
*.pyc
.env
.env.*
db.sqlite3
media
node_modules
```

El entorno virtual del host no es el de la imagen. Un archivo de base local y los uploads son estado, no código. Los archivos de secretos tampoco deben copiarse. Borrar un secreto en una instrucción posterior no garantiza retirarlo de las capas anteriores de una imagen ya construida.

## 3. Construir, arrancar y verificar

### Un nombre de imagen no es un nombre de contenedor

En la terminal del host, dentro de la carpeta del proyecto:

```bash
docker build -t web-articulos:dev .
docker run -d --name web-articulos -p 127.0.0.1:8000:8000 web-articulos:dev
docker exec web-articulos python manage.py migrate
docker logs web-articulos
```

`-t web-articulos:dev` etiqueta la imagen. `--name web-articulos` nombra el contenedor; son identidades diferentes aunque compartan texto. El comando `migrate` se ejecuta dentro del contenedor y crea las tablas de su SQLite de desarrollo. Abre la ruta que hayas definido, por ejemplo `http://127.0.0.1:8000/articulos/`.

En este primer ejemplo, el archivo SQLite queda en la capa del contenedor: sobrevivirá a `stop`/`start`, pero no a eliminarlo. No lo confundas con la persistencia que exige una aplicación real. Para trabajar con código editable y una base local durante el desarrollo, [Compose](/docker-compose.html) incorpora un bind mount con su contexto explicado.

## 4. Capas y caché de construcción

### El orden puede evitar trabajo repetido

Docker reutiliza resultados de instrucciones cuando sus entradas no han cambiado. Por eso copiamos e instalamos `requirements.txt` antes de copiar todo el código. Si editas una view, puede reutilizar la instalación de dependencias; si cambias `requirements.txt`, debe repetirla y rehacer los pasos posteriores afectados.

La caché del build no es Redis ni la memoria del contenedor. Es una forma de reutilizar resultados de construcción. `--no-cache` obliga a rehacer pasos, pero no debe ser la respuesta automática a un error de aplicación. Primero comprueba si reconstruiste la imagen y si el contenedor está usando esa nueva imagen.

Editar el Dockerfile no modifica contenedores existentes. Incluso si construyes de nuevo con la misma etiqueta, el contenedor antiguo sigue referenciando la imagen con la que se creó. Debes recrearlo. Compose puede coordinar esa sustitución con `up -d --build`.

## 5. CMD, ENTRYPOINT y configuración

### Cambiar el comando no reconstruye los archivos

Al escribir un comando después del nombre de imagen en `docker run`, sustituyes su `CMD`. En nuestro ejemplo, `docker run --rm web-articulos:dev python manage.py check` ejecuta la comprobación y termina. No levanta el servidor ni reutiliza la base escrita dentro de otro contenedor.

`ENTRYPOINT` fija un ejecutable de entrada y `CMD` puede aportar sus argumentos predeterminados. Se combinan de forma distinta al caso anterior, por eso conviene inspeccionar la imagen antes de asumir qué reemplaza un comando. No necesitas un entrypoint propio para esta aplicación sencilla.

`ARG` proporciona valores de construcción y `ENV` define valores disponibles en el entorno de la imagen o contenedor. Ninguno debe usarse como almacén de secretos de build. Las credenciales de ejecución se proporcionan mediante el mecanismo del entorno de despliegue; las de construcción necesitan un mecanismo que no las incorpore a capas ni metadatos.

En [producción](/docker-produccion.html) conservaremos el principio de una imagen reproducible, separando código, configuración y estado.
