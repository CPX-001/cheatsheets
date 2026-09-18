---
title: 'Redis · Datos y TTL'
date: '2026-09-18'
updated: '2026-09-19'
layout: 'learning'
language: 'es'
disableNunjucks: true
icon: 'redis'
categories: ['Database']
intro: 'Cómo elegir estructuras según las operaciones que necesitas y cómo interpretar claves ausentes, tipos, expiración y resultados.'
heading: 'Datos y TTL'
eyebrow: 'Ruta 02 de 8 · Primeros pasos'
learning_classes: 'learning-page learning-redis learning-page-cards'
background: 'bg-gradient-to-r from-red-700 to-red-900 !text-white redis-card'
---

## 1. Una clave, un tipo y una política de vida

### Nombrar según el uso

En los ejemplos seguiremos un artículo identificado como 42: guardaremos su título, metadatos, etiquetas y visitas para mostrar operaciones distintas. Ese número ilustra una convención de claves; no crea una fila en Django ni obliga a que tu base tenga ese identificador. En una aplicación real lo sustituye el identificador recibido o consultado.

Los bloques de comandos de esta página se ejecutan dentro de `redis-cli`, conectado al servidor local del [tema anterior](/redis.html). Los nombres distintos evitan mezclar tipos. Una clave de cadena no se convierte en hash porque quieras ejecutar `HSET`: Redis responderá `WRONGTYPE`.

```text
SET articulo:42:titulo "Entender HTTP"
GET articulo:42:titulo
TYPE articulo:42:titulo
EXISTS articulo:42:titulo
```

`TYPE` devolverá `string` y `EXISTS` el número de claves existentes entre las consultadas. Los nombres con `:` son texto ordinario. Una convención como `entorno:recurso:id:uso:version` ayuda a evitar colisiones y a retirar formatos antiguos, pero no crea aislamiento de seguridad.

## 2. TTL: cuánto tiempo debe seguir existiendo una clave

### Expirar es diferente de sobrescribir

**TTL** significa tiempo de vida restante. `SET ... EX` escribe un valor con expiración expresada en segundos. `PX` utiliza milisegundos. Establecer valor y caducidad en una sola operación evita un intervalo entre dos comandos en el que la clave podría quedar sin expiración si el cliente cae.

```text
SET articulo:42:resumen "HTTP explicado" EX 60
TTL articulo:42:resumen
EXPIRE articulo:42:resumen 120
TTL articulo:42:resumen
```

Los TTL positivos bajan con el tiempo. `-1` significa que la clave existe sin caducidad; `-2`, que no existe. Si ya caducó, un `GET` devuelve ausencia. Redis elimina claves expiradas al encontrarlas y mediante trabajo periódico; no tienes que programar una tarea externa por cada clave.

Un `SET` normal sobre una clave existente sustituye el valor y elimina su TTL previo, salvo que uses una opción apropiada como `KEEPTTL`. En cambio, operaciones que modifican una estructura existente, como `HSET` o `INCR`, normalmente conservan su expiración. Al diseñar una caché no presupongas que todas las escrituras reinician el reloj.

### La expiración del dato no avisa a tu base de datos

Caducar una copia no borra el artículo original. Tampoco Redis sabe que una edición SQL requiere invalidar una clave. La aplicación debe coordinar esos significados. Si la caducidad tiene sentido de negocio —por ejemplo, una reserva— decide qué sistema sostiene la regla cuando hay retrasos, reintentos o fallos.

## 3. Cadenas, números y JSON

### Una cadena es un valor completo

Las cadenas pueden contener texto, datos binarios o un documento serializado. Redis no interpreta automáticamente el interior de un JSON guardado con `SET`: reemplazar el título dentro exige leer y volver a escribir el documento completo, salvo que uses otra capacidad específica.

```text
SET articulo:42:visitas 0
INCR articulo:42:visitas
INCRBY articulo:42:visitas 5
GET articulo:42:visitas
```

El resultado final es 6. `INCR` modifica atómicamente un valor entero y crea la clave con el valor inicial correspondiente si falta. Esto evita la carrera de `GET`, suma en Python y `SET`, donde dos clientes pueden sobrescribir el incremento del otro. Si el valor contiene un título en lugar de un entero válido, la operación falla.

