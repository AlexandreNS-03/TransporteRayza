import { Link, Navigate, useParams } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Reveal from "../components/Reveal";
import { buscarDestino } from "../destinos";

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
          <div className="kicker">Destino Rayza</div>
          <h1>{destino.nombre}</h1>
          <p>{destino.etiqueta}</p>
        </div>
      </section>

      <section className="section">
        <div className="wrap detalle-intro">
          <Reveal>
            <div className="kicker">Descubre {destino.nombre}</div>
            <h2>{destino.intro}</h2>
            <p className="detalle-texto">{destino.descripcion}</p>
            <div className="detalle-ruta"><span>🛥️</span>{destino.ruta}</div>
          </Reveal>
          <Reveal delay={1} className="detalle-foto">
            <img src={`/destinos/${destino.imagen}`} alt={`Paisaje de ${destino.nombre}`} />
          </Reveal>
        </div>
      </section>

      <section className="section section-alt">
        <div className="wrap detalle-destacados">
          <div className="section-head">
            <div className="kicker">Para disfrutar</div>
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
                <div className="kicker" style={{ color: "rgba(255,255,255,.85)" }}>Calendario festivo</div>
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
                style={{ backgroundImage: `url(/destinos/${destino.imagen})` }}
                role="img"
                aria-label={`Fiestas en ${destino.nombre}`}
              />
            </div>
          </div>
        </section>
      )}

      <section className="section">
        <div className="wrap detalle-reserva">
          <div>
            <div className="kicker">Planifica tu viaje</div>
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
