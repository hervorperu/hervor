// Lógica del Libro de Reclamaciones compartida por las funciones de /api.
import { createHash } from "node:crypto";
import { storage } from "./storage/index.js";
import { generarHojaPdf } from "./pdf.js";
import { enviarCorreo } from "./mail/index.js";
import { correoConsumidor, correoProveedor } from "./mail/plantillas.js";
import { sumarDiasHabiles } from "./fechas.js";
import { PLAZO_DIAS_HABILES } from "./proveedor.js";

export function hashIp(ip) {
  return createHash("sha256").update(`hervor:${ip || "desconocida"}`).digest("hex").slice(0, 32);
}

export function nombreArchivo(numero) {
  return `Hoja-de-Reclamacion-${numero}.pdf`;
}

/** Registra la hoja de forma atómica y devuelve el registro completo. */
export async function registrarHoja(datos, { ip, userAgent } = {}) {
  const creadoEn = new Date();
  const fechaLimite = sumarDiasHabiles(creadoEn, PLAZO_DIAS_HABILES);
  const db = storage();
  const res = await db.registrar({
    datos,
    creadoEn,
    fechaLimite,
    ipHash: hashIp(ip),
    userAgent: String(userAgent || "").slice(0, 300),
  });
  return {
    ...datos,
    numero_hoja: res.numeroHoja,
    correlativo: res.correlativo,
    creado_en: res.creadoEn,
    fecha_limite_respuesta: fechaLimite,
  };
}

/**
 * Envía la constancia al consumidor y la alerta al proveedor.
 * Nunca lanza: devuelve el estado de cada envío y lo guarda en la base.
 */
export async function enviarCorreos(reclamo, pdf, { soloPendientes = false } = {}) {
  const adjunto = [{ filename: nombreArchivo(reclamo.numero_hoja), content: pdf, contentType: "application/pdf" }];
  const estados = {
    consumidor: reclamo.estado_correo_consumidor || "pendiente",
    proveedor: reclamo.estado_correo_proveedor || "pendiente",
  };
  const errores = [];

  const tareas = [];
  if (!soloPendientes || estados.consumidor !== "enviado") {
    tareas.push(["consumidor", () => enviarCorreo({ to: reclamo.email, ...correoConsumidor(reclamo), attachments: adjunto })]);
  }
  if (!soloPendientes || estados.proveedor !== "enviado") {
    const owner = process.env.OWNER_EMAIL;
    tareas.push(["proveedor", () => {
      if (!owner) throw new Error("Falta OWNER_EMAIL.");
      return enviarCorreo({ to: owner, ...correoProveedor(reclamo), attachments: adjunto });
    }]);
  }

  const resultados = await Promise.allSettled(tareas.map(([, fn]) => fn()));
  resultados.forEach((r, i) => {
    const quien = tareas[i][0];
    if (r.status === "fulfilled") estados[quien] = "enviado";
    else {
      estados[quien] = "error";
      errores.push(`${quien}: ${r.reason?.message || r.reason}`);
      console.error(`[libro] Error enviando correo (${quien}) hoja ${reclamo.numero_hoja}:`, r.reason);
    }
  });

  try {
    await storage().actualizar(reclamo.numero_hoja, {
      estado_correo_consumidor: estados.consumidor,
      estado_correo_proveedor: estados.proveedor,
      intentos_correo: (reclamo.intentos_correo || 0) + 1,
      ultimo_error: errores.length ? errores.join(" | ").slice(0, 1000) : null,
    });
  } catch (e) {
    console.error(`[libro] No se pudo guardar el estado de correo de la hoja ${reclamo.numero_hoja}:`, e);
  }
  return estados;
}

export { generarHojaPdf };
