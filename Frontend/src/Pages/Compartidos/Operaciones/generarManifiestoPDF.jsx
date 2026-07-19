import jsPDF from "jspdf";
import { cargarLogo, ajustarLogo } from "../../../Utils/logo.js";

// ── Columnas de la tabla (ancho en mm, deben sumar el ancho de contenido) ──
const COLUMNAS = [
    { titulo: "#",               ancho: 8,  align: "left" },
    { titulo: "Nombre Completo", ancho: 52, align: "left" },
    { titulo: "Documento",       ancho: 36, align: "left" },
    { titulo: "Edad",            ancho: 13, align: "center" },
    { titulo: "Sexo",            ancho: 18, align: "left" },
    { titulo: "Procedencia",     ancho: 30, align: "left" },
    { titulo: "Tramo",           ancho: 46, align: "left" },
    { titulo: "Asiento",         ancho: 26, align: "left" },
    { titulo: "Estado",          ancho: 24, align: "left" },
];

export async function generarManifiestoPDF(viaje, pasajeros, capacidadTotal) {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const ancho = doc.internal.pageSize.getWidth();
    const alto  = doc.internal.pageSize.getHeight();
    const margen = 12;
    const anchoContenido = ancho - margen * 2;

    const navy  = [15, 23, 42];
    const azul   = [26, 77, 181];
    const azulBg = [239, 246, 255];
    const gris   = [107, 114, 128];
    const negro  = [30, 41, 59];
    const verde  = [21, 128, 61];
    const verdeBg = [240, 253, 244];
    const ambar  = [161, 98, 7];
    const ambarBg = [254, 249, 195];
    const lineaColor = [225, 229, 235];
    const filaAlterna = [248, 250, 252];

    const logo = await cargarLogo();
    let y = 15;

    const tramo = (o, d) => `${o || "—"}  a  ${d || "—"}`; // sin flecha (jsPDF no tiene el glifo →)

    // ── ENCABEZADO DE PORTADA (solo primera página) ──
    const dibujarEncabezadoPortada = () => {
        doc.setFillColor(...navy);
        doc.rect(0, 0, ancho, 26, "F");
        doc.setFillColor(...azul);
        doc.rect(0, 26, ancho, 1.5, "F");

        // Logo circular a la izquierda
        let textoX = margen;
        if (logo) {
            const d = ajustarLogo(logo, 19, 19);
            doc.addImage(logo.dataUrl, "PNG", margen + (19 - d.w) / 2, 4 + (19 - d.h) / 2, d.w, d.h);
            textoX = margen + 24;
        }

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(15);
        doc.setFont("helvetica", "bold");
        doc.text("TRANSPORTES RAYZA", textoX, 12);
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(190, 200, 215);
        doc.text("Transporte Fluvial de Pasajeros  ·  RUC: 20123456789", textoX, 18);
        doc.text("Sucursales Iquitos · Requena — Loreto, Perú", textoX, 22.5);

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("MANIFIESTO DE PASAJEROS", ancho - margen, 14, { align: "right" });
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(190, 200, 215);
        doc.text(`Emitido: ${new Date().toLocaleString("es-PE")}`, ancho - margen, 20, { align: "right" });

        y = 34;

        // Recuadro de datos del viaje
        const cajaAlto = 24;
        doc.setFillColor(...azulBg);
        doc.roundedRect(margen, y, anchoContenido, cajaAlto, 2, 2, "F");

        doc.setFontSize(9);
        const colW = anchoContenido / 4;
        const dato = (etiqueta, valor, col, fila) => {
            const x = margen + 5 + col * colW;
            const yy = y + 8 + fila * 8;
            doc.setTextColor(...gris);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);
            doc.text(etiqueta.toUpperCase(), x, yy);
            doc.setTextColor(...negro);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9.5);
            doc.text(doc.splitTextToSize(String(valor || "—"), colW - 6), x, yy + 5);
        };
        dato("Código de viaje", viaje.codigoViaje, 0, 0);
        dato("Ruta", viaje.rutaNombre, 1, 0);
        dato("Fecha de salida", viaje.fechaSalida, 2, 0);
        dato("Hora de salida", viaje.horaSalida, 3, 0);
        dato("Origen", viaje.origen, 0, 1);
        dato("Destino", viaje.destino, 1, 1);
        dato("Embarcación", viaje.embarcacionNombre, 2, 1);
        dato("Capacidad", capacidadTotal ? `${capacidadTotal} pasajeros` : "—", 3, 1);

        y += cajaAlto + 6;

        // Chips de resumen
        const totalPasajeros  = pasajeros.length;
        const totalEmbarcados = pasajeros.filter(p => p.embarqueEstado === "EMBARCADO").length;
        const chip = (texto, bg, color, x) => {
            const w = doc.getTextWidth(texto) + 10;
            doc.setFillColor(...bg);
            doc.roundedRect(x, y - 4, w, 7, 3.5, 3.5, "F");
            doc.setTextColor(...color);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8.5);
            doc.text(texto, x + 5, y + 0.7);
            return x + w + 4;
        };
        let cx = margen;
        cx = chip(`Total: ${totalPasajeros} pasajeros`, [226, 232, 240], negro, cx);
        cx = chip(`Embarcados: ${totalEmbarcados}`, verdeBg, verde, cx);
        chip(`Pendientes: ${totalPasajeros - totalEmbarcados}`, ambarBg, ambar, cx);

        y += 9;
    };

    // ── ENCABEZADO SIMPLE (páginas siguientes) ──
    const dibujarEncabezadoPaginaExtra = () => {
        doc.setFillColor(...navy);
        doc.rect(0, 0, ancho, 14, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(`MANIFIESTO — ${viaje.codigoViaje} (continuación)`, margen, 9);
        y = 20;
    };

    // ── ENCABEZADO DE LA TABLA (se repite en cada página) ──
    const dibujarEncabezadoTabla = () => {
        doc.setFillColor(...navy);
        doc.rect(margen, y, anchoContenido, 8, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        let x = margen;
        COLUMNAS.forEach(col => {
            const tx = col.align === "center" ? x + col.ancho / 2 : x + 2.5;
            doc.text(col.titulo, tx, y + 5.3, { align: col.align === "center" ? "center" : "left" });
            x += col.ancho;
        });
        y += 8;
    };

    const lineasCelda = (texto, anchoCol) => doc.splitTextToSize(String(texto ?? "—"), anchoCol - 5);

    const dibujarFila = (fila, indice) => {
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");

        const lineasPorCelda = fila.map((valor, i) => lineasCelda(valor, COLUMNAS[i].ancho));
        const maxLineas = Math.max(...lineasPorCelda.map(l => l.length));
        const alturaFila = Math.max(7, maxLineas * 3.4 + 3);

        if (y + alturaFila > alto - 32) {
            doc.addPage();
            dibujarEncabezadoPaginaExtra();
            dibujarEncabezadoTabla();
        }

        if (indice % 2 === 1) {
            doc.setFillColor(...filaAlterna);
            doc.rect(margen, y, anchoContenido, alturaFila, "F");
        }
        doc.setDrawColor(...lineaColor);
        doc.line(margen, y + alturaFila, margen + anchoContenido, y + alturaFila);

        const textoY = y + alturaFila / 2 + 1; // centrado vertical
        let x = margen;
        fila.forEach((valor, i) => {
            const col = COLUMNAS[i];
            const esEstado = i === fila.length - 1;
            if (esEstado) {
                // Estado como chip de color
                const embarcado = valor === "Embarcado";
                doc.setFillColor(...(embarcado ? verdeBg : ambarBg));
                const chipW = 20;
                doc.roundedRect(x + 2, y + alturaFila / 2 - 2.6, chipW, 5.2, 2.6, 2.6, "F");
                doc.setTextColor(...(embarcado ? verde : ambar));
                doc.setFont("helvetica", "bold");
                doc.setFontSize(7);
                doc.text(valor, x + 2 + chipW / 2, textoY, { align: "center" });
            } else {
                doc.setTextColor(...negro);
                doc.setFont("helvetica", i === 1 ? "bold" : "normal");
                doc.setFontSize(7.5);
                const tx = col.align === "center" ? x + col.ancho / 2 : x + 2.5;
                doc.text(lineasPorCelda[i], tx, textoY - (lineasPorCelda[i].length - 1) * 1.7,
                    { align: col.align === "center" ? "center" : "left" });
            }
            x += col.ancho;
        });

        y += alturaFila;
    };

    // ── ARMADO DEL DOCUMENTO ──
    dibujarEncabezadoPortada();
    dibujarEncabezadoTabla();

    const filas = pasajeros.map((p, i) => [
        i + 1,
        p.pasajeroNombre || "—",
        `${p.tipoDocumento || ""} ${p.pasajeroDocumento || "—"}`.trim(),
        p.edad ?? "—",
        p.sexo || "—",
        p.procedencia || "—",
        tramo(p.paradaOrigen, p.paradaDestino),
        `${p.asientoTipo || ""} #${p.asientoNumero ?? "—"}`,
        p.embarqueEstado === "EMBARCADO" ? "Embarcado" : "Pendiente",
    ]);

    if (filas.length === 0) {
        doc.setTextColor(...gris);
        doc.setFontSize(9);
        doc.setFont("helvetica", "italic");
        doc.text("Este viaje aún no tiene pasajeros registrados.", margen + 4, y + 8);
        y += 16;
    } else {
        filas.forEach((fila, i) => dibujarFila(fila, i));
    }

    // ── FIRMAS ──
    let finalY = y + 22;
    if (finalY > alto - 22) { doc.addPage(); finalY = 30; }

    const firmaAncho = 70;
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.3);
    doc.line(30, finalY, 30 + firmaAncho, finalY);
    doc.line(ancho - 30 - firmaAncho, finalY, ancho - 30, finalY);
    doc.setFontSize(8);
    doc.setTextColor(...gris);
    doc.setFont("helvetica", "normal");
    doc.text("Patrón / Capitán", 30 + firmaAncho / 2, finalY + 5, { align: "center" });
    doc.text("Representante Transportes Rayza", ancho - 30 - firmaAncho / 2, finalY + 5, { align: "center" });

    // ── PIE DE PÁGINA ──
    const totalPaginas = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPaginas; p++) {
        doc.setPage(p);
        doc.setDrawColor(...lineaColor);
        doc.line(margen, alto - 12, ancho - margen, alto - 12);
        doc.setFontSize(7);
        doc.setTextColor(...gris);
        doc.setFont("helvetica", "normal");
        doc.text("Documento de control interno — Transportes Rayza", margen, alto - 7);
        doc.text(`Página ${p} de ${totalPaginas}`, ancho - margen, alto - 7, { align: "right" });
    }

    doc.save(`Manifiesto-${viaje.codigoViaje}.pdf`);
}

export default generarManifiestoPDF;
