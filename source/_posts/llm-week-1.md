---
title: 'LLM Engineering · Week 1'
date: '2026-09-23'
updated: '2026-09-23'
layout: 'learning'
language: 'es'
disableNunjucks: true
icon: 'ai'
series_title: 'LLM Engineering'
categories: ['AI']
intro: 'De una llamada al modelo a un generador de documentos: qué recibe el LLM, cómo cambiar de proveedor y cómo conectar los pasos.'
heading: 'Week 1 · Fundamentos'
learning_classes: 'learning-page learning-llm learning-page-cards'
background: 'bg-gradient-to-r from-violet-700 to-purple-900 !text-white'
---

## 1. La aplicación hace más que llamar al modelo

El proyecto de la semana empieza resumiendo una web y termina creando un folleto con varias páginas. El cambio importante es **aprender a preparar la información y organizar el trabajo del modelo**. La llamada a la API ocupa pocas líneas; lo que determina su utilidad es qué entra, qué se pide y cómo se utiliza la salida.

```text
URL → Python descarga y limpia la página → texto + instrucciones
    → modelo genera una respuesta → Python la recoge y la muestra
```

El modelo no visita una web porque aparezca su URL en el mensaje. En este proyecto recibe el texto que Python ha descargado. Si ese texto contiene solo un menú, el modelo no tiene los artículos que hay detrás. Esta distinción explica muchos resultados pobres antes de cambiar de modelo o retocar el prompt.

Los saludos, resúmenes humorísticos y cambios de idioma muestran la misma idea: **un mismo modelo puede hacer tareas distintas cambiando las instrucciones y los datos**. No hace falta conservar una receta diferente para cada ejemplo.

## 2. Dónde se ejecuta cada cosa

El notebook ejecuta Python en un **kernel**, un proceso que conserva variables y funciones entre celdas. La librería `openai` se ejecuta allí, pero el modelo remoto se ejecuta en el servidor del proveedor. Instalar la librería no descarga GPT.

Para reproducir los ejemplos se parte del entorno Python del curso, con sus dependencias instaladas y ese entorno seleccionado como kernel. El archivo `.env` del proyecto contiene `OPENAI_API_KEY`; `load_dotenv()` carga sus valores en las variables de entorno del proceso y `OpenAI()` lee esa clave.

```python
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
cliente = OpenAI()
modelo = "gpt-4.1-mini"
```

Crear `cliente` prepara el acceso a la API; la generación empieza al llamar a `create()`. El modelo anterior es uno de los utilizados en el temario, no una afirmación sobre cuál sea el más reciente. Los nombres disponibles y las capacidades dependen del proveedor y de la cuenta.

En los notebooks aparece `load_dotenv(override=True)`: permite sustituir valores que el proceso ya tenía por los del archivo. Sin ese parámetro se conservan los existentes. No es necesario imprimir una clave para comprobar si está configurada.

El estado del kernel también explica por qué una función puede cambiar de comportamiento sin editarla: si utiliza una variable global como `system_prompt`, leerá su valor actual al ejecutarse. Ejecutar celdas fuera de orden puede mezclar versiones. Reiniciar el kernel y ejecutar de arriba abajo permite comprobar que el recorrido se sostiene por sí mismo.

## 3. Una petición es contexto más una tarea

La API **Chat Completions**, utilizada en estas semanas, recibe una lista de mensajes y genera la siguiente intervención del asistente. Cada mensaje tiene un `role`, que identifica su función, y un `content`, que contiene el texto.

`system` establece las instrucciones generales; `user` aporta la petición y sus datos; `assistant` representa una respuesta anterior. Para un resumen, las reglas pueden mantenerse estables mientras cambia el documento:

```python
texto_web = "La biblioteca abre de lunes a viernes, de 9 a 18 horas."
mensajes = [
    {"role": "system", "content": "Resume en español sin inventar datos."},
    {"role": "user", "content": f"Resume este texto en una frase:\n{texto_web}"},
]

respuesta = cliente.chat.completions.create(model=modelo, messages=mensajes)
resumen = respuesta.choices[0].message.content
```

`respuesta` es un objeto con el mensaje generado y otros datos de la petición. `choices[0]` toma la primera alternativa; `message.content` extrae su texto. Por eso el resultado que conviene devolver desde una función suele ser `resumen`, no el objeto completo.

Un prompt útil concreta **tarea, fuente, destinatario y formato**: «Con este texto, prepara un resumen breve para alguien que quiere visitar la biblioteca; conserva el horario». Pedir un tono distinto cambia la presentación, pero no aporta hechos nuevos. Dar un ejemplo de la salida deseada es _one-shot prompting_: enseña el patrón que se espera, sin entrenar ni modificar el modelo.

