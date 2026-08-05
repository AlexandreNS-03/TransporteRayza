import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Buscador from "../components/Buscador";
import Resultados from "../components/Resultados";
import MapaAsientos from "../components/MapaAsientos";
import SelectorPasajeros from "../components/SelectorPasajeros";
import FormularioPasajero, { FormularioContacto } from "../components/FormularioPasajero";
import Confirmacion from "../components/Confirmacion";
import LogoPasarela from "../components/LogoPasarela";
import { buscarViajes, crearReservaGrupo, pagarGrupo, formularioDePagoGrupo,
         metodosDePago, pagarConYapeGrupo, avisarAbandono, soles } from "../services/publicApi";
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

const precioAsiento = (viaje, a) => Number(((a?.tipo === "VIP" ? viaje?.precioVip : viaje?.precioNormal) ?? viaje?.precioNormal) || 0);
const totalLeg = (viaje, asientos) => asientos.reduce((s, a) => s + precioAsiento(viaje, a), 0);

/** Resumen lateral: muestra la ida y, si es ida y vuelta, también la vuelta. */
function ResumenCompra({ ida, vuelta, esRedondo, bebes }) {
  const viaje = ida.viaje;
  if (!viaje) return null;
  const totalIda = totalLeg(ida.viaje, ida.asientos);
  const totalVuelta = esRedondo && vuelta.viaje ? totalLeg(vuelta.viaje, vuelta.asientos) : 0;

  const Bloque = ({ tag, leg }) => leg.viaje && (
    <div className="resumen-leg">
      <div className="resumen-leg-tit"><span className="leg-tag">{tag}</span> {leg.viaje.origen} → {leg.viaje.destino}</div>
      <div className="linea"><span>Fecha</span><span>{leg.viaje.fechaSalida} · {leg.viaje.horaSalida ? leg.viaje.horaSalida.slice(0,5) : "—"} h</span></div>
      {leg.asientos.map((a) => (
        <div className="linea" key={a.numero}><span>Asiento #{a.numero} · {a.tipo}</span><span>{soles(precioAsiento(leg.viaje, a))}</span></div>
      ))}
    </div>
  );

  return (
    <aside className="resumen">
      <h3>Resumen</h3>
      <Bloque tag="Ida" leg={ida} />
      {esRedondo && <Bloque tag="Vuelta" leg={vuelta} />}
      {bebes > 0 && <div className="linea"><span>Bebés (en brazos)</span><span>{bebes} · gratis</span></div>}
      <div className="total"><span>Total</span><span>{soles(totalIda + totalVuelta)}</span></div>
    </aside>
  );
}

