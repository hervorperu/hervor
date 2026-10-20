// Genera el PDF de la Hoja de Reclamación (formato del Anexo I, D.S. 011-2011-PCM)
// con el logo, la tipografía (Montserrat) y los colores de Hervor.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { PROVEEDOR, DEFINICIONES, TEXTOS_LEGALES } from "./proveedor.js";
import { formatoFechaHora, formatoFecha } from "./fechas.js";

const hex = (h) => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
const COLOR = {
  morado: hex("#46295A"),
  dorado: hex("#D6A74E"),
  crema: hex("#EDE9E6"),
  papel: hex("#FBF7F1"),
};

const A4 = [595.28, 841.89];
const M = 40; // margen
const ANCHO = A4[0] - 2 * M;

let recursos; // caché entre invocaciones de la función

async function cargarRecursos() {
  if (!recursos) {
    const raiz = process.cwd();
    const fuente = (f) => readFile(path.join(raiz, "node_modules/@fontsource/montserrat/files", f));
    const [regular, semibold, bold, italica, logo] = await Promise.all([
      fuente("montserrat-latin-400-normal.woff"),
      fuente("montserrat-latin-600-normal.woff"),
      fuente("montserrat-latin-700-normal.woff"),
      fuente("montserrat-latin-600-italic.woff"),
      readFile(path.join(raiz, "assets/img/logo-hervor.png")),
    ]);
    recursos = { regular, semibold, bold, italica, logo };
  }
  return recursos;
}

class Hoja {
  constructor(doc, fuentes, logo, numero, creadoEn) {
    Object.assign(this, { doc, f: fuentes, logo, numero, creadoEn });
    this.paginas = [];
    this.nuevaPagina(true);
  }

  // Reemplaza caracteres que la fuente no puede dibujar (emojis, etc.)
  limpio(texto, fuente = this.f.regular) {
    const soportados = (this._soportados ||= new Map());
    if (!soportados.has(fuente)) soportados.set(fuente, new Set(fuente.getCharacterSet()));
    const set = soportados.get(fuente);
    return Array.from(String(texto ?? "")).map((ch) => (ch === "\n" || set.has(ch.codePointAt(0)) ? ch : "?")).join("");
  }

  nuevaPagina(primera = false) {
    this.page = this.doc.addPage(A4);
    this.paginas.push(this.page);
    this.page.drawRectangle({ x: 0, y: 0, width: A4[0], height: A4[1], color: COLOR.papel });
    if (primera) {
      this.cabeceraPrincipal();
    } else {
      this.y = A4[1] - M;
      this.texto(`HOJA DE RECLAMACIÓN N° ${this.numero} (continuación)`, M, this.y - 8, 8, this.f.bold, COLOR.morado);
      this.y -= 24;
    }
  }

  espacio(alto) {
    if (this.y - alto < 44) this.nuevaPagina();
  }

  texto(t, x, y, size, font, color = COLOR.morado) {
    this.page.drawText(this.limpio(t, font), { x, y, size, font, color });
  }

  ancho(t, size, font) {
    return font.widthOfTextAtSize(this.limpio(t, font), size);
  }

  // Divide un texto en líneas que caben en "ancho"
  lineas(t, size, font, ancho) {
    const salida = [];
    for (const parrafo of this.limpio(t, font).split("\n")) {
      let linea = "";
      for (const palabra of parrafo.split(/ +/)) {
        let p = palabra;
        // palabras más largas que la línea: se cortan
        while (font.widthOfTextAtSize(p, size) > ancho) {
          let i = p.length;
          while (i > 1 && font.widthOfTextAtSize(p.slice(0, i), size) > ancho) i--;
          if (linea) { salida.push(linea); linea = ""; }
          salida.push(p.slice(0, i));
          p = p.slice(i);
        }
        const prueba = linea ? `${linea} ${p}` : p;
        if (font.widthOfTextAtSize(prueba, size) <= ancho) linea = prueba;
        else { salida.push(linea); linea = p; }
      }
      salida.push(linea);
    }
    return salida;
  }

