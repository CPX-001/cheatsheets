---
title: 'Django · Modelos, migraciones y ORM'
date: '2026-09-18'
updated: '2026-09-19'
layout: 'learning'
language: 'es'
disableNunjucks: true
icon: 'django'
categories: ['Python']
intro: 'Cómo se relacionan una clase de modelo, una tabla, una migración y una consulta; cuándo se ejecuta SQL y cómo llega el resultado a una página.'
heading: 'Modelos, migraciones y ORM'
eyebrow: 'Ruta 03 de 8 · Fundamentos'
learning_classes: 'learning-page learning-django learning-page-cards'
---

## 1. Modelo, instancia y tabla

### Dar persistencia a los artículos

Los diccionarios del [tema de templates](/django-http-templates.html) desaparecen si cambia el código que los contiene. Una base de datos permite guardar artículos y recuperarlos en otras peticiones. Django accede a ella mediante un **ORM**, una capa que transforma operaciones Python en SQL y convierte filas en objetos. SQL sigue ejecutándose en una base real; el ORM no hace gratuitas las consultas.

Escribe estos modelos en `articulos/models.py`. `Categoria` permite agrupar artículos; `Articulo` conserva su título, texto, estado de publicación y fecha. No necesitas crear categorías para empezar, porque la relación es opcional.

```python
# articulos/models.py
from django.db import models


class Categoria(models.Model):
    nombre = models.CharField(max_length=80, unique=True)

    def __str__(self):
        return self.nombre


class Articulo(models.Model):
    titulo = models.CharField(max_length=160)
    texto = models.TextField()
    publicado = models.BooleanField(default=False)
    creado = models.DateTimeField(auto_now_add=True)
    categoria = models.ForeignKey(
        Categoria,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="articulos",
    )

    def __str__(self):
        return self.titulo
```

Una **clase de modelo** describe campos y relaciones. Una **instancia**, como un artículo concreto, contiene valores. En estos modelos normales, cada clase se corresponde con una tabla y cada instancia guardada con una fila. Django añade una clave primaria `id`; `pk` es una forma de acceder a la clave primaria sin depender de su nombre.

`CharField` almacena texto con longitud limitada; `TextField` admite textos extensos; `BooleanField` representa verdadero o falso. `auto_now_add` fija la fecha al insertar. `__str__` determina cómo se presenta el objeto en el shell o en el admin; no crea una columna adicional.

### Una relación guarda una referencia

La clave foránea se materializa normalmente como `categoria_id` en la tabla de artículos. `articulo.categoria_id` lee el identificador; `articulo.categoria` obtiene el objeto relacionado y puede necesitar otra consulta. `related_name="articulos"` permite el recorrido inverso: `categoria.articulos.all()`.

`null=True` admite `NULL` en la base de datos. `blank=True` permite dejar el campo vacío en la validación de formularios y modelos. Resuelven problemas distintos. `PROTECT` impide borrar una categoría referenciada mediante las operaciones de borrado del ORM; así no desaparece la clasificación de un artículo por accidente.

## 2. Qué son las migraciones

### Describir el cambio y aplicarlo

Editar la clase no modifica las tablas existentes. Desde la terminal, junto a `manage.py`:

```bash
python manage.py makemigrations articulos
python manage.py sqlmigrate articulos 0001
python manage.py migrate
python manage.py showmigrations articulos
```

`makemigrations` compara los modelos con el estado registrado en las migraciones y escribe un archivo Python con operaciones. `sqlmigrate` permite inspeccionar el SQL de esa migración inicial; el nombre `0001` corresponde a la primera, no a cualquier cambio futuro. `migrate` aplica las pendientes y registra cuáles se ejecutaron. Una `[X]` en `showmigrations` indica que esa migración consta como aplicada en la base actual.

Los archivos de migración se suben a Git con los modelos. La base de datos es estado de ejecución y no se reconstruye compartiendo un archivo SQLite de desarrollo. Antes de un cambio en datos existentes, piensa qué pasará con las filas antiguas: añadir una columna obligatoria necesita un valor para ellas. Una migración de datos es código que transforma registros, no solo la forma de la tabla.

## 3. Crear y consultar desde el shell de Django

### El shell carga configuración y aplicaciones

Ejecuta `python manage.py shell` en la terminal. Dentro de ese intérprete, escribe el siguiente Python, sin los comentarios de archivo ni prompts adicionales:

```python
from articulos.models import Articulo, Categoria

categoria, _ = Categoria.objects.get_or_create(nombre="Web")
articulo = Articulo.objects.create(
    titulo="Entender HTTP",
    texto="Una petición solicita un recurso; una respuesta comunica el resultado.",
    publicado=True,
    categoria=categoria,
)
print(articulo.pk)
print(Articulo.objects.get(pk=articulo.pk).titulo)
```

