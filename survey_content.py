# -*- coding: utf-8 -*-
"""
Fuente única de verdad del contenido de la encuesta "Uso del celular".
Este archivo define, en Python, todos los bloques y preguntas de la Ola 1 y
la Ola 2. build.py lo vuelca a site/data.json, que es lo que consume la app
(HTML/JS) para renderizar tanto el modo "Editor" como el modo "Encuestado".

Tipos de pregunta soportados (campo "type"):
  - text_display      : solo texto/HTML, sin input (botón "Continuar")
  - mc_single         : opción única (radio buttons)
  - email             : input de email
  - date_ymd          : selector de día/mes/año
  - hours_per_day     : selector (0 a 24, enteros) -- pedido explícito del usuario
  - hours_minutes     : dos selectores juntos, "Horas" (0..max_hours) + "Minutos"
                        (0/15/30/45) -- para cantidades de uso semanal donde
                        importa el minuto (Prior y Real de horas de celular),
                        no solo la hora entera. Se guarda como {h, m} (números).
                        Para cálculos se usa h + m/60 (ver toDecimalHours en
                        app.js). "max_hours" (default 24) pone el tope del
                        selector de horas -- para semanal usar 168.
  - number_slider     : slider numérico con min/max (para horas semanales, etc.)
  - number_input      : input numérico simple con min/max
  - matrix_likert     : tabla de filas (afirmaciones) x columnas (escala Likert)
  - ranking_form      : N filas, cada una con (nombre de app, % de tiempo)
  - file_upload       : input de archivo (simulado, no se sube a ningún lado)

Lógica de habilitación (a nivel bloque o pregunta), campo "display_if":
  {"field": "Tratado", "op": "eq", "value": 1}
El "field" se resuelve contra las respuestas guardadas (o, en modo Editor,
contra la Rama de previsualización elegida).

Piping de texto: los textos pueden contener tokens {{PRIOR}} y {{REAL}} que
se reemplazan por la respuesta guardada a la pregunta indicada en "pipe_map"
del bloque (o, en modo Editor, por valores de ejemplo).

Mensajes calculados: una pregunta "text_display" puede llevar un campo
"compute" (en vez de piping simple por tokens) para que app.js arme el texto
con una fórmula en JS a partir de varias respuestas -- se usa en el Bloque 5b
para: (a) la comparación Prior vs. Real (con la diferencia en horas y en %),
y (b) el nudge de T3, que calcula la edad real del respondiente (a partir de
B1_FechaNacimiento) y proyecta años de vida "mirando la pantalla" usando la
esperanza de vida de Argentina (INDEC/Naciones Unidas, 2023) y su uso real
medido (B5_HorasReales). El campo "text" en esos casos queda solo como
referencia/documentación para quien lee este archivo -- el que se muestra de
verdad es el que arma "compute".

Estilo de caja: "variant" en una pregunta ("comparison" o "nudge") le da un
recuadro visualmente distinto (ver style.css) -- se usa para separar el dato
objetivo (cuánto dijiste vs. cuánto usaste en realidad) del mensaje de
tratamiento que se combina con esa información.

Ventanas de fecha: una pregunta puede llevar un campo "date_window" ("last7",
"prior_week" o "current_week") junto con el token {{VENTANA}} en su "text".
app.js calcula la ventana real (con fechas concretas, ej. "del 8 al 14 de
septiembre") en base a la fecha del dispositivo en el momento en que la
persona está respondiendo -- no una fecha fija ni la fecha de la Ola 1 -- y
reemplaza el token antes de mostrar el texto. "last7" son los últimos 7 días
terminando hoy (se usa en Ola 1 y en Ola 2 -- Tratados); "prior_week" son los
7 días de hace 8 a 14 días (Ola 2 -- Control, "semana pasada"); "current_week"
son los últimos 7 días terminando hoy (Ola 2 -- Control, "esta semana": mismo
cálculo que "last7", nombre distinto por claridad de dónde se usa cada uno).

La app y las pantallas de uso del celular se nombran siempre igual:
"Bienestar Digital/Tiempo de Uso".

NOTA: las preguntas de "aperturas/desbloqueos" (B5_Aperturas en Ola 1;
O2T_Aperturas y O2C_AperturasSemana1/2 en Ola 2) se sacaron de la encuesta a
pedido del usuario -- ya no se pregunta esa métrica en ninguna ola.

Diseño experimental (6 ramas): T0, T*, T1, T3, T4, T5 -- ver ARMS/ARM_LABELS.
El campo "Tratado" (ver display_if) es 1 para toda rama que NO es T0, y
significa "ve su uso real medido en la Ola 1" (se le muestra el Bloque 5 y,
en la Ola 2, sigue el camino O2_Tratados) -- NO significa "recibe un mensaje
de tratamiento". Esa distinción es la que separa T* de T1..T5: T* es
Tratado=1 (ve su uso real) pero, dentro del Bloque 5b, no recibe la
comparación Prior-Real ni ningún mensaje adicional. La lógica de las 6 ramas:
  - T0  -- Control: no ve su uso real en la Ola 1. Recibe el placebo del
          mensaje común (B5_Placebo), para igualar la carga de lectura del
          Bloque 5b frente a T*.
  - T*  -- Feedback de uso real: ve su uso real (Bloque 5, igual que T1..T5)
          pero NO recibe la comparación Prior-Real ni ningún mensaje
          adicional. En su lugar ve el mismo placebo que T0 (B5_Placebo,
          texto idéntico). Permite aislar, junto con T0 y T1:
            T* - T0: efecto de simplemente mostrar el uso real.
            T1 - T*: efecto adicional de corregir la percepción con la
                     comparación Prior-Real.
  - T1  -- Información pura: ve su uso real + la comparación Prior-Real
          (B5_Comparacion). No lleva mensaje adicional propio -- la
          comparación ES el tratamiento completo.
  - T3/T4/T5 -- Igual que T1 (uso real + comparación Prior-Real) más su
          mensaje adicional propio (B5_T3_Mensaje/B5_T4_Mensaje/
          B5_T5_Mensaje).

Placebo del mensaje común (pregunta B5_Placebo, rama T0 y T*): mismo texto y
mismo variant/posición dentro del Bloque 5b para ambas ramas -- ver la
pregunta para el texto exacto y las restricciones de contenido (no menciona
celular, pantallas, sueño, concentración, memoria, autocontrol,
productividad, hábitos digitales ni ninguna consecuencia del uso del
celular; su única función es igualar la carga de mensajes).

PENDIENTE (señalado, no implementado todavía): T1 debería recibir además un
segundo placebo -- el "placebo del mensaje adicional" -- para igualar su
carga de mensajes con T3/T4/T5 (que sí reciben un segundo bloque de mensaje
además de la comparación Prior-Real). Todavía no se definió el texto de ese
placebo, así que T1 por ahora queda con un mensaje menos que T3/T4/T5; hay
que agregarlo cuando se decida el texto.

Operadores soportados en "display_if" (ver evalCondition en app.js): "eq"
(igual), "ne" (distinto) y "in" (el valor está en una lista). Se usa "in"
para expresar "Brazo es T0 o T*" (B5_Placebo) y "Brazo es T1, T3, T4 o T5"
(B5_Comparacion) -- son las dos particiones de las 6 ramas que importan en
el Bloque 5b. "ne" queda disponible para casos futuros de una sola exclusión.

Jerarquía visual (SOLO modo Encuestado -- pedido estético; el modo Editor no
se toca y sigue mostrando el "title" técnico del bloque, como siempre):
  - "section" (a nivel de bloque): un título de sección en lenguaje natural
    para quien responde (ej. "Sobre vos"), bien distinto tipográficamente de
    la pregunta y del campo de respuesta -- ver .section-title en style.css.
    Se muestra una sola vez, antes de la primera pregunta visible del bloque
    a la que le corresponde.
  - "section_override" (a nivel de pregunta, opcional): cambia el título de
    sección a partir de esa pregunta en adelante, sin esperar a que termine
    el bloque -- para bloques que mezclan más de un tema (ej. el Bloque 0
    mezcla la bienvenida, el consentimiento y el email de contacto en un
    solo bloque técnico, pero son 3 secciones distintas para quien
    responde). Una pregunta sin "section_override" hereda la sección de la
    pregunta visible anterior (o el "section" del bloque, si es la primera).
    Un bloque sin "section" ni ninguna "section_override" no muestra ningún
    título de sección (ej. las pantallas de cierre).
  app.js arma esta cadena (currentSection) recorriendo TODAS las preguntas
  del bloque en orden -- visibles o no, para no romper la cadena según la
  rama -- pero solo IMPRIME el título cuando cambia respecto de la última
  pregunta que sí se mostró.
"""

