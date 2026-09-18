---
title: 'Django · Organizar una aplicación real'
date: '2026-09-18'
updated: '2026-09-19'
layout: 'learning'
language: 'es'
disableNunjucks: true
icon: 'django'
categories: ['Python']
intro: 'Cómo repartir responsabilidades entre URLs, views, modelos y servicios; cuándo introducir una capa y cómo mantener coherentes las escrituras.'
heading: 'Organizar una aplicación real'
eyebrow: 'Ruta 06 de 8 · Construir con criterio'
learning_classes: 'learning-page learning-django learning-page-cards'
---

## 1. Organizar según el trabajo que hace el código

### Un archivo no es una responsabilidad por sí solo

En los temas anteriores, `urls.py` elegía la view; la view interpretaba la petición; un formulario validaba campos; el ORM leía o guardaba artículos; el template producía HTML. Esa separación ya es una arquitectura útil. Añadir más carpetas no mejora automáticamente un proyecto: conviene separar algo cuando tiene un trabajo reconocible, crece o se reutiliza desde varias entradas.

Por ejemplo, «publicar un artículo» puede ejecutarse desde una pantalla, un comando o una tarea. Si la regla vive únicamente en una view, las otras entradas tendrán que duplicarla o simular una petición HTTP. Una función de servicio puede expresar esa operación usando argumentos normales de Python. La view mantiene la autorización y convierte el resultado en una respuesta.

```text
articulos/
├── models.py       → datos y relaciones
├── forms.py        → conversión y validación de formularios
├── services.py     → operaciones compartidas cuando hacen falta
├── views.py        → frontera HTTP
├── urls.py         → direcciones y nombres
├── tests.py        → comportamiento esperado
└── templates/      → presentación HTML
```

Este es un criterio, no una obligación de crear todos los archivos desde el día uno. Una view que devuelve una lista filtrada no necesita un servicio intermediario que solo repita la misma línea.

## 2. Una operación que existe fuera de una view

### Expresar la regla con entradas claras

Usamos el modelo `Articulo` de [datos y ORM](/django-datos-orm.html). Supón que una publicación exige un texto con contenido. Esta función puede invocarse desde una view o un comando, sin conocer `request`:

```python
# articulos/services.py
from django.core.exceptions import ValidationError
from django.db import transaction
from .models import Articulo


@transaction.atomic
def publicar_articulo(articulo_id):
    articulo = Articulo.objects.select_for_update().get(pk=articulo_id)
    if not articulo.texto.strip():
        raise ValidationError("El artículo necesita contenido antes de publicarse.")
    articulo.publicado = True
    articulo.save(update_fields=["publicado"])
    return articulo
```

`articulo_id` es el identificador de un artículo existente. La función carga el objeto, comprueba la regla y lo guarda. `ValidationError` representa una entrada que no permite completar la operación; quien llama decide cómo mostrarla. Una ausencia produce `Articulo.DoesNotExist`, que una view podría convertir en `404`.

Esta función no recibe un usuario ni comprueba permisos: por eso la autorización debe ocurrir en su entrada HTTP o incorporarse explícitamente al servicio si forma parte de su contrato. Es importante decidirlo, porque un nombre como `publicar_articulo` no garantiza por sí solo quién puede ejecutarlo.

### Qué protege una transacción

Por defecto, Django trabaja con autocommit: cada escritura se confirma si no hay una transacción exterior. `atomic` agrupa operaciones; si una excepción sale del bloque, sus escrituras se revierten. Una transacción mantiene coherencia en la base, no revierte un correo ya enviado ni una llamada a otra API.

`select_for_update` solicita un bloqueo de las filas leídas en bases compatibles, como PostgreSQL. Aquí evita que otro escritor cambie la fila entre la comprobación y el guardado si también respeta ese bloqueo. En SQLite no proporciona ese bloqueo por fila. Puedes ejecutar la función en el entorno inicial, pero una prueba con SQLite no demuestra su comportamiento concurrente en PostgreSQL.

Con una sola actualización sin decisión previa quizá baste una sentencia `UPDATE`. Un bloqueo tiene sentido porque hay una secuencia de lectura, decisión y escritura que debe observar un estado estable. Mantén cortas las transacciones: esperar una llamada de red mientras sostienes bloqueos retrasa a otras peticiones.

## 3. Efectos después de confirmar

### La base y los sistemas externos no comparten automáticamente una transacción

Si al publicar quieres invalidar una caché, hacerlo antes del commit puede permitir que otra petición la rellene con datos antiguos todavía visibles en la base. `transaction.on_commit` registra una función para ejecutarla cuando la transacción exterior termine correctamente:

```python
from django.core.cache import cache
from django.db import transaction

# Dentro de publicar_articulo, después de guardar:
# transaction.on_commit(lambda: cache.delete(f"articulo:{articulo_id}:v1"))
```

La última línea se muestra comentada porque la clave corresponde al patrón explicado en [Redis con Django](/redis-django.html). Debes usar exactamente la clave que haya escrito tu caché. No hay un mecanismo que adivine qué entradas dependen del artículo.

Si un callback falla después del commit, el cambio en la base ya ocurrió. Para efectos que no pueden perderse se necesita un diseño durable, como registrar un evento pendiente en la misma base y procesarlo con reintentos. Eso se suele llamar **outbox**. No necesitas introducirlo para una página sencilla, pero sí distinguir su garantía de la de un callback en memoria.

## 4. Settings, entorno e imports

### La configuración se elige al arrancar el proceso

`DJANGO_SETTINGS_MODULE` indica el módulo de configuración, por ejemplo `config.settings`. Docker no cambia esa selección por el hecho de ejecutar Python dentro de un contenedor. Un servidor, un comando y un worker deben cargar la configuración prevista y conectar a los servicios correctos.

Puedes comenzar con un solo `settings.py` que lee variables de entorno. Separar después `base.py`, `development.py` y `production.py` puede ayudar si las diferencias crecen; no es un requisito para que la configuración sea válida. Evita importar settings concretos desde tus aplicaciones: `from django.conf import settings` respeta la selección activa.

Los imports se ejecutan al cargar módulos. Abrir conexiones, consultar la base o enviar mensajes durante un import dificulta el arranque y los comandos de mantenimiento. Define funciones al importar y ejecuta su trabajo en el momento adecuado. Una conexión cliente con pool puede existir a nivel de proceso si su biblioteca lo admite; una consulta con efectos no debería ocurrir solo por importar un archivo.

## 5. Elegir una frontera cuando crece el proyecto

### Aplicaciones por dominio, servicios por operación

Artículos y comentarios pueden merecer aplicaciones separadas si sus responsabilidades evolucionan de forma independiente. Partir «modelos», «views» y «formularios» en aplicaciones diferentes rompe, en cambio, la unidad de una misma función del producto. Las aplicaciones Django no son necesariamente microservicios: suelen vivir en el mismo proceso y compartir transacciones.

Una regla práctica es poder explicar qué entra, qué sale y qué modifica cada función. Si una operación recibe un `request` completo aunque solo necesita un identificador, está acoplada a HTTP. Si devuelve una redirección desde una tarea en segundo plano, sus responsabilidades se han mezclado. Separar esas fronteras facilita las [pruebas](/django-testing-performance.html) porque puedes comprobar reglas sin montar una navegación entera.
