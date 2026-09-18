---
title: 'Django · URLs, views y templates'
date: '2026-09-18'
updated: '2026-09-19'
layout: 'learning'
language: 'es'
disableNunjucks: true
icon: 'django'
categories: ['Python']
intro: 'Cómo una URL selecciona una view, cómo esta prepara datos y cómo un template los convierte en HTML, sin variables ni archivos implícitos.'
heading: 'URLs, views y templates'
eyebrow: 'Ruta 02 de 8 · Fundamentos'
learning_classes: 'learning-page learning-django learning-page-cards'
---

## 1. Separar el trabajo de cada pieza

### La view decide qué datos entregar

Partimos del proyecto `config` y la aplicación `articulos` presentados en [el primer tema](/django.html). Una página necesita estructura HTML y datos. Es posible mezclarlo todo dentro de `HttpResponse`, pero se vuelve difícil mantener enlaces, textos y reglas. La view preparará los datos; el template describirá la presentación. No hace falta una base de datos para entender esta separación.

Sustituye `articulos/views.py` por este contenido. Los dos artículos son diccionarios definidos aquí, por lo que puedes seguir de dónde sale cada valor. Después se reemplazarán por modelos del ORM sin cambiar la idea de contexto.

```python
# articulos/views.py
from django.shortcuts import render


def lista(request):
    articulos = [
        {"titulo": "Una petición HTTP", "texto": "El navegador solicita una página."},
        {"titulo": "Una respuesta HTML", "texto": "El servidor devuelve su contenido."},
    ]
    contexto = {"titulo_pagina": "Artículos", "articulos": articulos}
    return render(request, "articulos/lista.html", contexto)
```

`render` busca el template, lo evalúa con el diccionario de contexto y devuelve un `HttpResponse`. La clave `"articulos"` será el nombre visible dentro del template. La variable local de Python podría llamarse de otra manera; lo que conecta ambos archivos es esa clave. `request` permite a Django añadir información del entorno de la petición, como el usuario, mediante los procesadores de contexto configurados.

### La URL no llama a la función al arrancar

Actualiza la URL de la aplicación:

```python
# articulos/urls.py
from django.urls import path
from . import views

app_name = "articulos"
urlpatterns = [path("", views.lista, name="lista")]
```

Se pasa `views.lista`, sin paréntesis. Django guarda la referencia y la ejecuta cuando llega una petición que coincide. Si pusieras `views.lista()`, Python intentaría ejecutarla mientras carga las rutas y faltaría `request`.

## 2. Encontrar y renderizar un template

### El nombre del archivo forma parte del contrato

Crea `articulos/templates/articulos/lista.html`. Con `APP_DIRS=True`, que viene en la configuración inicial, Django busca en la carpeta `templates` de las aplicaciones instaladas. La segunda carpeta `articulos` evita que el nombre `lista.html` choque con el de otra aplicación.

```html
<!-- articulos/templates/articulos/lista.html -->
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <title>{{ titulo_pagina }}</title>
  </head>
  <body>
    <h1>{{ titulo_pagina }}</h1>
    <ul>
      {% for articulo in articulos %}
        <li>
          <h2>{{ articulo.titulo }}</h2>
          <p>{{ articulo.texto }}</p>
        </li>
      {% empty %}
        <li>Todavía no hay artículos.</li>
      {% endfor %}
    </ul>
  </body>
</html>
```

Al visitar `/articulos/`, verás dos títulos y sus textos. El navegador recibe una lista HTML ya construida: las etiquetas `{% for %}` no se ejecutan allí. Puedes comprobarlo con «Ver código fuente»: no deberían aparecer instrucciones del template.

## 3. Variables, etiquetas y filtros

### Cada forma tiene una responsabilidad

`{{ titulo_pagina }}` imprime un valor del contexto. El punto de `articulo.titulo` permite resolver una clave del diccionario; cuando usemos modelos también permitirá leer un atributo. No equivale a ejecutar una expresión Python arbitraria. Por ejemplo, no se escriben llamadas con argumentos entre esas llaves.

Las **etiquetas** `{% ... %}` controlan el renderizado o invocan una operación admitida. `for` recorre la colección, `empty` cubre la colección vacía y `if` elige una rama. Las etiquetas que abren un bloque necesitan su cierre: `endfor`, `endif` o `endblock`.

