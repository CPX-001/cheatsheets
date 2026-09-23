---
title: 'Redis · Base'
date: '2026-09-18'
updated: '2026-09-21'
layout: 'learning'
language: 'es'
disableNunjucks: true
icon: 'redis'
categories: ['Database']
intro: 'Servidor, claves, caducidad y conexión desde Python. Fundamentos para implementar una caché y comprender cómo se guarda, recupera y actualiza la información.'
heading: 'Base'
eyebrow: 'Fundamentos'
learning_classes: 'learning-page learning-redis learning-page-cards'
background: 'bg-gradient-to-r from-red-700 to-red-900 !text-white redis-card'
---

## 1. Qué es Redis y qué papel cumple

Redis es un servidor que almacena datos y recibe comandos de otros programas. Mantiene los datos de trabajo en memoria, por lo que resulta útil para acceder repetidamente a información pequeña: resultados de consultas, contadores o preferencias temporales.

Una **caché** conserva una copia de información disponible en otro lugar. Por ejemplo, un catálogo puede guardar sus artículos en un archivo o una base de datos y mantener en Redis los que se consultan con frecuencia. Si desaparece la copia, el catálogo vuelve a leer el origen. El origen sigue siendo la referencia para decidir cuál es el dato correcto.

Hay tres componentes distintos:

| Componente     | Función                                                                |
| -------------- | ---------------------------------------------------------------------- |
| `redis-server` | Ejecuta el servidor y mantiene los datos.                              |
| `redis-cli`    | Envía comandos desde la terminal.                                      |
| `redis-py`     | Permite enviar comandos desde Python; se instala como paquete `redis`. |

```text
redis-cli ────────────────┐
                         ├── servidor Redis ── datos en memoria
programa Python → cliente┘
```

La variable Python que representa al cliente contiene la configuración de conexión; los datos guardados pertenecen al servidor. Cerrar un programa Python no borra automáticamente las claves de Redis. Otro proceso conectado al mismo servidor y base puede recuperarlas.

## 2. Arrancar el servidor y conectar la terminal

Los comandos de instalación siguientes corresponden a **Debian o Ubuntu**, también dentro de WSL con una de esas distribuciones. Instalan los paquetes disponibles en la distribución:

```bash
sudo apt update
sudo apt install redis-server redis-tools python3-venv
```

