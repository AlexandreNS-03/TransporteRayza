import { useEffect, useRef, useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Seo from "../components/Seo";
import { sorteoVigente, registrarCodigoSorteo, conectarSorteoVivo, historialSorteos } from "../services/publicApi";

/**
 * Sorteo promocional: registrar el código del ticket y ver el sorteo en vivo.
 *
 * La ruleta es la animación, NO el sorteo. El ganador lo decide el servidor y
 * llega por la transmisión; la rueda solo se detiene donde ya se decidió. Si la
 * eligiera el navegador, cualquiera con la consola abierta podría ganar.
 */

const VUELTAS = 6;              // vueltas completas antes de frenar
const DURACION_GIRO = 5200;     // ms; suficiente para que se sienta el suspenso

export default function Sorteo() {
  const [sorteo, setSorteo] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [ganador, setGanador] = useState(null);
  const [girando, setGirando] = useState(false);
  const [participantes, setParticipantes] = useState(0);
  const [historial, setHistorial] = useState([]);
  // Al repetir se reusa la misma rueda: es la forma de mostrar que el resultado
  // guardado es el mismo que se anunció ese día.
  const [repeticion, setRepeticion] = useState(null);

  useEffect(() => {
    sorteoVigente()
      .then((s) => {
        setSorteo(s);
        setParticipantes(s.participantes ?? 0);
        // Si ya se sorteó antes de que llegara, se muestra el resultado sin girar.
        if (s.estado === "SORTEADO" && s.ganadorNombre)
          setGanador({ nombre: s.ganadorNombre, codigo: s.ganadorCodigo, participantes: s.participantes });
      })
      .catch(() => setSorteo({ hay: false }))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => { historialSorteos().then(setHistorial).catch(() => {}); }, []);

  /** El ganador del sorteo vigente, si ya se hizo. Se usa para volver de una
   *  repetición sin tener que recargar la página. */
  const ganadorVigente = () =>
    sorteo?.estado === "SORTEADO" && sorteo.ganadorNombre
      ? { nombre: sorteo.ganadorNombre, codigo: sorteo.ganadorCodigo, participantes: sorteo.participantes }
      : null;

  const salirDeRepeticion = () => { setRepeticion(null); setGanador(ganadorVigente()); };

  /** Vuelve a girar la rueda con un resultado ya guardado. */
  const repetir = (pasado) => {
    setRepeticion(pasado);
    setGanador(null);
    setGirando(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => {
      setGanador({ nombre: pasado.ganadorNombre, codigo: pasado.ganadorCodigo,
                   participantes: pasado.participantes });
      setGirando(false);
    }, DURACION_GIRO);
  };

  // Transmisión en vivo. Solo mientras el sorteo siga sin resolverse: una vez
  // que hay ganador no queda nada que esperar.
  useEffect(() => {
    if (!sorteo?.hay || sorteo.estado === "SORTEADO") return;

    return conectarSorteoVivo(sorteo.id, {
      onParticipante: (d) => setParticipantes(d.participantes),
      onGanador: (d) => {
        setGirando(true);
        // La rueda gira un rato y recién ahí se muestra el nombre: sin la espera
        // el resultado aparece de golpe y se pierde el momento.
        setTimeout(() => {
          setGanador(d);
          setGirando(false);
          // El sorteo pasa a estar hecho: la etiqueta decía "Registro abierto"
          // con el ganador ya en pantalla, y el sorteo recién hecho tiene que
          // entrar al historial sin recargar.
          setSorteo((s) => ({ ...s, estado: "SORTEADO",
                              ganadorNombre: d.nombre, ganadorCodigo: d.codigo }));
          historialSorteos().then(setHistorial).catch(() => {});
        }, DURACION_GIRO);
      },
    });
  }, [sorteo?.id, sorteo?.estado]);

  if (cargando) {
    return (
      <>
        <Header />
        <section className="section"><div className="wrap"><p className="muted">Cargando…</p></div></section>
        <Footer />
      </>
    );
  }

  if (!sorteo?.hay) {
    return (
      <>
        <Seo titulo="Sorteo" />
        <Header />
        <section className="section">
          <div className="wrap" style={{ maxWidth: "min(560px, 100%)" }}>
            <div className="card" style={{ textAlign: "center" }}>
              <h1 style={{ fontSize: 24, marginTop: 0 }}>No hay sorteo activo</h1>
              <p className="muted">Cuando abramos uno nuevo lo anunciaremos acá y en nuestras redes.</p>
              <a className="btn btn-primary" href="/comprar">Comprar un pasaje</a>
            </div>
          </div>
        </section>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Seo
        titulo={sorteo.nombre || "Sorteo"}
        descripcion={`Participa por ${sorteo.premio}. Registra el código de tu ticket de embarque.`}
      />
      <Header />
      <section className="section">
        <div className="wrap" style={{ maxWidth: "min(720px, 100%)" }}>

          <div className="sorteo-cab">
            <span className="sorteo-tag">
              {sorteo.estado === "SORTEADO" ? "Sorteo realizado"
                : sorteo.estado === "CERRADO" ? "Registro cerrado" : "Registro abierto"}
            </span>
            <h1>{sorteo.nombre || "Sorteo"}</h1>
            <p className="sorteo-premio">{sorteo.premio}</p>
            {sorteo.fechaSorteo && sorteo.estado !== "SORTEADO" && (
              <p className="muted">Se sortea el {fechaBonita(sorteo.fechaSorteo)}</p>
            )}
          </div>

          {repeticion && (
            <p className="sorteo-repeticion-barra">
              <span className="sorteo-repeticion">
                Repetición del {fechaBonita(repeticion.sorteadoAt)}
              </span>
              <button className="sorteo-salir" onClick={salirDeRepeticion}>
                Volver al sorteo actual
              </button>
            </p>
          )}

          <Ruleta girando={girando} ganador={ganador} participantes={participantes} />

          {/* Ver una repetición no cierra el registro del sorteo vigente: el
              ganador que se muestra es de otro sorteo, no de este. */}
          {sorteo.estado === "ABIERTO" && (!ganador || repeticion) && (
            <Registro onListo={() => setParticipantes((n) => n + 1)} />
          )}

          {sorteo.estado === "CERRADO" && (!ganador || repeticion) && (
            <div className="card" style={{ textAlign: "center" }}>
              <p style={{ margin: 0 }}>
                El registro está cerrado. Quédate en esta página: el ganador aparece acá
                apenas se realice el sorteo.
              </p>
            </div>
          )}

          {historial.length > 0 && (
            <section className="sorteo-historial">
              <h2>Sorteos anteriores</h2>
              {/* El registro público es lo que sostiene que los sorteos fueron
                  limpios: cualquiera puede ver quién ganó, cuándo y entre cuántos. */}
              <p className="muted" style={{ fontSize: 13 }}>
                Cada sorteo queda registrado con su ganador, la fecha y cuántos participaron.
              </p>
              {historial.map((h) => (
                <div className="sorteo-pasado" key={h.id}>
                  <div className="sorteo-pasado-datos">
                    <strong>{h.ganadorNombre} · {h.ganadorCodigo}</strong>
                    <span>
                      {h.nombre} · {fechaBonita(h.sorteadoAt)} · entre {h.participantes}{" "}
                      {h.participantes === 1 ? "participante" : "participantes"}
                    </span>
                  </div>
                  <button className="sorteo-repetir" onClick={() => repetir(h)}>
                    Ver repetición
                  </button>
                </div>
              ))}
            </section>
          )}

          {sorteo.basesUrl && (
            <p className="muted" style={{ fontSize: 13, textAlign: "center", marginTop: 18 }}>
              <a href={sorteo.basesUrl} target="_blank" rel="noopener">Ver las bases del sorteo</a>
            </p>
          )}
        </div>
      </section>
      <Footer />
    </>
  );
}

/**
 * La rueda.
 *
 * Da vueltas completas y frena; no representa cupones reales porque el ganador
 * ya está decidido en el servidor. Mostrar nombres girando daría a entender que
 * la rueda elige, y no es así.
 */
function Ruleta({ girando, ganador, participantes }) {
  const [angulo, setAngulo] = useState(0);
  const giroPrevio = useRef(0);

  useEffect(() => {
    if (!girando) return;
    // Se acumula para que nunca gire "hacia atrás" entre sorteos.
    giroPrevio.current += 360 * VUELTAS + Math.floor(Math.random() * 360);
    setAngulo(giroPrevio.current);
  }, [girando]);

  return (
    <div className="sorteo-ruleta-caja">
      <div className="sorteo-aguja" aria-hidden="true" />
      <div
        className="sorteo-ruleta"
        style={{
          transform: `rotate(${angulo}deg)`,
          transitionDuration: girando ? `${DURACION_GIRO}ms` : "0ms",
        }}
        aria-hidden="true"
      />

      <div className="sorteo-centro" role="status" aria-live="polite">
        {ganador ? (
          <>
            <span className="sorteo-centro-eti">Ganador</span>
            <strong className="sorteo-ganador">{ganador.nombre}</strong>
            <span className="sorteo-codigo">{ganador.codigo}</span>
          </>
        ) : girando ? (
          <span className="sorteo-centro-eti">Sorteando…</span>
        ) : (
          <>
            <strong className="sorteo-participantes">{participantes}</strong>
            <span className="sorteo-centro-eti">
              {participantes === 1 ? "participante" : "participantes"}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function Registro({ onListo }) {
  const [codigo, setCodigo] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [listo, setListo] = useState(null);

  const enviar = async (e) => {
    e.preventDefault();
    setEnviando(true); setError(null);
    try {
      const r = await registrarCodigoSorteo(codigo, email, telefono);
      setListo(r);
      onListo?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  if (listo) {
    return (
      <div className="card sorteo-listo">
        <h2 style={{ marginTop: 0, fontSize: 20 }}>{listo.message}</h2>
        <p className="muted">
          Código <strong>{listo.codigo}</strong>
          {listo.oportunidades > 1 && " · cuenta como 2 oportunidades"}
        </p>
        <p className="muted" style={{ fontSize: 13 }}>
          Quédate en esta página el día del sorteo: el ganador aparece acá en vivo.
        </p>
      </div>
    );
  }

  return (
    <form className="card sorteo-form" onSubmit={enviar}>
      <h2 style={{ marginTop: 0, fontSize: 20 }}>Registra tu código</h2>
      <p className="muted">
        Está impreso en tu ticket de embarque. Si viajaste en asiento VIP,
        tu código vale <strong>el doble</strong>.
      </p>

      <label className="campo">
        <span>Código del ticket</span>
        {/* Sin autoFocus: el navegador salta al campo al cargar y deja la ruleta
            —que es lo que se vino a ver— fuera de pantalla, con el teclado encima. */}
        <input value={codigo} required maxLength={12}
               placeholder="Ej. K7M2PQR4" className="sorteo-codigo-input"
               onChange={(e) => setCodigo(e.target.value.toUpperCase())} />
      </label>

      <label className="campo">
        <span>Tu correo</span>
        <input type="email" value={email} required
               onChange={(e) => setEmail(e.target.value)} />
        <small className="muted">Por ahí te avisamos si ganas.</small>
      </label>

      <label className="campo">
        <span>Tu celular (opcional)</span>
        <input type="tel" inputMode="numeric" value={telefono} maxLength={9}
               onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ""))} />
      </label>

      {error && <div className="alert alert-warn">{error}</div>}

      <button className="btn btn-primary" disabled={enviando}>
        {enviando ? "Registrando…" : "Participar"}
      </button>
    </form>
  );
}

const fechaBonita = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleString("es-PE", { dateStyle: "long", timeStyle: "short" });
};
