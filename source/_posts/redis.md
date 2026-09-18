---
title: 'Redis'
date: '2026-09-18'
updated: '2026-09-19'
layout: 'learning'
language: 'es'
disableNunjucks: true
icon: 'redis'
categories: ['Database']
intro: 'Qué es el servidor Redis, qué hace un cliente y cómo una aplicación utiliza claves y estructuras en memoria sin confundirlas con sus objetos Python.'
heading: 'Fundamentos'
eyebrow: 'Ruta 01 de 8 · Empieza aquí'
learning_classes: 'learning-page learning-redis learning-page-cards'
background: 'bg-gradient-to-r from-red-700 to-red-900 !text-white redis-card'
---

## 1. Qué es Redis y por qué aparece junto a una base de datos

### Un servidor de estructuras de datos

Redis es un proceso servidor al que otros programas envían comandos. Mantiene sus datos de trabajo en memoria y ofrece operaciones sobre cadenas, hashes, listas, conjuntos y otras estructuras. Puede persistir datos y replicarlos según la configuración, pero esas garantías no se deducen de haberlo instalado.

En una web de artículos, una base SQL puede ser la fuente de verdad del texto y su estado de publicación. Redis puede conservar durante un tiempo el resultado de una lectura costosa, contar visitas o coordinar trabajo. Esas funciones tienen requisitos diferentes: perder una copia de caché obliga a recalcular; perder una tarea pendiente puede significar que nunca se ejecute.

Redis no es solo un diccionario dentro de Python. Es un servicio al que pueden conectarse varios procesos e incluso máquinas. Esa separación permite compartir datos entre workers, pero introduce conexiones, serialización, latencia y posibles fallos de red.

## 2. Servidor, terminal y biblioteca cliente

### Tres piezas que suelen confundirse

```text
terminal del host ── docker ── arranca el proceso Redis
                                      ↑
redis-cli ─────── comandos Redis ──────┤
                                      │
aplicación Python ── redis-py ─────────┘
```

El **servidor** ejecuta los comandos y mantiene las claves. `redis-cli` es un cliente de terminal para enviar comandos manualmente. La biblioteca Python `redis`, conocida como redis-py, es otro cliente: traduce llamadas Python al protocolo de Redis y convierte sus respuestas. `pip install redis` instala esa biblioteca, no arranca el servidor.

Docker es una forma de ejecutar el servidor con su entorno. Si ya tienes `redis-apuntes` del [tema de Docker](/docker.html), reutilízalo; no intentes crear otro con el mismo nombre. Si no tienes un Redis local y Docker está disponible, en la terminal del host:

```bash
docker run -d --name redis-apuntes -p 127.0.0.1:6379:6379 redis:8-alpine
docker exec -it redis-apuntes redis-cli
```

El segundo comando abre el cliente dentro del contenedor. Ahora los comandos que escribes pertenecen a Redis, no a Bash ni a Python:

```text
PING
SET mensaje "Redis responde"
GET mensaje
DEL mensaje
```

Esperas `PONG`, `OK`, el texto guardado y el número de claves eliminadas. `exit` sale del cliente; el servidor sigue activo. El puerto se publicó solo en la interfaz local del host para estas pruebas de desarrollo.

## 3. Qué ocurre al enviar un comando

### Una petición de red con un resultado

Al llamar a `GET mensaje`, el cliente codifica el comando, lo envía por una conexión y espera una respuesta. Redis localiza la clave y ejecuta la operación admitida para su tipo. El cliente interpreta la respuesta. Redis no importa tus clases Python ni ejecuta el código de tu view.

El procesamiento ordinario de comandos se ordena en el servidor, lo que permite operaciones individuales atómicas. Eso no significa que toda la implementación use un único hilo para cualquier trabajo, ni que varias llamadas separadas se conviertan en una transacción. Mientras un comando costoso ocupa la ejecución, otras peticiones pueden esperar. Por eso importa el tamaño de la operación, además de que los datos estén en memoria.

