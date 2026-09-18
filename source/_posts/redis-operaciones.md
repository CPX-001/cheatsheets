---
title: 'Redis · Operaciones'
date: '2026-09-18'
updated: '2026-09-19'
layout: 'learning'
language: 'es'
disableNunjucks: true
icon: 'redis'
categories: ['Database']
intro: 'Cómo interpretar memoria, caducidad, expulsión y persistencia, y qué comprobar cuando Redis responde lento o los datos no aparecen.'
heading: 'Operaciones'
eyebrow: 'Ruta 06 de 8 · Evitar fallos'
learning_classes: 'learning-page learning-redis learning-page-cards'
background: 'bg-gradient-to-r from-red-700 to-red-900 !text-white redis-card'
---

## 1. Observar el servidor que realmente estás usando

### Conexión correcta antes de inspeccionar claves

Los ejemplos siguientes se ejecutan en `redis-cli` sobre el servidor de desarrollo de [fundamentos](/redis.html). En un servicio remoto necesitas su host, puerto, TLS y autenticación. No copies credenciales a comandos que queden en historiales compartidos o a capturas de diagnóstico.

```text
PING
INFO server
INFO clients
INFO memory
INFO stats
INFO persistence
```

`PING` comprueba que el servidor responde, no que tu aplicación tenga una clave concreta. `INFO` separa información por secciones: versión y ejecución, conexiones, memoria, contadores y persistencia. Algunas órdenes pueden estar limitadas por el proveedor o por permisos; un error de autorización no significa que el servidor esté caído.

Si una clave «ha desaparecido», comprueba primero el destino, la base lógica, el prefijo y el TTL. La caché de Django transforma nombres y serializa valores; usar el nombre lógico crudo en `redis-cli` puede hacerte buscar otra cosa.

## 2. Memoria, expiración y eviction

### Son tres preguntas diferentes

La expiración retira un dato porque terminó su tiempo de vida. La **eviction** o expulsión retira claves para respetar una política de memoria. Un borrado explícito elimina lo que la aplicación indica. Los tres pueden producir un miss, pero tienen causas y consecuencias distintas.

`maxmemory` fija un umbral para el uso de memoria sometido al control de Redis. No debe confundirse con una reserva completa para todo el proceso ni con el límite del contenedor: hay sobrecostes, buffers y operaciones de persistencia. Dejar ambos límites demasiado próximos puede terminar en falta de memoria antes de que el comportamiento sea el esperado.

Las políticas `allkeys-*` pueden elegir entre todas las claves; `volatile-*` limitan la selección a las que tienen expiración. `allkeys-lru` aproxima el criterio de uso reciente; `allkeys-lfu`, la frecuencia. `noeviction` evita expulsar por esa política y puede rechazar escrituras que necesiten memoria al alcanzarse el límite. No detiene la expiración normal.

### La política depende del significado de los datos

Para una caché reconstruible, expulsar una copia puede ser aceptable. Para tareas pendientes o sesiones sin respaldo, puede significar perder información necesaria. Mezclar ambos usos en la misma instancia obliga a compartir presión de memoria y políticas; separar bases lógicas no separa esos recursos.

Observa `used_memory`, memoria residente y fragmentación junto con métricas del host. Un payload pequeño puede consumir más memoria por estructuras y metadatos. `MEMORY USAGE nombre_de_clave` estima el coste de una clave concreta; no extrapoles el tamaño del JSON como si fuera el consumo total.

## 3. RDB y AOF: qué recuperar tras una caída

### Instantáneas frente a registro de escrituras

**RDB** conserva instantáneas del conjunto de datos. La recuperación llega hasta la instantánea disponible; las escrituras posteriores pueden perderse. **AOF** registra operaciones de escritura y reconstruye el estado mediante ese registro y sus mecanismos de compactación. La política de sincronización determina la ventana de pérdida posible.

