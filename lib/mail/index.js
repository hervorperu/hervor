// Módulo ÚNICO de envío de correos. El resto del código solo llama a enviarCorreo().
// Proveedor elegido con MAIL_PROVIDER:
//   smtp   → Gmail (u otro SMTP) con Nodemailer          [hoy]
//   resend → API de Resend (requiere dominio propio)      [migración futura]
//   outbox → guarda los correos en .outbox/ (solo pruebas locales)
import * as smtp from "./smtp.js";
import * as resend from "./resend.js";
import * as outbox from "./outbox.js";

const PROVEEDORES = { smtp, resend, outbox };

export function remitente() {
  const nombre = process.env.MAIL_FROM_NAME || "Hervor";
  const direccion = process.env.MAIL_FROM_ADDRESS || process.env.SMTP_USER;
  if (!direccion) throw new Error("Falta MAIL_FROM_ADDRESS.");
  return { nombre, direccion, texto: `"${nombre.replace(/"/g, "")}" <${direccion}>` };
}

/**
 * @param {{ to: string, subject: string, html: string, text: string,
 *           attachments?: { filename: string, content: Buffer|Uint8Array, contentType: string }[] }} mensaje
 */
export async function enviarCorreo(mensaje) {
  const nombre = (process.env.MAIL_PROVIDER || "smtp").toLowerCase();
  const proveedor = PROVEEDORES[nombre];
  if (!proveedor) throw new Error(`MAIL_PROVIDER desconocido: ${nombre}`);
  if (nombre === "outbox" && process.env.VERCEL) {
    throw new Error("MAIL_PROVIDER=outbox no está permitido en Vercel.");
  }
  return proveedor.enviar({
    ...mensaje,
    from: remitente(),
    replyTo: process.env.MAIL_REPLY_TO || undefined,
  });
}
