---
title: 'Redis · Concurrencia y mensajes'
date: '2026-09-18'
updated: '2026-09-19'
layout: 'learning'
language: 'es'
disableNunjucks: true
icon: 'redis'
categories: ['Database']
intro: 'Qué significa atomicidad en Redis, cómo coordinar varias operaciones y en qué se diferencian Pub/Sub, Streams y una cola de trabajos.'
heading: 'Concurrencia y mensajes'
eyebrow: 'Ruta 07 de 8 · Profundizar'
learning_classes: 'learning-page learning-redis learning-page-cards'
background: 'bg-gradient-to-r from-red-700 to-red-900 !text-white redis-card'
---

## 1. Atomicidad no es una garantía para cualquier secuencia

### Un comando puede proteger un cambio que dos comandos no protegen

Si dos clientes leen el contador 10, ambos calculan 11 y ambos escriben 11, una visita se pierde. `INCR` realiza el incremento como una operación atómica. Otro comando no observa una actualización parcial de ese incremento.

Pero si una petición se reintenta tras perder la respuesta, `INCR` puede ejecutarse dos veces. **Atomicidad** trata la indivisibilidad de una operación; **idempotencia**, el efecto de repetir una misma solicitud lógica. No resuelven el mismo problema.

Un pipeline agrupa envíos para reducir viajes de red. No debes atribuirle una garantía transaccional sin mirar cómo está configurado el cliente. En redis-py, `pipeline()` utiliza una transacción por defecto; para mostrar solo agrupación sin esa garantía se especifica `transaction=False`.

```python
from redis import Redis

with Redis.from_url("redis://127.0.0.1:6379/0", decode_responses=True) as r:
    with r.pipeline(transaction=False) as lote:
        lote.incr("articulo:42:visitas")
        lote.get("articulo:42:visitas")
        resultados = lote.execute()
    print(resultados)
```

Este archivo Python usa el servidor del [primer tema](/redis.html). Las respuestas mantienen el orden de los comandos enviados. Con `transaction=False`, otros clientes pueden intervenir entre operaciones; el valor leído no es una prueba de que solo ocurrió tu incremento.

## 2. MULTI, EXEC y WATCH

### Agrupar comandos y detectar cambios

Dentro de `redis-cli`, `MULTI` inicia una secuencia que queda encolada hasta `EXEC`. Al ejecutarla, otros clientes no intercalan comandos entre sus operaciones. Esto no proporciona rollback general como una transacción SQL: un error de ejecución de un comando no revierte automáticamente los que ya se aplicaron.

```text
MULTI
SET articulo:42:estado publicado
INCR articulos:publicaciones
EXEC
```

Las respuestas anteriores a `EXEC` indican encolado; el resultado final contiene las respuestas. El ejemplo junta dos escrituras, pero no actualiza una base SQL ni garantiza que el contador represente publicaciones únicas si repites el bloque.

`WATCH` añade control optimista: observas claves, lees su estado y preparas una transacción; si esas claves cambian antes de `EXEC`, la ejecución se aborta y el cliente puede volver a evaluar la decisión. El reintento debe tener límites. Durante la secuencia, el cliente necesita conservar la conexión apropiada; las abstracciones transaccionales de la biblioteca ayudan a manejar ese detalle.

## 3. Una regla compuesta en el servidor

### Incrementar y poner TTL sin una ventana entre comandos

Un contador de solicitudes necesita expirar para empezar otra ventana. Si el proceso cae después de `INCR` pero antes de `EXPIRE`, puede dejarlo sin caducidad. Un script Lua permite expresar ambas operaciones en una ejecución atómica respecto a otros comandos.

Dentro de `redis-cli`:

```text
EVAL "local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end; return n" 1 limite:usuario:7 60
```

`1` indica que hay una clave entre los argumentos. `KEYS[1]` es `limite:usuario:7`; `ARGV[1]` es el TTL 60. La primera llamada crea el contador y su caducidad; las siguientes lo incrementan sin prolongar la ventana. La aplicación puede permitir hasta cierto valor y rechazar después. Esta ventana empieza con la primera solicitud, no necesariamente al comienzo de un minuto del reloj.

