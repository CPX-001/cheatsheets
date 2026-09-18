---
title: 'Redis · FastAPI'
date: '2026-09-18'
updated: '2026-09-19'
layout: 'learning'
language: 'es'
disableNunjucks: true
icon: 'redis'
categories: ['Database']
intro: 'Cómo compartir un cliente asíncrono entre peticiones, ejecutar cache-aside y cerrar conexiones con el ciclo de vida de FastAPI.'
heading: 'Redis con FastAPI'
eyebrow: 'Ruta 04 de 8 · Aplicar'
learning_classes: 'learning-page learning-redis learning-page-cards'
background: 'bg-gradient-to-r from-red-700 to-red-900 !text-white redis-card'
---

## 1. Qué cambia al usar una aplicación asíncrona

### El bucle de eventos necesita operaciones que puedan ceder el control

En una ruta `async def`, `await` permite que el servidor atienda otras tareas mientras espera una operación compatible. Si llamas dentro a un cliente Redis síncrono y bloquea esperando red, mantienes ocupado el hilo del bucle. Por eso usaremos `redis.asyncio`, que forma parte de la biblioteca redis-py.

Un cliente administra conexiones mediante un pool. Conviene reutilizarlo durante la vida del proceso y cerrarlo al apagar. Crear y destruir un cliente por petición añade conexiones y trabajo. Cada proceso worker tendrá su propio cliente y pool; no existe un único pool mágico compartido por todos los procesos del servidor.

## 2. Aplicación FastAPI con caché

### Origen de datos y cliente compartido

El servidor Redis es el del [primer tema](/redis.html). En un entorno virtual de Python, instala dependencias con `python -m pip install fastapi uvicorn 'redis>=6,<9'`. El archivo siguiente se llama `main.py` y puede ejecutarse de forma independiente de Django.

Para concentrarnos en el recorrido HTTP → caché → origen, el origen es un diccionario definido en el propio archivo con dos artículos. No es una base durable: sus cambios se pierden al reiniciar y no se comparten entre workers. En una aplicación real sustituirías esa lectura por tu repositorio o base de datos, conservando un contrato de datos claro.

```python
# main.py
import json
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from redis.asyncio import Redis
from redis.exceptions import ConnectionError, TimeoutError

logger = logging.getLogger(__name__)
ARTICULOS = {
    42: {"id": 42, "titulo": "Entender HTTP", "texto": "Peticiones y respuestas."},
    43: {"id": 43, "titulo": "Entender la caché", "texto": "Una copia con caducidad."},
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    cliente = Redis.from_url(
        os.environ.get("REDIS_URL", "redis://127.0.0.1:6379/0"),
        decode_responses=True,
        socket_connect_timeout=1,
        socket_timeout=1,
    )
    app.state.redis = cliente
    try:
        yield
    finally:
        await cliente.aclose()


app = FastAPI(lifespan=lifespan)


@app.get("/articulos/{articulo_id}")
async def detalle(articulo_id: int, request: Request):
    cliente = request.app.state.redis
    clave = f"fastapi:articulo:{articulo_id}:v1"
    try:
        texto = await cliente.get(clave)
    except (ConnectionError, TimeoutError):
        logger.warning("Redis no disponible al leer la caché")
        texto = None

    if texto is not None:
        try:
            datos = json.loads(texto)
            if isinstance(datos, dict) and datos.get("id") == articulo_id:
                return {"origen": "cache", "articulo": datos}
        except json.JSONDecodeError:
            pass
        logger.warning("Copia de caché incompatible; se consultará el origen")

    datos = ARTICULOS.get(articulo_id)
    if datos is None:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")
    try:
        await cliente.set(clave, json.dumps(datos), ex=60)
    except (ConnectionError, TimeoutError):
        logger.warning("Redis no disponible al escribir la caché")
    return {"origen": "fuente", "articulo": datos}
```

### Dónde nace cada variable

`lifespan` define el arranque y cierre de la aplicación: antes de `yield` prepara el cliente; después cierra sus conexiones incluso al salir por el bloque `finally`. `app.state` conserva una referencia del proceso que las peticiones pueden recuperar. `request.app` es la aplicación que atiende esa petición.

El identificador de la ruta se convierte a entero gracias al tipo `int`. `clave` usa un prefijo distinto del backend Django: no mezcla un JSON crudo con la serialización de `django.core.cache`. `json.dumps` produce el texto guardado; `json.loads` lo interpreta en un hit. La comprobación del formato es mínima para este ejemplo; en una API real valida el esquema completo que devuelves.

## 3. Ejecutar y observar el resultado

### El comando va en la terminal, las rutas en el cliente HTTP

Desde la carpeta de `main.py`, con el entorno activo:

```bash
uvicorn main:app --reload
```

`main:app` identifica módulo y objeto. `--reload` es para desarrollo. Abre `http://127.0.0.1:8000/articulos/42`. La primera respuesta debería indicar `"origen": "fuente"`; otra antes de caducar, `"origen": "cache"`. Si Redis ya contiene esa clave de una ejecución anterior, puedes ver cache desde la primera petición; espera el TTL o elimina únicamente esa clave de ejemplo.

`/articulos/999` devuelve `404` porque no está en el origen. Un identificador no convertible a entero produce la respuesta de validación del framework. Si Redis falla, los artículos definidos siguen disponibles desde la fuente y aparece una advertencia en los logs. Esa degradación está elegida porque aquí Redis es prescindible; no serviría sin más para una cola o para un control de acceso.

El campo `origen` existe para hacer observable el recorrido de este ejemplo. No necesitas exponer un detalle de infraestructura en el contrato de una API de producto: puedes observarlo con métricas o logs internos cuando integres el patrón.

## 4. Qué falta cuando la fuente pasa a ser una base real

### Compatibilidad asíncrona e invalidación

Una lectura de un diccionario es inmediata. Una base remota implica espera: usa una API asíncrona compatible o el mecanismo apropiado para ejecutar trabajo síncrono sin bloquear el bucle. Añadir `async` al nombre de una función que ejecuta operaciones bloqueantes no cambia su comportamiento interno.

Si una ruta modifica un artículo, invalida o versiona su copia después de confirmar el cambio. Una ruta de escritura necesita además autenticación, validación y persistencia. [Patrones](/redis-patrones.html) explica la política; [Django con Redis](/redis-django.html) muestra una conexión completa con escrituras SQL ya definidas.

La caché tampoco resuelve peticiones simultáneas al mismo miss. Varias pueden leer la fuente y escribir la misma copia. Eso es aceptable mientras el origen lo soporte; una estampida medible requiere coordinación o una política de refresco.

## 5. Cierre, límites y errores

### La conexión es un recurso, no solo una variable

Cerrar el cliente al terminar evita dejar recursos pendientes dentro de su bucle. Los timeouts limitan esperas individuales; el tiempo total de una petición también depende de reintentos, lectura del origen y escritura de la copia. Al configurar reintentos, comprueba su efecto sobre esa latencia.

Un fallo de red después de enviar una escritura deja incertidumbre: el servidor puede haberla aplicado aunque el cliente no reciba la respuesta. Repetir un `SET` del mismo valor tiene un efecto distinto de repetir un `INCR`. Esa diferencia conecta el uso de la biblioteca con [atomicidad e idempotencia](/redis-concurrencia.html), que hay que entender antes de usar Redis para coordinar efectos importantes.
