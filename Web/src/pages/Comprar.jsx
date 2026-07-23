import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Buscador from "../components/Buscador";
import Resultados from "../components/Resultados";
import MapaAsientos from "../components/MapaAsientos";
import FormularioPasajero from "../components/FormularioPasajero";
import Resumen from "../components/Resumen";
import Confirmacion from "../components/Confirmacion";
import { buscarViajes, crearReserva, pagarReserva, formularioDePago,
         metodosDePago, pagarConYape as cobrarYape } from "../services/publicApi";
import { tokenizarYape } from "../services/yape";
import { pagarConIzipay, limpiarIzipay } from "../services/izipay";
import { tokenCliente } from "../services/authCliente";

const PASOS = ["Buscar", "Asiento", "Datos", "Pago", "Listo"];

const DATOS_INICIALES = {
  tipoDocumento: "DNI", pasajeroDocumento: "", pasajeroNombre: "",
  pasajeroTelefono: "", clienteEmail: "", edad: "", sexo: "Masculino",
  tipoComprobante: "BOLETA", clienteDocumento: "", clienteNombre: "",
};

export default function Comprar() {
  const [sp] = useSearchParams();
  const [paso, setPaso] = useState(0);

  const [viajes, setViajes] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const [viaje, setViaje] = useState(null);
  const [asiento, setAsiento] = useState(null);
  const [datos, setDatos] = useState(DATOS_INICIALES);

  const [pagando, setPagando] = useState(false);
  const [errorPago, setErrorPago] = useState(null);
  const [confirmacion, setConfirmacion] = useState(null);
  const [simulado, setSimulado] = useState(false);
  const [formularioVisible, setFormularioVisible] = useState(false);
  const [metodo, setMetodo] = useState("tarjeta");        // tarjeta | yape
  const [metodos, setMetodos] = useState(null);
  const [yapeDatos, setYapeDatos] = useState({ phoneNumber: "", otp: "" });
  const [reserva, setReserva] = useState(null);

  const buscar = async (params) => {
    setCargando(true); setError(null); setViajes(null);
    try { setViajes(await buscarViajes(params)); }
    catch (e) { setError(e.message); }
    finally { setCargando(false); }
  };

  useEffect(() => {
    const p = { origen: sp.get("origen") || "", destino: sp.get("destino") || "", fecha: sp.get("fecha") || "" };
    if (p.origen || p.destino || p.fecha) buscar(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  const elegirViaje = (v) => { setViaje(v); setAsiento(null); setPaso(1); scrollTop(); };
  const continuarAsiento = () => { if (asiento) { setPaso(2); scrollTop(); } };
  const continuarDatos = () => { if (datosValidos()) { setPaso(3); scrollTop(); } };

  const datosValidos = () => {
    if (!datos.pasajeroNombre.trim() || !datos.pasajeroDocumento.trim()) {
      alert("Completa el nombre y el documento del pasajero."); return false;
    }
    if (!datos.clienteEmail.trim() || !datos.clienteEmail.includes("@")) {
      alert("Ingresa un correo válido para enviarte el boleto."); return false;
    }
    if (datos.tipoComprobante === "FACTURA" && (!datos.clienteDocumento.trim() || !datos.clienteNombre.trim())) {
      alert("Para factura, ingresa el RUC y la razón social."); return false;
    }
    return true;
  };

  // Se consultan al llegar al pago: así no se pide un formulario a Izipay si el
  // cliente termina pagando con Yape.
  useEffect(() => {
    if (paso === 3 && !metodos) metodosDePago().then(setMetodos).catch(() => {});
  }, [paso, metodos]);

  const datosDeLaReserva = () => ({
    viajeId: viaje.id,
    ordenOrigen: viaje.ordenOrigen,
    ordenDestino: viaje.ordenDestino,
    paradaOrigen: viaje.origen,
    paradaDestino: viaje.destino,
    asientoNumero: asiento.numero,
    asientoTipo: asiento.tipo,
    tipoDocumento: datos.tipoDocumento,
    pasajeroNombre: datos.pasajeroNombre,
    pasajeroDocumento: datos.pasajeroDocumento,
    pasajeroTelefono: datos.pasajeroTelefono,
    clienteEmail: datos.clienteEmail,
    edad: datos.edad ? Number(datos.edad) : null,
    sexo: datos.sexo,
    tipoComprobante: datos.tipoComprobante,
    clienteNombre: datos.clienteNombre,
    clienteDocumento: datos.clienteDocumento,
  });

  /**
   * Devuelve la reserva de esta compra, creándola solo la primera vez.
   *
   * Si un pago falla, la reserva sigue reteniendo el asiento por 15 minutos. Antes se
   * creaba una nueva en cada intento y el reintento chocaba contra su propia reserva
   * anterior: "El asiento #1 ya no está disponible para ese tramo".
   */
  const obtenerReserva = async () => {
    if (reserva && (!reserva.expiraEn || new Date(reserva.expiraEn) > new Date()))
      return reserva;
    const nueva = await crearReserva(datosDeLaReserva(), tokenCliente());
    setReserva(nueva);
    return nueva;
  };

  // Volver atrás a cambiar asiento o datos invalida la reserva: la siguiente vez se
  // crea una nueva con los datos corregidos.
  const volverA = (n) => { setReserva(null); setErrorPago(null); setPaso(n); };

  const terminar = (conf) => { setReserva(null); setConfirmacion(conf); setPaso(4); scrollTop(); };

  const pagarConYape = async () => {
    setPagando(true); setErrorPago(null);
    try {
      // Se valida el código ANTES de reservar el asiento: si el código está mal, no
      // se retiene un asiento que después habría que liberar.
      const cfg = metodos?.yape || {};
      const token = await tokenizarYape({
        publicKey: cfg.publicKey, simulado: cfg.simulado,
        otp: yapeDatos.otp.trim(), phoneNumber: yapeDatos.phoneNumber.trim(),
      });
      const r = await obtenerReserva();
      terminar(await cobrarYape(r.reservaId, token));
    } catch (e) {
      setErrorPago(e.message);
    } finally {
      setPagando(false);
    }
  };

  const pagar = async () => {
    setPagando(true); setErrorPago(null);
    try {
      const r = await obtenerReserva();

      // El backend pide el formulario a Izipay; el cliente escribe su tarjeta dentro
      // de ese formulario y nos devuelve la respuesta firmada, que el servidor verifica.
      const form = await formularioDePago(r.reservaId);
      setSimulado(!!form.simulado);
      const respuesta = await pagarConIzipay({
        ...form,
        contenedor: "#izipay-form",
        alMostrarFormulario: () => setFormularioVisible(true),
      });
      setFormularioVisible(false);
      const conf = await pagarReserva(r.reservaId, respuesta);
      limpiarIzipay("#izipay-form");
      terminar(conf);
    } catch (e) {
      setErrorPago(e.message);
      setFormularioVisible(false);
      limpiarIzipay("#izipay-form");
    } finally {
      setPagando(false);
    }
  };

  return (
    <>
      <Header />
      <section className="section">
        <div className="wrap">
          <div className="section-head" style={{ marginBottom: 8 }}>
            <div className="kicker">Compra de pasajes</div>
            <h2>Reserva tu viaje</h2>
          </div>

          <div className="steps">
            {PASOS.map((p, i) => (
              <div key={p} className={`step ${i === paso ? "active" : ""} ${i < paso ? "done" : ""}`}>
                <span className="num">{i < paso ? "✓" : i + 1}</span>{p}
                {i < PASOS.length - 1 && <span className="sep" />}
              </div>
            ))}
          </div>

          {paso === 0 && (
            <>
              <Buscador
                onBuscar={buscar}
                valorInicial={{ origen: sp.get("origen") || "", destino: sp.get("destino") || "", fecha: sp.get("fecha") || "" }}
              />
              <div style={{ marginTop: 28 }}>
                <Resultados viajes={viajes} cargando={cargando} error={error} onElegir={elegirViaje} />
              </div>
            </>
          )}

          {paso >= 1 && paso <= 3 && viaje && (
            <div className="compra-layout">
              <div>
                {paso === 1 && (
                  <div className="card">
                    <MapaAsientos viaje={viaje} seleccionado={asiento} onSeleccionar={setAsiento} />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 22 }}>
                      <button className="btn btn-ghost" onClick={() => setPaso(0)}>Volver</button>
                      <button className="btn btn-primary" disabled={!asiento} onClick={continuarAsiento}>Continuar</button>
                    </div>
                  </div>
                )}
                {paso === 2 && (
                  <div className="card">
                    <FormularioPasajero datos={datos} setDatos={setDatos} />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 22 }}>
                      <button className="btn btn-ghost" onClick={() => setPaso(1)}>Volver</button>
                      <button className="btn btn-primary" onClick={continuarDatos}>Continuar al pago</button>
                    </div>
                  </div>
                )}
                {paso === 3 && (
                  <div className="card">
                    <h3>Pago en línea</h3>
                    <p className="muted" style={{ marginTop: 6 }}>
                      Elige cómo pagar. Retenemos tu asiento por 15 minutos mientras
                      completas el pago.
                    </p>

                    {/* Elegir el medio antes de arrancar: así no se abre un formulario
                        de tarjeta si el cliente va a pagar con Yape */}
                    {!formularioVisible && (
                      <div className="metodos-pago">
                        <button type="button"
                                className={`metodo ${metodo === "tarjeta" ? "activo" : ""}`}
                                onClick={() => { setMetodo("tarjeta"); setErrorPago(null); }}
                                disabled={pagando}>
                          <span className="metodo-icono">💳</span>
                          <span className="metodo-nombre">Tarjeta</span>
                          <span className="metodo-detalle">Débito o crédito</span>
                        </button>
                        <button type="button"
                                className={`metodo ${metodo === "yape" ? "activo" : ""}`}
                                onClick={() => { setMetodo("yape"); setErrorPago(null); }}
                                disabled={pagando}>
                          <span className="metodo-icono">📱</span>
                          <span className="metodo-nombre">Yape</span>
                          <span className="metodo-detalle">Con tu celular</span>
                        </button>
                      </div>
                    )}

                    {metodo === "yape" && (
                      <div className="yape-form">
                        <p className="muted" style={{ fontSize: 13 }}>
                          En tu app de Yape entra a <strong>Aprobar compra por internet</strong> y
                          genera el código de 6 dígitos.
                        </p>
                        {metodos?.yape?.prueba && (
                          <div className="alert alert-warn" style={{ fontSize: 13 }}>
                            Modo de prueba: el código real de tu app <strong>no funciona acá</strong>.
                            Usa el celular <strong>111111111</strong> con el código <strong>123456</strong>
                            para simular un pago aprobado.
                          </div>
                        )}
                        <label>
                          CELULAR
                          <input type="tel" inputMode="numeric" maxLength={9}
                                 placeholder="9XXXXXXXX"
                                 value={yapeDatos.phoneNumber} disabled={pagando}
                                 onChange={e => setYapeDatos(d => ({
                                   ...d, phoneNumber: e.target.value.replace(/\D/g, "") }))} />
                        </label>
                        <label>
                          CÓDIGO DE APROBACIÓN
                          <input inputMode="numeric" maxLength={6} placeholder="6 dígitos"
                                 value={yapeDatos.otp} disabled={pagando}
                                 onChange={e => setYapeDatos(d => ({
                                   ...d, otp: e.target.value.replace(/\D/g, "") }))} />
                        </label>
                      </div>
                    )}

                    {((metodo === "tarjeta" && metodos?.tarjeta?.simulado) ||
                      (metodo === "yape" && metodos?.yape?.simulado)) && (
                      <div className="alert alert-warn" style={{ marginTop: 12 }}>
                        Modo prueba: faltan las credenciales de la pasarela, así que el pago se
                        <strong> simula</strong> (no se cobra). Igual se genera tu boleto con QR.
                      </div>
                    )}

                    {/* Izipay dibuja acá su formulario de tarjeta */}
                    <div id="izipay-form" style={{ marginTop: 16 }} />
                    {errorPago && <div className="alert alert-warn" style={{ marginTop: 12 }}>{errorPago}</div>}
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 22 }}>
                      <button className="btn btn-ghost" onClick={() => volverA(2)} disabled={pagando}>Volver</button>
                      {!formularioVisible && (
                        <button className="btn btn-primary" disabled={pagando}
                                onClick={metodo === "yape" ? pagarConYape : pagar}>
                          {pagando
                            ? (metodo === "yape" ? "Cobrando…" : "Abriendo el pago…")
                            : (metodo === "yape" ? "Pagar con Yape" : "Pagar con tarjeta")}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <Resumen viaje={viaje} asiento={asiento} />
            </div>
          )}

          {paso === 4 && <Confirmacion data={confirmacion} />}
        </div>
      </section>
      <Footer />
    </>
  );
}
