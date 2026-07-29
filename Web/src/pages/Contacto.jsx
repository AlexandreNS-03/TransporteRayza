import Header from "../components/Header";
import Footer from "../components/Footer";
import Reveal from "../components/Reveal";
import { EMPRESA, AGENCIAS, embedMapa, enlaceMapa,
         telefonoBonito, telefonoInternacional } from "../datos";

/**
 * Página de contacto: datos de la empresa y las agencias con su mapa. Cada agencia
 * muestra un mapa embebido (OpenStreetMap) centrado en su ubicación real, más un
 * enlace "Cómo llegar" que abre Google Maps con el punto marcado.
 */
export default function Contacto() {
  const waMsg = encodeURIComponent("Hola, quisiera información sobre los viajes de Transportes Rayza.");
  const whatsapp = `https://wa.me/${telefonoInternacional}?text=${waMsg}`;

  return (
    <>
      <Header />

      <section className="hero" style={{ minHeight: "auto" }}>
        <div className="wrap" style={{ padding: "56px 24px 88px" }}>
          <Reveal><div className="eyebrow">Contacto</div></Reveal>
          <Reveal><h1 style={{ maxWidth: "18ch" }}>Estamos para <em>ayudarte</em></h1></Reveal>
          <Reveal delay={1}><p className="lead">Escríbenos, llámanos o visítanos en cualquiera de nuestras agencias.</p></Reveal>
        </div>
        <div className="waves"><svg viewBox="0 0 1440 120" preserveAspectRatio="none"><path fill="var(--bg)" d="M0 60 Q 180 20 360 60 T 720 60 T 1080 60 T 1440 60 V120 H0Z"/></svg></div>
      </section>

      {/* Datos rápidos, estilo tarjetas */}
      <section className="section">
        <div className="wrap">
          <div className="contacto-datos">
            <div className="contacto-dato">
              <div className="icon">📞</div>
              <h3>Teléfono</h3>
              <a href={`tel:+${telefonoInternacional}`}>{telefonoBonito}</a>
              <a className="btn btn-wa" href={whatsapp} target="_blank" rel="noreferrer">Escríbenos al WhatsApp</a>
            </div>
            <div className="contacto-dato">
              <div className="icon">✉️</div>
              <h3>Correo</h3>
              <a href={`mailto:${EMPRESA.correo}`}>{EMPRESA.correo}</a>
            </div>
            <div className="contacto-dato">
              <div className="icon">🕒</div>
              <h3>Horario</h3>
              <p className="muted">Lunes a sábado: 7:00 am – 7:00 pm</p>
              <p className="muted">Domingo: 7:00 am – 1:00 pm</p>
            </div>
            <div className="contacto-dato">
              <div className="icon">📱</div>
              <h3>Redes</h3>
              <a href={EMPRESA.redes.facebook} target="_blank" rel="noreferrer">Facebook</a>
              <a href={EMPRESA.redes.instagram} target="_blank" rel="noreferrer">Instagram</a>
            </div>
          </div>
        </div>
      </section>

      {/* Agencias con mapa */}
      <section className="section section-alt">
        <div className="wrap">
          <div className="section-head center">
            <div className="kicker">Nuestras agencias</div>
            <h2>Dónde encontrarnos</h2>
            <p className="muted">Central en Requena y agencia en Iquitos.</p>
          </div>

          <div className="agencias-grid">
            {AGENCIAS.map((a) => (
              <div className="agencia-card" key={a.ciudad + a.tipo}>
                <div className="agencia-info">
                  <h3>
                    {a.ciudad} · {a.tipo}
                    {a.central && <span className="badge-central">Central</span>}
                  </h3>
                  <p className="muted">📍 {a.direccion}</p>
                  <a className="btn btn-ghost btn-sm" href={enlaceMapa(a.coord)} target="_blank" rel="noreferrer">
                    Cómo llegar
                  </a>
                </div>
                <iframe
                  className="agencia-mapa"
                  title={`Mapa ${a.ciudad} ${a.tipo}`}
                  src={embedMapa(a.coord)}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
