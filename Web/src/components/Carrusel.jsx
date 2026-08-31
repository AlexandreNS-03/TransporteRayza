import { useEffect, useRef, useState } from "react";

/**
 * Carrusel de imágenes con cross-fade automático y puntos de navegación.
 * `slides` = [{ src, alt }]. Se detiene si el usuario prefiere menos movimiento.
 */
export default function Carrusel({ slides = [], intervalo = 5000, flechas = false, children }) {
  const [activo, setActivo] = useState(0);
  const timer = useRef(null);

  /**
   * Qué fotos se han pedido ya.
   *
   * Todas las diapositivas están una encima de otra dentro de la pantalla, así
   * que `loading="lazy"` no sirve de nada: el navegador las ve en pantalla y se
   * las baja todas al abrir —eran 1,7 MB peleando con la foto de portada, que
   * es justo la que se mide como LCP—. Acá se pide solo la que se ve y la que
   * sigue; el resto entra a medida que le toca.
   */
  const [pedidas, setPedidas] = useState(() => new Set([0, slides.length > 1 ? 1 : 0]));

  useEffect(() => {
    setPedidas((p) => {
      const siguiente = (activo + 1) % Math.max(slides.length, 1);
      if (p.has(activo) && p.has(siguiente)) return p;
      const n = new Set(p);
      n.add(activo); n.add(siguiente);
      return n;
    });
  }, [activo, slides.length]);

  const reprogramar = () => {
    clearInterval(timer.current);
    if (slides.length <= 1) return;
    const menosMovimiento = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (menosMovimiento) return;
    timer.current = setInterval(() => setActivo((i) => (i + 1) % slides.length), intervalo);
  };

  useEffect(() => {
    reprogramar();
    return () => clearInterval(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides.length, intervalo]);

  const irA = (i) => { setActivo((i + slides.length) % slides.length); reprogramar(); };

  if (slides.length === 0) return null;

  return (
    <div className="carrusel">
      {slides.map((s, i) => (
        <img
          key={`${i}-${s.src}`}
          src={pedidas.has(i) ? s.src : undefined}
          alt={s.alt || ""}
          className={`carrusel-img ${i === activo ? "on" : ""}`}
          loading={i === 0 ? "eager" : "lazy"}
          /* La primera es la foto grande de la portada: es la que el navegador
             mide como LCP, así que pide paso delante del resto. Las demás se
             decodifican aparte para no bloquear el hilo mientras se lee. */
          fetchPriority={i === 0 ? "high" : "low"}
          decoding={i === 0 ? "sync" : "async"}
          aria-hidden={i !== activo}
        />
      ))}

      {children}

      {flechas && slides.length > 1 && (
        <>
          <button type="button" className="carrusel-flecha izq" aria-label="Anterior" onClick={() => irA(activo - 1)}>
            <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button type="button" className="carrusel-flecha der" aria-label="Siguiente" onClick={() => irA(activo + 1)}>
            <svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>
          </button>
        </>
      )}

      {slides.length > 1 && (
        <div className="carrusel-puntos">
          {slides.map((s, i) => (
            <button
              key={`${i}-${s.src}`}
              type="button"
              className={i === activo ? "on" : ""}
              aria-label={`Ver imagen ${i + 1}`}
              aria-current={i === activo}
              onClick={() => irA(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
