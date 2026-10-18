// Plantillas de correo con la identidad de Hervor (morado, dorado, crema).
// HTML con tablas y estilos en línea para que se vea bien en Gmail, Outlook y móviles.
import { PROVEEDOR, PLAZO_DIAS_HABILES } from "../proveedor.js";
import { formatoFechaHora, formatoFechaLarga } from "../fechas.js";

const C = { morado: "#452959", dorado: "#D6A74E", crema: "#EDE9E6", tinta: "#FBF7F1" };
const FUENTE = "Montserrat, 'Segoe UI', Helvetica, Arial, sans-serif";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const br = (s) => esc(s).replace(/\n/g, "<br>");

function logoUrl() {
  const base = (process.env.SITE_URL || "").replace(/\/$/, "");
  return base ? `${base}/assets/img/logo-hervor.png` : "";
}

function marco(titulo, contenido) {
  const logo = logoUrl();
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&display=swap" rel="stylesheet"><title>${esc(titulo)}</title></head>
<body style="margin:0;padding:0;background:${C.crema};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.crema};">
<tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${C.tinta};border-radius:18px;overflow:hidden;">
    <tr><td align="center" style="background:${C.morado};padding:28px 24px;">
      ${logo
        ? `<img src="${esc(logo)}" width="180" alt="Hervor" style="display:block;width:180px;max-width:60%;height:auto;border:0;">`
        : `<span style="font-family:${FUENTE};font-size:30px;letter-spacing:10px;font-weight:700;color:${C.dorado};">HERVOR</span>`}
    </td></tr>
    <tr><td style="padding:32px 28px 8px;font-family:${FUENTE};color:${C.morado};font-size:15px;line-height:1.6;">
      ${contenido}
    </td></tr>
    <tr><td style="padding:20px 28px 28px;font-family:${FUENTE};color:${C.morado};font-size:12px;line-height:1.5;opacity:.85;border-top:1px solid ${C.crema};">
      ${esc(PROVEEDOR.nombre)} · RUC ${esc(PROVEEDOR.ruc)} · ${esc(PROVEEDOR.domicilio)}<br>
      Libro de Reclamaciones Virtual de Hervor
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

function cajaNumero(numero) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0;width:100%;">
  <tr><td align="center" style="background:${C.morado};border-radius:14px;padding:18px;">
    <div style="font-family:${FUENTE};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${C.crema};">Hoja de reclamación N°</div>
    <div style="font-family:${FUENTE};font-size:30px;font-weight:700;letter-spacing:2px;color:${C.dorado};">${esc(numero)}</div>
  </td></tr></table>`;
}

function fila(etiqueta, valor) {
  return `<tr>
    <td style="padding:6px 12px 6px 0;font-family:${FUENTE};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:${C.dorado};vertical-align:top;white-space:nowrap;">${esc(etiqueta)}</td>
    <td style="padding:6px 0;font-family:${FUENTE};font-size:14px;color:${C.morado};vertical-align:top;">${valor}</td>
  </tr>`;
}

export function correoConsumidor(r) {
  const limite = formatoFechaLarga(r.fecha_limite_respuesta);
  const asunto = `Hervor · Hoja de reclamación N° ${r.numero_hoja}`;
  const html = marco(asunto, `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${C.morado};">Hola, ${esc(r.consumidor_nombre.split(" ")[0])}:</h1>
    <p style="margin:0 0 4px;">Recibimos tu ${esc(r.tipo.toLowerCase())} en nuestro Libro de Reclamaciones Virtual. Adjuntamos la hoja de reclamación en PDF como constancia.</p>
    ${cajaNumero(r.numero_hoja)}
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
      ${fila("Registrada el", esc(formatoFechaHora(r.creado_en)) + " (hora de Lima)")}
      ${fila("Tipo", esc(r.tipo))}
      ${fila("Plazo de respuesta", `${PLAZO_DIAS_HABILES} días hábiles, a más tardar el <strong>${esc(limite)}</strong>`)}
    </table>
    <p style="margin:20px 0 0;">Te responderemos a este correo. Si necesitas añadir algo, responde a este mensaje indicando tu número de hoja.</p>
    <p style="margin:16px 0 0;font-size:12px;opacity:.85;">La formulación del reclamo no impide acudir a otras vías de solución de controversias ni es requisito previo para interponer una denuncia ante el INDECOPI.</p>
  `);
  const text = [
    `Hola, ${r.consumidor_nombre}:`,
    "",
    `Recibimos tu ${r.tipo.toLowerCase()} en el Libro de Reclamaciones Virtual de Hervor.`,
    `Hoja de reclamación N° ${r.numero_hoja}`,
    `Registrada el ${formatoFechaHora(r.creado_en)} (hora de Lima).`,
    `Te responderemos en un plazo de ${PLAZO_DIAS_HABILES} días hábiles, a más tardar el ${limite}.`,
    "",
    "Adjuntamos la hoja en PDF como constancia.",
    "",
    "La formulación del reclamo no impide acudir a otras vías de solución de controversias ni es requisito previo para interponer una denuncia ante el INDECOPI.",
    "",
    `${PROVEEDOR.nombre} · RUC ${PROVEEDOR.ruc} · ${PROVEEDOR.domicilio}`,
  ].join("\n");
  return { subject: asunto, html, text };
}

export function correoProveedor(r) {
  const limite = formatoFechaLarga(r.fecha_limite_respuesta);
  const esQueja = r.tipo === "Queja";
  const asunto = `${esQueja ? "Nueva queja" : "Nuevo reclamo"} · Hoja N° ${r.numero_hoja} · responder antes del ${limite}`;
  const html = marco(asunto, `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${C.morado};">Nueva hoja en el Libro de Reclamaciones</h1>
    <p style="margin:0;">Se registró ${esQueja ? "una" : "un"} <strong>${esc(r.tipo.toLowerCase())}</strong>. El PDF de la hoja va adjunto.</p>
    ${cajaNumero(r.numero_hoja)}
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
      ${fila("Fecha límite", `<strong>${esc(limite)}</strong> (${PLAZO_DIAS_HABILES} días hábiles)`)}
      ${fila("Registrada el", esc(formatoFechaHora(r.creado_en)))}
      ${fila("Consumidor", esc(r.consumidor_nombre))}
      ${fila("Documento", `${esc(r.tipo_documento)} ${esc(r.numero_documento)}`)}
      ${fila("Contacto", `${esc(r.email)} · ${esc(r.telefono)}`)}
      ${fila(r.bien_tipo, br(r.bien_descripcion))}
      ${r.monto_reclamado ? fila("Monto", `S/ ${esc(Number(r.monto_reclamado).toFixed(2))}`) : ""}
      ${fila("Detalle", br(r.detalle))}
      ${fila("Pedido", br(r.pedido))}
    </table>
    <p style="margin:20px 0 0;">Registra tu respuesta en Supabase (tabla <strong>reclamos</strong>, columnas <em>respuesta</em> y <em>fecha_respuesta</em>) y comunícasela al consumidor antes de la fecha límite.</p>
  `);
  const text = [
    `${esQueja ? "Nueva queja" : "Nuevo reclamo"} — Hoja N° ${r.numero_hoja}`,
    `Fecha límite de respuesta: ${limite} (${PLAZO_DIAS_HABILES} días hábiles)`,
    `Registrada el ${formatoFechaHora(r.creado_en)}`,
    `Consumidor: ${r.consumidor_nombre} (${r.tipo_documento} ${r.numero_documento})`,
    `Contacto: ${r.email} · ${r.telefono}`,
    `${r.bien_tipo}: ${r.bien_descripcion}`,
    r.monto_reclamado ? `Monto: S/ ${Number(r.monto_reclamado).toFixed(2)}` : "",
    "",
    `Detalle:\n${r.detalle}`,
    "",
    `Pedido:\n${r.pedido}`,
  ].filter((l) => l !== "").join("\n");
  return { subject: asunto, html, text };
}
