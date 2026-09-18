---
title: 'Redis · Django'
date: '2026-09-18'
updated: '2026-09-19'
layout: 'learning'
language: 'es'
disableNunjucks: true
icon: 'redis'
categories: ['Database']
intro: 'Cómo configurar la caché de Django sobre Redis y utilizarla sobre datos reales, con caducidad, invalidación y un comportamiento definido ante fallos.'
heading: 'Redis con Django'
eyebrow: 'Ruta 05 de 8 · Aplicar'
learning_classes: 'learning-page learning-redis learning-page-cards'
background: 'bg-gradient-to-r from-red-700 to-red-900 !text-white redis-card'
---

## 1. Backend de caché y cliente Redis

### Configurar una pieza no cambia todas las lecturas

Django ofrece una API de caché para guardar y recuperar valores. Un **backend** implementa dónde se guardan: memoria de proceso, archivos, Redis u otro servicio. Elegir Redis permite compartir esas entradas entre procesos web. No convierte automáticamente las consultas del ORM en consultas cacheadas.

Partimos del proyecto `config` y del modelo `Articulo` de [Django: modelos y ORM](/django-datos-orm.html). El servidor Redis debe estar activo y el entorno Python debe tener instalado `redis`, por ejemplo mediante `python -m pip install 'redis>=6,<9'`. Esa biblioteca no sustituye al servidor.

En los settings que realmente carga el proceso Django, añade:

```python
import os

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": os.environ.get("REDIS_URL", "redis://127.0.0.1:6379/0"),
        "TIMEOUT": 60,
        "KEY_PREFIX": "web-articulos",
        "OPTIONS": {
            "socket_connect_timeout": 1,
            "socket_timeout": 1,
        },
    }
}
```

El destino predeterminado sirve cuando Django corre en el host y Redis publica 6379 ahí. En el servicio web de [Compose](/docker-compose.html), `REDIS_URL` vale `redis://redis:6379/0`. Docker no cambia esa URL por su cuenta. `TIMEOUT` define un TTL predeterminado, que puede sustituirse por operación; `KEY_PREFIX` separa nombres de esta aplicación de otros usos.

### Comprobar la API en el shell adecuado

En la terminal ejecuta `python manage.py shell`; si Django corre en Compose, usa `docker compose exec web python manage.py shell`. Dentro del shell:

```python
from django.core.cache import cache

cache.set("conexion", {"estado": "correcto"}, timeout=30)
print(cache.get("conexion"))
cache.delete("conexion")
```

Debes recuperar el diccionario. Django serializa valores y construye una clave física con prefijo y versión. No esperes encontrar exactamente una clave cruda `conexion` con JSON legible. No mezcles `cache.set` y `r.get` sobre supuestas claves equivalentes sin conocer su formato. Este backend presupone un Redis de confianza: no permitas que terceros escriban objetos serializados que Django va a deserializar.

## 2. Cachear el detalle público de un artículo

### El código incluye el origen del dato

Crea `articulos/cache.py`. Aquí la base SQL sigue siendo la fuente de verdad y solo se cachean artículos publicados. La función devuelve un diccionario para presentación, no una instancia del modelo guardada a ciegas.

```python
# articulos/cache.py
import logging
from django.core.cache import cache
from redis.exceptions import ConnectionError, TimeoutError
from .models import Articulo

logger = logging.getLogger(__name__)


def clave_articulo(articulo_id):
    return f"articulo:{articulo_id}:publico:v1"


def obtener_articulo_publico(articulo_id):
    clave = clave_articulo(articulo_id)
    try:
        datos = cache.get(clave)
    except (ConnectionError, TimeoutError):
        logger.warning("Redis no disponible al leer la caché de artículos")
        datos = None
    if datos is not None:
        return datos

    articulo = (
        Articulo.objects.select_related("categoria")
        .get(pk=articulo_id, publicado=True)
    )
    datos = {
        "pk": articulo.pk,
        "titulo": articulo.titulo,
        "texto": articulo.texto,
        "categoria": {"nombre": articulo.categoria.nombre} if articulo.categoria else None,
    }
    try:
        cache.set(clave, datos, timeout=60)
    except (ConnectionError, TimeoutError):
        logger.warning("Redis no disponible al escribir la caché de artículos")
    return datos


def invalidar_articulo(articulo_id):
    try:
        cache.delete(clave_articulo(articulo_id))
    except (ConnectionError, TimeoutError):
        logger.warning("No se pudo invalidar la caché; la copia depende de su TTL")
```

