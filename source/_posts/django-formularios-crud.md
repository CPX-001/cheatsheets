---
title: 'Django · Formularios, validación y CRUD'
date: '2026-09-18'
updated: '2026-09-19'
layout: 'learning'
language: 'es'
disableNunjucks: true
icon: 'django'
categories: ['Python']
intro: 'Cómo pasan los campos de un formulario por validación antes de tocar la base de datos, y qué cambia entre crear, editar y borrar.'
heading: 'Formularios, validación y CRUD'
eyebrow: 'Ruta 04 de 8 · Fundamentos'
learning_classes: 'learning-page learning-django learning-page-cards'
---

## 1. Dos recorridos para una misma pantalla

### GET muestra el formulario; POST solicita guardar

Usaremos el modelo `Articulo` definido en [datos y ORM](/django-datos-orm.html), con `titulo`, `texto`, `publicado` y una categoría opcional. **CRUD** resume crear, leer, actualizar y borrar. Describe operaciones sobre datos; no es una biblioteca adicional.

Cuando visitas la pantalla de edición mediante `GET`, Django carga el artículo y presenta sus valores. Cuando envías el formulario mediante `POST`, el navegador transmite campos que pueden faltar, estar mal formados o haber sido manipulados. Django debe validarlos antes de guardar. La validación del navegador mejora la experiencia, pero el servidor no puede confiar en ella.

Un **formulario enlazado** contiene datos enviados y puede producir errores de validación. Uno no enlazado representa el estado inicial. Si hay errores, se devuelve el mismo formulario enlazado: así conserva lo que la persona escribió y explica qué debe corregir.

## 2. Definir los campos que aceptas

### ModelForm reutiliza el contrato del modelo

Crea `articulos/forms.py`. `ModelForm` deriva campos y parte de la validación del modelo, pero la lista `fields` sigue siendo una decisión tuya sobre qué permites editar.

```python
# articulos/forms.py
from django import forms
from .models import Articulo


class ArticuloForm(forms.ModelForm):
    class Meta:
        model = Articulo
        fields = ["titulo", "texto", "publicado", "categoria"]

    def clean_titulo(self):
        titulo = self.cleaned_data["titulo"].strip()
        if len(titulo) < 5:
            raise forms.ValidationError("Escribe un título de al menos 5 caracteres.")
        return titulo
```

`is_valid()` convierte y valida los campos. Después, `cleaned_data` contiene los valores aceptados, que ya pueden ser booleanos u objetos relacionados, en lugar de solo cadenas. El método `clean_titulo` añade una regla específica y devuelve el valor normalizado. Para reglas entre varios campos se usa `clean()`, llamando primero a `super().clean()`.

La categoría se presenta como una selección de objetos válidos. Un identificador inventado no se acepta simplemente porque llegue en el POST. La validación pertenece al formulario; decidir quién puede editar pertenece a los permisos.

## 3. Crear un artículo

### Una función que muestra, valida y redirige

Añade estos imports y esta función a `articulos/views.py`, conservando `lista` y `detalle`. Desde el principio exigimos el permiso de añadir artículos para que copiar el ejemplo no abra la escritura al público. El tema de [usuarios y permisos](/django-auth.html) desarrolla de dónde viene ese permiso y la pantalla de acceso; para comprobarlo ahora puedes entrar antes en `/admin/` con el superusuario.

```python
# Añadir a articulos/views.py
from django.contrib.auth.decorators import permission_required
from django.shortcuts import redirect
from django.views.decorators.http import require_http_methods
from .forms import ArticuloForm


@permission_required("articulos.add_articulo", raise_exception=True)
@require_http_methods(["GET", "POST"])
def crear(request):
    form = ArticuloForm(request.POST if request.method == "POST" else None)
    if request.method == "POST" and form.is_valid():
        form.save()
        return redirect("articulos:lista")
    return render(request, "articulos/formulario.html", {"form": form})
```

Un **decorador** envuelve la función con una comprobación previa. Aquí uno exige un permiso y el otro limita los métodos admitidos. El `403` de un visitante sin permiso significa que no puede realizar la operación, no que falte la URL. `form.save()` crea el objeto porque no hemos pasado una instancia existente.