export default function Comprar() {
  const [sp] = useSearchParams();
  const [paso, setPaso] = useState(0);
  const [leg, setLeg] = useState("ida");                 // "ida" | "vuelta"

  const [criterio, setCriterio] = useState({ origen: "", destino: "", fecha: "", fechaRetorno: "" });
  const esRedondo = !!criterio.fechaRetorno;

  const [viajes, setViajes] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const [pax, setPax] = useState({ adultos: 1, ninos: 0, bebes: 0 });
  const asientos = pax.adultos + pax.ninos;

  const [ida, setIda] = useState({ viaje: null, asientos: [] });
  const [vuelta, setVuelta] = useState({ viaje: null, asientos: [] });
  const [pasajeros, setPasajeros] = useState([{ ...PASAJERO_INICIAL }]);
  const [contacto, setContacto] = useState(CONTACTO_INICIAL);

  const [pagando, setPagando] = useState(false);
  const [errorPago, setErrorPago] = useState(null);
  const [confirmacion, setConfirmacion] = useState(null);
  const [formularioVisible, setFormularioVisible] = useState(false);
  const [metodo, setMetodo] = useState("tarjeta");
  const [metodos, setMetodos] = useState(null);
  const [yapeDatos, setYapeDatos] = useState({ phoneNumber: "", otp: "" });
  const [reservaIda, setReservaIda] = useState(null);
  const [reservaVuelta, setReservaVuelta] = useState(null);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  const invalidarReservas = () => { setReservaIda(null); setReservaVuelta(null); };

  const legSel = leg === "ida" ? ida : vuelta;
  const setLegSel = leg === "ida" ? setIda : setVuelta;

  const buscarLeg = async (origen, destino, fecha) => {
    setCargando(true); setError(null); setViajes(null);
    try { setViajes(await buscarViajes({ origen, destino, fecha })); }
    catch (e) { setError(e.message); }
    finally { setCargando(false); }
  };

  const iniciarBusqueda = (params) => {
    const crit = {
      origen: params.origen || "", destino: params.destino || "",
      fecha: params.fecha || "", fechaRetorno: params.fechaRetorno || "",
    };
    setCriterio(crit);
    setLeg("ida");
    setIda({ viaje: null, asientos: [] });
    setVuelta({ viaje: null, asientos: [] });
    invalidarReservas();
    setPaso(0);
    buscarLeg(crit.origen, crit.destino, crit.fecha);
  };

  // Al entrar con parámetros en la URL (desde el buscador del inicio).
  useEffect(() => {
    const p = {
      origen: sp.get("origen") || "", destino: sp.get("destino") || "",
      fecha: sp.get("fecha") || "", fechaRetorno: sp.get("fechaRetorno") || "",
    };
    if (p.origen || p.destino || p.fecha) iniciarBusqueda(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cambiar la cantidad de asientos ajusta pasajeros y limpia lo elegido en ambos viajes.
  useEffect(() => {
    setPasajeros((prev) => {
      const arr = prev.slice(0, asientos);
      while (arr.length < asientos) arr.push({ ...PASAJERO_INICIAL });
      return arr;
    });
    setIda((p) => ({ ...p, asientos: [] }));
    setVuelta((p) => ({ ...p, asientos: [] }));
    invalidarReservas();
  }, [asientos]);

  const elegirViaje = (v) => {
    setLegSel({ viaje: v, asientos: [] });
    invalidarReservas();
    setPaso(1); scrollTop();
  };

  const toggleAsiento = (a) => {
    invalidarReservas();
    setLegSel((prev) => {
      const ya = prev.asientos.some((s) => s.numero === a.numero);
      let arr;
      if (ya) arr = prev.asientos.filter((s) => s.numero !== a.numero);
      else if (prev.asientos.length >= asientos) arr = prev.asientos;
      else arr = [...prev.asientos, a];
      return { ...prev, asientos: arr };
    });
  };

  const setPasajeroEn = (i, p) => setPasajeros((prev) => prev.map((x, j) => (j === i ? p : x)));
  const tipoPasajero = (i) => (i < pax.adultos ? "Adulto" : "Niño");

  const vueltaCompleta = esRedondo && vuelta.viaje && vuelta.asientos.length === asientos;

  const continuarAsiento = () => {
    if (legSel.asientos.length !== asientos) return;
    if (leg === "ida" && esRedondo && !vueltaCompleta) {
      setLeg("vuelta"); setPaso(0);
      buscarLeg(criterio.destino, criterio.origen, criterio.fechaRetorno);
    } else {
      setPaso(2);
    }
    scrollTop();
  };

  const volverAIda = () => { setLeg("ida"); setPaso(1); scrollTop(); };

  const continuarDatos = () => { if (datosValidos()) { setPaso(3); scrollTop(); } };

  const datosValidos = () => {
    for (let i = 0; i < asientos; i++) {
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

  useEffect(() => {
    if (paso === 3 && !metodos) metodosDePago().then(setMetodos).catch(() => {});
  }, [paso, metodos]);

  /**
   * Si el cliente cierra la pestaña con el pago empezado, avisamos al servidor para
   * que le llegue el correo con el enlace para terminarlo. Sin esto habría que
   * esperar al recordatorio automático, que tarda unos minutos.
   *
   * Solo aplica en el paso de pago y con reservas ya creadas: antes de eso no hay
   * ningún asiento retenido que se pueda perder.
   */
  useEffect(() => {
    if (paso !== 3) return;
    const alSalir = () => {
      if (confirmacion) return;                    // ya pagó, no hay nada pendiente
      avisarAbandono([...(reservaIda?.reservaIds || []), ...(reservaVuelta?.reservaIds || [])]);
    };
    window.addEventListener("pagehide", alSalir);
    return () => window.removeEventListener("pagehide", alSalir);
  }, [paso, reservaIda, reservaVuelta, confirmacion]);

  const pasajeroData = (i) => ({
    tipoDocumento: pasajeros[i]?.tipoDocumento || "DNI",
    pasajeroNombre: pasajeros[i]?.pasajeroNombre || "",
    pasajeroDocumento: pasajeros[i]?.pasajeroDocumento || "",
    pasajeroTelefono: pasajeros[i]?.pasajeroTelefono || "",
    edad: pasajeros[i]?.edad ? Number(pasajeros[i].edad) : null,
    sexo: pasajeros[i]?.sexo || "Masculino",
  });

  const datosLeg = (viaje, asientosLeg) => ({
    viajeId: viaje.id,
    ordenOrigen: viaje.ordenOrigen,
    ordenDestino: viaje.ordenDestino,
    paradaOrigen: viaje.origen,
    paradaDestino: viaje.destino,
    clienteEmail: contacto.clienteEmail,
    tipoComprobante: contacto.tipoComprobante,
    clienteNombre: contacto.clienteNombre,
    clienteDocumento: contacto.clienteDocumento,
    pasajeros: asientosLeg.map((a, i) => ({
      asientoNumero: a.numero, asientoTipo: a.tipo, ...pasajeroData(i),
    })),
  });

  const vigente = (r) => r && (!r.expiraEn || new Date(r.expiraEn) > new Date());

  /**
   * Crea (si hace falta) las reservas de ida y de vuelta y devuelve TODAS las reservas
   * juntas. El pago de grupo cobra el total de la lista en una sola operación, aunque
   * las reservas sean de viajes distintos.
   */
  const obtenerReservas = async () => {
    let ri = reservaIda;
    if (!vigente(ri)) { ri = await crearReservaGrupo(datosLeg(ida.viaje, ida.asientos), tokenCliente()); setReservaIda(ri); }
    const ids = [...ri.reservaIds];
    if (esRedondo) {
      let rv = reservaVuelta;
      if (!vigente(rv)) { rv = await crearReservaGrupo(datosLeg(vuelta.viaje, vuelta.asientos), tokenCliente()); setReservaVuelta(rv); }
      ids.push(...rv.reservaIds);
    }
    return ids;
  };

  const volverAlPagoDesde = (n) => { invalidarReservas(); setErrorPago(null); setPaso(n); };
  const terminar = (conf) => { invalidarReservas(); setConfirmacion(conf); setPaso(4); scrollTop(); };

  const pagarConYape = async () => {
    setPagando(true); setErrorPago(null);
    try {
      const cfg = metodos?.yape || {};
      const token = await tokenizarYape({
        publicKey: cfg.publicKey, simulado: cfg.simulado,
        otp: yapeDatos.otp.trim(), phoneNumber: yapeDatos.phoneNumber.trim(),
      });
      const ids = await obtenerReservas();
      terminar(await pagarConYapeGrupo(ids, token));
    } catch (e) { setErrorPago(e.message); }
    finally { setPagando(false); }
  };

  const pagar = async () => {
    setPagando(true); setErrorPago(null);
    try {
      const ids = await obtenerReservas();
      const form = await formularioDePagoGrupo(ids);
      const respuesta = await pagarConIzipay({
        ...form, contenedor: "#izipay-form",
        alMostrarFormulario: () => setFormularioVisible(true),
      });
      setFormularioVisible(false);
      const conf = await pagarGrupo(ids, respuesta);
      limpiarIzipay("#izipay-form");
      terminar(conf);
    } catch (e) {
      setErrorPago(e.message); setFormularioVisible(false); limpiarIzipay("#izipay-form");
    } finally { setPagando(false); }
  };

  const faltan = asientos - legSel.asientos.length;
  const legActivoViaje = legSel.viaje;

  return (
    <>
      <Header />
      <section className="section">
        <div className="wrap">
          <div className="section-head" style={{ marginBottom: 8 }}>
            <div className="kicker">Compra de pasajes</div>
            <h2>Reserva tu viaje{esRedondo ? " (ida y vuelta)" : ""}</h2>
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
              {leg === "ida" ? (
                <Buscador onBuscar={iniciarBusqueda} valorInicial={criterio} />
              ) : (
                <div className="leg-banner">
                  <div>
                    <span className="leg-tag">Vuelta</span> Elige tu viaje de regreso:{" "}
                    <strong>{criterio.destino} → {criterio.origen}</strong>
                    {criterio.fechaRetorno ? ` · ${criterio.fechaRetorno}` : ""}
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={volverAIda}>Volver a la ida</button>
                </div>
              )}
              <div style={{ marginTop: 28 }}>
                <Resultados viajes={viajes} cargando={cargando} error={error} onElegir={elegirViaje} />
              </div>
            </>
          )}

          {paso >= 1 && paso <= 3 && legActivoViaje && (
            <div className="compra-layout">
              <div>
                {(paso === 1 || (paso >= 2)) && esRedondo && (
                  <div className="leg-banner" style={{ marginBottom: 16 }}>
                    <div>
                      <span className="leg-tag">Ida</span> {ida.viaje?.origen} → {ida.viaje?.destino}
                      {vuelta.viaje && <> &nbsp;·&nbsp; <span className="leg-tag">Vuelta</span> {vuelta.viaje.origen} → {vuelta.viaje.destino}</>}
                    </div>
                  </div>
                )}

                {paso === 1 && (
                  <div className="card">
                    <h3 style={{ marginTop: 0 }}>
                      Asientos · {leg === "ida" ? "Ida" : "Vuelta"}: {legActivoViaje.origen} → {legActivoViaje.destino}
                    </h3>
                    {leg === "ida" && (
                      <div style={{ maxWidth: 360, margin: "0 auto 6px" }}>
                        <SelectorPasajeros valor={pax} onChange={(v) => { setPax(v); invalidarReservas(); }} maxAsientos={MAX_PASAJES} />
                      </div>
                    )}
                    <p className="muted center" style={{ marginTop: 4 }}>
                      {faltan > 0
                        ? `Elige ${faltan} asiento${faltan > 1 ? "s" : ""} más (${legSel.asientos.length}/${asientos}).`
                        : `Listo: ${asientos} asiento${asientos > 1 ? "s" : ""}.`}
                      {leg === "ida" && pax.bebes > 0 && ` + ${pax.bebes} bebé${pax.bebes > 1 ? "s" : ""} en brazos.`}
                    </p>
                    <MapaAsientos viaje={legActivoViaje} seleccionados={legSel.asientos} onToggle={toggleAsiento} max={asientos} />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 22 }}>
                      <button className="btn btn-ghost" onClick={() => { setPaso(0); }}>Volver</button>
                      <button className="btn btn-primary" disabled={legSel.asientos.length !== asientos} onClick={continuarAsiento}>
                        {leg === "ida" && esRedondo && !vueltaCompleta ? "Elegir vuelta" : "Continuar"}
                      </button>
                    </div>
                  </div>
                )}

                {paso === 2 && (
                  <div className="card">
                    {pasajeros.map((_, i) => (
                      <div key={i} style={{ marginBottom: 18 }}>
                        <FormularioPasajero
                          titulo={`${tipoPasajero(i)} ${i + 1}`
                            + ` · Ida #${ida.asientos[i]?.numero ?? "?"}`
                            + (esRedondo ? ` · Vuelta #${vuelta.asientos[i]?.numero ?? "?"}` : "")}
                          pasajero={pasajeros[i] || PASAJERO_INICIAL}
                          setPasajero={(p) => setPasajeroEn(i, p)}
                        />
                      </div>
                    ))}
                    <FormularioContacto contacto={contacto} setContacto={setContacto} />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 22 }}>
                      <button className="btn btn-ghost" onClick={() => { setLeg(esRedondo ? "vuelta" : "ida"); setPaso(1); }}>Volver</button>
                      <button className="btn btn-primary" onClick={continuarDatos}>Continuar al pago</button>
                    </div>
                  </div>
                )}

                {paso === 3 && (
                  <div className="card">
                    <h3>Pago en línea</h3>
                    <p className="muted" style={{ marginTop: 6 }}>
                      Elige cómo pagar. Retenemos tus asientos por 15 minutos mientras completas el pago.
                    </p>

                    {!formularioVisible && (
                      <div className="metodos-pago">
                        <button type="button" className={`metodo ${metodo === "tarjeta" ? "activo" : ""}`}
                                onClick={() => { setMetodo("tarjeta"); setErrorPago(null); }} disabled={pagando}>
                          <LogoPasarela archivo="izipay.png" alt="Izipay" respaldo="💳" />
                          <span className="metodo-nombre">Tarjeta</span>
                          <span className="metodo-detalle">Débito o crédito</span>
                        </button>
                        <button type="button" className={`metodo ${metodo === "yape" ? "activo" : ""}`}
                                onClick={() => { setMetodo("yape"); setErrorPago(null); }} disabled={pagando}>
                          <LogoPasarela archivo="yape.png" alt="Yape" respaldo="📱" />
                          <span className="metodo-nombre">Yape</span>
                          <span className="metodo-detalle">Con tu celular</span>
                        </button>
                      </div>
                    )}

                    {metodo === "yape" && (
                      <div className="yape-form">
                        <p className="muted" style={{ fontSize: 13 }}>
                          En tu app de Yape entra a <strong>Aprobar compra por internet</strong> y genera el código de 6 dígitos.
                        </p>
                        {metodos?.yape?.prueba && (
                          <div className="alert alert-warn" style={{ fontSize: 13 }}>
                            Modo de prueba: usa el celular <strong>111111111</strong> con el código <strong>123456</strong>.
                          </div>
                        )}
                        <label>CELULAR
                          <input type="tel" inputMode="numeric" maxLength={9} placeholder="9XXXXXXXX"
                                 value={yapeDatos.phoneNumber} disabled={pagando}
                                 onChange={e => setYapeDatos(d => ({ ...d, phoneNumber: e.target.value.replace(/\D/g, "") }))} />
                        </label>
                        <label>CÓDIGO DE APROBACIÓN
                          <input inputMode="numeric" maxLength={6} placeholder="6 dígitos"
                                 value={yapeDatos.otp} disabled={pagando}
                                 onChange={e => setYapeDatos(d => ({ ...d, otp: e.target.value.replace(/\D/g, "") }))} />
                        </label>
                      </div>
                    )}

                    {((metodo === "tarjeta" && metodos?.tarjeta?.simulado) ||
                      (metodo === "yape" && metodos?.yape?.simulado)) && (
                      <div className="alert alert-warn" style={{ marginTop: 12 }}>
                        Modo prueba: el pago se <strong>simula</strong> (no se cobra). Igual se generan tus boletos con QR.
                      </div>
                    )}

                    <div id="izipay-form" style={{ marginTop: 16 }} />
                    {errorPago && <div className="alert alert-warn" style={{ marginTop: 12 }}>{errorPago}</div>}
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 22 }}>
                      <button className="btn btn-ghost" onClick={() => volverAlPagoDesde(2)} disabled={pagando}>Volver</button>
                      {!formularioVisible && (
                        <button className="btn btn-primary" disabled={pagando}
                                onClick={metodo === "yape" ? pagarConYape : pagar}>
                          {pagando ? (metodo === "yape" ? "Cobrando…" : "Abriendo el pago…")
                                   : (metodo === "yape" ? "Pagar con Yape" : "Pagar con tarjeta")}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <ResumenCompra ida={ida} vuelta={vuelta} esRedondo={esRedondo} bebes={pax.bebes} />
            </div>
          )}

          {paso === 4 && <Confirmacion data={confirmacion} />}
        </div>
      </section>
      <Footer />
    </>
  );
}
