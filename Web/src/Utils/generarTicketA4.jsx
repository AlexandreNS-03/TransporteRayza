import jsPDF from "jspdf";
import QRCode from "qrcode";
import { cargarLogo, ajustarLogo } from "./logo.js";

const DOC_LABEL = { DNI: "DNI", CE: "CE", PASAPORTE: "PASAPORTE", RUC: "RUC" };

/**
 * Ticket de embarque en formato A4 (para impresora normal, no térmica).
 * Mismo contenido que el ticket 80mm pero con layout de página completa.
 */
export async function generarTicketA4(venta) {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const navy  = [15, 23, 42];
    const azul  = [26, 77, 181];
    const azulBg = [239, 246, 255];
    const ambar  = [161, 98, 7];
    const ambarBg = [254, 249, 195];
    const gris  = [107, 114, 128];
    const negro = [30, 41, 59];
    const linea = [229, 231, 235];

    const W = 210, M = 18;
    let y = 0;

    // ── CABECERA ──
    const logo = await cargarLogo();
    doc.setFillColor(...navy);
    doc.rect(0, 0, W, 32, "F");
    doc.setFillColor(...azul);
    doc.rect(0, 32, W, 2, "F");

    let tX = M;
    if (logo) {
        const d = ajustarLogo(logo, 22, 22);
        doc.addImage(logo.dataUrl, "PNG", M + (22 - d.w) / 2, 5 + (22 - d.h) / 2, d.w, d.h);
        tX = M + 27;
    }

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("TRANSPORTES RAYZA", tX, 15);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text("Transporte Fluvial de Pasajeros  ·  RUC: 20123456789", tX, 22);
    doc.text("Sucursales Iquitos · Requena — Región Loreto, Perú", tX, 27);

    // recuadro tipo/número
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.4);
    doc.roundedRect(W - M - 62, 7, 62, 20, 2, 2, "S");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("TICKET DE EMBARQUE", W - M - 31, 14, { align: "center" });
    doc.setFontSize(13);
    doc.text(`${venta.serieComprobante}-${venta.numeroComprobante}`, W - M - 31, 22, { align: "center" });

    y = 46;

    // ── RUTA (boarding pass) ──
    doc.setFillColor(...azulBg);
    doc.roundedRect(M, y, W - M * 2, 30, 3, 3, "F");
    doc.setTextColor(...gris);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("ORIGEN", M + 8, y + 9);
    doc.text("DESTINO", W - M - 8, y + 9, { align: "right" });
    doc.setTextColor(...negro);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text((venta.paradaOrigen || "—").toUpperCase(), M + 8, y + 20);
    doc.text((venta.paradaDestino || "—").toUpperCase(), W - M - 8, y + 20, { align: "right" });
    doc.setTextColor(...azul);
    doc.setFontSize(16);
    doc.text(">>", W / 2, y + 19, { align: "center" });
    doc.setTextColor(...gris);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const salida = venta.fechaSalida
        ? `Salida: ${venta.fechaSalida}  a las  ${(venta.horaSalida || "").slice(0, 5)} h`
        : `Viaje: ${venta.viajeCodigo || "—"}`;
    doc.text(salida, W / 2, y + 26, { align: "center" });
    y += 40;

    // ── ASIENTO + CATEGORÍA ──
    const cw = (W - M * 2 - 6) / 2;
    doc.setFillColor(...navy);
    doc.roundedRect(M, y, cw, 26, 3, 3, "F");
    doc.setTextColor(148, 163, 184);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("ASIENTO", M + cw / 2, y + 8, { align: "center" });
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.text(`${venta.asientoNumero ?? "—"}`, M + cw / 2, y + 20, { align: "center" });

    const esVip = venta.asientoTipo === "VIP";
    doc.setFillColor(...(esVip ? ambarBg : azulBg));
    doc.roundedRect(M + cw + 6, y, cw, 26, 3, 3, "F");
    doc.setTextColor(...(esVip ? ambar : azul));
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("CATEGORÍA", M + cw + 6 + cw / 2, y + 8, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(esVip ? "VIP" : "NORMAL", M + cw + 6 + cw / 2, y + 18, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...gris);
    doc.text(venta.viajeCodigo || "", M + cw + 6 + cw / 2, y + 23, { align: "center" });
    y += 36;

    // ── DATOS EN DOS COLUMNAS ──
    const seccion = (titulo, x) => {
        doc.setTextColor(...azul);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text(titulo, x, y);
    };
    const fila = (label, valor, x, yy, ancho) => {
        doc.setTextColor(...gris);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(label, x, yy);
        doc.setTextColor(...negro);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        const lineas = doc.splitTextToSize(String(valor || "—"), ancho);
        doc.text(lineas, x, yy + 5);
        return lineas.length * 5 + 4;
    };

    const colW = (W - M * 2 - 10) / 2;
    seccion("PASAJERO", M);
    seccion("COMPROBANTE / VENTA", M + colW + 10);
    y += 7;

    let yIzq = y, yDer = y;
    yIzq += fila("Nombre", venta.pasajeroNombre, M, yIzq, colW);
    yIzq += fila("Documento", `${DOC_LABEL[venta.tipoDocumento] || ""} ${venta.pasajeroDocumento || ""}`.trim(), M, yIzq, colW);
    yIzq += fila("Edad / Sexo", venta.edad ? `${venta.edad} años · ${venta.sexo || "—"}` : (venta.sexo || "—"), M, yIzq, colW);
    yIzq += fila("Procedencia", venta.procedencia, M, yIzq, colW);
    if (venta.pasajeroTelefono) yIzq += fila("Teléfono", venta.pasajeroTelefono, M, yIzq, colW);

    const xDer = M + colW + 10;
    yDer += fila("Cliente", venta.clienteNombre, xDer, yDer, colW);
    yDer += fila("Documento", `${venta.clienteTipoDoc || ""} ${venta.clienteDocumento || ""}`.trim(), xDer, yDer, colW);
    yDer += fila("Fecha de venta", venta.fechaVenta, xDer, yDer, colW);
    yDer += fila("Vendido por", venta.usuarioNombre, xDer, yDer, colW);
    if (venta.detalleComprobante) yDer += fila("Detalle", venta.detalleComprobante, xDer, yDer, colW);

    y = Math.max(yIzq, yDer) + 6;

    // ── TOTAL ──
    doc.setFillColor(...azul);
    doc.roundedRect(M, y, W - M * 2, 14, 3, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("TOTAL PAGADO", M + 6, y + 9);
    doc.setFontSize(15);
    doc.text(`S/ ${Number(venta.precio ?? 0).toFixed(2)}`, W - M - 6, y + 9.5, { align: "right" });
    y += 22;

    // ── QR ──
    doc.setDrawColor(...linea);
    doc.setLineWidth(0.4);
    doc.line(M, y, W - M, y);
    y += 8;
    doc.setTextColor(...negro);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("PRESENTA ESTE CÓDIGO QR AL EMBARCAR", W / 2, y, { align: "center" });
    y += 4;

    try {
        const qr = await QRCode.toDataURL(venta.codigoQr || venta.id, {
            width: 300, margin: 1, color: { dark: "#0f172a", light: "#ffffff" }
        });
        const size = 45;
        doc.setDrawColor(...linea);
        doc.roundedRect((W - size) / 2 - 3, y, size + 6, size + 6, 2, 2, "S");
        doc.addImage(qr, "PNG", (W - size) / 2, y + 3, size, size);
        y += size + 10;
    } catch (err) {
        console.error("QR:", err);
        y += 10;
    }

    doc.setTextColor(...gris);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(venta.codigoQr || "—", W / 2, y, { align: "center" });
    y += 8;

    // ── PIE ──
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.text("El embarque abre 2 horas antes de la salida y cierra 20 minutos después de la hora programada.", W / 2, y, { align: "center" });
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...azul);
    doc.setFontSize(10);
    doc.text("¡Gracias por viajar con Transportes Rayza!", W / 2, y, { align: "center" });

    doc.save(`TICKET-A4-${venta.serieComprobante}-${venta.numeroComprobante}.pdf`);
}

export default generarTicketA4;
