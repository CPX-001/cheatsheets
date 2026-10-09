---
title: 'LLM Engineering · Week 2'
date: '2026-09-23'
updated: '2026-10-09'
layout: 'learning'
language: 'es'
disableNunjucks: true
icon: 'ai'
series_title: 'LLM Engineering'
categories: ['AI']
intro: 'Clientes de modelos, Gradio, generadores, historial, herramientas, SQLite, imágenes y voz.'
heading: 'LLM Engineering · Week 2'
learning_classes: 'learning-page learning-llm learning-page-cards'
background: 'bg-gradient-to-r from-violet-700 to-purple-900 !text-white'
---

## Clientes y modelos

El cliente establece la conexión con el proveedor; `model` elige qué modelo atenderá la petición. Los ejemplos utilizan las claves cargadas desde el `.env` del proyecto.

### Elección del cliente

| Opción                                                                | Cuándo conviene                                                                           | Qué implica                                                                        |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| SDK de OpenAI (`openai`)                                              | Llamadas a OpenAI o a una API compatible; aplicaciones sencillas como las de esta semana. | La aplicación organiza directamente los mensajes, el streaming y las herramientas. |
| SDK nativos (`anthropic`, `google-genai`)                             | Necesitas funciones específicas de Claude o Gemini.                                       | Cada proveedor tiene sus propios métodos, parámetros y respuestas.                 |
| [LiteLLM](https://docs.litellm.ai/docs/)                              | Alternas varios proveedores y quieres mantener una misma interfaz en Python.              | Adapta llamadas y respuestas; utiliza las claves de cada proveedor.                |
| [OpenRouter](https://openrouter.ai/docs/quickstart)                   | Quieres acceder a modelos de varias empresas mediante una sola API y cuenta.              | Es un servicio intermediario con su propia clave, no una librería cliente.         |
| [LangChain](https://docs.langchain.com/oss/python/langchain/overview) | Necesitas combinar modelos, herramientas e integraciones en una aplicación más amplia.    | Añade componentes y abstracciones para organizar el flujo.                         |

Para los ejemplos de esta semana, **el SDK de OpenAI es un punto de partida suficiente**: permite implementar el chat, el historial, el streaming y las herramientas con funciones Python. LiteLLM resulta útil cuando cambiar de proveedor se vuelve habitual; LangChain, cuando sus componentes resuelven una necesidad concreta de la aplicación.

La compatibilidad con el SDK de OpenAI cubre las funciones que admita el servidor de destino. Para opciones específicas de un proveedor, conviene su SDK nativo. La elección de librería cambia cómo se programa la aplicación, no la capacidad del modelo.

### OpenAI

```python
import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv(override=True)
cliente = OpenAI()
modelo = "gpt-4.1-mini"
mensajes = [{"role": "user", "content": "Explica qué es una API en una frase."}]

respuesta = cliente.chat.completions.create(
    model=modelo,
    messages=mensajes,
)
print(respuesta.choices[0].message.content)
```

`cliente` y `modelo` se reutilizan en los ejemplos de OpenAI que siguen.

### API compatible

El SDK de OpenAI también puede enviar peticiones a un servidor que acepte su formato. Se cambian `base_url`, la clave y el identificador del modelo:

```python
gemini = OpenAI(
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
    api_key=os.environ["GOOGLE_API_KEY"],
)

respuesta_gemini = gemini.chat.completions.create(
    model="gemini-3.1-flash-lite",
    messages=mensajes,
)
print(respuesta_gemini.choices[0].message.content)
```

Esta petición se envía a Google. Cambiar solo `model` sin cambiar el cliente no cambia de proveedor. [Compatibilidad de Gemini](https://ai.google.dev/gemini-api/docs/openai).

### SDK nativo

Con la librería de Google cambian la llamada y el acceso a la respuesta:

```python
from google import genai

google = genai.Client(api_key=os.environ["GOOGLE_API_KEY"])
respuesta_google = google.models.generate_content(
    model="gemini-3.1-flash-lite",
    contents="Explica qué es una API en una frase.",
)
print(respuesta_google.text)
```

Con Anthropic, `system` se pasa separado de `messages` y el texto llega en bloques:

```python
from anthropic import Anthropic

claude = Anthropic()
respuesta_claude = claude.messages.create(
    model="claude-sonnet-4-5-20250929",
    max_tokens=200,
    system="Responde en español.",
    messages=[{"role": "user", "content": "Explica qué es una API."}],
)
print(respuesta_claude.content[0].text)
```

`Anthropic()` lee `ANTHROPIC_API_KEY`. `max_tokens` limita la salida generada; no indica cuántos tokens se han consumido.

## OpenRouter, LiteLLM y LangChain

### OpenRouter

OpenRouter es un servicio que recibe la petición y la dirige a un modelo de otro proveedor. Utiliza su propia clave y nombres de modelo con un prefijo:

```python
router = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.environ["OPENROUTER_API_KEY"],
)

respuesta_router = router.chat.completions.create(
    model="openai/gpt-4.1-mini",
    messages=mensajes,
)
print(respuesta_router.choices[0].message.content)
```

### LiteLLM

LiteLLM adapta las llamadas a distintos proveedores mediante una función común. El prefijo de `model` identifica al proveedor:

```python
from litellm import completion

respuesta_litellm = completion(
    model="openai/gpt-4.1-mini",
    messages=mensajes,
)
print(respuesta_litellm.choices[0].message.content)
```

### LangChain

`ChatOpenAI` encapsula un modelo de chat. `invoke()` realiza la llamada y devuelve un mensaje cuyo texto está en `content`:

```python
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(model="gpt-4.1-mini")
respuesta_langchain = llm.invoke(mensajes)
print(respuesta_langchain.content)
```

LiteLLM y LangChain se ejecutan como librerías de Python. OpenRouter recibe las peticiones en su servicio.

## Consumo y caché

### Tokens utilizados

Con `respuesta` de la llamada inicial a OpenAI:

```python
print(respuesta.usage.prompt_tokens)
print(respuesta.usage.completion_tokens)
print(respuesta.usage.total_tokens)

detalle = respuesta.usage.prompt_tokens_details
tokens_cacheados = detalle.cached_tokens if detalle else 0
print(tokens_cacheados)
```

`prompt_tokens` cuenta la entrada y `completion_tokens` la salida. `cached_tokens` indica la parte de la entrada que se ha reutilizado desde caché; está incluida en `prompt_tokens`.

El campo `_hidden_params["response_cost"]` que aparece en el notebook pertenece a LiteLLM, no al SDK de OpenAI. El consumo en tokens y el importe facturado son datos distintos.

### Prefijo estable

Desde `week2/`, donde está `hamlet.txt`:

```python
from pathlib import Path

obra = Path("hamlet.txt").read_text(encoding="utf-8")
base = [
    {"role": "system", "content": "Responde usando únicamente el texto proporcionado."},
    {"role": "user", "content": obra},
]

pregunta_a = base + [{"role": "user", "content": "¿Quién es Laertes?"}]
pregunta_b = base + [{"role": "user", "content": "¿Qué relación tiene con Ofelia?"}]
```

Ambas peticiones empiezan con el mismo contenido y cambian solo la pregunta final. La lista completa se envía en cada llamada:

```python
respuesta_b = cliente.chat.completions.create(
    model=modelo,
    messages=pregunta_b,
)
```

La caché reutiliza procesamiento del prefijo, no una respuesta anterior. Repetir una petición no garantiza un acierto: también influyen la longitud, el modelo y la retención. [Prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching).

### Esfuerzo de razonamiento

```python
respuesta_razonada = cliente.chat.completions.create(
    model="gpt-5-nano",
    reasoning_effort="low",
    messages=[{"role": "user", "content": "Explica paso a paso cómo resolver 3x + 7 = 22."}],
)
```

`reasoning_effort` regula el esfuerzo durante esa petición; no entrena el modelo. Sus valores admitidos dependen del modelo.

## Gradio

`gr.Interface` conecta una función Python con componentes de entrada y salida. Los ejemplos usan **Gradio 5**, la versión declarada por el curso.

```python
import gradio as gr

def mayusculas(texto):
    return texto.upper()

vista = gr.Interface(
    fn=mayusculas,
    inputs=gr.Textbox(label="Texto"),
    outputs=gr.Textbox(label="Resultado"),
    flagging_mode="never",
)
vista.launch()
```

Al enviar `hola`, la salida muestra `HOLA`. `fn=mayusculas` entrega la función a Gradio; `fn=mayusculas()` intentaría ejecutarla al construir la interfaz.

Con varias entradas, el orden de `inputs` coincide con el de los argumentos. Con varias salidas, el orden de `outputs` coincide con los valores devueltos.

`launch(inbrowser=True)` abre el navegador. `launch(share=True)` crea un enlace público temporal mientras el proceso está activo. `vista.close()` detiene esa interfaz antes de lanzar otra.

## Generadores y streaming

### yield

`return` termina una función y devuelve un resultado. `yield` entrega un valor y permite continuar la ejecución cuando se pide el siguiente:

```python
def fragmentos():
    yield "Hola"
    yield "Hola, Ana"

print(list(fragmentos()))
```

```text
['Hola', 'Hola, Ana']
```

### Respuesta progresiva

Gradio actualiza el componente con cada valor del generador. Por eso se entrega el texto acumulado, no solo el último fragmento.

```python
def generar_stream(mensajes, cliente_actual=cliente, modelo_actual=modelo):
    stream = cliente_actual.chat.completions.create(
        model=modelo_actual,
        messages=mensajes,
        stream=True,
    )
    texto = ""
    for fragmento in stream:
        if fragmento.choices:
            texto += fragmento.choices[0].delta.content or ""
            yield texto

def responder(pregunta):
    mensajes = [
        {"role": "system", "content": "Responde en español y en Markdown."},
        {"role": "user", "content": pregunta},
    ]
    yield from generar_stream(mensajes)

vista = gr.Interface(fn=responder, inputs="text", outputs=gr.Markdown())
vista.launch()
```

`yield from` transmite los valores de otro generador. Hacer `return generar_stream(mensajes)` devolvería el objeto generador, en vez de entregar sus textos a Gradio.

## Selector de modelo

El selector entrega una etiqueta a la función. La aplicación la relaciona con un cliente y un modelo. Este ejemplo requiere el cliente `gemini` del apartado de API compatible.

```python
conexiones = {
    "GPT": (cliente, modelo),
    "Gemini": (gemini, "gemini-3.1-flash-lite"),
}

def responder_modelo(pregunta, proveedor):
    cliente_actual, modelo_actual = conexiones[proveedor]
    mensajes = [{"role": "user", "content": pregunta}]
    yield from generar_stream(mensajes, cliente_actual, modelo_actual)

vista = gr.Interface(
    fn=responder_modelo,
    inputs=[
        gr.Textbox(label="Pregunta"),
        gr.Dropdown(["GPT", "Gemini"], value="GPT", label="Modelo"),
    ],
    outputs=gr.Markdown(),
)
vista.launch()
```

La asignación `cliente_actual, modelo_actual = ...` desempaqueta la pareja guardada en el diccionario. `pregunta` recibe el texto y `proveedor` recibe la opción del desplegable.

## ChatInterface e historial

`gr.ChatInterface` llama a una función con dos argumentos: el mensaje nuevo y el historial anterior. En el chat de texto de Gradio 5, `type="messages"` utiliza diccionarios con `role` y `content`.

```python
sistema = "Responde en español, de forma breve y sin inventar datos."

def preparar_mensajes(mensaje, historial):
    anteriores = [
        {"role": entrada["role"], "content": entrada["content"]}
        for entrada in historial
    ]
    return [
        {"role": "system", "content": sistema},
        *anteriores,
        {"role": "user", "content": mensaje},
    ]

def chat(mensaje, historial):
    mensajes = preparar_mensajes(mensaje, historial)
    yield from generar_stream(mensajes)

vista_chat = gr.ChatInterface(fn=chat, type="messages")
vista_chat.launch()
```

`*anteriores` inserta cada elemento en la lista nueva. El mensaje actual se añade una sola vez; Gradio incorpora después la respuesta visible al historial. No hace falta añadirla manualmente dentro de `chat()`.

### Instrucciones según la petición

```python
def instrucciones(mensaje):
    actual = "Atiende a los clientes de la tienda."
    if "cinturón" in mensaje.lower():
        actual += " La tienda no vende cinturones."
    return actual
```

Al construir los mensajes, `{"role": "system", "content": instrucciones(mensaje)}` aplica esa regla solo a la petición actual. Una variable local evita modificar permanentemente las instrucciones de las siguientes llamadas.

### Conversación entre dos modelos

Cada modelo debe recibir sus propias respuestas como `assistant` y las del otro como `user`:

```python
respuestas_a = ["Hola"]
respuestas_b = ["¿Qué tal?"]
historial_a = []

for texto_a, texto_b in zip(respuestas_a, respuestas_b):
    historial_a.append({"role": "assistant", "content": texto_a})
    historial_a.append({"role": "user", "content": texto_b})
```

`zip()` recorre ambas listas por parejas y se detiene al terminar la más corta. Para el historial de B se invierten los roles; una intervención pendiente se añade después del bucle.

El formato de `history` cambia en Gradio 6; estos ejemplos mantienen el de los notebooks. [Formato del historial](https://www.gradio.app/guides/gradio-6-migration-guide).

## Herramientas

El modelo solicita una operación mediante `tool_calls`. Python ejecuta la función y devuelve el resultado al modelo para que redacte la respuesta.

### Función Python

```python
precios = {"london": 799, "paris": 899, "tokyo": 1420}

def precio_billete(ciudad):
    return {
        "ciudad": ciudad,
        "precio": precios.get(ciudad.strip().lower()),
        "moneda": "USD",
    }

print(precio_billete("Paris"))
```

```text
{'ciudad': 'Paris', 'precio': 899, 'moneda': 'USD'}
```

### Descripción de la herramienta

```python
herramientas = [{
    "type": "function",
    "function": {
        "name": "precio_billete",
        "description": "Consulta el precio de un billete. Usa el nombre de la ciudad en inglés.",
        "parameters": {
            "type": "object",
            "properties": {
                "ciudad": {"type": "string"},
            },
            "required": ["ciudad"],
            "additionalProperties": False,
        },
        "strict": True,
    },
}]
```

`name` identifica la operación; `description` indica cuándo usarla; `parameters` describe sus argumentos. Este diccionario no contiene la implementación: la función sigue ejecutándose en Python.

### Ejecutar solicitudes y devolver resultados

```python
import json

def consultar_vuelos(mensajes):
    ciudades = []

    while True:
        respuesta = cliente.chat.completions.create(
            model=modelo,
            messages=mensajes,
            tools=herramientas,
        )
        mensaje = respuesta.choices[0].message

        if not mensaje.tool_calls:
            return mensaje.content or "", ciudades

        mensajes.append(mensaje.model_dump(exclude_none=True))

        for llamada in mensaje.tool_calls:
            if llamada.function.name != "precio_billete":
                raise ValueError("Herramienta desconocida")

            argumentos = json.loads(llamada.function.arguments)
            ciudad = argumentos["ciudad"]
            resultado = precio_billete(ciudad)
            ciudades.append(ciudad)

            mensajes.append({
                "role": "tool",
                "tool_call_id": llamada.id,
                "content": json.dumps(resultado),
            })
```

`function.arguments` es texto JSON y se convierte con `json.loads()`. `model_dump()` convierte el mensaje del SDK en un diccionario y conserva sus `tool_calls`.

Primero se añade el mensaje del asistente que solicita las herramientas; después, un mensaje `tool` por solicitud. `tool_call_id` enlaza cada resultado con su llamada. El `for` atiende varias herramientas en un turno; el `while` permite otra ronda de consultas. [Function calling](https://developers.openai.com/api/docs/guides/function-calling).

### Chat con herramientas

```python
sistema = (
    "Eres un asistente de vuelos. Consulta los precios con la herramienta. "
    "Si el precio es null, indica que no hay datos. Responde en español."
)

def chat_vuelos(mensaje, historial):
    mensajes = preparar_mensajes(mensaje, historial)
    texto, ciudades = consultar_vuelos(mensajes)
    return texto

vista_vuelos = gr.ChatInterface(fn=chat_vuelos, type="messages")
vista_vuelos.launch()
```

`consultar_vuelos()` devuelve dos valores: la respuesta y las ciudades consultadas. El chat utiliza el texto; las ciudades permiten generar después una imagen del destino.

## SQLite

La herramienta puede consultar una base de datos en lugar de un diccionario. `prices.db` se crea en la carpeta desde la que se ejecuta Python.

### Crear y cargar datos

```python
import sqlite3

DB = "prices.db"
conexion = sqlite3.connect(DB)

with conexion:
    conexion.execute(
        "CREATE TABLE IF NOT EXISTS prices "
        "(city TEXT PRIMARY KEY, price REAL)"
    )
    conexion.executemany(
        "INSERT INTO prices (city, price) VALUES (?, ?) "
        "ON CONFLICT(city) DO UPDATE SET price = excluded.price",
        [("london", 799), ("paris", 899), ("tokyo", 1420)],
    )

conexion.close()
```

`executemany()` aplica la sentencia a cada pareja. `ON CONFLICT` actualiza el precio si la ciudad ya existe. `with conexion` confirma la transacción al terminar sin errores; `close()` cierra la conexión.

### Sustituir la consulta de precios

```python
from contextlib import closing

def precio_billete(ciudad):
    with closing(sqlite3.connect(DB)) as conexion:
        fila = conexion.execute(
            "SELECT price FROM prices WHERE city = ?",
            (ciudad.strip().lower(),),
        ).fetchone()

    return {
        "ciudad": ciudad,
        "precio": fila[0] if fila else None,
        "moneda": "USD",
    }

print(precio_billete("Paris"))
```

`?` recibe el valor por separado, sin interpolarlo en el SQL. La coma de `(ciudad.strip().lower(),)` crea una tupla de un elemento. `fetchone()` devuelve una fila o `None`; `closing()` cierra la conexión al salir.

La descripción de la herramienta y el bucle de llamadas siguen utilizando `precio_billete()`: cambia la fuente de datos, no su interfaz.

## Imágenes

La API devuelve la imagen codificada en base64. La conversión es: texto base64 → bytes → archivo en memoria → imagen de Pillow.

```python
import base64
from io import BytesIO
from PIL import Image

def crear_imagen(ciudad):
    respuesta = cliente.images.generate(
        model="gpt-image-1-mini",
        prompt=f"Ilustración turística de {ciudad}, estilo pop art.",
        size="1024x1024",
        n=1,
    )
    datos = base64.b64decode(respuesta.data[0].b64_json)
    return Image.open(BytesIO(datos))
```

```python
from IPython.display import display

imagen = crear_imagen("Paris")
display(imagen)
```

`crear_imagen()` devuelve un objeto `Image` que pueden mostrar Jupyter y `gr.Image`. La generación es una llamada independiente del chat. [Generación de imágenes](https://developers.openai.com/api/docs/guides/image-generation).

## Voz

La síntesis recibe el texto final del asistente y devuelve audio:

```python
def crear_audio(texto):
    respuesta = cliente.audio.speech.create(
        model="gpt-4o-mini-tts",
        voice="onyx",
        input=texto,
        response_format="mp3",
    )
    return respuesta.content
```

```python
from pathlib import Path
from IPython.display import Audio, display

audio = crear_audio("El billete a París cuesta 899 dólares.")
display(Audio(audio))

Path("respuesta.mp3").write_bytes(audio)
```

`audio` contiene bytes MP3. `Audio()` los reproduce en Jupyter y `write_bytes()` los guarda en disco. Es una salida de voz, no reconocimiento de audio de entrada. [Texto a voz](https://developers.openai.com/api/docs/guides/text-to-speech).

## Blocks y eventos

`gr.Blocks` permite distribuir componentes y conectar sus eventos. En este ejemplo el envío actualiza primero el historial; después se generan texto, voz e imagen con las funciones anteriores.

```python
def agregar_mensaje(texto, historial):
    return "", historial + [{"role": "user", "content": texto}]

def responder_multimedia(historial):
    mensajes = [{"role": "system", "content": sistema}] + [
        {"role": entrada["role"], "content": entrada["content"]}
        for entrada in historial
    ]
    texto, ciudades = consultar_vuelos(mensajes)

    actualizado = historial + [{"role": "assistant", "content": texto}]
    audio = crear_audio(texto)
    imagen = crear_imagen(ciudades[0]) if ciudades else None
    return actualizado, audio, imagen
```

```python
with gr.Blocks() as interfaz:
    with gr.Row():
        conversacion = gr.Chatbot(type="messages")
        imagen = gr.Image(interactive=False)

    audio = gr.Audio(autoplay=True)
    entrada = gr.Textbox(label="Mensaje")

    entrada.submit(
        agregar_mensaje,
        inputs=[entrada, conversacion],
        outputs=[entrada, conversacion],
    ).then(
        responder_multimedia,
        inputs=[conversacion],
        outputs=[conversacion, audio, imagen],
    )

interfaz.launch()
```

`agregar_mensaje()` devuelve una cadena vacía para limpiar el cuadro y una lista nueva para actualizar el chat. `.then()` ejecuta la segunda función después de ese evento.

`responder_multimedia()` recibe un historial que ya contiene el mensaje nuevo; no debe añadirlo otra vez. Sus tres valores se asignan a `conversacion`, `audio` e `imagen` en el orden indicado por `outputs`.
