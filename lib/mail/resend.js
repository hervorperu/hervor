// Envío con Resend (https://resend.com). Requiere RESEND_API_KEY y un dominio verificado
// en Resend; MAIL_FROM_ADDRESS debe ser de ese dominio (p. ej. reclamos@tudominio.pe).
export async function enviar({ from, to, replyTo, subject, html, text, attachments = [] }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Falta RESEND_API_KEY.");
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: from.texto,
      to: [to],
      reply_to: replyTo,
      subject,
      html,
      text,
      attachments: attachments.map((a) => ({
        filename: a.filename,
        content: Buffer.from(a.content).toString("base64"),
        content_type: a.contentType,
      })),
    }),
    signal: AbortSignal.timeout(15000),
  });
  const cuerpo = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(`Resend ${resp.status}: ${cuerpo.message || "error desconocido"}`);
  return { id: cuerpo.id };
}
