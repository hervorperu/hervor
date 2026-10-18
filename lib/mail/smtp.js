import nodemailer from "nodemailer";

let transporte;

function obtenerTransporte() {
  if (!transporte) {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) throw new Error("Faltan SMTP_HOST, SMTP_USER o SMTP_PASS.");
    const puerto = Number(SMTP_PORT || 465);
    transporte = nodemailer.createTransport({
      host: SMTP_HOST,
      port: puerto,
      secure: puerto === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
    });
  }
  return transporte;
}

export async function enviar({ from, to, replyTo, subject, html, text, attachments = [] }) {
  const info = await obtenerTransporte().sendMail({
    from: from.texto,
    to,
    replyTo,
    subject,
    html,
    text,
    attachments: attachments.map((a) => ({
      filename: a.filename,
      content: Buffer.from(a.content),
      contentType: a.contentType,
    })),
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  return { id: info.messageId };
}
