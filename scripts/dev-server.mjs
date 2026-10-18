// Servidor de desarrollo local que imita a Vercel:
//  - sirve los archivos estáticos con "cleanUrls" (/libro-de-reclamaciones → libro-de-reclamaciones.html)
//  - ejecuta las funciones de /api con los mismos helpers (req.body, req.query, res.status().json())
// Uso: npm run dev   (lee las variables de .env.local si existe)
import http from "node:http";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const RAIZ = process.cwd();
const PUERTO = Number(process.env.PORT || 5173);
const TIPOS = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg",
  ".svg": "image/svg+xml", ".pdf": "application/pdf", ".txt": "text/plain; charset=utf-8", ".ico": "image/x-icon",
  ".webp": "image/webp", ".woff": "font/woff", ".woff2": "font/woff2",
};
const BLOQUEADOS = [/^\/\.env/, /^\/\.git/, /^\/node_modules\//, /^\/\.outbox\//];

function ayudantes(res) {
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (o) => { if (!res.getHeader("Content-Type")) res.setHeader("Content-Type", "application/json; charset=utf-8"); res.end(JSON.stringify(o)); return res; };
  res.send = (b) => { if (typeof b === "object" && !Buffer.isBuffer(b)) return res.json(b); res.end(b); return res; };
}

async function leerCuerpo(req) {
  const trozos = [];
  for await (const t of req) trozos.push(t);
  const crudo = Buffer.concat(trozos).toString();
  if ((req.headers["content-type"] || "").includes("application/json")) {
    try { return JSON.parse(crudo || "null"); } catch { return crudo; }
  }
  return crudo || undefined;
}

async function existe(p) {
  try { return (await stat(p)).isFile(); } catch { return false; }
}

async function api(req, res, url) {
  const archivo = path.join(RAIZ, `${url.pathname.replace(/\/$/, "")}.js`);
  if (!archivo.startsWith(path.join(RAIZ, "api")) || !(await existe(archivo))) {
    return res.status(404).json({ error: "No encontrado" });
  }
  req.query = Object.fromEntries(url.searchParams);
  req.body = await leerCuerpo(req);
  const mod = await import(`${pathToFileURL(archivo).href}?v=${(await stat(archivo)).mtimeMs}`);
  await mod.default(req, res);
}

async function estatico(req, res, url) {
  let ruta = decodeURIComponent(url.pathname);
  if (BLOQUEADOS.some((r) => r.test(ruta))) return res.status(404).send("No encontrado");
  if (ruta.endsWith(".html")) { // cleanUrls: redirige a la URL limpia
    res.statusCode = 308;
    res.setHeader("Location", ruta.replace(/(index)?\.html$/, "") || "/");
    return res.end();
  }
  const candidatos = ruta === "/" ? ["index.html"] : [ruta, `${ruta}.html`];
  for (const c of candidatos) {
    const p = path.join(RAIZ, c);
    if (!p.startsWith(RAIZ)) break;
    if (await existe(p)) {
      res.setHeader("Content-Type", TIPOS[path.extname(p)] || "application/octet-stream");
      res.setHeader("Cache-Control", "no-store");
      return res.end(await readFile(p));
    }
  }
  res.statusCode = 404;
  res.end("No encontrado");
}

// Bandeja local de correos de prueba (MAIL_PROVIDER=outbox): http://localhost:5173/__outbox
async function outbox(req, res, url) {
  const dir = path.join(RAIZ, ".outbox");
  const resto = decodeURIComponent(url.pathname.replace(/^\/__outbox\/?/, ""));
  if (!resto) {
    let carpetas = [];
    try { carpetas = (await readdir(dir)).sort().reverse(); } catch { /* vacío */ }
    const items = await Promise.all(carpetas.map(async (c) => {
      const asunto = (await readFile(path.join(dir, c, "correo.txt"), "utf8")).split("\n").slice(0, 3).join(" · ");
      const pdf = (await readdir(path.join(dir, c))).find((f) => f.endsWith(".pdf"));
      return `<li><a href="/__outbox/${c}/correo.html">${asunto.replace(/</g, "&lt;")}</a>${pdf ? ` · <a href="/__outbox/${c}/${pdf}">PDF</a>` : ""}</li>`;
    }));
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.end(`<!doctype html><meta charset="utf-8"><title>Bandeja de pruebas</title><body style="font-family:sans-serif;padding:24px"><h1>Correos de prueba (.outbox)</h1><ul>${items.join("") || "<li>Sin correos</li>"}</ul>`);
  }
  const p = path.join(dir, resto);
  if (!p.startsWith(dir) || !(await existe(p))) return res.status(404).send("No encontrado");
  res.setHeader("Content-Type", TIPOS[path.extname(p)] || "application/octet-stream");
  return res.end(await readFile(p));
}

http.createServer(async (req, res) => {
  ayudantes(res);
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname.startsWith("/api/")) await api(req, res, url);
    else if (url.pathname.startsWith("/__outbox")) await outbox(req, res, url);
    else await estatico(req, res, url);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) res.status(500).json({ error: "Error interno" });
  }
  console.log(`${req.method} ${url.pathname} → ${res.statusCode}`);
}).listen(PUERTO, "127.0.0.1", () => {
  console.log(`Hervor en http://localhost:${PUERTO}`);
  console.log(`Almacenamiento: ${process.env.STORAGE_DRIVER || "supabase"} · Correo: ${process.env.MAIL_PROVIDER || "smtp"}`);
});