Después de guardar, `redirect` devuelve una respuesta que hace visitar otra URL al navegador. El patrón POST → redirección → GET reduce reenvíos al refrescar la página resultante. No evita por sí solo todos los envíos duplicados: esa garantía requiere reglas adicionales si la operación lo necesita.

### El template presenta campos, errores y protección CSRF

Crea `articulos/templates/articulos/formulario.html`:

```html
{% extends "articulos/base.html" %}
{% block contenido %}
  <h1>Guardar artículo</h1>
  <form method="post">
    {% csrf_token %}
    {{ form.as_p }}
    <button type="submit">Guardar</button>
  </form>
{% endblock %}
```

`form.as_p` genera controles, etiquetas y errores. Sin `action`, el navegador envía el formulario a la URL actual. `{% csrf_token %}` añade un token que el middleware comprueba para proteger frente a solicitudes de cambio originadas desde otros sitios usando tu sesión. No sustituye ni permisos ni validación.

Añade `path("nuevo/", views.crear, name="crear")` a `urlpatterns` en `articulos/urls.py`. Con la sesión del superusuario, `/articulos/nuevo/` mostrará el formulario. Un título demasiado corto debe volver con su error y sin insertar una fila. Si guardas con `publicado` desmarcado, el artículo existe, pero la lista pública no lo muestra.

## 4. Editar conserva la identidad

### instance distingue una actualización de una inserción

Añade esta función junto a las anteriores. Reutiliza sus imports, incluido `get_object_or_404`.

```python
@permission_required("articulos.change_articulo", raise_exception=True)
@require_http_methods(["GET", "POST"])
def editar(request, pk):
    articulo = get_object_or_404(Articulo, pk=pk)
    form = ArticuloForm(
        request.POST if request.method == "POST" else None,
        instance=articulo,
    )
    if request.method == "POST" and form.is_valid():
        form.save()
        return redirect("articulos:lista")
    return render(request, "articulos/formulario.html", {"form": form})
```

Añade `path("<int:pk>/editar/", views.editar, name="editar")`. En GET, `instance` aporta los valores iniciales; en POST identifica la fila que se modificará. Omitirlo puede crear otra fila cuando creías editar. En este ejemplo, el permiso autoriza editar cualquier artículo; una aplicación con autores necesita además comprobar la propiedad del objeto.

`save(commit=False)` es útil cuando debes completar un campo que no está en el formulario antes de guardar. Devuelve una instancia todavía sin persistir; hay que llamar a su `save()`. No es necesario aquí y añadirlo sin propósito solo introduce otro estado que seguir.

## 5. Borrar es una operación de cambio

### Un enlace GET no debe eliminar registros

Una página de confirmación puede obtenerse con GET, pero el borrado debe enviarse mediante POST con CSRF y permiso. No hagas que visitar `/borrar/` desde un enlace ejecute directamente `delete()`: navegadores, previsualizadores o rastreadores pueden visitar enlaces sin que alguien quiera confirmar la operación.

El recorrido es el mismo: buscar el objeto, comprobar autorización, mostrar confirmación, aceptar el POST y redirigir tras borrar. Si hay relaciones protegidas como una categoría con artículos, el ORM puede rechazar el borrado. Decide cómo explicar esa situación en la interfaz; no elimines la protección solo para ocultar el error.

### Qué comprobar cuando un formulario falla

Si aparece un `403` antes de renderizar, revisa permisos o CSRF según el mensaje. Si vuelve la página con errores, la validación está funcionando: muestra `form.errors` durante el desarrollo y comprueba que conservas ese mismo formulario. Si se guarda una copia, revisa `instance`. Si no aparece nada en `request.POST`, comprueba método y formato: un cuerpo JSON no es un formulario HTML.

[Django Girls: formularios](https://tutorial.djangogirls.org/es/django_forms/) sirve como segunda explicación del ciclo mostrar → validar → guardar. El siguiente paso es entender [sesión, usuario y autorización](/django-auth.html), que ya intervienen en estas operaciones.