Para mostrar Markdown en Jupyter se usa `display(Markdown(resumen))`, importando ambos objetos de `IPython.display`. Esto solo cambia la presentación. `return resumen` entrega el valor a otra función; `display(...)` lo muestra. Si se omite `return`, una función normal devuelve `None` aunque se vea una respuesta en pantalla.

## 4. Cliente, API, proveedor y modelo son piezas distintas

El día 2 hace una petición HTTP con `requests` y después repite la operación con `OpenAI()`. La enseñanza es que **el SDK es una librería cliente que prepara peticiones HTTP y convierte las respuestas en objetos Python**. El modelo no está dentro del paquete.

En HTTP se envían la clave en una cabecera y `model` y `messages` en el cuerpo JSON a `/v1/chat/completions`. El SDK organiza esos mismos datos mediante `cliente.chat.completions.create(...)`; evita escribir a mano buena parte de esa comunicación.

Esto permite entender por qué se puede usar la librería de OpenAI para llamar a otros proveedores. Si un servidor acepta ese formato, basta con configurar su dirección y su clave, y elegir uno de **sus** modelos:

```python
import os

gemini = OpenAI(
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
    api_key=os.environ["GOOGLE_API_KEY"],
)
```

Aquí `GOOGLE_API_KEY` debe existir en el entorno o haberse cargado desde `.env`. La petición irá a Google. El nombre de la clase `OpenAI` no implica que intervenga un modelo de OpenAI ni que se facture allí. En la siguiente llamada se utilizarían `gemini` y un identificador de modelo de Gemini.

