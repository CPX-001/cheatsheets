---
title: 'Redis · Glosario'
date: '2026-09-18'
updated: '2026-09-19'
layout: 'learning'
language: 'es'
disableNunjucks: true
icon: 'redis'
categories: ['Database']
intro: 'Comandos, estructuras y garantías de Redis: qué significa cada término, qué devuelve cada operación y dónde se utiliza.'
heading: 'Glosario de Redis'
eyebrow: 'Referencia rápida · Redis'
learning_classes: 'learning-page learning-redis learning-glossary'
background: 'bg-gradient-to-r from-red-700 to-red-900 !text-white'
---

## Servidor y conexión

### Redis, redis-cli y redis-py

Redis es el servidor que mantiene datos y ejecuta comandos. `redis-cli` es su cliente de terminal. redis-py es la biblioteca instalada como `redis` en Python. Instalar el cliente no arranca un servidor. [Fundamentos](/redis.html).

### URL y base lógica

`redis://127.0.0.1:6379/0` identifica protocolo, host, puerto y base lógica. `rediss://` indica TLS. Dentro de Compose, el host suele ser el nombre del servicio, como `redis`. `localhost` siempre depende de dónde se ejecute el cliente. Las bases lógicas no aíslan CPU, memoria o políticas de expulsión.

### Pool y timeout

Un pool reutiliza conexiones del proceso. Cada worker suele tener el suyo. El timeout de conexión limita su establecimiento; el de respuesta limita esperas de operaciones. Los reintentos pueden aumentar la latencia total y deben considerar si repetir una escritura duplica efectos.

### decode_responses y serialización

`decode_responses=True` convierte respuestas textuales de bytes a cadenas Python; no interpreta JSON. `json.dumps()` produce texto y `json.loads()` reconstruye su estructura. Django `RedisCache` usa su propio formato y prefijos: no mezcles sus entradas con JSON crudo sin un contrato común.

## Claves y caducidad

### SET, GET y DEL

Dentro de `redis-cli`, conectado al servidor de desarrollo:

```text
SET articulo:42:titulo "Entender HTTP" EX 60
GET articulo:42:titulo
DEL articulo:42:titulo
```

`SET` escribe una cadena; `GET` devuelve el valor o ausencia; `DEL` devuelve cuántas claves eliminó. `EX 60` fija 60 segundos de vida en la misma escritura. Los dos puntos del nombre no crean carpetas. [Datos y TTL](/redis-datos.html).

### TYPE y WRONGTYPE

`TYPE clave` identifica la estructura. Una cadena, un hash y una lista admiten operaciones distintas. `WRONGTYPE` suele indicar una colisión de nombres o un comando aplicado a otro tipo; no se arregla convirtiendo a texto el error del cliente.

### TTL, EXPIRE y KEEPTTL

`TTL clave` devuelve segundos restantes, `-1` si existe sin caducidad y `-2` si no existe. `EXPIRE clave segundos` fija su expiración. Un `SET` ordinario sustituye el valor y elimina el TTL previo salvo opciones como `KEEPTTL`. `HSET` o `INCR` sobre estructuras existentes normalmente conservan la expiración.

### NX y XX

`SET ... NX` escribe solo si falta la clave; `XX`, solo si existe. Combinadas con TTL permiten determinadas operaciones condicionales en un comando. Un bloqueo basado en `NX` también necesita propietario, liberación segura y límites ante pausas y expiración.

### SCAN

`SCAN` recorre claves mediante cursor; terminar una llamada no significa terminar el recorrido. Puede devolver duplicados si el conjunto cambia y no ofrece una instantánea consistente. En la terminal del host, `docker exec redis-apuntes redis-cli --scan --pattern 'articulo:*'` recorre las claves de ese patrón. Evita `KEYS *` como inspección habitual de bases grandes.

## Estructuras

### String y contadores

Una cadena guarda un valor completo, como texto o JSON. `INCR` y `INCRBY` operan atómicamente sobre enteros compatibles. Evitan la carrera GET → suma local → SET, pero no evitan contar dos veces una petición reintentada.

### Hash

`HSET clave campo valor` actualiza campos dentro de una clave; `HGET` lee uno y `HGETALL` todos. Permite modificar partes sin reemplazar un JSON completo. Los valores textuales no se convierten automáticamente en booleanos u objetos del modelo.

### List

`RPUSH` añade por la derecha, `LPOP` retira por la izquierda y `LRANGE` lee un intervalo. Mantiene orden y admite duplicados. Una cola que retira antes de procesar puede perder trabajo si el consumidor cae; una lista por sí sola no implementa confirmaciones.

