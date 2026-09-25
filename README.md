# Simulador de Seguridad

Examen de práctica interactivo para la materia **Seguridad en Sistemas de Cómputo**. Es una aplicación web estática (HTML + CSS + JavaScript, sin frameworks ni pasos de compilación) que se abre directamente en el navegador.

## Temas que cubre

1. CIA: Confidencialidad, Integridad y Disponibilidad
2. Amenazas, vulnerabilidades y riesgos
3. La IA como factor de riesgo
4. Hackers: tipos y motivaciones
5. Leyes y marco legal
6. Ethical hacking
7. Esquemas de defensa

45 preguntas en total, repartidas entre los siete temas.

## Tipos de pregunta

- **Opción múltiple** — elegir una de varias opciones.
- **Verdadero / Falso**
- **Completar** — escribir la palabra que falta (no distingue mayúsculas ni acentos).
- **Relacionar** — unir cada término con su definición usando listas desplegables.
- **Conectar** — unir cada término con su definición tocando primero uno de la izquierda y luego uno de la derecha (con color por pareja); pensado para celular y computadora.
- **Diagrama** — completar una imagen (el triángulo de la CIA o las capas de defensa en profundidad) eligiendo la etiqueta correcta para cada espacio.
- **Pregunta abierta** — se responde en texto libre; al terminar se muestra una respuesta modelo y tú marcas si la sabías o no.

## Funciones

- Temporizador de 90 minutos, visible en todo momento.
- Retroalimentación inmediata: al responder cada pregunta, se bloquea y muestra si fue correcta, la respuesta correcta y una explicación breve.
- Mapa de preguntas (navegación libre, con color según el estado de cada una).
- Calificación final con porcentaje general y desglose por tema.
- **Reintentar solo las falladas**: crea una nueva ronda solo con las preguntas que no dominaste, las veces que quieras, hasta llegar a cero pendientes.
- Reiniciar el examen completo, con las preguntas y opciones en un orden distinto cada vez.
- Modo claro/oscuro automático (según la preferencia del sistema) y diseño adaptable a celular.

## Cómo ejecutarlo

No requiere instalación ni servidor. Basta con abrir el archivo `index.html` en un navegador:

1. Descarga o clona esta carpeta.
2. Haz doble clic en `index.html` (o ábrelo desde el navegador con `Ctrl+O`).

Si tu navegador bloquea algo al abrir el archivo directamente (poco común, ya que el proyecto no usa `fetch` ni módulos), también puedes servirlo con cualquier servidor estático simple, por ejemplo:

```bash
# Desde la carpeta del proyecto
python -m http.server 8080
# y abre http://localhost:8080 en el navegador
```

**Conexión a internet:** la tipografía (IBM Plex Mono / IBM Plex Sans) se carga desde Google Fonts vía CDN. Sin internet, el sitio funciona igual pero usa la fuente de reserva del sistema.

## Estructura del proyecto

```
examen-seguridad/
├── index.html          # Esqueleto HTML de las 3 pantallas (inicio, examen, resultados)
├── css/
│   └── estilos.css     # Toda la presentación visual (colores, tipografía, layout)
├── js/
│   ├── preguntas.js    # Datos: los temas (TOPICS) y las 45 preguntas (QUESTION_BANK)
│   └── app.js          # Lógica: temporizador, calificación, render de cada tipo, reintentos
├── .gitignore
└── README.md
```

La separación es intencional: **el contenido del examen (`preguntas.js`) es independiente de la lógica (`app.js`)**, así que puedes editar o agregar preguntas sin tocar el motor de la aplicación. `index.html` carga `preguntas.js` antes que `app.js`, porque este último depende de las variables `TOPICS` y `QUESTION_BANK` que el primero define.

## Cómo agregar o editar preguntas

Todo el contenido vive en `js/preguntas.js`, dentro del arreglo `QUESTION_BANK`. Cada pregunta es un objeto con al menos `id` (único), `topic` (debe coincidir con un `id` de `TOPICS`), `type` y `explain` (la explicación de una o dos líneas que se muestra al responder). El resto de los campos depende del `type`:

### Opción múltiple (`mc`)
```js
{id:'q46', topic:'cia', type:'mc',
  prompt:'¿Cuál de estos es un control de confidencialidad?',
  options:['Backups diarios','Cifrado de disco','Balanceo de carga','Firma digital'],
  answerIndex:1, // índice (desde 0) de la opción correcta dentro de "options"
  explain:'El cifrado protege que solo quien tiene la llave pueda leer la información.'}
```