Con AOF y `appendfsync everysec`, la sincronización al almacenamiento se realiza periódicamente. Reduce trabajo respecto a sincronizar cada escritura, pero admite una ventana de pérdida ante una caída. El comportamiento real depende también del almacenamiento y del tipo de fallo. «Está en disco» no equivale a «la última respuesta confirmada sobrevivirá a cualquier corte».

En el host, este comando crea una instancia de ejemplo distinta de `redis-apuntes`, con un volumen explícito y sin publicar puerto:

```bash
docker run -d --name redis-operaciones \
  --mount source=redis-operaciones-datos,target=/data \
  redis:8-alpine redis-server --appendonly yes --appendfsync everysec
```

El volumen conserva archivos frente a la sustitución del contenedor. La configuración obliga al servidor a producirlos. Son dos responsabilidades: un volumen sin persistencia de Redis no conserva sus datos en memoria; persistencia escrita solo en la capa desechable tampoco sobrevive a eliminar el contenedor.

### Persistencia y copia de seguridad

Los archivos activos de Redis permiten recuperación local, pero pueden verse afectados por borrados lógicos, corrupción, errores de operación o pérdida del host. Una copia de seguridad necesita otro ciclo de conservación y una restauración comprobada. Decide qué pérdida de datos y qué tiempo de recuperación admite el servicio.

Una caché puede reconstruirse desde SQL y quizá no necesite persistir. Eso simplifica almacenamiento, pero exige que el origen soporte el arranque en frío. Un uso durable necesita otra evaluación: réplica, copias y configuración no son adornos intercambiables.

## 4. Latencia y comandos costosos

### El tiempo de una petición incluye más que ejecutar el comando

La aplicación paga espera de pool, red, ejecución, transferencia y decodificación. Un comando rápido puede llegar tarde si la conexión cruza regiones o si el cliente mantiene ocupado su hilo. Un comando que devuelve miles de valores puede consumir tiempo y memoria aunque parezca una sola llamada.

```text
SLOWLOG GET 10
INFO commandstats
```

El slow log ayuda a identificar ejecución de comandos lenta en el servidor; no mide por sí solo toda la latencia de red del cliente. Las estadísticas agregadas permiten reconocer órdenes frecuentes. Evita usar observación muy invasiva de todos los comandos como solución permanente: puede afectar al rendimiento y exponer datos.

Las **big keys** son claves con valores o colecciones muy grandes; las **hot keys**, claves con mucho tráfico. Una clave caliente puede concentrar carga aunque el conjunto se reparta entre nodos. Limita lecturas de colecciones, tamaños de payload y trabajo de scripts. `SCAN` permite inspección incremental, pero no es una instantánea ni una consulta indexada arbitraria.

## 5. Diagnóstico por síntoma

### Relacionar la observación con una hipótesis

| Síntoma                         | Comprobación útil                          |
| ------------------------------- | ------------------------------------------ |
| `Connection refused`            | Host, puerto y proceso escuchando          |
| Timeout                         | Latencia, carga, red y límites del cliente |
| `WRONGTYPE`                     | `TYPE` y convención de claves              |
| Clave ausente                   | TTL, base lógica, prefijo y expulsiones    |
| Escritura rechazada por memoria | Umbral, política y consumo                 |
| Datos ausentes tras recrear     | Persistencia activa y montaje de `/data`   |

Un fallo después de enviar una escritura puede dejar resultado incierto: el servidor pudo ejecutarla aunque no recibieras respuesta. El diagnóstico debe distinguir «no llegó», «falló» y «no sé si se aplicó». Esa última categoría importa especialmente para incrementos y tareas.

Cambiar configuración en vivo puede no sobrevivir a un reinicio si no se conserva en el mecanismo que usa el despliegue. Registra cambios en la configuración versionada o en el proveedor adecuado y verifica el proceso después. [Producción](/redis-produccion.html) conecta estas observaciones con topología y operación continua.
