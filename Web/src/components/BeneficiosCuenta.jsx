import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getBeneficios } from "../services/publicApi";
import { estaLogueado } from "../services/authCliente";
import Reveal from "./Reveal";
import "./BeneficiosCuenta.css";

/**
 * Por qué conviene tener cuenta: el descuento por viajar seguido y el saldo.
 *
 * <p><strong>No anuncia nada que no exista.</strong> Los dos programas se
 * prenden y se apagan desde la configuración del servidor, y los números del
 * descuento se ajustan. Por eso esta sección le pregunta al servidor qué puede
 * contar hoy, y con los dos apagados no se dibuja. Escribir "6 viajes" en la
 * página sería una promesa que deja de ser cierta el día que se cambie el
 * número, y el que reclama en el mostrador tiene razón.
 *
 * <p>Mientras no haya respuesta tampoco se dibuja: es mejor que la página
 * aparezca sin esta sección a que aparezca prometiendo y se borre sola.
 */
export default function BeneficiosCuenta() {
  const [b, setB] = useState(null);
  // Invitar a crear una cuenta a quien ya entró con la suya es decirle que no
  // sabemos quién es. Al que ya tiene cuenta se le ofrece ir a verla.
  const conCuenta = estaLogueado();

  useEffect(() => {
    let vivo = true;
    getBeneficios()
      .then((d) => { if (vivo) setB(d); })
      .catch(() => { /* sin beneficios que contar, la sección no existe */ });
    return () => { vivo = false; };
  }, []);

  if (!b || (!b.fidelidad && !b.wallet)) return null;

  const escalones = b.fidelidad ? (b.escalones || []) : [];
  const mejor = escalones.length ? escalones[escalones.length - 1] : null;

  return (
    <section className="section beneficios" id="beneficios">
      <div className="wrap">
        {/* Sin escalera la rejilla de dos columnas dejaría media sección vacía:
            con un solo hijo, la segunda columna igual se reserva. */}
        <div className={"beneficios-grid" + (escalones.length ? "" : " sin-escalera")}>

          <div className="beneficios-pitch">
            <span className="tagline">Cuenta Rayza</span>
            <h2>
              {mejor
                ? <>Al que viaja seguido<br />le cobramos menos</>
                : <>Tu plata, lista<br />antes de subir</>}
            </h2>
            <p>
              {mejor
                ? `Cada viaje cuenta. Al llegar a ${escalones[0].viajes}, el descuento
                   queda puesto y se aplica solo, acá y en la agencia.`
                : `Recarga tu saldo cuando puedas y paga el pasaje en un toque,
                   sin buscar la tarjeta en el puerto.`}
            </p>

            {conCuenta ? (
              <>
                <Link className="btn btn-primary" to="/mi-cuenta">Ver mi cuenta</Link>
                <span className="beneficios-nota">
                  {b.fidelidad ? "Tu categoría y tu saldo, al día" : "Tu saldo y tus viajes, al día"}
                </span>
              </>
            ) : (
              <>
                <Link className="btn btn-primary" to="/ingresar?crear=1">Crear mi cuenta</Link>
                <span className="beneficios-nota">Es gratis y toma un minuto</span>
              </>
            )}
          </div>

          {/* La escalera. Dos niveles no son dos tarjetas iguales: el de arriba
              pesa más, porque es el que da más, y eso se tiene que ver antes de
              leerlo. */}
          {escalones.length > 0 && (
            <ul className="escalera">
              {escalones.map((e, i) => (
                <Reveal as="li" key={e.nombre} delay={i + 1}
                        className={"escalon es-" + e.nombre.toLowerCase()}>
                  <span className="escalon-nivel">{e.nombre}</span>
                  <span className="escalon-dto">
                    <strong>{e.descuento}</strong><span>%</span>
                  </span>
                  <span className="escalon-pie">
                    desde {e.viajes} viajes
                    <small>en los últimos {b.meses} meses</small>
                  </span>
                </Reveal>
              ))}
            </ul>
          )}
        </div>

        {/* Lo de abajo son apoyos, no tres promesas del mismo tamaño. */}
        <ul className="beneficios-extras">
          {b.wallet && (
            <li>
              <strong>Saldo Rayza</strong>
              Recargas con tarjeta o Yape y pagas en un toque. Si cancelamos tu
              viaje, la plata vuelve a tu saldo al instante.
            </li>
          )}
          {b.fidelidad && (
            <li>
              <strong>Cuenta tu viaje, no tu compra</strong>
              Si compras para tu familia, el viaje de cada uno suma al suyo. Y los
              que hiciste en la agencia también cuentan.
            </li>
          )}
          <li>
            <strong>Tu código en la ventanilla</strong>
            Llevas un código corto en la cuenta. Lo dictas y te encontramos sin
            deletrear tu documento.
          </li>
        </ul>
      </div>
    </section>
  );
}
