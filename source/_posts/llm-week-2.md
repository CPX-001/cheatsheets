---
title: 'LLM Engineering · Week 2'
date: '2026-09-23'
updated: '2026-09-23'
layout: 'learning'
language: 'es'
disableNunjucks: true
icon: 'ai'
series_title: 'LLM Engineering'
categories: ['AI']
intro: 'Convertir llamadas a modelos en una aplicación: proveedores, interfaces, conversación, herramientas, datos y respuestas con imagen y voz.'
heading: 'Week 2 · Aplicaciones'
learning_classes: 'learning-page learning-llm learning-page-cards'
background: 'bg-gradient-to-r from-violet-700 to-purple-900 !text-white'
---

## 1. De generar texto a atender una petición

En la [Week 1](/llm-week-1.html), Python reunía información y el modelo la transformaba. Esta semana añade una interfaz, conserva conversaciones y permite consultar datos mediante herramientas. Todo converge en un asistente de vuelos:

```text
Usuario pregunta → interfaz entrega mensaje e historial → modelo interpreta
    → Python consulta el precio si hace falta → modelo redacta
    → interfaz presenta texto y, opcionalmente, imagen y voz
```

El modelo interpreta lenguaje y propone qué hacer. **La aplicación controla la información disponible, ejecuta las operaciones y decide cómo presentar el resultado.** Gradio, el historial y las herramientas resuelven problemas distintos dentro de ese recorrido.

## 2. Varias formas de llegar al mismo modelo

La colección de llamadas a GPT, Claude, Gemini, DeepSeek y otros modelos no exige memorizar una receta por marca. Demuestra que se puede separar **la lógica de la aplicación de la conexión con el proveedor**.

| Vía                         | Qué cambia y para qué sirve                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| SDK nativo                  | Usa los objetos y métodos del proveedor. Permite trabajar con sus funciones específicas.                                 |
| SDK OpenAI y API compatible | Mantiene `messages` y `chat.completions.create`; cambia dirección, clave y modelo. Facilita reutilizar el código básico. |
| OpenRouter                  | Es un servicio intermediario: recibe la petición y la dirige a modelos de distintos proveedores.                         |
| LiteLLM                     | Ofrece una interfaz común que adapta llamadas a proveedores; en el notebook se usa como librería.                        |
| LangChain                   | Añade abstracciones para construir aplicaciones y flujos. `invoke()` es su forma de solicitar una respuesta.             |

Un router no equivale a un SDK: el primero recibe peticiones en su servicio; el segundo es código que se ejecuta en el proceso de la aplicación. Tampoco hace falta introducir un framework para encadenar dos funciones Python.

### SDK nativo frente a compatibilidad

Con el SDK nativo de Google, el núcleo de una llamada de texto es `cliente.models.generate_content(model=..., contents=pregunta)` y se lee `respuesta.text`. Con el de Anthropic es `cliente.messages.create(...)` y el texto puede venir en bloques de `respuesta.content`. Sus parámetros y respuestas no tienen por qué coincidir.

Con una API compatible, la forma común se conserva. Este ejemplo configura Claude; requiere `ANTHROPIC_API_KEY` cargada en el entorno:

```python
import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
claude = OpenAI(
    base_url="https://api.anthropic.com/v1/",
    api_key=os.environ["ANTHROPIC_API_KEY"],
)
```

