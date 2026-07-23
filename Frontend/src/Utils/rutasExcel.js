/**
 * Plantillas de Excel para cargar una ruta: paradas y precios por tramo.
 *
 * Se descargan como .xlsx de verdad, no como CSV. Con CSV el archivo depende de con
 * qué separador y en qué codificación lo guarde cada Excel, y eso ya nos costó dos
 * problemas: paradas que no se reconocían y precios que entraban mal. Un .xlsx no
 * tiene separadores ni codificación que adivinar.
 *
 * Al subir se acepta igual un CSV (por si alguien reusa un archivo viejo o lo exporta
 * desde otra herramienta), detectando separador y codificación como antes.
 *
 * Todo ocurre en el navegador: al crear una ruta todavía no existe en la base, y así
 * el mismo flujo sirve para crear y para editar. Nada se guarda hasta pulsar Guardar.
 */

const BOM = "﻿";

/** La librería pesa bastante, así que se carga solo cuando se usa una plantilla. */
async function xlsx() {
    return await import("xlsx");
}

async function descargarLibro(filas, nombreHoja, nombreArchivo, anchos) {
    const XLSX = await xlsx();
    const hoja = XLSX.utils.aoa_to_sheet(filas);
    if (anchos) hoja["!cols"] = anchos.map(w => ({ wch: w }));

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, nombreHoja);
    XLSX.writeFile(libro, nombreArchivo);
}

// ------------------------------------------------------------- LECTURA

function detectarSeparador(texto) {
    const primera = texto.split(/\r?\n/).find(l => l.trim()) || "";
    return [";", "\t", ","].reduce((mejor, sep) => {
        const veces = primera.split(sep).length - 1;
        return veces > mejor.veces ? { sep, veces } : mejor;
    }, { sep: ";", veces: 0 }).sep;
}

/** Un .xlsx es un ZIP: empieza con "PK". Así se distingue de un CSV sin mirar el nombre. */
function esXlsx(bytes) {
    return bytes.length > 1 && bytes[0] === 0x50 && bytes[1] === 0x4b;
}

function textoDe(bytes) {
    let texto = new TextDecoder("utf-8").decode(bytes);
    // Excel en Windows suele guardar en Windows-1252 y ahí "Castaña" llega rota
    if (texto.includes("�")) {
        try { texto = new TextDecoder("windows-1252").decode(bytes); } catch { /* se queda con UTF-8 */ }
    }
    return texto;
}

/**
 * Lee el archivo subido —.xlsx o CSV— y lo devuelve como filas de celdas.
 * Con eso, el resto del código no necesita saber de qué formato vino.
 */
export async function leerFilas(archivo) {
    const bytes = new Uint8Array(await archivo.arrayBuffer());

    if (esXlsx(bytes)) {
        const XLSX = await xlsx();
        const libro = XLSX.read(bytes, { type: "array" });
        const hoja = libro.Sheets[libro.SheetNames[0]];
        return XLSX.utils.sheet_to_json(hoja, { header: 1, blankrows: false, raw: true })
                   .map(fila => fila.map(c => (c == null ? "" : String(c).trim())));
    }

    const texto = textoDe(bytes);
    const sep = detectarSeparador(texto);
    return texto.split(/\r?\n/)
        .map(l => l.replace(BOM, "").trim())
        .filter(l => l !== "")
        .map(l => l.split(sep).map(c => c.trim().replace(/^"|"$/g, "")));
}

