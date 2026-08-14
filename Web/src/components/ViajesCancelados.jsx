import { useState, useEffect } from "react";
import "./ViajesCancelados.css";
import { getSaldo, getPorResolver, guardarComoSaldo, reprogramarPasaje } from "../services/authCliente";
import { buscarViajes, soles } from "../services/publicApi";

/**
 * Lo que ve el cliente cuando le cancelan un viaje: su saldo a favor y los
 * pasajes que esperan una decisión suya (cambiar de fecha o guardar el monto).
 */
export default function ViajesCancelados() {
  const [saldo, setSaldo] = useState(0);
  const [movs, setMovs] = useState([]);
  const [pendientes, setPendientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);

  // Cambio de fecha
  const [eligiendo, setEligiendo] = useState(null);
  const [opciones, setOpciones] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [procesando, setProcesando] = useState(null);
  const [aviso, setAviso] = useState(null);

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    setCargando(true);
    setErrorCarga(false);
    try {
      const [s, p] = await Promise.all([getSaldo(), getPorResolver()]);
      setSaldo(Number(s?.saldo) || 0);
      setMovs(s?.movimientos || []);
      setPendientes(p || []);
    } catch {
      setErrorCarga(true);
    } finally {
      setCargando(false);
    }
  };

  const abrirOpciones = async (v) => {
    setEligiendo(v);
    setOpciones([]);
    setBuscando(true);
    try {
      const res = await buscarViajes({ origen: v.paradaOrigen, destino: v.paradaDestino });
      setOpciones((res || []).filter(x => x.id !== v.viajeId));
    } catch { setOpciones([]); }
    finally { setBuscando(false); }
  };

  const confirmarCambio = async (viajeId) => {
    setProcesando(eligiendo.id);
    try {
      await reprogramarPasaje(eligiendo.id, viajeId);
      setAviso({ tipo: "ok", texto: "Listo, tu pasaje quedó en la nueva fecha." });
      setEligiendo(null);
      cargar();
    } catch (e) {
      setAviso({ tipo: "error", texto: e?.response?.data?.message || "No se pudo cambiar la fecha." });
    } finally { setProcesando(null); }
  };

  const aSaldo = async (v) => {
    setProcesando(v.id);
    try {
      await guardarComoSaldo(v.id);
      setAviso({ tipo: "ok", texto: `Guardamos ${soles(v.precio)} como saldo a favor.` });
      cargar();
    } catch (e) {
      setAviso({ tipo: "error", texto: e?.response?.data?.message || "No se pudo guardar el saldo." });
    } finally { setProcesando(null); }
  };

  if (cargando) return <p className="vc-cargando">Cargando…</p>;
  if (errorCarga) {
    return (
      <div className="vc-aviso error">
        No pudimos cargar tu saldo ni tus viajes cancelados.
        <button className="vc-reintentar" onClick={cargar}>Reintentar</button>
      </div>
    );
  }
  if (saldo <= 0 && pendientes.length === 0) return null;

  return (
    <div className="vc">
      {aviso && (
        <div className={`vc-aviso ${aviso.tipo}`}>
          {aviso.texto}
          <button onClick={() => setAviso(null)} aria-label="Cerrar">×</button>
        </div>
      )}

      {saldo > 0 && (
        <div className="vc-saldo">
          <div>
            <span>Saldo a favor</span>
            <strong>{soles(saldo)}</strong>
          </div>
          <p>Lo puedes usar en tu próxima compra. Menciónalo al comprar en agencia o escríbenos.</p>
          {movs.length > 0 && (
            <ul className="vc-movs">
              {movs.slice(0, 4).map(m => (
                <li key={m.id}>
                  <span>{m.motivo}</span>
                  <b className={Number(m.monto) >= 0 ? "mas" : "menos"}>
                    {Number(m.monto) >= 0 ? "+" : ""}{soles(m.monto)}
                  </b>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {pendientes.length > 0 && (
        <div className="vc-pendientes">
          <h3>Viaje cancelado — elige qué hacer</h3>
          <p className="vc-sub">
            Lamentamos el inconveniente. Tu dinero está seguro: puedes cambiar la fecha
            o guardarlo como saldo para después.
          </p>

          {pendientes.map(v => (
            <div className="vc-card" key={v.id}>
              <div className="vc-card-top">
                <div>
                  <strong>{v.paradaOrigen} → {v.paradaDestino}</strong>
                  <span className="vc-cod">{v.viajeCodigo}</span>
                </div>
                <b className="vc-monto">{soles(v.precio)}</b>
              </div>

              {eligiendo?.id === v.id ? (
                <div className="vc-opciones">
                  <div className="vc-opciones-head">
                    <strong>Elige la nueva fecha</strong>
                    <button className="vc-volver" onClick={() => setEligiendo(null)}>Volver</button>
                  </div>
                  {buscando && <p className="vc-cargando">Buscando viajes…</p>}
                  {!buscando && opciones.length === 0 && (
                    <p className="vc-vacio">
                      No hay otros viajes disponibles en esta ruta por ahora.
                      Puedes guardar el monto como saldo.
                    </p>
                  )}
                  {opciones.map(o => (
                    <button key={o.id} className="vc-opcion"
                            disabled={procesando === v.id}
                            onClick={() => confirmarCambio(o.id)}>
                      <span className="vc-hora">{(o.horaSalida || "").slice(0, 5)}</span>
                      <span className="vc-info">
                        <strong>{o.fechaSalida}</strong>
                        <small>{o.embarcacionNombre || o.rutaNombre}</small>
                      </span>
                      <span className="vc-elegir">Elegir</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="vc-acciones">
                  <button className="btn btn-primary" disabled={procesando === v.id}
                          onClick={() => abrirOpciones(v)}>
                    Cambiar de fecha
                  </button>
                  <button className="btn btn-ghost" disabled={procesando === v.id}
                          onClick={() => aSaldo(v)}>
                    Guardar como saldo
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
