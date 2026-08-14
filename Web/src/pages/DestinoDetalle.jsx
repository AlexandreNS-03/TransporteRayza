import { Link, Navigate, useParams } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Reveal from "../components/Reveal";
import { buscarDestino } from "../destinos";
import { embedMapa, enlaceMapa } from "../datos";
import { IconBoat } from "../components/Icons";

export default function DestinoDetalle() {
  const { slug } = useParams();
  const destino = buscarDestino(slug);

  if (!destino) return <Navigate to="/destinos" replace />;

  return (
    <>
      <Header />
      <section className="detalle-hero">
        <img src={`/destinos/${destino.imagen}`} alt={`Vista de ${destino.nombre}`} />
        <div className="detalle-hero-sombra" />
        <div className="wrap detalle-hero-contenido">
          <Link className="detalle-volver" to="/destinos">← Todos los destinos</Link>
          <h1>{destino.nombre}</h1>
          <p>{destino.etiqueta}</p>
        </div>
      </section>

      <section className="section">
        <div className="wrap detalle-intro">
          <Reveal>
            <h2>{destino.intro}</h2>
            <p className="detalle-texto">{destino.descripcion}</p>
            <div className="detalle-ruta"><span><IconBoat width={18} height={18} /></span>{destino.ruta}</div>
          </Reveal>
          <Reveal delay={1} className="detalle-foto">
            <img src={`/destinos/${destino.imagen2}`} alt={`Paisaje de ${destino.nombre}`} />
          </Reveal>
        </div>
      </section>

      <section className="section section-alt">
        <div className="wrap detalle-destacados">
          <div className="section-head">
            <h2>Atractivos del destino</h2>
          </div>
          <div className="detalle-destacados-grid">
            {destino.destacados.map((destacado, indice) => (
              <Reveal key={destacado} delay={indice + 1} className="detalle-destacado">
                <span>0{indice + 1}</span>
                <h3>{destacado}</h3>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {destino.festividades?.length > 0 && (
        <section className="section">
          <div className="wrap">
            <div className="calendario">
              <div className="calendario-panel">
                <h2>Vive {destino.nombre} en sus fechas</h2>
                <p className="calendario-sub">Planifica tu viaje para coincidir con las celebraciones más importantes.</p>
                <ul className="calendario-lista">
                  {destino.festividades.map((f) => (
                    <li key={f.nombre}>
                      <span className="cal-chip">
                        <small>{f.mes}</small>
                        {f.dia ? <b>{f.dia}</b> : <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>}
                      </span>
                      <div>
                        <h3>{f.nombre}</h3>
                        <p>{f.fecha}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div
                className="calendario-foto"
                style={{ backgroundImage: `url(/destinos/${destino.imagen3})` }}
                role="img"
                aria-label={`Fiestas en ${destino.nombre}`}
              />
            </div>
          </div>
        </section>
      )}

      {/* ===== Para tu viaje: info práctica + gastronomía ===== */}
      {(destino.tiempo || destino.mejorEpoca || destino.queLlevar?.length || destino.gastronomia?.length) && (
        <section className="section section-alt">
          <div className="wrap">
            <div className="section-head">
              <h2>Antes de ir a {destino.nombre}</h2>
            </div>
            <div className="detalle-info-grid">
              {destino.tiempo && (
                <div className="info-card">
                  <span className="info-ic"><svg viewBox="0 0 24 24"><path d="M3 14l9-3 9 3"/><path d="M5 14v4a2 2 0 002 2h10a2 2 0 002-2v-4"/><path d="M12 11V5M9 5h6"/></svg></span>
                  <h3>Cómo llegar</h3>
                  <p className="muted">{destino.tiempo}</p>
                </div>
              )}
              {destino.mejorEpoca && (
                <div className="info-card">
                  <span className="info-ic"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/></svg></span>
                  <h3>Mejor época</h3>
                  <p className="muted">{destino.mejorEpoca}</p>
                </div>
              )}
              {destino.queLlevar?.length > 0 && (
                <div className="info-card">
                  <span className="info-ic"><svg viewBox="0 0 24 24"><path d="M6 8h12l-1 12H7L6 8z"/><path d="M9 8V6a3 3 0 016 0v2"/></svg></span>
                  <h3>Qué llevar</h3>
                  <ul className="info-lista">
                    {destino.queLlevar.map((x) => <li key={x}>{x}</li>)}
                  </ul>
                </div>
              )}
            </div>
            {destino.gastronomia?.length > 0 && (
              <div className="detalle-sabores">
                <h3>Sabores de {destino.nombre}</h3>
                <div className="chips-food">
                  {destino.gastronomia.map((g) => <span className="chip-food" key={g}>{g}</span>)}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ===== Ubicación ===== */}
      {destino.coord && (
        <section className="section">
          <div className="wrap">
            <div className="detalle-mapa">
              <div className="detalle-mapa-info">
                <h2>{destino.nombre} en el mapa</h2>
                <p className="muted">{destino.ruta}</p>
                <a className="btn btn-ghost" href={enlaceMapa(destino.coord)} target="_blank" rel="noreferrer">Ver en Google Maps</a>
              </div>
              <iframe
                className="detalle-mapa-frame"
                title={`Mapa de ${destino.nombre}`}
                src={embedMapa(destino.coord, 0.02)}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </section>
      )}

      <section className="section">
        <div className="wrap detalle-reserva">
          <div>
            <h2>¿Listo para navegar a {destino.nombre}?</h2>
            <p className="muted">{destino.viaje}</p>
          </div>
          <Link className="btn btn-primary btn-lg" to="/comprar">Comprar pasaje</Link>
        </div>
      </section>
      <Footer />
    </>
  );
}
