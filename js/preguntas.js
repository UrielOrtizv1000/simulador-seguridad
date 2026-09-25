/*
  preguntas.js
  Contenido del examen: los 7 temas (TOPICS) y el banco de 45 preguntas (QUESTION_BANK).
  Este archivo NO tiene lógica de la aplicación: solo datos. Para agregar, quitar o editar
  preguntas, este es el único archivo que necesitas tocar (ver README.md para ejemplos
  de cada tipo). Debe cargarse en index.html ANTES de js/app.js, porque app.js usa estas
  dos variables globales.

  Forma de cada pregunta según su "type":
  - mc / vf   : { options:[...], answerIndex } o { answer: true/false }
  - fill      : { answers:[...] } (una o más respuestas válidas, sin acentos/mayúsculas)
  - match     : { pairs:[{l,r}, ...] } (relacionar con listas desplegables)
  - connect   : { pairs:[{l,r}, ...] } (relacionar tocando: izquierda y luego derecha)
  - diagram   : { diagramKind:'triangle'|'layers', slots:[{key,label,correct}], pool:[...] }
  - open      : { model } (respuesta modelo; el usuario se autoevalúa)
*/

var TOPICS = [
  {id:'cia', name:'CIA: Confidencialidad, Integridad y Disponibilidad', short:'CIA', color:'--t-cia'},
  {id:'avr', name:'Amenazas, vulnerabilidades y riesgos', short:'Amenazas y riesgos', color:'--t-avr'},
  {id:'ia', name:'La IA como factor de riesgo', short:'IA como riesgo', color:'--t-ia'},
  {id:'hackers', name:'Hackers: tipos y motivaciones', short:'Hackers', color:'--t-hackers'},
  {id:'leyes', name:'Leyes y marco legal', short:'Leyes', color:'--t-leyes'},
  {id:'eh', name:'Ethical hacking', short:'Ethical hacking', color:'--t-eh'},
  {id:'defensa', name:'Esquemas de defensa', short:'Esquemas de defensa', color:'--t-defensa'}
];

