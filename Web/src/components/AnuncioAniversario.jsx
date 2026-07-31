import { useState } from "react";
import { Link } from "react-router-dom";
import { EMPRESA } from "../datos";

/**
 * Anuncio grande: Aniversario de Requena (18–23 de agosto).
 *
 * Si más adelante se sube un flyer diseñado a /public/anuncios/aniversario-requena.jpg,
 * se muestra esa imagen; mientras tanto, cae a una tarjeta con la invitación, para que
 * la sección nunca quede vacía.
 */
export default function AnuncioAniversario() {
  const [sinFlyer, setSinFlyer] = useState(false);

  return (
    <section className="section aniversario-sec" id="aniversario">
      <div className="wrap">
        <div className="section-head">
          <div className="kicker">Del 18 al 23 de agosto</div>
          <h2>¡Requena está de fiesta!</h2>
          <p>
            La <strong>Atenas del Ucayali</strong> celebra su aniversario y te esperamos
            para vivirlo a orillas del río. Viaja con Transportes Rayza y sé parte de la fiesta.
          </p>
        </div>

        {!sinFlyer ? (
          <img
            className="aniversario-flyer"
            src="/anuncios/aniversario-requena.jpg"
            alt="Aniversario de Requena, del 18 al 23 de agosto"
            loading="lazy"
            onError={() => setSinFlyer(true)}
          />
        ) : (
          <div className="aniversario-card">
            <div className="aniversario-borde">
              <span className="aniversario-kicker">Te esperamos en el</span>
              <div className="aniversario-numero">23<sup>ago</sup></div>
              <h3 className="aniversario-titulo">Aniversario de Requena</h3>
              <p className="aniversario-sub">
                Una semana de fiesta<br />del <b>18 al 23 de agosto</b>
              </p>

              <div className="aniversario-iconos">
                <span>🎉 Desfiles cívicos</span>
                <span>🎶 Música y danzas</span>
                <span>🛶 Fiesta en el río</span>
                <span>🍲 Feria y gastronomía</span>
              </div>

              <p className="aniversario-lugar">
                📍 Requena, Loreto · a orillas del río Ucayali
              </p>
            </div>
          </div>
        )}

        <div className="aniversario-acciones">
          <Link className="btn btn-primary" to="/comprar?destino=Requena">Viaja a Requena</Link>
          <a className="btn btn-ghost" href={EMPRESA.redes.facebook} target="_blank" rel="noopener">
            Ver en Facebook
          </a>
        </div>
      </div>
    </section>
  );
}
