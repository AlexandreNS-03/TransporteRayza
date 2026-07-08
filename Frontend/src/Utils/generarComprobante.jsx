import jsPDF from "jspdf";
import QRCode from "qrcode";

export async function generarComprobante(venta) {

    const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [80, 300] // formato ticket/boleta
    });

    const margen = 6;
    const ancho  = 80;
    let y        = 8;

    // ── COLORES ──
    const azul   = [26, 77, 181];
    const gris   = [107, 114, 128];
    const negro  = [30, 41, 59];
    const linea  = [229, 231, 235];

    // ── ENCABEZADO ──
    doc.setFillColor(...azul);
    doc.rect(0, 0, ancho, 28, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("TRANSPORTES RAYZA", ancho / 2, y + 4, { align: "center" });

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Sistema Administrativo Fluvial", ancho / 2, y + 9, { align: "center" });
    doc.text("RUC: 20123456789", ancho / 2, y + 14, { align: "center" });

    y += 20;

    // ── TIPO COMPROBANTE ──
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(venta.tipoComprobante || "TICKET", ancho / 2, y + 4, { align: "center" });

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`${venta.serieComprobante}-${venta.numeroComprobante}`, ancho / 2, y + 9, { align: "center" });

    y += 16;

    // ── FUNCIÓN HELPERS ──
    const lineDivider = () => {
        doc.setDrawColor(...linea);
        doc.line(margen, y, ancho - margen, y);
        y += 4;
    };

    const addFila = (label, valor, bold = false) => {
        doc.setTextColor(...gris);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text(label, margen, y);

        doc.setTextColor(...negro);
        doc.setFontSize(8);
        doc.setFont("helvetica", bold ? "bold" : "normal");
        // Si el valor es muy largo, lo parte
        const lines = doc.splitTextToSize(String(valor || "—"), ancho - margen * 2 - 25);
        doc.text(lines, ancho - margen, y, { align: "right" });
        y += lines.length > 1 ? lines.length * 4 + 1 : 5;
    };

    const addSeccion = (titulo) => {
        doc.setFillColor(241, 245, 249);
        doc.rect(margen, y - 1, ancho - margen * 2, 6, "F");
        doc.setTextColor(...azul);
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.text(titulo.toUpperCase(), margen + 2, y + 3);
        y += 7;
    };

    // ── DATOS PASAJERO ──
    lineDivider();
    addSeccion("Datos del Pasajero");
    addFila("Nombre",     venta.pasajeroNombre, true);
    addFila("Documento",  `${venta.tipoDocumento}: ${venta.pasajeroDocumento}`);
    addFila("Edad",       venta.edad ? `${venta.edad} años` : "—");
    addFila("Sexo",       venta.sexo);
    addFila("Procedencia", venta.procedencia);
    if (venta.pasajeroTelefono) addFila("Teléfono", venta.pasajeroTelefono);

    // ── DATOS VIAJE ──
    lineDivider();
    addSeccion("Datos del Viaje");
    addFila("Código",       venta.viajeCodigo, true);
    addFila("Descripción",  venta.viajeDescripcion);
    addFila("Origen",       venta.paradaOrigen);
    addFila("Destino",      venta.paradaDestino);

    // ── ASIENTO ──
    lineDivider();
    addSeccion("Asiento");
    addFila("Número",  `#${venta.asientoNumero}`, true);
    addFila("Tipo",    venta.asientoTipo);

    // ── COMPROBANTE ──
    lineDivider();
    addSeccion("Comprobante");
    addFila("Tipo",     venta.tipoComprobante);
    addFila("Serie",    venta.serieComprobante);
    addFila("Número",   venta.numeroComprobante);
    addFila("Cliente",  venta.clienteNombre, true);
    addFila("Doc.",     `${venta.clienteTipoDoc}: ${venta.clienteDocumento}`);
    if (venta.detalleComprobante) addFila("Detalle", venta.detalleComprobante);
    addFila("Fecha",    venta.fechaVenta);

    const fechaHoraCompra = venta.createdAt
        ? new Date(venta.createdAt).toLocaleString("es-PE", {
            year: "numeric", month: "2-digit", day: "2-digit",
            hour: "2-digit", minute: "2-digit", second: "2-digit"
        })
        : "—";
    addFila("Fecha de compra", fechaHoraCompra);

    // ── PRECIO ──
    lineDivider();
    doc.setFillColor(...azul);
    doc.rect(margen, y, ancho - margen * 2, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL", margen + 4, y + 6.5);
    doc.setFontSize(11);
    doc.text(`S/ ${venta.precio}`, ancho - margen - 2, y + 6.5, { align: "right" });
    y += 14;

    // ── QR ──
    lineDivider();
    doc.setTextColor(...gris);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("Código QR para embarque:", ancho / 2, y, { align: "center" });
    y += 4;

    try {
        const qrDataUrl = await QRCode.toDataURL(venta.codigoQr || venta.id, {
            width: 120,
            margin: 1,
            color: { dark: "#1a4db5", light: "#ffffff" }
        });

        const qrSize = 35;
        const qrX    = (ancho - qrSize) / 2;
        doc.addImage(qrDataUrl, "PNG", qrX, y, qrSize, qrSize);
        y += qrSize + 3;
    } catch (err) {
        console.error("Error generando QR:", err);
    }

    doc.setTextColor(...gris);
    doc.setFontSize(6.5);
    doc.text(venta.codigoQr || "—", ancho / 2, y, { align: "center" });
    y += 6;

    // ── PIE ──
    lineDivider();
    doc.setTextColor(...gris);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "italic");
    doc.text("Gracias por viajar con Transportes Rayza", ancho / 2, y, { align: "center" });
    y += 4;
    doc.text("Conserve este comprobante para su embarque", ancho / 2, y, { align: "center" });

    // ── DESCARGAR ──
    const nombreArchivo = `${venta.tipoComprobante || "TICKET"}-${venta.serieComprobante}-${venta.numeroComprobante}.pdf`;
    doc.save(nombreArchivo);
}

export default generarComprobante;