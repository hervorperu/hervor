// Almacenamiento EN MEMORIA solo para pruebas locales (scripts/dev-server.mjs y tests).
// No persiste nada: al reiniciar el servidor se pierde todo. Bloqueado en Vercel.
const contadores = new Map();
const filas = [];

function anioLima(instante) {
  return Number(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric" }).format(new Date(instante)));
}

export async function registrar({ datos, limites, ipHash, userAgent }) {
  // Sin "await" entre leer e incrementar: es atómico dentro del mismo proceso
  const creadoEn = new Date();
  const fecha = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(creadoEn);
  const fechaLimite = limites[fecha];
  if (!fechaLimite) throw new Error(`Falta la fecha límite para ${fecha}`);
  const anio = anioLima(creadoEn);
  const n = (contadores.get(anio) || 0) + 1;
  contadores.set(anio, n);
  const numero_hoja = `${String(n).padStart(4, "0")}-${anio}`;
  filas.push({
    id: filas.length + 1, numero_hoja, anio, correlativo: n,
    creado_en: creadoEn.toISOString(), fecha_limite_respuesta: fechaLimite,
    ...datos, respuesta: null, fecha_respuesta: null,
    estado_correo_consumidor: "pendiente", estado_correo_proveedor: "pendiente",
    intentos_correo: 0, ultimo_error: null, ip_hash: ipHash, user_agent: userAgent,
  });
  return { numeroHoja: numero_hoja, correlativo: n, creadoEn: creadoEn.toISOString(), fechaLimite };
}

export async function actualizar(numeroHoja, cambios) {
  const f = filas.find((r) => r.numero_hoja === numeroHoja);
  if (f) Object.assign(f, cambios);
}

export async function obtener(numeroHoja) {
  return filas.find((r) => r.numero_hoja === numeroHoja) || null;
}

export async function contarRecientesPorIp(ipHash, desde) {
  return filas.filter((r) => r.ip_hash === ipHash && r.creado_en >= desde.toISOString()).length;
}

export async function pendientesDeCorreo(limite = 20) {
  return filas
    .filter((r) => (r.estado_correo_consumidor !== "enviado" || r.estado_correo_proveedor !== "enviado") && r.intentos_correo < 5)
    .slice(0, limite);
}

export async function ping() {
  return true;
}
