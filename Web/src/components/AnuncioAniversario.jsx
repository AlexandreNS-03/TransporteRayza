import { useState } from "react";
import { Link } from "react-router-dom";
import { EMPRESA } from "../datos";

/**
 * Anuncio del 3er aniversario + inauguración del Hotel y Bar Karaoke Rayza.
 *
 * Muestra el flyer oficial (una imagen que ya trae todo el diseño). Si el archivo
 * todavía no se subió a /public/anuncios, cae a una tarjeta con la misma información,
 * para que la sección nunca quede vacía.
 */
export default function AnuncioAniversario() {
  const [sinFlyer, setSinFlyer] = useState(false);

  return (
    <section className="section aniversario-sec" id="aniversario">
      <div className="wrap">
        <div className="section-head">
          <div className="kicker">Celebra con nosotros</div>
          <h2>3.º Aniversario e inauguración del Hotel y Bar Karaoke Rayza</h2>
          <p>¡Ven, canta, brinda y celebra con nosotros! Te esperamos en la terraza.</p>
        </div>

        {!sinFlyer ? (
          <img
            className="aniversario-flyer"
            src="/anuncios/aniversario.jpg"
            alt="Invitación al 3.º aniversario de Transporte Rayza e inauguración del Hotel y Bar Karaoke Rayza"
            loading="lazy"
            onError={() => setSinFlyer(true)}
          />
        ) : (
          <div className="aniversario-card">
            <div className="aniversario-borde">
              <span className="aniversario-kicker">Te invitamos al</span>
              <div className="aniversario-numero">3<sup>er</sup></div>
              <h3 className="aniversario-titulo">Aniversario de Transporte Rayza</h3>
              <p className="aniversario-sub">
                e inauguración del<br /><b>Hotel y Bar Karaoke Rayza</b>
              </p>

              <div className="aniversario-iconos">
                <span>🎤 Karaoke</span>
                <span>🍹 Bebidas</span>
                <span>🎶 Buen ambiente</span>
                <span>🍢 Riquísimo piqueo</span>
              </div>

              <div className="aniversario-combo">
                <span>Precio del combo</span>
                <strong>S/ 70</strong>
              </div>

              <p className="aniversario-lugar">
                📍 Terraza del Hotel Rayza · Calle San Antonio, Requena
              </p>
            </div>
          </div>
        )}

        <div className="aniversario-acciones">
          <Link className="btn btn-primary" to="/comprar">Comprar pasaje</Link>
          <a className="btn btn-ghost" href={EMPRESA.redes.facebook} target="_blank" rel="noopener">
            Ver en Facebook
          </a>
        </div>
      </div>
    </section>
  );
}
