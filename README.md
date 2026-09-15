# Uso del celular -- encuesta web

Encuesta web (Python + HTML/JS) del diseño "Uso del celular" (Trabajo Final,
Topics in Behavioral Economics, UdeSA 2026). Es la herramienta real de
recolección de datos (reemplaza a Qualtrics): cuando alguien la completa en
modo Encuestado, sus respuestas se guardan en una planilla de Google (ver
"Guardar las respuestas en Google Sheets").

## Páginas públicas

- **`site/encuestado.html`** -- el link que se comparte con participantes
  reales para la Ola 1. Arranca directo en modo Encuestado (sin selector de
  modo ni botón de reiniciar), aleatoriza una sola vez entre los 6 brazos
  (T0, T\*, T1, T3, T4, T5 -- 1/6 de probabilidad cada uno) y guarda la
  respuesta al terminar.
- **`site/ola2_tratados.html`** / **`site/ola2_control.html`** -- los dos
  links fijos de la Ola 2 (uno por grupo), para compartir a mano una semana
  después. Como el link no trae el `pid`/`arm` de la persona, la primera
  pregunta le pide el mismo email que usó en la Ola 1 -- así se juntan las
  dos filas después, por email en vez de por `pid`.
- **`site/arbol_experimento.html`** -- explicador visual e interactivo del
  diseño: la aleatorización y cada uno de los 6 brazos (qué mensaje recibe,
  qué mecanismo activa), para quien quiera entender el experimento sin leer
  el código ni el paper de diseño.
- **`site/index.html`** -- Editor de previsualización (uso interno, no para
  participantes): selector de rama y sidebar para revisar todos los bloques
  de cualquier brazo, en cualquier orden.

## Estructura del proyecto

```
webapp/
├── README.md
├── survey_content.py       <- FUENTE DE VERDAD del contenido (Python)
├── build.py                <- genera site/data.js a partir de survey_content.py
├── google_apps_script/
│   └── Code.gs             <- backend: guarda respuestas en Sheets + Drive
└── site/
    ├── encuestado.html        <- pública, Ola 1
    ├── ola2_tratados.html     <- pública, Ola 2, grupo tratado
    ├── ola2_control.html      <- pública, Ola 2, grupo control
    ├── arbol_experimento.html <- explicador visual del diseño
    ├── index.html             <- Editor de previsualización (uso interno)
    ├── app.js                 <- motor genérico (lee data.js, renderiza todo)
    ├── data.js                <- generado por build.py, NO editar a mano
    ├── config.js              <- SURVEY_ENDPOINT (URL del backend)
    ├── style.css
    └── assets/muestra_captura.png
```
