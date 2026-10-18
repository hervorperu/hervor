// SOLO PRUEBAS LOCALES: en vez de enviar, guarda cada correo en la carpeta .outbox/
// (HTML + adjuntos) para revisarlo en el navegador. Bloqueado en Vercel.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export async function enviar({ from, to, subject, html, text, attachments = [] }) {
  const dir = path.join(process.cwd(), ".outbox", `${Date.now()}-${randomUUID().slice(0, 8)}-${to.replace(/[^a-z0-9]/gi, "_")}`);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "correo.html"), html);
  await writeFile(path.join(dir, "correo.txt"), `De: ${from.texto}\nPara: ${to}\nAsunto: ${subject}\n\n${text}`);
  for (const a of attachments) await writeFile(path.join(dir, a.filename), Buffer.from(a.content));
  return { id: dir };
}
