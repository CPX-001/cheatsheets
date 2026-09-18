---
title: 'Redis · Producción'
date: '2026-09-18'
updated: '2026-09-19'
layout: 'learning'
language: 'es'
disableNunjucks: true
icon: 'redis'
categories: ['Database']
intro: 'Cómo elegir topología y garantías según el uso de Redis, y cómo operar caché, sesiones o trabajo pendiente sin tratarlos como datos equivalentes.'
heading: 'Producción'
eyebrow: 'Ruta 08 de 8 · Profundizar'
learning_classes: 'learning-page learning-redis learning-page-cards'
background: 'bg-gradient-to-r from-red-700 to-red-900 !text-white redis-card'
---

## 1. Definir qué datos estás protegiendo

### La decisión empieza por la pérdida aceptable

Una caché pública puede reconstruirse desde SQL; un contador aproximado quizá tolere pérdidas; una sesión puede cerrar el acceso de una persona al desaparecer; una cola puede perder trabajo necesario. Elegir persistencia, memoria y recuperación requiere saber qué papel cumple cada conjunto de claves.

Una misma instancia comparte CPU, memoria y políticas entre sus bases lógicas. Separarlas mediante `/0` y `/1` ayuda a organizar nombres, pero no proporciona aislamiento operativo equivalente a instancias distintas. Si una caché puede expulsar datos y una cola no, esa diferencia merece una separación deliberada.

Define también el tiempo de recuperación admisible. Recuperar una caché vacía puede producir una avalancha sobre SQL; recuperar una cola desde una copia antigua puede repetir trabajos o perder los últimos. La arquitectura debe explicar ese arranque, no solo el estado normal.

## 2. Instancia, réplica, Sentinel y Cluster

### Cada topología resuelve una necesidad distinta

Una instancia única es sencilla, pero concentra el fallo. Una réplica recibe cambios del primario y puede servir lecturas bajo las reglas de tu diseño. La replicación suele ser asíncrona: una réplica puede ir por detrás y un failover puede perder escrituras recientes. Tener una copia no significa leer siempre el último valor confirmado por el primario.

**Sentinel** supervisa un conjunto con primario y réplicas y coordina la elección de un nuevo primario ante determinados fallos. El cliente debe descubrir o seguir al primario apropiado. Sentinel no reparte el conjunto de claves entre varios primarios para aumentar capacidad de memoria.

**Redis Cluster** reparte claves en slots entre nodos. Permite distribuir datos y combina esa distribución con replicación y failover. Añade restricciones: operaciones con varias claves suelen necesitar que estén en el mismo slot. Un cliente normal dirigido a un nodo no equivale a un cliente consciente del cluster.

### Hash tags y claves relacionadas

Las llaves en un nombre, como `articulo:{42}:resumen` y `articulo:{42}:estado`, pueden colocar esas claves en el mismo slot por la parte compartida. Eso permite ciertas operaciones conjuntas, pero agrupar demasiadas claves también concentra carga. Los nombres se diseñan según operaciones y distribución, no solo para que se vean ordenados.

Cluster utiliza la base lógica 0; no traslades sin revisión un diseño que depende de seleccionar varias bases. Más nodos tampoco solucionan automáticamente una única clave caliente, porque esa clave sigue perteneciendo a un lugar concreto.

## 3. Conexiones, red y acceso

### El servicio debe tener una frontera de confianza

En desarrollo publicamos Redis en `127.0.0.1` del host. En producción, utiliza conectividad privada o restricciones de red adecuadas, autenticación y TLS cuando el recorrido lo requiera. `rediss://` activa TLS en un cliente compatible; el certificado y su verificación siguen importando.

Las **ACL** permiten limitar usuarios, comandos y patrones de claves. Una aplicación de caché no necesita necesariamente permisos administrativos. No conviertas Redis en un servicio abierto por comodidad, especialmente si almacena objetos serializados que otra aplicación deserializa.

Un pool reutiliza conexiones del proceso. Multiplicar workers multiplica pools y conexiones potenciales. Configura límites y timeouts teniendo en cuenta la capacidad del proveedor. Los reintentos necesitan un presupuesto: varios timeouts encadenados pueden mantener una petición esperando mucho más de lo que parece indicar un valor individual.

## 4. Comportamiento ante fallos

### Elegir degradación según la responsabilidad

Para una caché, puedes consultar la base si Redis falla. Eso protege disponibilidad, pero aumenta carga en el origen; necesitas que soporte la degradación o limitarla. Para un rate limit de un recurso sensible, permitir todo durante una caída puede incumplir la política. Para una cola, aceptar una solicitud sin conservar el trabajo puede mentir sobre lo que el sistema hará.

En la [integración Django](/redis-django.html) capturamos fallos de conexión y timeout porque la copia es prescindible. La respuesta sigue dependiendo de SQL y los fallos se registran. No aplicamos esa regla a cualquier uso de Redis ni ocultamos cualquier excepción.

Una respuesta perdida deja incertidumbre sobre una escritura. Reintentar un `SET` del mismo resultado, un `INCR` y un evento de cobro son operaciones con consecuencias distintas. Diseña idempotencia donde se repitan solicitudes lógicas y observa también los casos «no sé si se aplicó».

## 5. Capacidad, copias y cambios

### Medir antes de aumentar complejidad

Observa memoria, expulsiones, expiraciones, hit rate, latencia, conexiones y carga de comandos. Para Streams, añade pendientes y retraso de consumidores. Una caché con muchos hits puede estar sirviendo contenido antiguo; una cola con pocos errores visibles puede tener trabajo atascado. Relaciona métricas técnicas con el resultado que necesita la aplicación.

Prueba la restauración de persistencia y copias en un entorno separado. Verifica qué datos recuperas, cuánto tardas y qué pasa con escrituras posteriores a la copia. La replicación también replica errores lógicos, por lo que no reemplaza un historial de copias.

Actualizar una versión requiere revisar compatibilidad de servidor, clientes, persistencia y proveedor. Fija una versión deliberada para desplegar y prepara una reversión compatible. Una etiqueta de imagen mutable no permite reconstruir con certeza el entorno de una incidencia.

## 6. Tres usos, tres diseños comprensibles

### Caché de una web

SQL conserva artículos; Redis guarda representaciones con TTL. Las escrituras invalidan copias y los fallos de Redis pueden derivar al origen. Se priorizan frescura suficiente, memoria acotada y capacidad de absorber misses. La caché puede arrancar vacía si el origen lo soporta.

### Sesiones compartidas

Varios workers necesitan reconocer la misma sesión. El backend elegido decide si Redis contiene todo el estado o acelera una base durable. La expulsión, caducidad y recuperación afectan al acceso de personas; no heredes sin revisión la política de una caché de artículos.

### Trabajo pendiente

La aplicación conserva trabajos; consumidores los procesan y confirman; los pendientes se recuperan y los efectos toleran duplicados. Persistencia, retención y reintentos importan tanto como la velocidad de Redis. Pub/Sub por sí solo no ofrece ese recorrido.

La evolución razonable parte de uno de esos usos, mide su límite y añade solo la coordinación necesaria. Para repasar las piezas concretas, el [glosario](/redis-glosario.html) conecta cada término con su página; [operaciones](/redis-operaciones.html) explica cómo observar el servidor.
