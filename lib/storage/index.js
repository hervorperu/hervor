// Punto único de acceso al almacenamiento de hojas de reclamación.
// El driver se elige con STORAGE_DRIVER: "supabase" (producción) o "memory" (solo pruebas locales).
import * as supabase from "./supabase.js";
import * as memory from "./memory.js";

const DRIVERS = { supabase, memory };

export function storage() {
  const nombre = (process.env.STORAGE_DRIVER || "supabase").toLowerCase();
  const driver = DRIVERS[nombre];
  if (!driver) throw new Error(`STORAGE_DRIVER desconocido: ${nombre}`);
  if (nombre === "memory" && process.env.VERCEL) {
    throw new Error("STORAGE_DRIVER=memory no está permitido en Vercel: configura Supabase.");
  }
  return driver;
}
