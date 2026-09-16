---
title: Redis paso a paso
date: 2026-09-16 12:00:00
permalink: custom/redis.html
language: es
custom: true
icon: redis
background: bg-[#c13b2c]
label: Custom
tags:
  - redis
  - español
  - principiantes
  - paso a paso
  - cache
  - python
categories:
  - Custom
intro: |
  Desde tu primer PONG hasta una caché en Python. Ejecuta un paso, comprueba el resultado y entiende qué acaba de pasar antes de continuar.
plugins:
  - copyCode
---

## Antes de empezar {.cols-2 .show}

### Qué vas a construir

Imagina una tienda que consulta el precio de un producto. Consultarlo en su base de datos puede costar tiempo. Redis guardará una copia durante unos segundos para responder más rápido a la siguiente petición.

Primero practicarás a mano. Después escribirás un programa pequeño que decide cuándo usar esa copia y cuándo volver a consultar el origen.

**Punto de partida:** saber abrir una terminal y ejecutar un archivo de Python. No necesitas haber usado Redis. Reserva unos 45–60 minutos, incluida la práctica.

**Recorrido:** conexión → claves → caducidad → contadores → objetos → colecciones → caché en Python → ejercicio propio.

### Dónde escribir cada cosa

Usaremos **Ubuntu en WSL** y Docker con contenedores Linux. Necesitas Docker funcionando y Python 3 para el último tramo. En Windows con Docker Desktop, abre la aplicación y activa tu distribución en **Settings → Resources → WSL Integration**. [Configuración oficial de WSL](https://docs.docker.com/desktop/features/wsl/).

Los bloques marcados como **Terminal de Ubuntu** se ejecutan en Bash. Los de **Dentro de redis-cli** se escriben después de conectar a Redis. Los de **Resultado** son la respuesta que debes ver: no se copian como comandos.

`redis-server` es el proceso que guarda datos; `redis-cli` es el cliente con el que le das órdenes. Salir del cliente no apaga el servidor.

Esta guía usa un Redis local de práctica. La [ficha rápida original de Redis](/redis) sigue disponible para consultar comandos.

## 1. Arranca Redis y consigue un PONG {.cols-2}

### Terminal de Ubuntu · crear el laboratorio

Comprueba primero que Docker responde:

```bash
docker version
```

Debe mostrar información de **Client** y **Server**. Después ejecuta:

```bash
docker run -d --name redis-custom-lab \
  -p 127.0.0.1:6380:6379 \
  redis:8-alpine
docker exec redis-custom-lab redis-cli PING
```

**Resultado:** la primera orden imprime un identificador largo; la segunda, `PONG`. La primera vez también se descarga la imagen.

Ahora abre el cliente interactivo:

```bash
docker exec -it redis-custom-lab redis-cli
```

Verás un indicador parecido a `127.0.0.1:6379>`. Escribe allí:

```redis
PING
```

Debe volver a responder `PONG`. Ya puedes pasar al siguiente paso.

### Qué significa cada pieza

`docker run` crea un contenedor, un entorno separado para este ejercicio. `-d` deja el servidor funcionando en segundo plano y `--name` le pone un nombre para encontrarlo después.

`127.0.0.1:6380:6379` conecta el puerto **6380 de tu equipo** con el **6379 del contenedor**. El cliente que abriste está dentro del contenedor; el programa Python que ejecutarás desde Ubuntu usará 6380.

La dirección `127.0.0.1` limita la publicación del puerto al propio equipo. Este laboratorio no lleva credenciales y no está pensado para exponerlo a Internet.

Si vuelves otro día y el contenedor ya existe, usa `docker start redis-custom-lab` y vuelve a abrir el cliente. No repitas `docker run` con el mismo nombre.

Base técnica: [Redis con Docker](https://redis.io/docs/latest/operate/oss_and_stack/install/install-stack/docker/). Los nombres y el puerto de este ejercicio son propios de la guía.

## 2. Guarda tu primer dato {.cols-2}

### Dentro de redis-cli · escribir y leer

Ejecuta las líneas de una en una:

```redis
SET custom:saludo "Hola, Redis"
GET custom:saludo
TYPE custom:saludo
```

**Resultado, en el mismo orden:**

```text
OK
"Hola, Redis"
string
```

Ahora cambia el mensaje:

```redis
SET custom:saludo "Ya entiendo las claves"
GET custom:saludo
```

Obtendrás `OK` y después `"Ya entiendo las claves"`.

**Comprueba que lo entiendes:** ejecuta `GET custom:no-existe`. Debe responder `(nil)`: no hay ningún valor en esa clave.

### Clave, valor y tipo, sin saltos

Una **clave** es el nombre con el que buscas algo: `custom:saludo`. Su **valor** es lo que guardas: `Hola, Redis`. En este caso el tipo es **string**, una cadena de texto.

`SET` escribe el valor. Si la clave ya existía, lo sustituye; por eso el segundo mensaje reemplaza al primero. `GET` lo recupera. `TYPE` pregunta qué tipo de dato hay.

Los dos puntos son una convención para ordenar nombres, no carpetas reales. En `custom:producto:42`, `custom` identifica nuestros ejercicios y `42` podría ser el identificador de un producto.

`(nil)` significa ausencia. No es el texto `"nil"`, tampoco el número cero. Cuando programes la caché, esa diferencia decidirá si tienes que buscar el dato en otra parte.

Referencia: [SET](https://redis.io/docs/latest/commands/set/) y [strings](https://redis.io/docs/latest/develop/data-types/strings/).

## 3. Haz que un dato caduque {.cols-2}

### Dentro de redis-cli · una copia de 20 segundos

```redis
SET custom:oferta "Teclado a 39 euros" EX 20
GET custom:oferta
TTL custom:oferta
```

**Resultado:** `OK`, el texto de la oferta y los segundos restantes. Si copias rápido, el último número estará cerca de 20.

Espera más de 20 segundos y vuelve a consultar:

```redis
GET custom:oferta
TTL custom:oferta
```

Ahora verás `(nil)` y `(integer) -2`.

**Prueba otra cosa:** `TTL custom:saludo` devuelve `(integer) -1`, porque el saludo del paso anterior no tiene caducidad.

### Por qué esto es útil para una caché

`EX 20` hace que el valor deje de estar disponible al transcurrir 20 segundos. Se guarda el contenido y su caducidad con una sola orden.

`TTL` significa _time to live_: cuánto tiempo de vida le queda a la clave, en segundos.

| Respuesta de TTL       | Qué te está diciendo                               |
| ---------------------- | -------------------------------------------------- |
| 0 o un número positivo | Quedan esos segundos; 0 indica menos de un segundo |
| -1                     | Existe, pero no tiene caducidad                    |
| -2                     | La clave ya no existe                              |

{.show-header .left-text}

Redis no sabe consultar la base de datos de tu aplicación cuando algo caduca. **Tu programa tiene que detectar la ausencia y volver a obtener el dato.** Lo haremos en el paso 8.

Un `SET` normal sobre una clave existente elimina su caducidad anterior. Al renovar esta caché usaremos siempre `SET ... EX ...`.

Referencia: [TTL](https://redis.io/docs/latest/commands/ttl/) y [opciones de SET](https://redis.io/docs/latest/commands/set/).

## 4. Cuenta visitas sin leer y reescribir a mano {.cols-2}

### Dentro de redis-cli · incrementar

Pon el contador del ejercicio a cero y suma dos visitas:

```redis
SET custom:visitas 0
INCR custom:visitas
INCR custom:visitas
GET custom:visitas
```

**Resultado:** `OK`, `(integer) 1`, `(integer) 2` y `"2"`.

Puedes sumar más de una unidad:

```redis
INCRBY custom:visitas 5
```

El contador queda en 7. Si repites esta última orden, quedará en 12: estás cambiando el dato cada vez que la ejecutas.

### Qué aporta INCR

Dos peticiones podrían leer ambas el valor 0, sumar 1 y escribir ambas 1. Habrías perdido una visita.

Con `INCR`, Redis hace la suma como una operación indivisible. Las dos peticiones incrementan el contador y el resultado es 2.

Aunque `GET` muestre `"2"` como texto, Redis puede interpretar ese contenido como un entero para incrementarlo. Si intentas incrementar `custom:saludo`, obtendrás un error porque contiene palabras.

**Para decidir:** usa `SET` cuando quieres fijar un valor; usa `INCR` cuando quieres sumar una unidad al valor que haya en ese momento.

Referencia: [Strings como contadores](https://redis.io/docs/latest/develop/data-types/strings/#strings-as-counters).

## 5. Guarda un objeto con varios campos {.cols-2}

### Dentro de redis-cli · crear un producto

```redis
HSET custom:producto:42 nombre "Teclado" precio 49 stock 8
HGET custom:producto:42 nombre
HGETALL custom:producto:42
```

La primera ejecución de `HSET` devuelve `(integer) 3`: has añadido tres campos. Si la repites sobre el mismo producto, devolverá 0 porque actualiza campos que ya existían.

`HGET` devuelve `"Teclado"`. `HGETALL` devuelve nombres de campo y valores alternados: `nombre`, `Teclado`, `precio`, `49`, `stock`, `8`. No dependas del orden de esos pares.

Vende una unidad:

```redis
HINCRBY custom:producto:42 stock -1
HGET custom:producto:42 stock
```

Obtendrás 7 en una práctica recién iniciada.

### Por qué aquí usamos un hash

Un **hash** agrupa campos dentro de una sola clave. Se parece a un diccionario sencillo: puedes actualizar el stock sin reemplazar el nombre ni el precio.

La `H` inicial indica comandos de hash. `HGET` necesita la clave y el campo; `GET` solo sirve para strings. Si ejecutas `GET custom:producto:42`, Redis responde `WRONGTYPE`. Usa `TYPE custom:producto:42` para confirmar que es un hash.

Los valores de los campos siguen siendo texto; que `precio` contenga `49` no crea automáticamente un esquema ni una columna numérica.

Restar stock sirve para aprender el comando. Una venta real necesita además impedir stock negativo y coordinarse con el registro del pedido.

Referencia: [Redis hashes](https://redis.io/docs/latest/develop/data-types/hashes/).

## 6. Elige entre una lista y un conjunto {.cols-2}

### Lista · tareas en un orden

Para repetir este ejercicio desde cero, borra solo su clave:

```redis
DEL custom:tareas
RPUSH custom:tareas "preparar pedido" "enviar correo"
LRANGE custom:tareas 0 -1
LPOP custom:tareas
LLEN custom:tareas
```

`RPUSH` añade al final y devuelve 2, la longitud. `LRANGE` muestra ambas tareas en ese orden; 0 es el primer índice y -1 es el último.

`LPOP` saca `"preparar pedido"` del principio. **Además de devolverlo, lo elimina de la lista.** Por eso `LLEN` devuelve 1 después.

Con añadir por un extremo y sacar por el otro tienes una cola sencilla. Para trabajos importantes hacen falta mecanismos de confirmación y reintento; esta práctica no los implementa.

Referencia: [RPUSH](https://redis.io/docs/latest/commands/rpush/), [LRANGE](https://redis.io/docs/latest/commands/lrange/) y [LPOP](https://redis.io/docs/latest/commands/lpop/).

### Set · valores sin duplicados

```redis
DEL custom:etiquetas
SADD custom:etiquetas "python" "redis" "python"
SMEMBERS custom:etiquetas
SISMEMBER custom:etiquetas "python"
SCARD custom:etiquetas
```

`SADD` devuelve 2: solo hay dos valores distintos. `SMEMBERS` muestra `python` y `redis`, en un orden que puede variar. `SISMEMBER` devuelve 1 porque `python` está dentro; `SCARD` devuelve 2, el tamaño.

**Cómo elegir:** usa una lista si el orden o las repeticiones importan. Usa un set si lo que te interesa es pertenencia y unicidad, como las etiquetas de un artículo.

Referencia: [Redis sets](https://redis.io/docs/latest/develop/data-types/sets/).

## 7. Inspecciona lo que has creado {.cols-2}

### Terminal de Ubuntu · localizar tus claves

Escribe `exit` para salir de redis-cli. Ya en la terminal normal:

```bash
docker exec redis-custom-lab redis-cli --scan --pattern 'custom:*'
```

Verás las claves de los ejercicios que todavía existan. `custom:oferta` debería haber desaparecido por caducidad. El orden de la lista no importa.

Para consultar una clave sin entrar en modo interactivo:

```bash
docker exec redis-custom-lab redis-cli TYPE custom:producto:42
docker exec redis-custom-lab redis-cli HGETALL custom:producto:42
```

Esto envía una orden, imprime su respuesta y vuelve a Bash. En este modo algunas respuestas se muestran sin las comillas y los prefijos del cliente interactivo.

### Qué mirar cuando una orden falla

| Síntoma                                | Siguiente comprobación                         |
| -------------------------------------- | ---------------------------------------------- |
| `(nil)`                                | Revisa el nombre exacto y consulta `TTL`       |
| `WRONGTYPE`                            | Consulta `TYPE` y usa el comando de ese tipo   |
| El contador sube de más                | Cada ejecución de `INCR` vuelve a sumar        |
| Quedan menos segundos de los esperados | El reloj del TTL sigue avanzando mientras lees |

El modo `--scan` recorre las claves por lotes; evita pedir todas de golpe con `KEYS *` en servidores grandes. Durante cambios concurrentes puede haber duplicados o resultados variables: no lo trates como una fotografía exacta.

No necesitas vaciar toda la base con `FLUSHALL` o `FLUSHDB`. Para repetir un ejercicio, usa `DEL` con su clave concreta, como hicimos con la lista.

Referencia: [SCAN](https://redis.io/docs/latest/commands/scan/).

## 8. Usa Redis desde Python {.cols-2}

### Terminal de Ubuntu · prepara un proyecto pequeño

Todo este paso ocurre fuera de redis-cli. Crea una carpeta y un entorno de Python:

```bash
mkdir -p ~/repos/redis-custom-practica
cd ~/repos/redis-custom-practica
python3 -m venv .venv
source .venv/bin/activate
python -m pip install redis
```

Si Ubuntu indica que falta `ensurepip` o el paquete de entornos virtuales, ejecuta `sudo apt install python3-venv` y repite la creación del entorno.

La biblioteca `redis` es el **cliente Python**. El servidor sigue siendo el contenedor del paso 1; instalar esta biblioteca no arranca otro Redis.

Crea un archivo llamado `cache_demo.py` en esta carpeta y copia en él el programa del siguiente bloque. Puedes abrirlo con `nano cache_demo.py`; guarda con Ctrl+O, Enter, y sal con Ctrl+X.

### Qué va a hacer el programa

Seguiremos este recorrido para cada consulta:

1. Buscar `custom:cache:producto:42` en Redis.
2. Si existe, convertir el JSON a un diccionario y devolverlo.
3. Si no existe, consultar el origen simulado.
4. Guardar una copia durante 10 segundos y devolverla.

El diccionario `CATALOGO` simula la base de datos. `time.sleep(1)` simula una consulta lenta para que notes la diferencia; no es trabajo que Redis necesite hacer.

Esto se llama **cache-aside**: tu programa gestiona las lecturas y rellena la caché. La caducidad limita cuánto tiempo puede quedarse una copia antigua, pero no la actualiza inmediatamente cuando cambia el origen.

Conexión y métodos del cliente: [guía oficial de redis-py](https://redis.io/docs/latest/develop/clients/redis-py/).

## 9. Ejecuta la caché y comprueba el recorrido {.cols-2}

### Archivo cache_demo.py · programa completo

```python
import json
import time

import redis

r = redis.Redis(
    host="127.0.0.1",
    port=6380,
    decode_responses=True,
    socket_connect_timeout=2,
    socket_timeout=2,
)

CATALOGO = {42: {"nombre": "Teclado", "precio": 49}}
CLAVE = "custom:cache:producto:42"


def obtener_producto(producto_id):
    clave = f"custom:cache:producto:{producto_id}"
    copia = r.get(clave)

    if copia is not None:
        print("CACHE: uso la copia de Redis")
        return json.loads(copia)

    print("ORIGEN: consulto el catalogo")
    time.sleep(1)
    producto = CATALOGO[producto_id]
    r.set(clave, json.dumps(producto), ex=10)
    return producto


if __name__ == "__main__":
    r.ping()
    r.delete(CLAVE)
    print(obtener_producto(42))
    print(obtener_producto(42))
    print("TTL:", r.ttl(CLAVE))
    print("Espero 11 segundos...")
    time.sleep(11)
    print(obtener_producto(42))
```

### Terminal de Ubuntu · resultado esperado

Con el entorno `.venv` activado y el contenedor en marcha:

```bash
python cache_demo.py
```

**Resultado:**

```text
ORIGEN: consulto el catalogo
{'nombre': 'Teclado', 'precio': 49}
CACHE: uso la copia de Redis
{'nombre': 'Teclado', 'precio': 49}
TTL: 10
Espero 11 segundos...
ORIGEN: consulto el catalogo
{'nombre': 'Teclado', 'precio': 49}
```

El TTL puede ser menor que 10. Lo importante es el recorrido **ORIGEN → CACHE → ORIGEN**. La primera consulta no tenía copia; la segunda sí; tras 11 segundos, la copia había caducado.

`decode_responses=True` entrega texto en vez de bytes. `json.dumps` convierte el diccionario a texto y `json.loads` lo reconstruye. Usamos un string JSON, distinto del hash del paso 5.

`r.delete(CLAVE)` prepara una ejecución repetible y borra solo la copia de este ejemplo. Este programa trabaja con el producto 42 y deja visibles los fallos de conexión para aprender a diagnosticarlos. Todavía no incluye recuperación ante caída de Redis ni coordinación de consultas simultáneas.

## 10. Hazlo tú y comprueba que lo entiendes {.cols-2}

### Reto · cambia un precio que ya estaba cacheado

En `cache_demo.py`, justo después de la primera llamada a `print(obtener_producto(42))`, añade:

```python
CATALOGO[42]["precio"] = 59
```

Antes de ejecutar, predice qué precio devolverá la segunda llamada. Luego compruébalo.

**Solución razonada:** verás 49 en la primera y en la segunda respuesta; en la última, después de la espera, verás 59. Cambiaste el origen, pero la copia de Redis seguía siendo la anterior.

Ahora añade esto inmediatamente después de cambiar el precio:

```python
r.delete(CLAVE)
```

La segunda llamada volverá al origen y devolverá 59. Acabas de **invalidar la caché**. En una aplicación real, esta invalidación se hace después de guardar correctamente el cambio en la base de datos.

### Tres preguntas antes de seguir

**¿Borrar la caché elimina el producto?** No en este diseño: el producto vive en `CATALOGO` y Redis conserva una copia. En otros diseños Redis puede ser el almacén principal; aquí no lo es.

**¿Un TTL de 10 garantiza el precio más reciente?** No. Durante esos segundos puedes servir una copia antigua. La elección del TTL depende de cuánto retraso acepta tu aplicación.

**¿Qué pasa si Redis no responde?** Este ejemplo muestra el error. Una aplicación puede optar por consultar el origen cuando falle la caché, siempre que el origen soporte esa carga. Ese comportamiento hay que programarlo.

Si puedes explicar las tres respuestas, ya entiendes el problema que resuelve una caché y su principal compromiso: rapidez frente a frescura del dato.

## Cuando algo no funciona {.cols-2}

### Docker, conexión y puertos

**Docker no muestra Server:** arranca Docker y espera a que esté listo. Si lo usas desde Ubuntu en WSL, comprueba la integración de esa distribución.

**El nombre del contenedor ya existe:** revisa `docker ps -a --filter name=redis-custom-lab`. Si es tu laboratorio anterior, ejecuta `docker start redis-custom-lab`.

**El puerto 6380 está ocupado:** puedes publicar el laboratorio en 6381 cambiando solo `127.0.0.1:6380:6379` por `127.0.0.1:6381:6379` al crearlo. Cambia también `port=6380` a `port=6381` en Python.

**Python muestra ConnectionError:** ejecuta `docker exec redis-custom-lab redis-cli PING`. Si da PONG, comprueba que Python se ejecuta en el equipo que publica el puerto y que usa 6380; dentro de otro contenedor, `127.0.0.1` apuntaría a ese otro contenedor.

### Python y cómo terminar

**ModuleNotFoundError: redis:** activa el entorno con `source .venv/bin/activate` y ejecuta `python -m pip install redis` usando ese mismo Python.

**SyntaxError al escribir SET:** estás en Python o has pegado una orden Redis dentro de un archivo Python. Los comandos Redis se escriben en redis-cli; en Python se usan métodos como `r.set(...)`.

Para apagar el laboratorio, sal del cliente con `exit` y ejecuta en la terminal de Ubuntu:

```bash
docker stop redis-custom-lab
```

Para continuar otro día, usa `docker start redis-custom-lab`. Puedes salir del entorno Python con `deactivate`.

Esta práctica no configura una estrategia de persistencia. No uses el contenedor como almacén de información importante. Vuelve a ejecutar los pasos necesarios si sus claves han desaparecido.

## Tu siguiente paso {.cols-2}

### Lo que ya puedes hacer

Ya sabes comprobar una conexión, nombrar claves, leer y escribir valores, ponerles caducidad y elegir entre strings, hashes, listas y sets.

También has visto dos cosas que una tabla de comandos no explica por sí sola: **Redis no repuebla la caché por ti** y **actualizar el origen no actualiza una copia ya guardada**.

Como siguiente práctica, cambia el catálogo simulado por una consulta de tu aplicación y decide qué hacer si Redis falla. Después puedes estudiar persistencia, límites de memoria y autenticación.

### Vuelve a consultar

- [Todos los apuntes Custom](/custom/).
- [Ficha rápida original de Redis](/redis).
- [Documentación del cliente Python](https://redis.io/docs/latest/develop/clients/redis-py/).
- [Referencia oficial de comandos](https://redis.io/docs/latest/commands/).

Guía propia de Sheet Codes. Ejemplos preparados para Redis 8 y Python 3; documentación consultada el 16 de septiembre de 2026.