Después se llama a `claude.chat.completions.create(...)` con un modelo de Claude. **La elección depende de lo que necesite la aplicación:** una interfaz compartida simplifica cambiar de proveedor; el SDK nativo resulta útil cuando se necesitan funciones que la compatibilidad no representa. La [documentación de Claude](https://platform.claude.com/docs/en/cli-sdks-libraries/libraries/openai-sdk) explica las diferencias y limitaciones de esa capa.

En todos los casos conviene mantener explícitos el cliente y el modelo. Cambiar solo el identificador no transforma un cliente conectado a OpenAI en un cliente conectado a Google. Y usar el mismo formato no garantiza que todos admitan las mismas herramientas o parámetros.

## 3. Qué enseñan las comparaciones entre modelos

Los chistes, acertijos, dilemas y dibujos SVG sirven para observar diferencias de estilo, interpretación, seguimiento de instrucciones y tiempo de respuesta. **Una respuesta vistosa o acertar un acertijo no establece que un modelo sea mejor para toda la aplicación.** Para elegir, hay que probar tareas representativas con criterios iguales: corrección, formato, latencia y coste.

Además, un enunciado ambiguo puede medir supuestos distintos. En el problema de las monedas, conocer que «al menos una es cara» no es lo mismo que observar una moneda concreta y comprobar que salió cara. Antes de juzgar la respuesta, hay que fijar qué información recibió el modelo.

El contraste entre entrenamiento e inferencia tiene una consecuencia sencilla: un modelo aprende durante su entrenamiento; `reasoning_effort` regula el esfuerzo de razonamiento durante una petición en los modelos que lo admiten. Aumentarlo puede mejorar ciertas tareas a costa de tiempo y recursos, pero no reentrena el modelo ni garantiza acertar. Los valores admitidos dependen del modelo.

### Contexto y caché son cosas diferentes

El ejemplo de _Hamlet_ primero pregunta sin proporcionar el libro y después incorpora su texto. Añadir la fuente permite responder apoyándose en ella; no obliga al modelo a haberla memorizado correctamente. Repetir esa entrada extensa introduce **prompt caching**: el proveedor puede reutilizar procesamiento de una parte repetida de la entrada.

La caché de prompts no guarda una respuesta fija ni sustituye el historial. Se sigue enviando el contexto y se genera una respuesta nueva. En OpenAI, los aciertos de caché requieren prefijos coincidentes: interesa colocar contenido estable al principio y variable al final. Las condiciones y los descuentos dependen del proveedor y del modelo; el notebook demuestra el mecanismo, no una tarifa universal. Véase [prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching).

### Dos chatbots conversando

El diálogo entre un bot discutidor y otro conciliador demuestra cómo construir el historial **desde la perspectiva de cada participante**. Para A, sus respuestas son `assistant` y las de B son `user`; para B ocurre al revés. Python alterna las llamadas y conserva las intervenciones. No existe un canal secreto entre los modelos: cada uno recibe el contexto que el programa le envía.

## 4. Gradio conecta una interfaz con funciones Python

El ejemplo que convierte un texto a mayúsculas enseña todo el mecanismo inicial: **un componente entrega un valor a una función y otro muestra su resultado**. Sustituir esa función por una llamada al LLM transforma la misma interfaz en una aplicación de IA.

Gradio crea la interfaz web y arranca un servidor Python que atiende sus eventos. El navegador muestra controles; la función Python llama al proveedor desde el servidor. La clave de API pertenece a ese proceso, no al cuadro de texto del usuario.

Hay tres niveles que aparecen en la semana: `gr.Interface` conecta entradas y salidas de una función; `gr.ChatInterface` prepara una conversación; `gr.Blocks` permite componer componentes y enlazar sus eventos. Los ejemplos del curso utilizan **Gradio 5**, acotado a `<6` en sus dependencias; las firmas siguientes siguen esa versión.

Este patrón retoma el cliente de la semana anterior y muestra una respuesta progresiva. Se ejecuta en una celda del entorno del curso con `OPENAI_API_KEY` disponible:

```python
import gradio as gr
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
cliente = OpenAI()
modelo = "gpt-4.1-mini"

def responder(pregunta):
    stream = cliente.chat.completions.create(
        model=modelo,
        messages=[{"role": "user", "content": pregunta}],
        stream=True,
    )
    texto = ""
    for fragmento in stream:
        if fragmento.choices:
            texto += fragmento.choices[0].delta.content or ""
            yield texto

gr.Interface(fn=responder, inputs="text", outputs=gr.Markdown()).launch()
```

`fn` recibe la función, sin ejecutarla en ese momento. `return` entregaría un resultado final; `yield` convierte la función en un generador que entrega estados sucesivos. Se envía el **texto acumulado**, porque Gradio actualiza la salida con cada valor recibido. `yield from otro_generador` permite reenviar ese flujo, como hace el selector entre proveedores.

Cambiar colores, abrir otra pestaña o añadir controles no altera esa relación. `inbrowser=True` abre el navegador; `share=True` crea un acceso público temporal mientras el proceso está activo; `auth` añade autenticación básica. El generador de folletos reutiliza exactamente este patrón, añadiendo nombre, URL y proveedor como entradas.

## 5. Un chat necesita reconstruir la conversación

En Gradio 5, `ChatInterface` llama a una función `chat(message, history)`: `message` es el mensaje nuevo y `history` contiene los turnos anteriores. La función prepara lo que verá el modelo:

```python
instrucciones = "Eres un asistente de vuelos. No inventes precios."

def chat(message, history):
    historial = [{"role": h["role"], "content": h["content"]} for h in history]
    mensajes = [
        {"role": "system", "content": instrucciones},
        *historial,
        {"role": "user", "content": message},
    ]
    respuesta = cliente.chat.completions.create(model=modelo, messages=mensajes)
    return respuesta.choices[0].message.content

gr.ChatInterface(fn=chat, type="messages").launch()
```

El ejemplo reutiliza `cliente`, `modelo` y `gr` de la sección anterior. Reconstruye los mensajes con los campos que necesita la API y añade la pregunta actual **una sola vez**. Gradio incorpora el resultado a la conversación visible. Esa comodidad no implica guardar una memoria duradera entre sesiones.

La tienda de ropa del notebook muestra cómo ajustar el comportamiento con instrucciones y ejemplos: recomendar productos en oferta, tratar una excepción o incorporar información relevante según la pregunta. El caso de detectar la palabra `belt` con Python es una demostración mínima de selección de contexto; depender de una palabra exacta falla ante sinónimos, traducciones o referencias a turnos anteriores.

La consecuencia para el asistente de vuelos es clara: escribir «no inventes precios» define el comportamiento deseado, pero **no proporciona los precios**. Hace falta conectarlo con una fuente que pueda consultarlos.

## 6. Una herramienta permite pedir una operación

Una herramienta reúne tres piezas: una función Python, una descripción que se envía al modelo y código que atiende sus solicitudes. Por ejemplo, `get_ticket_price(destination_city)` puede buscar una ciudad en un diccionario y devolver su precio, o indicar que no está disponible.

La descripción enviada en `tools` identifica la función y sus argumentos. Esta es la estructura de Chat Completions para esa consulta:

```python
tools = [{
    "type": "function",
    "function": {
        "name": "get_ticket_price",
        "description": "Consulta el precio de ida y vuelta a una ciudad.",
        "parameters": {
            "type": "object",
            "properties": {"destination_city": {"type": "string"}},
            "required": ["destination_city"],
            "additionalProperties": False,
        },
    },
}]
```

`description` ayuda al modelo a decidir cuándo utilizarla; `parameters` describe los argumentos, no el resultado. Registrar este diccionario **no envía el código de la función ni la ejecuta**. Se pasa `tools=tools` junto con `model` y `messages` en la petición.

Ante «¿cuánto cuesta ir a París?», el modelo puede devolver una solicitud en `message.tool_calls`, con el nombre de la función, argumentos JSON como `{"destination_city": "Paris"}` y un identificador. Entonces el programa completa el recorrido:

1. Añade al historial el mensaje del asistente que contiene la solicitud.
2. Convierte los argumentos con `json.loads()`, comprueba el nombre y los valores, y ejecuta la función permitida.
3. Añade un mensaje `{"role": "tool", "tool_call_id": llamada.id, "content": resultado}`. `resultado` debe ser texto; si es un diccionario, se serializa con `json.dumps()`.
4. Vuelve a llamar al modelo con ese historial para que pueda contestar usando el precio obtenido.

El `tool_call_id` enlaza el resultado con la solicitud concreta. Omitir la solicitud original o responder con otro identificador rompe la secuencia. La [guía de function calling](https://developers.openai.com/api/docs/guides/function-calling) describe este intercambio.

### Varias herramientas y varias rondas

Consultar París y Tokio puede producir dos solicitudes en una respuesta: hay que recorrer **todas**, ejecutar cada una y añadir sus resultados. También puede hacer falta otra ronda tras ver esos datos. Por eso el notebook evoluciona desde un `if` a un bucle que continúa mientras haya `tool_calls`, volviendo a ofrecer `tools` en cada petición.

En una aplicación conviene limitar las rondas y tratar errores de argumentos o de consulta. El modelo propone la operación; Python decide qué nombres acepta y qué funciones ejecuta. No se ejecuta texto arbitrario generado por el modelo.

## 7. Cambiar la fuente de datos sin rehacer el asistente

El diccionario de precios permite entender la herramienta, pero sus datos viven en el proceso. El paso a SQLite introduce un archivo `prices.db` con una tabla persistente. **El contrato del asistente se mantiene:** pide un precio por ciudad y recibe un resultado; lo que cambia es el interior de la función Python.

La lectura usa una consulta como `SELECT price FROM prices WHERE city = ?`, pasando `(ciudad.lower(),)` como parámetros. `?` separa los valores del SQL; `fetchone()` devuelve una fila o `None`. La función transforma ese resultado en información que el modelo pueda utilizar, incluyendo la ausencia de datos.

La función de escritura del notebook usa `INSERT ... ON CONFLICT ... DO UPDATE` para crear o actualizar un precio. Definir esa función no la convierte automáticamente en una herramienta accesible al modelo: habría que describirla y conectarla con el código que atiende solicitudes. Consultar y modificar son permisos distintos.

El día 5 reutiliza `prices.db`, creado y poblado el día anterior. Si se ejecuta de forma aislada, esa preparación debe existir en la carpeta de trabajo. El mensaje «no existe la tabla» apunta a la base de datos, no al LLM.

## 8. Imagen y voz son salidas adicionales

El proyecto final combina una respuesta de texto, una imagen del destino y audio. Son llamadas con tareas distintas: el modelo de conversación contesta, el de imágenes recibe una descripción visual y el de texto a voz recibe la respuesta ya redactada. Añadir voz no significa que el sistema entienda audio de entrada.

En `artist(city)`, la API de imágenes devuelve datos codificados en base64. `base64.b64decode()` recupera los bytes, `BytesIO` los presenta como un archivo en memoria y `Image.open()` crea el objeto de imagen que Gradio puede mostrar. Son conversiones de representación; no generan otra imagen.

En `talker(message)`, `audio.speech.create()` sintetiza el texto y se devuelven los bytes de audio. La ciudad se obtiene de las consultas realizadas; el texto hablado sale de la respuesta final. Así las salidas comparten el mismo contexto. Cada llamada añade su propio tiempo y consumo; si falla una salida opcional, interesa conservar la respuesta de texto ya obtenida.

### Blocks coordina el recorrido en pantalla

La interfaz final usa `gr.Blocks` porque necesita actualizar chat, imagen y audio. El evento de enviar texto se conecta a una función que limpia la entrada y añade el mensaje del usuario; `.then(...)` ejecuta después la función que genera la respuesta.

Aquí cambia el contrato respecto a `ChatInterface`: **la función final recibe un historial que ya incluye el mensaje nuevo**. Añadirlo otra vez lo duplicaría. Su retorno contiene tres valores en el mismo orden que `outputs`: historial actualizado, audio e imagen. Esa correspondencia entre entradas, retorno y componentes es lo que hay que entender del montaje visual.

## 9. Qué se puede reconstruir con estas piezas

El asistente ya se entiende como un recorrido completo: la interfaz recoge una petición, Python reconstruye el contexto, el modelo responde o solicita datos, Python ejecuta las consultas y la interfaz muestra el resultado. Cambiar vuelos por soporte técnico modifica las instrucciones, las fuentes y las herramientas; el mecanismo se conserva.

Las pruebas visuales de la semana sirven para comprobar cada conexión por separado. Una interfaz que imprime el historial ayuda a entender qué recibe la función. Una consulta directa al precio comprueba la base de datos. Una llamada sin interfaz comprueba el acceso al modelo. **Aislar la pieza que falla evita depurar todo el asistente a la vez.**

Esta síntesis parte de `week2/day1.ipynb` a `day5.ipynb`, del ejemplo comparativo `extra.ipynb` y del ejercicio final. El punto de partida conceptual está en [Week 1 · Fundamentos](/llm-week-1.html).
