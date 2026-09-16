---
title: Redis con Python y SQLite
lang: es
language: es
custom: true
icon: redis
permalink: custom/redis-python-sqlite.html
date: 2026-09-16 00:00:00
background: bg-[#c13b2c]
label: Custom
tags:
  - cache
  - python
  - redis
  - tutorial
categories:
  - Custom
intro: |
  Aprende a incorporar Redis a una aplicación con un ejemplo completo en Python: conecta, guarda datos con caducidad, construye una caché y comprueba qué ocurre al actualizar datos o perder la conexión.
plugins:
  - copyCode
---

## 1. Entender dónde encaja {.cols-1 .max-w-4xl .mx-auto .w-full}

### Lo que vas a construir

Un pequeño catálogo de productos. **SQLite guardará los datos originales y Redis una copia temporal de los productos consultados.** Al repetir una consulta, la aplicación podrá responder desde Redis.

Si es tu primer contacto con Redis, empieza por [Redis paso a paso](/custom/redis). Aquí continuamos con un origen persistente y un programa que sigue leyendo aunque la caché falle.

Necesitas Python 3 y Docker funcionando. Los comandos de terminal usan Bash, como en Linux, macOS o WSL. Basta con conocer funciones y diccionarios de Python; el ejemplo incluye la preparación de SQLite.

La ruta es: **entender el servicio → probar claves y caducidad → conectar Python → implementar una caché → provocar cambios y fallos → trasladarlo a tu aplicación**. Sigue los pasos en orden: todos trabajan sobre el mismo caso.

### Redis funciona como un servicio

Redis mantiene datos en memoria y permite consultarlos por una **clave**, como `apuntes:cache:producto:v1:42`. El valor puede ser texto, un contador, una colección u otra estructura. Tu aplicación envía comandos a un servidor Redis a través de un cliente.

| Pieza                  | Función en este ejemplo                          |
| ---------------------- | ------------------------------------------------ |
| Python                 | Decide dónde buscar y cuándo actualizar la copia |
| SQLite                 | Conserva el producto original en un archivo      |
| Servidor Redis         | Guarda la copia compartida entre procesos        |
| Paquete Python `redis` | Permite enviar comandos al servidor              |

{.show-header .left-text}

Instalar `redis` con `pip` instala **el cliente**, no arranca el servidor. Y un diccionario de Python vive dentro de un proceso: otros procesos no lo comparten automáticamente.

Redis también puede usarse para otros datos y tener persistencia en disco. Aquí empezamos por una caché porque puedes reconstruirla a partir del original.

Fuentes: [tipos de datos de Redis](https://redis.io/docs/latest/develop/data-types/) y [conexión desde Python](https://redis.io/docs/latest/develop/clients/redis-py/connect/).

### El recorrido de una lectura

```text
Aplicación → buscar producto en Redis
              ├─ Existe: devolver la copia
              └─ No existe: leer SQLite
                            → guardar copia con caducidad
                            → devolver el producto
```

Encontrar la copia es un **acierto de caché** (_hit_); no encontrarla es un **fallo de caché** (_miss_). Un miss es normal: la clave puede ser nueva, haber caducado o haberse eliminado.

Este patrón se llama **cache-aside**: la aplicación gestiona la copia. Redis no observa SQLite ni sincroniza sus cambios por sí solo.

Tiene sentido para lecturas repetidas cuyo resultado admite cierta antigüedad. Antes de añadirlo a una aplicación, identifica una consulta costosa y decide cuánto tiempo puedes aceptar una copia desactualizada.

Fuente: [patrón cache-aside](https://redis.io/docs/latest/develop/use-cases/cache-aside/).

## 2. Arrancar Redis y hablar con él {.cols-1 .max-w-4xl .mx-auto .w-full}

### Un servidor local para practicar

En una terminal:

```bash
docker run -d --name redis-apuntes \
  -p 127.0.0.1:6379:6379 \
  redis:8-alpine \
  redis-server --save "" --appendonly no

docker exec redis-apuntes redis-cli PING
```

La respuesta debe ser `PONG`. El puerto publicado queda limitado a tu máquina. Para esta práctica desactivamos expresamente las dos formas de persistencia: **al reiniciar Redis se vaciará la caché**.

Si el puerto 6379 ya está ocupado, usa `127.0.0.1:6380:6379` y cambia también el puerto de `REDIS_URL` en el paso 4. Si el contenedor ya existe, arráncalo con `docker start redis-apuntes`.

Abre ahora la consola de Redis:

```bash
docker exec -it redis-apuntes redis-cli
```

Fuente: [instalación oficial con Docker](https://redis.io/docs/latest/operate/oss_and_stack/install/install-stack/docker/).

### Una clave, un valor y un tiempo de vida

Ejecuta estas líneas **dentro de redis-cli**, en orden:

```redis
SET apuntes:saludo "Hola Redis" EX 30
GET apuntes:saludo
TTL apuntes:saludo
TYPE apuntes:saludo
```

`SET` guarda el valor; `EX 30` establece una caducidad de 30 segundos; `GET` lo recupera; `TTL` muestra el tiempo restante; `TYPE` devuelve `string`.

Espera más de 30 segundos desde el `SET` y repite:

```redis
GET apuntes:saludo
TTL apuntes:saludo
```

Ahora verás `(nil)` y `-2`: la clave ya no existe.

| Resultado de `TTL`        | Significado                      |
| ------------------------- | -------------------------------- |
| Cero o un número positivo | Segundos restantes hasta caducar |
| `-1`                      | La clave existe sin caducidad    |
| `-2`                      | La clave no existe               |

{.show-header .left-text}

Leer con `GET` **no reinicia el contador**. Si quieres prolongarlo, tienes que hacerlo explícitamente. Escribir con `SET` sin opciones elimina el TTL anterior; usa otra vez `EX` o `KEEPTTL` según lo que necesites.

Salir de redis-cli con `exit` cierra el cliente; el servidor sigue funcionando.

Fuentes: [SET](https://redis.io/docs/latest/commands/set/), [TTL](https://redis.io/docs/latest/commands/ttl/) y [EXPIRE](https://redis.io/docs/latest/commands/expire/).

## 3. Decidir qué guardar {.cols-1 .max-w-4xl .mx-auto .w-full}

### Diseña la clave antes de escribir código

Para el producto 42 usaremos:

```text
apuntes:cache:producto:v1:42
│       │     │        │  └─ identificador
│       │     │        └──── versión del formato guardado
│       │     └───────────── entidad
│       └────────────────── uso
└────────────────────────── aplicación o entorno
```

Los dos puntos son una convención de nombres, no carpetas. El prefijo evita mezclar nuestros datos de práctica con otras claves. `v1` permite cambiar de formato más adelante sin interpretar copias antiguas como si fueran nuevas.

La clave debe distinguir **todo lo que cambia el resultado**: por ejemplo, idioma, filtros o usuario si los datos dependen de ellos. Una respuesta privada necesita aislamiento por usuario o cuenta y comprobación de permisos en tu aplicación.

### Un objeto pequeño con TTL

Nuestro valor será un producto serializado a JSON:

```json
{ "id": 42, "nombre": "Teclado" }
```

Lo guardaremos como un `string` de Redis. Python convierte el diccionario a texto con `json.dumps()` y lo reconstruye con `json.loads()`. Esto no utiliza el tipo JSON nativo de Redis: para recuperar un objeto completo basta con una cadena.

Elegiremos **30 segundos para poder experimentar**. En una aplicación real, el TTL sale de una pregunta concreta: «¿Cuánto tiempo puedo tolerar que este dato esté desactualizado?». Si no puedes tolerarlo, esa lectura debe consultar el origen o usar una estrategia de consistencia más exigente.

Fuente: [strings y otras estructuras](https://redis.io/docs/latest/develop/data-types/).

## 4. Conectar desde Python {.cols-1 .max-w-4xl .mx-auto .w-full}

### Prepara una carpeta y el cliente

En otra terminal, fuera de redis-cli:

```bash
mkdir practica-redis
cd practica-redis
python3 -m venv .venv
source .venv/bin/activate
python -m pip install redis
export REDIS_URL="redis://127.0.0.1:6379/0"
```

`/0` selecciona la base lógica 0 del servidor. No es la ruta de un archivo ni un mecanismo de aislamiento de seguridad. Si abres otra terminal, activa el entorno y exporta de nuevo la variable. Un archivo `.env` no se carga solo.

Crea **`conexion.py`**:

```python
import os

from redis import Redis
from redis.backoff import NoBackoff
from redis.retry import Retry

r = Redis.from_url(
    os.environ["REDIS_URL"],
    decode_responses=True,
    socket_connect_timeout=1,
    socket_timeout=1,
    retry=Retry(NoBackoff(), 0),
)

if __name__ == "__main__":
    print(r.ping())
    r.set("apuntes:python", "Conectado", ex=30)
    print(r.get("apuntes:python"))
```

Ejecuta `python conexion.py`. Debe imprimir `True` y `Conectado`.

### Qué significa esta configuración

`decode_responses=True` devuelve texto en lugar de bytes. Una clave inexistente devuelve `None`: comprueba `valor is not None`, porque una cadena vacía también puede ser un valor válido.

Los dos tiempos de espera limitan la conexión y las operaciones de socket. Desactivamos reintentos automáticos para que esta caché opcional pueda recurrir pronto al origen si Redis falla; no son un límite global de duración de la petición.

`r` gestiona un grupo de conexiones reutilizables (_pool_). En una aplicación, crea el cliente una vez por proceso y úsalo desde tus funciones. La conexión se comprueba al ejecutar un comando, por eso hacemos `ping()`.

La URL se obtiene del entorno para poder cambiar de servidor sin editar el código. Con un servicio remoto que use TLS, el esquema es `rediss://`; las credenciales van en la configuración privada del entorno.

Fuentes: [conectar redis-py](https://redis.io/docs/latest/develop/clients/redis-py/connect/), [URL y conexiones](https://redis.readthedocs.io/en/stable/connections.html#redis.Redis.from_url) y [reintentos](https://redis.readthedocs.io/en/stable/retry.html).

## 5. Implementar una caché completa {.cols-1 .max-w-4xl .mx-auto .w-full}

### Un origen persistente

Crea **`catalogo.py`** junto a `conexion.py`. SQLite viene con Python; el programa creará `catalogo.sqlite3` junto al script. `INSERT OR IGNORE` introduce el producto inicial sin sobrescribir tus cambios en ejecuciones posteriores.

Lee primero `leer_producto()`: busca en Redis, consulta SQLite si falta la copia y guarda el resultado con TTL. Después lee `cambiar_nombre()`: confirma el cambio en SQLite y elimina la copia anterior.

```python
import json
import logging
import sqlite3
from contextlib import closing
from pathlib import Path

from redis.exceptions import RedisError

from conexion import r

DB = Path(__file__).with_name("catalogo.sqlite3")
TTL_SEGUNDOS = 30
logger = logging.getLogger(__name__)


def clave_producto(producto_id):
    return f"apuntes:cache:producto:v1:{producto_id}"


def iniciar_db():
    with closing(sqlite3.connect(DB)) as db:
        db.execute(
            "CREATE TABLE IF NOT EXISTS productos "
            "(id INTEGER PRIMARY KEY, nombre TEXT NOT NULL)"
        )
        db.execute(
            "INSERT OR IGNORE INTO productos VALUES (?, ?)",
            (42, "Teclado"),
        )
        db.commit()


def leer_producto(producto_id):
    clave = clave_producto(producto_id)

    try:
        guardado = r.get(clave)
    except RedisError as error:
        logger.warning("Caché no disponible: %s", type(error).__name__)
        guardado = None

    if guardado is not None:
        print("Redis: acierto de caché")
        return json.loads(guardado)

    print("SQLite: lectura del original")
    with closing(sqlite3.connect(DB)) as db:
        fila = db.execute(
            "SELECT id, nombre FROM productos WHERE id = ?",
            (producto_id,),
        ).fetchone()

    if fila is None:
        return None

    producto = {"id": fila[0], "nombre": fila[1]}
    try:
        r.set(clave, json.dumps(producto), ex=TTL_SEGUNDOS)
    except RedisError as error:
        logger.warning("No se pudo guardar la copia: %s", type(error).__name__)

    return producto


def cambiar_nombre(producto_id, nombre):
    with closing(sqlite3.connect(DB)) as db:
        db.execute(
            "UPDATE productos SET nombre = ? WHERE id = ?",
            (nombre, producto_id),
        )
        db.commit()

    # El cambio ya está confirmado en el origen.
    try:
        r.delete(clave_producto(producto_id))
    except RedisError as error:
        logger.warning("No se pudo invalidar la copia: %s", type(error).__name__)


if __name__ == "__main__":
    iniciar_db()
    print(leer_producto(42))
    print(leer_producto(42))
```

Ejecuta:

```bash
python -i catalogo.py
```

En la primera ejecución, con la clave vacía y Redis disponible, verás:

```text
SQLite: lectura del original
{'id': 42, 'nombre': 'Teclado'}
Redis: acierto de caché
{'id': 42, 'nombre': 'Teclado'}
```

La opción `-i` deja abierta una consola de Python con las funciones cargadas para las pruebas siguientes. Si ejecutas el programa otra vez antes de que caduque la clave, ambas lecturas pueden ser aciertos.

### Las decisiones importantes del código

**La ausencia de una copia no es un error.** Consultamos el origen y devolvemos `None` si tampoco existe allí. Para mantener el ejemplo pequeño, no guardamos en caché los productos inexistentes.

**Guardar valor y TTL es una sola operación.** `set(..., ex=30)` evita el hueco de hacer `SET` y después `EXPIRE`: si el proceso fallara entre ambos, la clave podría quedarse sin caducidad.

**Actualizar exige invalidar.** Tras el `commit()`, borramos la copia. La siguiente lectura traerá el dato actualizado. Borrar antes de confirmar permitiría que otra petición rellenara la caché desde un original todavía antiguo.

**La caché es opcional en este caso.** Capturamos errores de Redis y registramos el fallo; los errores de SQLite siguen siendo errores de la aplicación. Este comportamiento sirve para una copia reconstruible, no para saltarse un control de acceso o un límite de peticiones.

Fuentes: [cache-aside](https://redis.io/docs/latest/develop/use-cases/cache-aside/) y [SET con caducidad](https://redis.io/docs/latest/commands/set/).

## 6. Comprobar que lo entiendes {.cols-1 .max-w-4xl .mx-auto .w-full}

### Prueba la caducidad sin perder el producto

En la consola de Python que quedó abierta:

```python
import time

leer_producto(42)
print(r.ttl(clave_producto(42)))
time.sleep(TTL_SEGUNDOS + 1)
print(r.get(clave_producto(42)))  # None
print(leer_producto(42))         # Lee SQLite y vuelve a guardar
print(leer_producto(42))         # Acierto de caché
```

**Lo que debes observar:** desaparece la copia de Redis, pero el producto sigue en SQLite. La siguiente lectura reconstruye la caché; Redis no la rellena automáticamente.

### Actualiza y comprueba la invalidación

En la misma consola, con Redis disponible:

```python
cambiar_nombre(42, "Teclado mecánico")
print(r.get(clave_producto(42)))  # None
print(leer_producto(42))         # SQLite: nombre nuevo
print(leer_producto(42))         # Redis: mismo nombre nuevo
```

Ese es el ciclo completo: escribir el original, invalidar y volver a cargar cuando alguien lo pida. Si hay otras rutas que editan o eliminan productos, también deben invalidar las claves afectadas.

### Detén Redis y sigue leyendo

En una **segunda terminal**:

```bash
docker stop redis-apuntes
```

Vuelve a la consola de Python y ejecuta `leer_producto(42)`. Verás avisos sobre Redis y recibirás el producto desde SQLite. El programa sigue funcionando porque la copia es prescindible.

Arranca de nuevo el contenedor desde la segunda terminal:

```bash
docker start redis-apuntes
```

Las próximas llamadas a `leer_producto(42)` volverán a poblar y usar la caché. El nombre modificado se conserva en SQLite aunque Redis se haya vaciado.

### El límite de esta primera implementación

Si se confirma una actualización pero falla `delete()`, la copia antigua puede seguir sirviéndose al recuperarse Redis hasta que caduque. Además, una lectura concurrente puede obtener el dato antiguo y guardarlo después de una invalidación.

Por eso **TTL e invalidación reducen la antigüedad, pero este ejemplo no garantiza consistencia inmediata entre ambos sistemas**. Las operaciones críticas deben validar el dato en el origen. Una transacción de Redis tampoco vuelve atómica una escritura conjunta en Redis y SQLite.

Otro caso: si muchas peticiones encuentran la misma clave vacía a la vez, todas pueden consultar SQLite. Es una _avalancha de caché_ (_cache stampede_). Cuando exista esa carga, estudia cómo coordinar la reconstrucción de una misma clave; empieza midiendo el problema.

Fuente para continuar: [problemas y decisiones de cache-aside](https://redis.io/docs/latest/develop/use-cases/cache-aside/).

## 7. Llevarlo a una aplicación {.cols-1 .max-w-4xl .mx-auto .w-full}

### Conserva el flujo, cambia el origen

En tu aplicación, la vista o el servicio llamaría a una función como `leer_producto()`. Sustituye la consulta SQLite por tu consulta real o por el ORM y conserva las responsabilidades: construir la clave, leer la copia, cargar el original, establecer TTL e invalidar después de confirmar cambios.

En Django puedes usar el [backend Redis del sistema de caché](https://docs.djangoproject.com/en/5.2/topics/cache/#redis), incluido en Django. Configuras `CACHES` y utilizas `cache.get()`, `cache.set()` y `cache.delete()`. El framework gestiona la serialización; evita mezclar sus valores con los JSON manuales de esta práctica. La tolerancia a fallos y la invalidación siguen necesitando decisiones de tu aplicación.

### Caducidad, persistencia y memoria

| Concepto                           | Qué resuelve                                   | Qué no asegura                              |
| ---------------------------------- | ---------------------------------------------- | ------------------------------------------- |
| TTL                                | Cuándo deja de existir una clave               | Que la clave llegue a vivir todo ese tiempo |
| Persistencia RDB / AOF             | Recuperar datos guardados tras reiniciar Redis | Conservar claves cuyo TTL ya venció         |
| Política de expulsión (_eviction_) | Qué hacer al alcanzar el límite de memoria     | Que cada copia dure hasta su TTL            |

{.show-header .left-text}

**RDB** guarda instantáneas; **AOF** registra escrituras. La pérdida posible tras un fallo depende de la configuración. Un volumen de Docker conserva los archivos que Redis escriba: también debes configurar cómo se escriben.

Una caché reconstruible puede funcionar sin persistencia, como este ejemplo. Para sesiones u otros datos cuya pérdida tenga consecuencias, decide expresamente la durabilidad y recuperación que necesitas. Un TTL sigue corriendo incluso mientras Redis está detenido.

Configura `maxmemory` y la política acorde al uso: `allkeys-lru` puede expulsar claves poco usadas recientemente; `noeviction` mantiene las existentes y rechaza escrituras que requieren más memoria cuando se alcanza el límite. Por eso **TTL no es una garantía de conservación**. Si mezclas caché y datos que necesitas conservar en una instancia, comparten ese límite y esa política.

Fuentes: [persistencia](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/), [expiración y tiempo absoluto](https://redis.io/docs/latest/commands/expire/#expires-and-persistence) y [gestión de memoria](https://redis.io/docs/latest/develop/reference/eviction/).

### Observa qué está ocurriendo

Desde una terminal, con el servidor arrancado:

```bash
docker exec redis-apuntes redis-cli --scan --pattern 'apuntes:*'
docker exec redis-apuntes redis-cli TTL apuntes:cache:producto:v1:42
docker exec redis-apuntes redis-cli INFO stats
docker exec redis-apuntes redis-cli INFO memory
```

`--scan` recorre las claves progresivamente. Evita `KEYS *` en servidores con muchas claves, porque puede bloquearlos mientras recorre el conjunto completo.

Para evaluar tu caché, mira **aciertos y fallos**, tiempos de respuesta, errores y memoria. `keyspace_hits` y `keyspace_misses` son contadores del servidor, no métricas exclusivas de tu función; `expired_keys` cuenta caducidades y `evicted_keys` expulsiones por memoria. Mide también las lecturas reales al origen para comprobar que añadir Redis aporta algo.

Si Python también corre en Docker, `127.0.0.1` apunta a su propio contenedor. Usa el nombre del servicio Redis y su puerto interno en una red compartida. En un entorno remoto, limita el acceso de red al backend y configura autenticación y TLS; el navegador no debe recibir las credenciales.

Fuentes: [SCAN](https://redis.io/docs/latest/commands/scan/), [métricas de caché](https://redis.io/docs/latest/develop/reference/eviction/#using-the-info-command) y [seguridad de Redis](https://redis.io/docs/latest/operate/oss_and_stack/management/security/).

## 8. Tu siguiente implementación {.cols-1 .max-w-4xl .mx-auto .w-full}

### Una mejora para tu catálogo

Añade `leer_catalogo()`: devuelve todos los productos ordenados por ID, guarda la lista durante 30 segundos en una clave propia y úsala en una segunda llamada.

Después modifica `cambiar_nombre()` para invalidar tanto el producto individual como la lista. Debes poder ver el nombre nuevo desde ambas funciones, seguir leyendo con Redis detenido y reconstruir ambas copias después de arrancarlo.

Este ejercicio introduce una decisión real: **un cambio en un dato puede invalidar varias respuestas**. Antes de programar, dibuja qué consultas dependen de ese dato.

### Otras estructuras, otros casos

Una vez entendido el catálogo, amplía según la operación que necesites:

| Necesidad                                                      | Qué estudiar después                                      |
| -------------------------------------------------------------- | --------------------------------------------------------- |
| Leer o modificar campos de una ficha por separado              | Hashes                                                    |
| Incrementar un contador sin leerlo y reescribirlo desde Python | Strings y `INCR`, que hace el incremento de forma atómica |
| Mantener elementos únicos o comprobar pertenencia              | Sets                                                      |
| Ordenar elementos por una puntuación                           | Sorted sets                                               |
| Procesar eventos con consumidores y confirmaciones             | Streams                                                   |

{.show-header .left-text}

Cada estructura tiene sus propios comandos y garantías. Aprenderlas a partir de un caso concreto evita convertir Redis en una lista de instrucciones para memorizar.

Fuente: [guías oficiales de estructuras de datos](https://redis.io/docs/latest/develop/data-types/).

### Cerrar la práctica

Sal de Python con `exit()`. Para detener el servicio y conservar el contenedor, ejecuta `docker stop redis-apuntes`; podrás volver a arrancarlo después.

Cuando ya no lo necesites, elimina **el contenedor de esta práctica**:

```bash
docker rm -f redis-apuntes
```

El archivo `catalogo.sqlite3` queda en tu carpeta: contiene los datos originales. Ese es el aprendizaje central del ejemplo: **tu aplicación decide qué dato es el original y qué copia puede desaparecer**.
