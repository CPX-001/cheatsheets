---
title: 'Django · Tests, consultas y rendimiento'
date: '2026-09-18'
updated: '2026-09-19'
layout: 'learning'
language: 'es'
disableNunjucks: true
icon: 'django'
categories: ['Python']
intro: 'Cómo comprobar comportamiento observable y reconocer consultas innecesarias; qué se ejecuta realmente cuando una página muestra datos relacionados.'
heading: 'Tests, consultas y rendimiento'
eyebrow: 'Ruta 07 de 8 · Comprobar y mejorar'
learning_classes: 'learning-page learning-django learning-page-cards'
---

## 1. Qué debe demostrar una prueba

### Un resultado verificable, no una copia del código

Una prueba útil protege una regla que importa: la lista pública no muestra borradores; un visitante no puede editar; un formulario inválido conserva errores; el detalle devuelve `404` para un artículo oculto. Si la prueba solo comprueba que llamaste a la misma función que acabas de escribir, puede pasar aunque el resultado para la persona sea incorrecto.

El cliente de pruebas de Django ejecuta el recorrido de petición dentro del proceso, sin abrir un servidor de red. Permite inspeccionar estado, contenido, templates y contexto. No ejecuta JavaScript ni comprueba la apariencia en el navegador. Esas comprobaciones pertenecen a otro nivel y conviene añadirlas cuando la interfaz lo necesita.

## 2. Una prueba completa de la lista de artículos

### Preparar datos, actuar y comprobar

Con los modelos y views de [datos y ORM](/django-datos-orm.html), coloca esto en `articulos/tests.py`:

```python
from django.test import TestCase
from django.urls import reverse
from .models import Articulo


class ListaArticulosTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.visible = Articulo.objects.create(
            titulo="Artículo visible", texto="Contenido público", publicado=True,
        )
        cls.oculto = Articulo.objects.create(
            titulo="Borrador privado", texto="Pendiente", publicado=False,
        )

    def test_la_lista_solo_muestra_publicados(self):
        respuesta = self.client.get(reverse("articulos:lista"))
        self.assertEqual(respuesta.status_code, 200)
        self.assertContains(respuesta, "Artículo visible")
        self.assertNotContains(respuesta, "Borrador privado")

    def test_un_borrador_no_tiene_detalle_publico(self):
        url = reverse("articulos:detalle", args=[self.oculto.pk])
        self.assertEqual(self.client.get(url).status_code, 404)
```

En la terminal, desde la carpeta con `manage.py`, ejecuta `python manage.py test articulos`. Django prepara una base de pruebas y aísla los datos de las pruebas; no uses esa característica como excusa para apuntar una configuración mal diseñada a una base de producción. Revisa siempre qué settings estás ejecutando.

`setUpTestData` define los datos compartidos de la clase. Los nombres `visible` y `oculto` describen el papel del registro, no un identificador fijo que deba existir antes. `reverse` calcula la URL desde su nombre, así la prueba no depende del prefijo literal `/articulos/`.

### Probar permisos sin probar de nuevo el login

`self.client.force_login(usuario)` permite representar una sesión existente y centrarse en permisos. El usuario debe crearse en los datos de esa prueba. Para comprobar el flujo de acceso, usa la pantalla de login o `client.login()`; forzar una sesión no demuestra que una contraseña o el template de acceso funcionen.

El cliente de pruebas omite por defecto la comprobación CSRF para facilitar pruebas de views. Para comprobarla expresamente, crea `Client(enforce_csrf_checks=True)`. Una prueba que hace POST sin token usando el cliente predeterminado no demuestra que la protección esté desactivada en la web.

## 3. Entender el problema N+1

### Un bucle puede ocultar consultas

Supón que la lista muestra `articulo.categoria.nombre` en cada fila. Primero se consultan N artículos. Después, cada acceso a la categoría puede lanzar otra consulta. El resultado puede ser 1 + N consultas aunque el template parezca inocente. La causa es la carga diferida de objetos relacionados, no el bucle HTML por sí mismo.

En la view de lista, una relación de artículo a una categoría puede cargarse en la consulta inicial:

```python
articulos = (
    Articulo.objects.filter(publicado=True)
    .select_related("categoria")
    .order_by("-creado", "-pk")
)
```

`select_related` utiliza joins y es apropiado para relaciones de un solo objeto, como una clave foránea. Para colecciones inversas, como categorías con sus artículos, `prefetch_related("articulos")` ejecuta consultas separadas y enlaza sus resultados en Python. No elijas por el nombre que suena más rápido: primero identifica la dirección y la cantidad de la relación.

### Medir antes de añadir caché

Puedes observar el número de consultas con Django Debug Toolbar durante el desarrollo, o usar `assertNumQueries` en una prueba cuando una operación tenga un presupuesto estable. Cuenta la operación concreta: incluir sesión, permisos, paginación o middleware puede añadir consultas legítimas.

Un índice en la base ayuda a localizar u ordenar filas según un patrón de consulta, pero consume espacio y añade trabajo a las escrituras. Una caché evita repetir ciertos cálculos o lecturas a cambio de datos potencialmente desactualizados. Son soluciones a problemas diferentes; Redis no arregla automáticamente una consulta mal planteada.

## 4. Limitar resultados y ordenar de forma estable

### Paginación evita cargar una tabla entera

Para una lista larga, sustituye la función `lista` por esta variante; conserva los imports `render` y `Articulo` de la view actual:

```python
from django.core.paginator import Paginator


def lista(request):
    consulta = (
        Articulo.objects.filter(publicado=True)
        .select_related("categoria")
        .order_by("-creado", "-pk")
    )
    pagina = Paginator(consulta, 20).get_page(request.GET.get("pagina"))
    return render(request, "articulos/lista.html", {
        "titulo_pagina": "Artículos", "articulos": pagina, "pagina": pagina,
    })
```

`Paginator` divide resultados; `get_page` maneja entradas no numéricas y fuera de rango con su comportamiento previsto. `pagina` se puede iterar en el template como antes. Debajo de la lista, añade enlaces cuando existan páginas vecinas:

```html
{% if pagina.has_previous %}
  <a href="?pagina={{ pagina.previous_page_number }}">Anterior</a>
{% endif %}
{% if pagina.has_next %}
  <a href="?pagina={{ pagina.next_page_number }}">Siguiente</a>
{% endif %}
```

Esta paginación puede hacer una consulta de recuento y otra para las filas. Con volúmenes grandes, el coste de contar y usar desplazamientos profundos puede importar; no presupongas que «20 por página» significa coste constante para cualquier página. Antes de complicar el diseño, mide tiempos, SQL y volumen reales.

## 5. Lo que una validación local no demuestra

### Cada entorno responde a una pregunta

Una prueba de views demuestra lógica HTTP dentro de Django. Una prueba de navegador añade integración con HTML y comportamiento del cliente. Una prueba contra PostgreSQL comprueba características que SQLite no reproduce, como determinados bloqueos. Una verificación después del despliegue confirma que el proceso público está ejecutando el cambio esperado.

Mantén esa distinción cuando evalúes una mejora: «pasan las pruebas» no significa que el servidor de producción se haya reiniciado con la versión nueva. En [producción](/django-produccion.html) conectamos código, procesos, configuración y servicios para cerrar ese recorrido.
