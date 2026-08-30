import { useEffect, useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Seo from "../components/Seo";
import Ruleta from "../components/Ruleta";
import { sorteoVigente, registrarCodigoSorteo, conectarSorteoVivo,
         historialSorteos, participantesSorteo } from "../services/publicApi";

/**
 * Sorteo promocional: registrar el código del ticket y ver el sorteo en vivo.
 *
 * La ruleta es la animación, NO el sorteo. El ganador lo decide el servidor y
 * llega por la transmisión; la rueda solo se detiene donde ya se decidió. Si la
 * eligiera el navegador, cualquiera con la consola abierta podría ganar.
 */

const DURACION_GIRO = 5200;     // ms; suficiente para que se sienta el suspenso

export default function Sorteo() {
  const [sorteo, setSorteo] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [ganador, setGanador] = useState(null);
  // A quién apunta la rueda. Se sabe apenas arranca el giro, aunque el nombre
  // no se muestre hasta que frene.
  const [destino, setDestino] = useState(null);
  const [girando, setGirando] = useState(false);
  const [participantes, setParticipantes] = useState(0);
  // Quiénes participan: son los nombres que van en los sectores de la rueda.
  const [gente, setGente] = useState([]);
  // Los últimos en registrarse, para que se vea entrar a alguien de verdad.
  const [recientes, setRecientes] = useState([]);
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
        if (s.estado === "SORTEADO" && s.ganadorNombre) {
          const g = { nombre: s.ganadorNombre, codigo: s.ganadorCodigo, participantes: s.participantes };
          setGanador(g);
          setDestino(g);
        }
      })
      .catch(() => setSorteo({ hay: false }))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => { historialSorteos().then(setHistorial).catch(() => {}); }, []);

  useEffect(() => {
    if (!sorteo?.id) return;
    participantesSorteo(sorteo.id).then(setGente).catch(() => {});
  }, [sorteo?.id]);

  /** El ganador del sorteo vigente, si ya se hizo. Se usa para volver de una
   *  repetición sin tener que recargar la página. */
  const ganadorVigente = () =>
    sorteo?.estado === "SORTEADO" && sorteo.ganadorNombre
      ? { nombre: sorteo.ganadorNombre, codigo: sorteo.ganadorCodigo, participantes: sorteo.participantes }
      : null;

  const salirDeRepeticion = () => {
    setRepeticion(null);
    setGanador(ganadorVigente());
    setDestino(ganadorVigente());
    if (sorteo?.id) participantesSorteo(sorteo.id).then(setGente).catch(() => {});
  };

  /** Vuelve a girar la rueda con un resultado ya guardado. */
  const repetir = (pasado) => {
    setRepeticion(pasado);
    setGanador(null);
    setDestino({ nombre: pasado.ganadorNombre, codigo: pasado.ganadorCodigo });
    setGirando(true);
    // La rueda de una repetición lleva a la gente de ESE sorteo, no la de hoy.
    participantesSorteo(pasado.id).then(setGente).catch(() => setGente([]));
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
      onParticipante: (d) => {
        setParticipantes(d.participantes);
        if (!d.codigo) return;
        const nuevo = { codigo: d.codigo, nombre: d.nombre, vip: d.vip };
        setGente((g) => (g.some((p) => p.codigo === d.codigo) ? g : [...g, nuevo]));
        setRecientes((r) => [nuevo, ...r.filter((p) => p.codigo !== d.codigo)].slice(0, 6));
      },
      onGanador: (d) => {
        setDestino(d);
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

          <Ruleta
            participantes={gente}
            girando={girando}
            destino={destino}
            ganador={ganador}
            duracion={DURACION_GIRO}
            total={repeticion ? repeticion.participantes : participantes}
          />

          {/* Quiénes se van sumando. Un contador solo no dice que hay gente
              detrás; ver entrar un nombre sí. */}
          {recientes.length > 0 && !ganador && (
            <div className="sorteo-entrando" aria-live="polite">
              {recientes.map((p, i) => (
                <span className="sorteo-chip" key={p.codigo} style={{ animationDelay: `${i * 40}ms` }}>
                  {p.nombre}{p.vip && <em className="sorteo-chip-vip">VIP ×2</em>}
                </span>
              ))}
            </div>
          )}

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
