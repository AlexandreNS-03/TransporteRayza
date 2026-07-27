import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Buscador from "../components/Buscador";
import Resultados from "../components/Resultados";
import MapaAsientos from "../components/MapaAsientos";
import FormularioPasajero, { FormularioContacto } from "../components/FormularioPasajero";
import Resumen from "../components/Resumen";
import Confirmacion from "../components/Confirmacion";
import { buscarViajes, crearReservaGrupo, pagarGrupo, formularioDePagoGrupo,
         metodosDePago, pagarConYapeGrupo } from "../services/publicApi";
import { tokenizarYape } from "../services/yape";
import { pagarConIzipay, limpiarIzipay } from "../services/izipay";
import { tokenCliente } from "../services/authCliente";

const PASOS = ["Buscar", "Asientos", "Datos", "Pago", "Listo"];
const MAX_PASAJES = 5;

const PASAJERO_INICIAL = {
  tipoDocumento: "DNI", pasajeroDocumento: "", pasajeroNombre: "",
  pasajeroTelefono: "", edad: "", sexo: "Masculino",
};
const CONTACTO_INICIAL = {
  clienteEmail: "", tipoComprobante: "BOLETA", clienteDocumento: "", clienteNombre: "",
};

/**
 * Logo de la pasarela. Si el archivo oficial todavía no se subió a /public/pagos,
 * cae a un ícono: así la pantalla nunca queda con una imagen rota.
 */
function LogoPasarela({ archivo, alt, respaldo }) {
  const [falla, setFalla] = useState(false);
  if (falla) return <span className="metodo-icono">{respaldo}</span>;
  return (
    <img className="metodo-logo" src={`/pagos/${archivo}`} alt={alt}
         onError={() => setFalla(true)} />
  );
}

