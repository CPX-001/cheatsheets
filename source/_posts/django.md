---
title: 'Django · Base'
date: '2026-09-18'
updated: '2026-09-21'
layout: 'learning'
language: 'es'
disableNunjucks: true
icon: 'django'
categories: ['Python']
intro: 'De una petición web a una aplicación de artículos: proyecto, rutas, modelos, páginas y formularios con Django.'
heading: 'Base'
eyebrow: 'Fundamentos'
learning_classes: 'learning-page learning-django learning-page-cards'
background: 'bg-gradient-to-r from-emerald-700 to-green-900 !text-white'
---

## 1. Qué hace Django

Django es un framework de Python para construir aplicaciones web. Se ejecuta en el servidor: recibe peticiones, consulta o modifica datos y devuelve respuestas. Una web de artículos permite conectar sus piezas principales: una dirección muestra el listado, otra muestra un artículo y un formulario permite publicar contenido.

Cuando el navegador abre una dirección, envía una **petición HTTP**. Incluye un método, como `GET`, y una ruta, como `/articulos/`. Django busca una ruta registrada y llama a su **view**, la función Python encargada de responder. Si necesita datos, la view consulta un **modelo**; si necesita una página, utiliza un **template**, una plantilla HTML con espacios para esos datos.

```text
GET /articulos/
        ↓
urls.py → view → modelo → base de datos
            ↓
         template + datos → respuesta HTML → navegador
```

`GET` se utiliza para consultar; `POST`, para enviar datos que pueden producir cambios. Una respuesta incluye un estado: `200` indica éxito, `302` una redirección y `404` un recurso inexistente. El navegador recibe HTML; no ejecuta el Python ni las instrucciones de los templates.

El **proyecto** contiene la configuración general de la web. Una **aplicación** agrupa una responsabilidad dentro del proyecto. Aquí, `config` será el proyecto y `articulos` la aplicación. La base de datos será SQLite, que guarda los datos en un archivo y no requiere instalar otro servidor.

## 2. Preparar el proyecto

Los ejemplos utilizan Python 3.12 y Django 5.2. Desde una terminal de Linux o macOS, en la carpeta donde se guardará el proyecto:

```bash
mkdir web-articulos
cd web-articulos
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install 'Django>=5.2,<5.3'
python3 -m django startproject config .
python3 manage.py startapp articulos
```

El entorno `.venv` mantiene las dependencias separadas de otros proyectos. Tras activarlo, `python3` utiliza ese entorno; `-m` ejecuta un módulo instalado en él. El rango de instalación acepta las correcciones de Django 5.2 sin cambiar de serie. En Windows con PowerShell se utiliza `py` para crear el entorno, `.venv\Scripts\Activate.ps1` para activarlo y `python` en los comandos posteriores.

`startproject config .` crea la configuración en la carpeta actual: el punto evita añadir otra carpeta exterior. `startapp articulos` crea los archivos de la aplicación. Los principales son:

| Archivo                 | Responsabilidad                                          |
| ----------------------- | -------------------------------------------------------- |
| `manage.py`             | Ejecutar comandos con la configuración del proyecto.     |
| `config/settings.py`    | Aplicaciones instaladas, base de datos y otras opciones. |
| `config/urls.py`        | Distribuir las rutas generales.                          |
| `articulos/models.py`   | Definir los datos de la aplicación.                      |
| `articulos/views.py`    | Procesar peticiones y devolver respuestas.               |
| `articulos/admin.py`    | Registrar modelos en la administración.                  |
| `articulos/migrations/` | Conservar los cambios de estructura de la base de datos. |

En `config/settings.py`, añade `"articulos"` como otro elemento de `INSTALLED_APPS`, conservando las entradas existentes. Esto permite descubrir sus modelos y plantillas; las rutas se conectan por separado. En el mismo archivo, cambia la asignación de idioma a `LANGUAGE_CODE = "es"` para que la administración y los errores de formulario aparezcan en español.

Todos los siguientes comandos de gestión se ejecutan desde `web-articulos`, donde está `manage.py`, y con el entorno activo.

## 3. Conectar una dirección con una respuesta

Sustituye el contenido de `articulos/views.py`:

```python
from django.http import HttpResponse


def listado(request):
    return HttpResponse("La sección de artículos responde.")
```

Django proporciona `request` al llamar a la función. Es un objeto con información de la petición, como `request.method`. `HttpResponse` construye la respuesta con el texto indicado; por defecto, su estado es `200`.

Crea `articulos/urls.py`, un archivo que `startapp` no genera:

