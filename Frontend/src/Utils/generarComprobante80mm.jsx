import jsPDF from "jspdf";
import QRCode from "qrcode";
import { cargarLogo, ajustarLogo } from "./logo.js";
import { qrSunat } from "./generarComprobantePDF.jsx";

const DOC_LABEL = { "1": "DNI", "4": "CE", "6": "RUC", "7": "PASAPORTE" };

/**
 * Comprobante electrónico (boleta / factura / nota de crédito) en formato
 * 80mm para impresora térmica. Mismo contenido que la versión A4.
 */
export async function generarComprobante80mm(c) {
    const ancho = 80;
    const alto = 230;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [ancho, alto] });
    const m = 6;

    const navy  = [15, 23, 42];
    const azul  = [26, 77, 181];
    const azulBg = [239, 246, 255];
    const gris  = [107, 114, 128];
    const negro = [30, 41, 59];
    const linea = [229, 231, 235];

    const numeroFmt = String(c.numero).padStart(8, "0");
    const titulo = c.tipoDeComprobante === "FACTURA" ? "FACTURA ELECTRÓNICA"
        : c.tipoDeComprobante === "NOTA_CREDITO" ? "NOTA DE CRÉDITO ELECTRÓNICA"
        : "BOLETA DE VENTA ELECTRÓNICA";

    const logo = await cargarLogo();
    let y = 0;

    const sep = (yy) => {
        doc.setDrawColor(...linea);
        doc.setLineDashPattern([1.2, 1.2], 0);
        doc.line(m, yy, ancho - m, yy);
        doc.setLineDashPattern([], 0);
    };

    // ── CABECERA ──
    doc.setFillColor(...navy);
    doc.rect(0, 0, ancho, 24, "F");
    doc.setFillColor(...azul);
    doc.rect(0, 24, ancho, 1.4, "F");
    if (logo) {
        const d = ajustarLogo(logo, 18, 18);
        doc.addImage(logo.dataUrl, "PNG", m - 1 + (18 - d.w) / 2, 3 + (18 - d.h) / 2, d.w, d.h);
    }
    const tx = logo ? m + 20 : ancho / 2;
    const al = logo ? "left" : "center";
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("TRANSPORTES RAYZA", tx, 10, { align: al });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text("Transporte Fluvial de Pasajeros y Encomiendas", tx, 15, { align: al });
    doc.text("RUC: 20123456789", tx, 19, { align: al });

    y = 31;

    // ── TIPO + SERIE ──
    doc.setFillColor(...azulBg);
    doc.roundedRect(m, y, ancho - m * 2, 12, 1.5, 1.5, "F");
    doc.setTextColor(...azul);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(titulo, ancho / 2, y + 5, { align: "center" });
    doc.setFontSize(11);
    doc.text(`${c.serie}-${numeroFmt}`, ancho / 2, y + 10, { align: "center" });
    y += 18;

    // ── CLIENTE ──
    const fila = (label, valor, bold = true) => {
        doc.setTextColor(...gris);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.text(label, m, y);
        doc.setTextColor(...negro);
        doc.setFont("helvetica", bold ? "bold" : "normal");
        doc.setFontSize(8);
        const lineas = doc.splitTextToSize(String(valor || "—"), ancho - m * 2 - 24);
        doc.text(lineas, ancho - m, y, { align: "right" });
        y += lineas.length > 1 ? lineas.length * 3.6 + 1.5 : 5;
    };

    doc.setTextColor(...azul);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text("DATOS DEL CLIENTE", m, y);
    y += 4.5;
    fila(`${DOC_LABEL[c.clienteTipoDeDocumento] || "Doc"}`, c.clienteNumeroDeDocumento);
    fila("Cliente", c.clienteDenominacion);
    if (c.clienteDireccion) fila("Dirección", c.clienteDireccion, false);
    fila("Emisión", c.fechaDeEmision, false);
    fila("Moneda", "PEN (Soles)", false);
    if (c.refSerie) fila("Modifica a", `${c.refSerie}-${String(c.refNumero).padStart(8, "0")}`, false);
    y += 2;

    // ── DETALLE ──
    sep(y); y += 4;
    doc.setTextColor(...azul);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text("DESCRIPCIÓN", m, y);
    y += 4.5;
    doc.setTextColor(...negro);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const desc = doc.splitTextToSize(`1 x ${c.descripcion || "Servicio"}`, ancho - m * 2);
    doc.text(desc, m, y);
    y += desc.length * 3.8 + 3;

    // ── TOTALES ──
    sep(y); y += 5;
    const totalFila = (label, valor, destacado = false) => {
        doc.setFont("helvetica", destacado ? "bold" : "normal");
        doc.setFontSize(destacado ? 10 : 8);
        doc.setTextColor(...(destacado ? azul : gris));
        doc.text(label, m, y);
        doc.setTextColor(...(destacado ? azul : negro));
        doc.text(`S/ ${Number(valor).toFixed(2)}`, ancho - m, y, { align: "right" });
        y += destacado ? 7 : 5;
    };
    totalFila("Op. Exonerada", c.totalExonerada);
    totalFila("IGV (Exonerado)", c.totalIgv);
    totalFila("IMPORTE TOTAL", c.total, true);
    y += 1;

    doc.setTextColor(...gris);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(6);
    const nota = doc.splitTextToSize("Operación exonerada del IGV — Ley N° 27037 (Amazonía)", ancho - m * 2);
    doc.text(nota, ancho / 2, y, { align: "center" });
    y += nota.length * 3 + 3;

    // ── ESTADO ANULADO ──
    if (c.estado === "ANULADO") {
        doc.setTextColor(185, 28, 28);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("ANULADO", ancho / 2, y, { align: "center" });
        y += 6;
    }

    // ── QR SUNAT ──
    sep(y); y += 4;
    try {
        const qrDataUrl = await QRCode.toDataURL(qrSunat(c), { width: 200, margin: 1 });
        const qrSize = 28;
        doc.addImage(qrDataUrl, "PNG", (ancho - qrSize) / 2, y, qrSize, qrSize);
        y += qrSize + 4;
    } catch (err) {
        console.error("Error generando QR del comprobante:", err);
    }

    // ── PIE ──
    doc.setTextColor(...gris);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.text("Representación impresa del comprobante electrónico.", ancho / 2, y, { align: "center" });
    y += 3;
    doc.text("Consúltelo en www.nubefact.com", ancho / 2, y, { align: "center" });

    doc.save(`${c.tipoDeComprobante}-${c.serie}-${numeroFmt}-80mm.pdf`);
}

export default generarComprobante80mm;
