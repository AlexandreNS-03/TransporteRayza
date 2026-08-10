// Avisa al sistema cuando algo revienta en el navegador del cliente.
//
// Cuando "Mi cuenta" se rompió, nos enteramos de casualidad: el cliente que se
// topó con la pantalla en blanco simplemente se fue. Ahora el error llega solo a
// la bandeja de Soporte.

const API = (import.meta.env.VITE_API_URL || "http://localhost:8080") + "/api/public";

/** Un mismo error no se manda dos veces en la misma visita. */
const yaEnviados = new Set();

export function reportarError(mensaje, detalle) {
  try {
    if (!mensaje) return;
    const huella = `${mensaje}|${location.pathname}`;
    if (yaEnviados.has(huella)) return;
    yaEnviados.add(huella);

    const cuerpo = JSON.stringify({
      mensaje: String(mensaje).slice(0, 2000),
      detalle: detalle ? String(detalle).slice(0, 2000) : "",
      ruta: location.pathname + location.search,
      navegador: navigator.userAgent,
    });

    // keepalive para que el aviso salga aunque el error se lleve la página por delante.
    fetch(`${API}/errores`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: cuerpo,
      keepalive: true,
    }).catch(() => { /* si no se puede avisar, no se insiste */ });
  } catch { /* el reporte de errores jamás debe romper nada */ }
}

/**
 * Engancha los errores que nadie atrapó: los de siempre y las promesas
 * rechazadas, que son los que dejan la pantalla a medias sin decir nada.
 */
export function escucharErrores() {
  window.addEventListener("error", (e) => {
    reportarError(e.message, `${e.filename || ""}:${e.lineno || 0}\n${e.error?.stack || ""}`);
  });
  window.addEventListener("unhandledrejection", (e) => {
    const r = e.reason;
    reportarError(r?.message || String(r), r?.stack || "");
  });
}
