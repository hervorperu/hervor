// GET /api/cron/mantenimiento — lo ejecuta Vercel Cron una vez al día (ver vercel.json).
// 1) Mantiene activo el proyecto gratuito de Supabase.
// 2) Reintenta los correos que fallaron (máx. 5 intentos por hoja).
import { storage } from "../../lib/storage/index.js";
import { enviarCorreos, generarHojaPdf } from "../../lib/servicio.js";

export default async function handler(req, res) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || req.headers.authorization !== `Bearer ${secreto}`) {
    return res.status(401).json({ ok: false });
  }

  const db = storage();
  await db.ping();

  const pendientes = await db.pendientesDeCorreo(20);
  const resultado = [];
  for (const r of pendientes) {
    try {
      const pdf = await generarHojaPdf(r);
      resultado.push({ hoja: r.numero_hoja, ...(await enviarCorreos(r, pdf, { soloPendientes: true })) });
    } catch (e) {
      console.error(`[libro] Reintento fallido hoja ${r.numero_hoja}:`, e);
      resultado.push({ hoja: r.numero_hoja, error: true });
    }
  }
  return res.status(200).json({ ok: true, reintentos: resultado });
}
