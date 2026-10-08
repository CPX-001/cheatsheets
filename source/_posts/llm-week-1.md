---
title: 'LLM Engineering · Week 1'
date: '2026-09-23'
updated: '2026-10-09'
layout: 'learning'
language: 'es'
disableNunjucks: true
icon: 'ai'
series_title: 'LLM Engineering'
categories: ['AI']
intro: 'Python, JSON, Chat Completions, historial, streaming y modelos locales.'
heading: 'LLM Engineering · Week 1'
learning_classes: 'learning-page learning-llm learning-page-cards'
background: 'bg-gradient-to-r from-violet-700 to-purple-900 !text-white'
---

## JSON

JSON es un formato de texto. Para trabajar con sus datos en Python se convierte a un diccionario o una lista; para enviarlos como JSON se hace la conversión inversa.

### JSON a diccionario: json.loads()

```python
import json

texto = '{"nombre": "Ana", "activo": true, "nota": null}'
datos = json.loads(texto)

print(datos["nombre"])
print(datos["activo"])
print(datos["nota"])
```

```text
Ana
True
None
```

`texto` es un `str`; `datos` es un `dict`. Si el JSON contiene un array, `loads()` devuelve una lista:

```python
numeros = json.loads("[10, 20, 30]")
print(numeros[0])
```

```text
10
```

### Diccionario a JSON: json.dumps()

```python
datos = {"nombre": "Lucía", "activo": True, "nota": None}
texto = json.dumps(datos, ensure_ascii=False, indent=2)
print(texto)
```

```json
{
  "nombre": "Lucía",
  "activo": true,
  "nota": null
}
```

`ensure_ascii=False` conserva las tildes legibles y `indent=2` añade sangría. JSON usa comillas dobles y los valores `true`, `false` y `null`; Python usa `True`, `False` y `None`.

