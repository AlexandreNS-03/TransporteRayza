/**
 * Subida de adjuntos a Cloudinary, directo desde el navegador.
 *
 * El preset es "sin firmar", así que no viaja ninguna clave secreta: el archivo
 * va del navegador a Cloudinary sin pasar por nuestro servidor, y lo único que
 * guardamos después es la URL.
 *
 * Es a propósito que el archivo NO pase por nuestro backend: el disco de Railway
 * se borra en cada despliegue, y esto es prueba de un reclamo que hay que
 * conservar dos años.
 *
 * El backend igual verifica que cada URL sea de nuestra cuenta antes de guardarla:
 * un preset sin firmar es público y no se puede confiar solo en él.
 */

const CLOUD  = import.meta.env.VITE_CLOUDINARY_CLOUD  || "dutcsc3jk";
const PRESET = import.meta.env.VITE_CLOUDINARY_PRESET || "transporter-libro";

/** Lo que el consumidor puede adjuntar como prueba. */
export const TIPOS_ACEPTADOS = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];
export const MAX_MB = 5;
export const MAX_ARCHIVOS = 5;

/**
 * Sube un archivo y devuelve { url, nombre }.
 *
 * Se usa `auto` en la ruta para que acepte imágenes y PDF con el mismo endpoint.
 */
export async function subirAdjunto(archivo) {
  if (!TIPOS_ACEPTADOS.includes(archivo.type))
    throw new Error(`"${archivo.name}" no es una imagen ni un PDF.`);

  if (archivo.size > MAX_MB * 1024 * 1024)
    throw new Error(`"${archivo.name}" pesa más de ${MAX_MB} MB.`);

  const cuerpo = new FormData();
  cuerpo.append("file", archivo);
  cuerpo.append("upload_preset", PRESET);

  let resp;
  try {
    resp = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/auto/upload`, {
      method: "POST",
      body: cuerpo,
    });
  } catch {
    throw new Error("No se pudo subir el archivo. Revisa tu conexión.");
  }

  if (!resp.ok) {
    // Cloudinary explica el motivo en el cuerpo; el más común es que el preset
    // no exista o no esté marcado como "sin firmar".
    let detalle = "";
    try {
      const d = await resp.json();
      detalle = d?.error?.message || "";
    } catch { /* respuesta sin JSON */ }
    console.error("[Cloudinary] no se pudo subir:", resp.status, detalle);
    throw new Error(`No se pudo subir "${archivo.name}". Puedes enviar tu reclamo sin adjuntos.`);
  }

  const d = await resp.json();
  return { url: d.secure_url, nombre: archivo.name };
}