Un **filtro** transforma un valor para presentarlo. En <code>{{ articulo.titulo&#124;upper }}</code>, `upper` produce texto en mayúsculas; no modifica el diccionario ni la base de datos. En <code>{{ articulo.texto&#124;truncatewords:12 }}</code>, `12` es un argumento del filtro. No mezcles este lenguaje con Jinja: se parecen, pero sus reglas y APIs no son intercambiables.

### Escape HTML y valores ausentes

Django escapa automáticamente caracteres especiales al imprimir texto. Si un título contiene `<script>`, debe mostrarse como texto, sin convertirse en una etiqueta ejecutable. El filtro `safe` desactiva esa protección para el valor: no lo uses para arreglar la apariencia de contenido recibido de usuarios. Si necesitas HTML enriquecido, primero define cómo lo vas a sanear.

Una variable inexistente suele renderizarse vacía, lo que puede ocultar un error de nombre. Si `titulo_pagina` no aparece, comprueba primero la clave del contexto; no cambies la configuración del servidor. Del mismo modo, pasar un QuerySet vacío más adelante activará `empty`, mientras que no enviar la variable es un error de contrato aunque pueda producir una pantalla parecida.

## 4. Compartir una estructura sin duplicar páginas

### Una base define huecos, una página los rellena

Crea `articulos/templates/articulos/base.html`:

```html
<!-- articulos/templates/articulos/base.html -->
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <title>{% block titulo %}Artículos{% endblock %}</title>
  </head>
  <body>
    <nav><a href="{% url 'articulos:lista' %}">Artículos</a></nav>
    <main>{% block contenido %}{% endblock %}</main>
  </body>
</html>
```

Ahora sustituye el template de lista por esta versión:

```html
<!-- articulos/templates/articulos/lista.html -->
{% extends "articulos/base.html" %}

{% block titulo %}{{ titulo_pagina }}{% endblock %}

{% block contenido %}
  <h1>{{ titulo_pagina }}</h1>
  {% for articulo in articulos %}
    <article>
      <h2>{{ articulo.titulo }}</h2>
      <p>{{ articulo.texto }}</p>
    </article>
  {% empty %}
    <p>Todavía no hay artículos.</p>
  {% endfor %}
{% endblock %}
```

`extends` indica qué estructura se hereda y debe ser la primera etiqueta del template. Los bloques coinciden por nombre, no por posición. Si escribes `content` donde la base espera `contenido`, ese contenido no rellenará el hueco que ves. La etiqueta `url` hace la operación inversa al routing: dado `articulos:lista`, genera la dirección configurada. Así cambiar el prefijo de URL no obliga a buscar enlaces escritos a mano.

### Un include reutiliza un fragmento

Si varias páginas presentan el mismo resumen, mueve el elemento `<article>...</article>` a `articulos/templates/articulos/_resumen.html`. Dentro del bucle, reemplázalo por `{% include "articulos/_resumen.html" with articulo=articulo only %}`. El argumento nombra el dato que recibe el fragmento y `only` limita su contexto a lo que pasas explícitamente. El fragmento necesita ese objeto; no obtiene artículos de la base de datos por sí solo.

## 5. Qué cambia cuando aparece una URL con identificador

### Capturar un valor y encontrar un objeto son pasos distintos

Un patrón como `path("<int:pk>/", views.detalle, name="detalle")` acepta un entero y llama a `detalle(request, pk=...)`. El convertidor `int` ya entrega un entero a la función. No comprueba que haya un artículo con ese identificador; esa búsqueda pertenece a la view y la veremos en [modelos y ORM](/django-datos-orm.html).

Para un identificador conocido, la etiqueta de enlace será `{% url 'articulos:detalle' articulo.pk %}`. Todavía no la añadas al ejemplo con diccionarios: hemos introducido la sintaxis, pero esos diccionarios no tienen `pk` ni existe aún esa ruta. Esta distinción evita un `NoReverseMatch`, que significa que Django no pudo construir una URL con el nombre y los argumentos disponibles.

Una URL organiza el acceso; un template presenta; una view decide qué hacer. Mantener esa separación ayuda a localizar fallos: `TemplateDoesNotExist` apunta a nombre, ubicación o aplicación sin registrar; `NoReverseMatch`, a nombre y argumentos de ruta; HTML vacío, a contexto o bloques.

Para ampliar la explicación visual, [Django Girls: templates](https://tutorial.djangogirls.org/es/django_templates/) y [herencia de templates](https://tutorial.djangogirls.org/es/template_extending/) recorren estas conexiones con ejemplos de páginas completas.