```python
from django.urls import path
from . import views

app_name = "articulos"
urlpatterns = [
    path("", views.listado, name="listado"),
]
```

`path` relaciona un patrón con una función. `views.listado` se pasa sin paréntesis: Django la ejecutará cuando llegue una petición. `name="listado"` identifica la ruta y `app_name` agrupa los nombres bajo `articulos`. Más adelante se utilizará `articulos:listado` para construir enlaces.

Sustituye `config/urls.py` por:

```python
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("articulos/", include("articulos.urls")),
]
```

`include` delega en las rutas de la aplicación. Para `/articulos/`, el proyecto consume `articulos/`; queda la cadena vacía, que coincide con `path("")`. La ruta `admin/` conecta la administración incorporada de Django.

En la terminal:

```bash
python3 manage.py migrate
python3 manage.py runserver
```

`migrate` prepara las tablas de las aplicaciones instaladas, incluidas las de usuarios y sesiones. `runserver` inicia el servidor de desarrollo. Al abrir `http://127.0.0.1:8000/articulos/` debe aparecer la frase. La dirección `/` devuelve `404` porque no tiene una ruta definida.

El servidor ocupa la terminal. `Ctrl+C` lo detiene; para ejecutar más comandos también puede abrirse otra terminal en la misma carpeta y activar allí el entorno. Durante los siguientes cambios conviene completar todos los archivos de cada sección antes de recargar la página.

## 4. Guardar artículos: modelo, migración y administración

Un modelo describe datos persistentes. En este caso, cada artículo tendrá título, contenido y fecha de creación. Sustituye `articulos/models.py`:

```python
from django.db import models


class Articulo(models.Model):
    titulo = models.CharField(max_length=120)
    contenido = models.TextField()
    creado = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.titulo
```

Heredar de `models.Model` permite a Django convertir la clase en un modelo. Cada campo describe una columna: `CharField` almacena texto limitado a 120 caracteres; `TextField`, texto largo; `DateTimeField`, fecha y hora. `auto_now_add=True` asigna la fecha al crear el registro. No hace falta introducirla en el formulario.

Django añade un identificador numérico `id` a cada fila. `pk`, abreviatura de _primary key_, permite acceder a ese identificador. Una instancia de `Articulo` representa un artículo concreto. `__str__` devuelve su título cuando se necesita representarla como texto, por ejemplo en la administración.

Guardar este archivo todavía no crea la tabla. Ejecuta:

```bash
python3 manage.py makemigrations articulos
python3 manage.py migrate
```

`makemigrations` compara los modelos con las migraciones existentes y genera `articulos/migrations/0001_initial.py`. `migrate` aplica los cambios pendientes a la base de datos, cuyo archivo predeterminado es `db.sqlite3`. Al modificar después la estructura de un modelo se repite esta secuencia; añadir artículos no requiere migraciones.

Django incluye una interfaz para gestionar registros. Sustituye `articulos/admin.py`:

```python
from django.contrib import admin
from .models import Articulo

admin.site.register(Articulo)
```

El punto de `.models` indica el módulo de esta misma aplicación. `register` incorpora el modelo a la administración. Crea una cuenta administrativa desde la terminal:

```bash
python3 manage.py createsuperuser
```

El comando solicita usuario, correo y contraseña; la contraseña no se muestra al escribirla. Con el servidor en marcha, abre `http://127.0.0.1:8000/admin/`, inicia sesión y añade un artículo con título «Primera publicación» y un breve contenido. Queda guardado en SQLite, incluso después de detener el servidor. El panel permite editarlo y eliminarlo sin escribir esas pantallas.

## 5. Consultar el listado y el detalle

El **ORM** es la capa que traduce consultas expresadas con objetos Python a operaciones de base de datos. No requiere escribir SQL para estas operaciones básicas.

Sustituye completamente `articulos/views.py`; la respuesta de texto inicial se convierte en dos páginas:

```python
from django.shortcuts import get_object_or_404, render
from .models import Articulo


def listado(request):
    articulos = Articulo.objects.order_by("-creado")
    return render(request, "articulos/listado.html", {"articulos": articulos})


def detalle(request, pk):
    articulo = get_object_or_404(Articulo, pk=pk)
    return render(request, "articulos/detalle.html", {"articulo": articulo})
```

`Articulo.objects` es el gestor de consultas del modelo. `order_by("-creado")` devuelve un **QuerySet**, una colección consultable de artículos ordenada por fecha descendente. El signo `-` coloca primero los más recientes. La consulta se ejecutará al necesitar los resultados, en este caso cuando el template recorra la colección.

