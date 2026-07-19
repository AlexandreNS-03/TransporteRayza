import jsPDF from "jspdf";
import QRCode from "qrcode";
import { cargarLogo, ajustarLogo } from "./logo.js";

const ESTADO_LABEL = {
    REGISTRADO: "Registrado", EN_TRANSITO: "En tránsito",
    ENTREGADO: "Entregado", DEVUELTO: "Devuelto"
};

/**
 * Ticket / guía de encomienda (80mm) con los datos del remitente,
 * destinatario y el detalle del paquete enviado.
 */
export async function generarTicketEncomienda(e) {
    const ancho = 80;
    const alto = 210;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [ancho, alto] });
    const m = 6;

    const navy  = [15, 23, 42];
    const azul  = [26, 77, 181];
    const azulBg = [239, 246, 255];
    const gris  = [107, 114, 128];
    const negro = [30, 41, 59];
    const linea = [229, 231, 235];

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
    doc.text("Servicio de Encomiendas", tx, 15, { align: al });
    doc.text("RUC: 20123456789", tx, 19, { align: al });

    y = 31;

    // ── CÓDIGO ──
    doc.setTextColor(...gris);
    doc.setFontSize(7);
    doc.text("GUÍA DE ENCOMIENDA", ancho / 2, y, { align: "center" });
    doc.setTextColor(...negro);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(e.codigoEncomienda, ancho / 2, y + 6, { align: "center" });
    y += 11;

    // Estado + fecha
    doc.setFillColor(...azulBg);
    doc.roundedRect(m, y, ancho - m * 2, 8, 1.5, 1.5, "F");
    doc.setTextColor(...azul);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(`Estado: ${ESTADO_LABEL[e.estado] || e.estado}   ·   ${e.fechaRegistro}`, ancho / 2, y + 5.2, { align: "center" });
    y += 13;

    const bloque = (titulo, filas) => {
        doc.setTextColor(...azul);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.text(titulo, m, y);
        y += 4.5;
        filas.forEach(([label, valor, bold = true]) => {
            doc.setTextColor(...gris);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(6.5);
            doc.text(label, m, y);
            doc.setTextColor(...negro);
            doc.setFont("helvetica", bold ? "bold" : "normal");
            doc.setFontSize(8);
            const lineas = doc.splitTextToSize(String(valor || "—"), ancho - m * 2 - 22);
            doc.text(lineas, ancho - m, y, { align: "right" });
            y += lineas.length > 1 ? lineas.length * 3.6 + 1 : 5;
        });
        y += 2;
    };

    // ── REMITENTE ──
    bloque("REMITENTE (ENVÍA)", [
        ["Nombre", e.remitenteNombre],
        ["Documento", e.remitenteDocumento, false],
        ["Teléfono", e.remitenteTelefono, false],
    ]);
    sep(y); y += 4;

    // ── DESTINATARIO ──
    bloque("DESTINATARIO (RECIBE)", [
        ["Nombre", e.destinatarioNombre],
        ["Documento", e.destinatarioDocumento, false],
        ["Teléfono", e.destinatarioTelefono, false],
        ["Destino", e.sucursalDestinoNombre, false],
    ]);
    sep(y); y += 4;

    // ── DETALLE DEL PAQUETE ──
    doc.setTextColor(...azul);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text("DETALLE DEL ENVÍO", m, y);
    y += 4.5;
    doc.setTextColor(...negro);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    const desc = doc.splitTextToSize(e.descripcion || "—", ancho - m * 2);
    doc.text(desc, m, y);
    y += desc.length * 4 + 2;
    if (e.peso) {
        doc.setTextColor(...gris);
        doc.setFontSize(7.5);
        doc.text(`Peso: ${e.peso} kg`, m, y);
        y += 5;
    }
    if (e.observacion) {
        doc.setTextColor(...gris);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7);
        const obs = doc.splitTextToSize(`Obs: ${e.observacion}`, ancho - m * 2);
        doc.text(obs, m, y);
        y += obs.length * 3.4 + 1;
    }
    y += 2;

    // ── PRECIO ──
    doc.setFillColor(...azul);
    doc.roundedRect(m, y, ancho - m * 2, 10, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("PRECIO DEL ENVÍO", m + 4, y + 6.5);
    doc.setFontSize(12);
    doc.text(`S/ ${Number(e.precio ?? 0).toFixed(2)}`, ancho - m - 4, y + 6.8, { align: "right" });
    y += 16;

    // ── QR ──
    sep(y); y += 4;
    doc.setTextColor(...negro);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text("CÓDIGO DE SEGUIMIENTO", ancho / 2, y, { align: "center" });
    y += 3;
    try {
        const qr = await QRCode.toDataURL(e.codigoEncomienda, {
            width: 180, margin: 1, color: { dark: "#0f172a", light: "#ffffff" }
        });
        const size = 30;
        doc.setDrawColor(...linea);
        doc.roundedRect((ancho - size) / 2 - 2, y - 1, size + 4, size + 4, 2, 2, "S");
        doc.addImage(qr, "PNG", (ancho - size) / 2, y + 1, size, size);
        y += size + 6;
    } catch { y += 6; }

    // ── PIE ──
    doc.setTextColor(...gris);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(6.5);
    doc.text("Conserve esta guía para el retiro de su encomienda.", ancho / 2, y, { align: "center" });
    y += 3.5;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...azul);
    doc.setFontSize(7);
    doc.text("¡Gracias por confiar en Transportes Rayza!", ancho / 2, y, { align: "center" });

    doc.save(`ENCOMIENDA-${e.codigoEncomienda}.pdf`);
}

export default generarTicketEncomienda;
