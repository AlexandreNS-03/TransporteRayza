import { useEffect, useRef, useState } from "react";

/**
 * Carrusel de imágenes con cross-fade automático y puntos de navegación.
 * `slides` = [{ src, alt }]. Se detiene si el usuario prefiere menos movimiento.
 */
export default function Carrusel({ slides = [], intervalo = 5000 }) {
  const [activo, setActivo] = useState(0);
  const timer = useRef(null);

  useEffect(() => {
    if (slides.length <= 1) return;
    const menosMovimiento = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (menosMovimiento) return;
    timer.current = setInterval(() => setActivo((i) => (i + 1) % slides.length), intervalo);
    return () => clearInterval(timer.current);
  }, [slides.length, intervalo]);

  const irA = (i) => {
    setActivo(i);
    clearInterval(timer.current);
    if (slides.length > 1) {
      timer.current = setInterval(() => setActivo((n) => (n + 1) % slides.length), intervalo);
    }
  };

  if (slides.length === 0) return null;

  return (
    <div className="carrusel">
      {slides.map((s, i) => (
        <img
          key={s.src}
          src={s.src}
          alt={s.alt || ""}
          className={`carrusel-img ${i === activo ? "on" : ""}`}
          loading={i === 0 ? "eager" : "lazy"}
          aria-hidden={i !== activo}
        />
      ))}
      {slides.length > 1 && (
        <div className="carrusel-puntos">
          {slides.map((s, i) => (
            <button
              key={s.src}
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
