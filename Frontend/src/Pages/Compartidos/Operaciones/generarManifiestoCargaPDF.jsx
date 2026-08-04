import jsPDF from "jspdf";
import { cargarLogo, ajustarLogo } from "../../../Utils/logo.js";

// Columnas del manifiesto de carga (ancho en mm; suman el ancho de contenido).
const COLUMNAS = [
    { titulo: "#",            ancho: 8,  align: "left" },
    { titulo: "Código",       ancho: 26, align: "left" },
    { titulo: "Remitente",    ancho: 40, align: "left" },
    { titulo: "Destinatario", ancho: 40, align: "left" },
    { titulo: "Contenido",    ancho: 46, align: "left" },
    { titulo: "Peso",         ancho: 16, align: "center" },
    { titulo: "Baja en",      ancho: 30, align: "left" },
    { titulo: "Precio",       ancho: 20, align: "left" },
    { titulo: "Pago",         ancho: 24, align: "left" },
    { titulo: "Estado",       ancho: 23, align: "left" },
];

// jsPDF (fuentes estándar) no tiene el glifo "→"
const limpiar = (t) => String(t ?? "—").replace(/[→➔➜⟶]/g, "-");

const PAGO_LABEL = { PAGADO: "Pagado", PENDIENTE: "Pendiente", PAGA_DESTINO: "Paga destino" };
const ESTADO_LABEL = { REGISTRADO: "Registrado", EN_TRANSITO: "En transito", ENTREGADO: "Entregado", DEVUELTO: "Devuelto" };

export async function generarManifiestoCargaPDF(viaje, encomiendas) {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const ancho = doc.internal.pageSize.getWidth();
    const alto  = doc.internal.pageSize.getHeight();
    const margen = 12;
    const anchoContenido = ancho - margen * 2;

    const navy = [15, 23, 42];
    const azul = [26, 77, 181];
    const azulBg = [239, 246, 255];
    const gris = [107, 114, 128];
    const negro = [30, 41, 59];
    const verde = [21, 128, 61];
    const verdeBg = [240, 253, 244];
    const ambar = [161, 98, 7];
    const ambarBg = [254, 249, 195];
    const rojo = [185, 28, 28];
    const rojoBg = [254, 242, 242];
    const lineaColor = [225, 229, 235];
    const filaAlterna = [248, 250, 252];

    const logo = await cargarLogo();
    let y = 15;

    const dibujarPortada = () => {
        doc.setFillColor(...navy);
        doc.rect(0, 0, ancho, 26, "F");
        doc.setFillColor(...azul);
        doc.rect(0, 26, ancho, 1.5, "F");

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
        doc.text("Transporte Fluvial de Carga  ·  RUC: 20123456789", textoX, 18);
        doc.text("Sucursales Iquitos · Requena — Loreto, Perú", textoX, 22.5);

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("MANIFIESTO DE CARGA", ancho - margen, 14, { align: "right" });
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(190, 200, 215);
        doc.text(`Emitido: ${new Date().toLocaleString("es-PE")}`, ancho - margen, 20, { align: "right" });

        y = 34;

        const cajaAlto = 24;
        doc.setFillColor(...azulBg);
        doc.roundedRect(margen, y, anchoContenido, cajaAlto, 2, 2, "F");

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
            doc.text(doc.splitTextToSize(limpiar(valor), colW - 6), x, yy + 5);
        };
        dato("Código de viaje", viaje.codigoViaje, 0, 0);
        dato("Ruta", viaje.rutaNombre, 1, 0);
        dato("Fecha de salida", viaje.fechaSalida, 2, 0);
        dato("Hora de salida", viaje.horaSalida, 3, 0);
        dato("Embarcación", viaje.embarcacionNombre, 0, 1);

        const pesoTotal = encomiendas.reduce((s, e) => s + (Number(e.peso) || 0), 0);
        const montoTotal = encomiendas.reduce((s, e) => s + (Number(e.precio) || 0), 0);
        const porCobrar = encomiendas.filter(e => e.estadoPago !== "PAGADO")
            .reduce((s, e) => s + (Number(e.precio) || 0), 0);
        dato("Bultos", String(encomiendas.length), 1, 1);
        dato("Peso total", pesoTotal ? `${pesoTotal.toFixed(2)} kg` : "—", 2, 1);
        dato("Monto total", `S/ ${montoTotal.toFixed(2)}`, 3, 1);

        y += cajaAlto + 6;

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
        cx = chip(`Bultos: ${encomiendas.length}`, [226, 232, 240], negro, cx);
        cx = chip(`Pagadas: ${encomiendas.filter(e => e.estadoPago === "PAGADO").length}`, verdeBg, verde, cx);
        chip(`Por cobrar: S/ ${porCobrar.toFixed(2)}`, ambarBg, ambar, cx);

        y += 9;
    };

    const dibujarEncabezadoPaginaExtra = () => {
        doc.setFillColor(...navy);
        doc.rect(0, 0, ancho, 14, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(`MANIFIESTO DE CARGA — ${viaje.codigoViaje} (continuación)`, margen, 9);
        y = 20;
    };

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

    const lineasCelda = (texto, anchoCol) => doc.splitTextToSize(limpiar(texto), anchoCol - 5);

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

        const textoY = y + alturaFila / 2 + 1;
        let x = margen;
        fila.forEach((valor, i) => {
            const col = COLUMNAS[i];
            const esPago = i === 8;
            if (esPago) {
                const pagado = valor === "Pagado";
                const pend = valor === "Pendiente";
                doc.setFillColor(...(pagado ? verdeBg : pend ? rojoBg : ambarBg));
                const chipW = 21;
                doc.roundedRect(x + 2, y + alturaFila / 2 - 2.6, chipW, 5.2, 2.6, 2.6, "F");
                doc.setTextColor(...(pagado ? verde : pend ? rojo : ambar));
                doc.setFont("helvetica", "bold");
                doc.setFontSize(6.5);
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

    dibujarPortada();
    dibujarEncabezadoTabla();

    const filas = encomiendas.map((e, i) => [
        i + 1,
        e.codigoEncomienda || "—",
        e.remitenteNombre || "—",
        e.destinatarioNombre || "—",
        e.descripcion || "—",
        e.peso ? `${e.peso}` : "—",
        e.paradaDestino || e.sucursalDestinoNombre || "—",
        `S/ ${Number(e.precio || 0).toFixed(2)}`,
        PAGO_LABEL[e.estadoPago] || "Pagado",
        ESTADO_LABEL[e.estado] || e.estado || "—",
    ]);

    if (filas.length === 0) {
        doc.setTextColor(...gris);
        doc.setFontSize(9);
        doc.setFont("helvetica", "italic");
        doc.text("Este viaje no tiene encomiendas asignadas.", margen + 4, y + 8);
        y += 16;
    } else {
        filas.forEach((fila, i) => dibujarFila(fila, i));
    }

    // FIRMAS
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
    doc.text("Responsable de carga", ancho - 30 - firmaAncho / 2, finalY + 5, { align: "center" });

    // PIE
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

    doc.save(`ManifiestoCarga-${viaje.codigoViaje}.pdf`);
}

export default generarManifiestoCargaPDF;
