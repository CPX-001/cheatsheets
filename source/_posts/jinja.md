---
title: Jinja Templates
disableNunjucks: true
date: 2026-09-12 10:00:00
background: bg-[#b41717]
label: Python
tags:
  - python
  - web
  - templates
  - jinja2
  - django
categories:
  - Programming
intro: |
  Learn Jinja step by step: context, filters, control flow, inheritance and macros, with Django integration and a comparison with Django templates.
plugins:
  - copyCode
---

## Learning Path {.cols-2}

### Jinja or Django Templates?

**Jinja** is the template language; its Python package and Django backend are called **Jinja2**. The general syntax below also works outside Django.

**Django uses its own template language (DTL) by default.** Check `TEMPLATES` in `settings.py`: a backend ending in `DjangoTemplates` uses DTL; one ending in `jinja2.Jinja2` uses Jinja. The filename extension does not select the engine.

If your project uses DTL, start with [Django templates](/django#templates). There is no need to switch engines to learn templating. If it uses Jinja, follow this sheet and its [Django integration](#jinja-in-django).

Source: [Django template engines](https://docs.djangoproject.com/en/5.2/topics/templates/).

### Recommended Progression

Start with basic HTML and Python dictionaries/lists. Build one small catalog, adding a concept at each step:

1. **Render and context** — turn a template plus data into HTML.
2. **Variables and escaping** — display a name and understand what happens to HTML in values.
3. **Filters and tests** — format values and handle missing data.
4. **Conditions and loops** — display products and an empty state.
5. **Inheritance** — share a page layout with `extends` and `block`.
6. **Includes and macros** — extract a fragment, then a component with arguments.
7. **Django integration** — configure the engine, URLs, static files and CSRF.
8. **Later topics** — scope, whitespace, JSON and custom filters, as needed.

This order is a practical recommendation based on the concepts each step needs, rather than an official curriculum. Keep data fetching and business rules in Python; use templates for presentation.

## First Render {.cols-2}

### Run Jinja without a Framework

```bash
python -m pip install Jinja2
```

Create `render.py` next to a `templates/` directory:

```python
from pathlib import Path
from jinja2 import Environment, FileSystemLoader
from jinja2 import StrictUndefined, select_autoescape

env = Environment(
    loader=FileSystemLoader(
        Path(__file__).parent / "templates"
    ),
    autoescape=select_autoescape(["html", "xml"]),
    undefined=StrictUndefined,
)

template = env.get_template("hello.html")
print(template.render(name="Alex"))
```

Run `python render.py`. `StrictUndefined` makes accidental missing variables fail visibly; it is an explicit choice here, not Jinja's default. `select_autoescape` enables escaping for the listed file extensions.

Source: [Jinja environment and rendering API](https://jinja.palletsprojects.com/en/stable/api/#basics).

### Template, Context and Output

`templates/hello.html`:

```jinja
{# A comment that is not sent to the browser #}
<h1>Hello, {{ name }}!</h1>
```

The **context** is the data passed to `render`, such as `name="Alex"`. The result is `<h1>Hello, Alex!</h1>`; the browser receives HTML, not Jinja instructions.

| Syntax                        | Purpose                  |
| ----------------------------- | ------------------------ |
| `{{ name }}`                  | Output an expression     |
| `{% if name %}...{% endif %}` | Execute a statement      |
| `{# note #}`                  | Leave a template comment |

With the environment above, `name="<b>Alex</b>"` displays the tags as text. Keep autoescaping enabled for HTML. `safe` marks a value as trusted HTML; it does **not** sanitize it. Do not use it on untrusted input.

Source: [Jinja HTML escaping](https://jinja.palletsprojects.com/en/stable/templates/#html-escaping).

## Variables, Filters and Control Flow {.cols-3}

### Read Values

```jinja
{{ product.name }}
{{ product["name"] }}
{{ products[0].name }}
{{ products|length }}
{{ "Hello, " ~ name }}
```

Dot lookup tries attributes before dictionary keys; brackets try keys first. Use `data["items"]` for a dictionary key named `items`, to avoid its `items` method.

Use expressions directly inside statements: `{% if product %}`, without nested output braces.

Source: [Variables and lookup rules](https://jinja.palletsprojects.com/en/stable/templates/#variables).

### Format with Filters

```jinja
{{ name|trim|title }}
{{ tags|join(", ") }}
{{ description|truncate(80) }}
{{ products|length }}
{{ "%.2f"|format(product.price) }}
```

Filters run left to right. Arguments use parentheses, such as `truncate(80)`.

```jinja
{{ nickname|default("Anonymous") }}
{{ nickname|default("Anonymous", true) }}
```

The first fallback handles **undefined** values only. The second also replaces false-like values, including `""`, `none`, `false` and `0`. Preserve zero when it is meaningful.

Source: [Built-in filters](https://jinja.palletsprojects.com/en/stable/templates/#builtin-filters).

### Conditions and Tests

```jinja
{% if stock is defined and stock > 0 %}
  <p>In stock</p>
{% elif stock is defined and stock == 0 %}
  <p>Sold out</p>
{% else %}
  <p>Stock unknown</p>
{% endif %}

{% if note is defined and note is not none %}
  <p>{{ note }}</p>
{% endif %}
```

Use `==` for equality; `and`, `or`, `not` and `in` for expressions. Tests such as `is defined` and `is none` inspect values. `none` is a value; undefined means the value is absent.

Source: [Tests](https://jinja.palletsprojects.com/en/stable/templates/#tests).

### Loops and Empty States

```jinja
<ul>
{% for product in products %}
  <li>{{ loop.index }}. {{ product.name }}</li>
{% else %}
  <li>No products yet.</li>
{% endfor %}
</ul>
```

The `else` branch runs when there are no iterations. Pass `products=[]` for an empty catalog.

| Loop value                 | Meaning                |
| -------------------------- | ---------------------- |
| `loop.index`               | Position starting at 1 |
| `loop.index0`              | Position starting at 0 |
| `loop.first` / `loop.last` | First / last iteration |
| `loop.length`              | Number of items        |

Source: [For loops](https://jinja.palletsprojects.com/en/stable/templates/#for).

### Dictionaries and Filtered Loops

```jinja
{% for key, value in details.items() %}
  <p>{{ key }}: {{ value }}</p>
{% endfor %}

{% for product in products if product.in_stock %}
  <p>{{ product.name }}</p>
{% else %}
  <p>No products in stock.</p>
{% endfor %}
```

Jinja calls methods explicitly, with parentheses. In a filtered loop, counters and `else` reflect only the items that pass the filter.

## Reuse Templates {.cols-2}

### Inheritance: Shared Layout

`templates/base.html`:

```jinja
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>{% block title %}Shop{% endblock %}</title>
  </head>
  <body>
    <main>{% block content %}{% endblock %}</main>
  </body>
</html>
```

`templates/catalog.html`:

```jinja
{% extends "base.html" %}
{% block title %}Catalog · {{ super() }}{% endblock %}
{% block content %}
  <h1>Catalog</h1>
  <ul>
  {% for product in products %}
    <li>{{ product.name }}</li>
  {% else %}
    <li>No products yet.</li>
  {% endfor %}
  </ul>
{% endblock %}
```

Load `catalog.html` instead of `hello.html` and render it with `products=[{"name": "Notebook"}]`. Put `extends` first and page content inside blocks. `super()` renders the parent block, producing the title `Catalog · Shop` here.

Source: [Template inheritance](https://jinja.palletsprojects.com/en/stable/templates/#template-inheritance).

### Include: A Shared Fragment

`templates/partials/product.html`:

```jinja
<article>
  <h2>{{ product.name }}</h2>
  <p>{{ "%.2f"|format(product.price) }} EUR</p>
</article>
```

Use it inside a page's content block:

```jinja
{% for product in products %}
  {% include "partials/product.html" %}
{% endfor %}
```

Includes receive the current context by default, including the current `product`. To give a fragment a local value:

```jinja
{% with product=featured_product %}
  {% include "partials/product.html" %}
{% endwith %}
```

Source: [Includes](https://jinja.palletsprojects.com/en/stable/templates/#include).

### Macro: A Component with Arguments

`templates/macros/ui.html`:

```jinja
{% macro badge(text, tone="neutral") %}
  <span class="badge badge-{{ tone }}">{{ text }}</span>
{% endmacro %}
```

Import and call it inside a page's content block:

```jinja
{% from "macros/ui.html" import badge %}
{{ badge("Available", tone="success") }}
{{ badge("Coming soon") }}
```

Imported macros do not receive the caller's context by default. Prefer explicit arguments; use `with context` on the import only when the macro needs that context.

Source: [Macros](https://jinja.palletsprojects.com/en/stable/templates/#macros) and [import context](https://jinja.palletsprojects.com/en/stable/templates/#import-visibility).

### Choose the Right Tool

| Need                                              | Construct           |
| ------------------------------------------------- | ------------------- |
| Shared page skeleton with replaceable regions     | `extends` + `block` |
| Render a fragment with current page data          | `include`           |
| Reuse markup with explicit arguments and defaults | `macro` + `import`  |

Practice in this order: make two pages share `base.html`, extract a product fragment, then add a badge macro. Introduce reuse after the original markup works.

## Jinja in Django {.cols-2}

### Add the Backend

Install `Jinja2` in your Django project's environment. Add this **after the existing `TEMPLATES` definition** in `config/settings.py`:

```python
TEMPLATES.append({
    "NAME": "jinja2",
    "BACKEND": "django.template.backends.jinja2.Jinja2",
    "DIRS": [BASE_DIR / "jinja2"],
    "APP_DIRS": True,
    "OPTIONS": {
        "environment": "config.jinja2.environment",
    },
})
```

Keep the existing `DjangoTemplates` backend for Django's admin and apps that provide DTL templates. Replace `config` with your project package name if different.

With `APP_DIRS=True`, Jinja searches each installed app's **`jinja2/`** directory; DTL searches **`templates/`**. This example also adds a project-level `jinja2/` directory through `DIRS`.

Source: [Django's Jinja2 backend](https://docs.djangoproject.com/en/5.2/topics/templates/#django.template.backends.jinja2.Jinja2).

### Register Django Helpers

Create `config/jinja2.py`:

```python
from django.templatetags.static import static
from django.urls import reverse
from jinja2 import Environment


def environment(**options):
    env = Environment(**options)
    env.globals.update(static=static, url=reverse)
    return env
```

Django passes loader and autoescaping options into this function; preserve them with `Environment(**options)`. Its Jinja backend enables autoescaping by default.

`url` and `static` become available because this function registers them. Django tags, filters and DTL context processors are **not automatically imported** into Jinja.

For stricter missing-variable checks, optionally add `"undefined": StrictUndefined` to the backend's `OPTIONS`, importing it from `jinja2` in settings first.

### Files and a View

Reuse the earlier `base.html` and save `catalog.html` as `shop/catalog.html` in this layout. The `shop` app must be in `INSTALLED_APPS`.

```text
project/
├── config/
│   ├── settings.py
│   └── jinja2.py
├── jinja2/
│   └── base.html
└── shop/
    ├── views.py
    └── jinja2/
        └── shop/
            └── catalog.html
```

```python
# shop/views.py
from django.shortcuts import render


def catalog(request):
    return render(
        request,
        "shop/catalog.html",
        {"products": [{"name": "Notebook"}]},
        using="jinja2",
    )
```

Connect this view in your URLconf as usual. `using="jinja2"` selects the backend by `NAME`; without it, Django tries the configured engines in order. Engines do not translate each other's syntax, and a syntax error does not trigger a fallback to the next engine.

### URLs, Static Files and CSRF

These snippets assume named routes `shop:detail` and `shop:create`, a `product` in the context, and the helpers registered above:

```jinja
<link rel="stylesheet" href="{{ static('shop/site.css') }}">
<a href="{{ url('shop:detail', kwargs={'pk': product.pk}) }}">
  {{ product.name }}
</a>

<form method="post" action="{{ url('shop:create') }}">
  {{ csrf_input }}
  <label for="name">Product name</label>
  <input id="name" name="name" required>
  <button type="submit">Create</button>
</form>
```

When rendering with a request, Django adds `request`, `csrf_input` and `csrf_token`. Use `{{ csrf_input }}` inside forms posting to your site; keep Django's CSRF middleware enabled and validate submissions in the view. Jinja's syntax here differs from DTL's `{% csrf_token %}`.

For authentication checks, use `request.user.is_authenticated` when Django's authentication middleware is enabled, or pass `user` explicitly.

## Jinja vs Django Template Language {.cols-1}

### Similar Delimiters, Different Languages

| Task                                      | Jinja                                                           | Django DTL                                      |
| ----------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------- |
| Output a value                            | `{{ product.name }}`                                            | `{{ product.name }}`                            |
| Lowercase                                 | <code>{{ name&#124;lower }}</code>                              | <code>{{ name&#124;lower }}</code>              |
| Fallback for missing or false-like values | <code>{{ name&#124;default("Guest", true) }}</code>             | <code>{{ name&#124;default:"Guest" }}</code>    |
| Loop counter                              | `{{ loop.index }}`                                              | `{{ forloop.counter }}`                         |
| Empty loop branch                         | `{% else %}`                                                    | `{% empty %}`                                   |
| Parent block content                      | `{{ super() }}`                                                 | `{{ block.super }}`                             |
| Dictionary iteration                      | `{% for k, v in data.items() %}`                                | `{% for k, v in data.items %}`                  |
| Include with a local value                | `{% with product=item %}{% include "card.html" %}{% endwith %}` | `{% include "card.html" with product=item %}`   |
| Named URL                                 | `{{ url('shop:detail', kwargs={'pk': product.pk}) }}`           | `{% url 'shop:detail' pk=product.pk %}`         |
| Static file                               | `{{ static('shop/site.css') }}`                                 | `{% load static %}{% static 'shop/site.css' %}` |
| CSRF form field                           | `{{ csrf_input }}`                                              | `{% csrf_token %}`                              |
| Reusable markup with arguments            | `macro` + `import`                                              | Includes or custom inclusion tags               |

The Jinja URL/static/CSRF examples above require the Django integration described in this sheet. Django's `{% load %}` and its custom template-tag libraries cannot be pasted into Jinja.

Sources: [Django template language](https://docs.djangoproject.com/en/5.2/ref/templates/language/) and [DTL built-ins](https://docs.djangoproject.com/en/5.2/ref/templates/builtins/).

## Later Topics and Common Traps {.cols-3}

### Assignment and Scope

```jinja
{% set heading = "Catalog" %}
<h1>{{ heading }}</h1>

{% set ns = namespace(found=false) %}
{% for product in products %}
  {% if product.in_stock %}
    {% set ns.found = true %}
  {% endif %}
{% endfor %}
{{ ns.found }}
```

A regular `set` inside a loop does not update an outer variable. `namespace` allows state to cross loop scope; `if` alone does not introduce a scope. Usually, compute totals and flags in Python instead.

Source: [Assignments and scope](https://jinja.palletsprojects.com/en/stable/templates/#assignments).

### Whitespace and JSON

```jinja
{%- if show_label -%}
  Label
{%- endif -%}
```

The minus sign strips adjacent whitespace. Use it sparingly in HTML: it can join words that should remain separated.

```jinja
<script id="page-data" type="application/json">
  {{ page_data|tojson }}
</script>
```

Pass JSON-serializable data from Python and read this element's `textContent` with `JSON.parse`. Use `tojson` instead of assembling JavaScript strings. Its output is safe in script elements, but requires additional handling in double-quoted HTML attributes.

Sources: [Whitespace control](https://jinja.palletsprojects.com/en/stable/templates/#whitespace-control) and [tojson](https://jinja.palletsprojects.com/en/stable/templates/#jinja-filters.tojson).

### Debugging Checklist

| Symptom                                   | Check                                                        |
| ----------------------------------------- | ------------------------------------------------------------ |
| Template not found                        | Backend name, `DIRS`, installed app and its `jinja2/` folder |
| Unknown `load` tag or filter syntax error | Whether DTL syntax was used in Jinja                         |
| `url` or `static` is undefined            | The configured environment function and its globals          |
| Missing value is blank or raises an error | Context keys and the environment's undefined policy          |
| Missing CSRF field                        | Render with a request and include `csrf_input`               |
| Parent content disappears                 | Override only the intended block; use `super()` to retain it |

For custom formatting, register a function in `env.filters` **before loading templates**. Advanced extensions and async rendering can wait until a project needs them.

Source: [Jinja custom filters](https://jinja.palletsprojects.com/en/stable/api/#custom-filters).