`objects` es el **manager**, la puerta de entrada habitual a las consultas del modelo. `create` instancia y guarda en una operación. `get_or_create` devuelve un par: objeto y booleano que indica si se creó; usamos `_` para señalar que no necesitamos ese booleano. La unicidad de `nombre` también protege en la base de datos frente a categorías duplicadas.

`get` espera exactamente un resultado. Si no existe, lanza `Articulo.DoesNotExist`; si el filtro admite varios, puede lanzar `MultipleObjectsReturned`. `filter` devuelve un **QuerySet**, una consulta componible que puede producir cero, uno o muchos resultados.

### Construir una consulta no siempre la ejecuta

```python
publicados = Articulo.objects.filter(publicado=True).order_by("-creado", "-pk")
primeros = publicados[:10]
filas = list(primeros)
print([fila.titulo for fila in filas])
```

Las dos primeras líneas construyen una consulta que filtra, ordena y limita en la base de datos. `list` necesita resultados y la ejecuta. Iterar un QuerySet en un template también lo evalúa. Los QuerySets evaluados suelen conservar sus resultados para reutilizarlos, pero una consulta nueva creada con otro filtro tiene su propio ciclo. `count()` cuenta y `exists()` comprueba existencia con consultas específicas; no conviene usarlos antes de iterar por costumbre, porque puedes hacer dos consultas donde una bastaba.

El prefijo `-` invierte el orden. Añadir `-pk` resuelve empates de fecha y hace estable la presentación. Los filtros parametrizan los valores en SQL; no concatenes texto del usuario para fabricar una consulta SQL manual.

## 4. Conectar la base de datos con las páginas

### La view entrega objetos al mismo template

Reemplaza `articulos/views.py` por esta versión. `lista` conserva el contrato del contexto, pero ahora obtiene artículos publicados de la base. `detalle` distingue un artículo visible de uno inexistente o no publicado.

```python
# articulos/views.py
from django.shortcuts import get_object_or_404, render
from .models import Articulo


def lista(request):
    articulos = Articulo.objects.filter(publicado=True).order_by("-creado", "-pk")
    return render(request, "articulos/lista.html", {
        "titulo_pagina": "Artículos", "articulos": articulos,
    })


def detalle(request, pk):
    articulo = get_object_or_404(Articulo, pk=pk, publicado=True)
    return render(request, "articulos/detalle.html", {"articulo": articulo})
```

En `articulos/urls.py`, conserva `app_name` y deja estos patrones:

```python
urlpatterns = [
    path("", views.lista, name="lista"),
    path("<int:pk>/", views.detalle, name="detalle"),
]
```

Los imports `path` y `views` siguen siendo los del tema anterior. Crea el template de detalle:

```html
<!-- articulos/templates/articulos/detalle.html -->
{% extends "articulos/base.html" %}
{% block titulo %}{{ articulo.titulo }}{% endblock %}
{% block contenido %}
  <h1>{{ articulo.titulo }}</h1>
  <p>{{ articulo.texto }}</p>
  {% if articulo.categoria %}
    <p>Categoría: {{ articulo.categoria.nombre }}</p>
  {% endif %}
{% endblock %}
```

Ahora sí puedes enlazar desde el título de cada artículo en `lista.html` con `{% url 'articulos:detalle' articulo.pk %}`. Usa el identificador que imprimió el shell para visitar su detalle. `get_object_or_404` convierte la ausencia en respuesta `404`; no convierte cualquier fallo de base de datos en «no encontrado».

## 5. Escrituras, validación y administración

### Cambiar un objeto no guarda hasta que lo indicas

En el shell, `articulo.titulo = "HTTP explicado"` cambia la instancia en memoria. `articulo.save(update_fields=["titulo"])` escribe ese campo. `Articulo.objects.filter(pk=articulo.pk).update(publicado=False)` actualiza directamente en SQL; no llama al `save()` de cada instancia ni ejecuta su lógica personalizada. Una instancia que ya tenías cargada puede conservar valores antiguos: usa `refresh_from_db()` cuando necesites recargarla.

`save()` no llama automáticamente a `full_clean()`. Los formularios validan datos de entrada; las restricciones de la base sostienen invariantes incluso si una escritura viene de otro proceso. Por eso `unique=True` importa más que una comprobación previa hecha solo en una pantalla.

Para administrar registros con la interfaz incorporada, añade a `articulos/admin.py`:

```python
from django.contrib import admin
from .models import Articulo, Categoria

admin.site.register([Articulo, Categoria])
```

Ejecuta `python manage.py createsuperuser` y abre `/admin/` con el servidor activo. El admin es una herramienta para personal autorizado; registrar un modelo no publica sus registros en la web ni diseña una interfaz para visitantes.

En [Django Girls: ORM](https://tutorial.djangogirls.org/es/django_orm/) puedes seguir consultas desde el shell. El siguiente tema conecta este almacenamiento con [formularios validados](/django-formularios-crud.html).
