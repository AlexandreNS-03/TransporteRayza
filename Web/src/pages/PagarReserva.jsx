import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Confirmacion from "../components/Confirmacion";
import { MetodosPago, FormularioYape, PanelTarjeta } from "../components/PagoMetodos";
import { reservasPendientes, formularioDePagoGrupo, pagarGrupo,
         pagarConYapeGrupo, metodosDePago, soles } from "../services/publicApi";
import { tokenizarYape } from "../services/yape";
import { pagarConIzipay, limpiarIzipay } from "../services/izipay";

/**
 * "Termina tu pago": página a la que llega el cliente desde el correo que se le
 * manda cuando deja la compra a medias. Solo cobra lo que ya está reservado; no
 * vuelve a elegir asientos, porque siguen retenidos hasta que venza el plazo.
 *
 * El enlace trae los ids de las reservas (UUID), que no se pueden adivinar: por eso
 * funciona sin pedir sesión.
 */
export default function PagarReserva() {
  const [sp] = useSearchParams();
  const ids = (sp.get("ids") || "").trim();

  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [metodos, setMetodos] = useState(null);
  const [metodo, setMetodo] = useState("tarjeta");
  const [yapeDatos, setYapeDatos] = useState({ phoneNumber: "", otp: "" });
  const [pagando, setPagando] = useState(false);
  const [errorPago, setErrorPago] = useState(null);
  const [formularioVisible, setFormularioVisible] = useState(false);
  const [confirmacion, setConfirmacion] = useState(null);

  const [restante, setRestante] = useState(null);   // segundos que faltan

  useEffect(() => {
    if (!ids) { setError("El enlace está incompleto."); setCargando(false); return; }
    reservasPendientes(ids)
      .then(setDatos)
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
    metodosDePago().then(setMetodos).catch((e) => console.warn("[PagarReserva] no se pudo cargar métodos de pago:", e));
  }, [ids]);

  // Cuenta atrás: cuando llega a cero el asiento ya se liberó, así que no dejamos pagar.
  useEffect(() => {
    if (!datos?.expiraEn) return;
    const fin = new Date(datos.expiraEn).getTime();
    const tic = () => setRestante(Math.max(0, Math.round((fin - Date.now()) / 1000)));
    tic();
    const t = setInterval(tic, 1000);
    return () => clearInterval(t);
  }, [datos]);

  const vencida = restante === 0;
  const reservaIds = datos?.reservaIds || [];

  const reloj = (s) => {
    if (s == null) return "";
    const m = Math.floor(s / 60);
    return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  };

  const pagarTarjeta = async () => {
    setPagando(true); setErrorPago(null);
    try {
      const form = await formularioDePagoGrupo(reservaIds);
      const respuesta = await pagarConIzipay({
        ...form, contenedor: "#izipay-form",
        alMostrarFormulario: () => setFormularioVisible(true),
      });
      setFormularioVisible(false);
      const conf = await pagarGrupo(reservaIds, respuesta);
      limpiarIzipay("#izipay-form");
      setConfirmacion(conf);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setErrorPago(e.message); setFormularioVisible(false); limpiarIzipay("#izipay-form");
    } finally { setPagando(false); }
  };

  const pagarYape = async () => {
    setPagando(true); setErrorPago(null);
    try {
      const cfg = metodos?.yape || {};
      const token = await tokenizarYape({
        publicKey: cfg.publicKey, simulado: cfg.simulado,
        otp: yapeDatos.otp.trim(), phoneNumber: yapeDatos.phoneNumber.trim(),
      });
      setConfirmacion(await pagarConYapeGrupo(reservaIds, token));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) { setErrorPago(e.message); }
    finally { setPagando(false); }
  };

  if (confirmacion) {
    return (
      <>
        <Header />
        <section className="section"><div className="wrap"><Confirmacion data={confirmacion} /></div></section>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <section className="section">
        <div className="wrap" style={{ maxWidth: "min(100%, 720px)" }}>
          <div className="section-head" style={{ marginBottom: 12 }}>
            <h2>Termina tu compra</h2>
          </div>

          {cargando && <div className="card">Cargando tu reserva…</div>}

          {!cargando && error && (
            <div className="card">
              <div className="alert alert-warn">{error}</div>
              <Link className="btn btn-primary" to="/comprar" style={{ marginTop: 14 }}>Comprar de nuevo</Link>
            </div>
          )}

          {!cargando && !error && datos && datos.yaPagado && (
            <div className="card">
              <h3>Esta compra ya está pagada</h3>
              <p className="muted">Te enviamos los boletos al correo con el que compraste.</p>
              <Link className="btn btn-primary" to="/historial" style={{ marginTop: 14 }}>Ver mis boletos</Link>
            </div>
          )}

          {!cargando && !error && datos && !datos.yaPagado && reservaIds.length === 0 && (
            <div className="card">
              <h3>La reserva ya venció</h3>
              <p className="muted">
                El asiento se liberó porque no se completó el pago a tiempo. Puedes elegirlo de nuevo
                si sigue disponible.
              </p>
              <Link className="btn btn-primary" to="/comprar" style={{ marginTop: 14 }}>Elegir asiento otra vez</Link>
            </div>
          )}

          {!cargando && !error && reservaIds.length > 0 && (
            <>
              <div className="alert alert-warn" style={{ marginBottom: 14 }}>
                {vencida
                  ? "El tiempo para pagar terminó y el asiento se liberó. Vuelve a elegir tu asiento."
                  : <>Guardamos {reservaIds.length === 1 ? "tu asiento" : "tus asientos"} por <strong>{reloj(restante)}</strong> más.</>}
              </div>

              <div className="card">
                <h3>Tu reserva</h3>
                <div className="resumen" style={{ position: "static", boxShadow: "none", padding: 0, marginTop: 10 }}>
                  <div className="linea"><span>Ruta</span><span>{datos.origen} → {datos.destino}</span></div>
                  <div className="linea"><span>Fecha</span>
                    <span>{datos.fechaSalida || "—"}{datos.horaSalida ? ` · ${datos.horaSalida.slice(0, 5)} h` : ""}</span></div>
                  {datos.embarcacionNombre &&
                    <div className="linea"><span>Embarcación</span><span>{datos.embarcacionNombre}</span></div>}
                  {datos.items.map((i) => (
                    <div className="linea" key={i.reservaId}>
                      <span>{i.pasajeroNombre} · Asiento #{i.asientoNumero}</span>
                      <span>{soles(i.precio)}</span>
                    </div>
                  ))}
                  <div className="total"><span>Total</span><span>{soles(datos.total)}</span></div>
                </div>
              </div>

              {!vencida && (
                <div className="card" style={{ marginTop: 14 }}>
                  <h3>¿Cómo quieres pagar?</h3>

                  {!formularioVisible && (
                    <MetodosPago
                      metodo={metodo}
                      deshabilitado={pagando}
                      onElegir={(m) => { setMetodo(m); setErrorPago(null); }}
                    />
                  )}

                  {metodo === "yape" && !formularioVisible && (
                    <FormularioYape
                      datos={yapeDatos}
                      onCambiar={setYapeDatos}
                      deshabilitado={pagando}
                      prueba={metodos?.yape?.prueba}
                    />
                  )}

                  <PanelTarjeta
                    activo={formularioVisible}
                    resumen={`${datos.origen} → ${datos.destino}`}
                    monto={soles(datos.total)}
                  >
                    <div id="izipay-form" />
                  </PanelTarjeta>
                  {errorPago && <div className="alert alert-warn" style={{ marginTop: 12 }}>{errorPago}</div>}

                  {!formularioVisible && (
                    <button className="btn btn-primary" style={{ marginTop: 18 }} disabled={pagando}
                            onClick={metodo === "yape" ? pagarYape : pagarTarjeta}>
                      {pagando ? (metodo === "yape" ? "Cobrando…" : "Abriendo el pago…")
                               : `Pagar ${soles(datos.total)}`}
                    </button>
                  )}
                </div>
              )}

              {vencida && (
                <Link className="btn btn-primary" to="/comprar" style={{ marginTop: 14 }}>Elegir asiento otra vez</Link>
              )}
            </>
          )}
        </div>
      </section>
      <Footer />
    </>
  );
}
