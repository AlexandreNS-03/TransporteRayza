import { Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Reveal from "../components/Reveal";
import { IconBoat, IconStar, IconSeat, IconPackage, IconHotel, IconTicket } from "../components/Icons";

/**
 * Página "Nuestros servicios": reúne lo que ofrece la empresa (pasajes, asientos
 * VIP/normal, encomiendas, hotel y bar), como referencia estilo movilbus.pe.
 */
const SERVICIOS = [
  { Ic: IconBoat, t: "Pasajes fluviales", d: "Viajes en deslizador entre Requena, Iquitos, Nauta y los puertos del río, con horarios y precios claros." },
  { Ic: IconStar, t: "Asientos VIP", d: "Los más cómodos del bote, con mejor ubicación. Ideales para viajes largos por el río." },
  { Ic: IconSeat, t: "Asientos normales", d: "La opción económica para llegar a tu destino con la misma seguridad y puntualidad." },
  { Ic: IconPackage, t: "Encomiendas", d: "Envío de carga puerta a puerto entre nuestras sucursales, con guía y comprobante electrónico." },
  { Ic: IconHotel, t: "Hotel y Bar Karaoke Rayza", d: "Descansa en Requena y celebra con nosotros: karaoke, bebidas y buen ambiente en la terraza." },
  { Ic: IconTicket, t: "Compra en línea", d: "Elige tu asiento y paga con tarjeta o Yape desde el celular. Recibe tu boleto con QR al instante." },
];

export default function Servicios() {
  return (
    <>
      <Header />
      <section className="hero" style={{ minHeight: "auto" }}>
        <div className="wrap" style={{ padding: "64px 24px 96px" }}>
          <Reveal><div className="eyebrow">Nuestros servicios</div></Reveal>
          <Reveal><h1 style={{ maxWidth: "16ch" }}>Todo para moverte <em>por el río</em></h1></Reveal>
          <Reveal delay={1}><p className="lead">Transporte de pasajeros y encomiendas en la Amazonía peruana, con la comodidad y el servicio que mereces.</p></Reveal>
        </div>
        <div className="waves"><svg viewBox="0 0 1440 120" preserveAspectRatio="none"><path fill="var(--bg)" d="M0 60 Q 180 20 360 60 T 720 60 T 1080 60 T 1440 60 V120 H0Z"/></svg></div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="cards">
            {SERVICIOS.map((s, i) => (
              <Reveal className={`card hoverable${i === 0 ? " card-destacada" : ""}`} delay={(i % 3) + 1} key={s.t}>
                <div className="icon" style={{ fontSize: 26 }}><s.Ic width={26} height={26} /></div>
                <h3 style={{ fontSize: 20 }}>{s.t}</h3>
                <p className="muted">{s.d}</p>
              </Reveal>
            ))}
          </div>
          <div className="center" style={{ marginTop: 44 }}>
            <Link className="btn btn-primary btn-lg" to="/comprar">Comprar mi pasaje</Link>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="wrap center" style={{ maxWidth: "min(720px, 100%)" }}>
          <h2 style={{ fontSize: "clamp(24px,4vw,34px)", margin: "10px 0 14px" }}>Conoce las condiciones del viaje</h2>
          <p className="muted">Equipaje, horarios de embarque, cambios y devoluciones: todo está en nuestras cláusulas.</p>
          <Link className="btn btn-ghost" to="/clausulas" style={{ marginTop: 18 }}>Ver cláusulas del viaje</Link>
        </div>
      </section>
      <Footer />
    </>
  );
}
