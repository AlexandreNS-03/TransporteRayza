import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Buscador from "../components/Buscador";
import TourCompra, { tourPendiente } from "../components/TourCompra";
import Carrusel from "../components/Carrusel";
import Galeria from "../components/Galeria";
import Reveal from "../components/Reveal";
import HeroConProfundidad from "../components/HeroConProfundidad";
import ProximaFiesta from "../components/ProximaFiesta";
import { getAnuncios } from "../services/publicApi";
import { EMPRESA, telefonoBonito, telefonoInternacional,
         aniosDeAniversario } from "../datos";
import { DESTINOS } from "../destinos";

// Tarjetas de respaldo si todavía no se cargó ningún anuncio de tipo LANDING
// desde el sistema: la sección nunca queda vacía.
//
// Las de temporada llevan `desde` y `hasta` (mes-día) y se muestran solo dentro de
// su ventana. El aniversario de Requena se quedó anunciado semanas después de
// terminar justamente porque acá no había forma de decir cuándo vencía: quedaba
// escrito "Del 18 al 23 de agosto" en septiembre.
const PROMOS_TEMPORADA = [
  { titulo: "Aniversario de Requena", mensaje: "Acompáñanos a celebrar el aniversario de Requena. Asegura tu asiento a los principales puertos.", tag: "Del 18 al 23 de agosto", desde: "08-11", hasta: "08-23" },
  { titulo: "Aniversario de Nauta",   mensaje: "Viaja para las fiestas de Nauta. Reserva con anticipación: los asientos se agotan.",              tag: "30 de abril",           desde: "04-23", hasta: "04-30" },
  { titulo: "Fiestas Patrias",        mensaje: "Julio es temporada alta en el río. Asegura tu pasaje antes de que se llene.",                      tag: "28 y 29 de julio",      desde: "07-18", hasta: "07-29" },
];

// Siempre ciertas: no vencen ni hay que acordarse de bajarlas.
const PROMOS_SIEMPRE = [
  { titulo: "Compra en línea",     mensaje: "Sin colas: reserva y paga desde tu celular.",                          tag: "En línea" },
  { titulo: "Encomiendas",         mensaje: "Puerta a puerto, con comprobante electrónico.",                        tag: "Encomiendas" },
  { titulo: "Elige tu asiento",    mensaje: "Mira el bote y escoge dónde te sientas antes de pagar.",               tag: "Asientos" },
  { titulo: "Boleto con QR",       mensaje: "Te llega al correo al instante. Solo muéstralo al embarcar.",          tag: "Sin papel" },
  { titulo: "Paga como quieras",   mensaje: "Tarjeta o Yape desde la web, o en efectivo en nuestras oficinas.",     tag: "Pagos" },
  { titulo: "Bebés no pagan",      mensaje: "Los bebés en brazos viajan gratis. Indícalo al comprar.",              tag: "Familia" },
];

const dosDigitos = (n) => String(n).padStart(2, "0");

/**
 * Las tres tarjetas de hoy: primero lo de temporada que esté vigente y se
 * completa con las de siempre, rotando según el día para que la portada no se
 * vea igual cada vez que alguien vuelve.
 */
function promosDeHoy(hoy = new Date()) {
  const md = `${dosDigitos(hoy.getMonth() + 1)}-${dosDigitos(hoy.getDate())}`;
  const vigentes = PROMOS_TEMPORADA.filter((p) => md >= p.desde && md <= p.hasta);

  // El día del año como punto de partida: cambia solo, sin guardar nada.
  const inicio = Math.floor((hoy - new Date(hoy.getFullYear(), 0, 0)) / 86400000);
  const rotadas = PROMOS_SIEMPRE.map((_, i) => PROMOS_SIEMPRE[(inicio + i) % PROMOS_SIEMPRE.length]);

  return [...vigentes, ...rotadas].slice(0, 3);
}

const PROMOS_RESPALDO = promosDeHoy();

