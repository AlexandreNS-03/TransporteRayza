import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { buscarBoletos, getTicket, soles } from "../services/publicApi";
import { estaLogueado } from "../services/authCliente";

/** Una fila de boleto con su botón de descarga del ticket A4. */
function BoletoRow({ b }) {
  const [bajando, setBajando] = useState(false);
  const [error, setError] = useState(null);

  const descargar = async () => {
    setBajando(true); setError(null);
    try {
      const t = await getTicket(b.ventaId);
      const { generarTicketA4 } = await import("../Utils/generarTicketA4");
      await generarTicketA4(t);
    } catch {
      setError("No se pudo generar el ticket.");
    } finally {
      setBajando(false);
    }
  };

  return (
    <div className="boleto-row">
      <div>
        <div className="boleto-ruta">{b.ruta}</div>
        <div className="boleto-meta">
          {b.fechaSalida} {b.horaSalida ? "· " + b.horaSalida.slice(0, 5) + " h" : ""}
          {" · "}{b.asientoTipo} #{b.asientoNumero}
        </div>
        <div className="boleto-etiquetas">
          <span className={`tag ${b.proximo ? "tag-proximo" : ""}`}>
            {b.proximo ? "Próximo viaje" : "Viaje pasado"}
          </span>
          {b.embarqueEstado === "EMBARCADO" && <span className="tag tag-ok">Embarcado</span>}
        </div>
        {error && <p className="muted" style={{ fontSize: 12.5, color: "var(--accent)", margin: "6px 0 0" }}>{error}</p>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
        <div className="boleto-precio">{soles(b.precio)}</div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={descargar} disabled={bajando}>
          {bajando ? "Generando…" : "Descargar ticket"}
        </button>
      </div>
    </div>
  );
}

/**
 * Consulta de boletos. Requiere registrarse / iniciar sesión para verla. Una vez
 * dentro, se buscan por correo o DNI y se puede descargar el ticket de embarque (A4).
 */
export default function Historial() {
  const [params] = useSearchParams();
  const logueado = estaLogueado();
  const [modo, setModo] = useState("correo");
  const [correo, setCorreo] = useState(params.get("correo") || "");
  const [documento, setDocumento] = useState("");
  const [boletos, setBoletos] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const buscar = async (e) => {
    e?.preventDefault();
    setError(null); setCargando(true); setBoletos(null);
    try {
      setBoletos(await buscarBoletos(modo === "correo" ? { correo } : { documento }));
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (logueado && params.get("correo")) buscar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logueado]);

  return (
    <>
      <Header />
      <section className="section">
        <div className="wrap" style={{ maxWidth: "min(720px, 100%)" }}>
          <div className="section-head" style={{ marginBottom: 28 }}>
            <h2>Consulta tus pasajes</h2>
            <p>Descarga tu ticket de embarque para presentarlo al abordar.</p>
          </div>

          {!logueado ? (
            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 40 }}>🔒</div>
              <h3 style={{ margin: "8px 0 6px" }}>Ingresa para ver tus boletos</h3>
              <p className="muted" style={{ marginBottom: 18 }}>
                Regístrate o inicia sesión para consultar tus pasajes y descargar tus tickets de embarque.
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                <Link className="btn btn-primary" to={`/ingresar?next=${encodeURIComponent("/historial")}`}>Ingresar o registrarme</Link>
                <Link className="btn btn-ghost" to="/comprar">Comprar un pasaje</Link>
              </div>
            </div>
          ) : (
            <>
              <form className="card" onSubmit={buscar} style={{ marginBottom: 24 }}>
                <div className="historial-tabs">
                  <button type="button" className={modo === "correo" ? "activo" : ""}
                          onClick={() => setModo("correo")}>Por correo</button>
                  <button type="button" className={modo === "documento" ? "activo" : ""}
                          onClick={() => setModo("documento")}>Por DNI</button>
                </div>

                {modo === "correo" ? (
                  <input type="email" placeholder="tucorreo@ejemplo.com" value={correo}
                         onChange={(e) => setCorreo(e.target.value)} required />
                ) : (
                  <input inputMode="numeric" placeholder="Tu número de documento" value={documento}
                         onChange={(e) => setDocumento(e.target.value.replace(/\D/g, ""))} required />
                )}

                <button className="btn btn-primary btn-block" style={{ marginTop: 14 }} disabled={cargando}>
                  {cargando ? "Buscando…" : "Buscar mis boletos"}
                </button>
              </form>

              {error && <div className="alert alert-warn">{error}</div>}

              {boletos && boletos.length === 0 && (
                <div className="alert alert-info">
                  No encontramos boletos con esos datos. Revisa que sean los mismos que usaste al comprar.
                </div>
              )}

              {boletos && boletos.map((b) => <BoletoRow key={b.ventaId} b={b} />)}
            </>
          )}

          <p className="muted" style={{ marginTop: 24, fontSize: 13.5 }}>
            ¿No encuentras tu boleto? Escríbenos y te ayudamos.{" "}
            <Link to="/contacto">Contacto</Link>.
          </p>
        </div>
      </section>
      <Footer />
    </>
  );
}
