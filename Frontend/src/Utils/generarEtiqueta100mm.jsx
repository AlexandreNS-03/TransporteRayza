import jsPDF from "jspdf";
import QRCode from "qrcode";
import { cargarLogo, ajustarLogo } from "./logo.js";
import { guardarPdf, CARPETAS } from "./descargas.js";

/**
 * Etiqueta de 100 mm para pegar en el bulto.
 *
 * Reemplaza a la etiqueta antigua: se quita el código de barras y en su lugar
 * va el QR con el código de la encomienda, que es el mismo que el cliente usa
 * para rastrear y el que se escanea en la agencia.
 *
 * Pensada para impresora de etiquetas de 100x100 mm (o A4 recortado).
 */
export async function generarEtiqueta100mm(e) {
    const L = 100;                       // etiqueta cuadrada de 100 mm
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [L, L] });

    const negro = [17, 24, 39];
    const gris  = [107, 114, 128];
    const linea = [203, 213, 225];

    let y = 6;

    // ── Encabezado: logo + empresa ──
    const logo = await cargarLogo();
    if (logo) {
        const d = ajustarLogo(logo, 13, 13);
        doc.addImage(logo.dataUrl, "PNG", 6, y - 1, d.w, d.h);
    }
    doc.setTextColor(...negro);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("TRANSPORTES RAYZA", logo ? 22 : 6, y + 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...gris);
    doc.text("Transporte fluvial de carga · Loreto, Perú", logo ? 22 : 6, y + 8);

    y += 13;
    doc.setDrawColor(...linea);
    doc.setLineWidth(0.4);
    doc.line(6, y, L - 6, y);
    y += 5;

    // ── Datos del envío (izquierda) ──
    const dato = (etiqueta, valor, yy, tam = 9) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(...gris);
        doc.text(etiqueta.toUpperCase(), 6, yy);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(tam);
        doc.setTextColor(...negro);
        doc.text(doc.splitTextToSize(String(valor || "—"), 56), 6, yy + 4.2);
    };

    dato("Cliente", e.remitenteNombre, y);
    dato("Desde", e.paradaOrigen || e.sucursalOrigenNombre, y + 11);
    dato("Destino", e.paradaDestino || e.sucursalDestinoNombre, y + 22, 11);
    dato("Destinatario", e.destinatarioNombre, y + 34);

    // ── QR (derecha) — reemplaza al código de barras ──
    try {
        const qr = await QRCode.toDataURL(e.codigoEncomienda || "", {
            errorCorrectionLevel: "M", margin: 1, width: 400,
        });
        doc.addImage(qr, "PNG", L - 34, y - 1, 28, 28);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(...negro);
        doc.text(e.codigoEncomienda || "—", L - 20, y + 31, { align: "center" });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(5.5);
        doc.setTextColor(...gris);
        doc.text("Escanea para rastrear", L - 20, y + 34.5, { align: "center" });
    } catch { /* sin QR la etiqueta sigue siendo válida */ }

    // ── Pie: contenido, peso, fecha y firma ──
    let yPie = L - 30;
    doc.setDrawColor(...linea);
    doc.line(6, yPie, L - 6, yPie);
    yPie += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...gris);
    doc.text("CONTENIDO", 6, yPie);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...negro);
    doc.text(doc.splitTextToSize(String(e.descripcion || "—"), 58), 6, yPie + 4);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...gris);
    doc.text("PESO", L - 34, yPie);
    doc.text("BULTOS", L - 18, yPie);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...negro);
    doc.text(e.peso ? `${e.peso} kg` : "—", L - 34, yPie + 4.5);
    doc.text("1", L - 18, yPie + 4.5);

    yPie += 13;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...gris);
    doc.text(`Registro: ${e.fechaRegistro || "—"}`, 6, yPie);
    if (e.viajeDescripcion) {
        doc.text(doc.splitTextToSize(String(e.viajeDescripcion), 55), 6, yPie + 3.5);
    }

    // Línea de firma de conformidad (se firma al entregar)
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.3);
    doc.line(L - 40, yPie + 5, L - 6, yPie + 5);
    doc.setFontSize(5.5);
    doc.setTextColor(...gris);
    doc.text("Firma de conformidad", L - 23, yPie + 8, { align: "center" });

    return guardarPdf(doc, `ETIQUETA-${e.codigoEncomienda || "encomienda"}.pdf`, CARPETAS.ENCOMIENDAS);
}

export default generarEtiqueta100mm;
