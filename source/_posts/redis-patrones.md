---
title: 'Redis · Patrones'
date: '2026-09-18'
updated: '2026-09-19'
layout: 'learning'
language: 'es'
disableNunjucks: true
icon: 'redis'
categories: ['Database']
intro: 'Cómo pasar de comandos a decisiones de aplicación: caché, invalidación, límites, contadores y sesiones, con sus garantías y sus costes.'
heading: 'Patrones'
eyebrow: 'Ruta 03 de 8 · Aplicar'
learning_classes: 'learning-page learning-redis learning-page-cards'
background: 'bg-gradient-to-r from-red-700 to-red-900 !text-white redis-card'
---

## 1. Caché: una copia con un origen conocido

### Cache-aside conecta lectura rápida y fuente de verdad

Supón que el detalle de un artículo requiere una consulta y un cálculo de presentación que se repiten. La base SQL conserva el artículo. Redis puede guardar el resultado reconstruible durante 60 segundos. **Cache-aside** significa que la aplicación consulta la caché y, si falta el valor, lo obtiene del origen y rellena la copia.

```text
petición → leer clave en Redis
                 ├── existe → devolver copia
                 └── falta → consultar origen → escribir copia con TTL → devolver
```

Un **hit** es encontrar una copia utilizable; un **miss**, no encontrarla. Un timeout o una conexión rechazada es un error de Redis, no un miss normal. La aplicación puede decidir tratar ese fallo como caché prescindible y consultar el origen, pero debe hacerlo explícitamente y observar los fallos.

La clave debe incluir todo lo que cambia el resultado: identificador, versión del formato y, si corresponde, idioma o ámbito de permisos. Guardar bajo la misma clave una respuesta privada y una pública puede devolver datos incorrectos a otras personas. No basta con que el JSON tenga el título esperado.

## 2. TTL e invalidación resuelven problemas diferentes

### Esperar a la caducidad acepta datos antiguos durante un tiempo

Si editas el artículo en SQL y no haces nada en Redis, la copia anterior sigue sirviéndose hasta caducar. Ese margen puede ser aceptable para un contador aproximado y no para un cambio de visibilidad. **Invalidar** es retirar o reemplazar una copia cuando sabes que ya no sirve.

Un orden habitual es guardar en la base, confirmar la transacción y después eliminar la clave. Si la eliminas antes de confirmar, otra petición puede leer aún el dato antiguo y volver a cachearlo. En Django, `on_commit` ayuda a respetar ese orden; la [integración completa](/redis-django.html) muestra dónde colocarlo.

Incluso después del commit existe una carrera posible: una lectura que empezó antes puede terminar escribiendo una copia antigua después de la invalidación. El TTL limita la duración, pero no elimina esa carrera. Si necesitas garantías más estrictas, considera versiones del dato, claves por versión o evitar cachear esa decisión. Explica siempre qué grado de desactualización admite tu caso.

### Ausencia, valor vacío y error

Si un artículo no existe, puedes no cachearlo o guardar una señal de ausencia durante un tiempo breve. Esa **caché negativa** reduce búsquedas repetidas, pero debe invalidarse cuando el recurso se crea. La señal debe distinguirse de valores válidos como una lista vacía o `0`.

No guardes errores transitorios como si fueran respuestas correctas: una caída momentánea de SQL no significa que el artículo haya sido borrado. Y si cambias la forma del JSON, versionar la clave evita que una versión nueva de código lea un formato incompatible dejado por la anterior.

## 3. Evitar que todos recalculen a la vez

### El problema aparece cuando la copia desaparece

Si muchas peticiones encuentran el mismo miss al mismo tiempo, todas pueden consultar la base. Se conoce como **estampida de caché**. Redis rápido no evita esa concurrencia por sí solo: el trabajo costoso ocurre precisamente cuando no hay copia.

Entre las opciones están escalonar expiraciones, añadir una pequeña variación al TTL, coordinar una única reconstrucción temporal o servir una copia anterior mientras otra petición la renueva. Cada opción tiene un coste: más complejidad, datos más viejos o espera. Elige después de medir si el origen soporta los misses.

Un bloqueo temporal con `SET ... NX PX ...` es una pieza, no una solución completa. Necesita un propietario único, expiración y liberación que compruebe ese propietario. El tema de [concurrencia](/redis-concurrencia.html) explica el fallo que evita esa comprobación.

## 4. Contadores y límites de uso

### Una operación atómica evita una lectura y escritura separadas

`INCR articulo:42:visitas` incrementa un contador en una operación. Dos clientes concurrentes no pisan el incremento como podría suceder con GET → suma local → SET. Sin embargo, si una petición se reintenta, puede contar dos veces el mismo evento lógico. Atomicidad e idempotencia responden a preguntas diferentes.

Un límite simple puede contar peticiones por usuario y ventana temporal. Además de incrementar, necesita que el contador expire. Ejecutar `INCR` y luego `EXPIRE` por separado deja una ventana de fallo; reiniciar la expiración en cada petición puede convertir sin querer una ventana fija en otra política. Una operación compuesta atómica permite definir la regla completa, mostrada en el tema de concurrencia.

Elige qué identifica al consumidor: una IP compartida puede agrupar a muchas personas; un identificador controlado por el cliente puede falsificarse. El almacenamiento no decide esa política. También decide qué pasa si Redis falla: permitir, rechazar o degradar temporalmente no tiene el mismo efecto según el recurso protegido.

## 5. Sesiones, resultados y colas

### No todos los datos son prescindibles

Una sesión conserva contexto entre peticiones. Si su contenido solo vive en Redis y se pierde, las personas pueden perder sesión o estado. Si usas Redis como caché de una sesión durable en otro backend, la recuperación cambia. Por eso «poner sesiones en Redis» necesita especificar el backend y sus garantías.

Una cola conserva trabajos por hacer. Una lista permite añadir y retirar elementos, pero retirar antes de completar puede perder trabajo. Un sistema de tareas necesita confirmaciones, reintentos, supervisión y una política para duplicados. Pub/Sub transmite a suscriptores conectados y no sustituye una cola durable. [Mensajería](/redis-concurrencia.html) compara esos recorridos.

## 6. Medir si el patrón está ayudando

### Latencia, coste de origen y uso de memoria

Una caché añade serialización, red y memoria. Para una consulta pequeña y poco repetida, puede costar más que consultar directamente la base. Observa hit rate, latencia de Redis, tiempo del origen, tamaño de valores y tasa de errores. Un hit rate alto tampoco demuestra por sí solo que los datos sean correctos o que la memoria esté bien utilizada.

Define antes de introducirla qué resultado quieres: reducir una consulta costosa, proteger un servicio limitado o compartir un contador. La implementación de [Django](/redis-django.html) aplica cache-aside sobre nuestros artículos; la de [FastAPI](/redis-fastapi.html) explica el mismo recorrido con un cliente asíncrono y su ciclo de vida.
