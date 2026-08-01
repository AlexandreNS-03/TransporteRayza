import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { buscarBoletos, soles } from "../services/publicApi";

/**
 * Historial de boletos sin necesidad de cuenta: se busca por correo o por DNI.
 * Pensado para quien compró como invitado. Si llega con ?correo= (desde la
 * confirmación de compra), busca solo.
 */
export default function Historial() {
  const [params] = useSearchParams();
  const [modo, setModo] = useState("correo");         // correo | documento
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

  // Si vino con el correo en la URL (desde la compra), busca automáticamente
  useEffect(() => {
    if (params.get("correo")) buscar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Header />
      <section className="section">
        <div className="wrap" style={{ maxWidth: "min(720px, 100%)" }}>
          <div className="section-head" style={{ marginBottom: 28 }}>
            <div className="kicker">Mis boletos</div>
            <h2>Consulta tus pasajes</h2>
            <p>Busca con el correo o el DNI que usaste al comprar. No necesitas cuenta.</p>
          </div>

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

          {boletos && boletos.map((b) => (
            <div className="boleto-row" key={b.ventaId}>
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
              </div>
              <div className="boleto-precio">{soles(b.precio)}</div>
            </div>
          ))}

          <p className="muted" style={{ marginTop: 24, fontSize: 13.5 }}>
            ¿No encuentras tu boleto? Escríbenos y te ayudamos.{" "}
            <Link to="/#contacto">Contacto</Link>.
          </p>
        </div>
      </section>
      <Footer />
    </>
  );
}
