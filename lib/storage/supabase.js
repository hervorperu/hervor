// Almacenamiento en Supabase (Postgres) mediante su API REST (PostgREST).
// Requiere SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY. Ver supabase/schema.sql.

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  return { url: url.replace(/\/$/, ""), key };
}

async function rest(ruta, { method = "GET", body, prefer } = {}) {
  const { url, key } = config();
  const resp = await fetch(`${url}/rest/v1/${ruta}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  const texto = await resp.text();
  if (!resp.ok) throw new Error(`Supabase ${method} ${ruta.split("?")[0]} → ${resp.status}: ${texto.slice(0, 300)}`);
  return texto ? JSON.parse(texto) : null;
}

export async function registrar({ datos, creadoEn, fechaLimite, ipHash, userAgent }) {
  const filas = await rest("rpc/registrar_reclamo", {
    method: "POST",
    body: {
      p: { ...datos, ip_hash: ipHash, user_agent: userAgent },
      p_creado_en: new Date(creadoEn).toISOString(),
      p_fecha_limite: fechaLimite,
    },
  });
  const f = Array.isArray(filas) ? filas[0] : filas;
  if (!f?.numero_hoja) throw new Error("Supabase no devolvió el número de hoja.");
  return { numeroHoja: f.numero_hoja, correlativo: f.correlativo, creadoEn: f.creado_en };
}

export async function actualizar(numeroHoja, cambios) {
  await rest(`reclamos?numero_hoja=eq.${encodeURIComponent(numeroHoja)}`, {
    method: "PATCH", body: cambios, prefer: "return=minimal",
  });
}

export async function obtener(numeroHoja) {
  const filas = await rest(`reclamos?select=*&numero_hoja=eq.${encodeURIComponent(numeroHoja)}&limit=1`);
  return filas?.[0] || null;
}

export async function contarRecientesPorIp(ipHash, desde) {
  const filas = await rest(
    `reclamos?select=id&ip_hash=eq.${encodeURIComponent(ipHash)}&creado_en=gte.${encodeURIComponent(desde.toISOString())}&limit=50`,
  );
  return filas.length;
}

export async function pendientesDeCorreo(limite = 20) {
  return rest(
    `reclamos?select=*&or=(estado_correo_consumidor.neq.enviado,estado_correo_proveedor.neq.enviado)&intentos_correo=lt.5&order=creado_en.asc&limit=${limite}`,
  );
}

// Consulta mínima para mantener activo el proyecto gratuito de Supabase
export async function ping() {
  await rest("contadores_hoja?select=anio&limit=1");
  return true;
}