`str(datos)` no produce JSON. `json.loads()` tampoco sirve para leer Markdown: necesita texto JSON válido. [Documentación de json](https://docs.python.org/3/library/json.html).

## Listas y diccionarios

Una lista se accede por posición; un diccionario, por clave. Las respuestas estructuradas suelen combinar ambos:

```python
seleccion = {
    "links": [
        {"type": "about", "url": "https://empresa.example/about"},
        {"type": "careers", "url": "https://empresa.example/jobs"},
    ]
}

enlaces = seleccion["links"]
primer_enlace = enlaces[0]
url = primer_enlace["url"]

print(seleccion["links"][0]["url"])
```

```text
https://empresa.example/about
```

`seleccion` es un diccionario, `enlaces` es una lista y cada elemento de esa lista es otro diccionario.

### Recorrer

```python
for enlace in enlaces:
    print(enlace["type"], enlace["url"])
```

Para recorrer un diccionario, `for clave in primer_enlace` obtiene sus claves. `items()` permite obtener cada clave junto con su valor:

```python
for clave, valor in primer_enlace.items():
    print(clave, valor)
```

### Extraer y filtrar

```python
urls = [enlace["url"] for enlace in enlaces]

urls_about = [
    enlace["url"]
    for enlace in enlaces
    if enlace["type"] == "about"
]

print(urls_about)
```

```text
['https://empresa.example/about']
```

### Campos opcionales

```python
titulo = primer_enlace.get("title", "Sin título")
print(titulo)
```

```text
Sin título
```

`get()` devuelve el valor indicado cuando falta la clave. El acceso `primer_enlace["title"]` produciría `KeyError`.

## Texto y prompts

### Interpolar variables

```python
nombre = "Biblioteca Central"
texto_web = "Abre de lunes a viernes, de 9 a 18 horas."

prompt = f"""Resume la información de {nombre}.
Conserva los horarios y no inventes datos.

{texto_web}
"""
```

El prefijo `f` permite insertar variables entre llaves. Las comillas triples permiten escribir varias líneas. La instrucción define la tarea y el formato; `texto_web` aporta los datos.

### Unir textos

```python
urls = ["https://empresa.example/about", "https://empresa.example/jobs"]
texto_enlaces = "\n".join(urls)
print(texto_enlaces)
```

```text
https://empresa.example/about
https://empresa.example/jobs
```

`"\n"` separa los elementos con un salto de línea. `join()` necesita strings: si se parte de la lista de diccionarios `enlaces`, primero se extrae el campo:

```python
texto_enlaces = "\n".join(enlace["url"] for enlace in enlaces)
```

### Recortar

```python
texto_limitado = texto_web[:2000]
```

El corte conserva los primeros 2.000 caracteres. No cuenta tokens.

## OpenAI y mensajes

### Cliente

Con `OPENAI_API_KEY` en el `.env` del proyecto:

```python
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv(override=True)
cliente = OpenAI()
modelo = "gpt-4.1-mini"
```

`load_dotenv()` carga las variables del archivo. `override=True` sustituye valores que el proceso ya tuviera. `OpenAI()` lee la clave y crea el cliente; la petición se envía al ejecutar `create()`.

### Llamada y respuesta

```python
mensajes = [
    {"role": "system", "content": "Resume en español sin inventar datos."},
    {"role": "user", "content": "La biblioteca abre de lunes a viernes, de 9 a 18."},
]

respuesta = cliente.chat.completions.create(
    model=modelo,
    messages=mensajes,
)

resumen = respuesta.choices[0].message.content
print(resumen)
```

`messages` recibe una lista de diccionarios directamente. `system` establece las instrucciones, `user` contiene la petición y `assistant` representa una respuesta anterior.

`respuesta` es un objeto del SDK. `choices[0]` toma la primera respuesta y `message.content` obtiene su texto. [Chat Completions](https://developers.openai.com/api/reference/python/resources/chat/subresources/completions/methods/create).

## Funciones y Markdown

Una función permite reutilizar la llamada cambiando el texto y la instrucción. Este ejemplo utiliza `cliente` y `modelo` definidos arriba:

```python
def generar(texto, instruccion):
    respuesta = cliente.chat.completions.create(
        model=modelo,
        messages=[
            {"role": "system", "content": instruccion},
            {"role": "user", "content": texto},
        ],
    )
    return respuesta.choices[0].message.content
```

En Jupyter, `Markdown()` interpreta el formato y `display()` lo muestra:

```python
from IPython.display import Markdown, display

resultado = generar(
    "La biblioteca abre de lunes a viernes, de 9 a 18.",
    "Resume en Markdown sin inventar datos.",
)
display(Markdown(resultado))
```

`return` entrega el texto al código que llamó a la función. Sin él, `resultado` sería `None` aunque se mostrara algo con `display()`. Markdown sigue siendo texto: no necesita conversión con `json.loads()`.

## Respuestas en JSON

El selector de enlaces devuelve datos que Python puede recorrer. La estructura se indica con un ejemplo dentro del prompt; `response_format` activa el modo JSON.

```python
import json

def seleccionar_enlaces(urls):
    respuesta = cliente.chat.completions.create(
        model=modelo,
        messages=[
            {
                "role": "system",
                "content": (
                    "Selecciona enlaces sobre la empresa o empleo. "
                    "Usa solo las URL recibidas. Excluye privacidad. "
                    'Devuelve JSON así: {"links": [{"type": "about", "url": "..."}]}'
                ),
            },
            {"role": "user", "content": "\n".join(urls)},
        ],
        response_format={"type": "json_object"},
    )
    texto = respuesta.choices[0].message.content
    return json.loads(texto)
```

```python
urls = [
    "https://empresa.example/about",
    "https://empresa.example/jobs",
    "https://empresa.example/privacy",
]

seleccion = seleccionar_enlaces(urls)

for enlace in seleccion["links"]:
    print(enlace["url"])
```

`message.content` sigue siendo un `str`. `json.loads()` lo convierte en `dict`. El modo JSON no garantiza que existan las claves esperadas ni que sus valores sean correctos. [Modo JSON](https://developers.openai.com/api/docs/guides/structured-outputs#json-mode).

## Historial

Cada llamada recibe su propio contexto. Para continuar una conversación se añaden la respuesta del asistente y la siguiente petición a la lista original.

Con `mensajes` y `resumen` de la llamada anterior:

```python
mensajes.append({"role": "assistant", "content": resumen})
mensajes.append({"role": "user", "content": "Hazlo todavía más corto."})

respuesta = cliente.chat.completions.create(
    model=modelo,
    messages=mensajes,
)

texto = respuesta.choices[0].message.content
mensajes.append({"role": "assistant", "content": texto})
print(texto)
```

`append()` añade un elemento al final. La nueva llamada recibe instrucciones, petición inicial, respuesta y seguimiento. Reutilizar el cliente sin reenviar esos mensajes no conserva la conversación.

## Streaming

Con `stream=True` se recibe un iterable de fragmentos. El texto nuevo está en `delta.content`; `or ""` evita concatenar `None` cuando un fragmento no contiene texto.

```python
from IPython.display import Markdown, display, update_display

stream = cliente.chat.completions.create(
    model=modelo,
    messages=[{"role": "user", "content": "Explica las listas de Python en 3 viñetas."}],
    stream=True,
)

texto = ""
salida = display(Markdown(""), display_id=True)

for fragmento in stream:
    if fragmento.choices:
        texto += fragmento.choices[0].delta.content or ""
        update_display(Markdown(texto), display_id=salida.display_id)
```

`texto` acumula la respuesta completa. `display_id=True` identifica una salida de Jupyter y `update_display()` actualiza esa misma salida. Si se crea un `display()` dentro del bucle, se generan salidas nuevas.

Dentro de una función, `return texto` debe ir después del bucle. [Streaming de Chat Completions](https://developers.openai.com/cookbook/examples/how_to_stream_completions).

## Scraping y generación de documentos

Las funciones de `week1/scraper.py` se importan desde un notebook de esa carpeta:

```python
from scraper import fetch_website_contents, fetch_website_links

url = "https://example.com"
texto_web = fetch_website_contents(url)
enlaces_web = fetch_website_links(url)

print(texto_web[:300])
```

`fetch_website_contents()` devuelve título y texto como un `str`, limitado a 2.000 caracteres. `fetch_website_links()` devuelve una lista de enlaces. El scraper limpia HTML con BeautifulSoup; no ejecuta JavaScript.

### Selección y redacción

El folleto se construye en dos llamadas: la primera elige fuentes; la segunda redacta con sus contenidos. Entre ambas, Python descarga las páginas.

El siguiente bloque utiliza `seleccionar_enlaces()` y `generar()` definidos antes:

```python
from urllib.parse import urljoin

urls = [urljoin(url, enlace) for enlace in enlaces_web]
urls = [enlace for enlace in urls if enlace.startswith(("https://", "http://"))]
seleccion = seleccionar_enlaces(urls)
textos = [texto_web]

for enlace in seleccion["links"]:
    if enlace["url"] in urls:
        textos.append(fetch_website_contents(enlace["url"]))

documento = "\n\n".join(textos)
folleto = generar(
    documento,
    "Redacta un folleto breve en Markdown usando solo estos datos.",
)
display(Markdown(folleto))
```

`urljoin()` convierte rutas como `/about` en direcciones completas. La comprobación `in urls` descarta enlaces que no estaban entre los extraídos. `join()` reúne los contenidos en un único texto para la segunda llamada.

## Peticiones HTTP

`requests` permite enviar directamente los mismos mensajes a la API. Aquí `modelo` y `mensajes` son los definidos en la llamada con el SDK:

```python
import os
import requests

respuesta_http = requests.post(
    "https://api.openai.com/v1/chat/completions",
    headers={"Authorization": f"Bearer {os.environ['OPENAI_API_KEY']}"},
    json={"model": modelo, "messages": mensajes},
    timeout=60,
)
respuesta_http.raise_for_status()

datos = respuesta_http.json()
texto = datos["choices"][0]["message"]["content"]
print(texto)
```

`json=` serializa el diccionario enviado. `raise_for_status()` detecta errores HTTP y `.json()` convierte el cuerpo de la respuesta a datos Python.

Con el SDK se accede mediante atributos: `respuesta.choices[0].message.content`. Con el diccionario de `requests` se utilizan claves: `datos["choices"][0]["message"]["content"]`.

## Ollama

Ollama ejecuta el modelo localmente. Con Ollama instalado, la descarga se hace en la terminal:

```bash
ollama pull llama3.2:1b
```

Si el servidor no está activo, `ollama serve` lo inicia. La conexión desde Python utiliza el mismo SDK:

```python
from openai import OpenAI

local = OpenAI(
    base_url="http://localhost:11434/v1",
    api_key="ollama",
)

respuesta = local.chat.completions.create(
    model="llama3.2:1b",
    messages=[{"role": "user", "content": "Explica qué hace json.loads()."}],
)
print(respuesta.choices[0].message.content)
```

`base_url` cambia el servidor de destino. El nombre del modelo debe coincidir con el descargado; Ollama ignora la clave de ejemplo. [Compatibilidad de Ollama](https://docs.ollama.com/api/openai-compatibility).

## Tokens

`tiktoken` convierte texto en identificadores de tokens y permite reconstruirlo:

```python
import tiktoken

codificador = tiktoken.encoding_for_model("gpt-4.1-mini")
texto = "Hola, me llamo Ana."

tokens = codificador.encode(texto)
cantidad = len(tokens)
recuperado = codificador.decode(tokens)

print(tokens)
print(cantidad)
print(recuperado)
```

`tokens` es una lista de enteros y `recuperado` contiene el texto original. Los tokens no equivalen a palabras ni a caracteres. Este cálculo cuenta solo `texto`; no incluye automáticamente el resto de mensajes de una petición. [Documentación de tiktoken](https://github.com/openai/tiktoken).
