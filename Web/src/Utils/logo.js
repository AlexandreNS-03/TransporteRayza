// Carga el logo de la empresa desde /public/logo-rayza.png y lo devuelve como
// data URL para incrustarlo en los PDF (jsPDF).
// - Recorta automáticamente el espacio en blanco/transparente alrededor del logo
//   (así no importa si la imagen original tiene mucho margen).
// - Devuelve { dataUrl, w, h } con la proporción real ya recortada.
// Para cambiar el logo, reemplaza el archivo Frontend/public/logo-rayza.png.

let cache = undefined; // undefined = no intentado, null = falló, objeto = ok

function recortarMargen(img) {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    let data;
    try {
        data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    } catch {
        // Si el canvas quedó "tainted" no podemos leer píxeles: devolvemos completo
        return { dataUrl: canvas.toDataURL("image/png"), w: canvas.width, h: canvas.height };
    }

    let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0, hay = false;
    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            const i = (y * canvas.width + x) * 4;
            const a = data[i + 3];
            const casiBlanco = data[i] > 245 && data[i + 1] > 245 && data[i + 2] > 245;
            if (a > 25 && !casiBlanco) {
                hay = true;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }
    if (!hay) return { dataUrl: canvas.toDataURL("image/png"), w: canvas.width, h: canvas.height };

    const pad = 4;
    minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
    maxX = Math.min(canvas.width - 1, maxX + pad); maxY = Math.min(canvas.height - 1, maxY + pad);
    const w = maxX - minX + 1, h = maxY - minY + 1;

    const out = document.createElement("canvas");
    out.width = w; out.height = h;
    out.getContext("2d").drawImage(canvas, minX, minY, w, h, 0, 0, w, h);
    return { dataUrl: out.toDataURL("image/png"), w, h };
}

export async function cargarLogo() {
    if (cache !== undefined) return cache;
    try {
        const img = await new Promise((resolve, reject) => {
            const el = new Image();
            el.onload = () => resolve(el);
            el.onerror = reject;
            el.src = "/logo-rayza.png";
        });
        cache = recortarMargen(img);
    } catch {
        cache = null; // sin logo: los PDF se generan igual sin él
    }
    return cache;
}

/**
 * Calcula el tamaño con el que dibujar el logo dentro de una caja (maxW x maxH),
 * manteniendo la proporción. Devuelve { w, h }.
 */
export function ajustarLogo(logo, maxW, maxH) {
    const ratio = Math.min(maxW / logo.w, maxH / logo.h);
    return { w: logo.w * ratio, h: logo.h * ratio };
}

export default cargarLogo;
