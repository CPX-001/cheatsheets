---
title: 'Docker · Diagnóstico'
date: '2026-09-18'
updated: '2026-09-19'
layout: 'learning'
language: 'es'
disableNunjucks: true
icon: 'docker'
categories: ['Toolkit']
intro: 'Un recorrido para localizar fallos entre el motor, el proceso, la red y los datos, entendiendo qué demuestra cada comando.'
heading: 'Diagnóstico'
eyebrow: 'Ruta 05 de 6 · Aprende a observar'
learning_classes: 'learning-page learning-docker learning-page-cards'
---

## 1. Identificar qué está fallando

### Una web inaccesible no señala por sí sola la causa

Un navegador puede fallar porque no hay un contenedor, porque su proceso termina, porque escucha en otra dirección, porque el puerto no está publicado o porque la aplicación responde con un error. Reiniciar todo puede ocultar temporalmente el síntoma y perder información útil.

Los ejemplos usan los servicios `web` y `redis` del [tema de Compose](/docker-compose.html). Ejecuta los comandos en el host, desde la carpeta de ese `compose.yaml`. Si utilizas Docker sin Compose, los equivalentes necesitan los nombres de contenedor elegidos con `--name`.

## 2. Motor, proyecto y estado del proceso

### Primero comprueba dónde actúan tus comandos

```bash
docker context show
docker version
docker compose ps -a
docker compose logs --tail=100 web
```

El contexto identifica el motor activo. `version` comprueba que el cliente consigue hablar con él. `ps -a` incluye servicios detenidos, que pueden no aparecer en una lista de solo contenedores activos. `logs` muestra lo que el proceso escribió a stdout y stderr; no descubre automáticamente archivos de log que la aplicación haya guardado en otro sitio.

Si el proceso termina, busca el error previo al cierre: módulo que falta, archivo no encontrado, configuración obligatoria ausente o permiso de escritura. Un código de salida no cero señala un fallo, pero para interpretarlo necesitas el mensaje y el comando que se ejecutó. Un contenedor puede terminar con éxito porque su comando era una tarea breve; no todos deben permanecer activos.

### Inspeccionar un contenedor concreto

Con el ejemplo independiente `redis-apuntes` del [primer tema](/docker.html), estos comandos seleccionan campos relevantes:

```bash
docker inspect --format '{{json .State}}' redis-apuntes
docker inspect --format '{{json .Mounts}}' redis-apuntes
docker port redis-apuntes
```

`.State` muestra estado, salida y posibles comprobaciones de salud. `.Mounts` muestra qué almacenamiento está conectado y dónde. `docker port` enseña las publicaciones al host. Evita copiar una inspección completa a lugares públicos: la configuración del contenedor puede incluir variables sensibles.

## 3. Seguir una conexión por fronteras

### Probar desde el lugar que realmente necesita el servicio

`docker compose exec redis redis-cli PING` comprueba Redis desde su propio contenedor. Es útil, pero no demuestra que `web` resuelva su nombre ni que use la URL correcta. Para comprobar el recorrido de la web, utiliza su cliente Python instalado:

```bash
docker compose exec web python -c 'import os, redis; r = redis.Redis.from_url(os.environ["REDIS_URL"], socket_connect_timeout=1, socket_timeout=1); print(r.ping())'
```

La respuesta esperada es `True`. El comando se ejecuta dentro de `web`, lee su variable y abre una conexión a Redis. Si falla la resolución de nombre, revisa servicio y red. Si la conexión se rechaza, revisa destino, puerto y proceso que escucha. Si hay timeout, el destino puede ser inaccesible o no responder a tiempo. Un error de autenticación implica que has llegado al servidor, pero no con credenciales válidas.

### La frontera de la web con el host

Si Django responde dentro del contenedor pero el navegador no lo alcanza, comprueba que escucha en `0.0.0.0:8000` y que Compose publica el puerto esperado. `127.0.0.1:8000:8000` restringe la publicación al propio host: otra máquina no debe poder usarla como si escuchara en todas las interfaces.

Si el navegador recibe un `400` de Django por host inválido, la red ya entregó la petición; revisa `ALLOWED_HOSTS`. Si recibe `404`, revisa la URL de la aplicación. No cambies la red para arreglar una ruta que Django no tiene.

## 4. Código viejo, dependencias y montajes

### Averiguar qué archivos ve el proceso

```bash
docker compose exec web python -c 'import os, django; print(os.getcwd()); print(django.get_version())'
docker compose images
docker compose config --quiet
```

La carpeta activa y la versión de Django ayudan a detectar imágenes o entornos distintos a los esperados. Un bind mount puede tapar archivos de la imagen: reconstruir no cambiará el código montado del host. Una dependencia instalada durante el build, en cambio, no aparece por editar `requirements.txt` sin reconstruir.

`docker compose restart web` vuelve a ejecutar el mismo contenedor con su configuración. Para incorporar cambios de imagen o variables, usa la reconciliación de `up`, añadiendo `--build` si cambió la construcción. Comprueba después una ruta que contenga el cambio; que el comando termine correctamente no demuestra por sí solo qué contenido está sirviendo el navegador.

## 5. Datos que parecen desaparecer y consumo de recursos

### Localizar el almacenamiento antes de borrar nada

Si aparecen tablas vacías, comprueba la configuración de base, la ruta montada y el nombre del proyecto de Compose. Cambiar el proyecto puede crear un volumen diferente. Recrear un contenedor sin volumen elimina su capa escribible. Y mantener un volumen no ayuda si la aplicación escribió en otra ruta.

`docker stats` muestra consumo de recursos de contenedores; `docker system df` resume espacio usado por imágenes, contenedores y volúmenes. Un proceso terminado por falta de memoria necesita revisar límites y comportamiento de la aplicación, no solo una política de reinicio. «Unhealthy» no significa necesariamente que haya terminado: puede seguir ejecutándose y fallar su healthcheck.

Para recuperar espacio, identifica primero los recursos prescindibles. Las órdenes globales de limpieza tienen un alcance mayor que detener tu proyecto y pueden borrar datos que todavía importan. Un diagnóstico concluye cuando puedes explicar qué frontera fallaba y comprobar la corrección, no cuando desaparece el mensaje tras reiniciar.
