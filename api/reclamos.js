// POST /api/reclamos — registra una Hoja de Reclamación.
import { validarReclamo } from "../lib/reclamo-schema.js";
import { registrarHoja, enviarCorreos, generarHojaPdf, hashIp } from "../lib/servicio.js";
import { storage } from "../lib/storage/index.js";
import { formatoFechaHora, formatoFechaLarga } from "../lib/fechas.js";

const TIEMPO_MINIMO_MS = 3000;     // un humano no completa el formulario en menos de 3 s
const MAX_POR_IP = 5;              // hojas por IP…
const VENTANA_MS = 15 * 60 * 1000; // …cada 15 minutos

function ipDe(req) {
  const xf = req.headers["x-forwarded-for"];
  return (Array.isArray(xf) ? xf[0] : xf || "").split(",")[0].trim() || req.socket?.remoteAddress || "";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Método no permitido." });
  }

  let entrada = req.body;
  if (typeof entrada === "string") {
    try { entrada = JSON.parse(entrada); } catch { entrada = null; }
  }
  if (!entrada || typeof entrada !== "object") {
    return res.status(400).json({ ok: false, error: "Solicitud no válida." });
  }

  // Anti-spam: campo trampa y tiempo mínimo de llenado
  if (entrada.sitio_web || Number(entrada._t) < TIEMPO_MINIMO_MS) {
    console.warn("[libro] Envío descartado por anti-spam");
    return res.status(400).json({ ok: false, error: "No pudimos procesar el formulario. Revísalo e inténtalo de nuevo." });
  }

  const { datos, errores } = validarReclamo(entrada);
  if (Object.keys(errores).length) {
    return res.status(422).json({ ok: false, errores });
  }

  const ip = ipDe(req);
  const userAgent = req.headers["user-agent"];

  // Límite de envíos por IP (si la consulta falla, no bloqueamos al consumidor)
  try {
    const recientes = await storage().contarRecientesPorIp(hashIp(ip), new Date(Date.now() - VENTANA_MS));
    if (recientes >= MAX_POR_IP) {
      return res.status(429).json({ ok: false, error: "Recibimos varias hojas desde tu conexión en pocos minutos. Espera un momento y vuelve a intentarlo." });
    }
  } catch (e) {
    console.error("[libro] No se pudo verificar el límite por IP:", e);
  }

  // 1) Guardar con número correlativo (atómico)
  let reclamo;
  try {
    reclamo = await registrarHoja(datos, { ip, userAgent });
  } catch (e) {
    console.error("[libro] ERROR al registrar la hoja:", e);
    return res.status(503).json({
      ok: false,
      error: "No pudimos registrar tu hoja de reclamación en este momento. Tus datos siguen en el formulario: inténtalo de nuevo en unos minutos.",
    });
  }

  // 2) PDF y 3) correos. La hoja ya existe: aunque esto falle, respondemos con éxito.
  let pdf = null;
  let correoEnviado = false;
  try {
    pdf = await generarHojaPdf(reclamo);
    const estados = await enviarCorreos(reclamo, pdf);
    correoEnviado = estados.consumidor === "enviado";
  } catch (e) {
    console.error(`[libro] ERROR generando PDF/correos de la hoja ${reclamo.numero_hoja}:`, e);
    try {
      await storage().actualizar(reclamo.numero_hoja, {
        estado_correo_consumidor: "error",
        estado_correo_proveedor: "error",
        ultimo_error: String(e?.message || e).slice(0, 1000),
      });
    } catch { /* ya registrado en logs */ }
  }

  console.info(`[libro] Hoja ${reclamo.numero_hoja} registrada (correo consumidor: ${correoEnviado ? "enviado" : "pendiente/error"})`);

  return res.status(201).json({
    ok: true,
    numeroHoja: reclamo.numero_hoja,
    fechaHora: formatoFechaHora(reclamo.creado_en),
    fechaLimite: formatoFechaLarga(reclamo.fecha_limite_respuesta),
    correoEnviado,
    pdfBase64: pdf ? Buffer.from(pdf).toString("base64") : null,
  });
}
