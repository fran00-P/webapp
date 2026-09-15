// Generado automáticamente por build.py -- NO editar a mano.
// Para cambiar el contenido, editar survey_content.py y correr build.py.
window.SURVEY_DATA = {
  "arms": [
    "T0",
    "T*",
    "T1",
    "T3",
    "T4",
    "T5"
  ],
  "arm_labels": {
    "T0": "T0 -- Control",
    "T*": "T* -- Feedback de uso real",
    "T1": "T1 -- Información pura",
    "T3": "T3 -- Costo de oportunidad",
    "T4": "T4 -- Información de daño",
    "T5": "T5 -- Guía de acción"
  },
  "blocks": [
    {
      "id": "B0",
      "wave": 1,
      "title": "Bloque 0 -- Consentimiento y contacto",
      "section": "Sobre el estudio",
      "questions": [
        {
          "id": "B0_Intro",
          "type": "text_display",
          "text": "Te invitamos a participar de un estudio de la Universidad de San Andrés sobre hábitos y uso del celular.<br><br>La encuesta tiene dos partes:<ul><li><b>Primera parte:</b> aproximadamente 8 minutos.</li><li><b>Segunda parte:</b> aproximadamente 3 minutos, dentro de 7 días.</li></ul>Te vamos a contactar por email para la segunda parte."
        },
        {
          "id": "B0_Participacion",
          "type": "text_display",
          "section_override": "Participación",
          "text": "Tu participación es voluntaria y podés abandonar la encuesta en cualquier momento sin ninguna consecuencia. Tus respuestas son confidenciales y se usan únicamente con fines de investigación académica, de forma agregada.<br><br>Solo participás de la recompensa si participás de ambas partes de la encuesta."
        },
        {
          "id": "B0_Consentimiento",
          "type": "mc_single",
          "section_override": "Consentimiento",
          "text": "¿Aceptás participar en este estudio?",
          "choices": [
            "Sí, acepto participar",
            "No, no deseo participar"
          ],
          "force": true,
          "end_survey_if": {
            "value": "No, no deseo participar"
          }
        },
        {
          "id": "B0_Email",
          "type": "email",
          "section_override": "Tus datos de contacto",
          "text": "Dejanos tu email de contacto. Lo vamos a usar únicamente para reenviarte la segunda parte dentro de 7 días y para el sorteo.",
          "force": true
        },
        {
          "id": "B0_Sorteo",
          "type": "text_display",
          "text": "<i>Recordá: para participar del sorteo tenés que completar tanto esta encuesta como la segunda parte que te llega por email dentro de 7 días.</i>"
        }
      ]
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
          "force": true
        },
        {
          "id": "B1_Sexo",
          "type": "mc_single",
          "text": "¿Cuál es tu sexo?",
          "choices": [
            "Femenino",
            "Masculino",
            "Prefiero no decir"
          ],
          "force": true
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
            "Posgrado (maestría/doctorado) incompleto o completo"
          ],
          "force": true
        },
        {
          "id": "B1_HorasSueno",
          "type": "hours_minutes",
          "text": "En promedio, ¿cuánto tiempo dormís por día (horas y minutos)?",
          "max_hours": 24,
          "force": true
        },
        {
          "id": "B1_HorasEjercicio",
          "type": "hours_minutes",
          "text": "En promedio, ¿cuánto tiempo hacés ejercicio POR SEMANA (horas y minutos)?",
          "max_hours": 40,
          "force": true
        },
        {
          "id": "B1_HorasTrabajoEstudio",
          "type": "hours_minutes",
          "text": "En promedio, ¿cuánto tiempo por día dedicás a trabajar o estudiar (horas y minutos)? Si hacés las dos cosas, sumá el tiempo total entre ambas.",
          "max_hours": 24,
          "force": true
        }
      ]
    },
    {
      "id": "B2",
      "wave": 1,
      "title": "Bloque 2 -- Prior",
      "section": "Tu percepción de uso",
      "questions": [
        {
          "id": "B2_AvisoNoMirar",
          "type": "text_display",
          "text": "<b>Antes de seguir: por favor NO mires en tu celular ninguna aplicación de uso/pantalla.</b> En las próximas preguntas te vamos a pedir que estimes tu propio uso, de memoria. Respondé exactamente lo que creés, sin redondear para abajo ni para arriba."
        },
        {
          "id": "B2_PriorHoras",
          "type": "hours_minutes",
          "text": "Sin mirar en tu celular: ¿cuánto tiempo en total pensás que usaste tu celular en {{VENTANA}} (horas y minutos)?",
          "date_window": "last7",
          "max_hours": 168,
          "force": true
        },
        {
          "id": "B2_HorasDeseadas",
          "type": "hours_minutes",
          "section_override": "Tu uso ideal",
          "text": "Pensando en un día típico, ¿cuánto tiempo te GUSTARÍA usar el celular por día, idealmente (horas y minutos)?",
          "max_hours": 24,
          "force": true
        }
      ]
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
          "text": "Para cada una de las siguientes afirmaciones, indicá qué tan de acuerdo estás. No hay respuestas correctas o incorrectas."
        },
        {
          "id": "B3_Likert",
          "type": "matrix_likert",
          "text": "Indicá tu grado de acuerdo con cada afirmación:",
          "scale": [
            "Totalmente en desacuerdo",
            "En desacuerdo",
            "Ni de acuerdo ni en desacuerdo",
            "De acuerdo",
            "Totalmente de acuerdo"
          ],
          "rows": [
            {
              "text": "Quiero dejar el celular al dormir, pero no puedo.",
              "reverse": false
            },
            {
              "text": "Se me pasa el tiempo volando cuando uso el celular, sin darme cuenta.",
              "reverse": false
            },
            {
              "text": "Desayuno (o como) con el celular de fondo.",
              "reverse": false
            },
            {
              "text": "Uso el celular más tiempo del que tenía pensado usarlo.",
              "reverse": false
            },
            {
              "text": "Me pongo impaciente o inquieto/a cuando no tengo el celular a mano.",
              "reverse": false
            },
            {
              "text": "No podría aguantar no tener el celular.",
              "reverse": false
            },
            {
              "text": "Gente a mi alrededor me dice que uso demasiado el celular.",
              "reverse": false
            },
            {
              "text": "Intenté reducir mi uso del celular y no pude.",
              "reverse": false
            },
            {
              "text": "Puedo dejar el celular en otro ambiente sin sentir la necesidad de revisarlo.",
              "reverse": true
            }
          ],
          "force": true
        }
      ]
    },
    {
      "id": "B4",
      "wave": 1,
      "title": "Bloque 4 -- Aleatorización",
      "invisible": true,
      "questions": [
        {
          "id": "B4_Info",
          "type": "text_display",
          "text": "(Nota para revisión -- en modo Encuestado este paso NO se muestra en absoluto, ni siquiera como pantalla de transición: la aleatorización real es invisible para el participante, igual que en Qualtrics. Se aleatoriza en UN solo sorteo, uniforme entre los 6 brazos (1/6 de probabilidad cada uno): T0 Control, T* Feedback de uso real, T1 Información pura, T3 Costo de oportunidad, T4 Información de daño, T5 Guía de acción. [Se sacó el brazo T2 -- Norma social. Antes se usaba un esquema en dos etapas -- 1/6 Control vs. 5/6 Tratado, y recién ahí sub-brazo uniforme -- heredado del diseño original de 6 brazos; al sacar T2 esa asimetría ya no tenía justificación y se simplificó a un sorteo uniforme único entre los 5 brazos que quedaban. Al agregar T* se volvió a 6 brazos, pero el sorteo sigue siendo el mismo esquema uniforme de una sola etapa -- ahora 1/6 cada uno -- no el esquema en dos etapas original.])"
        }
      ]
    },
    {
      "id": "B5",
      "wave": 1,
      "title": "Bloque 5 -- Medición real (solo tratados)",
      "display_if": {
        "field": "Tratado",
        "op": "eq",
        "value": 1
      },
      "section": "Tu uso real",
      "questions": [
        {
          "id": "B5_Instruccion",
          "type": "text_display",
          "text": "Ahora sí: abrí la Configuración de tu celular → Bienestar Digital/Tiempo de Uso → mirá el resumen de {{VENTANA}}.",
          "date_window": "last7"
        },
        {
          "id": "B5_HorasReales",
          "type": "hours_minutes",
          "text": "Según esa pantalla, ¿cuánto tiempo en TOTAL usaste el celular en {{VENTANA}} (horas y minutos)?",
          "date_window": "last7",
          "max_hours": 168,
          "force": true
        },
        {
          "id": "B5_RankingApps",
          "type": "ranking_form",
          "text": "Mirá el listado de apps ordenado por tiempo de uso en {{VENTANA}}. Completá las 5 que más tiempo te consumieron, de mayor a menor, con el tiempo de uso de cada una (tal cual figura en la pantalla, ej: 2h 30m):",
          "date_window": "last7",
          "n_rows": 5
        },
        {
          "id": "B5_Aperturas",
          "type": "number_input",
          "text": "¿Cuántas veces en total abriste el celular en {{VENTANA}}? (Esto es lo que la pantalla de Bienestar Digital/Tiempo de Uso llama \"aperturas\" o \"desbloqueos\": cada vez que encendiste la pantalla y la desbloqueaste, aunque haya sido solo por unos segundos. Usamos \"apertura\" y \"desbloqueo\" como sinónimos en toda la encuesta.)",
          "date_window": "last7",
          "min": 0,
          "max": 500,
          "force": true
        },
        {
          "id": "B5_Captura",
          "type": "file_upload",
          "text": "Subí una captura de pantalla de esa vista (opcional).",
          "help_text": "¿Dónde lo encontrás? En iPhone: Ajustes > Tiempo de Uso. En Android: Configuración > Bienestar digital y controles parentales (el nombre puede variar según el modelo).",
          "reference_image": "assets/muestra_captura.png"
        }
      ]
    },
    {
      "id": "B5_Mensaje",
      "wave": 1,
      "title": "Bloque 5b -- Mensaje (comparación / placebo)",
      "section": "Tu resultado",
      "pipe_map": {
        "PRIOR": "B2_PriorHoras",
        "REAL": "B5_HorasReales"
      },
      "questions": [
        {
          "id": "B5_Placebo",
          "type": "text_display",
          "variant": "placebo",
          "display_if": {
            "field": "Brazo",
            "op": "in",
            "value": [
              "T0",
              "T*"
            ]
          },
          "text": "<b>Información general</b><br><br>Las personas pueden percibir de manera diferente determinados estímulos visuales. La interpretación de una imagen puede depender de las características del estímulo y de la información disponible en el momento de observarlo. Por esta razón, un mismo estímulo puede ser interpretado de distintas maneras por diferentes personas."
        },
        {
          "id": "B5_Comparacion",
          "type": "text_display",
          "variant": "comparison",
          "display_if": {
            "field": "Brazo",
            "op": "in",
            "value": [
              "T1",
              "T3",
              "T4",
              "T5"
            ]
          },
          "compute": "comparacion_uso",
          "text": "Vos dijiste que habías usado {{PRIOR}} horas la semana pasada. Según tu propio celular, en realidad usaste {{REAL}} horas. [calculado: diferencia en horas y en %]"
        },
        {
          "id": "B5_T3_Mensaje",
          "type": "text_display",
          "variant": "nudge",
          "display_if": {
            "field": "Brazo",
            "op": "eq",
            "value": "T3"
          },
          "compute": "t3_esperanza_vida",
          "text": "Pensá lo que implica sostener ese ritmo en el tiempo: la esperanza de vida en Argentina es de 77,3 años (INDEC/Naciones Unidas, 2023). [calculado con tu edad real y tu uso real: años de vida restantes y el equivalente en años/meses/días mirando la pantalla (se elige la unidad más chica que dé >= 1, para no redondear a \"0 meses\"). Si la edad ya alcanzó o superó la esperanza de vida, el mensaje cambia de marco: en vez de proyectar años restantes, muestra el equivalente acumulado hasta ahora. Si el uso real reportado es 0, no se proyecta nada -- ver computeT3HTML en app.js]"
        },
        {
          "id": "B5_T4_Mensaje",
          "type": "text_display",
          "variant": "nudge",
          "display_if": {
            "field": "Brazo",
            "op": "eq",
            "value": "T4"
          },
          "text": "Esto no es un dato aislado: investigadores del CONICET Mendoza (INCIHUSA, grupo LiNEL) encontraron que el uso intensivo de redes sociales desde el celular está asociado a una mayor necesidad de pasar cada vez más tiempo conectados, al uso en momentos donde no corresponde (como en clase o en el trabajo) y a más dificultad para controlar los impulsos. Otras investigaciones que citan esos mismos investigadores muestran, además, que el solo hecho de tener el celular a la vista -- sin siquiera usarlo -- redujo el rendimiento en pruebas de memoria de trabajo en un experimento de Adrian Ward y su equipo, y que usarlo antes de dormir está vinculado a una peor calidad del sueño."
        },
        {
          "id": "B5_T5_Mensaje",
          "type": "text_display",
          "variant": "nudge",
          "display_if": {
            "field": "Brazo",
            "op": "eq",
            "value": "T5"
          },
          "text": "Si te interesa reducir tu uso, estos son algunos tips concretos y simples para lograrlo (Defensoría del Pueblo de la Provincia de Buenos Aires, 2025):<ul><li><b>Activar el modo escala de grises:</b> le saca color a la pantalla y la vuelve menos atractiva.</li><li><b>Sacar de la pantalla principal las apps que más tiempo te consumen:</b> agrega fricción antes de abrirlas.</li><li><b>Desactivar las notificaciones push:</b> reduce los estímulos que te llevan a revisar el celular sin querer.</li></ul>Según Zimmermann &amp; Sobolev (2020/2023), en un experimento de campo las personas que activaron el modo escala de grises redujeron su uso del celular de forma inmediata y significativa."
        }
      ]
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
          "text": "En una escala de 0 a 10, ¿qué tan probable es que reduzcas tu uso del celular la semana que viene?",
          "min": 0,
          "max": 10,
          "force": true
        },
        {
          "id": "B6_Y2a_RecordatorioDiario",
          "type": "mc_single",
          "text": "¿Querés que te mandemos un recordatorio diario (por email) para ayudarte a reducir tu uso del celular durante la próxima semana?",
          "choices": [
            "Sí",
            "No"
          ],
          "force": true
        },
        {
          "id": "B6_Y2b_Guia",
          "type": "mc_single",
          "text": "¿Te interesa que te enviemos por email una guía breve con tips para mejorar tu relación con el celular?",
          "choices": [
            "Sí",
            "No"
          ],
          "force": true
        },
        {
          "id": "B6_S8_PercepcionDemanda",
          "type": "mc_single",
          "text": "¿En qué medida creés que esta encuesta buscó influir en tu comportamiento respecto del uso del celular?",
          "choices": [
            "Nada",
            "Muy poco",
            "Algo",
            "Bastante",
            "Mucho"
          ],
          "force": true
        }
      ]
    },
    {
      "id": "B7",
      "wave": 1,
      "title": "Bloque 7 -- Cierre ola 1",
      "questions": [
        {
          "id": "B7_Cierre",
          "type": "text_display",
          "text": "¡Gracias por completar esta primera parte! Te vamos a volver a escribir por email dentro de 7 días para la segunda y última parte."
        },
        {
          "id": "B7_ConfirmaRecordatorio",
          "type": "text_display",
          "display_if": {
            "field": "B6_Y2a_RecordatorioDiario",
            "op": "eq",
            "value": "Sí"
          },
          "text": "Vas a empezar a recibir tu recordatorio diario por email a partir de mañana."
        },
        {
          "id": "B7_ConfirmaGuia",
          "type": "text_display",
          "display_if": {
            "field": "B6_Y2b_Guia",
            "op": "eq",
            "value": "Sí"
          },
          "text": "Te vamos a enviar la guía con tips por email en los próximos días."
        }
      ]
    },
    {
      "id": "O2_Tratados",
      "wave": 2,
      "title": "Ola 2 -- Medición real (tratados)",
      "display_if": {
        "field": "Tratado",
        "op": "eq",
        "value": 1
      },
      "section": "Tu uso esta semana",
      "questions": [
        {
          "id": "O2T_Intro",
          "type": "text_display",
          "text": "¡Hola de nuevo! Ya pasó una semana. Abrí de nuevo Bienestar Digital/Tiempo de Uso y mirá el resumen de {{VENTANA}}.",
          "date_window": "last7"
        },
        {
          "id": "O2T_HorasReales",
          "type": "hours_minutes",
          "text": "¿Cuánto tiempo en TOTAL usaste el celular en {{VENTANA}} (horas y minutos)?",
          "date_window": "last7",
          "max_hours": 168,
          "force": true
        },
        {
          "id": "O2T_RankingApps",
          "type": "ranking_form",
          "text": "Las 5 apps que más tiempo te consumieron en {{VENTANA}}, con su tiempo de uso (ej: 2h 30m):",
          "date_window": "last7",
          "n_rows": 5
        },
        {
          "id": "O2T_Aperturas",
          "type": "number_input",
          "text": "¿Cuántas veces abriste el celular (aperturas/desbloqueos) en {{VENTANA}}?",
          "date_window": "last7",
          "min": 0,
          "max": 500,
          "force": true
        },
        {
          "id": "O2T_Captura",
          "type": "file_upload",
          "text": "Subí una captura de {{VENTANA}} (opcional).",
          "date_window": "last7",
          "help_text": "¿Dónde lo encontrás? En iPhone: Ajustes > Tiempo de Uso. En Android: Configuración > Bienestar digital y controles parentales (el nombre puede variar según el modelo).",
          "reference_image": "assets/muestra_captura.png"
        }
      ]
    },
    {
      "id": "O2_Control",
      "wave": 2,
      "title": "Ola 2 -- Medición real retrospectiva (control)",
      "display_if": {
        "field": "Tratado",
        "op": "eq",
        "value": 0
      },
      "questions": [
        {
          "id": "O2C_Intro",
          "type": "text_display",
          "text": "Esta es la primera vez que te pedimos que revises tu Bienestar Digital/Tiempo de Uso. La mayoría de los celulares muestran un desglose de \"esta semana\" y \"semana pasada\": necesitamos AMBAS."
        },
        {
          "id": "O2C_IntroSemana1",
          "type": "text_display",
          "section_override": "Semana pasada",
          "text": "Primero, mirá el dato de {{VENTANA}}.",
          "date_window": "prior_week"
        },
        {
          "id": "O2C_HorasSemana1",
          "type": "hours_minutes",
          "text": "¿Cuánto tiempo en TOTAL usaste el celular en {{VENTANA}} (horas y minutos)?",
          "date_window": "prior_week",
          "max_hours": 168,
          "force": true
        },
        {
          "id": "O2C_RankingAppsSemana1",
          "type": "ranking_form",
          "text": "Las 5 apps que más tiempo te consumieron en {{VENTANA}}, con su tiempo de uso (ej: 2h 30m):",
          "date_window": "prior_week",
          "n_rows": 5
        },
        {
          "id": "O2C_AperturasSemana1",
          "type": "number_input",
          "text": "¿Cuántas veces abriste el celular (aperturas/desbloqueos) en {{VENTANA}}?",
          "date_window": "prior_week",
          "min": 0,
          "max": 500,
          "force": true
        },
        {
          "id": "O2C_CapturaSemana1",
          "type": "file_upload",
          "text": "Subí una captura de {{VENTANA}} (opcional).",
          "date_window": "prior_week",
          "help_text": "¿Dónde lo encontrás? En iPhone: Ajustes > Tiempo de Uso. En Android: Configuración > Bienestar digital y controles parentales (el nombre puede variar según el modelo).",
          "reference_image": "assets/muestra_captura.png"
        },
        {
          "id": "O2C_IntroSemana2",
          "type": "text_display",
          "section_override": "Esta semana",
          "text": "Ahora mirá el dato de {{VENTANA}}.",
          "date_window": "current_week"
        },
        {
          "id": "O2C_HorasSemana2",
          "type": "hours_minutes",
          "text": "¿Cuánto tiempo en TOTAL usaste el celular en {{VENTANA}} (horas y minutos)?",
          "date_window": "current_week",
          "max_hours": 168,
          "force": true
        },
        {
          "id": "O2C_RankingAppsSemana2",
          "type": "ranking_form",
          "text": "Las 5 apps que más tiempo te consumieron en {{VENTANA}}, con su tiempo de uso (ej: 2h 30m):",
          "date_window": "current_week",
          "n_rows": 5
        },
        {
          "id": "O2C_AperturasSemana2",
          "type": "number_input",
          "text": "¿Cuántas veces abriste el celular (aperturas/desbloqueos) en {{VENTANA}}?",
          "date_window": "current_week",
          "min": 0,
          "max": 500,
          "force": true
        },
        {
          "id": "O2C_CapturaSemana2",
          "type": "file_upload",
          "text": "Subí una captura de {{VENTANA}} (opcional).",
          "date_window": "current_week",
          "help_text": "¿Dónde lo encontrás? En iPhone: Ajustes > Tiempo de Uso. En Android: Configuración > Bienestar digital y controles parentales (el nombre puede variar según el modelo).",
          "reference_image": "assets/muestra_captura.png"
        }
      ]
    },
    {
      "id": "O2_Cierre",
      "wave": 2,
      "title": "Ola 2 -- Cierre",
      "questions": [
        {
          "id": "O2_Cierre",
          "type": "text_display",
          "text": "¡Listo, eso era todo! Muchas gracias por completar las dos partes de la encuesta. Quedás anotado/a en el sorteo."
        }
      ]
    }
  ]
};
