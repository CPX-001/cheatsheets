---
title: 'Django · Async, tareas y producción'
date: '2026-09-18'
updated: '2026-09-19'
layout: 'learning'
language: 'es'
disableNunjucks: true
icon: 'django'
categories: ['Python']
intro: 'Qué cambia al servir una aplicación real: procesos, configuración, archivos, trabajo asíncrono y operaciones que deben sobrevivir a una petición.'
heading: 'Async, tareas y producción'
eyebrow: 'Ruta 08 de 8 · Siguiente nivel'
learning_classes: 'learning-page learning-django learning-page-cards'
---

## 1. De runserver a un proceso de aplicación

### El código necesita un servidor y un entorno

`runserver` ofrece recarga y diagnóstico para desarrollo. En un despliegue, un servidor de aplicaciones mantiene procesos que cargan Django y atienden peticiones. Un proxy o la plataforma puede terminar HTTPS, servir archivos y reenviar solicitudes. La base de datos y Redis son procesos independientes; no aparecen dentro de Django por instalar sus clientes Python.

**WSGI** y **ASGI** son interfaces entre el servidor y la aplicación. WSGI describe un recorrido síncrono; ASGI permite también ejecución asíncrona y otros tipos de conexión, según el servidor y la aplicación. Cambiar de interfaz no convierte automáticamente cualquier función en asíncrona ni acelera CPU.

Para ejecutar el proyecto de estas guías mediante WSGI, en un entorno Linux con sus dependencias instaladas, puedes instalar Gunicorn y arrancar desde la carpeta que contiene `manage.py`:

```bash
python -m pip install gunicorn
gunicorn config.wsgi:application --bind 0.0.0.0:8000
```

`config.wsgi:application` significa «importa el módulo y usa su objeto `application`». Escuchar en `0.0.0.0` permite recibir conexiones por las interfaces del proceso; no configura HTTPS ni expone por sí mismo un puerto de un contenedor. Esa segunda parte se explica en [redes de Docker](/docker-redes-datos.html).

## 2. Configuración que expresa el entorno

### Variables de entorno no son una selección automática de settings

El módulo indicado por `DJANGO_SETTINGS_MODULE` sigue siendo el que carga el proceso. Un contenedor puede ejecutar por error configuración de desarrollo si nadie la cambió. En un `settings.py` mantenido puedes leer variables y fallar si falta un dato imprescindible:

```python
import os

DEBUG = os.environ.get("DJANGO_DEBUG", "0") == "1"
SECRET_KEY = os.environ["DJANGO_SECRET_KEY"]
ALLOWED_HOSTS = [
    host.strip()
    for host in os.environ["DJANGO_ALLOWED_HOSTS"].split(",")
    if host.strip()
]
```

Este fragmento sustituye las opciones correspondientes, no es un archivo de settings completo. Antes de arrancar hay que proporcionar las variables. `SECRET_KEY` debe ser privada y estable entre procesos que comparten el entorno; cambiarla puede invalidar firmas o sesiones. No la metas en una imagen, en Git ni en un ejemplo con un valor que alguien confunda con una clave real.

`DEBUG=False` evita páginas de error con detalles internos; exige además resolver cómo se sirven archivos estáticos. `ALLOWED_HOSTS` enumera nombres de host aceptados, sin esquema ni ruta. CSRF y cookies seguras requieren configuración coherente con HTTPS y con el proxy real. No actives confianza en cabeceras reenviadas sin saber quién puede enviarlas.

## 3. Base de datos, migraciones y archivos

### Código y datos tienen ciclos de vida diferentes

Una imagen nueva debe poder reemplazar el proceso sin destruir artículos ni archivos subidos. La base necesita almacenamiento persistente y copias restaurables. Las migraciones se aplican contra la base del entorno adecuado durante el despliegue; evita que cada worker intente ejecutarlas a la vez al arrancar.

Desde el entorno de despliegue, con sus variables ya configuradas:

```bash
python manage.py check --deploy
python manage.py migrate
python manage.py collectstatic --noinput
```

`check --deploy` señala configuraciones relevantes, pero no comprueba que la web pública use la imagen correcta ni que tus copias se restauren. `migrate` modifica el esquema según los archivos versionados. `collectstatic` reúne archivos estáticos en `STATIC_ROOT`; no reúne los archivos subidos por usuarios.

**Static** son recursos de la aplicación, como CSS y JavaScript. **Media** son archivos recibidos durante el uso. Configura quién sirve cada uno y dónde persisten. Guardar media solo en el sistema de archivos efímero de un contenedor perderá datos cuando lo reemplaces. La guía de [Docker y producción](/docker-produccion.html) amplía el ciclo imagen → proceso → almacenamiento.

## 4. Async y tareas en segundo plano

### Esperar red y dejar trabajo pendiente son cosas distintas

Una función `async def` puede ceder el control mientras espera una operación compatible con `await`. Eso permite aprovechar el tiempo de espera para otras tareas del mismo bucle de eventos. Ejecutar dentro una función bloqueante ocupa ese bucle; hacer cálculo intenso también lo ocupa. La palabra `async` no crea un worker independiente.

Un envío de correo que debe completarse aunque la persona cierre la página es un trabajo con otro ciclo de vida. Una cola durable guarda la solicitud; un **worker** la consume; el sistema decide reintentos y registro de fallos. Bibliotecas como Celery o RQ pueden organizar ese recorrido, pero hay que arrancar y supervisar sus workers además del servidor web.

```text
petición → guardar cambio → confirmar transacción → encolar trabajo
                                                     ↓
                                           worker independiente
                                                     ↓
                                         efecto y estado final
```

Para encolar un trabajo sobre una fila recién creada, esperar al commit evita que el worker la busque antes de que sea visible. `transaction.on_commit` ayuda con ese orden, pero no garantiza que la publicación en la cola sobreviva a una caída entre el commit y el envío. Si perder el trabajo es inaceptable, usa un registro durable y un mecanismo de recuperación.

### Reintentos e idempotencia

Un worker puede completar un efecto y perder la confirmación antes de marcarlo como terminado. El reintento repetirá la solicitud. **Idempotencia** significa que repetir la misma operación lógica no duplica su efecto final: por ejemplo, registrar una clave única del trabajo antes de crear un resultado duplicable. «Se ejecuta en una cola» no equivale a «ocurre exactamente una vez».

## 5. Observar una aplicación desplegada

### Comprobar contenido, dependencias y capacidad de recuperación

Un proceso vivo puede estar respondiendo errores; una página `200` puede estar servida desde una versión anterior. Después de desplegar, comprueba una ruta que contenga el cambio esperado, una lectura de datos y una operación autorizada relevante. Consulta los logs del proceso que realmente recibe tráfico.

Los logs deben ayudar a relacionar una petición con un fallo sin incluir contraseñas, cookies o cuerpos sensibles. Una comprobación de salud breve informa al supervisor; no sustituye métricas de latencia, errores y disponibilidad de dependencias. Decide además qué hace la aplicación si falla Redis: una caché puede permitir consultar la base, mientras que una cola caída puede impedir aceptar nuevos trabajos.

El orden para introducir complejidad es comprensible: primero identifica el recorrido y sus datos; luego mide qué falla o tarda; después añade procesos o caché que resuelvan ese problema concreto. Volver a [la arquitectura](/django-arquitectura.html) ayuda a decidir dónde colocar esas fronteras.