Una **clave** identifica un valor. `articulo:42:resumen:v1` es una convención legible; los dos puntos no crean carpetas ni relaciones. El identificador 42 es un ejemplo de nombre: en una aplicación real usarías el identificador del artículo que has cargado. El tipo pertenece al valor y determina qué comandos son válidos.

## 4. Conectar desde Python con el contexto completo

### La URL describe el servidor, no una ruta web

En un entorno virtual de Python, ejecuta en la terminal `python -m pip install 'redis>=6,<9'`. Crea `conexion_redis.py` con este contenido y ejecútalo con `python conexion_redis.py` desde el host donde se publicó el puerto:

```python
# conexion_redis.py
from redis import Redis

with Redis.from_url(
    "redis://127.0.0.1:6379/0",
    decode_responses=True,
    socket_connect_timeout=1,
    socket_timeout=1,
) as r:
    print(r.ping())
    r.set("guia:saludo", "Hola desde Python", ex=60)
    print(r.get("guia:saludo"))
    print(r.ttl("guia:saludo"))
```

`redis://` selecciona una conexión Redis sin TLS; `127.0.0.1` es el host; `6379`, el puerto; `/0`, la base lógica. `rediss://` indica TLS. La base lógica no es una carpeta ni una garantía de aislamiento entre aplicaciones. Dentro de un contenedor web de Compose, la dirección cambia normalmente a `redis://redis:6379/0`, donde `redis` es el nombre del servicio.

`decode_responses=True` convierte respuestas de texto a cadenas Python; sin él, suelen llegar como bytes. No transforma JSON en diccionarios ni todas las respuestas en texto: un contador o TTL sigue siendo numérico. Los timeouts limitan esperas de conexión y de respuesta. Un fallo lanza una excepción; no equivale a que la clave no exista.

## 5. La memoria de Redis no es la memoria de tu proceso

### Serializar define qué información compartes

Python no puede enviar un diccionario arbitrario con `SET` y esperar que otra aplicación conozca su representación interna. Una forma explícita de compartir un objeto pequeño es JSON. En el mismo contexto donde existe `r`, estas operaciones convierten entre diccionario y texto:

```python
import json

resumen = {"id": 42, "titulo": "Entender HTTP"}
r.set("articulo:42:resumen:v1", json.dumps(resumen), ex=60)
texto = r.get("articulo:42:resumen:v1")
recuperado = json.loads(texto) if texto is not None else None
```

Aquí `resumen` se define en el propio ejemplo; no procede todavía de una consulta SQL. En las integraciones lo obtendremos de una fuente concreta. `json.dumps` produce el texto que guarda Redis y `json.loads` recupera la estructura cuando hay un valor. Tras la caducidad, `GET` devuelve ausencia y hay que decidir qué hacer.

No utilices `if texto` para representar universalmente «no existe»: una cadena vacía también puede ser un valor válido. Comprueba `is None` cuando ese sea el contrato del cliente. Y no deserialices formatos capaces de ejecutar código si un tercero puede escribir el contenido.

## 6. Elegir una función y sus garantías

### Antes del comando, decide qué significa perder el dato

Para una caché necesitas origen, caducidad e invalidación. Para un contador necesitas conocer qué pasa al repetir una petición. Para una cola necesitas entrega, confirmaciones y recuperación. Redis aporta piezas, pero el significado de esas operaciones pertenece a tu aplicación.

Continúa con [datos y TTL](/redis-datos.html) para entender tipos y caducidad; [patrones](/redis-patrones.html) explica cuándo utilizarlos. Las integraciones de [Django](/redis-django.html) y [FastAPI](/redis-fastapi.html) muestran qué código conecta cada pieza. Como segunda explicación didáctica, [Real Python: Python y Redis](https://realpython.com/python-redis/) desarrolla la relación entre servidor, cliente y estructuras.