`MGET` puede leer varias claves de cadena en una petición. Reduce viajes de red, pero no convierte esos valores en una relación SQL ni resuelve automáticamente operaciones entre nodos en cualquier configuración de cluster.

## 4. Hashes: campos de un mismo registro

### Modificar una parte sin reemplazar todo

```text
HSET articulo:42:meta titulo "Entender HTTP" autor "Ana" publicado 1
HGET articulo:42:meta titulo
HGETALL articulo:42:meta
HDEL articulo:42:meta autor
```

Un hash agrupa campos y valores bajo una clave. `HSET` actualiza campos concretos; `HGETALL` devuelve todos. Con redis-py y decodificación de texto, el resultado de `hgetall()` es un diccionario de cadenas. `publicado` será `"1"`, no un booleano Python por arte de magia.

Elige un hash cuando las operaciones por campo sean útiles. Una cadena JSON puede ser suficiente para un resultado de caché que siempre lees y reemplazas entero. El tipo no se elige porque se parezca más a una clase: se elige por el acceso que necesitas.

## 5. Listas, conjuntos y conjuntos ordenados

### Lista: orden con elementos repetibles

```text
RPUSH articulos:pendientes 42 43
LRANGE articulos:pendientes 0 -1
LPOP articulos:pendientes
```

`RPUSH` añade por la derecha y `LPOP` retira por la izquierda: sirve para ilustrar una cola FIFO. La lista admite repetidos y su orden depende de inserciones y extracciones. `LRANGE 0 -1` devuelve toda la lista; en colecciones grandes debes limitar lo que lees.

Al retirar un elemento ya no está pendiente en esa lista. Si el consumidor cae antes de procesarlo, una cola ingenua lo pierde. [Concurrencia y mensajes](/redis-concurrencia.html) explica por qué confirmaciones y reintentos necesitan un diseño adicional.

### Set: pertenencia sin duplicados ni orden de presentación

```text
SADD articulo:42:etiquetas python django python
SMEMBERS articulo:42:etiquetas
SISMEMBER articulo:42:etiquetas django
SCARD articulo:42:etiquetas
```

El conjunto contiene dos etiquetas, porque `python` no se duplica. `SISMEMBER` comprueba pertenencia y `SCARD` cuenta. No dependas del orden devuelto por `SMEMBERS`; si la interfaz necesita orden alfabético, ordénalo explícitamente o utiliza otra estructura adecuada al requisito.

### Sorted set: miembros únicos con puntuación

```text
ZADD articulos:visitas 10 42 7 43
ZINCRBY articulos:visitas 2 43
ZRANGE articulos:visitas 0 9 REV WITHSCORES
```

Aquí el miembro es el identificador del artículo y la puntuación representa visitas. El conjunto permite consultar posiciones por puntuación. `ZINCRBY` cambia la puntuación de un miembro; no crea un segundo miembro con el mismo identificador. Los empates siguen reglas de orden de Redis, así que define si esa ordenación cumple lo que quiere mostrar tu producto.

## 6. Inspeccionar sin recorrerlo todo de golpe

### SCAN es incremental, no una instantánea

En la terminal del host, para el contenedor de ejemplo:

```bash
docker exec redis-apuntes redis-cli --scan --pattern 'articulo:42:*'
```

La opción `--scan` del cliente realiza la iteración de `SCAN`. El comando Redis devuelve un cursor para continuar; el recorrido termina cuando vuelve a cero. `COUNT` es una orientación de trabajo, no un tamaño de página garantizado. Si los datos cambian durante el recorrido, no obtienes una instantánea consistente y pueden aparecer duplicados; el consumidor debe tolerarlo.

`KEYS *` examina el espacio de claves de una vez y puede bloquear trabajo durante demasiado tiempo en una base grande. Para borrar, selecciona claves conocidas o diseña una política de nombres y expiración; no conviertas una orden global destructiva en un paso de limpieza rutinario.

Si una operación responde de forma inesperada, comprueba `TYPE`, `TTL`, la base lógica seleccionada y el nombre exacto. [DigitalOcean: claves y bases Redis](https://www.digitalocean.com/community/tutorials/how-to-manage-redis-databases-and-keys) ofrece otra explicación práctica de esa inspección.
