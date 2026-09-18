---
title: 'Docker · Fundamentos'
date: '2026-09-18'
updated: '2026-09-19'
layout: 'learning'
language: 'es'
disableNunjucks: true
icon: 'docker'
categories: ['Toolkit']
intro: 'Qué son una imagen, un contenedor y el motor de Docker; cómo se relacionan con procesos, puertos y archivos de tu máquina.'
heading: 'Fundamentos'
eyebrow: 'Ruta 01 de 6 · Empieza aquí'
learning_classes: 'learning-page learning-docker learning-page-cards'
background: 'bg-gradient-to-r from-sky-700 to-blue-700 !text-white'
---

## 1. El problema que resuelve un contenedor

### Empaquetar un entorno de ejecución

Una aplicación depende de un intérprete, bibliotecas, archivos y configuración. Instalarla directamente en cada máquina puede producir diferencias difíciles de reproducir. Docker permite describir un entorno, construir una imagen y crear procesos aislados a partir de ella. No decide por ti dónde guardar los datos ni qué servicios necesita la aplicación.

Una **imagen** es una plantilla con archivos y metadatos de ejecución. Un **contenedor** es una instancia creada desde esa imagen: tiene configuración, identidad, una capa escribible y un proceso principal. La misma imagen puede originar varios contenedores independientes. Cambiar archivos dentro de uno no modifica la imagen ni los otros.

En Linux, los procesos de un contenedor comparten el kernel del host, con aislamiento y límites proporcionados por el sistema. Docker Desktop suele ejecutar los contenedores Linux dentro de una máquina virtual. Por eso «mi ordenador» y «el sistema donde vive el contenedor» no siempre son exactamente el mismo entorno, aunque el cliente te permita manejarlos de forma parecida.

## 2. Cliente, motor y registro

### El comando no es el proceso que ejecuta la aplicación

```text
tu terminal: docker ... → motor de Docker → crea contenedor → proceso principal
                                 ↑
                        imagen local o registro
```

El comando `docker` es un cliente. Envía peticiones al **motor**, que administra imágenes, redes y contenedores. El motor puede ser local o estar en otra máquina según el contexto activo. Un **registro** almacena imágenes; Docker Hub es un ejemplo. Descargar una imagen no inicia su aplicación.

Con Docker instalado y el motor arrancado, ejecuta estos comandos en la terminal del host:

```bash
docker version
docker context show
docker info
```

`version` muestra versiones del cliente y, si hay conexión, del servidor. Si aparece información del cliente pero falla el servidor, el problema suele ser el acceso al motor, no la imagen que intentabas usar. `context show` ayuda a identificar qué motor recibiría tus órdenes. Los comandos siguientes asumen el motor de desarrollo que quieres utilizar.

## 3. Seguir un contenedor real

### Redis como proceso identificable

Redis es un servidor que escucha conexiones y guarda estructuras de datos. Lo usamos aquí porque permite observar un proceso de larga duración y comunicarnos con él mediante `redis-cli`. La guía de [Redis](/redis.html) explica para qué sirve ese servicio; en este tema nos centramos en su ejecución.

```bash
docker run -d --name redis-apuntes -p 127.0.0.1:6379:6379 redis:8-alpine
docker ps
docker logs redis-apuntes
docker exec redis-apuntes redis-cli PING
```

`run` crea y arranca un contenedor. Si falta `redis:8-alpine`, primero descarga la imagen. `redis` es el repositorio y `8-alpine` la etiqueta, que selecciona una variante. Una etiqueta puede apuntar a otro contenido en el futuro; en [producción](/docker-produccion.html) distinguimos etiqueta y digest.

`-d` deja el proceso separado de la terminal. `--name` asigna un nombre para operaciones posteriores. `-p 127.0.0.1:6379:6379` publica el puerto 6379 del contenedor en el 6379 de la interfaz local del host. Esta elección permite usarlo desde tu máquina sin publicarlo en todas sus interfaces. Si el puerto está ocupado, cambia el número del host, por ejemplo `127.0.0.1:6380:6379`.

`exec` inicia un proceso adicional dentro del contenedor ya arrancado. En el último comando, ese proceso es `redis-cli`, que envía `PING` al servidor Redis; la respuesta esperada es `PONG`. No es el motor de Docker quien responde a ese comando de Redis.

### Entrar en un shell no cambia tu terminal original

```bash
docker exec -it redis-apuntes sh
```

`-i` mantiene la entrada y `-t` asigna un terminal. Ahora estás en un shell del contenedor. `exit` termina ese shell adicional y te devuelve al host; Redis continúa porque no era ese shell su proceso principal. Usamos `sh` porque una imagen pequeña puede no tener Bash. Instalar herramientas a mano dentro sirve para una investigación puntual, pero una instalación necesaria para la aplicación debe quedar descrita en la imagen.

## 4. El ciclo de vida explica dónde está el estado

### Detener, arrancar y recrear no son sinónimos

```bash
docker stop redis-apuntes
docker ps -a
docker start redis-apuntes
```

`stop` solicita terminar el proceso principal y, si no termina dentro del plazo, el motor puede forzarlo. `ps -a` incluye contenedores detenidos. `start` arranca el contenedor existente: conserva su configuración y capa escribible. No descarga otra imagen ni incorpora un Dockerfile que hayas editado.

Cuando el proceso principal termina, el contenedor queda detenido. Un proceso adicional iniciado con `exec` no transforma un contenedor detenido en un servicio disponible. Ejecutar otra vez `docker run --name redis-apuntes ...` tampoco lo reinicia: intenta crear uno nuevo y el nombre existente entra en conflicto.

Para eliminar este contenedor concreto después de probarlo:

```bash
docker stop redis-apuntes
docker rm redis-apuntes
```

`rm` elimina el contenedor y su capa escribible. Los volúmenes con nombre tienen otro ciclo de vida. Redis también distingue datos en memoria y datos persistidos en archivos; tener un volumen no obliga al servidor a escribir en él. Veremos ambos lados en [redes y datos](/docker-redes-datos.html).

## 5. Cómo interpretar los primeros fallos

### Identifica en qué frontera se produce el error

| Lo que observas                               | Qué comprobar primero                         |
| --------------------------------------------- | --------------------------------------------- |
| No conecta con el daemon                      | Motor encendido y contexto activo             |
| «name is already in use»                      | `docker ps -a` y contenedor existente         |
| «port is already allocated»                   | Puerto del host ocupado por otro proceso      |
| El contenedor se detiene inmediatamente       | `docker logs` y comando principal             |
| El contenedor está activo pero la web no abre | Dirección de escucha y publicación de puertos |

Un contenedor activo solo demuestra que su proceso principal sigue ejecutándose. No demuestra que la base esté disponible, que las credenciales sean válidas o que la página entregue el contenido esperado. Esta distinción reaparece en comprobaciones de salud y despliegues.

Para construir una imagen de tu propia aplicación, continúa con [Dockerfile](/docker-dockerfile.html). Como material didáctico complementario, [The Docker Handbook de freeCodeCamp](https://www.freecodecamp.org/news/the-docker-handbook/) y [el curso de Docker de José Domingo](https://plataforma.josedomingo.org/pledin/cursos/docker2024/) desarrollan imágenes, contenedores y redes con recorridos prácticos.
