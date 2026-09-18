---
title: 'Django · Glosario'
date: '2026-09-18'
updated: '2026-09-19'
layout: 'learning'
language: 'es'
disableNunjucks: true
icon: 'django'
categories: ['Python']
intro: 'Términos, comandos y APIs con su contexto de uso. Cada entrada explica qué hace la pieza y remite al tema donde se conecta con las demás.'
heading: 'Glosario de Django'
eyebrow: 'Referencia rápida · Django'
learning_classes: 'learning-page learning-django learning-glossary'
background: 'bg-gradient-to-r from-emerald-700 to-green-900 !text-white'
---

## HTTP y recorrido de una petición

### Request y response

`request` es el objeto que Django entrega a una view: método, ruta, campos enviados, sesión y usuario, según el middleware. La view devuelve una respuesta HTTP con estado, cabeceras y cuerpo. `request.GET` contiene parámetros de consulta; `request.POST`, campos de un formulario convencional. Un cuerpo JSON requiere otro tratamiento. [Recorrido completo](/django.html).

### URL, view y middleware

`path()` relaciona un patrón con una view; `include()` delega un prefijo a otras rutas. Una view interpreta la petición y produce la respuesta. El middleware puede intervenir alrededor de ella, por ejemplo recuperando sesión y usuario. `404` significa recurso no encontrado; `403`, acceso prohibido; `500`, error del servidor.

### Nombres de URL y reverse

`app_name = "articulos"` y `name="lista"` permiten referirse a `articulos:lista`. En Python, `reverse("articulos:lista")` obtiene su URL. En un template se usa `{% url 'articulos:lista' %}`. `NoReverseMatch` señala que nombre y argumentos no permiten construir la dirección. [URLs y templates](/django-http-templates.html).

## Proyecto y terminal

### Proyecto, aplicación y settings

El proyecto reúne configuración y entradas de ejecución; una aplicación agrupa un dominio, como artículos. `INSTALLED_APPS` registra aplicaciones, pero no publica URLs. `DJANGO_SETTINGS_MODULE=config.settings` indica qué configuración carga el proceso; poner Python en Docker no cambia esa selección.

### manage.py y el shell

Estos comandos se ejecutan en una terminal, con el entorno Python activo y desde la carpeta que contiene `manage.py`:

```bash
python manage.py check
python manage.py runserver
python manage.py shell
```

`check` revisa la configuración, `runserver` mantiene el servidor de desarrollo y `shell` abre Python con Django preparado. Dentro del shell se escriben imports y expresiones Python, no otro `python manage.py ...`.

## Modelos y consultas

### Modelo, instancia y clave primaria

En los modelos normales de la guía, la clase describe una tabla; una instancia representa una fila. `pk` es el acceso genérico a la clave primaria. Cambiar un atributo de la instancia modifica memoria; `save()` lo persiste. `refresh_from_db()` vuelve a leer valores que pudieron cambiar en la base. [Modelos y ORM](/django-datos-orm.html).

### Migraciones

```bash
python manage.py makemigrations articulos
python manage.py migrate
python manage.py showmigrations articulos
```

`makemigrations` escribe operaciones a partir del cambio en los modelos; `migrate` las aplica; `showmigrations` muestra cuáles constan como aplicadas. Los archivos se versionan con el código. No borres migraciones aplicadas para resolver un desacuerdo de esquema sin entender el estado de las bases que las usan.

### Manager y QuerySet

`Articulo.objects` es el manager del modelo. `filter()` produce un QuerySet componible y normalmente diferido; iterarlo o convertirlo con `list()` necesita resultados. `get()` espera uno y puede lanzar una excepción por ausencia o multiplicidad. `first()` devuelve un objeto o `None`; `exists()` comprueba existencia sin devolver todos los objetos.

### Relaciones y carga de datos