`get_object_or_404(Articulo, pk=pk)` busca un artículo cuyo identificador coincida con el recibido. El primer `pk` es el nombre del filtro; el segundo, la variable de la función. Si el registro no existe, Django responde `404`.

`render` recibe la petición, el nombre del template y un diccionario llamado **contexto**. En `{"articulos": articulos}`, la clave será el nombre disponible en el template; el valor procede de la consulta. El resultado de `render` es una respuesta con el HTML generado.

Sustituye `articulos/urls.py` por:

```python
from django.urls import path
from . import views

app_name = "articulos"
urlpatterns = [
    path("", views.listado, name="listado"),
    path("<int:pk>/", views.detalle, name="detalle"),
]
```

`<int:pk>` captura un número de la dirección, lo convierte a entero y lo entrega a `detalle` como argumento `pk`. Por ejemplo, `/articulos/1/` busca el artículo de identificador `1`. Las views ya están conectadas; faltan los archivos HTML que utilizarán.

## 6. Mostrar datos con templates

Crea la carpeta `articulos/templates/articulos/`. La primera parte permite a Django descubrir las plantillas de una aplicación instalada; la segunda evita confundir sus nombres con los de otras aplicaciones. La configuración generada ya activa esta búsqueda mediante `APP_DIRS = True`.

Crea `articulos/templates/articulos/base.html`:

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <title>Artículos</title>
  </head>
  <body>
    <nav><a href="{% url 'articulos:listado' %}">Listado</a></nav>
    <main>{% block contenido %}{% endblock %}</main>
  </body>
</html>
```

El HTML establece el documento: `head` contiene metadatos y `body`, el contenido visible. Las instrucciones `{% ... %}` las interpreta Django antes de enviarlo. `url` construye una dirección a partir del nombre de ruta. `block contenido` reserva una zona que las páginas hijas podrán completar.

Crea `articulos/templates/articulos/listado.html`:

```html
{% extends "articulos/base.html" %}
{% block contenido %}
<h1>Artículos</h1>
<ul>
  {% for articulo in articulos %}
    <li>
      <a href="{% url 'articulos:detalle' articulo.pk %}">
        {{ articulo.titulo }}
      </a>
    </li>
  {% empty %}
    <li>No hay artículos publicados.</li>
  {% endfor %}
</ul>
{% endblock %}
```

`extends` reutiliza el documento base; `block` define su contenido particular. `for` recorre `articulos`, la variable que recibió del contexto. En cada vuelta, `articulo` representa un objeto. `{{ articulo.titulo }}` inserta su título y `url` utiliza `articulo.pk` para completar la ruta del detalle. `empty` define qué mostrar cuando la colección está vacía.

Crea `articulos/templates/articulos/detalle.html`:

```html
{% extends "articulos/base.html" %}
{% block contenido %}
<article>
  <h1>{{ articulo.titulo }}</h1>
  {{ articulo.contenido|linebreaks }}
</article>
{% endblock %}
```

Aquí `articulo` procede del contexto de `detalle`. `linebreaks` es un **filtro**: transforma los saltos de línea del texto en párrafos y saltos HTML. Django escapa por defecto los caracteres especiales de los valores para que un texto como `<script>` no se interprete como código ejecutable.

Al abrir `/articulos/`, aparece el artículo creado desde la administración. Su enlace conduce al detalle. Una dirección numérica sin artículo asociado devuelve `404`.

## 7. Crear artículos mediante un formulario

Un formulario de Django define campos, interpreta datos y valida su contenido. `ModelForm` obtiene los campos a partir de un modelo, evitando repetir las reglas de título y contenido. Crea `articulos/forms.py`:

```python
from django import forms
from .models import Articulo


class ArticuloForm(forms.ModelForm):
    class Meta:
        model = Articulo
        fields = ["titulo", "contenido"]
```

`Meta` declara la configuración: `model` indica qué modelo representa y `fields` qué campos permite editar. Ambos campos son obligatorios porque el modelo no permite que queden vacíos en los formularios. La longitud máxima del título también se comprueba. El identificador y la fecha quedan fuera de la entrada del usuario.

En `articulos/views.py`, añade estos imports al principio, conservando los existentes:

```python
from django.contrib.admin.views.decorators import staff_member_required
from django.shortcuts import redirect
from .forms import ArticuloForm
```

Añade esta función después de `detalle`:

```python
@staff_member_required
def crear(request):
    if request.method == "POST":
        form = ArticuloForm(request.POST)
        if form.is_valid():
            articulo = form.save()
            return redirect("articulos:detalle", pk=articulo.pk)
    else:
        form = ArticuloForm()

    return render(request, "articulos/formulario.html", {"form": form})
