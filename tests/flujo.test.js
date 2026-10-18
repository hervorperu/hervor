// Flujo completo con almacenamiento en memoria y correos en .outbox/ (sin servicios externos).
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readdir, rm } from "node:fs/promises";
import { valido } from "./fixtures.js";

before(async () => {
  process.env.STORAGE_DRIVER = "memory";
  process.env.MAIL_PROVIDER = "outbox";
  process.env.MAIL_FROM_ADDRESS = "hervor@example.com";
  process.env.OWNER_EMAIL = "dueno@example.com";
  await rm(".outbox", { recursive: true, force: true });
});

function fakeRes() {
  const res = { statusCode: 200, headers: {}, body: null };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  res.send = (b) => { res.body = b; return res; };
  res.setHeader = (k, v) => { res.headers[k] = v; };
  return res;
}

const req = (body, ip) => ({ method: "POST", body, headers: { "x-forwarded-for": ip, "user-agent": "test" } });

test("dos envíos simultáneos reciben correlativos consecutivos y sin duplicados", async () => {
  const { default: handler } = await import("../api/reclamos.js");
  const [a, b] = [fakeRes(), fakeRes()];
  await Promise.all([
    handler(req({ ...valido, _t: 9000 }, "1.1.1.1"), a),
    handler(req({ ...valido, email: "otro@example.com", _t: 9000 }, "2.2.2.2"), b),
  ]);
  assert.equal(a.statusCode, 201);
  assert.equal(b.statusCode, 201);
  const anio = new Date().getFullYear();
  assert.deepEqual([a.body.numeroHoja, b.body.numeroHoja].sort(), [`0001-${anio}`, `0002-${anio}`]);
  assert.ok(a.body.correoEnviado);
  assert.ok(Buffer.from(a.body.pdfBase64, "base64").subarray(0, 5).toString() === "%PDF-");
  // 2 hojas × (consumidor + proveedor)
  assert.equal((await readdir(".outbox")).length, 4);
});

test("el campo trampa (honeypot) bloquea bots", async () => {
  const { default: handler } = await import("../api/reclamos.js");
  const r = fakeRes();
  await handler(req({ ...valido, sitio_web: "spam", _t: 9000 }, "3.3.3.3"), r);
  assert.equal(r.statusCode, 400);
});

test("datos inválidos devuelven 422 con errores por campo", async () => {
  const { default: handler } = await import("../api/reclamos.js");
  const r = fakeRes();
  await handler(req({ ...valido, email: "no-es-correo", _t: 9000 }, "4.4.4.4"), r);
  assert.equal(r.statusCode, 422);
  assert.ok(r.body.errores.email);
});

test("si el correo falla, la hoja queda registrada y se informa al consumidor", async () => {
  const { default: handler } = await import("../api/reclamos.js");
  process.env.MAIL_PROVIDER = "smtp"; // sin credenciales SMTP → el envío falla
  delete process.env.SMTP_HOST;
  const r = fakeRes();
  await handler(req({ ...valido, _t: 9000 }, "5.5.5.5"), r);
  process.env.MAIL_PROVIDER = "outbox";
  assert.equal(r.statusCode, 201);
  assert.equal(r.body.correoEnviado, false);
  assert.ok(r.body.pdfBase64);
  const { storage } = await import("../lib/storage/index.js");
  const fila = await storage().obtener(r.body.numeroHoja);
  assert.equal(fila.estado_correo_consumidor, "error");
  assert.equal((await storage().pendientesDeCorreo()).length, 1); // el cron lo reintentará
});

test("si el guardado falla, responde 503 con un mensaje claro", async () => {
  const { default: handler } = await import("../api/reclamos.js");
  process.env.STORAGE_DRIVER = "supabase"; // sin credenciales → falla
  delete process.env.SUPABASE_URL;
  const r = fakeRes();
  await handler(req({ ...valido, _t: 9000 }, "6.6.6.6"), r);
  process.env.STORAGE_DRIVER = "memory";
  assert.equal(r.statusCode, 503);
  assert.match(r.body.error, /Tus datos siguen en el formulario/);
});