En un hit no se consulta el ORM. En un miss se busca una fila publicada y se guarda su representación durante 60 segundos. Una ausencia en SQL lanza `Articulo.DoesNotExist`; no se convierte en un objeto vacío. Ante fallos de conexión o timeout de Redis, se consulta SQL y se registra el problema. No atrapamos cualquier excepción: un fallo de programación o un tipo incompatible necesita diagnóstico.

### Conectar la función con la view existente

En `articulos/views.py`, sustituye solo `detalle` y añade los imports que no tengas:

```python
from django.http import Http404
from django.shortcuts import render
from .models import Articulo
from .cache import obtener_articulo_publico


def detalle(request, pk):
    try:
        datos = obtener_articulo_publico(pk)
    except Articulo.DoesNotExist as error:
        raise Http404("Artículo no disponible") from error
    return render(request, "articulos/detalle.html", {"articulo": datos})
```

El template ya explicado puede acceder a `articulo.titulo`, `articulo.texto` y `articulo.categoria.nombre`: ahora resuelve claves de diccionario con la misma sintaxis. Si cambias esos campos, actualiza también el contrato o la versión de la clave.

## 3. Invalidar después de editar

### El punto de escritura conoce qué copia acaba de quedar antigua

En la view de edición del [tema de formularios](/django-formularios-crud.html), sustituye su rama de guardado por este bloque y añade los imports. `form` sigue siendo el formulario validado y `request` sigue siendo la petición de esa view:

```python
from django.db import transaction
from .cache import invalidar_articulo

# Dentro de editar, después de crear form:
if request.method == "POST" and form.is_valid():
    with transaction.atomic():
        articulo = form.save()
        transaction.on_commit(lambda: invalidar_articulo(articulo.pk))
    return redirect("articulos:lista")
```

El callback se ejecuta tras confirmar la transacción. Si ya había una transacción exterior, espera a su commit. Una reversión evita el callback. La función de invalidación captura los fallos de red previstos, de modo que un error de Redis no convierte un guardado SQL ya confirmado en un `500` engañoso.

Esta intervención solo cubre esa ruta de edición. El admin, comandos, tareas o `QuerySet.update()` también pueden modificar registros. Si cacheas en producción, centraliza escrituras o cubre todos esos recorridos. Cambiar el nombre de una categoría afecta a todas las copias que incluyeron ese nombre, no solo a una clave de categoría.

## 4. Coherencia de datos y fallos de Redis

### Sesenta segundos son una decisión sobre frescura

Si la invalidación falla, puede quedar una copia anterior hasta el TTL. Una lectura concurrente también puede rellenar una copia antigua después de invalidarla. Este patrón sirve cuando aceptas una ventana de desactualización; no es adecuado para imponer inmediatamente permisos, retirar contenido sensible o comprobar saldos. En esos casos consulta el dato autoritativo o diseña una coherencia más estricta.

La caché de Django no cambia `DATABASES` ni `SESSION_ENGINE`. Para sesiones respaldadas por base con caché existe `cached_db`; sus requisitos y comportamiento difieren de guardar todo únicamente en Redis. Una caché configurada tampoco implica que el navegador cachee HTML: son capas distintas.

Comprueba en tu aplicación miss, hit, edición e indisponibilidad de Redis. Observa tanto la respuesta como las consultas SQL: solo así sabrás si se evitó trabajo y si los datos siguen siendo correctos. [Patrones](/redis-patrones.html) amplía invalidación y estampidas; [operaciones](/redis-operaciones.html), memoria y persistencia.