La [documentación oficial de instalación](https://redis.io/docs/latest/operate/oss_and_stack/install/install-stack/apt/) describe además el repositorio de Redis para instalar sus versiones recientes. Las operaciones de esta página funcionan con Redis 6 o posterior.

En una terminal, inicia una instancia local independiente:

```bash
redis-server --bind 127.0.0.1 --port 6380 --save "" --appendonly no
```

`--bind` limita las conexiones a esta máquina. `--port` elige el puerto `6380`; el puerto habitual es `6379`, donde la instalación puede haber iniciado otro servicio. `--save ""` y `--appendonly no` desactivan las escrituras de persistencia: los datos nuevos de esta instancia no se guardan en disco.

La terminal queda ocupada por el servidor y sus mensajes. Debe permanecer abierta mientras se ejecutan los ejemplos. `Ctrl+C` lo detiene. Si el puerto ya está ocupado, el arranque falla; hay que elegir otro puerto y usarlo también en los clientes.

En una **segunda terminal**, abre el cliente:

```bash
redis-cli -h 127.0.0.1 -p 6380
```

`-h` indica la máquina y `-p` el puerto. A partir de ahora, las líneas introducidas son comandos Redis:

```text
PING
```

La respuesta `PONG` confirma que el cliente ha llegado al servidor. `exit` cierra el cliente y devuelve la terminal normal; no detiene Redis.

## 3. Claves, valores y tiempo de vida

Una **clave** es un nombre que identifica un valor. `base:saludo` utiliza un prefijo para distinguir los datos de esta aplicación; los dos puntos forman parte del texto, no crean carpetas.

Dentro de `redis-cli`, esta secuencia guarda, consulta y elimina una cadena:

```text
SET base:saludo "Hola desde Redis"
GET base:saludo
EXISTS base:saludo
DEL base:saludo
GET base:saludo
```

Las respuestas son `OK`, el saludo, `1`, `1` y `(nil)`. `SET` escribe; `GET` recupera; `EXISTS` indica cuántas de las claves indicadas existen; `DEL` devuelve cuántas eliminó. `(nil)` significa que no existe un valor para esa clave. Una cadena vacía `""` sí es un valor existente.

El **TTL**, tiempo de vida restante, permite que una clave desaparezca automáticamente. Para conservar un título durante 60 segundos:

```text
SET base:titulo "Introducción a HTTP" EX 60
TTL base:titulo
```

`EX 60` fija la caducidad al escribir. `TTL` devuelve los segundos restantes, que disminuyen aunque nadie lea la clave. Cuando caduca, `GET base:titulo` devuelve `(nil)`.

| Resultado de `TTL`        | Significado                                                 |
| ------------------------- | ----------------------------------------------------------- |
| Cero o un número positivo | Segundos restantes; cero indica que está próxima a caducar. |
| `-1`                      | La clave existe sin caducidad.                              |
| `-2`                      | La clave no existe.                                         |

`EXPIRE base:titulo 120` establece una nueva caducidad sobre una clave existente; devuelve `1` si pudo aplicarla. Un `SET` ordinario reemplaza el valor **y elimina su TTL anterior**. Para una caché, conviene proporcionar `EX` en cada escritura. Leer con `GET` no prolonga la duración.

El TTL controla cuánto tiempo se admite conservar una copia. No detecta si el origen cambió: una copia puede estar desactualizada antes de caducar.

## 4. Elegir una estructura sencilla

Cada clave tiene un tipo de valor. El comando debe corresponder a ese tipo: `GET` lee cadenas; para campos de un hash se utiliza `HGET`. Una operación incompatible produce `WRONGTYPE`.

| Tipo     | Uso habitual                                         | Comandos representativos   |
| -------- | ---------------------------------------------------- | -------------------------- |
| Cadena   | Texto, JSON serializado o contador numérico.         | `SET`, `GET`, `INCR`.      |
| Hash     | Campos de un registro que se consultan por separado. | `HSET`, `HGET`, `HGETALL`. |
| Lista    | Elementos ordenados que admiten repeticiones.        | `RPUSH`, `LRANGE`.         |
| Conjunto | Elementos únicos sin un orden definido.              | `SADD`, `SMEMBERS`.        |

En `redis-cli`, un hash puede representar los campos de un artículo:

```text
HSET base:articulo:1 titulo "Introducción a HTTP" categoria "Web"
HGET base:articulo:1 titulo
HGETALL base:articulo:1
TYPE base:articulo:1
```

`HSET` recibe la clave y parejas campo–valor. `HGET` devuelve el título; `HGETALL`, todos los campos y valores; `TYPE`, `hash`. Los valores textuales no se convierten automáticamente en números o booleanos.

Para contar visitas, `INCR base:visitas:1` crea un contador con valor `1` si no existía y lo incrementa en cada llamada posterior. Redis realiza cada incremento como una sola operación; dos clientes no necesitan leer, sumar y escribir por separado.

Una cadena con JSON será suficiente para la caché siguiente, porque el artículo se lee y reemplaza completo.

## 5. Conectar desde Python

Fuera de `redis-cli`, prepara una carpeta y un entorno virtual:

```bash
mkdir redis-base
cd redis-base
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install 'redis>=5,<6'
```

Se utiliza la rama 5 de `redis-py`, compatible con los servidores Redis 6 y 7 disponibles en estas distribuciones. Instalar la biblioteca no instala ni inicia el servidor.

En esa carpeta, crea **`conexion.py`**:

```python
from redis import Redis


def crear_cliente():
    return Redis.from_url(
        "redis://127.0.0.1:6380/0",
        decode_responses=True,
        socket_connect_timeout=1,
        socket_timeout=1,
    )


if __name__ == "__main__":
    with crear_cliente() as cliente:
        print(cliente.ping())
        cliente.set("base:python:saludo", "Hola desde Python", ex=60)
        print(cliente.get("base:python:saludo"))
        print(cliente.ttl("base:python:saludo"))
```

Ejecuta `python3 conexion.py` con el servidor activo. El resultado será `True`, el saludo y un TTL cercano a `60`.

`Redis` es la clase importada de la biblioteca. Su método `from_url()` construye un objeto cliente configurado. `crear_cliente()` es una función del programa que permite reutilizar esa configuración. La conexión se utiliza al enviar operaciones, como `ping()`.

En la URL, `redis://` selecciona el protocolo, `127.0.0.1` identifica la máquina, `6380` el puerto y `/0` la base lógica. No es una URL que deba abrirse en el navegador. La base lógica organiza claves dentro del mismo servidor; no proporciona un servidor independiente.

| Parámetro                  | Efecto                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------- |
| `decode_responses=True`    | Devuelve el texto como `str` de Python; sin esta opción suele recibirse como `bytes`. |
| `socket_connect_timeout=1` | Limita a un segundo la espera para establecer cada conexión.                          |
| `socket_timeout=1`         | Limita la espera de operaciones sobre la conexión.                                    |
| `ex=60`, en `set()`        | Guarda el valor con una caducidad de 60 segundos.                                     |

Los timeouts no representan un límite global para todo el programa. `with` cierra las conexiones del cliente al salir del bloque; Redis continúa funcionando. El bloque `if __name__ == "__main__"` ejecuta la comprobación únicamente cuando se lanza este archivo, no cuando otro módulo importa `crear_cliente`.

Los métodos corresponden a los comandos: `get()` devuelve texto o `None`; `set()` devuelve `True` al guardar; `exists()` y `delete()` devuelven cantidades; `ttl()` devuelve un entero. `decode_responses` no convierte todos esos resultados en cadenas. La [guía oficial de redis-py](https://redis.io/docs/latest/develop/clients/redis-py/) recoge la relación entre cliente y comandos.

## 6. Representar objetos con JSON

Un artículo puede ser un diccionario Python con identificador y título. `SET` necesita una representación almacenable, por lo que antes de enviarlo se convierte a texto JSON.

La biblioteca estándar `json` proporciona `json.dumps(articulo)`, que convierte un diccionario en una cadena, y `json.loads(texto)`, que reconstruye los datos desde esa cadena. Por ejemplo, `{"id": 1, "titulo": "Introducción a HTTP"}` conserva su estructura al realizar ambas conversiones. `decode_responses=True` solo resuelve bytes → texto; la conversión texto → diccionario corresponde a `json.loads()`.

El origen del catálogo será **`articulos.json`**, creado junto a `conexion.py`:

```json
{
  "1": {"id": 1, "titulo": "Introducción a HTTP"},
  "2": {"id": 2, "titulo": "Estructura de una URL"}
}
```

Las claves de un objeto JSON son cadenas: el artículo con identificador numérico `1` se busca mediante la clave `"1"`. El archivo es el origen persistente; Redis almacenará copias temporales de cada artículo. El contenido del archivo permanece al cerrar Python o Redis.

## 7. Implementar una caché de artículos

El patrón **cache-aside** deja la consulta en manos de la aplicación: busca primero en Redis; si no encuentra una copia, lee el origen y guarda el resultado para próximas consultas.

```text
consultar artículo → ¿existe copia en Redis?
                       sí → devolver copia (hit)
                       no → leer archivo → guardar copia → devolver (miss)
```

Crea **`catalogo.py`** junto a los otros dos archivos:

```python
import json
from pathlib import Path

from redis.exceptions import ConnectionError, TimeoutError

from conexion import crear_cliente

ARCHIVO = Path(__file__).with_name("articulos.json")
TTL_SEGUNDOS = 60


def clave_articulo(articulo_id):
    return f"base:catalogo:articulo:{articulo_id}"


def leer_origen():
    return json.loads(ARCHIVO.read_text(encoding="utf-8"))


def obtener_articulo(cliente, articulo_id):
    clave = clave_articulo(articulo_id)
    try:
        texto = cliente.get(clave)
    except (ConnectionError, TimeoutError):
        print("Redis no disponible: lectura desde el archivo")
        return leer_origen().get(str(articulo_id))

    if texto is not None:
        print("Caché: hit")
        return json.loads(texto)

    print("Caché: miss; lectura desde el archivo")
    articulo = leer_origen().get(str(articulo_id))
    if articulo is not None:
        try:
            cliente.set(clave, json.dumps(articulo), ex=TTL_SEGUNDOS)
        except (ConnectionError, TimeoutError):
            print("Redis no disponible: copia sin guardar")
    return articulo


def cambiar_titulo(cliente, articulo_id, titulo):
    articulos = leer_origen()
    articulos[str(articulo_id)]["titulo"] = titulo
    ARCHIVO.write_text(
        json.dumps(articulos, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    try:
        cliente.delete(clave_articulo(articulo_id))
    except (ConnectionError, TimeoutError):
        print("Archivo actualizado; la copia anterior puede durar hasta su TTL")


if __name__ == "__main__":
    with crear_cliente() as cliente:
        print(obtener_articulo(cliente, 1))
        print(obtener_articulo(cliente, 1))
        cambiar_titulo(cliente, 1, "HTTP: peticiones y respuestas")
        print(obtener_articulo(cliente, 1))
```

`Path(__file__)` representa la ubicación de `catalogo.py`; `with_name()` señala el JSON de la misma carpeta, independientemente del directorio desde donde se lance Python. `read_text()` lee su contenido y `write_text()` lo reemplaza. Ambos especifican UTF-8 para conservar caracteres como las tildes.

`cliente` se recibe como argumento y se reutiliza en todas las operaciones. `articulo_id` procede de las llamadas del bloque final. `clave_articulo()` genera el mismo nombre tanto al consultar como al invalidar. El segundo `get()`, aplicado al diccionario del archivo, es un método de Python: devuelve el artículo o `None` si falta.

El parámetro `ensure_ascii=False` conserva los caracteres legibles en el JSON; `indent=2` lo presenta con sangría. `TTL_SEGUNDOS` fija la caducidad de cada copia. La comprobación `texto is not None` distingue una clave ausente de un valor existente.

Ejecuta `python3 catalogo.py`. Con la caché vacía aparecen un **miss**, un **hit** y otro **miss** después del cambio de título. El último resultado contiene el título actualizado, que también queda guardado en `articulos.json`. Las siguientes ejecuciones parten del archivo ya modificado; la primera lectura puede ser un hit si sigue existiendo la copia.

**Invalidar** significa eliminar una copia que ha quedado desactualizada. `cambiar_titulo()` escribe primero el origen y después elimina su clave de Redis. Editar directamente el JSON evita esa función: la copia antigua puede seguir devolviéndose hasta caducar. TTL e invalidación son mecanismos distintos.

El archivo permite observar el recorrido completo, pero su reescritura no coordina escritores simultáneos. Para una aplicación con varios procesos que modifican datos, el origen debe proporcionar esa coordinación, normalmente mediante una base de datos. El patrón de caché seguiría siendo el mismo.

## 8. Interpretar fallos y límites

Una clave ausente y un servidor inaccesible son situaciones distintas. La primera devuelve `None`; la segunda produce una excepción. El catálogo captura únicamente fallos de conexión o timeout de Redis y continúa desde el archivo. Un JSON incorrecto o un archivo inexistente siguen produciendo su error correspondiente.

| Síntoma                      | Comprobación                                                         |
| ---------------------------- | -------------------------------------------------------------------- |
| Conexión rechazada           | Servidor activo y mismo host/puerto en ambos clientes.               |
| `None` inesperado            | Nombre de clave, base lógica y TTL; una clave caducada ya no existe. |
| `WRONGTYPE`                  | `TYPE clave` y comando adecuado a su estructura.                     |
| Título antiguo               | Caducidad y paso de invalidación después de guardar.                 |
| `ModuleNotFoundError: redis` | Entorno virtual activo y biblioteca instalada con su Python.         |

Para inspeccionar solo las claves del catálogo desde la terminal normal:

```bash
redis-cli -h 127.0.0.1 -p 6380 --scan --pattern 'base:catalogo:*'
```

`--scan` recorre las claves de forma incremental; `--pattern` filtra los nombres. Evita borrar toda la base para corregir una entrada: `DEL` permite eliminar la clave concreta.

Redis dispone de persistencia en disco, pero esta instancia la tiene desactivada. **Persistencia y caducidad son independientes**: habilitar persistencia no convierte una clave temporal en permanente. Una caché debe poder reconstruirse; almacenar datos únicos exige otras garantías. La [documentación de caducidad](https://redis.io/docs/latest/commands/expire/) detalla cómo afectan las operaciones al tiempo de vida.

Finalmente, mantener una copia añade red, memoria y serialización. Para un JSON tan pequeño no se presupone una mejora de velocidad: el ejemplo muestra el mecanismo. En una aplicación real, la caché se justifica cuando evita un trabajo repetido cuyo coste se ha medido.
