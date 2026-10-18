// Fechas en hora de Lima y cálculo de días hábiles (excluye sábados, domingos y feriados de Perú).

export const ZONA = "America/Lima";

/**
 * Feriados nacionales extraordinarios o nuevos que el Gobierno declare.
 * Formato "AAAA-MM-DD". Revísalo cada año (fuente: gob.pe/feriados).
 */
export const FERIADOS_EXTRA = [];

// Feriados nacionales fijos (MM-DD)
const FERIADOS_FIJOS = [
  "01-01", // Año Nuevo
  "05-01", // Día del Trabajo
  "06-07", // Batalla de Arica y Día de la Bandera
  "06-29", // San Pedro y San Pablo
  "07-23", // Día de la Fuerza Aérea del Perú
  "07-28", // Fiestas Patrias
  "07-29", // Fiestas Patrias
  "08-06", // Batalla de Junín
  "08-30", // Santa Rosa de Lima
  "10-08", // Combate de Angamos
  "11-01", // Todos los Santos
  "12-08", // Inmaculada Concepción
  "12-09", // Batalla de Ayacucho
  "12-25", // Navidad
];

const pad = (n) => String(n).padStart(2, "0");
const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

// Domingo de Pascua (algoritmo de Meeus/Jones/Butcher)
function pascua(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return Date.UTC(y, mes - 1, dia);
}

const cacheFeriados = new Map();

/** Conjunto de feriados del año en formato "AAAA-MM-DD". */
export function feriadosDelAnio(y) {
  if (!cacheFeriados.has(y)) {
    const set = new Set(FERIADOS_FIJOS.map((md) => `${y}-${md}`));
    const p = pascua(y);
    for (const offset of [-3, -2]) { // Jueves y Viernes Santo
      const dt = new Date(p + offset * 86400000);
      set.add(iso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()));
    }
    FERIADOS_EXTRA.filter((f) => f.startsWith(`${y}-`)).forEach((f) => set.add(f));
    cacheFeriados.set(y, set);
  }
  return cacheFeriados.get(y);
}

/** Fecha calendario en Lima de un instante: { y, m, d } */
export function fechaLima(instante = new Date()) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(instante);
  const get = (t) => Number(partes.find((p) => p.type === t).value);
  return { y: get("year"), m: get("month"), d: get("day") };
}

export function esDiaHabil(y, m, d) {
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return dow !== 0 && dow !== 6 && !feriadosDelAnio(y).has(iso(y, m, d));
}

/**
 * Fecha límite de respuesta: se cuentan N días hábiles a partir del día
 * siguiente a la recepción. Devuelve "AAAA-MM-DD".
 */
export function sumarDiasHabiles(instante, dias) {
  const { y, m, d } = fechaLima(instante);
  let t = Date.UTC(y, m - 1, d);
  let contados = 0;
  while (contados < dias) {
    t += 86400000;
    const dt = new Date(t);
    if (esDiaHabil(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate())) contados++;
  }
  const fin = new Date(t);
  return iso(fin.getUTCFullYear(), fin.getUTCMonth() + 1, fin.getUTCDate());
}

/** "18/10/2026 18:20" en hora de Lima */
export function formatoFechaHora(instante) {
  const f = new Intl.DateTimeFormat("es-PE", {
    timeZone: ZONA, day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(instante));
  const g = (t) => f.find((p) => p.type === t).value;
  return `${g("day")}/${g("month")}/${g("year")} ${g("hour")}:${g("minute")}`;
}

/** "AAAA-MM-DD" → "dd/mm/aaaa" */
export function formatoFecha(fechaIso) {
  if (!fechaIso) return "";
  const [y, m, d] = String(fechaIso).slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

/** "AAAA-MM-DD" → "lunes, 9 de noviembre de 2026" */
export function formatoFechaLarga(fechaIso) {
  const [y, m, d] = String(fechaIso).slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}