  cabeceraPrincipal() {
    const alto = 80;
    const top = A4[1];
    this.page.drawRectangle({ x: 0, y: top - alto, width: A4[0], height: alto, color: COLOR.morado });
    const escala = 150 / this.logo.width;
    this.page.drawImage(this.logo, { x: M, y: top - alto / 2 - (this.logo.height * escala) / 2, width: 150, height: this.logo.height * escala });

    const t1 = "LIBRO DE RECLAMACIONES";
    const t2 = "HOJA DE RECLAMACIÓN";
    this.texto(t1, A4[0] - M - this.ancho(t1, 14, this.f.bold), top - 37, 14, this.f.bold, COLOR.crema);
    this.texto(t2, A4[0] - M - this.ancho(t2, 10, this.f.semibold), top - 54, 10, this.f.semibold, COLOR.dorado);

    // Proveedor + N° de hoja + fecha
    let y = top - alto - 20;
    const anchoNum = 170;
    const xNum = A4[0] - M - anchoNum;
    this.page.drawRectangle({ x: xNum, y: y - 50, width: anchoNum, height: 56, borderColor: COLOR.dorado, borderWidth: 1.2, color: COLOR.papel });
    this.texto("HOJA DE RECLAMACIÓN N°", xNum + 12, y - 10, 7, this.f.bold);
    this.texto(this.numero, xNum + 12, y - 34, 20, this.f.bold, COLOR.morado);

    this.texto(PROVEEDOR.nombre, M, y - 6, 10.5, this.f.bold);
    this.texto(`RUC: ${PROVEEDOR.ruc}`, M, y - 22, 9, this.f.semibold);
    this.texto(`DOMICILIO: ${PROVEEDOR.domicilio}`, M, y - 36, 9, this.f.semibold);
    this.texto(`FECHA: ${formatoFechaHora(this.creadoEn)} (hora de Lima)`, M, y - 50, 9, this.f.semibold);
    this.y = y - 68;
  }

  // "reserva": alto mínimo que debe caber junto al título para no dejarlo huérfano
  seccion(titulo, reserva = 60) {
    this.espacio(reserva);
    this.y -= 6;
    this.page.drawRectangle({ x: M, y: this.y - 18, width: ANCHO, height: 20, color: COLOR.morado });
    this.texto(titulo, M + 10, this.y - 12, 8.5, this.f.bold, COLOR.crema);
    this.y -= 28;
  }

  // Campo con etiqueta y valor; varias columnas en la misma fila
  fila(campos) {
    const gap = 14;
    const anchoCol = (ANCHO - gap * (campos.length - 1)) / campos.length;
    const bloques = campos.map((c) => this.lineas(c.valor || " ", 9.5, this.f.regular, (c.ancho || anchoCol) - 2));
    const altoMax = Math.max(...bloques.map((b) => b.length)) * 12.5 + 12;
    this.espacio(Math.min(altoMax, 200));

    let x = M;
    let finY = this.y;
    campos.forEach((c, i) => {
      const w = c.ancho || anchoCol;
      let y = this.y;
      this.texto(c.etiqueta, x, y, 6.8, this.f.bold, COLOR.morado);
      y -= 12;
      for (const l of bloques[i]) {
        if (y < 48) { // salto de página dentro de textos largos
          this.nuevaPagina();
          y = this.y;
          finY = this.y;
        }
        this.texto(l, x, y, 9.5, this.f.regular);
        y -= 12.5;
      }
      this.page.drawLine({ start: { x, y: y + 8 }, end: { x: x + w, y: y + 8 }, thickness: .6, color: COLOR.dorado });
      finY = Math.min(finY, y - 4);
      x += w + gap;
    });
    this.y = finY - 4;
  }

  casilla(x, y, marcada, etiqueta) {
    this.page.drawRectangle({ x, y: y - 2, width: 10, height: 10, borderColor: COLOR.morado, borderWidth: 1 });
    if (marcada) {
      this.page.drawLine({ start: { x: x + 2, y }, end: { x: x + 8, y: y + 6 }, thickness: 1.4, color: COLOR.morado });
      this.page.drawLine({ start: { x: x + 2, y: y + 6 }, end: { x: x + 8, y }, thickness: 1.4, color: COLOR.morado });
    }
    this.texto(etiqueta, x + 15, y, 8.5, this.f.bold);
    return x + 15 + this.ancho(etiqueta, 8.5, this.f.bold) + 22;
  }

  filaCasillas(opciones, extra) {
    this.espacio(28);
    let x = M;
    for (const [etiqueta, marcada] of opciones) x = this.casilla(x, this.y - 6, marcada, etiqueta);
    if (extra) {
      const xExtra = M + ANCHO / 2;
      this.texto(extra.etiqueta, xExtra, this.y, 6.8, this.f.bold);
      this.texto(extra.valor, xExtra, this.y - 13, 9.5, this.f.regular);
      this.page.drawLine({ start: { x: xExtra, y: this.y - 18 }, end: { x: M + ANCHO, y: this.y - 18 }, thickness: .6, color: COLOR.dorado });
    }
    this.y -= 26;
  }

  parrafoPequeno(t, font = this.f.regular, size = 7.5) {
    for (const l of this.lineas(t, size, font, ANCHO)) {
      this.espacio(12);
      this.texto(l, M, this.y, size, font);
      this.y -= 10.5;
    }
  }

