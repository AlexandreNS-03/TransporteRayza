import jsPDF from "jspdf";
import QRCode from "qrcode";
import { cargarLogo, ajustarLogo } from "./logo.js";

/**
 * Ticket de embarque (80mm) con estilo "boarding pass":
 * ruta destacada, asiento en grande, QR de embarque y datos del pasajero.
 */
export async function generarComprobante(venta) {

    const ancho = 80;
    const alto  = 235;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [ancho, alto] });

    const m = 6; // margen

    // ── Paleta ──
    const navy   = [15, 23, 42];
    const azul   = [26, 77, 181];
    const azulBg = [239, 246, 255];
    const gris   = [107, 114, 128];
    const negro  = [30, 41, 59];
    const linea  = [229, 231, 235];
    const ambar  = [161, 98, 7];
    const ambarBg= [254, 249, 195];

    let y = 0;

    const separador = (yy) => {
        doc.setDrawColor(...linea);
        doc.setLineDashPattern([1.2, 1.2], 0);
        doc.line(m, yy, ancho - m, yy);
        doc.setLineDashPattern([], 0);
    };

    // ══ CABECERA ══
    const logo = await cargarLogo();
    doc.setFillColor(...navy);
    doc.rect(0, 0, ancho, 24, "F");
    doc.setFillColor(...azul);
    doc.rect(0, 24, ancho, 1.6, "F");

    if (logo) {
        const d = ajustarLogo(logo, 18, 18);
        doc.addImage(logo.dataUrl, "PNG", m - 1 + (18 - d.w) / 2, 3 + (18 - d.h) / 2, d.w, d.h);
    }
    const tx = logo ? m + 20 : ancho / 2;
    const alinear = logo ? "left" : "center";

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("TRANSPORTES RAYZA", tx, 10, { align: alinear });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text("Transporte Fluvial de Pasajeros", tx, 15, { align: alinear });
    doc.text("RUC: 20123456789", tx, 19, { align: alinear });

    y = 30;

    // ══ TIPO + NÚMERO DE TICKET ══
    doc.setTextColor(...gris);
    doc.setFontSize(7);
    doc.text("TICKET DE EMBARQUE", ancho / 2, y, { align: "center" });
    doc.setTextColor(...negro);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`${venta.serieComprobante}-${venta.numeroComprobante}`, ancho / 2, y + 5.5, { align: "center" });
    y += 10;

    // ══ RUTA (estilo boarding pass) ══
    separador(y);
    y += 6;

    const origen  = (venta.paradaOrigen || "—").toUpperCase();
    const destino = (venta.paradaDestino || "—").toUpperCase();
    doc.setTextColor(...gris);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.text("ORIGEN", m, y);
    doc.text("DESTINO", ancho - m, y, { align: "right" });

    doc.setTextColor(...negro);
    doc.setFont("helvetica", "bold");
    const tam = Math.max(9, 14 - Math.max(origen.length, destino.length) * 0.35);
    doc.setFontSize(tam);
    doc.text(origen, m, y + 6);
    doc.text(destino, ancho - m, y + 6, { align: "right" });

    // flecha central
    doc.setTextColor(...azul);
    doc.setFontSize(11);
    doc.text(">>", ancho / 2, y + 6, { align: "center" });
    y += 11;

    // fecha y hora de salida
    doc.setFillColor(...azulBg);
    doc.roundedRect(m, y, ancho - m * 2, 8, 1.5, 1.5, "F");
    doc.setTextColor(...azul);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    const salida = venta.fechaSalida
        ? `Salida: ${venta.fechaSalida}  ·  ${(venta.horaSalida || "").slice(0, 5)} h`
        : `Viaje: ${venta.viajeCodigo || "—"}`;
    doc.text(salida, ancho / 2, y + 5.2, { align: "center" });
    y += 13;

    // ══ ASIENTO ══
    const cajaW = (ancho - m * 2 - 3) / 2;
    // caja asiento
    doc.setFillColor(...navy);
    doc.roundedRect(m, y, cajaW, 17, 2, 2, "F");
    doc.setTextColor(148, 163, 184);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.text("ASIENTO", m + cajaW / 2, y + 4.5, { align: "center" });
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.text(`${venta.asientoNumero ?? "—"}`, m + cajaW / 2, y + 12.5, { align: "center" });

    // caja tipo + embarcación
    const esVip = venta.asientoTipo === "VIP";
    doc.setFillColor(...(esVip ? ambarBg : azulBg));
    doc.roundedRect(m + cajaW + 3, y, cajaW, 17, 2, 2, "F");
    doc.setTextColor(...(esVip ? ambar : azul));
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.text("CATEGORÍA", m + cajaW + 3 + cajaW / 2, y + 4.5, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(esVip ? "VIP" : "NORMAL", m + cajaW + 3 + cajaW / 2, y + 11, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(...gris);
    doc.text(venta.viajeCodigo || "", m + cajaW + 3 + cajaW / 2, y + 15, { align: "center" });
    y += 22;

    // ══ PASAJERO ══
    separador(y);
    y += 5;

    const fila = (label, valor, bold = true) => {
        doc.setTextColor(...gris);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.text(label, m, y);
        doc.setTextColor(...negro);
        doc.setFont("helvetica", bold ? "bold" : "normal");
        doc.setFontSize(8.5);
        const lineas = doc.splitTextToSize(String(valor || "—"), ancho - m * 2 - 24);
        doc.text(lineas, ancho - m, y, { align: "right" });
        y += lineas.length > 1 ? lineas.length * 4 + 1.5 : 5;
    };

    doc.setTextColor(...azul);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text("PASAJERO", m, y);
    y += 4.5;

    fila("Nombre", venta.pasajeroNombre);
    fila("Documento", `${venta.tipoDocumento || ""} ${venta.pasajeroDocumento || ""}`.trim());
    if (venta.edad)             fila("Edad / Sexo", `${venta.edad} años · ${venta.sexo || "—"}`, false);
    if (venta.procedencia)      fila("Procedencia", venta.procedencia, false);
    if (venta.pasajeroTelefono) fila("Teléfono", venta.pasajeroTelefono, false);
    y += 1;

    // ══ VENTA ══
    separador(y);
    y += 5;
    doc.setTextColor(...azul);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text("DATOS DE LA VENTA", m, y);
    y += 4.5;

    const fechaCompra = venta.createdAt
        ? new Date(venta.createdAt).toLocaleString("es-PE", {
            day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
        })
        : venta.fechaVenta;
    fila("Fecha de compra", fechaCompra, false);
    fila("Vendido por", venta.usuarioNombre, false);
    y += 1;

    // ══ TOTAL ══
    doc.setFillColor(...azul);
    doc.roundedRect(m, y, ancho - m * 2, 10, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("TOTAL PAGADO", m + 4, y + 6.5);
    doc.setFontSize(12);
    doc.text(`S/ ${Number(venta.precio ?? 0).toFixed(2)}`, ancho - m - 4, y + 6.8, { align: "right" });
    y += 16;

    // ══ QR DE EMBARQUE ══
    separador(y);
    y += 5;
    doc.setTextColor(...negro);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text("PRESENTA ESTE CÓDIGO AL EMBARCAR", ancho / 2, y, { align: "center" });
    y += 3;

    try {
        const qrDataUrl = await QRCode.toDataURL(venta.codigoQr || venta.id, {
            width: 200,
            margin: 1,
            color: { dark: "#0f172a", light: "#ffffff" }
        });
        const qrSize = 32;
        const qrX = (ancho - qrSize) / 2;
        // marco del QR
        doc.setDrawColor(...linea);
        doc.roundedRect(qrX - 2, y - 1, qrSize + 4, qrSize + 4, 2, 2, "S");
        doc.addImage(qrDataUrl, "PNG", qrX, y + 1, qrSize, qrSize);
        y += qrSize + 6;
    } catch (err) {
        console.error("Error generando QR:", err);
        y += 6;
    }

    doc.setTextColor(...gris);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.text(venta.codigoQr || "—", ancho / 2, y, { align: "center" });
    y += 5;

    // ══ PIE ══
    separador(y);
    y += 4;
    doc.setTextColor(...gris);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "italic");
    doc.text("El embarque abre 2 horas antes de la salida", ancho / 2, y, { align: "center" });
    doc.text("y cierra 20 minutos después de la hora programada.", ancho / 2, y + 3.5, { align: "center" });
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...azul);
    doc.setFontSize(7);
    doc.text("¡Gracias por viajar con Transportes Rayza!", ancho / 2, y, { align: "center" });

    // ── DESCARGAR ──
    doc.save(`TICKET-${venta.serieComprobante}-${venta.numeroComprobante}.pdf`);
}

export default generarComprobante;