`ForeignKey` relaciona muchas filas con una; `categoria_id` contiene el identificador y `categoria` permite acceder al objeto. `select_related` incorpora relaciones de un solo objeto mediante joins. `prefetch_related` resuelve colecciones con consultas adicionales y las enlaza en Python. El problema N+1 aparece cuando cada fila provoca otra consulta. [Rendimiento](/django-testing-performance.html).

### null, blank y validación

`null` afecta a valores admitidos en la base; `blank`, a validación. `unique` representa unicidad. `save()` no llama automáticamente a `full_clean()`. La validación de un formulario mejora la entrada; las restricciones de base sostienen reglas incluso cuando escribe otro proceso.

## Templates y formularios

### Contexto, etiquetas y filtros

El contexto es el diccionario que una view entrega al template. `{{ articulo.titulo }}` imprime un dato; `{% if %}` y `{% for %}` controlan el renderizado; <code>{{ articulo.titulo&#124;upper }}</code> transforma la presentación. `extends` hereda una estructura y `include` inserta un fragmento. El navegador recibe el HTML resultante, no ejecuta esas instrucciones.

### Escape y safe

El escape automático hace que texto con caracteres HTML se presente como texto. `safe` omite esa protección para un valor; no sanea entradas. No es una solución general para mostrar contenido enviado por usuarios.

### Form, ModelForm y cleaned_data

Un `Form` describe campos y validación. Un `ModelForm` reutiliza parte del contrato de un modelo. `is_valid()` ejecuta la validación; `cleaned_data` contiene valores convertidos y aceptados. Un formulario enlazado conserva datos enviados y errores. `instance=objeto` permite editar esa fila; sin instancia, `save()` de un ModelForm crea una nueva. [Formularios](/django-formularios-crud.html).

### CSRF y redirección tras POST

`{% csrf_token %}` añade al formulario el token que comprueba la protección CSRF. No concede permisos. Después de guardar, `redirect("articulos:lista")` devuelve una redirección para terminar el recorrido en un GET y reducir reenvíos al refrescar. Eso no implementa idempotencia completa.

## Usuarios y operaciones

### Sesión, autenticación y permisos

La sesión enlaza peticiones mediante una cookie y un backend de almacenamiento. La autenticación asocia una identidad; la autorización decide acciones. `login_required` exige acceso; `permission_required` un permiso concreto. `is_staff` permite acceder al admin bajo sus reglas, mientras que un superusuario activo tiene permisos amplios. [Usuarios](/django-auth.html).

### Transacción, atomic y on_commit

`transaction.atomic()` agrupa escrituras de base para confirmar o revertir el conjunto. `select_for_update()` solicita bloqueos por fila en bases compatibles; SQLite no demuestra esa garantía. `transaction.on_commit()` ejecuta un callback tras confirmar, pero no convierte una llamada externa en trabajo durable. [Arquitectura](/django-arquitectura.html).

### Tests y cliente de pruebas

`python manage.py test articulos` ejecuta las pruebas de la aplicación. `TestCase` ofrece aislamiento de datos; `self.client` simula peticiones dentro del proceso. No ejecuta JavaScript. `force_login()` prepara una sesión para probar permisos; no verifica el recorrido de introducir credenciales. [Pruebas](/django-testing-performance.html).

## Procesos y despliegue

### WSGI, ASGI y worker

WSGI y ASGI conectan servidor y aplicación. Un worker HTTP atiende peticiones; un worker de tareas procesa trabajos pendientes. Son funciones diferentes aunque compartan código. `async` permite ceder el control durante esperas compatibles; no hace durable un trabajo ni paraleliza automáticamente CPU.

### Static, media y caché

Static son archivos de la aplicación; media son archivos subidos. `collectstatic` reúne los primeros. Una caché conserva resultados reconstruibles durante un tiempo; no reemplaza automáticamente una base de datos o el almacenamiento de sesiones. [Producción](/django-produccion.html) y [Redis con Django](/redis-django.html) explican sus ciclos de vida.
