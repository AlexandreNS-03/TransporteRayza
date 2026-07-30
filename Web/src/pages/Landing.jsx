import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Buscador from "../components/Buscador";
import Reveal from "../components/Reveal";
import AnuncioAniversario from "../components/AnuncioAniversario";
import { EMPRESA, telefonoBonito, telefonoInternacional,
         aniosDeAniversario, esMesDeAniversario } from "../datos";
import { DESTINOS } from "../destinos";

export default function Landing() {
  const anios = aniosDeAniversario();
  const [abierto, setAbierto] = useState(null);
  return (
    <>
      <Header />

      {/* ===== HERO (minimalista) ===== */}
      <section className="hero-lite" id="inicio">
        <div className="wrap hero-lite-grid">
          <div className="hero-lite-texto">
            <span className="eyebrow-lite">Transporte fluvial · Requena, Loreto</span>
            <h1>Tu viaje por la Amazonía, <span className="acento">a un clic de distancia</span></h1>
            <p className="lead">
              Elige tu ruta y tu asiento, y paga en línea de forma segura.
              Recibe tu boleto con QR al instante.
            </p>
            <div className="hero-lite-cta">
              <Link className="btn btn-primary btn-lg" to="/comprar">Comprar pasaje</Link>
              <a className="btn btn-ghost btn-lg" href="#destinos">Ver destinos</a>
            </div>
            <ul className="hero-lite-trust">
              <li><svg viewBox="0 0 24 24"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"/><path d="M9 12l2 2 4-4"/></svg> Pago 100% seguro</li>
              <li><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/></svg> Tarjeta y Yape</li>
              <li><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg> Reserva en minutos</li>
            </ul>
          </div>
          <div className="hero-lite-foto">
            <img src="/destinos/iquits.jpg" alt="Amazonía peruana · Loreto" />
          </div>
        </div>
      </section>

      {/* ===== BUSCADOR ===== */}
      <div className="wrap search-wrap"><Buscador /></div>

      {/* ===== PROMOS ===== */}
      <section className="section" style={{ paddingTop: 56 }}>
        <div className="wrap">
          <div className="promos">
            <Reveal className="promo p2">
              <span className="tagline">{esMesDeAniversario() ? `${anios + 1}° aniversario` : "Fiestas Patrias"}</span>
              <h3>{esMesDeAniversario() ? `Este 28 de julio cumplimos ${anios + 1} años` : "Viaja este julio"}</h3>
              <p>Gracias por navegar el río con nosotros. Asegura tu asiento a los principales puertos.</p>
            </Reveal>
            <Reveal className="promo p1" delay={1}><span className="tagline">Nuevo</span><h3>Compra en línea</h3><p>Sin colas: reserva y paga desde tu celular.</p></Reveal>
            <Reveal className="promo p3" delay={2}><span className="tagline">Encomiendas</span><h3>Envía tu carga</h3><p>Puerta a puerto, con comprobante electrónico.</p></Reveal>
          </div>
        </div>
      </section>

      <AnuncioAniversario />

      {/* ===== DESTINOS ===== */}
      <section className="section section-alt" id="destinos">
        <div className="wrap">
          <div className="section-head">
            <div className="kicker">Destinos</div>
            <h2>A dónde te llevamos</h2>
            <p>Conectamos Iquitos, Requena y los pueblos del río en la Amazonía peruana.</p>
          </div>
          <div className="destinos">
            {DESTINOS.map((d, i) => (
              <Reveal key={d.nombre} delay={(i % 3) + 1}>
                <article className={`destino ${abierto === d.nombre ? "abierto" : ""}`}>
                  {/* La ilustración SVG del fondo (.dest-*) siempre está; si hay foto
                      real se carga encima y si el archivo falta, se oculta sola */}
                  <div className={"bg dest-g" + ((i % 4) + 1)}>
                    <img className="destino-foto" src={`/destinos/${d.imagen}`} alt="" loading="lazy"
                         onError={(e) => { e.currentTarget.style.display = "none"; }} />
                  </div>
                  <div className="info">
                    <div className="n">{d.nombre}</div>
                    <div className="p">{d.etiqueta}</div>

                    <div className="destino-mas">
                      <p>{d.intro}</p>
                      <Link className="destino-cta" to={`/destinos/${d.slug}`}>Conocer destino →</Link>
                    </div>

                    <button type="button" className="destino-toggle"
                            aria-expanded={abierto === d.nombre}
                            onClick={() => setAbierto(abierto === d.nombre ? null : d.nombre)}>
                      {abierto === d.nombre ? "Ver menos" : "Ver más"}
                    </button>
                  </div>
                </article>
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
              cercano, puntual y seguro. Nuestra central está en <strong>Requena</strong>, con oficina
              de ventas en <strong>Iquitos</strong>.
            </p>
            <p className="muted" style={{ marginBottom: 24 }}>Conocemos el río porque es nuestra casa.</p>
            <div style={{ display: "flex", gap: 30, flexWrap: "wrap" }}>
              {[[`${anios}`, anios === 1 ? "año navegando el río" : "años navegando el río"],
                ["Loreto", "Requena · Iquitos"],
                ["100%", "servicio fluvial"]].map(([b, s]) => (
                <div key={s}>
                  <div style={{ fontFamily: "var(--font-head)", fontSize: 30, fontWeight: 800, color: "var(--accent)" }}>{b}</div>
                  <div className="muted" style={{ fontSize: 13.5 }}>{s}</div>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={2} className="center">
            <img src="/logo-rayza-marca.png" alt="Multiservicios Rayza"
                 className="logo-nosotros" />
          </Reveal>
        </div>
      </section>

      {/* ===== CONTACTO ===== */}
      <section className="section" id="contacto">
        <div className="wrap">
          <div className="section-head">
            <div className="kicker">Contacto</div>
            <h2>Estamos para ayudarte</h2>
            <p>Escríbenos por cualquiera de estos medios o acércate a nuestras oficinas.</p>
          </div>
          <div className="cards">
            <Reveal className="card" delay={1}>
              <div className="icon"><svg className="svg-ic" viewBox="0 0 24 24"><path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012 4.2 2 2 0 014 2h3a2 2 0 012 1.7c.1 1 .4 1.9.7 2.8a2 2 0 01-.5 2.1L8 9.9a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.3 1.8.6 2.8.7A2 2 0 0122 16.9z"/></svg></div>
              <h3 style={{ fontSize: 18 }}>Teléfono y WhatsApp</h3>
              <p className="muted contacto-dato">
                <a href={`tel:+${telefonoInternacional}`}>{telefonoBonito}</a>
              </p>
              <p className="muted" style={{ fontSize: 13 }}>
                <a href={`https://wa.me/${telefonoInternacional}`} target="_blank" rel="noopener">
                  Escribir por WhatsApp →
                </a>
              </p>
            </Reveal>

            <Reveal className="card" delay={2}>
              <div className="icon"><svg className="svg-ic" viewBox="0 0 24 24"><path d="M12 21s-6-5.7-6-10a6 6 0 1112 0c0 4.3-6 10-6 10z"/><circle cx="12" cy="11" r="2.2"/></svg></div>
              <h3 style={{ fontSize: 18 }}>Dónde estamos</h3>
              {EMPRESA.oficinas.map((o) => (
                <div key={o.ciudad} className="oficina">
                  <div className="oficina-ciudad">
                    {o.ciudad}
                    {o.central && <span className="badge-central">Central</span>}
                  </div>
                  {o.puntos.map((pt) => (
                    <p key={pt.tipo} className="muted oficina-punto">
                      <span className="oficina-tipo">{pt.tipo}</span> {pt.direccion}
                    </p>
                  ))}
                </div>
              ))}
            </Reveal>

            <Reveal className="card" delay={3}>
              <div className="icon"><svg className="svg-ic" viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/></svg></div>
              <h3 style={{ fontSize: 18 }}>Correo y redes</h3>
              <p className="muted contacto-dato">
                <a href={`mailto:${EMPRESA.correo}`}>{EMPRESA.correo}</a>
              </p>
              <p className="muted" style={{ fontSize: 13.5 }}>
                <a href={EMPRESA.redes.facebook} target="_blank" rel="noopener">Facebook</a>
                {" · "}
                <a href={EMPRESA.redes.instagram} target="_blank" rel="noopener">
                  @{EMPRESA.redes.instagramUsuario}
                </a>
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