export default function Landing() {
  const anios = aniosDeAniversario();
  const [abierto, setAbierto] = useState(null);
  const [promos, setPromos] = useState(PROMOS_RESPALDO);
  const [tourAbierto, setTourAbierto] = useState(false);

  // Se abre solo en la primera visita, con un respiro para que la página se
  // asiente. Quien ya lo vio (o lo cerró) no lo vuelve a encontrar encima:
  // queda el botón bajo el buscador para pedirlo cuando quiera.
  useEffect(() => {
    if (!tourPendiente()) return;
    const t = setTimeout(() => setTourAbierto(true), 1200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    getAnuncios("LANDING").then((lista) => {
      if (lista.length > 0) {
        setPromos(lista.slice(0, 3).map((a) => ({
          titulo: a.titulo, mensaje: a.mensaje, tag: a.textoEnlace || "Anuncio",
          urlEnlace: a.urlEnlace,
        })));
      }
    });
  }, []);
  return (
    <>
      <Header />

      {/* ===== HERO (carrusel a todo el ancho + buscador flotante) ===== */}
      {/* Único momento de movimiento con autoría de la portada */}
      <HeroConProfundidad />

      <TourCompra abierto={tourAbierto} onCerrar={() => setTourAbierto(false)} />

      <section className="hero-mb" id="inicio">
        <Carrusel
          flechas
          slides={DESTINOS.flatMap((d) =>
            [...new Set([d.imagen, d.imagen2, d.imagen3].filter(Boolean))].map((img) => ({
              src: `/destinos/${img}`, alt: `${d.nombre} · ${d.etiqueta}`,
            }))
          )}
        >
          <div className="hero-mb-overlay">
            <div className="wrap">
              {/* Sin rótulo encima: el titular se sostiene solo, y ese "Transporte
                  fluvial · Loreto" ya lo dicen la foto y el buscador de abajo. */}
              <h1>Así se siente viajar en <span className="acento">Rayza</span></h1>
              <p>Elige tu ruta y tu asiento, paga en línea y recibe tu boleto con QR al instante.</p>
            </div>
          </div>
        </Carrusel>
        <div className="wrap hero-mb-buscador">
          <Buscador />
          <div className="tour-invitacion-fila">
            <button type="button" className="tour-invitacion" onClick={() => setTourAbierto(true)}>
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                <path d="M9.6 9.3a2.4 2.4 0 1 1 3.2 2.3c-.5.2-.8.7-.8 1.2v.4" stroke="currentColor"
                      strokeWidth="1.8" strokeLinecap="round" />
                <circle cx="12" cy="16.6" r="1" fill="currentColor" />
              </svg>
              ¿Primera vez? Te guío para comprar
            </button>
          </div>
        </div>
      </section>

      {/* ===== PROMOS ===== */}
      <section className="section" style={{ paddingTop: 56 }}>
        <div className="wrap">
          <div className="promos">
            {promos.map((p, i) => {
              const contenido = (
                <>
                  <span className="tagline">{p.tag}</span>
                  <h3>{p.titulo}</h3>
                  <p>{p.mensaje}</p>
                </>
              );
              return p.urlEnlace ? (
                <Reveal as={Link} to={p.urlEnlace} className={`promo p${(i % 3) + 1}`} delay={i} key={p.titulo}>
                  {contenido}
                </Reveal>
              ) : (
                <Reveal className={`promo p${(i % 3) + 1}`} delay={i} key={p.titulo}>
                  {contenido}
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <ProximaFiesta />

      {/* ===== CÓMO COMPRAR ===== */}
      <section className="section" id="como-comprar">
        <div className="wrap">
          <div className="section-head">
            <h2>Comprar es así de simple</h2>
            <p>Todo desde el celular, sin ir a la oficina.</p>
          </div>

          <ol className="pasos-compra">
            {[
              { t: "Busca tu viaje", d: "Elige de dónde sales, a dónde vas y el día. Verás los horarios con su precio." },
              { t: "Escoge tu asiento", d: "Ves el mapa del bote y eliges dónde sentarte, normal o VIP." },
              { t: "Paga en línea", d: "Con tarjeta o Yape. El cobro es seguro y te llega la confirmación al instante." },
              { t: "Sube con tu QR", d: "Tu boleto llega al correo. Lo muestras en el puerto desde el celular." },
            ].map((p, i) => (
              <li className="paso-compra" key={p.t}>
                <span className="paso-numero" aria-hidden="true">{i + 1}</span>
                <div>
                  <h3>{p.t}</h3>
                  <p>{p.d}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="pasos-compra-cta">
            <Link className="btn btn-primary" to="/comprar">Comprar mi pasaje</Link>
            <button type="button" className="tour-invitacion" onClick={() => setTourAbierto(true)}>
              Mejor guíame paso a paso
            </button>
          </div>
        </div>
      </section>

      {/* ===== DESTINOS ===== */}
      <section className="section section-alt" id="destinos">
        <div className="wrap">
          <div className="section-head">
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
      {/* Tres tarjetas idénticas decían que los tres servicios pesan lo mismo, y no
          es cierto: el pasaje es el negocio. Ahora la composición lo refleja. */}
      <section className="section" id="servicios">
        <div className="wrap">
          <div className="section-head">
            <h2>Todo para moverte por el río</h2>
            <p>Tres formas de viajar con nosotros, y una sola manera de hacerlo: a tiempo y sin sustos.</p>
          </div>

          <div className="servicios-comp">
            <Reveal className="servicio-principal">
              <h3>Pasajes de pasajeros</h3>
              <p>
                Viajes cómodos y seguros con embarcaciones equipadas y personal capacitado.
                Eliges tu asiento, pagas en línea y subes con tu boleto en el celular.
              </p>
              <Link className="btn btn-primary" to="/comprar">Comprar pasaje</Link>
            </Reveal>

            <div className="servicios-secundarios">
              <Reveal className="servicio-item" delay={1}>
                <h3>Encomiendas</h3>
                <p>Envío de paquetes puerta a puerto, con comprobante electrónico y clave de recojo.</p>
                <Link className="servicio-enlace" to="/rastreo">Rastrear un envío</Link>
              </Reveal>

              <Reveal className="servicio-item" delay={2}>
                <h3>Hotel Rayza</h3>
                <p>Hospedaje, terraza y restaurante en Requena, para que la espera no sea espera.</p>
                <Link className="servicio-enlace" to="/servicios">Ver el hotel</Link>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ===== GALERÍA ===== */}
      <section className="section section-alt" id="galeria">
        <div className="wrap">
          <div className="section-head">
            <h2>Nuestro servicio en imágenes</h2>
            <p>Conoce nuestras embarcaciones y el día a día navegando el río.</p>
          </div>
          <Galeria />
        </div>
      </section>

      {/* ===== NOSOTROS ===== */}
      <section className="section section-alt" id="nosotros">
        <div className="wrap nosotros-grid">
          <Reveal>
            <h2 className="nosotros-titulo">Multiservicios Rayza E.I.R.L.</h2>
            <p className="muted nosotros-parrafo">
              Empresa amazónica dedicada al transporte fluvial de pasajeros y encomiendas en la región
              Loreto. Nacimos para acortar distancias entre las comunidades del río, con un servicio
              cercano, puntual y seguro. Nuestra central está en <strong>Requena</strong>, con oficina
              de ventas en <strong>Iquitos</strong>.
            </p>
            <p className="nosotros-cierre">Conocemos el río porque es nuestra casa.</p>
            {/* Cifras que dicen algo. El "100% servicio fluvial" que había antes
                no informaba nada: era relleno con forma de dato. */}
            <dl className="nosotros-cifras">
              {[[`${anios}`, anios === 1 ? "año navegando el río" : "años navegando el río"],
                [`${DESTINOS.length}`, DESTINOS.length === 1 ? "destino en la ruta" : "destinos en la ruta"],
                [`${EMPRESA.oficinas.length}`, "oficinas: Requena e Iquitos"]].map(([b, t]) => (
                <div key={t}>
                  <dt>{b}</dt>
                  <dd>{t}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
          <Reveal delay={2} className="center">
            <img src="/logo-rayza-marca.png" alt="Multiservicios Rayza"
                 className="logo-nosotros" />
          </Reveal>
        </div>
      </section>

      {/* ===== CONTACTO ===== */}
      {/* Otra vez tres tarjetas iguales, y encima con el dato que la gente de
          verdad usa (el WhatsApp) del mismo tamaño que el resto. Acá manda lo
          accionable y lo demás acompaña. */}
      <section className="section" id="contacto">
        <div className="wrap">
          <div className="section-head">
            <h2>Estamos para ayudarte</h2>
          </div>

          <div className="contacto-comp">
            <Reveal className="contacto-directo">
              <p className="contacto-etiqueta">Teléfono y WhatsApp</p>
              <a className="contacto-numero" href={`tel:+${telefonoInternacional}`}>{telefonoBonito}</a>
              <div className="contacto-botones">
                <a className="btn btn-primary" href={`https://wa.me/${telefonoInternacional}`}
                   target="_blank" rel="noopener">Escribir por WhatsApp</a>
                <a className="btn btn-ghost" href={`mailto:${EMPRESA.correo}`}>Enviar un correo</a>
              </div>
              <p className="contacto-correo">
                <a href={`mailto:${EMPRESA.correo}`}>{EMPRESA.correo}</a>
                {" · "}
                <a href={EMPRESA.redes.facebook} target="_blank" rel="noopener">Facebook</a>
                {" · "}
                <a href={EMPRESA.redes.instagram} target="_blank" rel="noopener">
                  @{EMPRESA.redes.instagramUsuario}
                </a>
              </p>
            </Reveal>

            <Reveal className="contacto-oficinas" delay={2}>
              <p className="contacto-etiqueta">Dónde estamos</p>
              {EMPRESA.oficinas.map((o) => (
                <div key={o.ciudad} className="oficina">
                  <div className="oficina-ciudad">
                    {o.ciudad}
                    {o.central && <span className="badge-central">Central</span>}
                  </div>
                  {o.puntos.map((pt) => (
                    <p key={pt.tipo} className="oficina-punto">
                      <span className="oficina-tipo">{pt.tipo}</span> {pt.direccion}
                    </p>
                  ))}
                </div>
              ))}
            </Reveal>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