export default function Comprar() {
  const [sp] = useSearchParams();
  const [paso, setPaso] = useState(0);

  const [viajes, setViajes] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const [viaje, setViaje] = useState(null);
  const [cantidad, setCantidad] = useState(1);
  const [seleccionados, setSeleccionados] = useState([]);   // asientos elegidos
  const [pasajeros, setPasajeros] = useState([{ ...PASAJERO_INICIAL }]);
  const [contacto, setContacto] = useState(CONTACTO_INICIAL);

  const [pagando, setPagando] = useState(false);
  const [errorPago, setErrorPago] = useState(null);
  const [confirmacion, setConfirmacion] = useState(null);
  const [simulado, setSimulado] = useState(false);
  const [formularioVisible, setFormularioVisible] = useState(false);
  const [metodo, setMetodo] = useState("tarjeta");        // tarjeta | yape
  const [metodos, setMetodos] = useState(null);
  const [yapeDatos, setYapeDatos] = useState({ phoneNumber: "", otp: "" });
  const [reservaGrupo, setReservaGrupo] = useState(null);

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

  // Al cambiar la cantidad, ajusta las listas de asientos y pasajeros y descarta la
  // reserva previa (los asientos ya no coinciden).
  useEffect(() => {
    setPasajeros((prev) => {
      const arr = prev.slice(0, cantidad);
      while (arr.length < cantidad) arr.push({ ...PASAJERO_INICIAL });
      return arr;
    });
    setSeleccionados((prev) => prev.slice(0, cantidad));
    setReservaGrupo(null);
  }, [cantidad]);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const elegirViaje = (v) => {
    setViaje(v); setSeleccionados([]); setReservaGrupo(null); setPaso(1); scrollTop();
  };

  const toggleAsiento = (a) => {
    setReservaGrupo(null);
    setSeleccionados((prev) => {
      const ya = prev.some((s) => s.numero === a.numero);
      if (ya) return prev.filter((s) => s.numero !== a.numero);
      if (prev.length >= cantidad) return prev;
      return [...prev, a];
    });
  };

  const setPasajeroEn = (i, p) => setPasajeros((prev) => prev.map((x, j) => (j === i ? p : x)));

  const continuarAsiento = () => {
    if (seleccionados.length === cantidad) { setPaso(2); scrollTop(); }
  };
  const continuarDatos = () => { if (datosValidos()) { setPaso(3); scrollTop(); } };

  const datosValidos = () => {
    for (let i = 0; i < cantidad; i++) {
      const p = pasajeros[i] || {};
      if (!p.pasajeroNombre?.trim() || !p.pasajeroDocumento?.trim()) {
        alert(`Completa el nombre y el documento del pasajero ${i + 1}.`); return false;
      }
    }
    if (!contacto.clienteEmail.trim() || !contacto.clienteEmail.includes("@")) {
      alert("Ingresa un correo válido para enviarte los boletos."); return false;
    }
    if (contacto.tipoComprobante === "FACTURA" && (!contacto.clienteDocumento.trim() || !contacto.clienteNombre.trim())) {
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
    clienteEmail: contacto.clienteEmail,
    tipoComprobante: contacto.tipoComprobante,
    clienteNombre: contacto.clienteNombre,
    clienteDocumento: contacto.clienteDocumento,
    pasajeros: seleccionados.map((a, i) => ({
      asientoNumero: a.numero,
      asientoTipo: a.tipo,
      tipoDocumento: pasajeros[i]?.tipoDocumento || "DNI",
      pasajeroNombre: pasajeros[i]?.pasajeroNombre || "",
      pasajeroDocumento: pasajeros[i]?.pasajeroDocumento || "",
      pasajeroTelefono: pasajeros[i]?.pasajeroTelefono || "",
      edad: pasajeros[i]?.edad ? Number(pasajeros[i].edad) : null,
      sexo: pasajeros[i]?.sexo || "Masculino",
    })),
  });

  /**
   * Devuelve la reserva del grupo, creándola solo la primera vez. Si un pago falla,
   * la reserva sigue reteniendo los asientos por 15 minutos: el reintento la reutiliza
   * en vez de crear otra que chocaría contra sí misma.
   */
  const obtenerReservaGrupo = async () => {
    if (reservaGrupo && (!reservaGrupo.expiraEn || new Date(reservaGrupo.expiraEn) > new Date()))
      return reservaGrupo;
    const nueva = await crearReservaGrupo(datosDeLaReserva(), tokenCliente());
    setReservaGrupo(nueva);
    return nueva;
  };

  const volverA = (n) => { setReservaGrupo(null); setErrorPago(null); setPaso(n); };
  const terminar = (conf) => { setReservaGrupo(null); setConfirmacion(conf); setPaso(4); scrollTop(); };

  const pagarConYape = async () => {
    setPagando(true); setErrorPago(null);
    try {
      // Se valida el código ANTES de reservar: si está mal, no se retienen asientos.
      const cfg = metodos?.yape || {};
      const token = await tokenizarYape({
        publicKey: cfg.publicKey, simulado: cfg.simulado,
        otp: yapeDatos.otp.trim(), phoneNumber: yapeDatos.phoneNumber.trim(),
      });
      const r = await obtenerReservaGrupo();
      terminar(await pagarConYapeGrupo(r.reservaIds, token));
    } catch (e) {
      setErrorPago(e.message);
    } finally {
      setPagando(false);
    }
  };

  const pagar = async () => {
    setPagando(true); setErrorPago(null);
    try {
      const r = await obtenerReservaGrupo();

      // El backend pide un solo formulario a Izipay por el total; el cliente escribe
      // su tarjeta dentro y nos devuelve la respuesta firmada que el servidor verifica.
      const form = await formularioDePagoGrupo(r.reservaIds);
      setSimulado(!!form.simulado);
      const respuesta = await pagarConIzipay({
        ...form,
        contenedor: "#izipay-form",
        alMostrarFormulario: () => setFormularioVisible(true),
      });
      setFormularioVisible(false);
      const conf = await pagarGrupo(r.reservaIds, respuesta);
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

  const faltan = cantidad - seleccionados.length;

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
                    <div className="cantidad-selector">
                      <span>¿Cuántos pasajes?</span>
                      <div className="cantidad-botones">
                        {Array.from({ length: MAX_PASAJES }).map((_, i) => (
                          <button key={i + 1} type="button"
                                  className={`cantidad-btn ${cantidad === i + 1 ? "activo" : ""}`}
                                  onClick={() => setCantidad(i + 1)}>
                            {i + 1}
                          </button>
                        ))}
                      </div>
                    </div>
                    <p className="muted center" style={{ marginTop: 4 }}>
                      {faltan > 0
                        ? `Elige ${faltan} asiento${faltan > 1 ? "s" : ""} más (${seleccionados.length}/${cantidad}).`
                        : `Listo: ${cantidad} asiento${cantidad > 1 ? "s" : ""} elegido${cantidad > 1 ? "s" : ""}.`}
                    </p>
                    <MapaAsientos viaje={viaje} seleccionados={seleccionados} onToggle={toggleAsiento} max={cantidad} />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 22 }}>
                      <button className="btn btn-ghost" onClick={() => setPaso(0)}>Volver</button>
                      <button className="btn btn-primary" disabled={seleccionados.length !== cantidad} onClick={continuarAsiento}>Continuar</button>
                    </div>
                  </div>
                )}
                {paso === 2 && (
                  <div className="card">
                    {seleccionados.map((a, i) => (
                      <div key={a.numero} style={{ marginBottom: 18 }}>
                        <FormularioPasajero
                          titulo={`Pasajero ${i + 1} · Asiento #${a.numero} (${a.tipo})`}
                          pasajero={pasajeros[i] || PASAJERO_INICIAL}
                          setPasajero={(p) => setPasajeroEn(i, p)}
                        />
                      </div>
                    ))}
                    <FormularioContacto contacto={contacto} setContacto={setContacto} />
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
                      Elige cómo pagar. Retenemos {cantidad > 1 ? "tus asientos" : "tu asiento"} por 15 minutos
                      mientras completas el pago.
                    </p>

                    {!formularioVisible && (
                      <div className="metodos-pago">
                        <button type="button"
                                className={`metodo ${metodo === "tarjeta" ? "activo" : ""}`}
                                onClick={() => { setMetodo("tarjeta"); setErrorPago(null); }}
                                disabled={pagando}>
                          <LogoPasarela archivo="izipay.png" alt="Izipay" respaldo="💳" />
                          <span className="metodo-nombre">Tarjeta</span>
                          <span className="metodo-detalle">Débito o crédito</span>
                        </button>
                        <button type="button"
                                className={`metodo ${metodo === "yape" ? "activo" : ""}`}
                                onClick={() => { setMetodo("yape"); setErrorPago(null); }}
                                disabled={pagando}>
                          <LogoPasarela archivo="yape.png" alt="Yape" respaldo="📱" />
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
                        <strong> simula</strong> (no se cobra). Igual se generan tus boletos con QR.
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
              <Resumen viaje={viaje} asientos={seleccionados} />
            </div>
          )}

          {paso === 4 && <Confirmacion data={confirmacion} />}
        </div>
      </section>
      <Footer />
    </>
  );
}
