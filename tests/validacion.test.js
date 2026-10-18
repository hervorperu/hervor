import { test } from "node:test";
import assert from "node:assert/strict";
import { validarReclamo } from "../lib/reclamo-schema.js";

import { valido } from "./fixtures.js";

test("un formulario completo es válido y normaliza el monto", () => {
  const { datos, errores } = validarReclamo(valido);
  assert.deepEqual(errores, {});
  assert.equal(datos.monto_reclamado, "12.50");
});

test("campos obligatorios vacíos dan mensajes en español", () => {
  const { errores } = validarReclamo({});
  for (const k of ["consumidor_nombre", "numero_documento", "domicilio", "telefono", "email", "bien_tipo", "bien_descripcion", "tipo", "detalle", "pedido", "declara_veracidad", "acepta_tratamiento_datos"]) {
    assert.ok(errores[k], `falta error en ${k}`);
  }
});

test("menor de edad exige apoderado", () => {
  assert.ok(validarReclamo({ ...valido, es_menor: true }).errores.apoderado_nombre);
  assert.deepEqual(validarReclamo({ ...valido, es_menor: true, apoderado_nombre: "Rosa Quispe" }).errores, {});
});

test("DNI de 8 dígitos y CE alfanumérico", () => {
  assert.ok(validarReclamo({ ...valido, numero_documento: "1234" }).errores.numero_documento);
  assert.deepEqual(validarReclamo({ ...valido, tipo_documento: "CE", numero_documento: "001234567" }).errores, {});
});
