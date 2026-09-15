/**
 * Backend de la encuesta "Uso del celular" -- guarda cada respuesta como una
 * fila en esta planilla de Google. También puede mandar por email la
 * invitación a la Ola 2 siete días después de que alguien termina la Ola 1
 * (función sendOla2Invites, paso 8 más abajo), pero eso es OPCIONAL: por
 * default la Ola 2 se reparte con dos links fijos, uno por grupo
 * (site/ola2_tratados.html y site/ola2_control.html -- ver el README,
 * sección "Ola 2: link fijo por grupo"), sin necesidad de este email
 * automático.
 *
 * CÓMO INSTALAR (una sola vez):
 *   1. Crear una planilla nueva en Google Sheets (el nombre no importa).
 *   2. Extensiones > Apps Script.
 *   3. Borrar el contenido de Code.gs que aparece por defecto y pegar TODO
 *      este archivo en su lugar.
 *   4. Completar SITE_URL más abajo con la URL pública de tu sitio (por
 *      ejemplo, la de GitHub Pages) apuntando a site/encuestado.html -- esa
 *      es la página para quien responde de verdad (arranca directo en modo
 *      Encuestado, sin selector de modo ni botón de reiniciar). site/
 *      index.html es el Editor de previsualización, no se le manda a
 *      participantes.
 *   5. Guardar (ícono de disquete).
 *   6. Implementar > Nueva implementación > tipo "Aplicación web".
 *        - Ejecutar como: Yo (tu cuenta).
 *        - Quién tiene acceso: Cualquier usuario.
 *      Autorizá los permisos que pida Google (es tu propia cuenta).
 *   7. Copiar la URL que te da (termina en /exec) y pegarla como
 *      SURVEY_ENDPOINT en webapp/site/config.js.
 *   8. (Opcional) Si además de los dos links fijos de Ola 2 querés el email
 *      automático de invitación como respaldo: en el editor de Apps Script,
 *      ícono del reloj (Activadores/Triggers) de la barra lateral > Agregar
 *      activador > función "sendOla2Invites", evento "Basado en tiempo" >
 *      "Temporizador de días" > una vez al día (elegí el horario que
 *      prefieras).
 *
 * Cada vez que cambies este código en el editor de Apps Script, hay que
 * hacer "Implementar > Administrar implementaciones > editar (lápiz) >
 * Nueva versión > Implementar" para que los cambios entren en vigencia en
 * la URL ya publicada (si no, sigue sirviendo la versión vieja).
 */

// ------------------------------------------------------------- configuración

// URL pública de tu sitio (GitHub Pages, por ejemplo), apuntando a
// encuestado.html dentro de site/ (la página para participantes reales, NO
// index.html que es el Editor). Se usa para armar el link que se manda por
// email en la invitación a la Ola 2. Completar antes de activar
// sendOla2Invites.
const SITE_URL = "COMPLETAR: https://<tu-usuario>.github.io/<tu-repo>/site/encuestado.html";

const SHEET_NAME = "Respuestas"; // se crea sola si no existe
const DAYS_UNTIL_OLA2 = 7;

// Nombres de columna que el código necesita reconocer por su nombre exacto
// (vienen del payload que manda app.js -- ver submitResponses en site/app.js).
const COL_PID = "pid";
const COL_WAVE = "wave";
const COL_ARM = "arm";
const COL_TIMESTAMP = "timestamp";
const COL_EMAIL = "B0_Email"; // la pregunta de email del Bloque 0
const COL_INVITE_SENT = "ola2_invite_sent";

// Carpeta de Drive (de la cuenta que ejecuta el script) donde se guardan las
// imágenes de las preguntas de tipo Captura de pantalla. Se crea sola la
// primera vez que llega una captura.
const IMAGES_FOLDER_NAME = "Capturas - encuesta Uso del celular";

// ---------------------------------------------------------------- recepción

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = getOrCreateSheet();
    const body = JSON.parse(e.postData.contents);
    const flat = flatten(body);
    extractAndUploadImages(flat);
    appendRow(sheet, flat);
    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// GET solo para probar que el deploy funciona (abrir la URL /exec en el
// navegador tiene que mostrar este mensaje, no un error).
function doGet(e) {
  return ContentService.createTextOutput(
    "OK -- este es el backend de la encuesta 'Uso del celular'. Las respuestas se " +
      "mandan por POST, no por GET."
  );
}

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  return sheet;
}

// Convierte el objeto (que puede tener sub-objetos, como la fecha de
// nacimiento {d,m,y}) en un objeto plano de un solo nivel, con claves tipo
// "B1_FechaNacimiento.y", listas para ser columnas de la planilla.
function flatten(obj, prefix, out) {
  out = out || {};
  prefix = prefix || "";
  Object.keys(obj).forEach(function (k) {
    const val = obj[k];
    const key = prefix ? prefix + "." + k : k;
    if (val !== null && typeof val === "object" && !Array.isArray(val)) {
      flatten(val, key, out);
    } else if (Array.isArray(val)) {
      out[key] = JSON.stringify(val);
    } else {
      out[key] = val;
    }
  });
  return out;
}

