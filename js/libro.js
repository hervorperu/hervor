import { validarReclamo, LIMITES } from "/lib/reclamo-schema.js";

const form = document.getElementById("libro");
const btn = document.getElementById("btn-enviar");
const resumen = document.getElementById("resumen-errores");
const errorEnvio = document.getElementById("error-envio");
const confirmacion = document.getElementById("confirmacion");
const campoApoderado = document.getElementById("campo-apoderado");
const esMenor = document.getElementById("es_menor");
const BORRADOR = "hervor-libro-borrador";
const cargadoEn = Date.now();

/* ---------- Reloj en hora de Lima ---------- */
const reloj = document.querySelector("[data-reloj]");
const fmtReloj = new Intl.DateTimeFormat("es-PE", {
  timeZone: "America/Lima", day: "2-digit", month: "2-digit", year: "numeric",
  hour: "2-digit", minute: "2-digit", hour12: false,
});
function tic() { reloj.textContent = fmtReloj.format(new Date()).replace(",", ""); }
tic();
setInterval(tic, 15000);

/* ---------- Menor de edad ---------- */
function sincronizarMenor() {
  campoApoderado.hidden = !esMenor.checked;
  document.getElementById("apoderado_nombre").required = esMenor.checked;
}
esMenor.addEventListener("change", sincronizarMenor);

/* ---------- DNI / CE ---------- */
const numDoc = document.getElementById("numero_documento");
function sincronizarDocumento() {
  const ce = form.tipo_documento.value === "CE";
  numDoc.inputMode = ce ? "text" : "numeric";
  numDoc.maxLength = ce ? 12 : 8;
}
form.querySelectorAll('[name="tipo_documento"]').forEach((r) => r.addEventListener("change", sincronizarDocumento));

/* ---------- Contadores de caracteres ---------- */
document.querySelectorAll("[data-contador]").forEach((el) => {
  const campo = document.getElementById(el.dataset.contador);
  const max = LIMITES[el.dataset.contador];
  const pintar = () => { el.textContent = `${campo.value.length} / ${max}`; };
  campo.addEventListener("input", pintar);
  pintar();
});

/* ---------- Borrador local (no se pierde lo escrito) ---------- */
function leerFormulario() {
  const fd = new FormData(form);
  const datos = Object.fromEntries(fd.entries());
  ["es_menor", "declara_veracidad", "acepta_tratamiento_datos"].forEach((k) => { datos[k] = form[k].checked; });
  return datos;
}

function guardarBorrador() {
  try {
    const { sitio_web, declara_veracidad, acepta_tratamiento_datos, ...resto } = leerFormulario();
    localStorage.setItem(BORRADOR, JSON.stringify(resto));
  } catch { /* almacenamiento no disponible */ }
}

function restaurarBorrador() {
  let datos;
  try { datos = JSON.parse(localStorage.getItem(BORRADOR) || "null"); } catch { datos = null; }
  if (!datos) return;
  for (const [k, v] of Object.entries(datos)) {
    const el = form.elements[k];
    if (!el) continue;
    if (el instanceof RadioNodeList) { el.value = v; }
    else if (el.type === "checkbox") { el.checked = Boolean(v); }
    else { el.value = v; }
  }
}

function borrarBorrador() {
  try { localStorage.removeItem(BORRADOR); } catch { /* nada */ }
}

restaurarBorrador();
sincronizarMenor();
sincronizarDocumento();
document.querySelectorAll("[data-contador]").forEach((el) => document.getElementById(el.dataset.contador).dispatchEvent(new Event("input")));
form.addEventListener("input", guardarBorrador);
form.addEventListener("change", guardarBorrador);

/* ---------- Errores ---------- */
function contenedorDe(nombre) {
  const el = form.elements[nombre];
  const nodo = el instanceof RadioNodeList ? el[0] : el;
  return nodo ? nodo.closest(".campo") : null;
}

function limpiarError(nombre) {
  const c = contenedorDe(nombre);
  if (!c) return;
  c.classList.remove("es-invalido");
  c.querySelector(".error")?.remove();
  c.querySelectorAll("[aria-invalid]").forEach((i) => { i.removeAttribute("aria-invalid"); i.removeAttribute("aria-describedby"); });
}