```

El decorador `@staff_member_required` protege la función: solo admite cuentas activas marcadas como personal administrativo. La cuenta creada con `createsuperuser` cumple ambas condiciones. Si falta esa sesión, Django dirige al inicio de sesión del admin y después vuelve al formulario. Esta regla concede la creación a todo el personal administrativo; no comprueba permisos específicos del modelo.

La función distingue dos recorridos:

- Con `GET`, `ArticuloForm()` crea un formulario vacío para mostrarlo.
- Con `POST`, `request.POST` contiene los campos enviados. `ArticuloForm(request.POST)` los vincula al formulario y `is_valid()` ejecuta la validación en el servidor. Si falla, la ejecución llega a `render` con los datos y errores conservados.

Cuando es válido, `save()` guarda un artículo nuevo y devuelve la instancia creada. `redirect` construye la URL del detalle con su `pk` y devuelve una respuesta `302`. El navegador hace entonces un `GET` a esa dirección: actualizar el detalle no vuelve a enviar el formulario.

Añade a `urlpatterns` en `articulos/urls.py`, antes de la ruta del detalle:

```python
path("nuevo/", views.crear, name="crear"),
```

Crea `articulos/templates/articulos/formulario.html`:

```html
{% extends "articulos/base.html" %}
{% block contenido %}
<h1>Nuevo artículo</h1>
<form method="post">
  {% csrf_token %}
  {{ form.as_p }}
  <button type="submit">Guardar</button>
</form>
{% endblock %}
```

Sin `action`, el formulario envía los datos a la misma dirección. `method="post"` indica el método HTTP. `form.as_p` genera etiquetas, controles y errores agrupados en párrafos; en el lenguaje de templates se accede al método sin escribir paréntesis.

`csrf_token` genera un campo oculto que Django comprueba al recibir el envío. Esta protección dificulta que otro sitio provoque un cambio usando la sesión abierta del navegador. No sustituye la validación ni la comprobación de acceso. El proyecto generado ya incorpora el middleware —una capa que procesa peticiones— necesario para comprobarlo.

Por último, añade dentro del `nav` de `base.html`, después del enlace al listado:

```html
<a href="{% url 'articulos:crear' %}">Nuevo artículo</a>
```

Al abrir ese enlace con la sesión administrativa iniciada, aparece el formulario. Un envío válido guarda el artículo y abre su detalle. Un título demasiado largo o un campo vacío no se guarda. Aunque el navegador también comprueba algunas restricciones, el servidor valida todos los envíos.

## 8. Mantener el recorrido comprensible

La aplicación ya permite leer artículos y crearlos con una cuenta autorizada; la administración incorpora edición y borrado. Cada responsabilidad tiene un lugar: los datos en el modelo, la entrada en el formulario, la decisión en la view, las direcciones en las URLs y la presentación en los templates.

Para volver a trabajar después de cerrar la terminal, entra en `web-articulos`, activa `.venv` y ejecuta `python3 manage.py runserver`. No hay que recrear el proyecto ni repetir las migraciones mientras no existan cambios pendientes.

Cuando aparece un error, la terminal muestra su excepción y archivo implicado:

| Señal                  | Qué revisar                                                   |
| ---------------------- | ------------------------------------------------------------- |
| Conexión rechazada     | Que `runserver` esté activo y la dirección use su puerto.     |
| `404`                  | Que exista la ruta y, en un detalle, el artículo solicitado.  |
| `TemplateDoesNotExist` | Nombre del template, carpeta y registro de la aplicación.     |
| `NoReverseMatch`       | Nombre de ruta y argumentos utilizados en `url` o `redirect`. |
| `no such table`        | Que se hayan creado y aplicado las migraciones.               |

`python3 manage.py check` detecta problemas de configuración, pero no confirma que todas las páginas funcionen. La configuración inicial y `runserver` están destinados al desarrollo local. Publicar requiere un servidor de producción, desactivar `DEBUG`, configurar dominios permitidos, HTTPS y secretos, y establecer permisos adecuados al sitio.

Referencias: [proyecto y rutas](https://docs.djangoproject.com/en/5.2/intro/tutorial01/), [lenguaje de templates](https://docs.djangoproject.com/en/5.2/ref/templates/language/) y [formularios basados en modelos](https://docs.djangoproject.com/en/5.2/topics/forms/modelforms/).
