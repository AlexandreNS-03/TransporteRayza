import jsPDF from "jspdf";

// ── Columnas de la tabla (ancho en mm, deben sumar el ancho de contenido) ──
const COLUMNAS = [
    { titulo: "#",              ancho: 8  },
    { titulo: "Nombre Completo", ancho: 50 },
    { titulo: "Documento",       ancho: 38 },
    { titulo: "Edad",            ancho: 14 },
    { titulo: "Sexo",            ancho: 18 },
    { titulo: "Procedencia",     ancho: 32 },
    { titulo: "Tramo",           ancho: 45 },
    { titulo: "Asiento",         ancho: 28 },
    { titulo: "Estado",          ancho: 21 },
];

export function generarManifiestoPDF(viaje, pasajeros, capacidadTotal) {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const ancho = doc.internal.pageSize.getWidth();
    const alto  = doc.internal.pageSize.getHeight();
    const margen = 14;
    const anchoContenido = ancho - margen * 2;

    const azul  = [26, 77, 181];
    const gris  = [107, 114, 128];
    const negro = [30, 41, 59];
    const verde = [21, 128, 61];
    const ambar = [161, 98, 7];
    const lineaColor = [225, 229, 235];
    const filaAlterna = [248, 250, 252];

    let y = 15;

    // ── ENCABEZADO DE PORTADA (solo primera página) ──
    const dibujarEncabezadoPortada = () => {
        doc.setFillColor(...azul);
        doc.rect(0, 0, ancho, 22, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("TRANSPORTES RAYZA", margen, 10);

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text("RUC: 20123456789", margen, 16);

        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.text("MANIFIESTO DE PASAJEROS", ancho - margen, 13, { align: "right" });

        y = 30;

        doc.setTextColor(...negro);
        doc.setFontSize(9);
        const col1X = margen, col2X = ancho / 2 + 5;
        const filaAltura = 5.5;

        const datos = [
            ["Código de viaje:", viaje.codigoViaje, "Fecha de salida:", viaje.fechaSalida],
            ["Ruta:", viaje.rutaNombre, "Hora de salida:", viaje.horaSalida],
            ["Origen:", viaje.origen, "Destino:", viaje.destino],
            ["Embarcación:", viaje.embarcacionNombre, "Capacidad:", capacidadTotal ? `${capacidadTotal} pasajeros` : "—"],
        ];

        datos.forEach(([l1, v1, l2, v2]) => {
            doc.setFont("helvetica", "bold");
            doc.text(l1, col1X, y);
            doc.setFont("helvetica", "normal");
            doc.text(String(v1 || "—"), col1X + 28, y);

            doc.setFont("helvetica", "bold");
            doc.text(l2, col2X, y);
            doc.setFont("helvetica", "normal");
            doc.text(String(v2 || "—"), col2X + 28, y);

            y += filaAltura;
        });

        y += 3;

        const totalPasajeros  = pasajeros.length;
        const totalEmbarcados = pasajeros.filter(p => p.embarqueEstado === "EMBARCADO").length;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text(
            `Total pasajeros: ${totalPasajeros}   |   Embarcados: ${totalEmbarcados}   |   Pendientes: ${totalPasajeros - totalEmbarcados}`,
            col1X, y
        );

        y += 8;
    };

    // ── ENCABEZADO SIMPLE (páginas siguientes) ──
    const dibujarEncabezadoPaginaExtra = () => {
        doc.setTextColor(...negro);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(`Manifiesto — ${viaje.codigoViaje} (continuación)`, margen, 14);
        y = 22;
    };

    // ── ENCABEZADO DE LA TABLA (se repite en cada página) ──
    const dibujarEncabezadoTabla = () => {
        doc.setFillColor(...azul);
        doc.rect(margen, y, anchoContenido, 8, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");

        let x = margen;
        COLUMNAS.forEach(col => {
            doc.text(col.titulo, x + 2, y + 5.5);
            x += col.ancho;
        });
        y += 8;
    };

    // Calcula cuántas líneas necesita una celda dado su ancho
    const lineasCelda = (texto, anchoCol) => {
        return doc.splitTextToSize(String(texto ?? "—"), anchoCol - 4);
    };

    const dibujarFila = (fila, indice) => {
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");

        // Determinar altura de la fila según la celda con más líneas
        const lineasPorCelda = fila.map((valor, i) => lineasCelda(valor, COLUMNAS[i].ancho));
        const maxLineas = Math.max(...lineasPorCelda.map(l => l.length));
        const alturaFila = Math.max(6, maxLineas * 3.2 + 2);

        // Salto de página si no entra la fila
        if (y + alturaFila > alto - 30) {
            doc.addPage();
            dibujarEncabezadoPaginaExtra();
            dibujarEncabezadoTabla();
        }

        // Fondo alterno
        if (indice % 2 === 1) {
            doc.setFillColor(...filaAlterna);
            doc.rect(margen, y, anchoContenido, alturaFila, "F");
        }

        // Líneas divisorias
        doc.setDrawColor(...lineaColor);
        doc.line(margen, y + alturaFila, margen + anchoContenido, y + alturaFila);

        let x = margen;
        doc.setTextColor(...negro);
        fila.forEach((valor, i) => {
            const esEstado = i === fila.length - 1;
            if (esEstado) {
                doc.setTextColor(...(valor === "Embarcado" ? verde : ambar));
                doc.setFont("helvetica", "bold");
            } else {
                doc.setTextColor(...negro);
                doc.setFont("helvetica", "normal");
            }
            doc.text(lineasPorCelda[i], x + 2, y + 4);
            x += COLUMNAS[i].ancho;
        });

        y += alturaFila;
    };

    // ── ARMADO DEL DOCUMENTO ──
    dibujarEncabezadoPortada();
    dibujarEncabezadoTabla();

    const filas = pasajeros.map((p, i) => [
        i + 1,
        p.pasajeroNombre || "—",
        `${p.tipoDocumento || ""}: ${p.pasajeroDocumento || "—"}`,
        p.edad ?? "—",
        p.sexo || "—",
        p.procedencia || "—",
        `${p.paradaOrigen || "—"} → ${p.paradaDestino || "—"}`,
        `${p.asientoTipo || ""} #${p.asientoNumero ?? "—"}`,
        p.embarqueEstado === "EMBARCADO" ? "Embarcado" : "Pendiente",
    ]);

    filas.forEach((fila, i) => dibujarFila(fila, i));

    // ── FIRMAS ──
    let finalY = y + 15;
    if (finalY > alto - 25) {
        doc.addPage();
        finalY = 25;
    }

    const firmaAncho = 70;
    doc.setDrawColor(180, 180, 180);
    doc.line(20, finalY, 20 + firmaAncho, finalY);
    doc.line(ancho - 20 - firmaAncho, finalY, ancho - 20, finalY);

    doc.setFontSize(8);
    doc.setTextColor(...gris);
    doc.setFont("helvetica", "normal");
    doc.text("Patrón / Capitán", 20 + firmaAncho / 2, finalY + 5, { align: "center" });
    doc.text("Representante Transportes Rayza", ancho - 20 - firmaAncho / 2, finalY + 5, { align: "center" });

    // ── PIE DE PÁGINA EN TODAS LAS PÁGINAS ──
    const totalPaginas = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPaginas; p++) {
        doc.setPage(p);
        doc.setFontSize(7);
        doc.setTextColor(...gris);
        doc.text(`Generado el ${new Date().toLocaleString("es-PE")}`, margen, alto - 8);
        doc.text(`Página ${p} de ${totalPaginas}`, ancho - margen, alto - 8, { align: "right" });
    }

    doc.save(`Manifiesto-${viaje.codigoViaje}.pdf`);
}

export default generarManifiestoPDF;