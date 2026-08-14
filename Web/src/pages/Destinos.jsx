import { Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Buscador from "../components/Buscador";
import Reveal from "../components/Reveal";
import { DESTINOS } from "../destinos";

export default function Destinos() {
  return (
    <>
      <Header />
      <section className="destinos-hero">
        <div className="wrap destinos-hero-contenido">
          <h1>Navega hacia lo mejor de <em>Loreto</em></h1>
          <p>Conoce los puertos principales de nuestra ruta y elige el próximo lugar que quieres descubrir.</p>
        </div>
      </section>

      <div className="wrap destinos-buscador"><Buscador /></div>

      <section className="section destinos-catalogo">
        <div className="wrap">
          <div className="section-head">
            <h2>Destinos principales</h2>
            <p>Cuatro lugares unidos por los ríos de la Amazonía peruana.</p>
          </div>
          <div className="destinos-grid-grande">
            {DESTINOS.map((destino, indice) => (
              <Reveal key={destino.slug} delay={(indice % 3) + 1}>
                <article className="destino-tarjeta">
                  <img src={`/destinos/${destino.imagen}`} alt={`Vista de ${destino.nombre}`} />
                  <div className="destino-tarjeta-sombra" />
                  <div className="destino-tarjeta-contenido">
                    <p>{destino.etiqueta}</p>
                    <h2>{destino.nombre}</h2>
                    <Link className="destino-detalle-btn" to={`/destinos/${destino.slug}`}>Ver más <span>→</span></Link>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="wrap destinos-cta">
          <div>
            <h2>El río te lleva más lejos</h2>
            <p className="muted">Elige tu origen, destino y fecha para ver las salidas disponibles.</p>
          </div>
          <Link className="btn btn-primary btn-lg" to="/comprar">Buscar mi pasaje</Link>
        </div>
      </section>
      <Footer />
    </>
  );
}