### Verdadero / Falso (`vf`)
```js
{id:'q47', topic:'avr', type:'vf',
  prompt:'Un firewall mal configurado es un ejemplo de vulnerabilidad.',
  answer:true,
  explain:'Es una debilidad del sistema que un atacante podría aprovechar.'}
```

### Completar (`fill`)
```js
{id:'q48', topic:'defensa', type:'fill',
  prompt:'El ___ es el equipo que monitorea, detecta y responde a incidentes de seguridad.',
  answers:['soc'], // una o más respuestas válidas; no importan mayúsculas ni acentos
  explain:'SOC son las siglas de Centro de Operaciones de Seguridad.'}
```

### Relacionar (`match`) — listas desplegables
```js
{id:'q49', topic:'defensa', type:'match',
  prompt:'Relaciona cada sigla con su significado.',
  pairs:[
    {l:'SIEM', r:'Recopila y analiza registros y eventos de seguridad.'},
    {l:'SOAR', r:'Automatiza y coordina la respuesta a incidentes.'}
  ],
  explain:'Ambas son herramientas que apoyan al SOC.'}
```

### Conectar (`connect`) — tocar izquierda y luego derecha
Usa exactamente la misma forma que `match` (un arreglo `pairs` de `{l, r}`); solo cambia la interacción visual. Se recomienda entre 4 y 6 pares:
```js
{id:'q50', topic:'hackers', type:'connect',
  prompt:'Conecta cada certificación con su enfoque.',
  pairs:[
    {l:'CEH', r:'Metodología ofensiva formal reconocida por la industria.'},
    {l:'OSCP', r:'Examen práctico exigente de pentesting.'},
    {l:'CompTIA Security+', r:'Certificación de entrada a la ciberseguridad.'},
    {l:'CISSP', r:'Gestión y arquitectura de seguridad para perfiles senior.'}
  ],
  explain:'Cada certificación tiene un enfoque y nivel distintos.'}
```

### Diagrama (`diagram`) — completar una imagen
Hay dos variantes de `diagramKind`: `'triangle'` (3 vértices, usado para la tríada CIA) y `'layers'` (varias capas apiladas, usado para defensa en profundidad). Cada `slot` necesita una `key` única, y `pool` es la lista de etiquetas para elegir (puede incluir distractores):
```js
{id:'q51', topic:'defensa', type:'diagram', diagramKind:'layers',
  prompt:'Ordena los modelos de defensa del más anticipado al más tardío.',
  slots:[
    {key:'m1', label:'Antes del ataque', correct:'Proactivo'},
    {key:'m2', label:'Para evitarlo', correct:'Preventivo'},
    {key:'m3', label:'Mientras ocurre', correct:'Detectivo'},
    {key:'m4', label:'Después del incidente', correct:'Correctivo'}
  ],
  pool:['Proactivo','Preventivo','Detectivo','Correctivo','Reactivo'],
  explain:'Cada modelo actúa en un momento distinto frente a la amenaza.'}
```
*(Si agregas un `diagramKind` nuevo, también hay que dibujarlo en `app.js`, dentro de la sección `// ---- DIAGRAM ----` de `renderQuestion`.)*

### Pregunta abierta (`open`)
```js
{id:'q52', topic:'eh', type:'open',
  prompt:'¿Por qué es importante limpiar los rastros al final de una prueba de ethical hacking?',
  model:'Porque el objetivo es dejar el sistema como estaba antes de la prueba, sin abrir puertas que un atacante real pudiera aprovechar después.'}
```
*(Las preguntas abiertas no llevan `explain`: la propia respuesta modelo cumple esa función.)*

### Reglas generales
- El `id` debe ser único en todo `QUESTION_BANK`.
- El `topic` debe existir en el arreglo `TOPICS` (al inicio del mismo archivo); si agregas un tema nuevo, dale también un `color` (variable CSS ya definida en `estilos.css`, o una nueva).
- No hace falta tocar `app.js` para agregar, quitar o editar preguntas de los tipos existentes: el motor las lee dinámicamente desde `QUESTION_BANK`.

## Notas técnicas

- Sin dependencias externas de JavaScript ni CSS: solo se usa la tipografía de Google Fonts por CDN (ver "Cómo ejecutarlo" arriba). No hay `npm`, `build` ni transpiladores.
- El progreso del examen vive únicamente en memoria (variable `state` de `app.js`): al recargar la página se pierde el intento en curso, tal como en la versión original.