// Agrega una fila nueva, creando columnas nuevas en el encabezado si hace
// falta (por ejemplo, la primera vez que llega una respuesta de la Ola 2,
// que tiene preguntas distintas a las de la Ola 1).
function appendRow(sheet, flat) {
  const lastCol = Math.max(sheet.getLastColumn(), 1);
  let headers = sheet.getLastRow() === 0 ? [] : sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  let changed = false;
  Object.keys(flat).forEach(function (k) {
    if (headers.indexOf(k) === -1) {
      headers.push(k);
      changed = true;
    }
  });
  if (sheet.getLastRow() === 0 || changed) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  const row = headers.map(function (h) {
    return flat[h] !== undefined ? flat[h] : "";
  });
  sheet.appendRow(row);
}

// Una pregunta de tipo Captura de pantalla manda desde el navegador un
// objeto { name, dataUrl } (ver renderQuestionInput/"file_upload" en
// site/app.js), que flatten() convierte en dos columnas planas:
// "<id>.name" (el nombre del archivo) y "<id>.dataUrl" (la imagen entera en
// base64). Acá se decodifica ese base64, se sube el archivo a una carpeta
// de Drive, y se reemplaza la columna "<id>.dataUrl" por "<id>.url" con el
// link al archivo ya subido -- así la planilla guarda un link corto en vez
// de un texto de cientos de miles de caracteres (que además supera el
// límite de una celda de Sheets, ~50.000 caracteres).
function extractAndUploadImages(flat) {
  let folder = null;
  const pid = flat[COL_PID] || "sin-pid";
  Object.keys(flat).forEach(function (key) {
    if (key.length < 8 || key.slice(-8) !== ".dataUrl") return;
    const dataUrl = flat[key];
    delete flat[key];
    const baseKey = key.slice(0, -8);
    const urlKey = baseKey + ".url";
    if (typeof dataUrl !== "string" || dataUrl.indexOf("data:") !== 0) return;
    const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
    if (!match) return;
    try {
      if (!folder) folder = getOrCreateImagesFolder();
      const mimeType = match[1];
      const bytes = Utilities.base64Decode(match[2]);
      const nameKey = baseKey + ".name";
      const originalName = flat[nameKey] || "captura";
      const fileName = pid + "_" + baseKey + "_" + originalName;
      const blob = Utilities.newBlob(bytes, mimeType, fileName);
      const file = folder.createFile(blob);
      flat[urlKey] = file.getUrl();
    } catch (err) {
      flat[urlKey] = "ERROR al subir la imagen: " + String(err);
    }
  });
}

function getOrCreateImagesFolder() {
  const folders = DriveApp.getFoldersByName(IMAGES_FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(IMAGES_FOLDER_NAME);
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

// ------------------------------------------------------- invitación a Ola 2

/**
 * Recorre la planilla buscando filas de Ola 1 (wave=1) completadas hace 7
 * días o más, que todavía no recibieron el email de invitación a la Ola 2, y
 * les manda ese email con un link que ya incluye su pid y su arm (así la
 * Ola 2 no tiene que volver a preguntar ni a re-aleatorizar). Pensada para
 * correr sola una vez por día (ver instrucciones de instalación arriba).
 */
function sendOla2Invites() {
  const sheet = getOrCreateSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return; // solo encabezado, nada que hacer todavía

  const headers = data[0];
  const col = {};
  headers.forEach(function (h, i) {
    col[h] = i;
  });
  if (col[COL_WAVE] === undefined || col[COL_TIMESTAMP] === undefined) return;

  let inviteSentCol = col[COL_INVITE_SENT];
  if (inviteSentCol === undefined) {
    inviteSentCol = headers.length;
    sheet.getRange(1, inviteSentCol + 1).setValue(COL_INVITE_SENT);
  }

  const now = new Date();
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[col[COL_WAVE]]) !== "1") continue; // solo filas de Ola 1
    if (row[inviteSentCol] === "sí") continue; // ya se le mandó

    const ts = new Date(row[col[COL_TIMESTAMP]]);
    const diffDays = (now - ts) / (1000 * 60 * 60 * 24);
    if (diffDays < DAYS_UNTIL_OLA2) continue; // todavía no pasó una semana

    const email = col[COL_EMAIL] !== undefined ? row[col[COL_EMAIL]] : "";
    const pid = row[col[COL_PID]];
    const arm = row[col[COL_ARM]];
    if (!email || !pid || !arm) continue; // falta algo, no se puede invitar

    const link =
      SITE_URL + "?wave=2&pid=" + encodeURIComponent(pid) + "&arm=" + encodeURIComponent(arm);

    MailApp.sendEmail({
      to: email,
      subject: "Segunda parte de la encuesta -- Uso del celular",
      body:
        "Hola,\n\n" +
        "Hace una semana completaste la primera parte de la encuesta sobre uso del " +
        "celular (Universidad de San Andrés). Ahora te pedimos unos 3 minutos más para " +
        "la segunda y última parte:\n\n" +
        link +
        "\n\n¡Gracias por tu participación!",
    });

    sheet.getRange(i + 1, inviteSentCol + 1).setValue("sí");
  }
}
