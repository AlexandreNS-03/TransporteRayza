import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { sorteoVigente } from "../services/publicApi";

/**
 * El sorteo, anunciado en la portada.
 *
 * Solo aparece si hay un sorteo: cuando no lo hay, no queda un recuadro vacío
 * invitando a nada. Y no repite la ruleta grande de la página del sorteo —
 * acá es un adelanto que lleva allá.
 *
 * Sobre el movimiento: la rueda NO gira en bucle. Esta portada se lee mientras
 * la gente busca su pasaje, y algo girando al costado del buscador compite con
 * lo que vino a hacer. Gira una vuelta al aparecer y otra si le pasas el mouse.
 * La excepción es el día del sorteo, con el registro ya cerrado: ahí el giro
 * continuo sí dice algo —"esto está pasando ahora"— y por eso se permite.
 */
/* Si la visita anterior tenía sorteo, casi seguro esta también: se reserva el
   hueco desde el primer pintado y el recuadro entra sin mover nada. Cuando el
   navegador no deja guardar nada (modo privado), simplemente no se reserva. */
const CLAVE = "rayza_sorteo_activo";
const habiaSorteo = () => { try { return localStorage.getItem(CLAVE) === "1"; } catch { return false; } };
const recordar = (hay) => { try { localStorage.setItem(CLAVE, hay ? "1" : "0"); } catch { /* sin guardar */ } };

export default function SorteoDestacado() {
  const [sorteo, setSorteo] = useState(null);
  const [esperando, setEsperando] = useState(habiaSorteo);
  const [girar, setGirar] = useState(false);
  const [vueltas, setVueltas] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    sorteoVigente()
      .then((s) => { setSorteo(s); recordar(s?.hay); })
      .catch(() => {})
      .finally(() => setEsperando(false));
  }, []);

  // Gira al entrar en pantalla, una sola vez.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { girarUnaVez(); obs.disconnect(); }
    }, { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [sorteo]);

  const girarUnaVez = () => {
    setVueltas((v) => v + 2);
    setGirar(true);
    setTimeout(() => setGirar(false), 1600);
  };

  if (!sorteo?.hay) return esperando ? <div className="sorteo-mini-hueco" aria-hidden="true" /> : null;

  const enVivo = sorteo.estado === "CERRADO";
  const hecho  = sorteo.estado === "SORTEADO";

  return (
    <Link
      ref={ref}
      to="/sorteo"
      className={`sorteo-mini${enVivo ? " en-vivo" : ""}`}
      onMouseEnter={() => !girar && girarUnaVez()}
    >
      <div className="sorteo-mini-rueda-caja" aria-hidden="true">
        <div
          className={`sorteo-mini-rueda${enVivo ? " girando" : ""}`}
          style={enVivo ? undefined : {
            transform: `rotate(${vueltas * 360}deg)`,
            transitionDuration: girar ? "1600ms" : "0ms",
          }}
        />
        <span className="sorteo-mini-centro" />
      </div>

      <div className="sorteo-mini-texto">
        <span className="sorteo-mini-eti">
          {enVivo ? <><i className="sorteo-mini-punto" /> Sorteo en vivo</>
           : hecho ? "Sorteo realizado"
           : "Sorteo"}
        </span>
        <strong>
          {hecho && sorteo.ganadorNombre ? `Ganó ${sorteo.ganadorNombre}` : sorteo.premio}
        </strong>
        <span className="sorteo-mini-pie">
          {enVivo ? "Míralo ahora — el ganador aparece en la página"
           : hecho ? "Mira la repetición y los sorteos anteriores"
           : sorteo.fechaSorteo ? `Se sortea el ${diaBonito(sorteo.fechaSorteo)} · registra el código de tu ticket`
           : "Registra el código de tu ticket de embarque"}
        </span>
      </div>

      <span className="sorteo-mini-flecha" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </Link>
  );
}

const diaBonito = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es-PE", { day: "numeric", month: "long" });
};