/** Acepta 30 · 30.50 · 30,50 · "S/ 30" y celdas vacías. */
function numero(valor) {
    if (valor == null) return null;
    const v = String(valor).replace("S/", "").replace(/\s/g, "").replace(",", ".");
    if (v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : NaN;
}

// ------------------------------------------------------------- PARADAS

/**
 * Plantilla de paradas. La primera fila es el puerto de origen y la última el de
 * destino, así que se dejan puestos para que solo se completen los intermedios.
 */
export function descargarPlantillaParadas(origen, destino) {
    const filas = [
        ["orden", "parada", "minutos_desde_salida"],
        [1, origen || "PUERTO DE ORIGEN", 0],
        [2, "", ""],
        [3, "", ""],
        [4, destino || "PUERTO DE DESTINO", ""],
    ];
    return descargarLibro(filas, "Paradas", "paradas.xlsx", [8, 34, 22]);
}

/**
 * Interpreta las filas de paradas. El orden se renumera por la posición real: si se
 * borra una fila intermedia, la numeración igual queda seguida.
 */
export function leerParadas(filas) {
    const errores = [];
    const paradas = [];

    filas.forEach((c, i) => {
        if (i === 0 && /^orden/i.test(String(c[0] ?? ""))) return;      // encabezado

        const nombre = String(c[1] ?? "").trim();
        if (!nombre) return;                                            // fila vacía

        const min = numero(c[2]);
        if (Number.isNaN(min)) {
            errores.push(`Fila ${i + 1}: "${c[2]}" no es un número de minutos válido`);
            return;
        }
        paradas.push({ nombre, minutosDesdeSalida: min == null ? "" : Math.round(min) });
    });

    if (paradas.length < 2) {
        errores.push(paradas.length === 0
            ? "No se reconoció ninguna parada. Revisa que el archivo tenga las columnas orden, parada y minutos_desde_salida."
            : "El archivo debe traer al menos dos paradas");
    }

    return { paradas: paradas.map((p, i) => ({ ...p, orden: i + 1 })), errores };
}

// ------------------------------------------------------------- TARIFAS

/**
 * Plantilla de precios con TODAS las combinaciones posibles entre las paradas
 * cargadas (con 24 paradas son 276). Si ya hay precios, vienen puestos.
 */
export function descargarPlantillaTarifas(paradas, tarifasActuales = []) {
    const previas = new Map(
        tarifasActuales.map(t => [`${t.ordenOrigen}-${t.ordenDestino}`, t])
    );

    const filas = [["orden_origen", "origen", "orden_destino", "destino",
                    "precio_normal", "precio_vip"]];

    for (let i = 0; i < paradas.length; i++) {
        for (let j = i + 1; j < paradas.length; j++) {
            const o = paradas[i], d = paradas[j];
            const previa = previas.get(`${o.orden}-${d.orden}`);
            filas.push([
                o.orden, o.nombre, d.orden, d.nombre,
                previa?.precioNormal ?? "",
                previa?.precioVip ?? "",
            ]);
        }
    }
    return descargarLibro(filas, "Tarifas", "tarifas.xlsx", [13, 26, 14, 26, 15, 12]);
}

/**
 * Interpreta las filas de precios. Las que no traigan precio se ignoran: ese tramo
 * queda usando el precio base de la ruta en vez de no poder venderse.
 */
export function leerTarifas(filas, paradas) {
    const errores = [];
    const tarifas = [];
    let ignoradas = 0;

    const nombrePorOrden = new Map(paradas.map(p => [Number(p.orden), p.nombre]));

    filas.forEach((c, i) => {
        if (i === 0 && /^orden_origen/i.test(String(c[0] ?? ""))) return;

        // Más columnas de las esperadas suele ser un separador de más (";;") o coma
        // decimal con coma de separador: las columnas se corren y entraría un precio
        // que no es. Antes que importar mal en silencio, se corta y se explica.
        if (c.length > 6) {
            errores.push(
                `Fila ${i + 1}: tiene ${c.length} columnas y deben ser 6. ` +
                `Suele ser un separador de más: "1;Requena;2;Yanallpa;25;30", ` +
                `no "1;Requena;2;Yanallpa;;25;;30". Guardar como Excel (.xlsx) evita esto.`
            );
            return;
        }
        if (c.length < 6) { errores.push(`Fila ${i + 1}: se esperaban 6 columnas`); return; }

        const ordenOrigen = Number(c[0]), ordenDestino = Number(c[2]);
        const normal = numero(c[4]), vip = numero(c[5]);

        if (normal == null && vip == null) { ignoradas++; return; }
        if (Number.isNaN(normal) || Number.isNaN(vip)) {
            errores.push(`Fila ${i + 1}: precio inválido`); return;
        }
        if (!nombrePorOrden.has(ordenOrigen) || !nombrePorOrden.has(ordenDestino)) {
            errores.push(`Fila ${i + 1}: esa parada no existe en la ruta`); return;
        }
        if (ordenOrigen >= ordenDestino) {
            errores.push(`Fila ${i + 1}: el destino debe ir después del origen`); return;
        }

        tarifas.push({
            ordenOrigen, ordenDestino,
            origenTramo:  nombrePorOrden.get(ordenOrigen),
            destinoTramo: nombrePorOrden.get(ordenDestino),
            precioNormal: normal ?? vip,
            precioVip:    vip ?? normal,
        });
    });

    return { tarifas, ignoradas, errores };
}