**Lo reutilizable es el formato de comunicación, no todas las capacidades.** Streaming, herramientas, JSON y parámetros de razonamiento deben estar soportados por ese servidor y modelo. La [compatibilidad de Gemini](https://ai.google.dev/gemini-api/docs/openai) documenta esa vía. La [Week 2](/llm-week-2.html) compara este enfoque con los SDK nativos y los intermediarios.

### La misma aplicación con un modelo local

Ollama actúa como servidor local y ejecuta un modelo descargado. Son dos requisitos distintos: tener el servidor disponible y tener el modelo que se solicita. Con Ollama instalado, en una terminal se descarga, por ejemplo, `ollama pull llama3.2:1b`; si el servidor no está activo, `ollama serve` lo inicia en otra terminal y permanece ejecutándose.

En Python, el cambio de conexión es:

```python
local = OpenAI(base_url="http://localhost:11434/v1", api_key="ollama")
respuesta = local.chat.completions.create(model="llama3.2:1b", messages=mensajes)
```

`localhost` es la máquina donde corre Python. La clave de ejemplo satisface al cliente y el servidor local de Ollama la ignora, como explica su [documentación de compatibilidad](https://docs.ollama.com/api/openai-compatibility). El identificador debe coincidir con el descargado: `llama3.2` y `llama3.2:1b` no son intercambiables por su nombre.

El resto del resumidor puede mantenerse: descargar, preparar mensajes y presentar texto. La inferencia local evita una tarifa de API y mantiene ese procesamiento en la máquina, a cambio de consumir sus recursos. La velocidad y la calidad dependerán del hardware, del modelo y de la tarea.

## 5. La calidad empieza antes del prompt

`week1/scraper.py` contiene dos utilidades: `fetch_website_contents(url)` obtiene título y texto; `fetch_website_links(url)` extrae enlaces. Se importan desde los notebooks de esa carpeta. Internamente, `requests` descarga HTML y BeautifulSoup permite recorrerlo y retirar elementos como scripts y estilos.

La primera utilidad limita el resultado a **2.000 caracteres**. Esto mantiene pequeño el ejemplo, pero puede eliminar precisamente la información necesaria. Tampoco ejecuta JavaScript: si la página construye su contenido en el navegador, el HTML descargado puede estar casi vacío. Un bloqueo HTTP o un texto incompleto se investiga en la descarga, no en el prompt.

Por eso, al practicar, conviene mirar primero el texto extraído. Después comprobar los mensajes construidos y finalmente la respuesta. Así se distingue entre «no tenía los datos» y «tenía los datos, pero no siguió bien la instrucción».

## 6. Tokens y memoria: el contexto tiene un tamaño

El modelo trabaja con **tokens**, unidades que pueden representar palabras, partes de palabras o signos. El ejemplo con `tiktoken` permite ver esa división: `encode(texto)` devuelve identificadores y `decode(tokens)` reconstruye texto. La conclusión práctica es que **caracteres, palabras y tokens no son equivalentes**; cortar a 5.000 caracteres no establece un presupuesto exacto de tokens.

El contexto de una petición incluye instrucciones, documentos e historial. Tiene un límite y su procesamiento influye en el coste y el tiempo de respuesta. El tokenizador debe corresponder al modelo; contar un texto aislado tampoco incluye automáticamente toda la estructura de mensajes.

El experimento de decir «me llamo Ana» y preguntar después el nombre muestra otra idea esencial: en estas llamadas a Chat Completions, **reutilizar el cliente no conserva la conversación**. La aplicación debe incluir el historial en la siguiente petición:

```python
# Continuación de los mensajes y la respuesta de la sección 3.
mensajes.append({"role": "assistant", "content": resumen})
mensajes.append({"role": "user", "content": "¿Y los sábados?"})
respuesta = cliente.chat.completions.create(model=modelo, messages=mensajes)
```

El modelo vuelve a ver el texto inicial, el resumen y la pregunta nueva. Podrá relacionarlos, pero no debería inventar un horario de sábado que no aparece en la fuente. Guardar el historial en Python permite reenviarlo; no lo incorpora al entrenamiento. Además, ese historial vuelve a formar parte de la entrada de cada turno. La documentación sobre [estado de conversación](https://developers.openai.com/api/docs/guides/conversation-state) distingue este manejo manual de otras APIs que gestionan estado.

## 7. Encadenar llamadas cuando cada una aporta algo

El folleto del día 5 resuelve un problema que una sola página no cubre: la información de una empresa está repartida. El recorrido es:

1. **Extraer enlaces con Python.** Todavía no se pide al modelo que redacte.
2. **Pedir al modelo que seleccione fuentes relevantes**, como empresa, productos o empleo.
3. **Descargar esas páginas con Python** y reunir sus textos.
4. **Pedir al modelo que redacte el folleto** a partir de la información reunida.

La primera llamada toma una decisión que cambia los datos disponibles para la segunda. Esa es la razón de dividir el trabajo. Pedir dos veces una explicación del mismo texto no aporta necesariamente una mejora; una revisión tiene sentido si recibe criterios concretos o evidencia adicional.

### JSON para continuar el programa; Markdown para leer

La selección de enlaces necesita una salida que Python pueda recorrer. Se pide un objeto JSON como `{"links": [{"type": "about", "url": "https://empresa.example/about"}]}`. En esa llamada, `response_format={"type": "json_object"}` activa el modo JSON y el prompt también debe pedir JSON.

El contenido sigue llegando como texto. `seleccion = json.loads(respuesta.choices[0].message.content)` lo convierte en un diccionario; entonces `seleccion["links"]` permite iterar por los enlaces. Para el folleto final se solicita Markdown, porque su destinatario es una persona.

**JSON válido no garantiza los campos esperados ni que las URL sean correctas.** Python debe comprobar la estructura y contrastar los enlaces con los extraídos. Resolver rutas relativas y eliminar duplicados son tareas deterministas que puede hacer el código. Los [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs) añaden conformidad con un esquema; son una técnica posterior, distinta del modo JSON usado aquí.

El notebook recorta el prompt del folleto a 5.000 caracteres. Sirve para contener el tamaño de la demostración, pero puede dejar fuera páginas enteras que se acaban de descargar. La deducción es **seleccionar y repartir mejor el contexto**, en vez de confiar en que juntar más texto siempre mejora el resultado.

## 8. Streaming: cambia la entrega, no la tarea

Con `stream=True`, la respuesta llega por fragmentos. En Chat Completions se leen en `delta.content`, en lugar de extraer un mensaje completo al final. Algunos fragmentos no contienen texto; `or ""` permite acumularlos sin concatenar `None`.

En un notebook, este patrón muestra el avance en una única salida. Reutiliza `cliente`, `modelo` y `mensajes` de las secciones anteriores:

```python
from IPython.display import Markdown, display, update_display

stream = cliente.chat.completions.create(
    model=modelo, messages=mensajes, stream=True
)
texto = ""
salida = display(Markdown(""), display_id=True)
for fragmento in stream:
    if fragmento.choices:
        texto += fragmento.choices[0].delta.content or ""
        update_display(Markdown(texto), display_id=salida.display_id)
```

`display_id` identifica la salida que se actualiza; `texto` conserva lo recibido. Crear un `display()` nuevo en cada vuelta produciría muchas salidas. El streaming permite empezar a leer antes de que termine la generación, pero no hace que el modelo razone mejor ni garantiza reducir el tiempo total. Véase [streaming de Chat Completions](https://developers.openai.com/api/docs/guides/streaming-responses).

Con estas piezas se puede reconstruir el proyecto: obtener datos, preparar mensajes, llamar al servidor adecuado, interpretar el formato de salida y utilizar el resultado. Si algo falla, revisar ese recorrido en orden suele ser más útil que cambiar todo el prompt.

Esta síntesis parte de `week1/day1.ipynb`, `day2.ipynb`, `day4.ipynb`, `day5.ipynb`, `scraper.py` y el ejercicio final del curso. La copia revisada no contiene un `day3.ipynb`. La continuación está en [Week 2 · Aplicaciones](/llm-week-2.html).
