---
title: 'Django · Sesiones, usuarios y permisos'
date: '2026-09-18'
updated: '2026-09-19'
layout: 'learning'
language: 'es'
disableNunjucks: true
icon: 'django'
categories: ['Python']
intro: 'Qué guardan una cookie y una sesión, cómo Django reconoce al usuario y dónde se decide si puede realizar una operación.'
heading: 'Sesiones, usuarios y permisos'
eyebrow: 'Ruta 05 de 8 · Fundamentos'
learning_classes: 'learning-page learning-django learning-page-cards'
---

## 1. Reconocer a alguien entre peticiones

### HTTP no recuerda la petición anterior

Cuando el navegador solicita una página, el servidor necesita una forma de relacionarla con el acceso anterior. En la configuración inicial de Django, una cookie llamada `sessionid` transporta un identificador de sesión. El contenido de esa sesión se conserva en la base de datos. El navegador no recibe la contraseña ni una copia de la tabla de usuarios.

`SessionMiddleware` asocia la sesión a `request`. Después, `AuthenticationMiddleware` utiliza esa información para ofrecer `request.user`. El orden importa: reconocer al usuario depende de haber recuperado primero su sesión. Ambos middleware ya vienen en un proyecto generado con `startproject`; no necesitas reescribirlos.

Una petición sin sesión autenticada tiene un `AnonymousUser`. `request.user.is_authenticated` permite distinguirlo de un usuario reconocido. Esta propiedad indica **autenticación**, no autorización para cualquier operación. Una persona puede haber iniciado sesión y carecer de permiso para editar artículos.

## 2. Incorporar las pantallas de acceso

### Las views existen; el template lo defines tú

Partimos del proyecto y la aplicación `articulos` de los temas anteriores. Añade a `urlpatterns` de `config/urls.py`, conservando los imports `path` e `include`:

```python
path("cuentas/", include("django.contrib.auth.urls")),
```

Esta inclusión incorpora rutas como `login` y `logout`. No crea una pantalla de registro de nuevas cuentas ni configura el envío de correo. Para el acceso, crea `articulos/templates/registration/login.html`. El directorio pertenece a una aplicación instalada y por eso el cargador de templates lo encuentra.

```html
{% extends "articulos/base.html" %}
{% block contenido %}
  <h1>Iniciar sesión</h1>
  <form method="post">
    {% csrf_token %}
    {{ form.as_p }}
    <input type="hidden" name="next" value="{{ next }}">
    <button type="submit">Entrar</button>
  </form>
{% endblock %}
```

La view incorporada entrega `form` y `next` al contexto. El formulario comprueba las credenciales usando el sistema de autenticación. `next` conserva el destino solicitado antes de entrar; la view de Django valida el destino permitido para evitar redirigir sin control a otra web.

En `config/settings.py`, añade:

```python
LOGIN_URL = "login"
LOGIN_REDIRECT_URL = "articulos:lista"
LOGOUT_REDIRECT_URL = "articulos:lista"
```

Son nombres de URL, no rutas a archivos. Abre `/cuentas/login/` y entra con una cuenta creada mediante `createsuperuser` o el admin. Las contraseñas se almacenan mediante una función de hash adecuada, no como texto recuperable. Para crearlas desde Python usa `create_user()` o `set_password()`; asignar directamente `user.password = "..."` no realiza ese procesamiento.

### Salir de la sesión también solicita un cambio

En `articulos/base.html` puedes incorporar este bloque. El procesador de contexto de autenticación del proyecto inicial aporta `user` al template:

```html
{% if user.is_authenticated %}
  <p>Sesión de {{ user.username }}</p>
  <form method="post" action="{% url 'logout' %}">
    {% csrf_token %}
    <button type="submit">Cerrar sesión</button>
  </form>
{% else %}
  <a href="{% url 'login' %}">Iniciar sesión</a>
{% endif %}
```

La view de cierre de sesión de la versión usada acepta POST. Un enlace GET no es el sustituto de este formulario. Al salir se elimina el vínculo autenticado; no se borra la cuenta.

## 3. Autorizar operaciones en el servidor

### Permisos y grupos

Al migrar los modelos, Django crea por defecto permisos `add`, `change`, `delete` y `view` para cada modelo. Por eso [los formularios](/django-formularios-crud.html) usaban `articulos.add_articulo` y `articulos.change_articulo`. Un grupo reúne permisos; asignar una persona al grupo evita mantener la misma lista cuenta por cuenta.

Para una vista privada que solo exige haber entrado, se utiliza `@login_required`. Si además se necesita un permiso concreto, combina ambos así sobre la view correspondiente:

```python
from django.contrib.auth.decorators import login_required, permission_required

@login_required
@permission_required("articulos.change_articulo", raise_exception=True)
def vista_privada(request):
    from django.http import HttpResponse
    return HttpResponse("Puedes modificar artículos.")
```

Este fragmento ilustra la política; no sustituye la función `editar`. Para aplicarlo a ella, añade `@login_required` por encima de su decorador de permisos. El visitante anónimo será enviado al login; una cuenta autenticada sin permiso recibirá `403`. Si solo usas `permission_required(..., raise_exception=True)`, incluso el anónimo recibirá directamente `403`, como en el ejemplo inicial de formularios.

Ocultar un botón con `{% if perms.articulos.change_articulo %}` mejora la presentación. La comprobación del servidor sigue siendo necesaria porque cualquiera puede construir una petición sin pulsar ese botón.

### Permiso global no significa propiedad del objeto

El permiso anterior permite editar el tipo de objeto `Articulo`. No responde a «¿este artículo pertenece a esta persona?». Si incorporas autoría, necesitas un campo que relacione el artículo con `settings.AUTH_USER_MODEL`, una migración y una política explícita. Entonces una búsqueda filtrada por `autor=request.user` puede limitar qué objetos están disponibles para una operación.

No copies ese filtro sobre nuestro modelo actual: todavía no tiene `autor`. Tampoco asumas que `has_perm("...", objeto)` implementa automáticamente permisos por objeto con el backend predeterminado. La regla debe tener una implementación concreta.

## 4. Límites y fallos que conviene distinguir

### Sesión, CSRF y acceso son controles distintos

Una sesión identifica el contexto entre peticiones; la autenticación asocia una identidad; los permisos permiten o impiden acciones; CSRF protege solicitudes de cambio basadas en cookies frente a determinados orígenes externos. Necesitas entenderlos por separado para diagnosticar un `403`.

`is_staff` permite acceder al admin si se cumplen las demás condiciones; no equivale a disponer de todos los permisos. Un superusuario activo los obtiene de forma amplia, por lo que comprobar todo únicamente con esa cuenta puede ocultar errores de autorización. Valida también con un visitante y con una cuenta normal.

En producción, las cookies de sesión deben viajar por HTTPS y la aplicación necesita la configuración apropiada para el proxy que termine TLS. Borrar Redis, cambiar claves o cambiar de backend de sesiones puede cerrar sesiones según dónde se guarde su contenido. La guía de [Redis con Django](/redis-django.html) separa deliberadamente una caché prescindible de datos de sesión.
