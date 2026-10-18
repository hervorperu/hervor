import { test } from "node:test";
import assert from "node:assert/strict";
import { feriadosDelAnio, sumarDiasHabiles, fechaLima, formatoFechaHora } from "../lib/fechas.js";

test("Jueves y Viernes Santo se calculan cada año", () => {
  assert.ok(feriadosDelAnio(2026).has("2026-04-02"));
  assert.ok(feriadosDelAnio(2026).has("2026-04-03"));
  assert.ok(feriadosDelAnio(2027).has("2027-03-25"));
  assert.ok(feriadosDelAnio(2027).has("2027-03-26"));
});

test("15 días hábiles desde el jueves 15/10/2026 → 05/11/2026", () => {
  assert.equal(sumarDiasHabiles(new Date("2026-10-15T15:00:00-05:00"), 15), "2026-11-05");
});

test("salta el 8 y 9 de diciembre", () => {
  assert.equal(sumarDiasHabiles(new Date("2026-12-01T10:00:00-05:00"), 15), "2026-12-24");
});

test("la fecha se toma en hora de Lima (23:30 en Lima ya es otro día en UTC)", () => {
  assert.deepEqual(fechaLima(new Date("2026-12-31T23:30:00-05:00")), { y: 2026, m: 12, d: 31 });
  assert.equal(formatoFechaHora("2026-12-31T23:30:00-05:00"), "31/12/2026 23:30");
});