La clave debe estar reservada para esta política y los argumentos deben ser válidos. Los scripts no tienen rollback general ante errores: una escritura anterior a un error puede haber ocurrido. Además, un script largo bloquea la atención de otros comandos; no traslades al servidor bucles sin límite o trabajo arbitrario.

### Bloqueos temporales y propiedad

`SET bloqueo:articulo:42 token-unico NX PX 5000` intenta crear una clave solo si falta y con cinco segundos de vida. El token identifica al propietario. Liberarla con un `DEL` ciego es incorrecto: si tu bloqueo caducó y otro cliente adquirió uno nuevo, borrarías el suyo. La comparación del token y el borrado deben hacerse de forma atómica, normalmente mediante un script.

La expiración evita un bloqueo eterno, pero un proceso pausado puede reanudar trabajo después de perder su turno. Para proteger efectos críticos hacen falta garantías adicionales en el recurso protegido, como versiones o fencing tokens. Un lock Redis sencillo no sustituye automáticamente las restricciones y transacciones de la base.

## 4. Pub/Sub: comunicar a quien está escuchando

### La desconexión cambia qué mensajes recibes

En un primer `redis-cli`, ejecuta `SUBSCRIBE articulos:novedades`. Ese cliente queda escuchando. En otro cliente, publica:

```text
PUBLISH articulos:novedades "Se publicó el artículo 42"
```

El suscriptor conectado recibe el mensaje. Si estaba desconectado, no obtiene una bandeja de pendientes al volver. Pub/Sub es útil para avisos efímeros cuando el receptor puede reconstruir el estado por otro medio. No lo uses como si conservara tareas que deban ejecutarse incluso durante una caída.

El número devuelto por `PUBLISH` describe recepción por suscriptores según esa operación, no que una tarea de negocio haya terminado correctamente. Recibir, procesar y confirmar son etapas distintas.

## 5. Streams y grupos de consumidores

### Un registro permite recuperar trabajo pendiente

Un Stream guarda entradas ordenadas con identificadores. Un grupo de consumidores mantiene progreso y entradas entregadas todavía pendientes de confirmación. Dentro de `redis-cli`, este recorrido crea el grupo, añade un evento y entrega trabajo al consumidor:

```text
XGROUP CREATE eventos:articulos publicaciones 0 MKSTREAM
XADD eventos:articulos * tipo publicado articulo_id 42
XREADGROUP GROUP publicaciones worker-1 COUNT 1 STREAMS eventos:articulos >
```

`MKSTREAM` crea el Stream si falta; crear el mismo grupo otra vez devuelve un error de grupo existente. `*` solicita un identificador generado. `>` pide entradas nuevas para ese grupo. Se escribe dentro del cliente Redis; en un shell, `>` tiene otro significado y requeriría el tratamiento correspondiente.

Cuando el consumidor termina el trabajo, usa `XACK` con el Stream, el grupo y el identificador exacto que recibió. No confirma «el último evento» por su posición ni borra necesariamente la entrada del Stream. Si el consumidor cae antes de confirmar, el grupo conserva información pendiente que otro consumidor puede reclamar según la política, por ejemplo con `XAUTOCLAIM`.

### Entrega recuperable no significa efecto único

Un proceso puede completar el efecto y caer antes del ACK. Otro lo repetirá al reclamarlo. Diseña el efecto para tolerar duplicados, por ejemplo mediante una clave única de operación en la base de datos. También necesitas retención, supervisión de pendientes y una política para trabajos que fallan repetidamente.

Streams conserva más estado que Pub/Sub, pero su durabilidad sigue dependiendo de persistencia, replicación y operación de Redis. Una biblioteca de colas añade convenciones y workers; no elimina esas decisiones. [Producción](/redis-produccion.html) explica dónde encajan esas garantías.
