/**
 * Plantillas CSV para cargar una ruta desde Excel.
 *
 * Todo se arma y se lee en el navegador, sin pasar por el servidor: al crear una
 * ruta todavía no existe en la base, y así el mismo flujo sirve para crear y para
 * editar. Nada se guarda hasta que se presiona Guardar.
 *
 * Se usa punto y coma y se antepone un BOM porque es lo que espera el Excel en
 * español: con coma abre todo amontonado en una sola columna.
 */

const SEP = ";";
const BOM = "﻿";

function descargar(nombreArchivo, contenido) {
    const blob = new Blob([BOM + contenido], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombreArchivo;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Detecta con qué separa el archivo. Excel guarda con ';', con ',' o con tabulación
 * según cómo se haya exportado, así que se elige el que más aparezca en el encabezado
 * en vez de asumir uno.
 */
function detectarSeparador(texto) {
    const primera = texto.split(/\r?\n/).find(l => l.trim()) || "";
    const candidatos = ["\t", ";", ","];
    return candidatos.reduce((mejor, sep) => {
        const veces = primera.split(sep).length - 1;
        return veces > mejor.veces ? { sep, veces } : mejor;
    }, { sep: SEP, veces: 0 }).sep;
}

function columnas(linea, sep) {
    return linea.split(sep).map(c => c.trim().replace(/^"|"$/g, ""));
}

/**
 * Lee el archivo como texto adivinando su codificación.
 *
 * Excel no guarda en UTF-8: el de Windows usa Windows-1252 y el de Mac usa Mac OS
 * Roman, y en cada uno la "ñ" es un byte distinto (el mismo 0x96 es "ñ" en Mac y
 * un guion largo en Windows). Se prueba UTF-8 estricto y, si el archivo no lo es,
 * se decodifica con las dos y gana la que produzca más letras propias del español.
 */
export function leerArchivo(archivo) {
    return new Promise((resolve, reject) => {
        const lector = new FileReader();
        lector.onerror = () => reject(new Error("No se pudo leer el archivo"));
        lector.onload = () => {
            const bytes = new Uint8Array(lector.result);

            try {
                resolve(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
                return;
            } catch {
                // No es UTF-8: hay que adivinar entre las dos de Excel
            }

            const acentos = /[áéíóúüñÁÉÍÓÚÜÑ]/g;
            const candidatos = ["macintosh", "windows-1252"]
                .map(cod => {
                    try {
                        const texto = new TextDecoder(cod).decode(bytes);
                        return { texto, puntaje: (texto.match(acentos) || []).length };
                    } catch {
                        return null;
                    }
                })
                .filter(Boolean);

            if (!candidatos.length) {
                resolve(new TextDecoder("utf-8").decode(bytes));
                return;
            }
            // Empate (archivo sin acentos): cualquiera sirve, coinciden en el resto
            resolve(candidatos.sort((a, b) => b.puntaje - a.puntaje)[0].texto);
        };
        lector.readAsArrayBuffer(archivo);
    });
}

/** Acepta 30 · 30.50 · 30,50 · "S/ 30" y celdas vacías. */
function numero(valor) {
    if (valor == null) return null;
    const v = String(valor).replace("S/", "").replace(/\s/g, "").replace(",", ".");
    if (v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : NaN;
}

// ---------------------------------------------------------------- PARADAS

/**
 * Plantilla de paradas. La primera fila es el puerto de origen y la última el de
 * destino, así que se dejan puestos para que solo se completen los intermedios.
 */
export function descargarPlantillaParadas(origen, destino) {
    const filas = [
        ["orden", "parada", "minutos_desde_salida"].join(SEP),
        [1, origen || "PUERTO DE ORIGEN", 0].join(SEP),
        [2, "", ""].join(SEP),
        [3, "", ""].join(SEP),
        [4, destino || "PUERTO DE DESTINO", ""].join(SEP),
    ];
    descargar("paradas.csv", filas.join("\n") + "\n");
}

/**
 * Lee la plantilla de paradas. Renumera el orden según la posición real en el
 * archivo: si alguien borra una fila intermedia, la numeración igual queda seguida.
 */
export function leerParadas(texto) {
    const errores = [];
    const paradas = [];
    const sep = detectarSeparador(texto);

    texto.split(/\r?\n/).forEach((linea, i) => {
        linea = linea.replace(BOM, "").trim();
        if (!linea) return;
        if (i === 0 && /^orden/i.test(linea)) return;      // encabezado

        const c = columnas(linea, sep);
        const nombre = (c[1] || "").trim();
        if (!nombre) return;                                // fila vacía o sin nombre

        const min = numero(c[2]);
        if (Number.isNaN(min)) {
            errores.push(`Línea ${i + 1}: "${c[2]}" no es un número de minutos válido`);
            return;
        }
        paradas.push({ nombre, minutosDesdeSalida: min == null ? "" : Math.round(min) });
    });

    if (paradas.length < 2) {
        errores.push(paradas.length === 0
            ? "No se reconoció ninguna parada. Revisa que el archivo tenga las columnas orden, parada y minutos_desde_salida."
            : "El archivo debe traer al menos dos paradas");
    }

    return {
        paradas: paradas.map((p, i) => ({ ...p, orden: i + 1 })),
        errores,
    };
}

// ---------------------------------------------------------------- TARIFAS

/**
 * Plantilla de precios con TODAS las combinaciones posibles entre las paradas
 * cargadas (con 7 paradas son 21). Si ya hay precios, vienen puestos.
 */
export function descargarPlantillaTarifas(paradas, tarifasActuales = []) {
    const previas = new Map(
        tarifasActuales.map(t => [`${t.ordenOrigen}-${t.ordenDestino}`, t])
    );

    const filas = [["orden_origen", "origen", "orden_destino", "destino",
                    "precio_normal", "precio_vip"].join(SEP)];

    for (let i = 0; i < paradas.length; i++) {
        for (let j = i + 1; j < paradas.length; j++) {
            const o = paradas[i], d = paradas[j];
            const previa = previas.get(`${o.orden}-${d.orden}`);
            filas.push([
                o.orden, o.nombre, d.orden, d.nombre,
                previa?.precioNormal ?? "",
                previa?.precioVip ?? "",
            ].join(SEP));
        }
    }
    descargar("tarifas.csv", filas.join("\n") + "\n");
}

/**
 * Lee la plantilla de precios. Las filas sin precio se ignoran: ese tramo queda
 * usando el precio base de la ruta en vez de quedar sin poder venderse.
 */
export function leerTarifas(texto, paradas) {
    const errores = [];
    const tarifas = [];
    let ignoradas = 0;
    const sep = detectarSeparador(texto);

    const nombrePorOrden = new Map(paradas.map(p => [Number(p.orden), p.nombre]));

    texto.split(/\r?\n/).forEach((linea, i) => {
        linea = linea.replace(BOM, "").trim();
        if (!linea) return;
        if (i === 0 && /^orden_origen/i.test(linea)) return;

        const c = columnas(linea, sep);

        // Coma como separador Y coma decimal a la vez: "30,50" se parte en dos y
        // entraría 30 en vez de 30.50. Antes que importar un precio equivocado en
        // silencio, se corta y se explica cómo guardarlo.
        if (sep === "," && c.length > 6) {
            errores.push(
                `Línea ${i + 1}: el archivo usa coma para separar columnas y también en los ` +
                `precios, así que no se puede saber cuál es cuál. Guárdalo desde Excel como ` +
                `"CSV delimitado por punto y coma", o escribe los precios con punto (30.50).`
            );
            return;
        }
        if (c.length < 6) { errores.push(`Línea ${i + 1}: se esperaban 6 columnas`); return; }

        const ordenOrigen = Number(c[0]), ordenDestino = Number(c[2]);
        const normal = numero(c[4]), vip = numero(c[5]);

        if (normal == null && vip == null) { ignoradas++; return; }
        if (Number.isNaN(normal) || Number.isNaN(vip)) {
            errores.push(`Línea ${i + 1}: precio inválido`); return;
        }
        if (!nombrePorOrden.has(ordenOrigen) || !nombrePorOrden.has(ordenDestino)) {
            errores.push(`Línea ${i + 1}: esa parada no existe en la ruta`); return;
        }
        if (ordenOrigen >= ordenDestino) {
            errores.push(`Línea ${i + 1}: el destino debe ir después del origen`); return;
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
