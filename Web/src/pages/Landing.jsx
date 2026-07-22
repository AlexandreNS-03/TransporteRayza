import Header from "../components/Header";
import Footer from "../components/Footer";
import Buscador from "../components/Buscador";
import Reveal from "../components/Reveal";

export default function Landing() {
  return (
    <>
      <Header />

      {/* ===== HERO ===== */}
      <section className="hero" id="inicio">
        <div className="wrap">
          <span className="eyebrow">🚤 Transporte fluvial · Loreto, Perú</span>
          <h1>Tu viaje por la Amazonía, <em>a un clic de distancia</em></h1>
          <p className="lead">
            Compra tus pasajes con Transportes Rayza: elige tu ruta, tu asiento y paga en
            línea de forma segura. Boleto con QR al instante.
          </p>
          <div className="trust">
            <span><svg viewBox="0 0 24 24"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"/><path d="M9 12l2 2 4-4"/></svg> Pago 100% seguro</span>
            <span><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/></svg> Tarjeta y Yape</span>
            <span><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg> Reserva en minutos</span>
          </div>
        </div>
        <div className="waves" aria-hidden="true">
          <svg viewBox="0 0 1440 130" preserveAspectRatio="none">
            <path d="M0,70 C240,120 480,20 720,54 C960,88 1200,26 1440,64 L1440,130 L0,130 Z" fill="var(--bg)" opacity="0.55"/>
            <path d="M0,88 C260,120 520,44 760,72 C1000,100 1220,48 1440,82 L1440,130 L0,130 Z" fill="var(--bg)"/>
          </svg>
        </div>
      </section>

      {/* ===== BUSCADOR FLOTANTE ===== */}
      <div className="wrap search-wrap"><Buscador /></div>

      {/* ===== PROMOS ===== */}
      <section className="section" style={{ paddingTop: 56 }}>
        <div className="wrap">
          <div className="promos">
            <Reveal className="promo p2"><span className="tagline">Fiestas Patrias</span><h3>Viaja este julio</h3><p>Asegura tu asiento a los principales puertos del río.</p></Reveal>
            <Reveal className="promo p1" delay={1}><span className="tagline">Nuevo</span><h3>Compra en línea</h3><p>Sin colas: reserva y paga desde tu celular.</p></Reveal>
            <Reveal className="promo p3" delay={2}><span className="tagline">Encomiendas</span><h3>Envía tu carga</h3><p>Puerta a puerto, con comprobante electrónico.</p></Reveal>
          </div>
        </div>
      </section>

      {/* ===== DESTINOS ===== */}
      <section className="section section-alt" id="destinos">
        <div className="wrap">
          <div className="section-head">
            <div className="kicker">Destinos</div>
            <h2>A dónde te llevamos</h2>
            <p>Conectamos Iquitos, Requena y los pueblos del río en la Amazonía peruana.</p>
          </div>
          <div className="destinos">
            {[
              ["Iquitos", "g1", "La capital de la Amazonía"],
              ["Requena", "g2", "Sobre el río Ucayali"],
              ["Nauta", "g3", "Puerto de conexión"],
              ["Comunidades", "g4", "Puertos ribereños"],
            ].map(([n, g, d], i) => (
              <Reveal key={n} delay={(i % 3) + 1}>
                <a className="destino" href="/comprar">
                  <div className={"bg dest-" + g} />
                  <div className="info">
                    <div className="n">{n}</div>
                    <div className="p">{d} · <b>Ver viajes →</b></div>
                  </div>
                </a>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SERVICIOS ===== */}
      <section className="section" id="servicios">
        <div className="wrap">
          <div className="section-head">
            <div className="kicker">Nuestros servicios</div>
            <h2>Todo para moverte por el río</h2>
            <p>Soluciones de transporte fluvial pensadas para las personas y comunidades de la Amazonía.</p>
          </div>
          <div className="cards">
            <Reveal className="card hoverable" delay={1}>
              <div className="icon"><svg className="svg-ic" viewBox="0 0 24 24"><path d="M3 14l9-3 9 3"/><path d="M5 14v4a2 2 0 002 2h10a2 2 0 002-2v-4"/><path d="M12 11V5"/><path d="M9 5h6"/></svg></div>
              <h3>Pasajeros</h3>
              <p className="muted">Viajes cómodos y seguros con embarcaciones equipadas y personal capacitado.</p>
            </Reveal>
            <Reveal className="card hoverable" delay={2}>
              <div className="icon"><svg className="svg-ic" viewBox="0 0 24 24"><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/></svg></div>
              <h3>Encomiendas</h3>
              <p className="muted">Envío de paquetes puerta a puerto con comprobante electrónico y entrega responsable.</p>
            </Reveal>
            <Reveal className="card hoverable" delay={3}>
              <div className="icon"><svg className="svg-ic" viewBox="0 0 24 24"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-6h6v6"/></svg></div>
              <h3>Hotel Rayza</h3>
              <p className="muted">Hospedaje, terraza y restaurante para que tu estadía y tu viaje sean una sola experiencia.</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===== NOSOTROS ===== */}
      <section className="section section-alt" id="nosotros">
        <div className="wrap" style={{ display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 48, alignItems: "center" }}>
          <Reveal>
            <div className="kicker">Sobre nosotros</div>
            <h2 style={{ fontSize: "clamp(26px,4vw,34px)", margin: "0 0 16px" }}>Multiservicios Rayza E.I.R.L.</h2>
            <p className="muted" style={{ marginBottom: 14 }}>
              Empresa amazónica dedicada al transporte fluvial de pasajeros y encomiendas en la región
              Loreto. Nacimos para acortar distancias entre las comunidades del río, con un servicio
              cercano, puntual y seguro.
            </p>
            <p className="muted" style={{ marginBottom: 24 }}>Conocemos el río porque es nuestra casa.</p>
            <div style={{ display: "flex", gap: 30, flexWrap: "wrap" }}>
              {[["+10", "años de experiencia"], ["Loreto", "Iquitos · Requena"], ["100%", "servicio fluvial"]].map(([b, s]) => (
                <div key={s}>
                  <div style={{ fontFamily: "var(--font-head)", fontSize: 30, fontWeight: 800, color: "var(--accent)" }}>{b}</div>
                  <div className="muted" style={{ fontSize: 13.5 }}>{s}</div>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={2} className="center">
            <img src="/logo-rayza.png" alt="Multiservicios Rayza"
                 style={{ width: 300, height: 300, borderRadius: "50%", margin: "0 auto", background: "#fff", boxShadow: "var(--sh-lg)", animation: "floaty 6s ease-in-out infinite" }} />
          </Reveal>
        </div>
      </section>

      {/* ===== CONTACTO ===== */}
      <section className="section" id="contacto">
        <div className="wrap">
          <div className="section-head">
            <div className="kicker">Contacto</div>
            <h2>Estamos para ayudarte</h2>
            <p>Escríbenos por cualquiera de estos medios. <span style={{ color: "var(--accent)" }}>[Completar datos reales]</span></p>
          </div>
          <div className="cards">
            <Reveal className="card" delay={1}>
              <div className="icon"><svg className="svg-ic" viewBox="0 0 24 24"><path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012 4.2 2 2 0 014 2h3a2 2 0 012 1.7c.1 1 .4 1.9.7 2.8a2 2 0 01-.5 2.1L8 9.9a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.3 1.8.6 2.8.7A2 2 0 0122 16.9z"/></svg></div>
              <h3 style={{ fontSize: 18 }}>Teléfono / WhatsApp</h3>
              <p className="muted">[completar número real]</p>
            </Reveal>
            <Reveal className="card" delay={2}>
              <div className="icon"><svg className="svg-ic" viewBox="0 0 24 24"><path d="M12 21s-6-5.7-6-10a6 6 0 1112 0c0 4.3-6 10-6 10z"/><circle cx="12" cy="11" r="2.2"/></svg></div>
              <h3 style={{ fontSize: 18 }}>Dirección</h3>
              <p className="muted">[completar — Iquitos / Requena, Loreto]</p>
            </Reveal>
            <Reveal className="card" delay={3}>
              <div className="icon"><svg className="svg-ic" viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/></svg></div>
              <h3 style={{ fontSize: 18 }}>Redes</h3>
              <p className="muted">
                <a href="https://www.facebook.com/multitrayza/" target="_blank" rel="noopener">Facebook</a> ·{" "}
                <a href="https://www.instagram.com/transportes_rayza/" target="_blank" rel="noopener">Instagram</a>
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