  pies() {
    const total = this.paginas.length;
    this.paginas.forEach((p, i) => {
      const t = `Hervor · Libro de Reclamaciones Virtual · Hoja N° ${this.numero} · Página ${i + 1} de ${total}`;
      p.drawLine({ start: { x: M, y: 30 }, end: { x: A4[0] - M, y: 30 }, thickness: .5, color: COLOR.dorado });
      p.drawText(this.limpio(t), { x: M, y: 18, size: 7, font: this.f.regular, color: COLOR.morado });
    });
  }
}

/**
 * @param {object} r  Registro completo de la hoja (columnas de la tabla "reclamos")
 * @returns {Promise<Uint8Array>}
 */
export async function generarHojaPdf(r) {
  const rec = await cargarRecursos();
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const f = {
    regular: await doc.embedFont(rec.regular, { subset: true }),
    semibold: await doc.embedFont(rec.semibold, { subset: true }),
    bold: await doc.embedFont(rec.bold, { subset: true }),
    italica: await doc.embedFont(rec.italica, { subset: true }),
  };
  const logo = await doc.embedPng(rec.logo);

  doc.setTitle(`Hoja de Reclamación N° ${r.numero_hoja}`);
  doc.setAuthor(`${PROVEEDOR.nombre} (Hervor)`);
  doc.setSubject("Libro de Reclamaciones Virtual");
  doc.setCreator("Hervor");
  doc.setLanguage("es-PE");

  const h = new Hoja(doc, f, logo, r.numero_hoja, r.creado_en);

  // 1
  h.seccion("1. IDENTIFICACIÓN DEL CONSUMIDOR RECLAMANTE");
  h.fila([{ etiqueta: "NOMBRE", valor: r.consumidor_nombre }]);
  h.fila([{ etiqueta: "DOMICILIO", valor: r.domicilio }]);
  h.fila([
    { etiqueta: "DNI / CE", valor: `${r.tipo_documento} ${r.numero_documento}` },
    { etiqueta: "TELÉFONO", valor: r.telefono },
    { etiqueta: "E-MAIL", valor: r.email },
  ]);
  h.fila([{ etiqueta: "PADRE O MADRE (PARA EL CASO DE MENORES DE EDAD)", valor: r.es_menor ? r.apoderado_nombre : "—" }]);

  // 2
  h.seccion("2. IDENTIFICACIÓN DEL BIEN CONTRATADO");
  h.filaCasillas(
    [["PRODUCTO", r.bien_tipo === "Producto"], ["SERVICIO", r.bien_tipo === "Servicio"]],
    { etiqueta: "MONTO RECLAMADO", valor: r.monto_reclamado != null && r.monto_reclamado !== "" ? `S/ ${Number(r.monto_reclamado).toFixed(2)}` : "—" },
  );
  h.fila([{ etiqueta: "DESCRIPCIÓN", valor: r.bien_descripcion }]);

  // 3
  h.seccion("3. DETALLE DE LA RECLAMACIÓN Y PEDIDO DEL CONSUMIDOR");
  h.filaCasillas([["RECLAMO¹", r.tipo === "Reclamo"], ["QUEJA²", r.tipo === "Queja"]]);
  h.fila([{ etiqueta: "DETALLE", valor: r.detalle }]);
  h.fila([{ etiqueta: "PEDIDO", valor: r.pedido }]);
  h.fila([{
    etiqueta: "FIRMA DEL CONSUMIDOR",
    valor: `Declaración de veracidad aceptada electrónicamente por ${r.consumidor_nombre} el ${formatoFechaHora(r.creado_en)}.`,
  }]);

  // 4
  h.seccion("4. OBSERVACIONES Y ACCIONES ADOPTADAS POR EL PROVEEDOR", r.respuesta ? 110 : 150);
  if (r.respuesta) {
    h.fila([{ etiqueta: "OBSERVACIONES Y ACCIONES ADOPTADAS", valor: r.respuesta }]);
  } else {
    h.page.drawRectangle({ x: M, y: h.y - 56, width: ANCHO, height: 62, borderColor: COLOR.dorado, borderWidth: .6 });
    h.y -= 70;
  }
  h.fila([
    { etiqueta: "FECHA DE COMUNICACIÓN DE LA RESPUESTA", valor: r.fecha_respuesta ? formatoFecha(r.fecha_respuesta) : " " },
    { etiqueta: "FIRMA DEL PROVEEDOR", valor: " " },
  ]);

  // Definiciones y textos legales
  h.y -= 4;
  h.parrafoPequeno(`¹ RECLAMO: ${DEFINICIONES.Reclamo}`);
  h.parrafoPequeno(`² QUEJA: ${DEFINICIONES.Queja}`);
  h.y -= 4;
  TEXTOS_LEGALES.forEach((t) => h.parrafoPequeno(`* ${t}`, f.italica));

  h.pies();
  return doc.save();
}
