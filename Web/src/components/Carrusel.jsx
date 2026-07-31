import { useEffect, useRef, useState } from "react";

/**
 * Carrusel de imágenes con cross-fade automático y puntos de navegación.
 * `slides` = [{ src, alt }]. Se detiene si el usuario prefiere menos movimiento.
 */
export default function Carrusel({ slides = [], intervalo = 5000, flechas = false, children }) {
  const [activo, setActivo] = useState(0);
  const timer = useRef(null);

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
          src={s.src}
          alt={s.alt || ""}
          className={`carrusel-img ${i === activo ? "on" : ""}`}
          loading={i === 0 ? "eager" : "lazy"}
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
