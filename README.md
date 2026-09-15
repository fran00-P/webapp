# Uso del celular -- encuesta web

Encuesta web (Python + HTML/JS) del diseño de "Uso del celular" (Trabajo
Final, Topics in Behavioral Economics, UdeSA 2026). Además de servir para
revisar el flujo completo -- todas las ramas, todos los bloques, la Ola 1 y
la Ola 2 -- esta versión es la que se usa para recolectar los datos reales
(reemplaza a Qualtrics): cuando alguien la completa en modo Encuestado, sus
respuestas se guardan en una planilla de Google (ver "Guardar las
respuestas en Google Sheets" más abajo), y 7 días después recibe
automáticamente por email el link a la Ola 2.

Las preguntas de tipo Captura de pantalla suben la imagen elegida a Google
Drive (además de guardar su nombre) -- ver la nota al final de esa sección.

## Cómo verlo

Hay dos páginas, para dos usos distintos (ver también "Los dos modos" más
abajo):

- **`site/index.html`** -- el Editor de previsualización: arranca en modo
  Editor, con selector de rama y sidebar, para revisar el contenido
  completo (todas las ramas, todos los bloques). Es para vos, no para
  participantes.
- **`site/encuestado.html`** -- la página para quien responde de verdad:
  arranca directo en modo Encuestado, sin selector de modo ni botón de
  reiniciar. **Este es el link que se comparte públicamente.**

**Opción más simple:** abrir cualquiera de los dos archivos directamente
con el navegador (doble click, o `Archivo > Abrir`). No hace falta instalar
nada.

**Alternativa (recomendada si el navegador se queja de rutas locales):**

```bash
cd site
python3 -m http.server 8000
```

y abrir `http://localhost:8000/index.html` o `http://localhost:8000/encuestado.html`
en el navegador.

**GitHub Pages:** si este repo se sube a GitHub, se puede activar GitHub
Pages apuntando a la carpeta `site/` (Settings → Pages → Branch: main,
folder: `/site`) para tener links públicos:

- `https://<usuario>.github.io/<repo>/site/index.html` -- Editor (para vos).
- `https://<usuario>.github.io/<repo>/site/encuestado.html` -- **el link que
  se les manda a los participantes reales** (es también la URL que hay que
  usar como `SITE_URL` en el backend, ver abajo).

### Cómo subir esta carpeta a GitHub (una sola vez)

1. En GitHub, crear un repositorio nuevo (puede ser privado -- GitHub Pages
   funciona igual con repos privados si tenés GitHub Pro, o público si no).
   No hace falta crear ningún archivo al crearlo (sin README, sin
   `.gitignore`: ya están en esta carpeta).
2. Desde esta carpeta (`webapp/`), en una terminal:
   ```bash
   git init
   git add .
   git commit -m "Encuesta Uso del celular"
   git branch -M main
   git remote add origin https://github.com/<usuario>/<repo>.git
   git push -u origin main
   ```
   (Si preferís no usar la terminal, GitHub Desktop hace lo mismo: "Add
   existing repository" apuntando a esta carpeta, y después "Publish
   repository".)
3. En GitHub: `Settings > Pages` → "Build and deployment" → Source:
   "Deploy from a branch" → Branch: `main`, carpeta `/site` → Save. Github
   tarda uno o dos minutos en publicar; la URL pública aparece arriba, en
   esa misma pantalla de Settings > Pages.
4. Ese link + `/encuestado.html` es el que se comparte con los
   participantes. Ese link + `/index.html` es el Editor, para uso interno.
5. Cada vez que cambies algo (contenido, código), desde `webapp/`:
   ```bash
   git add .
   git commit -m "Describir el cambio"
   git push
   ```
   GitHub Pages se actualiza solo (de nuevo, tarda uno o dos minutos).

## Guardar las respuestas en Google Sheets

Cuando alguien completa la encuesta en modo Encuestado, `site/app.js` manda
sus respuestas por POST a una URL configurable (`window.SURVEY_ENDPOINT`,
en `site/config.js`). Esa URL es un "Web App" de Google Apps Script que
agrega cada respuesta como una fila nueva en una planilla de Google. El modo
Editor nunca manda nada -- solo Encuestado, y solo al terminar cada ola.

**Instalación (una sola vez, la hace quien es dueño de la planilla):**

1. Crear una planilla nueva en Google Sheets.
2. `Extensiones > Apps Script`, borrar el contenido por defecto y pegar
   todo el archivo `google_apps_script/Code.gs` de esta carpeta.
3. En ese código, completar la constante `SITE_URL` con la URL pública del
   sitio (por ejemplo, la de GitHub Pages) apuntando a `site/encuestado.html`
   -- esa es la página para participantes reales, no `site/index.html` (el
   Editor).
4. Guardar, y `Implementar > Nueva implementación` → tipo "Aplicación web"
   → Ejecutar como "Yo" → Quién tiene acceso "Cualquier usuario". Autorizar
   los permisos (son de tu propia cuenta de Google).
5. Copiar la URL que termina en `/exec` y pegarla como valor de
   `SURVEY_ENDPOINT` en `webapp/site/config.js`. Volver a publicar/subir
   `site/` (por ejemplo, `git push` si usás GitHub Pages).
6. *(Opcional -- ver más abajo "Ola 2: link fijo por grupo").* Si igual
   querés tener el email automático de invitación a la Ola 2 como respaldo:
   en el editor de Apps Script, ícono del reloj (Activadores) → Agregar
   activador → función `sendOla2Invites` → evento "Basado en tiempo" →
   "Temporizador de días" → una vez al día.

Cada respuesta completa (Ola 1 u Ola 2) se guarda como una fila, con una
columna por pregunta más `pid` (identificador de esa persona, generado en
el navegador), `wave` (1 o 2), `arm` y `timestamp`. Cómo juntar las dos olas
de una misma persona depende de por qué entrada llegó la Ola 2 (ver la
sección siguiente):

- Si entró por el **link automático** (`?wave=2&pid=...&arm=...`): su `pid`
  es el mismo que en su fila de la Ola 1 -- juntar con `merge`/`VLOOKUP` por
  `pid`, y `arm` ya viene con el brazo real que le tocó (T0/T*/T1/T3/T4/T5).
- Si entró por uno de los **dos links fijos de Ola 2** (`ola2_tratados.html`
  / `ola2_control.html`): su `pid` de Ola 2 es nuevo y no coincide con el de
  su Ola 1, así que hay que juntar por **email** en cambio (columna
  `O2T_Email` u `O2C_Email` de la fila de Ola 2, contra `B0_Email` de su
  fila de Ola 1). Además, en estas filas `arm` NO es el brazo real -- va a
  decir `"TRATADO"` (grupo tratado, sin precisar cuál de los 5 brazos le
  tocó) o `"T0"` (control, ese sí exacto). El brazo real de esa persona está
  en su fila de Ola 1, identificable por el email.

## Ola 2: link fijo por grupo (reemplaza al email automático)

En vez de que cada persona reciba un email individual con un link que ya
trae su `pid`/`arm` (`sendOla2Invites`, arriba), hay dos páginas con un
único link fijo, igual para todos los de ese grupo, para compartir a mano
en la segunda semana:

- `site/ola2_tratados.html` -- para todo el grupo tratado (T*/T1/T3/T4/T5).
- `site/ola2_control.html` -- para el grupo control (T0).

Arrancan directo en la Ola 2 correspondiente (sin selector de modo ni botón
de reiniciar, igual que `encuestado.html`), y como el link no trae ningún
dato de la persona, la primera pregunta le pide que escriba el mismo email
que usó en la Ola 1 -- es lo que permite juntar después las dos filas (ver
arriba). El trigger `sendOla2Invites` queda en el código sin usarse por
default; si en algún momento se prefiere volver al email automático
personalizado, alcanza con activar el trigger del punto 6 y usar
`site/encuestado.html?wave=2&pid=...&arm=...` en vez de estos dos links.

Mientras `SURVEY_ENDPOINT` diga `"COMPLETAR..."`, la encuesta funciona
igual (se puede completar en modo Encuestado) pero ninguna respuesta se
guarda en ningún lado -- queda solo en la memoria del navegador y se pierde
al cerrar la pestaña. Útil para seguir probando el diseño sin ensuciar la
planilla real.

*Nota sobre la Captura de pantalla:* esta pregunta (Bloque 5 y Ola 2) manda
la imagen elegida (en base64) junto con el resto de las respuestas. El
backend (Code.gs) la decodifica y la sube a una carpeta de Google Drive de
la cuenta que tiene implementado el Web App -- se llama "Capturas - encuesta
Uso del celular" y se crea sola la primera vez que llega una captura. En la
planilla, la columna `*_Captura.url` queda con el link directo al archivo
en Drive (y `*_Captura.name` sigue guardando el nombre original del
archivo). Como el Web App corre "como" la cuenta que lo implementó, esos
links solo son accesibles para esa cuenta (o para quien esa cuenta decida
compartirlos) -- no son públicos.

Al reimplementar Code.gs con este cambio (Implementar > Administrar
implementaciones > Nueva versión), la primera vez que llegue una captura
Google puede pedir de nuevo autorización de permisos, porque ahora el
script también usa Drive (antes solo usaba Sheets y Gmail). Es el mismo
paso de autorización del punto 6 de instalación, solo que con un permiso
más para aceptar.

Las capturas de pantalla pueden pesar varios MB; el navegador rechaza subir
un archivo de más de 10 MB (se le avisa a la persona para que elija una
imagen más liviana).

## Los dos modos

En la esquina superior derecha de la página hay un selector de modo:

- **Editor (previsualización):** para navegar libremente. Hay un selector
  de "Rama a previsualizar" (T0, T*, T1, T3, T4, T5) y una lista de
  todos los bloques en la barra lateral -- se puede saltar a cualquier
  bloque, ir y volver, y cambiar de rama en cualquier momento. Los bloques
  o preguntas que no se le muestran a la rama elegida (por ejemplo, la
  Medición real para el Control) igual se pueden ver, con una nota
  aclarando que en la encuesta real no se le mostrarían a esa rama.

- **Encuestado (completar de verdad):** es la experiencia real de un
  participante -- `site/encuestado.html` arranca directo acá, sin que nadie
  tenga que elegir nada (y sin selector de modo ni botón de reiniciar,
  a diferencia de `index.html`). Una sesión normal (abriendo `encuestado.html`
  directo, o el link de GitHub Pages sin parámetros) es siempre la Ola 1: se
  aleatoriza una sola vez, en un único sorteo uniforme entre los 6 brazos
  (T0/T*/T1/T3/T4/T5, 1/6 de probabilidad cada uno), los bloques se saltean
  según corresponda (display logic), hay que responder las preguntas
  obligatorias para avanzar, y los mensajes de comparación usan las
  respuestas reales que cargaste (piped text). Al terminar la Ola 1 se
  guarda la respuesta (ver sección anterior) y la sesión termina ahí --
  **no** sigue de largo a la Ola 2 en la misma sentada. La Ola 2 es una
  sesión aparte, que arranca sola cuando la persona hace click en el link
  que le llega por email 7 días después (ese link ya trae su `pid` y su
  `arm`, así que no vuelve a pasar por el Bloque 0-4 ni se re-aleatoriza).

  Para revisar el flujo de la Ola 2 sin esperar 7 días de verdad, se puede
  abrir a mano una URL con esos parámetros, por ejemplo:
  `site/encuestado.html?wave=2&pid=prueba-1&arm=T3` (cualquier `pid` sirve
  para probar; `arm` tiene que ser uno de T0, T*, T1, T3, T4, T5).

## Estructura del proyecto

```
webapp/
├── README.md               <- este archivo
├── .gitignore
├── survey_content.py       <- FUENTE DE VERDAD del contenido (Python)
├── build.py                <- genera site/data.js a partir de survey_content.py
├── google_apps_script/
│   └── Code.gs             <- backend: guarda respuestas + manda invitación a Ola 2
└── site/
    ├── index.html           <- Editor de previsualización (uso interno)
    ├── encuestado.html       <- página pública, Ola 1 (participantes reales)
    ├── ola2_tratados.html    <- página pública, Ola 2 -- grupo tratado
    ├── ola2_control.html     <- página pública, Ola 2 -- grupo control
    ├── style.css
    ├── config.js            <- SURVEY_ENDPOINT (la URL del backend). Editar a mano.
    ├── app.js               <- motor genérico (lee data.js y renderiza todo;
    │                           compartido por index.html y encuestado.html)
    ├── data.js               <- generado por build.py, NO editar a mano
    └── assets/
        └── muestra_captura.png  <- imagen de referencia para las preguntas
                                    de Captura de pantalla
```

## Cómo editar el contenido de la encuesta

Todo el contenido (títulos, preguntas, opciones, mensajes, display logic)
vive en `survey_content.py`, como estructuras de datos de Python -- no hay
que tocar HTML/JS para cambiar una pregunta. Después de editar ese
archivo:

```bash
python3 build.py
```

Esto regenera `site/data.js`. Recargar `site/index.html` (o
`site/encuestado.html`) en el navegador para ver los cambios -- ambas
páginas leen del mismo `data.js`.

### Cómo agregar una pregunta nueva

Agregar un diccionario a la lista `questions` del bloque que corresponda,
por ejemplo:

```python
{
    "id": "B1_NuevaPregunta",
    "type": "mc_single",
    "text": "¿Texto de la pregunta?",
    "choices": ["Opción A", "Opción B"],
    "force": True,
},
```

Tipos de pregunta disponibles (`type`): `text_display`, `mc_single`,
`email`, `date_ymd`, `hours_per_day` (selector 0-24), `number_slider`,
`number_input`, `matrix_likert`, `ranking_form`, `file_upload`. Ver los
comentarios al principio de `survey_content.py` para el detalle de cada
uno.

### Cómo agregar o cambiar la lógica de salto (display logic)

A nivel de bloque completo (`display_if` en el diccionario del bloque) o a
nivel de una pregunta puntual (`display_if` en el diccionario de la
pregunta):

```python
"display_if": {"field": "Tratado", "op": "eq", "value": 1}
```

`field` puede ser `"Tratado"` (0/1, derivado de la rama), `"Brazo"`
(`"T0"`..`"T5"`), o el `id` de cualquier pregunta anterior (por ejemplo,
`"B6_Y2a_RecordatorioDiario"` comparado contra `"Sí"`).

### Mensajes calculados (Bloque 5b) y estilo de caja

El Bloque 5b ("Mensaje de comparación") ya no es un solo texto: son varias
preguntas `text_display` separadas, cada una en su propio recuadro:

- **`B5_Comparacion`** (recuadro verde, `"variant": "comparison"`): el dato
  objetivo -- cuánto dijiste que usabas vs. cuánto usaste en realidad, con
  la diferencia desarrollada en horas y en % ("un 33% por debajo de tu
  propia percepción", etc.). Se les muestra a los 4 brazos tratados por
  igual.
- **`B5_T3_Mensaje`, `B5_T4_Mensaje`, `B5_T5_Mensaje`** (recuadro ámbar,
  `"variant": "nudge"`): el mensaje específico de cada brazo, en una caja
  visualmente distinta de la comparación. T1 no tiene mensaje adicional -- la
  comparación sola es su tratamiento.

Dos de estos mensajes no usan piping simple de `{{TOKEN}}` sino un campo
`"compute"` que le dice a `app.js` que arme el texto con una fórmula:

- `"compute": "comparacion_uso"` (en `B5_Comparacion`): calcula la
  diferencia entre `B2_PriorHoras` y `B5_HorasReales`, en horas y en %.
- `"compute": "t3_esperanza_vida"` (en `B5_T3_Mensaje`): calcula la edad
  real de la persona a partir de `B1_FechaNacimiento`, los años de vida
  restantes contra la esperanza de vida de Argentina (77,3 años,
  INDEC/Naciones Unidas 2023, guardada como constante `LIFE_EXPECTANCY_AR`
  en `app.js`), y los años enteros equivalentes que habrá pasado mirando la
  pantalla si sostiene su uso real medido (`B5_HorasReales`) el resto de su
  vida. En modo Editor, sin respuestas reales todavía, usa valores de
  ejemplo (25 años, igual que antes).

  *Nota sobre la esperanza de vida:* se usa un valor fijo y citado (INDEC/UN
  2023) en vez de llamar en vivo a una API externa (por ejemplo, la del
  Banco Mundial, indicador `SP.DYN.LE00.IN`), para no depender de que ese
  servicio esté arriba justo cuando alguien está respondiendo la encuesta,
  y para no pedir un permiso de red extra en `index.html`. Si se quisiera un
  valor por país en vivo, el lugar para agregarlo es la función
  `computeT3HTML` en `app.js` (reemplazar la constante por un `fetch` a esa
  API).

Para agregar un nuevo mensaje calculado: escribir la función en `app.js`
(cerca de `computeComparacionHTML` / `computeT3HTML`), registrarla en
`computeDisplayText`, y en `survey_content.py` ponerle `"compute": "<nombre>"`
a la pregunta (dejando `"text"` solo como referencia legible).

## Qué falta / decisiones pendientes (para cuando se retome)

- El 9no ítem invertido del Bloque 3 (Likert) -- confirmar si se deja o se
  saca.
- Esta encuesta web pasó a ser la herramienta real de recolección (en vez
  de Qualtrics). El envío del email de invitación a la Ola 2 ya está
  resuelto (`sendOla2Invites` en `google_apps_script/Code.gs`, corriendo
  una vez al día); lo que falta simular/implementar todavía es el
  recordatorio diario y el envío de la guía de acción (Bloque 7,
  preguntas B7_ConfirmaRecordatorio / B7_ConfirmaGuia) -- hoy esas
  respuestas quedan guardadas en la planilla, pero nada dispara el email
  en sí. Se podría agregar con más funciones tipo `sendOla2Invites` en el
  mismo `Code.gs`, filtrando por esas columnas.
- La carpeta `Qualtrics/` del trabajo (fuera de este `webapp/`) queda como
  documentación de un diseño anterior -- ya no se usa para recolectar datos
  reales, y no refleja los últimos cambios (ranking en tiempo en vez de %,
  captura obligatoria, T2 sacado, aleatorización uniforme entre 5 brazos,
  formato horas+minutos, etc.). Si se quiere, se puede borrar o dejar solo
  como referencia histórica.
- El diseño pasó de 6 a 5 brazos (se sacó T2 -- Norma social). El
  `uso_celular.tex` (Trabajo Final, fuera de `webapp/`) todavía documenta
  los 6 brazos originales en su tabla de la Sección "Estructura de la
  encuesta" -- si se quiere, hay que actualizar esa tabla y cualquier
  cálculo de poder o de tamaño de muestra que haya asumido 6 brazos.
- Antes de mandar el link real a participantes, conviene probar el
  circuito completo una vez con vos mismo como "conejillo de indias":
  completar la Ola 1 de verdad, revisar que la fila aparezca en la
  planilla, y (para no esperar 7 días) probar la Ola 2 abriendo a mano
  `site/index.html?wave=2&pid=<el pid que te tocó>&arm=<tu arm>` -- esos
  dos valores quedan guardados como columnas en la fila de tu Ola 1.
- Este prototipo cubre "Uso del celular". El segundo tema del trabajo
  ("Donación e información") todavía no tiene su propia versión acá.
