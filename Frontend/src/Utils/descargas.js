/**
 * Guardado de manifiestos y reportes en una carpeta fija.
 *
 * Una página web no puede decidir a qué carpeta baja un archivo: eso lo manda el
 * navegador, y todo termina en Descargas mezclado con lo demás. Lo que sí se puede
 * es pedirle UNA vez al usuario que elija dónde guardar; ahí dentro creamos la
 * carpeta "Reportes-RAYZA" y de ahí en adelante todo cae solo en ese sitio, sin
 * volver a preguntar.
 *
 * Dentro se separa por tipo, para no terminar con cientos de boletos encima de los
 * manifiestos:
 *
 *   Reportes-RAYZA/Boletos       boletos, tickets y comprobantes de venta
 *   Reportes-RAYZA/Encomiendas   guías y etiquetas de carga
 *   Reportes-RAYZA/Manifiestos   manifiestos de pasajeros y de carga
 *   Reportes-RAYZA/Reportes      exportaciones de reportes
 *   Reportes-RAYZA/Respaldos     copias de seguridad de la base
 *
 * Funciona en Chrome y Edge (los que usan en la oficina). En Firefox y Safari no
 * existe esa función: ahí el archivo baja como siempre, a Descargas.
 */

const CARPETA = "Reportes-RAYZA";

/** Subcarpetas por tipo de documento. */
export const CARPETAS = {
    BOLETOS: "Boletos",
    ENCOMIENDAS: "Encomiendas",
    MANIFIESTOS: "Manifiestos",
    REPORTES: "Reportes",
    RESPALDOS: "Respaldos",
};
const BD = "rayza-archivos";
const ALMACEN = "carpetas";
const CLAVE = "reportes";

/** Si el usuario cerró el selector, no se le insiste el resto de la sesión. */
let rechazado = false;

const soportado = () => typeof window !== "undefined" && "showDirectoryPicker" in window;

// ── Guardar el permiso de la carpeta entre sesiones ──
// El handle de la carpeta se puede guardar en IndexedDB (no en localStorage, que
// solo admite texto), así el navegador recuerda el permiso y no vuelve a preguntar.

function abrirBd() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(BD, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(ALMACEN);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function leerCarpetaGuardada() {
    try {
        const db = await abrirBd();
        return await new Promise((resolve) => {
            const req = db.transaction(ALMACEN, "readonly").objectStore(ALMACEN).get(CLAVE);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
        });
    } catch { return null; }
}

async function recordarCarpeta(handle) {
    try {
        const db = await abrirBd();
        db.transaction(ALMACEN, "readwrite").objectStore(ALMACEN).put(handle, CLAVE);
    } catch { /* si no se puede recordar, solo vuelve a preguntar la próxima vez */ }
}

/** Pide permiso sobre una carpeta ya elegida antes. Devuelve si quedó utilizable. */
async function tienePermiso(handle) {
    if (!handle?.queryPermission) return false;
    const opciones = { mode: "readwrite" };
    if (await handle.queryPermission(opciones) === "granted") return true;
    return await handle.requestPermission(opciones) === "granted";
}

/**
 * Carpeta donde va el archivo, ya creada, o null si no se puede usar (navegador
 * sin soporte, o el usuario prefirió la descarga de siempre).
 */
async function carpetaDestino(subcarpeta) {
    if (!soportado() || rechazado) return null;

    let base = await leerCarpetaGuardada();
    if (base && !(await tienePermiso(base))) base = null;

    if (!base) {
        try {
            // Debe salir de un clic del usuario; por eso se llama dentro del botón.
            base = await window.showDirectoryPicker({
                id: "rayza-reportes", mode: "readwrite", startIn: "documents"
            });
        } catch (e) {
            // Solo se deja de insistir si el usuario cerró el selector a propósito.
            // Cualquier otro fallo (el navegador exige un clic más reciente, por
            // ejemplo) es pasajero: la próxima descarga vuelve a intentarlo.
            if (e?.name === "AbortError") rechazado = true;
            return null;
        }
        await recordarCarpeta(base);
    }

    try {
        const raiz = await base.getDirectoryHandle(CARPETA, { create: true });
        if (!subcarpeta) return raiz;
        return await raiz.getDirectoryHandle(subcarpeta, { create: true });
    } catch { return null; }
}

/** Descarga normal del navegador (a la carpeta de Descargas). */
function descargarNormal(blob, nombre) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Guarda el archivo en Reportes-RAYZA si se puede, y si no lo descarga como
 * siempre. Nunca lanza error: el archivo tiene que llegar igual.
 *
 * @param {Blob}   blob       contenido del archivo
 * @param {string} nombre     nombre con extensión
 * @param {string} [subcarpeta] una de CARPETAS; si falta, va a la raíz
 * @returns {Promise<boolean>} true si quedó en la carpeta, false si fue a Descargas.
 */
export async function guardarArchivo(blob, nombre, subcarpeta) {
    try {
        const carpeta = await carpetaDestino(subcarpeta);
        if (carpeta) {
            const archivo = await carpeta.getFileHandle(nombre, { create: true });
            const escritura = await archivo.createWritable();
            await escritura.write(blob);
            await escritura.close();
            return true;
        }
    } catch (e) {
        console.warn("[Descargas] No se pudo guardar en la carpeta:", e);
    }
    descargarNormal(blob, nombre);
    return false;
}

/** Igual que guardarArchivo, pero recibiendo el documento de jsPDF. */
export async function guardarPdf(doc, nombre, subcarpeta) {
    return guardarArchivo(doc.output("blob"), nombre, subcarpeta);
}

/** Nombre de la carpeta, para poder avisarle al usuario dónde quedó el archivo. */
export const CARPETA_REPORTES = CARPETA;

/**
 * Aviso de dónde quedó el archivo. Se saca acá para que todas las pantallas digan
 * lo mismo y nadie se quede buscando el PDF.
 *
 * @param mostrarToast  el de useToast()
 * @param enCarpeta     lo que devolvió guardarArchivo / guardarPdf
 * @param que           "Boleto", "Guía", "Manifiesto"…
 * @param subcarpeta    una de CARPETAS
 */
export function avisarGuardado(mostrarToast, enCarpeta, que, subcarpeta) {
    if (!mostrarToast) return;
    mostrarToast("success", enCarpeta
        ? `${que} guardado en ${CARPETA}/${subcarpeta}`
        : `${que} descargado`);
}

/** Si este navegador puede guardar en carpeta (para mostrarlo o no en pantalla). */
export const soportaCarpeta = soportado;
