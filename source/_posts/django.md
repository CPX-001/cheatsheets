---
title: 'Django · De HTTP al primer proyecto'
date: '2026-09-18'
updated: '2026-09-19'
layout: 'learning'
language: 'es'
disableNunjucks: true
icon: 'django'
categories: ['Python']
intro: 'Qué hace Django entre una petición y una respuesta, para qué sirve cada archivo y cómo empezar a usarlo con criterio.'
heading: 'De HTTP al primer proyecto'
eyebrow: 'Ruta 01 de 8 · Empieza aquí'
learning_classes: 'learning-page learning-django learning-page-cards'
background: 'bg-gradient-to-r from-emerald-700 to-green-900 !text-white'
---

## 1. Qué problema resuelve Django

### De una función Python a una aplicación web

Una función Python puede calcular un resultado, pero un navegador necesita un servidor que acepte conexiones y responda mediante HTTP. **HTTP** es el protocolo que describe la petición —método, dirección, cabeceras y, a veces, cuerpo— y la respuesta —estado, cabeceras y contenido—. Django organiza el código que decide cómo responder y aporta herramientas para consultar datos, generar HTML, validar formularios y reconocer usuarios.

Piensa en una web de artículos. Al abrir `/articulos/`, el navegador solicita una página; Django consulta qué artículos deben aparecer, prepara el HTML y lo devuelve. Al guardar una edición, recibe los campos enviados, comprueba que son válidos, modifica la base de datos y responde con una redirección. Son recorridos relacionados, pero cumplen trabajos distintos.

Django se ejecuta en el servidor. El navegador recibe el resultado, no ejecuta `views.py` ni las instrucciones de un template. Si ves una página cambiar sin recargarse, hay además código del navegador —normalmente JavaScript— que solicita datos y modifica la interfaz. Django puede responder a esas peticiones con JSON en lugar de HTML.

### El recorrido que conecta las piezas

```text
navegador → servidor HTTP → middleware → resolución de URL → view
                                                          ↓
                                                  ORM / servicios
                                                          ↓
navegador ← respuesta HTTP ← middleware ← HTML o JSON ← resultado
```

El **middleware** es una capa que puede intervenir antes y después de la view: por ejemplo, asociar la sesión a la petición. La resolución de URL encuentra qué función debe atender la dirección. Una **view** es esa función, o una clase que ofrece el mismo punto de entrada. El **ORM** traduce operaciones sobre modelos Python a consultas de base de datos. El **template** convierte datos y una plantilla en texto HTML. No todas las peticiones necesitan todas esas piezas: una comprobación de salud puede devolver un texto sin consultar nada.

## 2. Leer una petición antes de escribir código

### Método, ruta y parámetros

En `GET /articulos/?pagina=2`, `GET` pide una representación del recurso; `/articulos/` es la ruta que se compara con `urls.py`; `pagina=2` es un parámetro de consulta. Ese parámetro no forma parte del patrón de URL. Django lo ofrece en `request.GET`, como texto. Convertirlo a entero y aceptar solo valores razonables es responsabilidad de tu código o de una herramienta como `Paginator`.

`POST` suele enviar datos en el cuerpo para solicitar un cambio. Un formulario HTML convencional produce campos que Django expone en `request.POST`. Un cuerpo JSON es otro formato: no aparece automáticamente en ese diccionario. La respuesta puede ser `200` si todo fue bien, `404` si no existe el recurso o `302` si hay que visitar otra dirección. Un estado describe el resultado HTTP; no sustituye la explicación o los datos de la respuesta.

Una **cabecera** añade información, como `Content-Type: text/html`. Una **cookie** es un valor que el navegador conserva y vuelve a enviar al servidor dentro de sus restricciones de dominio y ruta. Más adelante una cookie permitirá identificar una sesión; eso no significa que el navegador posea las contraseñas o el estado completo del servidor.

## 3. Proyecto, aplicación y entorno

### Tres nombres para tres responsabilidades

El **entorno virtual** contiene las dependencias Python de este trabajo. El **proyecto Django** reúne la configuración de una web: base de datos, aplicaciones, rutas y opciones de ejecución. Una **aplicación Django** agrupa una responsabilidad, por ejemplo `articulos`. Un proyecto puede reunir varias aplicaciones; crear una aplicación por cada pantalla suele fragmentar una misma responsabilidad.

Los ejemplos de estas páginas usan Python 3.12 o posterior y Django 5.2. Esa elección permite reproducir el código; no necesitas cambiar un proyecto existente de versión para comprender el recorrido. En una terminal de Linux o macOS, desde la carpeta que contendrá tu proyecto:

```bash
mkdir web-articulos
cd web-articulos
python3 -m venv .venv
source .venv/bin/activate
python -m pip install 'Django>=5.2,<5.3'
python -m django startproject config .
python manage.py startapp articulos
```

En PowerShell, la activación es `.venv\Scripts\Activate.ps1`. Después de activar el entorno, `python` y `python -m pip` apuntan a ese entorno. El punto final de `startproject config .` coloca `manage.py` en la carpeta actual y crea el paquete `config`; no crea otra carpeta exterior con el mismo nombre.

```text
web-articulos/
├── manage.py
├── config/
│   ├── settings.py
│   ├── urls.py
│   ├── asgi.py
│   └── wsgi.py
└── articulos/
    ├── models.py
    ├── views.py
    ├── admin.py
    └── migrations/
```

`manage.py` carga la configuración y ejecuta comandos de Django. `settings.py` contiene opciones, no la lógica de tus pantallas. `urls.py` distribuye peticiones. `wsgi.py` y `asgi.py` ofrecen una entrada a servidores compatibles: son contratos de ejecución, no páginas web. La carpeta `migrations` conservará cambios versionados del esquema de datos.

### Registrar una aplicación no crea sus URLs

Añade `"articulos"` a la lista `INSTALLED_APPS` de `config/settings.py`, conservando las aplicaciones que ya trae Django. Así Django descubre sus modelos, templates y otros recursos. La exposición de una URL es una decisión diferente, que haremos a continuación. El proyecto recién creado usa SQLite; el archivo de base de datos aparecerá cuando apliques las migraciones.

## 4. Una respuesta cuyo recorrido puedas seguir

### La view recibe una petición y devuelve una respuesta

Crea esta función en `articulos/views.py`. `request` es un objeto que Django entrega a la función en cada petición; no lo creas tú ni es una variable global.

```python
# articulos/views.py
from django.http import HttpResponse


def inicio(request):
    return HttpResponse("La sección de artículos responde.")
```

Crea `articulos/urls.py`, que no aparece al ejecutar `startapp`:

```python
# articulos/urls.py
from django.urls import path
from . import views

app_name = "articulos"
urlpatterns = [path("", views.inicio, name="inicio")]
```

En `config/urls.py`, conserva el admin y conecta las rutas de la aplicación:

```python
# config/urls.py
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("articulos/", include("articulos.urls")),
]
```

`include` delega el resto de la ruta. Para `/articulos/`, el proyecto consume `articulos/` y la aplicación recibe la cadena vacía, que coincide con `path("")`. `name="inicio"` da un identificador a la ruta; `app_name` lo agrupa bajo `articulos:inicio`, útil para generar enlaces sin escribir direcciones a mano.

### Poner en marcha lo que acabas de conectar

En la terminal, en la carpeta que contiene `manage.py` y con el entorno activo:

```bash
python manage.py migrate
python manage.py runserver
```

`migrate` crea las tablas de las aplicaciones instaladas, incluidas las de usuarios y sesiones que trae Django. `runserver` mantiene un servidor de desarrollo en primer plano. Abre `http://127.0.0.1:8000/articulos/`: deberías ver la frase de la view. Una visita a `/` dará `404` porque todavía no hemos definido esa ruta; no demuestra que el servidor esté roto.

Para cerrar el servidor usa `Ctrl+C`. Para ejecutar otro comando mientras funciona, abre otra terminal, entra en la misma carpeta y activa el entorno. `runserver` recarga código durante el desarrollo; el despliegue usa procesos y configuración diferentes, explicados en [producción](/django-produccion.html).

## 5. Identificar una respuesta de error

### Conexión, ruta y código

Cuando falle algo, sitúa primero el fallo en el recorrido: conexión rechazada significa que no llegaste al servidor; `404` puede ser una ruta o un objeto inexistente; `500` significa que el servidor encontró un error al procesar la petición. El traceback de la terminal muestra la excepción y la línea implicada. Leerlo desde la excepción hacia la primera línea de tu código suele ser más útil que cambiar archivos al azar.

Un `TemplateDoesNotExist` apunta al nombre del template, su ubicación o la aplicación que lo contiene. Un `NoReverseMatch` indica que Django no pudo construir una URL con el nombre y los argumentos disponibles. Ambos ocurren después de que la petición haya llegado a Django: reiniciar Redis o cambiar el puerto no corrige esas causas. [URLs y templates](/django-http-templates.html) explica las relaciones entre esos archivos.

Como lectura didáctica complementaria, [Django Girls: tu primer proyecto](https://tutorial.djangogirls.org/es/django_start_project/) desarrolla la creación del proyecto y [sus URLs](https://tutorial.djangogirls.org/es/django_urls/) conectan dirección y view.
