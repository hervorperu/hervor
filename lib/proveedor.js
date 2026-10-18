// Datos fijos del proveedor que encabezan cada Hoja de Reclamación (Anexo I).
export const PROVEEDOR = Object.freeze({
  nombre: "MILTON CESAR NICOLAS BRUNO",
  ruc: "10755112963",
  domicilio: "CALLE ISLA SAN LORENZO 169",
  marca: "Hervor",
});

// Plazo legal de respuesta (días hábiles, improrrogable).
export const PLAZO_DIAS_HABILES = 15;

export const DEFINICIONES = Object.freeze({
  Reclamo: "Disconformidad relacionada a los productos o servicios.",
  Queja: "Disconformidad no relacionada a los productos o servicios; o malestar o descontento respecto a la atención al público.",
});

export const TEXTOS_LEGALES = Object.freeze([
  "La formulación del reclamo no impide acudir a otras vías de solución de controversias ni es requisito previo para interponer una denuncia ante el INDECOPI.",
  "El proveedor debe dar respuesta al reclamo o queja en un plazo no mayor a quince (15) días hábiles, el cual es improrrogable.",
]);