### Set

`SADD` añade miembros únicos; `SISMEMBER` comprueba pertenencia; `SCARD` cuenta. `SMEMBERS` devuelve los miembros sin un orden de presentación garantizado. Sirve para etiquetas o pertenencias cuando la unicidad importa.

### Sorted set

`ZADD` asocia miembros únicos a puntuaciones, `ZINCRBY` cambia una puntuación y `ZRANGE ... REV WITHSCORES` permite leer una clasificación descendente. Un miembro repetido actualiza su puntuación, no crea otra entrada independiente.

## Caché e integración

### Hit, miss y cache-aside

Un hit encuentra una copia utilizable; un miss no la encuentra. Cache-aside consulta el origen en un miss y rellena la copia con una política de vida. Un error de red no es un miss normal, aunque una caché prescindible pueda degradar hacia el origen. [Patrones](/redis-patrones.html).

### Invalidación y versión de clave

Invalidar elimina o sustituye una copia desactualizada. El TTL limita su vida, pero no sabe cuándo cambió SQL. Una versión como `:v1` separa formatos incompatibles; no garantiza que el dato sea reciente. La invalidación debe cubrir todas las rutas de escritura y dependencias del resultado.

### Estampida y caché negativa

Una estampida ocurre cuando muchos misses reconstruyen a la vez el mismo valor. La caché negativa guarda una ausencia para reducir consultas repetidas; necesita una señal distinta de valores válidos y una vida adecuada. No debe confundir un fallo transitorio con un recurso inexistente.

### Django cache

`cache.get`, `cache.set` y `cache.delete` utilizan el backend configurado en `CACHES`. `KEY_PREFIX` y la versión participan en la clave física. Configurar el backend no cambia automáticamente consultas ORM, sesiones o caché HTTP. [Integración Django](/redis-django.html).

### Cliente asíncrono y lifespan

`redis.asyncio.Redis` permite operaciones compatibles con `await`. El ciclo `lifespan` de FastAPI crea el cliente del proceso y lo cierra mediante `aclose()`. Una llamada síncrona bloqueante dentro de `async def` no se vuelve asíncrona por estar ahí. [Integración FastAPI](/redis-fastapi.html).

## Concurrencia y mensajes

### Pipeline, MULTI y EXEC

Un pipeline agrupa viajes de red. En redis-py utiliza transacción por defecto; `transaction=False` muestra solo agrupación. `MULTI` encola comandos y `EXEC` los ejecuta sin intercalación de otros clientes, pero no aporta rollback general ante errores de ejecución. [Concurrencia](/redis-concurrencia.html).

### WATCH y Lua

`WATCH` permite abortar una transacción si cambian claves observadas antes de ejecutarla. Lua permite expresar lógica atómica en el servidor. Ambos necesitan límites: reintentos acotados, argumentos válidos y operaciones breves. Un script no revierte automáticamente escrituras anteriores a un error.

### Pub/Sub

`SUBSCRIBE` escucha un canal y `PUBLISH` envía a suscriptores. Quien está desconectado no recibe un historial al volver. Es apropiado para avisos efímeros, no una cola durable por sí mismo.

### Stream, grupo y ACK

`XADD` añade una entrada con identificador. `XREADGROUP` entrega entradas según el progreso del grupo. `XACK` confirma identificadores procesados; no borra necesariamente el evento. Los pendientes pueden recuperarse tras una caída, pero repetir una entrega exige efectos idempotentes.

## Memoria y recuperación

### maxmemory y eviction

`maxmemory` limita el uso sometido al control de Redis; deja margen para sobrecostes del proceso y del sistema. Eviction expulsa claves según política al necesitar memoria. No es lo mismo que expirar por TTL. `noeviction` puede rechazar escrituras cuando falta memoria. [Operaciones](/redis-operaciones.html).

### RDB y AOF

RDB conserva instantáneas; AOF registra escrituras con una política de sincronización. La pérdida posible depende de esa política y del fallo. Montar `/data` conserva archivos entre contenedores, pero Redis debe producirlos. Persistencia local y copias restaurables cumplen funciones diferentes.

### Réplica, Sentinel y Cluster

Una réplica recibe cambios y puede ir retrasada. Sentinel supervisa y coordina failover sin repartir claves entre primarios. Cluster distribuye claves por slots y requiere clientes y operaciones compatibles. Replicación no equivale a copia histórica ni garantiza pérdida cero. [Producción](/redis-produccion.html).
