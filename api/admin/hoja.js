// GET /api/admin/hoja?numero=0001-2026 — descarga la hoja en PDF, incluida tu respuesta
// (sección 4) si ya la registraste en Supabase. Protegido con usuario "hervor" y ADMIN_PASSWORD.
import { timingSafeEqual } from "node:crypto";
import { storage } from "../../lib/storage/index.js";
import { generarHojaPdf, nombreArchivo } from "../../lib/servicio.js";

function autorizado(req) {
  const clave = process.env.ADMIN_PASSWORD;
  if (!clave) return false;
  const [tipo, valor] = String(req.headers.authorization || "").split(" ");
  if (tipo !== "Basic" || !valor) return false;
  const esperado = Buffer.from(`hervor:${clave}`);
  const recibido = Buffer.from(Buffer.from(valor, "base64").toString());
  return recibido.length === esperado.length && timingSafeEqual(recibido, esperado);
}

export default async function handler(req, res) {
  if (!autorizado(req)) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Hervor - Libro de Reclamaciones", charset="UTF-8"');
    return res.status(401).send("Acceso restringido.");
  }
  const numero = String(req.query?.numero || "").trim();
  if (!/^\d{4,}-\d{4}$/.test(numero)) {
    return res.status(400).send("Indica el número de hoja, por ejemplo: ?numero=0001-2026");
  }
  const r = await storage().obtener(numero);
  if (!r) return res.status(404).send(`No existe la hoja ${numero}.`);

  const pdf = await generarHojaPdf(r);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${nombreArchivo(numero)}"`);
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).send(Buffer.from(pdf));
}
