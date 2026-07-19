import jsPDF from "jspdf";
import QRCode from "qrcode";
import { cargarLogo, ajustarLogo } from "./logo.js";

const DOC_LABEL = { "1": "DNI", "4": "CE", "6": "RUC", "7": "PASAPORTE" };

// Código SUNAT del tipo de comprobante para el QR: 01=factura, 03=boleta, 07=nota de crédito
const COD_SUNAT = { FACTURA: "01", BOLETA: "03", NOTA_CREDITO: "07" };
const RUC_EMPRESA = "20123456789";

/** Cadena del QR según el formato que exige SUNAT. */
export function qrSunat(c) {
    return [
        RUC_EMPRESA,
        COD_SUNAT[c.tipoDeComprobante] || "03",
        c.serie,
        String(c.numero).padStart(8, "0"),
        Number(c.totalIgv || 0).toFixed(2),
        Number(c.total || 0).toFixed(2),
        c.fechaDeEmision || "",
        c.clienteTipoDeDocumento || "0",
        c.clienteNumeroDeDocumento || "",
    ].join("|") + "|";
}

/**
 * Genera el PDF de un comprobante electrónico (boleta / factura)
 * en formato A4 tipo Nubefact.
 */
export async function generarComprobantePDF(c) {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const logo = await cargarLogo();

    const azul  = [26, 77, 181];
    const gris  = [107, 114, 128];
    const negro = [30, 41, 59];
    const ancho = 210;
    const margen = 15;

    const numeroFmt = String(c.numero).padStart(8, "0");
    const titulo = c.tipoDeComprobante === "FACTURA" ? "FACTURA ELECTRÓNICA"
        : c.tipoDeComprobante === "NOTA_CREDITO" ? "NOTA DE CRÉDITO ELECTRÓNICA"
        : "BOLETA DE VENTA ELECTRÓNICA";

    // ── EMPRESA ──
    let empX = margen;
    if (logo) {
        const d = ajustarLogo(logo, 24, 24);
        doc.addImage(logo.dataUrl, "PNG", margen + (24 - d.w) / 2, 12 + (24 - d.h) / 2, d.w, d.h);
        empX = margen + 29;
    }
    doc.setTextColor(...negro);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("TRANSPORTES RAYZA", empX, 20);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...gris);
    doc.text("Transporte Fluvial de Pasajeros y Encomiendas", empX, 26);
    doc.text("Iquitos · Requena — Loreto, Perú", empX, 31);

    // ── RECUADRO RUC / SERIE ──
    doc.setDrawColor(...azul);
    doc.setLineWidth(0.5);
    doc.rect(130, 12, 65, 26);
    doc.setTextColor(...azul);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("RUC: 20123456789", 162.5, 19, { align: "center" });
    doc.setFontSize(9);
    doc.text(titulo, 162.5, 26, { align: "center" });
    doc.setFontSize(11);
    doc.text(`${c.serie}-${numeroFmt}`, 162.5, 33, { align: "center" });

    let y = 48;

    // ── DATOS DEL CLIENTE ──
    doc.setFillColor(241, 245, 249);
    doc.rect(margen, y, ancho - margen * 2, 7, "F");
    doc.setTextColor(...azul);
    doc.setFontSize(9);
    doc.text("DATOS DEL CLIENTE", margen + 2, y + 5);
    y += 12;

    const fila = (label, valor) => {
        doc.setTextColor(...gris);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(label, margen, y);
        doc.setTextColor(...negro);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text(String(valor || "—"), margen + 45, y);
        y += 6;
    };

    fila(`${DOC_LABEL[c.clienteTipoDeDocumento] || "DOC"}:`, c.clienteNumeroDeDocumento);
    fila("Denominación:", c.clienteDenominacion);
    fila("Dirección:", c.clienteDireccion);
    fila("Fecha de emisión:", c.fechaDeEmision);
    fila("Moneda:", "PEN (Soles)");
    if (c.refSerie) {
        fila("Modifica a:", `${c.refSerie}-${String(c.refNumero).padStart(8, "0")} (Anulación de la operación)`);
    }
    y += 4;

    // ── DETALLE ──
    doc.setFillColor(...azul);
    doc.rect(margen, y, ancho - margen * 2, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("CANT.", margen + 3, y + 5.5);
    doc.text("DESCRIPCIÓN", margen + 20, y + 5.5);
    doc.text("P. UNIT", 160, y + 5.5, { align: "right" });
    doc.text("TOTAL", ancho - margen - 3, y + 5.5, { align: "right" });
    y += 13;

    doc.setTextColor(...negro);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("1", margen + 3, y);
    const descLineas = doc.splitTextToSize(c.descripcion || "Servicio de transporte fluvial", 105);
    doc.text(descLineas, margen + 20, y);
    doc.text(`S/ ${Number(c.total).toFixed(2)}`, 160, y, { align: "right" });
    doc.text(`S/ ${Number(c.total).toFixed(2)}`, ancho - margen - 3, y, { align: "right" });
    y += descLineas.length * 5 + 8;

    doc.setDrawColor(229, 231, 235);
    doc.line(margen, y, ancho - margen, y);
    y += 8;

    // ── TOTALES ──
    const totalFila = (label, valor, destacado = false) => {
        doc.setFontSize(destacado ? 11 : 9);
        doc.setFont("helvetica", destacado ? "bold" : "normal");
        doc.setTextColor(...(destacado ? azul : gris));
        doc.text(label, 150, y, { align: "right" });
        doc.setTextColor(...(destacado ? azul : negro));
        doc.text(`S/ ${Number(valor).toFixed(2)}`, ancho - margen, y, { align: "right" });
        y += destacado ? 8 : 6;
    };

    totalFila("Op. Exonerada:", c.totalExonerada);
    totalFila("IGV (Exonerado):", c.totalIgv);
    totalFila("IMPORTE TOTAL:", c.total, true);
    y += 2;

    doc.setTextColor(...gris);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "italic");
    doc.text("Operación exonerada del IGV — Ley N° 27037, Ley de Promoción de la Inversión en la Amazonía",
        ancho - margen, y, { align: "right" });
    y += 10;

    // ── ANULADO ──
    if (c.estado === "ANULADO") {
        doc.setTextColor(185, 28, 28);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("COMPROBANTE ANULADO", ancho / 2, y, { align: "center" });
        y += 6;
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(`Motivo: ${c.motivoAnulacion || "—"}`, ancho / 2, y, { align: "center" });
        y += 10;
    }

    // ── QR SUNAT ──
    try {
        const qrDataUrl = await QRCode.toDataURL(qrSunat(c), { width: 240, margin: 1 });
        const qrSize = 34;
        const qrY = Math.max(y, 235);
        doc.addImage(qrDataUrl, "PNG", margen, qrY, qrSize, qrSize);
        doc.setTextColor(...gris);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text("Representación impresa del", margen + qrSize + 4, qrY + 10);
        doc.text("comprobante electrónico.", margen + qrSize + 4, qrY + 14);
        doc.text(`${c.serie}-${numeroFmt}`, margen + qrSize + 4, qrY + 20);
    } catch (err) {
        console.error("Error generando QR del comprobante:", err);
    }

    // ── PIE ──
    doc.setTextColor(...gris);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "italic");
    doc.text("Representación impresa del comprobante electrónico.", ancho / 2, 280, { align: "center" });
    doc.text("Consulte su documento en www.nubefact.com", ancho / 2, 285, { align: "center" });

    doc.save(`${c.tipoDeComprobante}-${c.serie}-${numeroFmt}.pdf`);
}

export default generarComprobantePDF;