var QUESTION_BANK = [
  // ---------- CIA (6) ----------
  {id:'q1', topic:'cia', type:'diagram', diagramKind:'triangle',
    prompt:'Completa el triángulo de la tríada CIA: elige el pilar correcto para cada vértice.',
    slots:[
      {key:'top', pos:'top', label:'Vértice superior', correct:'Confidencialidad'},
      {key:'bl', pos:'bl', label:'Vértice inferior izquierdo', correct:'Integridad'},
      {key:'br', pos:'br', label:'Vértice inferior derecho', correct:'Disponibilidad'}
    ],
    pool:['Confidencialidad','Integridad','Disponibilidad','Autenticación','No repudio'],
    explain:'La tríada CIA es la base de la seguridad de la información: Confidencialidad arriba, Integridad y Disponibilidad en la base.'},
  {id:'q2', topic:'cia', type:'fill',
    prompt:'La ___ garantiza que los datos sean exactos, estén completos y no hayan sido alterados sin autorización.',
    answers:['integridad'],
    explain:'Integridad significa que la información es confiable: no ha sufrido modificaciones no autorizadas.'},
  {id:'q3', topic:'cia', type:'vf',
    prompt:'La disponibilidad busca que la información y los sistemas estén listos y accesibles cuando se necesitan.',
    answer:true,
    explain:'Correcto: la disponibilidad se refiere a que la información y los sistemas estén accesibles cuando se requieren.'},
  {id:'q4', topic:'cia', type:'mc',
    prompt:'Un ataque DDoS que satura los servidores de una tienda en línea y la deja fuera de servicio compromete principalmente:',
    options:['Confidencialidad','Integridad','Disponibilidad','Autenticación'], answerIndex:2,
    explain:'El DDoS impide el acceso al servicio: afecta la disponibilidad.'},
  {id:'q5', topic:'cia', type:'match',
    prompt:'Relaciona cada caso con el pilar de la CIA que se ve comprometido.',
    pairs:[
      {l:'Un atacante roba contraseñas de clientes mediante phishing.', r:'Confidencialidad'},
      {l:'Un archivo es modificado en tránsito y llega distinto de como se envió.', r:'Integridad'},
      {l:'Un ataque DDoS tumba el servidor y nadie puede usar el sistema.', r:'Disponibilidad'},
      {l:'Un compañero comparte su contraseña sin autorización para que otro revise un reporte urgente.', r:'Confidencialidad'}
    ],
    explain:'El robo de credenciales y compartir contraseñas violan la confidencialidad; alterar datos viola la integridad; tumbar el servicio viola la disponibilidad.'},
  {id:'q6', topic:'cia', type:'open',
    prompt:'Explica con tus propias palabras la diferencia entre confidencialidad, integridad y disponibilidad, dando un ejemplo distinto para cada una.',
    model:'Confidencialidad: que solo acceda a la información quien está autorizado (ej. cifrar un archivo con datos personales). Integridad: que los datos sean exactos y no hayan sido alterados sin permiso (ej. verificar con un hash que un archivo descargado no fue modificado). Disponibilidad: que los sistemas estén accesibles cuando se necesitan (ej. tener servidores redundantes para que el sitio no caiga).'},

  // ---------- Amenazas, vulnerabilidades y riesgos (6) ----------
  {id:'q7', topic:'avr', type:'fill',
    prompt:'Impacto + ___ = Riesgo.',
    answers:['probabilidad'],
    explain:'El riesgo se calcula combinando el impacto potencial de una amenaza con la probabilidad de que ocurra.'},
  {id:'q8', topic:'avr', type:'connect',
    prompt:'Conecta cada concepto con su definición correcta.',
    pairs:[
      {l:'Vulnerabilidad', r:'Debilidad o fallo en el diseño, implementación, operación o administración de un sistema que puede explotarse (ej. un servidor sin actualizar).'},
      {l:'Amenaza', r:'Algo que potencialmente puede causar daño aprovechando una vulnerabilidad (ej. un ransomware buscando servidores vulnerables).'},
      {l:'Ataque', r:'Acción intencionada y deliberada que busca violar la seguridad.'},
      {l:'Riesgo', r:'Probabilidad de que una amenaza explote una vulnerabilidad y produzca consecuencias negativas.'}
    ],
    explain:'Una amenaza aprovecha una vulnerabilidad mediante un ataque, y el riesgo mide la probabilidad de que eso ocurra con consecuencias negativas (Impacto + Probabilidad = Riesgo).'},
  {id:'q9', topic:'avr', type:'vf',
    prompt:'Si un sistema no tiene vulnerabilidades, el riesgo es muy bajo aunque existan amenazas que quieran atacarlo.',
    answer:true,
    explain:'Sin una vulnerabilidad que explotar, una amenaza no puede materializarse en un riesgo relevante.'},
  {id:'q10', topic:'avr', type:'mc',
    prompt:'¿Cuál de las siguientes opciones es un ejemplo de vulnerabilidad y no de amenaza?',
    options:['Un grupo de ciberdelincuentes','Un incendio en el centro de datos','Contraseñas predeterminadas que nunca se cambiaron','Un ransomware'], answerIndex:2,
    explain:'Las contraseñas predeterminadas sin modificar son una debilidad del sistema; los demás son agentes o eventos que pueden explotarla.'},
  {id:'q11', topic:'avr', type:'fill',
    prompt:'Las amenazas se dividen en involuntarias, difícilmente controlables (desastres naturales o errores humanos), y ___, que corresponden a ataques deliberados de agentes internos o externos.',
    answers:['voluntarias'],
    explain:'Las amenazas voluntarias son ataques deliberados, a diferencia de las involuntarias como errores humanos o desastres naturales.'},
  {id:'q12', topic:'avr', type:'open',
    prompt:'Explica, con un ejemplo, la diferencia entre vulnerabilidad, amenaza y riesgo.',
    model:'Vulnerabilidad es la debilidad del sistema (ej. un servidor con software sin actualizar). Amenaza es el agente o evento que podría aprovecharla (ej. un hacker o un malware). Riesgo es la probabilidad de que esa amenaza explote esa vulnerabilidad y el impacto que tendría (ej. la probabilidad de que el servidor sin actualizar sea comprometido y se pierda información).'},

  // ---------- IA como factor de riesgo (6) ----------
  {id:'q13', topic:'ia', type:'mc',
    prompt:'¿Qué caracteriza a los mensajes de phishing generados con inteligencia artificial, en comparación con los tradicionales?',
    options:['Están bien redactados, personalizados y adaptados al contexto, generados en segundos','Contienen errores ortográficos evidentes que los delatan','Solo pueden enviarse por mensaje de texto, nunca por correo','Tardan semanas en prepararse para cada víctima'], answerIndex:0,
    explain:'La IA permite producir mensajes bien redactados, personalizados y adaptados al contexto, de forma masiva y en segundos, lo que hace más creíble la ingeniería social.'},
  {id:'q14', topic:'ia', type:'fill',
    prompt:'El ataque donde se ocultan instrucciones maliciosas en contenido externo (una web, un correo, un PDF) que un agente de IA procesa como si fueran legítimas se llama inyección de ___ indirecta.',
    answers:['prompt','prompts'],
    explain:"Es la 'prompt injection' indirecta: el ataque no llega directo al chatbot, sino escondido en contenido que la IA lee y ejecuta."},
  {id:'q15', topic:'ia', type:'vf',
    prompt:'En el fraude de 25 millones de dólares sufrido por la firma Arup, los atacantes vulneraron técnicamente los sistemas informáticos de la empresa.',
    answer:false,
    explain:'No hubo intrusión técnica: el fraude fue ingeniería social potenciada por deepfakes (clonación de voz y video) en una videollamada, no un hackeo de sistemas.'},
  {id:'q16', topic:'ia', type:'connect',
    prompt:'Conecta cada uso de la IA con su descripción: ataque o defensa.',
    pairs:[
      {l:'Detección de anomalías', r:'Defensa: identifica comportamientos fuera de lo normal en tiempo real.'},
      {l:'Priorización de alertas', r:'Defensa: ayuda al equipo de seguridad a enfocarse en las amenazas más relevantes.'},
      {l:'Phishing', r:'Ataque: la IA redacta mensajes de engaño personalizados y convincentes.'},
      {l:'Deepfakes', r:'Ataque: la IA falsifica voz, imagen o video para engañar.'},
      {l:'Generar u ofuscar malware', r:'Ataque: la IA crea o disimula código malicioso.'},
      {l:'Automatizar el reconocimiento y la explotación', r:'Ataque: la IA acelera las etapas de un ataque, incluso con agentes que ejecutan campañas completas.'}
    ],
    explain:'La IA es un multiplicador de capacidades: las mismas técnicas sirven para atacar o para defender.'},
  {id:'q17', topic:'ia', type:'mc',
    prompt:'WormGPT y FraudGPT son ejemplos de:',
    options:['Antivirus potenciados con IA','Modelos de inteligencia artificial usados con fines maliciosos','Frameworks oficiales de ciberseguridad','Leyes internacionales sobre inteligencia artificial'], answerIndex:1,
    explain:'Son ejemplos de IA maliciosa, uno de los usos ofensivos de la inteligencia artificial.'},
  {id:'q18', topic:'ia', type:'open',
    prompt:"¿Por qué se dice que la inteligencia artificial es un 'arma de doble filo' en ciberseguridad? Da un ejemplo de la IA como escudo y otro de la IA como arma.",
    model:'Porque las mismas capacidades que sirven para defender (detectar anomalías, priorizar alertas, analizar malware, revisar código) también sirven para atacar (generar phishing y deepfakes, crear malware, hacer prompt injection). Ejemplo de escudo: detección de tráfico sospechoso en tiempo real. Ejemplo de arma: deepfakes de voz o video usados para fraude, como el caso de la firma Arup.'},

  // ---------- Hackers: tipos y motivaciones (6) ----------
  {id:'q19', topic:'hackers', type:'connect',
    prompt:'Conecta cada tipo de atacante con su motivación o característica principal.',
    pairs:[
      {l:'Ciberdelincuentes', r:'Buscan un beneficio económico.'},
      {l:'Activistas', r:'Atacan para promover causas sociales, políticas o ideológicas.'},
      {l:'Naciones-Estado', r:'Grupos respaldados por gobiernos que realizan espionaje o sabotaje.'},
      {l:'Amenazas internas (insiders)', r:'Empleados, exempleados o socios con acceso legítimo que lo usan de forma maliciosa o descuidada.'},
      {l:'Script kiddies', r:'Tienen poca experiencia y usan herramientas desarrolladas por otras personas.'},
      {l:'Grey Hat', r:'Encuentran vulnerabilidades incluso actuando fuera de la ley, pero las reportan en vez de explotarlas.'}
    ],
    explain:'Cada tipo de atacante tiene un perfil y una motivación distinta: dinero, espionaje, sabotaje o ideología.'},
  {id:'q20', topic:'hackers', type:'fill',
    prompt:'Un hacker de sombrero ___ entra sin permiso para buscar vulnerabilidades, pero las reporta en vez de causar daño.',
    answers:['gris'],
    explain:'El grey hat (sombrero gris) no tiene autorización previa, pero tampoco actúa con fines maliciosos.'},
  {id:'q21', topic:'hackers', type:'vf',
    prompt:'Los script kiddies suelen tener amplios conocimientos técnicos propios para desarrollar sus propias herramientas de ataque.',
    answer:false,
    explain:'Los script kiddies son atacantes aficionados sin experiencia que usan herramientas creadas por otros.'},
  {id:'q22', topic:'hackers', type:'mc',
    prompt:"A los 15 años, el estudiante canadiense Michael Calce ('Mafiaboy') tumbó sitios como CNN, Yahoo!, Amazon y eBay mediante:",
    options:['Phishing masivo','Ataques DDoS','Ransomware','Ingeniería social por videollamada'], answerIndex:1,
    explain:'Mafiaboy lanzó ataques de denegación de servicio distribuido (DDoS) que tumbaron a varios gigantes de internet en el año 2000.'},
  {id:'q23', topic:'hackers', type:'mc',
    prompt:'El grupo Lazarus, vinculado a Corea del Norte, es responsable del hackeo a Sony Pictures en 2014 y también del ataque global de:',
    options:['WannaCry','DarkSide','Guacamaya','FraudGPT'], answerIndex:0,
    explain:'Lazarus Group es señalado como responsable tanto del hackeo a Sony Pictures como del ransomware WannaCry de 2017.'},
  {id:'q24', topic:'hackers', type:'open',
    prompt:'Menciona tres motivaciones distintas por las que un atacante podría realizar un ciberataque, con un ejemplo de cada una.',
    model:'Ganancia económica (ej. ransomware que exige un rescate, como el caso de DarkSide contra Colonial Pipeline). Espionaje o sabotaje, muchas veces por venganza (ej. un grupo patrocinado por un Estado que roba información sensible, como Guacamaya contra la SEDENA). Activismo o hacktivismo (ej. un ataque DDoS contra el sitio de una empresa para protestar por sus prácticas). También son válidos el desafío personal o la notoriedad.'},

  // ---------- Leyes (8) ----------
  {id:'q25', topic:'leyes', type:'fill',
    prompt:'El artículo ___ de la Constitución establece que nadie puede ser molestado en su persona, familia, domicilio, papeles o posesiones, sino en virtud de mandamiento escrito de autoridad competente.',
    answers:['16'],
    explain:'El Artículo 16 constitucional protege la privacidad de las comunicaciones y la inviolabilidad del domicilio (incluido el domicilio digital); solo se puede intervenir con orden judicial.'},
  {id:'q26', topic:'leyes', type:'connect',
    prompt:'Conecta cada ley o instrumento legal con el tema principal que regula.',
    pairs:[
      {l:'Artículo 16 Constitucional', r:'Protege la privacidad de las comunicaciones y de los datos; solo se puede intervenir con mandamiento de autoridad competente.'},
      {l:'Ley Federal del Trabajo', r:'Protege la privacidad y los derechos digitales del trabajador frente al empleador.'},
      {l:'Ley Olimpia', r:'Sanciona la violencia digital, en especial la difusión de imágenes, videos o audios íntimos sin consentimiento.'},
      {l:'Código Penal Federal (Art. 211 bis)', r:'Sanciona el acceso ilícito a sistemas y equipos informáticos.'},
      {l:'Ley Federal del Derecho de Autor', r:'Protege los programas de cómputo (su código fuente) como obras literarias.'},
      {l:'Convenio de Budapest', r:'Primer tratado internacional vinculante sobre la delincuencia; busca armonizar legislaciones y facilitar la cooperación internacional.'}
    ],
    explain:'Cada instrumento legal cubre un ángulo distinto: privacidad constitucional, derechos laborales, violencia digital, delitos informáticos, propiedad intelectual y cooperación internacional.'},
  {id:'q27', topic:'leyes', type:'vf',
    prompt:'El Convenio de Budapest busca armonizar las legislaciones nacionales y facilitar la cooperación internacional para investigar y sancionar ciberdelitos.',
    answer:true,
    explain:'Es el primer tratado internacional vinculante sobre la delincuencia informática, e incluye delitos como el acceso ilícito, la interceptación, la modificación de datos, el DoS/DDoS, el malware, el fraude y las violaciones a la propiedad intelectual.'},
  {id:'q28', topic:'leyes', type:'mc',
    prompt:'La Ley Olimpia tipifica y sanciona principalmente:',
    options:['La piratería de software','La difusión de imágenes, videos o audios íntimos sin consentimiento','La evasión de impuestos digitales','El envío de correo no deseado (spam)'], answerIndex:1,
    explain:'La Ley Olimpia tipifica como delito la violencia digital, en especial la difusión no consentida de contenido íntimo.'},
  {id:'q29', topic:'leyes', type:'fill',
    prompt:'Según la Ley Federal del Trabajo, el empleador no puede revisar los dispositivos o cuentas personales del trabajador sin su ___.',
    answers:['consentimiento','permiso'],
    explain:'El trabajador tiene derecho a la privacidad, a ser informado sobre el monitoreo, a la protección de sus datos y a dar su consentimiento para el acceso a dispositivos personales.'},
  {id:'q30', topic:'leyes', type:'vf',
    prompt:'Según la Ley Federal del Trabajo, el empleador puede monitorear los equipos de trabajo sin informar nunca al trabajador.',
    answer:false,
    explain:'El trabajador tiene derecho a ser informado sobre el monitoreo; el empleador debe establecer políticas claras de uso tecnológico.'},
  {id:'q31', topic:'leyes', type:'fill',
    prompt:'Según la Ley Federal del Derecho de Autor, el código fuente de un programa de cómputo se protege legalmente como una obra ___.',
    answers:['literaria'],
    explain:'Se protege la expresión de un programa (código fuente/objeto), no simplemente la idea. Las bases de datos originales también pueden protegerse como compilaciones.'},
  {id:'q32', topic:'leyes', type:'fill',
    prompt:'El Art. 181-A del Código Penal sanciona la suplantación de la ___.',
    answers:['identidad'],
    explain:'El Código Penal también sanciona, en artículos relacionados, el acceso informático indebido (Art. 181) y la violación a la intimidad personal (Art. 181-B).'},

  // ---------- Ethical hacking (7) ----------
  {id:'q33', topic:'eh', type:'connect',
    prompt:'Conecta cada etapa del ethical hacking con lo que se hace en ella.',
    pairs:[
      {l:'1. Reconocimiento', r:'Recopilación de información sobre el objetivo.'},
      {l:'2. Escaneo', r:'Identificar puertos abiertos, servicios activos y vulnerabilidades.'},
      {l:'3. Obtención de acceso', r:'Explotar las vulnerabilidades encontradas.'},
      {l:'4. Mantenimiento de acceso', r:'Asegurar la presencia en el sistema para pruebas a largo plazo.'},
      {l:'5. Cobertura y reporte', r:'Limpiar rastros de la prueba y generar el informe.'}
    ],
    explain:'Son las cinco etapas del ethical hacking, siempre realizadas con permiso de la organización.'},
  {id:'q34', topic:'eh', type:'fill',
    prompt:'La regla de oro del ethical hacking es que el hacker ético siempre ___ antes de iniciar cualquier prueba.',
    answers:['pide permiso','pide autorizacion','pide permiso a la organizacion'],
    explain:'Pedir autorización explícita es la regla fundamental que distingue al hacker ético de un atacante malicioso.'},
  {id:'q35', topic:'eh', type:'vf',
    prompt:'El hacker ético mantiene en secreto los hallazgos de sus pruebas de seguridad.',
    answer:true,
    explain:'La confidencialidad de los hallazgos es una de las reglas básicas del hacker ético, para no exponer las vulnerabilidades encontradas.'},
  {id:'q36', topic:'eh', type:'mc',
    prompt:'¿Cuál de las siguientes NO es una regla del hacker ético?',
    options:['Pedir permiso antes de atacar','No causar daño a sistemas ni datos','Explotar las vulnerabilidades encontradas sin reportarlas','Trabajar siempre dentro de los límites legales'], answerIndex:2,
    explain:'Explotar vulnerabilidades sin reportarlas rompe la ética del hacking: el hacker ético siempre informa sus hallazgos a la organización.'},
  {id:'q37', topic:'eh', type:'mc',
    prompt:'¿Cuál de estas certificaciones es la indicada para iniciarse en el mundo de la ciberseguridad?',
    options:['CompTIA Security+','OSCP','CISSP','GPEN'], answerIndex:0,
    explain:'Entre las certificaciones recomendadas, CompTIA Security+ es la puerta de entrada al mundo de la ciberseguridad; CEH, OSCP, eJPT, CISSP y GPEN son otras opciones reconocidas.'},
  {id:'q38', topic:'eh', type:'mc',
    prompt:'¿Cuál de las siguientes forma parte de las actividades del día a día del ethical hacking?',
    options:['Evaluación de vulnerabilidades','Difusión de contenido íntimo sin consentimiento','Suplantación de identidad con fines de fraude','Envenenamiento de datos de un modelo sin autorización'], answerIndex:0,
    explain:'El día a día del ethical hacking incluye pruebas de penetración, evaluación de vulnerabilidades, análisis de malware y gestión de riesgos.'},
  {id:'q39', topic:'eh', type:'open',
    prompt:'Explica en qué se diferencia un hacker ético de un ciberdelincuente, aunque ambos puedan usar las mismas herramientas y técnicas.',
    model:'El hacker ético siempre pide permiso antes de actuar, no causa daño real a los sistemas, mantiene la confidencialidad de lo que encuentra y trabaja dentro de los límites legales, con el objetivo de mejorar la seguridad. El ciberdelincuente actúa sin permiso, con fines dañinos, de lucro ilícito o disrupción, y no reporta las vulnerabilidades que explota.'},

  // ---------- Esquemas de defensa (6) ----------
  {id:'q40', topic:'defensa', type:'diagram', diagramKind:'layers',
    prompt:'Completa el esquema de defensa en profundidad ordenando las capas de la más externa (perímetro) a la más interna.',
    slots:[
      {key:'l1', label:'Capa 1 · más externa', correct:'Red perimetral'},
      {key:'l2', label:'Capa 2', correct:'Segmento de red'},
      {key:'l3', label:'Capa 3', correct:'Aplicaciones'},
      {key:'l4', label:'Capa 4 · más interna', correct:'Sistema operativo'}
    ],
    pool:['Red perimetral','Segmento de red','Aplicaciones','Sistema operativo','Backups','Firewall de software'],
    explain:'La defensa en profundidad aplica capas de la más externa (red perimetral) a la más interna (sistema operativo): Red perimetral → Segmento de red → Aplicaciones → Sistema operativo.'},
  {id:'q41', topic:'defensa', type:'fill',
    prompt:'El modelo ___ busca detectar amenazas antes de que ocurra un ataque, mientras que el modelo detectivo las identifica cuando ya están ocurriendo.',
    answers:['proactivo'],
    explain:'El modelo proactivo busca amenazas de forma anticipada; el detectivo identifica ataques mientras ocurren; el preventivo evita que ocurran; el correctivo reduce el daño después del incidente.'},
  {id:'q42', topic:'defensa', type:'match',
    prompt:'Relaciona cada herramienta con su función dentro del esquema de defensa.',
    pairs:[
      {l:'Antivirus', r:'Detecta y elimina software malicioso en servidores y estaciones de trabajo.'},
      {l:'Firewall', r:'Filtra y gestiona las comunicaciones de red entrantes y salientes.'},
      {l:'EDR / EPP', r:'Ofrece detección y protección centralizada en el punto final, con visibilidad para el administrador.'},
      {l:'IDS / IPS', r:'Detecta y/o previene intrusiones dentro del tráfico de la red.'}
    ],
    explain:'Cada herramienta protege una capa distinta del esquema de defensa en profundidad.'},
  {id:'q43', topic:'defensa', type:'vf',
    prompt:'La defensa en profundidad se basa en tener una sola capa de seguridad muy robusta, en lugar de varias capas combinadas.',
    answer:false,
    explain:'Todo lo contrario: la defensa en profundidad combina múltiples capas (Red perimetral, Segmento de red, Aplicaciones y Sistema operativo) para que, si una falla, otra siga conteniendo la amenaza.'},
  {id:'q44', topic:'defensa', type:'fill',
    prompt:'La defensa en profundidad es importante porque actúa como un ___, además de aportar precisión y flexibilidad frente a los riesgos.',
    answers:['escudo'],
    explain:'Funciona como un escudo que reduce la probabilidad de que un solo fallo se convierta en una violación de seguridad completa.'},
  {id:'q45', topic:'defensa', type:'open',
    prompt:"Explica el concepto de 'defensa en profundidad' y menciona al menos tres capas o herramientas que la conforman.",
    model:'Es una estrategia de seguridad que combina múltiples capas de controles (personas, tecnología y procesos) para que, si una falla, otra siga conteniendo la amenaza. Sus capas van de la más externa a la más interna: red perimetral, segmento de red, aplicaciones y sistema operativo. Herramientas de ejemplo: firewall, antivirus/EDR, IDS/IPS y políticas de concientización del personal.'}
];
