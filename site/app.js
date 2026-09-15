// Motor genérico de la encuesta -- lee window.SURVEY_DATA (generado por
// build.py a partir de survey_content.py) y renderiza dos modos:
//   - "editor": para navegar libremente entre bloques y ramas (T0..T5) y
//     revisar el contenido de la encuesta, sin tener que completarla.
//   - "respondent": para completarla de verdad, con aleatorización real,
//     validaciones y lógica de salto (display logic) como en Qualtrics.
//
// No se manda nada a ningún servidor: todo vive en memoria del navegador.

(function () {
  "use strict";

  const DATA = window.SURVEY_DATA;
  const BLOCKS = DATA.blocks;
  const ARMS = DATA.arms;
  const ARM_LABELS = DATA.arm_labels;

  // Valores de ejemplo para pipear texto en modo Editor (cuando no hay una
  // respuesta real todavía, porque no se completó la encuesta).
  const EXAMPLE_VALUES = {
    B2_PriorHoras: { h: 21, m: 0 },
    B5_HorasReales: { h: 14, m: 0 },
    B2_HorasDeseadas: { h: 2, m: 0 },
    B1_FechaNacimiento: { d: "1", m: "1", y: "2001" },
  };

  // Esperanza de vida en Argentina (INDEC/Naciones Unidas, 2023), usada para
  // personalizar el nudge de T3. Valor fijo y citable -- ver nota en
  // survey_content.py sobre por qué no se llama a una API externa (World
  // Bank, etc.) desde este prototipo offline.
  const LIFE_EXPECTANCY_AR = 77.3;

  const MONTHS = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];

  // Página "estrictamente Encuestado" (site/encuestado.html): esa página
  // define window.LOCKED_RESPONDENT = true antes de cargar este archivo, así
  // arranca directo en modo Encuestado, sin selector de modo ni botón de
  // reiniciar -- ver updateModeUI() y los listeners de mode-select/
  // restart-btn más abajo. index.html (el Editor) no define esta variable,
  // así que se comporta exactamente igual que antes.
  const LOCKED_RESPONDENT = window.LOCKED_RESPONDENT === true;

  // Páginas de Ola 2 de link fijo (ola2_tratados.html / ola2_control.html):
  // reemplazan al email automático de invitación (que llevaba pid/arm en la
  // URL) por un único link por grupo, compartido a mano. Como ese link no
  // trae pid/arm de nadie en particular, cada persona se autoidentifica con
  // su email al empezar (ver O2T_Email/O2C_Email en survey_content.py), y
  // eso es lo que hay que usar después para juntar esa fila con la de su
  // Ola 1 -- NO el "arm" guardado, que acá es solo "TRATADO" o "T0" (no se
  // sabe cuál de los brazos tratados le tocó realmente; eso está en su fila
  // de Ola 1). window.FIXED_WAVE2_GROUP vale "tratados" o "control".
  const FIXED_WAVE2_GROUP = window.FIXED_WAVE2_GROUP || null;
  const FIXED_WAVE2_ARM = { tratados: "TRATADO", control: "T0" };

  // ------------------------------------------------------------------ state
  const state = {
    mode: LOCKED_RESPONDENT ? "respondent" : "editor",
    editor: { armIndex: 0, blockIndex: 0 },
    respondent: {
      answers: {},
      blockIndex: 0,
      arm: null,
      pid: null,
      entryWave: 1,
      submitted: false,
      ended: false,
      endMessage: "",
    },
  };

  // -------------------------------------------------------------- helpers

  // "Tratado" = 1 significa "ve su uso real medido en la Ola 1" (se le
  // muestra el Bloque 5 y, en la Ola 2, sigue el camino O2_Tratados). NO
  // significa "recibe un mensaje de tratamiento": T* es Tratado=1 (ve su uso
  // real) pero no recibe la comparación Prior-Real ni ningún mensaje
  // adicional -- ver display_if de cada pregunta del Bloque 5b.
  function armTratado(arm) {
    return arm === "T0" ? 0 : 1;
  }

  function evalCondition(cond, answers, arm) {
    if (!cond) return true;
    let value;
    if (cond.field === "Tratado") value = armTratado(arm);
    else if (cond.field === "Brazo") value = arm;
    else value = answers[cond.field];
    if (cond.op === "eq") return value === cond.value;
    if (cond.op === "ne") return value !== cond.value;
    if (cond.op === "in") return Array.isArray(cond.value) && cond.value.indexOf(value) !== -1;
    return true;
  }

  function pipeText(text, block, answers) {
    if (!block.pipe_map) return text;
    let out = text;
    for (const token of Object.keys(block.pipe_map)) {
      const qid = block.pipe_map[token];
      let val = answers[qid];
      if (val === undefined || val === null || val === "") {
        val = EXAMPLE_VALUES[qid] !== undefined ? EXAMPLE_VALUES[qid] + " (ejemplo)" : "___";
      }
      out = out.split("{{" + token + "}}").join(val);
    }
    return out;
  }

  // Devuelve {val, isExample}: la respuesta real guardada, o (si no hay
  // ninguna todavía, típicamente en modo Editor) el valor de ejemplo
  // correspondiente, marcado como tal.
  function getPipedValue(qid, answers) {
    let val = answers[qid];
    let isExample = false;
    let empty;
    if (val === undefined || val === null || val === "") {
      empty = true;
    } else if (typeof val === "object") {
      // Dos formas de objeto guardan piped values acá: {h,m} (hours_minutes)
      // y {d,m,y} (date_ymd). Se distinguen por la presencia de "h" -- ojo
      // que h=0 y m=0 son respuestas válidas (no "vacío"), por eso no se
      // puede usar un chequeo genérico "falsy" acá.
      if (Object.prototype.hasOwnProperty.call(val, "h")) {
        empty = val.h === undefined || val.h === null || val.h === "";
      } else if (Object.prototype.hasOwnProperty.call(val, "y")) {
        empty = !val.y || !val.m || !val.d;
      } else {
        empty = false;
      }
    } else {
      empty = false;
    }
    if (empty) {
      val = EXAMPLE_VALUES[qid];
      isExample = true;
    }
    return { val, isExample };
  }

  // Convierte un valor {h, m} (hours_minutes) a horas decimales, para poder
  // hacer cuentas (diferencias, %, proyecciones). hoursToLabel hace el
  // camino inverso, para mostrar una diferencia calculada en el mismo
  // formato "Xh Ym" que usa la pregunta.
  function toDecimalHours(hm) {
    if (!hm || hm.h === undefined || hm.h === null || hm.h === "") return NaN;
    return Number(hm.h) + Number(hm.m || 0) / 60;
  }

  function formatHM(hm) {
    return hm.h + "h " + (hm.m !== undefined ? hm.m : 0) + "m";
  }

  function hoursToLabel(decimalHours) {
    const totalMinutes = Math.round(Math.abs(decimalHours) * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return h + "h " + m + "m";
  }

  // Ventanas de fecha ("últimos 7 días", "semana pasada", "esta semana"),
  // calculadas con la fecha real del dispositivo en el momento en que la
  // persona está respondiendo (no una fecha fija ni la de la Ola 1). Se
  // insertan en cualquier texto que lleve el token {{VENTANA}} junto con un
  // campo "date_window" en la pregunta -- ver applyDateWindow más abajo.
  function formatDateEs(d) {
    return d.getDate() + " de " + MONTHS[d.getMonth()].toLowerCase();
  }

  function formatDateRangeEs(start, end) {
    const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
    const sameYear = start.getFullYear() === end.getFullYear();
    const startLabel = sameMonth ? String(start.getDate()) : formatDateEs(start);
    let endLabel = formatDateEs(end);
    if (!sameYear) endLabel += " de " + end.getFullYear();
    return "del " + startLabel + " al " + endLabel;
  }

  function computeWindowLabel(kind) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let start, end, noun;
    if (kind === "prior_week") {
      // Ola 2 -- Control, "semana pasada": de hace 14 días a hace 8 días.
      end = new Date(today);
      end.setDate(end.getDate() - 8);
      start = new Date(today);
      start.setDate(start.getDate() - 14);
      noun = "la semana pasada";
    } else if (kind === "current_week") {
      // Ola 2 -- Control, "esta semana": los últimos 7 días (mismo cálculo
      // que "last7", nombre distinto porque en Control se contrasta contra
      // "prior_week").
      end = today;
      start = new Date(today);
      start.setDate(start.getDate() - 6);
      noun = "esta última semana";
    } else {
      // "last7": los últimos 7 días terminando hoy -- Ola 1 y Ola 2 (Tratados).
      end = today;
      start = new Date(today);
      start.setDate(start.getDate() - 6);
      noun = "los últimos 7 días";
    }
    return noun + " (" + formatDateRangeEs(start, end) + ")";
  }

  function applyDateWindow(text, q) {
    if (!q.date_window) return text;
    return text.split("{{VENTANA}}").join(computeWindowLabel(q.date_window));
  }

  function calcAge(dob) {
    const now = new Date();
    const y = Number(dob.y), m = Number(dob.m), d = Number(dob.d);
    let age = now.getFullYear() - y;
    const hadBirthdayThisYear =
      now.getMonth() + 1 > m || (now.getMonth() + 1 === m && now.getDate() >= d);
    if (!hadBirthdayThisYear) age -= 1;
    return age;
  }

  // Caja 1 del Bloque 5b: compara Prior vs. Real y desarrolla la diferencia
  // (en horas y en %, y de qué lado quedó la persona), no solo los dos
  // números pelados.
  function computeComparacionHTML(block, answers) {
    const prior = getPipedValue(block.pipe_map.PRIOR, answers);
    const real = getPipedValue(block.pipe_map.REAL, answers);
    const priorHours = toDecimalHours(prior.val);
    const realHours = toDecimalHours(real.val);
    const priorLabel = formatHM(prior.val) + (prior.isExample ? " (ejemplo)" : "");
    const realLabel = formatHM(real.val) + (real.isExample ? " (ejemplo)" : "");

    let diffSentence = "";
    if (!isNaN(priorHours) && !isNaN(realHours)) {
      const diff = realHours - priorHours;
      if (Math.abs(diff) < 5 / 60) {
        // Menos de 5 minutos de diferencia: no vale la pena hilar fino.
        diffSentence = "Tu estimación coincidió casi exactamente con tu uso real.";
      } else {
        // Si el prior es muy chico (menos de 1 hora), un % relativo a esa
        // base puede dar un número absurdamente grande (ej: pasar de 0h15m a
        // 10h es "+3900%") y no aporta nada -- en ese caso se muestra solo la
        // diferencia en horas y minutos, sin el %.
        const pct = priorHours >= 1 ? Math.round((Math.abs(diff) / priorHours) * 100) : null;
        const diffLabel = hoursToLabel(diff);
        if (diff > 0) {
          diffSentence =
            "Eso es <b>" + diffLabel + " más</b> de lo que habías estimado" +
            (pct !== null ? " -- un <b>" + pct + "%</b> por encima de tu propia percepción." : ".");
        } else {
          diffSentence =
            "Eso es <b>" + diffLabel + " menos</b> de lo que habías estimado" +
            (pct !== null ? " -- un <b>" + pct + "%</b> por debajo de tu propia percepción." : ".");
        }
      }
    }

    return (
      "Vos dijiste que habías usado <b>" + priorLabel + "</b> la semana pasada. " +
      "Según tu propio celular, en realidad usaste <b>" + realLabel + "</b>." +
      "<br><br>" + diffSentence
    );
  }

  // Mensaje de T3 (costo de oportunidad), personalizado con la edad real del
  // respondiente y su uso real medido, contra la esperanza de vida de
  // Argentina. Es una función pura de (edad, uso real): a igual edad e igual
  // uso, dos personas ven exactamente el mismo cálculo -- no depende de nada
  // más que esos dos datos y la constante LIFE_EXPECTANCY_AR, así que es
  // reproducible.
  //
  // Caso límite: para edades cercanas o por encima de la esperanza de vida,
  // "años que te quedan" daría un piso artificial de 1 año (para no mostrar
  // 0 o negativo) y frases raras como "más de 0 años enteros". En ese caso
  // se cambia el marco del mensaje: en vez de proyectar años restantes, se
  // muestra el equivalente acumulado a lo largo de la vida ya vivida, y en
  // meses en vez de años si el número da bajo.
  // Elige la unidad más chica que dé un número >= 1 (años > meses > días), en
  // vez de redondear a "0 meses" cuando la cantidad de años/horas es muy
  // baja -- eso es lo que produce mensajes raros para edades/usos chicos.
  // Si ni siquiera llega a 1 día completo, se muestra "menos de 1 día" en
  // vez de "0 días" (0 sería un mensaje falso si el uso real es > 0).
  // El mensaje de T3 muestra el uso diario (dailyHours) Y, por separado, el
  // equivalente proyectado (formatMagnitude) -- este último SIEMPRE se
  // calcula con la precisión completa de dailyHours, nunca con el número ya
  // redondeado que se muestra. Si dailyHours es chico (< 1 hora/día, típico
  // cuando el uso semanal real es bajo), 1 sola decimal pierde demasiada
  // precisión relativa: ej. 0.142857 -> "0.1", y alguien que multiplique
  // "0.1 horas x 61 años" a mano obtiene ~3 meses, no los ~4 meses que
  // realmente da la cuenta (hecha con 0.142857) -- una inconsistencia
  // visible entre los dos números del mismo mensaje. Por eso, para usos
  // bajos, se muestran 2 decimales (ej. "0.14"), que sí reconstruyen el
  // equivalente mostrado.
  function formatDailyHours(dailyHours) {
    return dailyHours < 1 ? dailyHours.toFixed(2) : dailyHours.toFixed(1);
  }

  function formatMagnitude(yearsEquivalent) {
    if (yearsEquivalent >= 1) {
      return "<b>más de " + Math.floor(yearsEquivalent) + " años enteros</b>";
    }
    const monthsEquivalent = yearsEquivalent * 12;
    if (monthsEquivalent >= 1) {
      return "<b>" + Math.round(monthsEquivalent) + " meses</b>";
    }
    const daysEquivalent = yearsEquivalent * 365.25;
    if (daysEquivalent >= 1) {
      return "<b>" + Math.round(daysEquivalent) + " días</b>";
    }
    return "<b>menos de 1 día</b>";
  }

  function computeT3HTML(block, answers) {
    const real = getPipedValue(block.pipe_map.REAL, answers);
    const realWeeklyHours = toDecimalHours(real.val);
    const dailyHours = isNaN(realWeeklyHours) ? 0 : realWeeklyHours / 7;

    let dob = answers["B1_FechaNacimiento"];
    let isExampleAge = false;
    if (!dob || !dob.y || !dob.m || !dob.d) {
      dob = EXAMPLE_VALUES.B1_FechaNacimiento;
      isExampleAge = true;
    }
    const age = calcAge(dob);
    const ageLabel = age + (isExampleAge ? " (ejemplo)" : "");

    // Si el uso real reportado fue cero, no hay ritmo que proyectar: el
    // cálculo daría siempre "menos de 1 día"/"0 meses" sin aportar nada.
    if (dailyHours <= 0) {
      return (
        "Según lo que reportaste, tu uso real esta semana fue de <b>0 horas</b>, así que " +
        "no hay un ritmo de uso para proyectar en el tiempo. (La esperanza de vida en " +
        "Argentina es de <b>77,3 años</b> -- INDEC/Naciones Unidas, 2023 -- por si te " +
        "sirve de referencia para más adelante.)"
      );
    }

    if (age >= LIFE_EXPECTANCY_AR) {
      const yearsEquivalentSoFar = (dailyHours / 24) * age;
      return (
        "Pensá lo que implica ese ritmo sostenido en el tiempo: la esperanza de vida " +
        "en Argentina es de <b>77,3 años</b> (INDEC/Naciones Unidas, 2023). Vos tenés " +
        "<b>" + ageLabel + " años</b>. Si hubieras mantenido un uso de <b>" +
        formatDailyHours(dailyHours) + " horas por día</b> a lo largo de toda tu vida, ya habrías " +
        "pasado el equivalente a " + formatMagnitude(yearsEquivalentSoFar) + " -- día y " +
        "noche, sin parar -- mirando la pantalla."
      );
    }

    const remaining = Math.max(1, Math.round(LIFE_EXPECTANCY_AR - age));
    const yearsEquivalent = (dailyHours / 24) * remaining;

    return (
      "Pensá lo que implica sostener ese ritmo en el tiempo: la esperanza de vida " +
      "en Argentina es de <b>77,3 años</b> (INDEC/Naciones Unidas, 2023). Vos tenés " +
      "<b>" + ageLabel + " años</b>, así que -- en promedio -- te quedarían unos " +
      "<b>" + remaining + " años más</b> de vida.<br><br>Si mantenés un uso de " +
      "<b>" + formatDailyHours(dailyHours) + " horas por día</b> durante todo ese tiempo, vas a " +
      "haber pasado el equivalente a " + formatMagnitude(yearsEquivalent) + " -- día y " +
      "noche, sin parar -- mirando la pantalla."
    );
  }

  function computeDisplayText(kind, block, answers) {
    if (kind === "comparacion_uso") return computeComparacionHTML(block, answers);
    if (kind === "t3_esperanza_vida") return computeT3HTML(block, answers);
    return "";
  }

  // --------------------------------------------------- envío al backend
  // Guarda las respuestas en un lugar externo (una planilla de Google, vía
  // un Web App de Google Apps Script -- ver webapp/google_apps_script/ y el
  // README para la configuración). window.SURVEY_ENDPOINT se define en
  // site/config.js (no en este archivo) para que cada quien pueda pegar su
  // propia URL sin tocar app.js.
  function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      wave: params.get("wave"),
      pid: params.get("pid"),
      arm: params.get("arm"),
    };
  }

  function generatePid() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return "pid-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10);
  }

  function endpointConfigured() {
    return (
      typeof window.SURVEY_ENDPOINT === "string" &&
      window.SURVEY_ENDPOINT.indexOf("https://") === 0
    );
  }

  // Junta pid/wave/arm/timestamp con todas las respuestas en un solo objeto
  // plano (sin anidar) y lo manda por POST. mode: "no-cors" porque el Web
  // App de Apps Script no siempre devuelve headers CORS legibles desde otro
  // origen (por ejemplo, GitHub Pages) -- igual el POST llega y se guarda,
  // simplemente no podemos leer la respuesta acá. Por eso no hay manejo de
  // error de red más que un console.warn: no queremos que un problema de
  // conexión le trabe la pantalla de "gracias" a quien respondió.
  function submitResponses(wave) {
    const r = state.respondent;
    if (!endpointConfigured()) {
      console.warn(
        "SURVEY_ENDPOINT no está configurado (site/config.js) -- esta respuesta NO se " +
          "guardó en ningún lado externo. Ver README para configurar Google Sheets."
      );
      return;
    }
    const payload = Object.assign(
      { pid: r.pid, wave: wave, arm: r.arm, timestamp: new Date().toISOString() },
      r.answers
    );
    fetch(window.SURVEY_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    }).catch((err) => {
      console.warn("No se pudo guardar la respuesta en el backend externo:", err);
    });
  }

  function el(tag, attrs, children) {
    const e = document.createElement(tag);
    if (attrs) {
      for (const k of Object.keys(attrs)) {
        if (k === "class") e.className = attrs[k];
        else if (k === "html") e.innerHTML = attrs[k];
        else e.setAttribute(k, attrs[k]);
      }
    }
    (children || []).forEach((c) => c && e.appendChild(c));
    return e;
  }

  // ------------------------------------------------------- question render
  // Cada renderer recibe (question, currentValue, onChange) y devuelve un
  // nodo DOM. onChange(value) guarda la respuesta en el estado que
  // corresponda (editor no guarda nada persistente salvo lo necesario para
  // pipear texto; respondent sí guarda todo).

  function renderQuestionInput(q, value, onChange, mode) {
    switch (q.type) {
      case "text_display":
        return el("div", { class: "text-display" });

      case "mc_single": {
        const wrap = el("div", {});
        q.choices.forEach((choice) => {
          const id = q.id + "__" + choice.replace(/\s+/g, "_");
          const label = el("label", { class: "choice-row", for: id });
          const input = el("input", { type: "radio", name: q.id, id: id, value: choice });
          if (value === choice) input.checked = true;
          input.addEventListener("change", () => onChange(choice));
          label.appendChild(input);
          label.appendChild(document.createTextNode(" " + choice));
          wrap.appendChild(label);
        });
        return wrap;
      }

      case "email": {
        const input = el("input", { type: "email", placeholder: "nombre@ejemplo.com" });
        input.value = value || "";
        input.addEventListener("input", () => onChange(input.value));
        return input;
      }

      case "date_ymd": {
        const wrap = el("div", { class: "date-row" });
        const cur = value || {};
        const daySel = el("select", {});
        daySel.appendChild(el("option", { value: "" }, [document.createTextNode("Día")]));
        for (let d = 1; d <= 31; d++) {
          const o = el("option", { value: d }, [document.createTextNode(String(d))]);
          if (String(cur.d) === String(d)) o.selected = true;
          daySel.appendChild(o);
        }
        const monthSel = el("select", {});
        monthSel.appendChild(el("option", { value: "" }, [document.createTextNode("Mes")]));
        MONTHS.forEach((m, idx) => {
          const o = el("option", { value: idx + 1 }, [document.createTextNode(m)]);
          if (String(cur.m) === String(idx + 1)) o.selected = true;
          monthSel.appendChild(o);
        });
        const yearSel = el("select", {});
        yearSel.appendChild(el("option", { value: "" }, [document.createTextNode("Año")]));
        for (let y = q.year_max; y >= q.year_min; y--) {
          const o = el("option", { value: y }, [document.createTextNode(String(y))]);
          if (String(cur.y) === String(y)) o.selected = true;
          yearSel.appendChild(o);
        }
        function emit() {
          onChange({ d: daySel.value, m: monthSel.value, y: yearSel.value });
        }
        daySel.addEventListener("change", emit);
        monthSel.addEventListener("change", emit);
        yearSel.addEventListener("change", emit);
        wrap.appendChild(daySel);
        wrap.appendChild(monthSel);
        wrap.appendChild(yearSel);
        return wrap;
      }

      case "hours_per_day": {
        const sel = el("select", {});
        sel.appendChild(el("option", { value: "" }, [document.createTextNode("-- elegí --")]));
        for (let h = 0; h <= 24; h++) {
          const o = el("option", { value: h }, [document.createTextNode(h + (h === 1 ? " hora" : " horas"))]);
          if (String(value) === String(h)) o.selected = true;
          sel.appendChild(o);
        }
        sel.addEventListener("change", () => onChange(sel.value === "" ? undefined : Number(sel.value)));
        return sel;
      }

      case "hours_minutes": {
        // Dos selectores bien juntos ("Horas" + "Minutos"), en la misma
        // línea, para no perder los minutos de precisión que sí tiene el
        // dato de origen (lo que muestra la pantalla de Tiempo de uso del
        // celular) sin pedirle a nadie que piense en decimales de hora.
        const field = el("div", { class: "hm-field" });
        const wrap = el("div", { class: "hm-row" });
        const cur = value || {};
        const maxHours = q.max_hours !== undefined ? q.max_hours : 24;
        // Preguntas de TOTAL semanal (max_hours=168, ver B2_PriorHoras y
        // B5_HorasReales/O2*_HorasReales): en pruebas, gente confundió esto
        // con un promedio diario y cargó, por ejemplo, "3 horas" en vez de
        // "21 horas". Para eso: (a) un recordatorio fijo junto al selector,
        // y (b) un cálculo en vivo del equivalente por día, para que la
        // persona pueda notar sola si el número que eligió es razonable.
        const isWeeklyTotal = maxHours > 24;

        const hoursSel = el("select", {});
        hoursSel.appendChild(el("option", { value: "" }, [document.createTextNode("-- horas --")]));
        for (let h = 0; h <= maxHours; h++) {
          const o = el("option", { value: h }, [document.createTextNode(String(h))]);
          if (String(cur.h) === String(h)) o.selected = true;
          hoursSel.appendChild(o);
        }

        const minutesSel = el("select", {});
        [0, 15, 30, 45].forEach((m) => {
          const o = el("option", { value: m }, [document.createTextNode(String(m))]);
          // Minutos arranca en 0 por defecto (no obliga a elegirlo) -- lo
          // único que hay que elegir sí o sí son las horas.
          if (cur.m !== undefined ? String(cur.m) === String(m) : m === 0) o.selected = true;
          minutesSel.appendChild(o);
        });

        const checkLine = isWeeklyTotal ? el("div", { class: "hm-check" }) : null;

        function updateCheckLine() {
          if (!checkLine) return;
          if (hoursSel.value === "") {
            checkLine.textContent = "";
            checkLine.style.display = "none";
            return;
          }
          const totalMinutes = Number(hoursSel.value) * 60 + Number(minutesSel.value);
          const perDayMinutes = totalMinutes / 7;
          const perDayH = Math.floor(perDayMinutes / 60);
          const perDayM = Math.round(perDayMinutes % 60);
          checkLine.style.display = "";
          checkLine.textContent =
            "↳ eso es un total de 7 días -- equivale a un promedio de " +
            perDayH + "h " + perDayM + "min por día. Si vos pensaste en un solo día, corregí arriba.";
        }

        function emit() {
          if (hoursSel.value === "") {
            onChange(undefined);
            updateCheckLine();
            return;
          }
          onChange({ h: Number(hoursSel.value), m: Number(minutesSel.value) });
          updateCheckLine();
        }
        hoursSel.addEventListener("change", emit);
        minutesSel.addEventListener("change", emit);

        wrap.appendChild(hoursSel);
        wrap.appendChild(el("span", { class: "hm-unit" }, [document.createTextNode("h")]));
        wrap.appendChild(minutesSel);
        wrap.appendChild(el("span", { class: "hm-unit" }, [document.createTextNode("min")]));
        field.appendChild(wrap);

        if (isWeeklyTotal) {
          field.appendChild(
            el("div", { class: "hint hm-reminder" }, [
              document.createTextNode(
                "Recordá: es el TOTAL de los últimos 7 días, no el promedio de un solo día."
              ),
            ])
          );
          updateCheckLine();
          field.appendChild(checkLine);
        }

        return field;
      }

      case "number_slider": {
        const wrap = el("div", {});
        const v = value !== undefined ? value : q.min;
        const range = el("input", { type: "range", min: q.min, max: q.max, step: "1", value: v });
        const out = el("span", {}, [document.createTextNode(" " + v)]);
        range.addEventListener("input", () => {
          out.textContent = " " + range.value;
          onChange(Number(range.value));
        });
        wrap.appendChild(range);
        wrap.appendChild(out);
        if (value === undefined && mode === "respondent") {
          // Registrar el valor por defecto del slider como respuesta inicial,
          // igual que haría un slider de Qualtrics (arranca en un valor
          // válido). Solo en modo Encuestado -- en Editor no se quiere que
          // esto "pise" los valores de ejemplo usados para pipear texto.
          onChange(v);
        }
        return wrap;
      }

      case "number_input": {
        const input = el("input", { type: "number", min: q.min, max: q.max });
        input.value = value !== undefined ? value : "";
        input.addEventListener("input", () => {
          onChange(input.value === "" ? undefined : Number(input.value));
        });
        return input;
      }

      case "matrix_likert": {
        const table = el("table", { class: "likert" });
        const thead = el("tr", {}, [el("th", {}, [])]);
        q.scale.forEach((s) => thead.appendChild(el("th", {}, [document.createTextNode(s)])));
        table.appendChild(thead);
        const cur = Array.isArray(value) ? value.slice() : new Array(q.rows.length).fill(undefined);
        q.rows.forEach((row, ri) => {
          const tr = el("tr", {});
          const label = row.text + (row.reverse ? " (ítem invertido)" : "");
          tr.appendChild(el("td", { class: "row-label" }, [document.createTextNode(label)]));
          q.scale.forEach((s, ci) => {
            const td = el("td", {});
            const input = el("input", { type: "radio", name: q.id + "_row" + ri });
            if (cur[ri] === ci) input.checked = true;
            input.addEventListener("change", () => {
              cur[ri] = ci;
              onChange(cur.slice());
            });
            td.appendChild(input);
            tr.appendChild(td);
          });
          table.appendChild(tr);
        });
        return table;
      }

      case "ranking_form": {
        const table = el("table", { class: "ranking" });
        const cur = Array.isArray(value) ? value.slice() : [];
        for (let i = 0; i < q.n_rows; i++) {
          if (!cur[i]) cur[i] = { name: "", time: "" };
        }
        table.appendChild(
          el("tr", {}, [
            el("th", {}, [document.createTextNode("#")]),
            el("th", {}, [document.createTextNode("App")]),
            el("th", {}, [document.createTextNode("Tiempo de uso")]),
          ])
        );
        for (let i = 0; i < q.n_rows; i++) {
          const nameInput = el("input", { type: "text", placeholder: "nombre de la app" });
          nameInput.value = cur[i].name;
          nameInput.addEventListener("input", () => {
            cur[i] = Object.assign({}, cur[i], { name: nameInput.value });
            onChange(cur.slice());
          });
          const timeInput = el("input", { type: "text", placeholder: "ej: 2h 30m" });
          timeInput.value = cur[i].time || "";
          timeInput.addEventListener("input", () => {
            cur[i] = Object.assign({}, cur[i], { time: timeInput.value });
            onChange(cur.slice());
          });
          table.appendChild(
            el("tr", {}, [
              el("td", {}, [document.createTextNode(String(i + 1))]),
              el("td", {}, [nameInput]),
              el("td", {}, [timeInput]),
            ])
          );
        }
        return table;
      }

      case "file_upload": {
        const wrap = el("div", {});
        if (q.help_text) {
          wrap.appendChild(
            el("p", { class: "hint" }, [document.createTextNode(q.help_text)])
          );
        }
        // Miniatura de referencia (ej. una captura de ejemplo de la pantalla
        // de Bienestar Digital/Tiempo de Uso) -- clickeable para verla en
        // tamaño completo en una pestaña nueva, sin bloquear el flujo.
        if (q.reference_image) {
          const refLink = el("a", { href: q.reference_image, target: "_blank", rel: "noopener" });
          const refImg = el("img", {
            src: q.reference_image,
            class: "reference-image",
            alt: "Ejemplo de la pantalla de referencia",
          });
          refLink.appendChild(refImg);
          wrap.appendChild(refLink);
        }
        const input = el("input", { type: "file", accept: "image/*" });
        const note = el("div", { class: "hint" }, [
          document.createTextNode(
            "La imagen se guarda junto con el resto de tus respuestas."
          ),
        ]);
        // Se guarda el archivo entero (no solo el nombre): se lee como
        // base64 y se manda así en el payload -- ver submitResponses, que lo
        // sube a Google Drive en el backend (Code.gs) y guarda el link en la
        // planilla. Tamaño máximo generoso para no trabar el envío con
        // capturas de pantalla comunes (unos pocos MB).
        const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
        input.addEventListener("change", () => {
          if (!input.files.length) {
            onChange(undefined);
            return;
          }
          const file = input.files[0];
          if (file.size > MAX_FILE_BYTES) {
            note.textContent =
              "El archivo pesa demasiado (máximo 10 MB). Elegí una captura más liviana.";
            input.value = "";
            onChange(undefined);
            return;
          }
          note.textContent = "Cargando imagen...";
          const reader = new FileReader();
          reader.onload = () => {
            onChange({ name: file.name, dataUrl: reader.result });
            note.textContent = "Imagen lista para enviar (" + file.name + ").";
          };
          reader.onerror = () => {
            note.textContent =
              "No se pudo leer el archivo. Probá de nuevo o elegí otra imagen.";
            onChange(undefined);
          };
          reader.readAsDataURL(file);
        });
        wrap.appendChild(input);
        wrap.appendChild(note);
        return wrap;
      }

      default:
        return el("div", {}, [document.createTextNode("(tipo de pregunta desconocido: " + q.type + ")")]);
    }
  }

  function isAnswered(q, value) {
    switch (q.type) {
      case "text_display":
      case "ranking_form":
        return true; // nunca bloquean el avance
      case "file_upload":
        return (
          value !== undefined &&
          value !== null &&
          value !== "" &&
          (typeof value !== "object" || !!value.dataUrl)
        );
      case "mc_single":
        return value !== undefined && value !== null && value !== "";
      case "email":
        return typeof value === "string" && /.+@.+\..+/.test(value);
      case "date_ymd":
        return value && value.d && value.m && value.y;
      case "hours_per_day":
        return value !== undefined && value !== null;
      case "hours_minutes":
        return value !== undefined && value !== null && value.h !== undefined && value.h !== "";
      case "number_slider":
        return value !== undefined && value !== null;
      case "number_input":
        return value !== undefined && value !== null && value !== "";
      case "matrix_likert":
        return Array.isArray(value) && value.length === q.rows.length && value.every((v) => v !== undefined);
      default:
        return true;
    }
  }

  // ------------------------------------------------------------ rendering

  function renderBlockQuestions(block, answers, arm, options) {
    const container = el("div", {});
    // La persona que responde de verdad (modo Encuestado) no ve en qué
    // bloque está parada -- ni su nombre ni su número -- para que la
    // encuesta se sienta como un flujo continuo, no como una lista de pasos
    // numerados. En modo Editor sí se muestra, porque ahí sirve para ubicar
    // rápidamente qué bloque se está revisando.
    if (options.mode !== "respondent") {
      container.appendChild(el("h2", { class: "block-title" }, [document.createTextNode(block.title)]));
    }

    if (options.blockHiddenNote) {
      container.appendChild(
        el("p", { class: "not-shown-note" }, [
          document.createTextNode(options.blockHiddenNote),
        ])
      );
    }

    // Jerarquía visual (solo modo Encuestado): cadena de "sección" por
    // pregunta -- cada pregunta hereda la de la anterior salvo que traiga su
    // propia "section_override" (ver docstring de survey_content.py). Se
    // arma sobre TODAS las preguntas del bloque, visibles o no, para que la
    // cadena no dependa de qué rama las oculta; lo que sí depende de la
    // visibilidad es cuándo se IMPRIME cada título (ver más abajo).
    let currentSection = block.section || null;
    const effectiveSections = block.questions.map((q) => {
      if (q.section_override !== undefined) currentSection = q.section_override;
      return currentSection;
    });
    let lastShownSection;

    block.questions.forEach((q, qi) => {
      const visible = evalCondition(q.display_if, answers, arm);
      const boxClass = q.variant ? "question question--" + q.variant : "question";
      const box = el("div", { class: boxClass });
      if (!visible) {
        if (options.mode === "respondent") return; // en modo real, ni se muestra
        box.appendChild(
          el("p", { class: "not-shown-note" }, [
            document.createTextNode("(esta pregunta no se le muestra a la rama " + arm + ")"),
          ])
        );
      }
      if (options.mode === "respondent") {
        const sec = effectiveSections[qi];
        if (sec && sec !== lastShownSection) {
          container.appendChild(el("h3", { class: "section-title" }, [document.createTextNode(sec)]));
          lastShownSection = sec;
        }
      }
      let text = q.compute ? computeDisplayText(q.compute, block, answers) : pipeText(q.text, block, answers);
      text = applyDateWindow(text, q);
      box.appendChild(el("p", { class: "q-text", html: text }));
      const value = answers[q.id];
      const input = renderQuestionInput(
        q,
        value,
        (v) => {
          answers[q.id] = v;
          options.onAnswerChange && options.onAnswerChange(q, v);
        },
        options.mode
      );
      box.appendChild(input);
      container.appendChild(box);
    });

    return container;
  }

  // --------------------------------------------------------- editor mode

  function editorVisibleArmForBlock() {
    return ARMS[state.editor.armIndex];
  }

  function renderEditor() {
    const root = document.getElementById("block-render");
    root.innerHTML = "";
    const arm = editorVisibleArmForBlock();
    const block = BLOCKS[state.editor.blockIndex];
    const answers = {}; // el editor no acumula respuestas reales entre bloques

    const armVisible = evalCondition(block.display_if, answers, arm);
    const badge = el("span", { class: "arm-badge" }, [document.createTextNode("Rama: " + arm)]);

    const wrap = renderBlockQuestions(block, answers, arm, {
      mode: "editor",
      blockHiddenNote: armVisible
        ? null
        : "Este bloque completo NO se le muestra a la rama " + arm + " (display logic de bloque). Se ve igual acá para que puedas revisarlo.",
    });
    wrap.querySelector("h2.block-title").appendChild(badge);
    root.appendChild(wrap);

    document.getElementById("prev-btn").disabled = state.editor.blockIndex === 0;
    document.getElementById("next-btn").disabled = state.editor.blockIndex === BLOCKS.length - 1;
    document.getElementById("next-btn").textContent = "Siguiente →";
    document.getElementById("validation-msg").textContent = "";

    renderBlockList();
  }

  function renderBlockList() {
    const list = document.getElementById("block-list");
    list.innerHTML = "";
    BLOCKS.forEach((b, i) => {
      const li = el("li", {}, [document.createTextNode(b.title)]);
      if (b.wave === 2) li.classList.add("wave2");
      if (i === state.editor.blockIndex) li.classList.add("active");
      li.addEventListener("click", () => {
        state.editor.blockIndex = i;
        renderEditor();
      });
      list.appendChild(li);
    });
  }

  function populateArmSelect() {
    const sel = document.getElementById("arm-select");
    sel.innerHTML = "";
    ARMS.forEach((arm, i) => {
      const o = el("option", { value: i }, [document.createTextNode(ARM_LABELS[arm])]);
      sel.appendChild(o);
    });
    sel.value = state.editor.armIndex;
    sel.addEventListener("change", () => {
      state.editor.armIndex = Number(sel.value);
      renderEditor();
    });
  }

  // ----------------------------------------------------- respondent mode

  function getVisibleBlockIndices() {
    // Bloques visibles dado el arm asignado (una vez que se conoce) y las
    // respuestas acumuladas. Antes de la aleatorización (bloque B4), solo
    // se conocen los bloques de la Ola 1 anteriores a B4.
    //
    // Además, cada sesión de respondiente real cubre UNA sola ola: la Ola 1
    // (arranque normal, sin parámetros en la URL) o la Ola 2 (arranque desde
    // el link que se manda por email 7 días después, con ?wave=2&pid=...
    // &arm=...). r.entryWave filtra los bloques de la ola que no corresponde
    // -- así una persona que entra por el link de la Ola 2 nunca ve ni
    // contesta de nuevo los bloques de la Ola 1, y viceversa.
    const r = state.respondent;
    const indices = [];
    BLOCKS.forEach((b, i) => {
      if (b.invisible) return; // nunca es un "paso" navegable en modo Encuestado
      if (b.wave !== r.entryWave) return;
      if (!b.display_if) {
        indices.push(i);
        return;
      }
      if (b.display_if.field === "Tratado" || b.display_if.field === "Brazo") {
        if (r.arm === null) return; // todavía no se aleatorizó, no sabemos
        if (evalCondition(b.display_if, r.answers, r.arm)) indices.push(i);
      } else {
        if (evalCondition(b.display_if, r.answers, r.arm)) indices.push(i);
      }
    });
    return indices;
  }

  function maybeRandomize() {
    const r = state.respondent;
    const block = BLOCKS[r.blockIndex];
    if (block.id === "B4" && r.arm === null) {
      // Un solo sorteo, uniforme entre los 5 brazos (1/5 cada uno). Antes se
      // hacía en dos etapas (1/6 Control vs. 5/6 Tratado, y recién ahí
      // sub-brazo uniforme) -- herencia del diseño original de 6 brazos; al
      // sacar T2 esa asimetría entre Control y cada brazo tratado ya no
      // tenía justificación, así que se simplificó a esto.
      const idx = Math.floor(Math.random() * ARMS.length);
      r.arm = ARMS[idx];
      r.stage1Label = ARM_LABELS[r.arm] + " (probabilidad 1/" + ARMS.length + ")";
      r.stage2Label = null;
    }
  }

  function renderRespondent() {
    const root = document.getElementById("block-render");
    root.innerHTML = "";
    const r = state.respondent;

    if (r.ended) {
      root.appendChild(el("h2", { class: "block-title" }, [document.createTextNode("Encuesta finalizada")]));
      root.appendChild(el("p", {}, [document.createTextNode(r.endMessage)]));
      // A pedido del usuario: al terminar, los botones "Anterior"/
      // "Siguiente" desaparecen del todo (antes quedaban visibles pero
      // deshabilitados) -- no hay nada más para hacer en esta sesión.
      document.getElementById("prev-btn").style.display = "none";
      document.getElementById("next-btn").style.display = "none";
      document.getElementById("validation-msg").textContent = "";
      return;
    }

    maybeRandomize();

    // Saltar hacia adelante cualquier bloque que no corresponda mostrar:
    // - los "invisible" (B4, la aleatorización) nunca se muestran como paso;
    // - los que tienen display_if de bloque que ya no se cumple para el arm
    //   recién asignado (por ejemplo, Bloque 5 -- "solo tratados" -- cuando
    //   el arm resultó ser Control). Esto es necesario en particular justo
    //   después de B4: el arm recién se conoce acá, así que el chequeo de
    //   respondentGoNext (hecho un paso antes, cuando el arm todavía no
    //   existía) no alcanza a filtrar el bloque siguiente a B4.
    while (true) {
      const b = BLOCKS[r.blockIndex];
      if (!b) break;
      if (b.invisible) {
        r.blockIndex += 1;
        continue;
      }
      if (b.display_if && r.arm !== null && !evalCondition(b.display_if, r.answers, r.arm)) {
        r.blockIndex += 1;
        continue;
      }
      break;
    }
    const block = BLOCKS[r.blockIndex];

    // Aviso al entrar a la Ola 2 (llegaste acá por el link que se manda por
    // email ~7 días después de terminar la Ola 1).
    if (block.wave === 2 && BLOCKS[r.blockIndex - 1] && BLOCKS[r.blockIndex - 1].wave === 1) {
      root.appendChild(
        el("div", { class: "not-shown-note" }, [
          document.createTextNode(
            "--- Bienvenido/a de nuevo. Esta es la segunda parte de la encuesta. ---"
          ),
        ])
      );
    }

    const wrap = renderBlockQuestions(block, r.answers, r.arm, {
      mode: "respondent",
      onAnswerChange: () => {
        document.getElementById("validation-msg").textContent = "";
      },
    });
    root.appendChild(wrap);

    const visible = getVisibleBlockIndices();
    const posInVisible = visible.indexOf(r.blockIndex);
    // Restaurar la visibilidad de los botones (por si la encuesta anterior
    // había terminado y los había ocultado -- ver el caso "r.ended" más
    // arriba -- y ahora se reinició una nueva).
    document.getElementById("prev-btn").style.display = "";
    document.getElementById("next-btn").style.display = "";
    document.getElementById("prev-btn").disabled = posInVisible <= 0;
    document.getElementById("next-btn").disabled = false;
    document.getElementById("next-btn").textContent =
      posInVisible === visible.length - 1 ? "Finalizar" : "Siguiente →";
    document.getElementById("validation-msg").textContent = "";
  }

  function respondentValidateCurrent() {
    const r = state.respondent;
    const block = BLOCKS[r.blockIndex];
    if (block.id === "B4") return null;
    for (const q of block.questions) {
      if (!evalCondition(q.display_if, r.answers, r.arm)) continue;
      if (q.force && !isAnswered(q, r.answers[q.id])) {
        const plain = applyDateWindow(q.text, q).replace(/<[^>]+>/g, "");
        return "Falta responder: " + plain.slice(0, 80) + "...";
      }
    }
    return null;
  }

  function respondentCheckEndSurvey() {
    const r = state.respondent;
    const block = BLOCKS[r.blockIndex];
    for (const q of block.questions) {
      if (q.end_survey_if && r.answers[q.id] === q.end_survey_if.value) {
        r.ended = true;
        r.endMessage = "Gracias por tu tiempo. No vas a continuar con esta encuesta.";
        return true;
      }
    }
    return false;
  }

  function respondentGoNext() {
    const r = state.respondent;
    const err = respondentValidateCurrent();
    if (err) {
      document.getElementById("validation-msg").textContent = err;
      return;
    }
    if (respondentCheckEndSurvey()) {
      renderRespondent();
      return;
    }
    const visible = getVisibleBlockIndices();
    const pos = visible.indexOf(r.blockIndex);
    if (pos === visible.length - 1) {
      r.ended = true;
      if (!r.submitted) {
        r.submitted = true;
        submitResponses(r.entryWave);
      }
      r.endMessage =
        r.entryWave === 1
          ? "¡Gracias! Ya registramos tus respuestas. En unos 7 días te vamos a escribir por " +
            "email con la segunda parte (dura 3 minutos)."
          : "¡Gracias por completar la segunda parte! Tu participación en el estudio ya quedó " +
            "registrada.";
      renderRespondent();
      return;
    }
    // Avanzar al siguiente índice de bloque. renderRespondent() se encarga,
    // en cada render, de saltar los bloques "invisible" y los que su
    // display_if ya no cumple para el arm asignado (ver ahí el detalle de
    // por qué esto no puede resolverse acá con seguridad: justo después de
    // B4 el arm recién se conoce dentro de renderRespondent).
    r.blockIndex += 1;
    renderRespondent();
  }

  function respondentGoPrev() {
    const r = state.respondent;
    const visible = getVisibleBlockIndices();
    const pos = visible.indexOf(r.blockIndex);
    if (pos > 0) {
      r.blockIndex = visible[pos - 1];
      renderRespondent();
    }
  }

  function resetRespondent() {
    // Si esta sesión entró por un link de Ola 2 (?wave=2&pid=...&arm=...),
    // "Reiniciar encuesta" reinicia DENTRO de la Ola 2 (mismo pid y arm) --
    // no tiene sentido que alguien que entró por ese link termine
    // reiniciando en la Ola 1. Si entró normalmente (Ola 1), se genera un
    // pid nuevo, como una persona nueva.
    const prev = state.respondent;
    const isWave2Entry = prev && prev.entryWave === 2;
    const firstWave2Index = BLOCKS.findIndex((b) => b.wave === 2);
    state.respondent = {
      answers: {},
      blockIndex: isWave2Entry ? Math.max(0, firstWave2Index) : 0,
      arm: isWave2Entry ? prev.arm : null,
      pid: isWave2Entry ? prev.pid : generatePid(),
      entryWave: isWave2Entry ? 2 : 1,
      submitted: false,
      stage1Label: null,
      stage2Label: null,
      ended: false,
      endMessage: "",
    };
    renderRespondent();
  }

  // ------------------------------------------------------------- wiring

  function updateModeUI() {
    const isEditor = state.mode === "editor";
    // La encuesta que completa de verdad la persona (modo Encuestado) no
    // lleva sidebar de ningún tipo -- ni panel de controles del Editor ni
    // "rectángulo" de progreso/reiniciar -- para no exponerle la mecánica
    // interna de bloques. El botón de reiniciar vive en la barra superior en
    // su lugar, y solo se ve en modo Encuestado.
    document.getElementById("sidebar").style.display = isEditor ? "block" : "none";
    document.getElementById("editor-controls").style.display = isEditor ? "block" : "none";
    // En la página "estrictamente Encuestado" el botón de reiniciar no se
    // muestra nunca (ver LOCKED_RESPONDENT más arriba).
    document.getElementById("restart-btn").style.display =
      !isEditor && !LOCKED_RESPONDENT ? "inline-block" : "none";
    // Clase en <body> que activa, solo para el modo Encuestado, el ancho más
    // compacto/centrado y las tarjetas más sutiles (ver style.css) -- el
    // Editor conserva su estilo de revisión sin tocar.
    document.body.classList.toggle("mode-respondent", !isEditor);
  }

  function render() {
    updateModeUI();
    if (state.mode === "editor") renderEditor();
    else renderRespondent();
  }

  document.getElementById("mode-select").addEventListener("change", (e) => {
    // En la página "estrictamente Encuestado" este selector queda oculto
    // (ver style.css, body.locked-respondent), pero por las dudas el cambio
    // de modo también se ignora acá si alguien lo forzara igual.
    if (LOCKED_RESPONDENT) return;
    state.mode = e.target.value;
    if (state.mode === "respondent") resetRespondent();
    render();
  });

  document.getElementById("prev-btn").addEventListener("click", () => {
    if (state.mode === "editor") {
      if (state.editor.blockIndex > 0) {
        state.editor.blockIndex -= 1;
        renderEditor();
      }
    } else {
      respondentGoPrev();
    }
  });

  document.getElementById("next-btn").addEventListener("click", () => {
    if (state.mode === "editor") {
      if (state.editor.blockIndex < BLOCKS.length - 1) {
        state.editor.blockIndex += 1;
        renderEditor();
      }
    } else {
      respondentGoNext();
    }
  });

  document.getElementById("restart-btn").addEventListener("click", () => {
    // No-op en la página "estrictamente Encuestado" -- ver LOCKED_RESPONDENT.
    // El botón ya está oculto en ese caso, esto es un resguardo adicional.
    if (LOCKED_RESPONDENT) return;
    resetRespondent();
  });

  // Si la URL trae ?wave=2&pid=...&arm=... (el link que manda el email de
  // invitación a la Ola 2, generado por el backend -- ver
  // google_apps_script/Code.gs), arrancar directamente en modo Encuestado,
  // ya en la Ola 2, con el arm que le tocó en la Ola 1 (no se vuelve a
  // aleatorizar). Si no, es una sesión normal de Ola 1 con un pid nuevo.
  function initFromUrl() {
    const firstWave2Index = BLOCKS.findIndex((b) => b.wave === 2);

    // Página de Ola 2 de link fijo (ver FIXED_WAVE2_GROUP más arriba): no
    // depende de nada que venga por la URL, arranca siempre igual para
    // cualquiera que abra ese link.
    if (FIXED_WAVE2_GROUP && FIXED_WAVE2_ARM[FIXED_WAVE2_GROUP]) {
      state.mode = "respondent";
      state.respondent = {
        answers: {},
        blockIndex: Math.max(0, firstWave2Index),
        arm: FIXED_WAVE2_ARM[FIXED_WAVE2_GROUP],
        pid: generatePid(),
        entryWave: 2,
        submitted: false,
        stage1Label: null,
        stage2Label: null,
        ended: false,
        endMessage: "",
      };
      return;
    }

    const params = getUrlParams();
    if (params.wave === "2" && params.pid && params.arm && ARMS.indexOf(params.arm) !== -1) {
      state.mode = "respondent";
      state.respondent = {
        answers: {},
        blockIndex: Math.max(0, firstWave2Index),
        arm: params.arm,
        pid: params.pid,
        entryWave: 2,
        submitted: false,
        stage1Label: null,
        stage2Label: null,
        ended: false,
        endMessage: "",
      };
      document.getElementById("mode-select").value = "respondent";
    } else {
      state.respondent.pid = generatePid();
      state.respondent.entryWave = 1;
    }
  }

  populateArmSelect();
  initFromUrl();
  render();
})();
