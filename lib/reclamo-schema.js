// Reglas de validación de la Hoja de Reclamación.
// Este módulo no depende de Node: lo usan el navegador (js/libro.js) y el backend (api/reclamos.js),
// así las reglas y los mensajes son siempre los mismos.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function texto(v) {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
}

// Conserva los saltos de línea en textos largos (detalle, pedido)
function parrafo(v) {
  return typeof v === "string" ? v.replace(/\r\n?/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim() : "";
}

function bool(v) {
  return v === true || v === "true" || v === "on" || v === "1";
}

function largo(errores, campo, valor, min, max, etiqueta) {
  if (!valor) errores[campo] = `Ingresa ${etiqueta}.`;
  else if (valor.length < min) errores[campo] = `${capitalizar(etiqueta)} debe tener al menos ${min} caracteres.`;
  else if (valor.length > max) errores[campo] = `${capitalizar(etiqueta)} no puede superar los ${max} caracteres.`;
}

function capitalizar(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const LIMITES = Object.freeze({
  consumidor_nombre: 120,
  numero_documento: 12,
  domicilio: 200,
  telefono: 20,
  email: 120,
  apoderado_nombre: 120,
  bien_descripcion: 500,
  detalle: 3000,
  pedido: 1500,
});

/**
 * Normaliza y valida los datos del formulario.
 * @returns {{ datos: object, errores: Record<string,string> }}
 */
export function validarReclamo(entrada = {}) {
  const errores = {};
  const d = {
    consumidor_nombre: texto(entrada.consumidor_nombre),
    tipo_documento: texto(entrada.tipo_documento).toUpperCase(),
    numero_documento: texto(entrada.numero_documento).replace(/\s/g, "").toUpperCase(),
    domicilio: texto(entrada.domicilio),
    telefono: texto(entrada.telefono),
    email: texto(entrada.email).toLowerCase(),
    es_menor: bool(entrada.es_menor),
    apoderado_nombre: texto(entrada.apoderado_nombre),
    bien_tipo: texto(entrada.bien_tipo),
    monto_reclamado: null,
    bien_descripcion: parrafo(entrada.bien_descripcion),
    tipo: texto(entrada.tipo),
    detalle: parrafo(entrada.detalle),
    pedido: parrafo(entrada.pedido),
    declara_veracidad: bool(entrada.declara_veracidad),
    acepta_tratamiento_datos: bool(entrada.acepta_tratamiento_datos),
  };

  // 1. Consumidor
  largo(errores, "consumidor_nombre", d.consumidor_nombre, 3, LIMITES.consumidor_nombre, "tu nombre completo");

  if (!["DNI", "CE"].includes(d.tipo_documento)) {
    errores.tipo_documento = "Elige el tipo de documento.";
  }
  if (!d.numero_documento) {
    errores.numero_documento = "Ingresa tu número de documento.";
  } else if (d.tipo_documento === "DNI" && !/^\d{8}$/.test(d.numero_documento)) {
    errores.numero_documento = "El DNI debe tener 8 dígitos.";
  } else if (d.tipo_documento === "CE" && !/^[A-Z0-9]{8,12}$/.test(d.numero_documento)) {
    errores.numero_documento = "El carné de extranjería debe tener entre 8 y 12 caracteres (letras o números).";
  }

  largo(errores, "domicilio", d.domicilio, 5, LIMITES.domicilio, "tu domicilio");

  const digitosTel = d.telefono.replace(/\D/g, "");
  if (!d.telefono) errores.telefono = "Ingresa tu teléfono.";
  else if (!/^\+?[\d\s()-]+$/.test(d.telefono) || digitosTel.length < 7 || digitosTel.length > 15) {
    errores.telefono = "Ingresa un teléfono válido (solo números, de 7 a 15 dígitos).";
  }

  if (!d.email) errores.email = "Ingresa tu correo electrónico.";
  else if (d.email.length > LIMITES.email || !EMAIL_RE.test(d.email)) {
    errores.email = "Ingresa un correo electrónico válido (por ejemplo, nombre@correo.com).";
  }

  if (d.es_menor) {
    largo(errores, "apoderado_nombre", d.apoderado_nombre, 3, LIMITES.apoderado_nombre, "el nombre del padre, madre o apoderado");
  } else {
    d.apoderado_nombre = "";
  }

  // 2. Bien contratado
  if (!["Producto", "Servicio"].includes(d.bien_tipo)) {
    errores.bien_tipo = "Indica si se trata de un producto o de un servicio.";
  }
  const montoTexto = texto(entrada.monto_reclamado).replace(/^S\/\s*/i, "").replace(",", ".");
  if (montoTexto) {
    if (!/^\d{1,6}(\.\d{1,2})?$/.test(montoTexto)) {
      errores.monto_reclamado = "Ingresa un monto válido en soles (por ejemplo, 15.50).";
    } else {
      d.monto_reclamado = Number(montoTexto).toFixed(2);
    }
  }
  largo(errores, "bien_descripcion", d.bien_descripcion, 3, LIMITES.bien_descripcion, "la descripción del producto o servicio");

  // 3. Detalle
  if (!["Reclamo", "Queja"].includes(d.tipo)) {
    errores.tipo = "Elige si es un reclamo o una queja.";
  }
  largo(errores, "detalle", d.detalle, 10, LIMITES.detalle, "el detalle");
  largo(errores, "pedido", d.pedido, 5, LIMITES.pedido, "tu pedido");

  // 4. Declaraciones
  if (!d.declara_veracidad) {
    errores.declara_veracidad = "Debes declarar que la información proporcionada es verdadera.";
  }
  if (!d.acepta_tratamiento_datos) {
    errores.acepta_tratamiento_datos = "Debes aceptar el tratamiento de tus datos personales para registrar la hoja.";
  }

  return { datos: d, errores };
}