LIKERT_SCALE = [
    "Totalmente en desacuerdo",
    "En desacuerdo",
    "Ni de acuerdo ni en desacuerdo",
    "De acuerdo",
    "Totalmente de acuerdo",
]

ARMS = ["T0", "T*", "T1", "T3", "T4", "T5"]

ARM_LABELS = {
    "T0": "T0 -- Control",
    "T*": "T* -- Feedback de uso real",
    "T1": "T1 -- Información pura",
    "T3": "T3 -- Costo de oportunidad",
    "T4": "T4 -- Información de daño",
    "T5": "T5 -- Guía de acción",
}

BLOCKS = [
    # ---------------------------------------------------------------- OLA 1
    {
        "id": "B0",
        "wave": 1,
        "title": "Bloque 0 -- Consentimiento y contacto",
        # Pedido estético: dividir lo que antes era un solo párrafo largo (3
        # ideas distintas -- de qué se trata, cuánto dura, y la
        # voluntariedad/confidencialidad) en dos preguntas cortas con su
        # propia "section" cada una, para que se lea más fácil ("facilita
        # muchísimo el escaneo", en palabras del usuario). Mismo contenido,
        # reorganizado; la única frase que cambió de verdad es la del
        # incentivo (ver B0_Participacion).
        "section": "Sobre el estudio",
        "questions": [
            {
                "id": "B0_Intro",
                "type": "text_display",
                "text": (
                    "Te invitamos a participar de un estudio de la Universidad de San "
                    "Andrés sobre hábitos y uso del celular.<br><br>"
                    "La encuesta tiene dos partes:"
                    "<ul>"
                    "<li><b>Primera parte:</b> aproximadamente 8 minutos.</li>"
                    "<li><b>Segunda parte:</b> aproximadamente 3 minutos, dentro de 7 "
                    "días.</li>"
                    "</ul>"
                    "Te vamos a contactar por email para la segunda parte."
                ),
            },
            {
                "id": "B0_Participacion",
                "type": "text_display",
                "section_override": "Participación",
                "text": (
                    "Tu participación es voluntaria y podés abandonar la encuesta en "
                    "cualquier momento sin ninguna consecuencia. Tus respuestas son "
                    "confidenciales y se usan únicamente con fines de investigación "
                    "académica, de forma agregada.<br><br>"
                    "Solo participás de la recompensa si participás de ambas partes de "
                    "la encuesta."
                ),
            },
            {
                "id": "B0_Consentimiento",
                "type": "mc_single",
                "section_override": "Consentimiento",
                "text": "¿Aceptás participar en este estudio?",
                "choices": ["Sí, acepto participar", "No, no deseo participar"],
                "force": True,
                "end_survey_if": {"value": "No, no deseo participar"},
            },
            {
                "id": "B0_Email",
                "type": "email",
                "section_override": "Tus datos de contacto",
                "text": (
                    "Dejanos tu email de contacto. Lo vamos a usar únicamente para "
                    "reenviarte la segunda parte dentro de 7 días y para el sorteo."
                ),
                "force": True,
            },
            {
                "id": "B0_Sorteo",
                "type": "text_display",
                "text": (
                    "<i>Recordá: para participar del sorteo tenés que completar tanto "
                    "esta encuesta como la segunda parte que te llega por email dentro de "
                    "7 días.</i>"
                ),
            },
        ],
    },
    {
        "id": "B1",
        "wave": 1,
        "title": "Bloque 1 -- Clasificación",
        "section": "Sobre vos",
        "questions": [
            {
                "id": "B1_FechaNacimiento",
                "type": "date_ymd",
                "text": "¿Cuál es tu fecha de nacimiento?",
                "year_min": 1930,
                "year_max": 2013,
                "force": True,
            },
            {
                "id": "B1_Sexo",
                "type": "mc_single",
                "text": "¿Cuál es tu sexo?",
                "choices": ["Femenino", "Masculino", "Prefiero no decir"],
                "force": True,
            },
            {
                "id": "B1_NivelEstudios",
                "type": "mc_single",
                "text": "¿Cuál es tu nivel de estudios alcanzado?",
                "choices": [
                    "Secundario incompleto",
                    "Secundario completo",
                    "Terciario/Universitario incompleto",
                    "Terciario/Universitario completo",
                    "Posgrado (maestría/doctorado) incompleto o completo",
                ],
                "force": True,
            },
            {
                "id": "B1_HorasSueno",
                "type": "hours_minutes",
                "text": "En promedio, ¿cuánto tiempo dormís por día (horas y minutos)?",
                "max_hours": 24,
                "force": True,
            },
            {
                "id": "B1_HorasEjercicio",
                "type": "hours_minutes",
                "text": "En promedio, ¿cuánto tiempo hacés ejercicio POR SEMANA (horas y minutos)?",
                "max_hours": 40,
                "force": True,
            },
            {
                "id": "B1_HorasTrabajoEstudio",
                "type": "hours_minutes",
                "text": (
                    "En promedio, ¿cuánto tiempo por día dedicás a trabajar o estudiar "
                    "(horas y minutos)? Si hacés las dos cosas, sumá el tiempo total entre "
                    "ambas."
                ),
                "max_hours": 24,
                "force": True,
            },
        ],
    },
    {
        "id": "B2",
        "wave": 1,
        "title": "Bloque 2 -- Prior",
        "section": "Tu percepción de uso",
        "questions": [
            {
                # Unifica en un solo mensaje lo que antes eran dos preguntas
                # separadas (B2_AvisoNoMirar + B2_ExplicacionIncentivo) --
                # pedido estético para que la persona que responde vea un
                # solo cartel acá en vez de dos pantallas seguidas con textos
                # cortos. Mismo contenido, sin agregar ni sacar información.
                "id": "B2_AvisoNoMirar",
                "type": "text_display",
                "text": (
                    "<b>Antes de seguir: por favor NO mires en tu celular ninguna "
                    "aplicación de uso/pantalla.</b> En las próximas preguntas te vamos a "
                    "pedir que estimes tu propio uso, de memoria. Respondé exactamente lo "
                    "que creés, sin redondear para abajo ni para arriba."
                ),
            },
            {
                "id": "B2_PriorHoras",
                "type": "hours_minutes",
                "text": (
                    "Sin mirar en tu celular: ¿cuánto tiempo en total pensás que "
                    "usaste tu celular en {{VENTANA}} (horas y minutos)?"
                ),
                "date_window": "last7",
                "max_hours": 168,
                "force": True,
            },
            {
                "id": "B2_HorasDeseadas",
                "type": "hours_minutes",
                "section_override": "Tu uso ideal",
                "text": (
                    "Pensando en un día típico, ¿cuánto tiempo te GUSTARÍA usar el "
                    "celular por día, idealmente (horas y minutos)?"
                ),
                "max_hours": 24,
                "force": True,
            },
        ],
    },
    {
        "id": "B3",
        "wave": 1,
        "title": "Bloque 3 -- Ítems Likert (autocontrol/uso compulsivo)",
        "section": "Tu relación con el celular",
        "questions": [
            {
                "id": "B3_Intro",
                "type": "text_display",
                "text": (
                    "Para cada una de las siguientes afirmaciones, indicá qué tan de "
                    "acuerdo estás. No hay respuestas correctas o incorrectas."
                ),
            },
            {
                "id": "B3_Likert",
                "type": "matrix_likert",
                "text": "Indicá tu grado de acuerdo con cada afirmación:",
                "scale": LIKERT_SCALE,
                "rows": [
                    {"text": "Quiero dejar el celular al dormir, pero no puedo.", "reverse": False},
                    {"text": "Se me pasa el tiempo volando cuando uso el celular, sin darme cuenta.", "reverse": False},
                    {"text": "Desayuno (o como) con el celular de fondo.", "reverse": False},
                    {"text": "Uso el celular más tiempo del que tenía pensado usarlo.", "reverse": False},
                    {"text": "Me pongo impaciente o inquieto/a cuando no tengo el celular a mano.", "reverse": False},
                    {"text": "No podría aguantar no tener el celular.", "reverse": False},
                    {"text": "Gente a mi alrededor me dice que uso demasiado el celular.", "reverse": False},
                    {"text": "Intenté reducir mi uso del celular y no pude.", "reverse": False},
                    {"text": "Puedo dejar el celular en otro ambiente sin sentir la necesidad de revisarlo.", "reverse": True},
                ],
                "force": True,
            },
        ],
    },
    {
        "id": "B4",
        "wave": 1,
        "title": "Bloque 4 -- Aleatorización",
        # "invisible": este bloque no se renderiza como paso en modo
        # Encuestado (la aleatorización real es invisible para el
        # participante, como en Qualtrics). En modo Editor sigue apareciendo
        # en la lista de bloques, para poder revisar cómo funciona.
        "invisible": True,
        "questions": [
            {
                "id": "B4_Info",
                "type": "text_display",
                "text": (
                    "(Nota para revisión -- en modo Encuestado este paso NO se muestra en "
                    "absoluto, ni siquiera como pantalla de transición: la aleatorización "
                    "real es invisible para el participante, igual que en Qualtrics. Se "
                    "aleatoriza en UN solo sorteo, uniforme entre los 6 brazos (1/6 de "
                    "probabilidad cada uno): T0 Control, T* Feedback de uso real, T1 "
                    "Información pura, T3 Costo de oportunidad, T4 Información de daño, T5 "
                    "Guía de acción. [Se sacó el brazo T2 -- Norma social. Antes se usaba "
                    "un esquema en dos etapas -- 1/6 Control vs. 5/6 Tratado, y recién ahí "
                    "sub-brazo uniforme -- heredado del diseño original de 6 brazos; al "
                    "sacar T2 esa asimetría ya no tenía justificación y se simplificó a un "
                    "sorteo uniforme único entre los 5 brazos que quedaban. Al agregar T* "
                    "se volvió a 6 brazos, pero el sorteo sigue siendo el mismo esquema "
                    "uniforme de una sola etapa -- ahora 1/6 cada uno -- no el esquema en "
                    "dos etapas original.])"
                ),
            },
        ],
    },
    {
        "id": "B5",
        "wave": 1,
        "title": "Bloque 5 -- Medición real (solo tratados)",
        "display_if": {"field": "Tratado", "op": "eq", "value": 1},
        "section": "Tu uso real",
        "questions": [
            {
                "id": "B5_Instruccion",
                "type": "text_display",
                "text": (
                    "Ahora sí: abrí la Configuración de tu celular → Bienestar "
                    "Digital/Tiempo de Uso → mirá el resumen de {{VENTANA}}."
                ),
                "date_window": "last7",
            },
            {
                "id": "B5_HorasReales",
                "type": "hours_minutes",
                "text": (
                    "Según esa pantalla, ¿cuánto tiempo en TOTAL usaste el celular en "
                    "{{VENTANA}} (horas y minutos)?"
                ),
                "date_window": "last7",
                "max_hours": 168,
                "force": True,
            },
            {
                "id": "B5_RankingApps",
                "type": "ranking_form",
                "text": (
                    "Mirá el listado de apps ordenado por tiempo de uso en {{VENTANA}}. "
                    "Completá las 5 que más tiempo te consumieron, de mayor a menor, con "
                    "el tiempo de uso de cada una (tal cual figura en la pantalla, ej: 2h "
                    "30m):"
                ),
                "date_window": "last7",
                "n_rows": 5,
            },
            {
                # Se sacó "force": True a pedido del usuario -- ahora es
                # opcional, no bloquea el avance si no se sube nada.
                "id": "B5_Captura",
                "type": "file_upload",
                "text": "Subí una captura de pantalla de esa vista (opcional).",
                "help_text": (
                    "¿Dónde lo encontrás? En iPhone: Ajustes > Tiempo de Uso. "
                    "En Android: Configuración > Bienestar digital y controles "
                    "parentales (el nombre puede variar según el modelo)."
                ),
                "reference_image": "assets/muestra_captura.png",
            },
        ],
    },
    {
        "id": "B5_Mensaje",
        "wave": 1,
        "title": "Bloque 5b -- Mensaje (comparación / placebo)",
        # Sin display_if a nivel de bloque: a diferencia del Bloque 5 (medición
        # real, que sigue siendo solo para Tratado==1, es decir T*/T1/T3/T4/T5),
        # este bloque también lo tiene que alcanzar T0 -- para que reciba el
        # placebo del mensaje común en la misma posición de la encuesta que T*.
        # Quién ve qué adentro se resuelve pregunta por pregunta con
        # display_if de "Brazo" (ver cada pregunta más abajo).
        "section": "Tu resultado",
        "pipe_map": {"PRIOR": "B2_PriorHoras", "REAL": "B5_HorasReales"},
        "questions": [
            {
                # Placebo del mensaje común (T0 y T*): mismo texto, mismo
                # variant y misma posición dentro del bloque para ambas ramas.
                # No menciona celular, pantallas, sueño, concentración,
                # memoria, autocontrol, productividad, hábitos digitales ni
                # ninguna consecuencia del uso del celular -- su única función
                # es igualar la carga de mensajes del Bloque 5b frente a
                # T1/T3/T4/T5, no aportar información de tratamiento.
                "id": "B5_Placebo",
                "type": "text_display",
                "variant": "placebo",
                "display_if": {"field": "Brazo", "op": "in", "value": ["T0", "T*"]},
                "text": (
                    "<b>Información general</b><br><br>"
                    "Las personas pueden percibir de manera diferente determinados "
                    "estímulos visuales. La interpretación de una imagen puede depender "
                    "de las características del estímulo y de la información "
                    "disponible en el momento de observarlo. Por esta razón, un mismo "
                    "estímulo puede ser interpretado de distintas maneras por diferentes "
                    "personas."
                ),
            },
            {
                # Caja 1: el dato objetivo (prior vs. real), en un recuadro
                # propio y separado del mensaje de tratamiento. Se muestra a
                # los 4 brazos que reciben la comparación (T1/T3/T4/T5) --
                # explícitamente NO a T0 (que no tiene B5_HorasReales, porque
                # no ve su uso real en la Ola 1) ni a T* (que sí ve su uso
                # real, pero no esta comparación -- ver diseño experimental en
                # el docstring del módulo). "compute" arma el texto de verdad
                # (con la diferencia en horas y en %, y de qué lado quedó la
                # persona); "text" queda solo de referencia.
                "id": "B5_Comparacion",
                "type": "text_display",
                "variant": "comparison",
                "display_if": {"field": "Brazo", "op": "in", "value": ["T1", "T3", "T4", "T5"]},
                "compute": "comparacion_uso",
                "text": (
                    "Vos dijiste que habías usado {{PRIOR}} horas la semana pasada. "
                    "Según tu propio celular, en realidad usaste {{REAL}} horas. "
                    "[calculado: diferencia en horas y en %]"
                ),
            },
            {
                # T1 (Información pura) no lleva mensaje adicional: la
                # comparación de arriba ES el tratamiento completo. (El brazo
                # T2 -- Norma social -- se sacó del diseño: llevaba este
                # mismo mensaje de referencia poblacional y ya no se usa.)
                #
                # T3 (Costo de oportunidad), personalizado: usa la edad real
                # (a partir de B1_FechaNacimiento) y el uso real medido
                # (B5_HorasReales) para proyectar años de vida equivalentes
                # mirando la pantalla, contra la esperanza de vida de
                # Argentina (INDEC/Naciones Unidas, 2023: 77,3 años).
                "id": "B5_T3_Mensaje",
                "type": "text_display",
                "variant": "nudge",
                "display_if": {"field": "Brazo", "op": "eq", "value": "T3"},
                "compute": "t3_esperanza_vida",
                "text": (
                    "Pensá lo que implica sostener ese ritmo en el tiempo: la esperanza "
                    "de vida en Argentina es de 77,3 años (INDEC/Naciones Unidas, 2023). "
                    "[calculado con tu edad real y tu uso real: años de vida restantes y "
                    "el equivalente en años/meses/días mirando la pantalla (se elige la "
                    "unidad más chica que dé >= 1, para no redondear a \"0 meses\"). Si "
                    "la edad ya alcanzó o superó la esperanza de vida, el mensaje cambia "
                    "de marco: en vez de proyectar años restantes, muestra el "
                    "equivalente acumulado hasta ahora. Si el uso real reportado es 0, no "
                    "se proyecta nada -- ver computeT3HTML en app.js]"
                ),
            },
            {
                # Fuente: "No tan inteligentes: ¿qué le hacen los celulares a nuestros
                # cerebros?" (CONICET Mendoza / INCIHUSA, difusión sobre el trabajo del
                # grupo LiNEL -- investigador Ángel Javier Tabullo):
                # https://mendoza.conicet.gov.ar/no-tan-inteligentes-que-le-hacen-los-celulares-a-nuestros-cerebros/
                # El texto separa lo que encontró LiNEL en universitarios mendocinos
                # (escalada de uso, uso en momentos inadecuados, dificultad para
                # controlar impulsos) de lo que esa misma nota cita de otras
                # investigaciones (presencia del celular y memoria de trabajo; uso
                # antes de dormir y calidad del sueño), para no atribuirle a LiNEL un
                # hallazgo que no es el propio.
                # Precisión causal/correlacional (verificado contra la fuente):
                # - Hallazgo de LiNEL (universitarios mendocinos): es un estudio
                #   correlacional/descriptivo, no un experimento -> se usa "está
                #   asociado a" en vez de "aumenta".
                # - Presencia del celular y memoria de trabajo: proviene de un
                #   experimento (Ward y su equipo, "Brain Drain") -> se mantiene
                #   lenguaje causal, atribuido explícitamente a esos autores.
                # - Uso antes de dormir y calidad del sueño: la nota no especifica un
                #   diseño experimental para esta afirmación -> se usa lenguaje
                #   correlacional/atenuado ("está vinculado a").
                "id": "B5_T4_Mensaje",
                "type": "text_display",
                "variant": "nudge",
                "display_if": {"field": "Brazo", "op": "eq", "value": "T4"},
                "text": (
                    "Esto no es un dato aislado: investigadores del CONICET Mendoza "
                    "(INCIHUSA, grupo LiNEL) encontraron que el uso intensivo de redes "
                    "sociales desde el celular está asociado a una mayor necesidad de "
                    "pasar cada vez más tiempo conectados, al uso en momentos donde no "
                    "corresponde (como en clase o en el trabajo) y a más dificultad "
                    "para controlar los impulsos. Otras investigaciones que citan esos "
                    "mismos investigadores muestran, además, que el solo hecho de tener "
                    "el celular a la vista -- sin siquiera usarlo -- redujo el "
                    "rendimiento en pruebas de memoria de trabajo en un experimento de "
                    "Adrian Ward y su equipo, y que usarlo antes de dormir está "
                    "vinculado a una peor calidad del sueño."
                ),
            },
            {
                # Fuente de los tips: Defensoría del Pueblo de la Provincia de Buenos
                # Aires (2025). Fuente de la evidencia de efectividad: Zimmermann &
                # Sobolev (2020/2023), un experimento de campo (RCT) con medición
                # objetiva de uso que encontró que el grupo asignado a modo escala de
                # grises/fricción de diseño redujo su uso de forma inmediata y
                # significativa frente al grupo control -- por eso se cita
                # específicamente para el tip de "escala de grises", que es el único
                # de los tres restantes con evidencia causal directa de ese estudio.
                # Se eliminó el tip de "evitar el celular antes de dormir" a pedido
                # del usuario.
                "id": "B5_T5_Mensaje",
                "type": "text_display",
                "variant": "nudge",
                "display_if": {"field": "Brazo", "op": "eq", "value": "T5"},
                "text": (
                    "Si te interesa reducir tu uso, estos son algunos tips concretos y "
                    "simples para lograrlo (Defensoría del Pueblo de la Provincia de "
                    "Buenos Aires, 2025):"
                    "<ul>"
                    "<li><b>Activar el modo escala de grises:</b> le saca color a la "
                    "pantalla y la vuelve menos atractiva.</li>"
                    "<li><b>Sacar de la pantalla principal las apps que más tiempo te "
                    "consumen:</b> agrega fricción antes de abrirlas.</li>"
                    "<li><b>Desactivar las notificaciones push:</b> reduce los "
                    "estímulos que te llevan a revisar el celular sin querer.</li>"
                    "</ul>"
                    "Según Zimmermann &amp; Sobolev (2020/2023), en un experimento de "
                    "campo las personas que activaron el modo escala de grises "
                    "redujeron su uso del celular de forma inmediata y significativa."
                ),
            },
        ],
    },
    {
        "id": "B6",
        "wave": 1,
        "title": "Bloque 6 -- Outcomes ola 1",
        "section": "Para cerrar",
        "questions": [
            {
                "id": "B6_Y1_Intencion",
                "type": "number_slider",
                "text": (
                    "En una escala de 0 a 10, ¿qué tan probable es que reduzcas tu uso "
                    "del celular la semana que viene?"
                ),
                "min": 0,
                "max": 10,
                "force": True,
            },
            {
                "id": "B6_Y2a_RecordatorioDiario",
                "type": "mc_single",
                "text": (
                    "¿Querés que te mandemos un recordatorio diario (por email) para "
                    "ayudarte a reducir tu uso del celular durante la próxima semana?"
                ),
                "choices": ["Sí", "No"],
                "force": True,
            },
            {
                "id": "B6_Y2b_Guia",
                "type": "mc_single",
                "text": (
                    "¿Te interesa que te enviemos por email una guía breve con tips para "
                    "mejorar tu relación con el celular?"
                ),
                "choices": ["Sí", "No"],
                "force": True,
            },
            {
                "id": "B6_S8_PercepcionDemanda",
                "type": "mc_single",
                "text": (
                    "¿En qué medida creés que esta encuesta buscó influir en tu "
                    "comportamiento respecto del uso del celular?"
                ),
                "choices": ["Nada", "Muy poco", "Algo", "Bastante", "Mucho"],
                "force": True,
            },
        ],
    },
    {
        "id": "B7",
        "wave": 1,
        "title": "Bloque 7 -- Cierre ola 1",
        "questions": [
            {
                "id": "B7_Cierre",
                "type": "text_display",
                "text": (
                    "¡Gracias por completar esta primera parte! Te vamos a volver a "
                    "escribir por email dentro de 7 días para la segunda y última parte."
                ),
            },
            {
                "id": "B7_ConfirmaRecordatorio",
                "type": "text_display",
                "display_if": {"field": "B6_Y2a_RecordatorioDiario", "op": "eq", "value": "Sí"},
                "text": "Vas a empezar a recibir tu recordatorio diario por email a partir de mañana.",
            },
            {
                "id": "B7_ConfirmaGuia",
                "type": "text_display",
                "display_if": {"field": "B6_Y2b_Guia", "op": "eq", "value": "Sí"},
                "text": "Te vamos a enviar la guía con tips por email en los próximos días.",
            },
        ],
    },
    # ---------------------------------------------------------------- OLA 2
    {
        "id": "O2_Tratados",
        "wave": 2,
        "title": "Ola 2 -- Medición real (tratados)",
        "display_if": {"field": "Tratado", "op": "eq", "value": 1},
        "section": "Tu uso esta semana",
        "questions": [
            {
                # Se entra a esta Ola 2 por un link fijo, compartido con todo
                # el grupo (ver ola2_tratados.html), no por un link
                # personalizado con pid/arm -- así que hace falta que la
                # persona se autoidentifique para poder juntar esta fila con
                # la de su Ola 1 (por email, no por pid).
                "id": "O2T_Email",
                "type": "email",
                "section_override": "Antes de empezar",
                "text": (
                    "Para juntar esta respuesta con la de la primera parte, escribí el "
                    "mismo email que usaste ahí."
                ),
                "force": True,
            },
            {
                "id": "O2T_Intro",
                "type": "text_display",
                "text": (
                    "¡Hola de nuevo! Ya pasó una semana. Abrí de nuevo Bienestar "
                    "Digital/Tiempo de Uso y mirá el resumen de {{VENTANA}}."
                ),
                "date_window": "last7",
            },
            {
                "id": "O2T_HorasReales",
                "type": "hours_minutes",
                "text": (
                    "¿Cuánto tiempo en TOTAL usaste el celular en {{VENTANA}} (horas "
                    "y minutos)?"
                ),
                "date_window": "last7",
                "max_hours": 168,
                "force": True,
            },
            {
                "id": "O2T_RankingApps",
                "type": "ranking_form",
                "text": "Las 5 apps que más tiempo te consumieron en {{VENTANA}}, con su tiempo de uso (ej: 2h 30m):",
                "date_window": "last7",
                "n_rows": 5,
            },
            {
                # Misma lógica que B5_Captura: opcional, mismo link/imagen
                # de referencia, por consistencia entre las 4 preguntas de
                # captura de la encuesta (ver nota en B5_Captura).
                "id": "O2T_Captura",
                "type": "file_upload",
                "text": "Subí una captura de {{VENTANA}} (opcional).",
                "date_window": "last7",
                "help_text": (
                    "¿Dónde lo encontrás? En iPhone: Ajustes > Tiempo de Uso. "
                    "En Android: Configuración > Bienestar digital y controles "
                    "parentales (el nombre puede variar según el modelo)."
                ),
                "reference_image": "assets/muestra_captura.png",
            },
        ],
    },
    {
        "id": "O2_Control",
        "wave": 2,
        "title": "Ola 2 -- Medición real retrospectiva (control)",
        "display_if": {"field": "Tratado", "op": "eq", "value": 0},
        "questions": [
            {
                # Ver nota en O2T_Email -- misma lógica, para el link fijo
                # ola2_control.html.
                "id": "O2C_Email",
                "type": "email",
                "section_override": "Antes de empezar",
                "text": (
                    "Para juntar esta respuesta con la de la primera parte, escribí el "
                    "mismo email que usaste ahí."
                ),
                "force": True,
            },
            {
                "id": "O2C_Intro",
                "type": "text_display",
                "text": (
                    "Esta es la primera vez que te pedimos que revises tu Bienestar "
                    "Digital/Tiempo de Uso. La mayoría de los celulares muestran un "
                    "desglose de \"esta semana\" y \"semana pasada\": necesitamos AMBAS."
                ),
            },
            {
                "id": "O2C_IntroSemana1",
                "type": "text_display",
                "section_override": "Semana pasada",
                "text": "Primero, mirá el dato de {{VENTANA}}.",
                "date_window": "prior_week",
            },
            {
                "id": "O2C_HorasSemana1",
                "type": "hours_minutes",
                "text": "¿Cuánto tiempo en TOTAL usaste el celular en {{VENTANA}} (horas y minutos)?",
                "date_window": "prior_week",
                "max_hours": 168,
                "force": True,
            },
            {
                "id": "O2C_RankingAppsSemana1",
                "type": "ranking_form",
                "text": "Las 5 apps que más tiempo te consumieron en {{VENTANA}}, con su tiempo de uso (ej: 2h 30m):",
                "date_window": "prior_week",
                "n_rows": 5,
            },
            {
                # Misma lógica que B5_Captura (ver nota ahí): opcional, mismo
                # link/imagen de referencia.
                "id": "O2C_CapturaSemana1",
                "type": "file_upload",
                "text": "Subí una captura de {{VENTANA}} (opcional).",
                "date_window": "prior_week",
                "help_text": (
                    "¿Dónde lo encontrás? En iPhone: Ajustes > Tiempo de Uso. "
                    "En Android: Configuración > Bienestar digital y controles "
                    "parentales (el nombre puede variar según el modelo)."
                ),
                "reference_image": "assets/muestra_captura.png",
            },
            {
                "id": "O2C_IntroSemana2",
                "type": "text_display",
                "section_override": "Esta semana",
                "text": "Ahora mirá el dato de {{VENTANA}}.",
                "date_window": "current_week",
            },
            {
                "id": "O2C_HorasSemana2",
                "type": "hours_minutes",
                "text": "¿Cuánto tiempo en TOTAL usaste el celular en {{VENTANA}} (horas y minutos)?",
                "date_window": "current_week",
                "max_hours": 168,
                "force": True,
            },
            {
                "id": "O2C_RankingAppsSemana2",
                "type": "ranking_form",
                "text": "Las 5 apps que más tiempo te consumieron en {{VENTANA}}, con su tiempo de uso (ej: 2h 30m):",
                "date_window": "current_week",
                "n_rows": 5,
            },
            {
                # Misma lógica que B5_Captura (ver nota ahí): opcional, mismo
                # link/imagen de referencia.
                "id": "O2C_CapturaSemana2",
                "type": "file_upload",
                "text": "Subí una captura de {{VENTANA}} (opcional).",
                "date_window": "current_week",
                "help_text": (
                    "¿Dónde lo encontrás? En iPhone: Ajustes > Tiempo de Uso. "
                    "En Android: Configuración > Bienestar digital y controles "
                    "parentales (el nombre puede variar según el modelo)."
                ),
                "reference_image": "assets/muestra_captura.png",
            },
        ],
    },
    {
        "id": "O2_Cierre",
        "wave": 2,
        "title": "Ola 2 -- Cierre",
        "questions": [
            {
                "id": "O2_Cierre",
                "type": "text_display",
                "text": (
                    "¡Listo, eso era todo! Muchas gracias por completar las dos partes de "
                    "la encuesta. Quedás anotado/a en el sorteo."
                ),
            },
        ],
    },
]
