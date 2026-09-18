---
title: 'Docker · Producción y siguientes pasos'
date: '2026-09-18'
updated: '2026-09-19'
layout: 'learning'
language: 'es'
disableNunjucks: true
icon: 'docker'
categories: ['Toolkit']
intro: 'Cómo llevar una imagen a un entorno estable: versiones, configuración, estado persistente, procesos y comprobación del despliegue.'
heading: 'Producción y siguientes pasos'
eyebrow: 'Ruta 06 de 6 · Despliega con criterio'
learning_classes: 'learning-page learning-docker learning-page-cards'
---

## 1. Una imagen que puedas identificar

### Etiqueta y contenido no son lo mismo

Una etiqueta como `web-articulos:produccion` es un nombre que puede cambiar de destino. Un **digest** identifica contenido concreto. Para reproducir o revertir un despliegue, necesitas saber qué imagen exacta se ejecutó, qué código contiene y qué configuración recibió. Usar `latest` no responde a ninguna de esas preguntas por sí solo.

El proceso habitual construye una imagen desde un commit, ejecuta comprobaciones y la sube a un registro accesible por el entorno. El despliegue crea procesos desde esa imagen. Si construyes de nuevo cada vez sin fijar dependencias y bases, el mismo código puede producir entornos distintos.

Una actualización de seguridad implica reconstruir y desplegar una imagen actualizada. Modificar paquetes manualmente dentro de un contenedor produce un estado difícil de reproducir y se pierde cuando lo sustituyes.

## 2. Separar código, configuración y estado

### Tres cosas con tres ciclos de vida

El código y sus dependencias van en la imagen. La configuración identifica el entorno: hosts, bases, políticas y servicios. El estado —artículos, archivos subidos, colas durables— debe sobrevivir a reemplazos cuando así lo requiera la aplicación.

En desarrollo usamos `.:/app` para editar código desde el host. En producción normalmente se ejecuta el código de la imagen, sin ese montaje. Una base de datos vive en un servicio con almacenamiento persistente o en un volumen adecuadamente operado. Una copia de seguridad debe poder restaurarse fuera del contenedor original; tener un volumen no demuestra eso.

Los secretos se entregan mediante el mecanismo privado del entorno de ejecución. Un `ENV` en el Dockerfile queda asociado a la imagen; un `.env` copiado dentro deja de ser privado por el mero hecho de llamarse así. Tampoco imprimas la configuración resuelta completa en un log público si contiene credenciales.

## 3. Cambiar el proceso principal con intención

### Desarrollo y producción no utilizan el mismo servidor por defecto

El [Dockerfile de la guía](/docker-dockerfile.html) instala Gunicorn, pero su `CMD` arranca `runserver` para desarrollar. En una configuración de despliegue puedes sustituir el comando por:

```text
gunicorn config.wsgi:application --bind 0.0.0.0:8000
```

Eso selecciona un servidor WSGI para la aplicación `config`. Sigue siendo necesario configurar Django para producción, servir estáticos, proporcionar secretos y resolver HTTPS en la plataforma o proxy. [Producción de Django](/django-produccion.html) explica esas piezas. No basta con cambiar una palabra en el comando para completar un despliegue.

El número de workers se elige según memoria, carga y naturaleza de las peticiones. Multiplicarlos también multiplica conexiones a bases y pools de clientes. Un cálculo lento consume recursos; una espera de red necesita timeouts. El contenedor ofrece aislamiento y límites, pero la capacidad real sigue perteneciendo al host.

### Señales y cierre ordenado

Al detener el contenedor, Docker comunica al proceso principal que debe terminar y concede un plazo antes de forzarlo. El servidor debe cerrar peticiones y conexiones dentro de ese margen. La forma de lista de `CMD` evita un shell innecesario que pueda complicar la entrega de señales. Si usas un script de entrada, terminar con `exec ...` ayuda a que el servidor ocupe el lugar del proceso principal.

Una política de reinicio recupera determinados procesos que terminan; no corrige errores persistentes ni garantiza disponibilidad durante una sustitución. Un bucle de reinicios puede consumir recursos y repetir una operación de arranque mal diseñada.

## 4. Preparar datos y comprobar salud

### Las migraciones son una operación del despliegue

No hagas que cada réplica ejecute migraciones simultáneamente como efecto secundario de arrancar. Coordina una operación de preparación contra la base correcta y comprueba su resultado. Durante cambios graduales, una versión nueva y otra antigua pueden coexistir: el esquema debe ser compatible con esa transición o el despliegue debe planificar una interrupción.

Una **comprobación de vida** responde si el proceso puede seguir trabajando. Una **comprobación de preparación** responde si está en condiciones de recibir tráfico. El comportamiento concreto depende del supervisor o plataforma. Un healthcheck de Docker registra salud, pero no crea por sí solo un balanceador ni todas las políticas de recuperación.

Consultar dependencias en una comprobación debe ser breve y deliberado. Si la caída temporal de una caché provoca reinicios continuos de todas las webs, quizá el control está empeorando un fallo que la aplicación podía tolerar consultando la base.

## 5. Desplegar y comprobar lo que recibe la persona

### La verificación necesita una marca del cambio

Después de sustituir contenedores, verifica una ruta pública con contenido propio de la versión nueva. Comprueba también los recorridos relevantes: lectura de datos, autenticación y escritura autorizada cuando correspondan. Un `200` de una página estática anterior no demuestra que la aplicación nueva esté recibiendo tráfico.

Conserva logs útiles y la relación entre commit, imagen y despliegue. Evita registrar secretos o cuerpos sensibles. Las métricas de error, latencia y recursos ayudan a distinguir un despliegue correcto con poca capacidad de un despliegue de código incorrecto.

### Revertir código no siempre revierte datos

Volver a una imagen anterior puede restaurar comportamiento, pero una migración de base o una escritura incompatible puede impedirlo. Antes de un cambio irreversible, define cómo conservar compatibilidad o restaurar datos. Una copia sin restauración probada no demuestra capacidad de recuperación.

No necesitas empezar con un orquestador complejo. Compose puede describir un entorno en un host; varias máquinas, sustituciones sin interrupción y coordinación avanzada plantean otros requisitos. Introduce esas herramientas cuando puedas nombrar el problema que resuelven y observar si lo resolvieron.
