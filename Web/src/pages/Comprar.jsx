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
import { buscarViajes, crearReserva, pagarReserva, formularioDePago } from "../services/publicApi";
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

  const pagar = async () => {
    setPagando(true); setErrorPago(null);
    try {
      const reservaBody = {
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
      };
      const reserva = await crearReserva(reservaBody, tokenCliente());

      // El backend pide el formulario a Izipay; el cliente escribe su tarjeta dentro
      // de ese formulario y nos devuelve la respuesta firmada, que el servidor verifica.
      const form = await formularioDePago(reserva.reservaId);
      setSimulado(!!form.simulado);
      const respuesta = await pagarConIzipay({ ...form, contenedor: "#izipay-form" });
      const conf = await pagarReserva(reserva.reservaId, respuesta);
      limpiarIzipay("#izipay-form");
      setConfirmacion(conf);
      setPaso(4);
      scrollTop();
    } catch (e) {
      setErrorPago(e.message);
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
                      Pago seguro con <strong>Izipay</strong>. Al confirmar retenemos tu
                      asiento por 15 minutos mientras completas el pago.
                    </p>
                    {simulado && (
                      <div className="alert alert-warn" style={{ marginTop: 12 }}>
                        Modo prueba: faltan las credenciales de Izipay, así que el pago se
                        <strong> simula</strong> (no se cobra). Igual se genera tu boleto con QR.
                      </div>
                    )}
                    {/* Izipay dibuja acá su formulario de tarjeta */}
                    <div id="izipay-form" style={{ marginTop: 16 }} />
                    {errorPago && <div className="alert alert-warn" style={{ marginTop: 12 }}>{errorPago}</div>}
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 22 }}>
                      <button className="btn btn-ghost" onClick={() => setPaso(2)} disabled={pagando}>Volver</button>
                      <button className="btn btn-primary" onClick={pagar} disabled={pagando}>
                        {pagando ? "Procesando…" : "Pagar ahora"}
                      </button>
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