function marcarError(nombre, mensaje) {
  const c = contenedorDe(nombre);
  if (!c) return;
  limpiarError(nombre);
  c.classList.add("es-invalido");
  const p = document.createElement("p");
  p.className = "error";
  p.id = `err-${nombre}`;
  p.textContent = mensaje;
  c.appendChild(p);
  c.querySelectorAll("input, textarea").forEach((i) => {
    if (i.type === "radio" || i.name === nombre) {
      i.setAttribute("aria-invalid", "true");
      i.setAttribute("aria-describedby", p.id);
    }
  });
}

function mostrarErrores(errores) {
  Object.keys(errores).forEach((k) => marcarError(k, errores[k]));
  const n = Object.keys(errores).length;
  resumen.innerHTML = "";
  const t = document.createElement("span");
  t.textContent = n === 1 ? "Revisa 1 campo antes de enviar:" : `Revisa ${n} campos antes de enviar:`;
  const ul = document.createElement("ul");
  for (const [k, msg] of Object.entries(errores)) {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = `#${k}`;
    a.textContent = msg;
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const el = form.elements[k];
      (el instanceof RadioNodeList ? el[0] : el)?.focus();
    });
    li.appendChild(a);
    ul.appendChild(li);
  }
  resumen.append(t, ul);
  resumen.hidden = false;
  resumen.focus();
}

// Al corregir, el error del campo desaparece
form.addEventListener("input", (e) => { if (e.target.name) limpiarError(e.target.name); });
form.addEventListener("change", (e) => { if (e.target.name) limpiarError(e.target.name); });

// Validación al salir de cada campo (solo si ya tiene contenido)
form.addEventListener("focusout", (e) => {
  const el = e.target;
  if (!el.name || el.type === "radio" || el.type === "checkbox" || !el.value) return;
  const { errores } = validarReclamo(leerFormulario());
  if (errores[el.name]) marcarError(el.name, errores[el.name]);
});

/* ---------- Envío ---------- */
function enviando(activo) {
  btn.disabled = activo;
  btn.classList.toggle("esta-enviando", activo);
  btn.querySelector(".pill__label").textContent = activo ? "Enviando…" : "Enviar hoja de reclamación";
  form.setAttribute("aria-busy", String(activo));
}

function mostrarErrorEnvio(mensaje) {
  errorEnvio.textContent = mensaje;
  errorEnvio.hidden = false;
  errorEnvio.scrollIntoView({ behavior: "smooth", block: "center" });
}

function pdfUrl(base64) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
}

function mostrarConfirmacion(r) {
  const $ = (k) => confirmacion.querySelector(`[data-c="${k}"]`);
  $("numero").textContent = r.numeroHoja;
  $("fecha").textContent = r.fechaHora;
  $("limite").textContent = r.fechaLimite;

  const correo = $("correo");
  if (r.correoEnviado) {
    correo.textContent = `Enviamos una copia de tu hoja de reclamación a ${r.email}.`;
  } else {
    correo.className = "aviso aviso--error";
    correo.textContent = "Tu hoja quedó registrada, pero no pudimos enviarte la copia por correo en este momento. Descarga el PDF como constancia; volveremos a intentar el envío automáticamente.";
  }

  const descarga = $("descarga");
  if (r.pdfBase64) {
    descarga.href = pdfUrl(r.pdfBase64);
    descarga.download = `Hoja-de-Reclamacion-${r.numeroHoja}.pdf`;
  } else {
    descarga.hidden = true;
  }

  form.hidden = true;
  document.querySelector(".hoja-cabecera").hidden = true;
  confirmacion.hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
  confirmacion.focus({ preventScroll: true });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEnvio.hidden = true;
  resumen.hidden = true;

  const entrada = leerFormulario();
  const { errores } = validarReclamo(entrada);
  if (Object.keys(errores).length) {
    mostrarErrores(errores);
    return;
  }

  enviando(true);
  try {
    const resp = await fetch("/api/reclamos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...entrada, _t: Date.now() - cargadoEn }),
    });
    const r = await resp.json().catch(() => ({}));

    if (resp.status === 422 && r.errores) {
      mostrarErrores(r.errores);
    } else if (!resp.ok || !r.ok) {
      mostrarErrorEnvio(r.error || "No pudimos registrar tu hoja de reclamación. Tus datos siguen aquí: inténtalo de nuevo en unos minutos.");
    } else {
      borrarBorrador();
      mostrarConfirmacion({ ...r, email: entrada.email });
    }
  } catch {
    mostrarErrorEnvio("No pudimos conectar con el servidor. Revisa tu conexión a internet; tus datos siguen aquí para que vuelvas a intentarlo.");
  } finally {
    enviando(false);
  }
});
