import { useState, useEffect } from "react";
import "./Manifiesto.css";
import generarManifiestoCargaPDF from "./generarManifiestoCargaPDF.jsx";
import SelectorViaje from "../../../Components/SelectorViaje.jsx";
import { apiFetch } from "../../../Services/api.js";

const ESTADO_LABEL = {
    REGISTRADO: "Registrado", EN_TRANSITO: "En tránsito",
    ENTREGADO: "Entregado", DEVUELTO: "Devuelto",
};
const ESTADO_BADGE = {
    REGISTRADO: "badge-pendiente", EN_TRANSITO: "badge-pendiente",
    ENTREGADO: "badge-embarcado", DEVUELTO: "badge-pendiente",
};
const PAGO_LABEL = { PAGADO: "Pagado", PENDIENTE: "Pendiente", PAGA_DESTINO: "Paga en destino" };

/**
 * Manifiesto de carga: la lista de encomiendas que lleva un viaje. Es el
 * equivalente del manifiesto de pasajeros, pero para la carga; sirve para que
 * la tripulación sepa qué bultos van a bordo y en qué parada baja cada uno.
 */
function ManifiestoCarga() {
    const [viajes, setViajes]         = useState([]);
    const [viajeId, setViajeId]       = useState("");
    const [encomiendas, setEncomiendas] = useState([]);

    const [cargandoViajes, setCargandoViajes] = useState(true);
    const [cargando, setCargando]     = useState(false);
    const [error, setError]           = useState(null);
    const [generandoPdf, setGenerandoPdf] = useState(false);

    useEffect(() => { fetchViajes(); }, []);
    useEffect(() => { if (viajeId) fetchEncomiendas(); }, [viajeId]);

    const fetchViajes = async () => {
        setCargandoViajes(true);
        try {
            const data = await apiFetch("/api/viajes");
            setViajes(data
                .filter(v => v.estado !== "CANCELADO")
                .sort((a, b) => (b.fechaSalida + b.horaSalida).localeCompare(a.fechaSalida + a.horaSalida)));
        } catch (err) { console.error(err); }
        finally { setCargandoViajes(false); }
    };

    const fetchEncomiendas = async () => {
        setCargando(true);
        setError(null);
        try {
            setEncomiendas(await apiFetch(`/api/encomiendas/viaje/${viajeId}`));
        } catch (err) { setError(err.message); }
        finally { setCargando(false); }
    };

    const viajeSeleccionado = viajes.find(v => v.id === viajeId);

    const totalBultos = encomiendas.length;
    const pesoTotal   = encomiendas.reduce((s, e) => s + (Number(e.peso) || 0), 0);
    const montoTotal  = encomiendas.reduce((s, e) => s + (Number(e.precio) || 0), 0);
    const porCobrar   = encomiendas
        .filter(e => e.estadoPago && e.estadoPago !== "PAGADO")
        .reduce((s, e) => s + (Number(e.precio) || 0), 0);

    const descargarPdf = async () => {
        if (!viajeSeleccionado || encomiendas.length === 0) return;
        setGenerandoPdf(true);
        try { await generarManifiestoCargaPDF(viajeSeleccionado, encomiendas); }
        finally { setGenerandoPdf(false); }
    };

    return (
        <div className="manifiesto-page">

            <div className="manifiesto-header">
                <div>
                    <h2>Manifiesto de Carga</h2>
                    <p>Encomiendas que lleva cada viaje y en qué parada baja cada bulto</p>
                </div>
                {viajeSeleccionado && encomiendas.length > 0 && (
                    <button className="btn-descargar" onClick={descargarPdf} disabled={generandoPdf}>
                        {generandoPdf
                            ? <><i className="ti ti-loader-2 spin"></i> Generando...</>
                            : <><i className="ti ti-file-download"></i> Descargar PDF</>}
                    </button>
                )}
            </div>

            <div className="manifiesto-controles">
                <div className="control-grupo">
                    <label>Seleccionar Viaje</label>
                    <SelectorViaje
                        viajes={viajes}
                        value={viajeId}
                        onChange={setViajeId}
                        cargando={cargandoViajes}
                    />
                </div>
            </div>

            {!viajeId && (
                <div className="manifiesto-vacio">
                    <i className="ti ti-package"></i>
                    <span>Selecciona un viaje para ver su carga</span>
                </div>
            )}

            {cargando && (
                <div className="manifiesto-estado">
                    <i className="ti ti-loader-2 spin"></i>
                    <span>Cargando encomiendas...</span>
                </div>
            )}

            {error && !cargando && (
                <div className="manifiesto-estado error">
                    <i className="ti ti-alert-circle"></i>
                    <span>{error}</span>
                </div>
            )}

            {!cargando && !error && viajeSeleccionado && (
                <>
                    <div className="manifiesto-ficha">
                        <div className="ficha-item">
                            <span className="ficha-label">Código de viaje</span>
                            <strong>{viajeSeleccionado.codigoViaje}</strong>
                        </div>
                        <div className="ficha-item">
                            <span className="ficha-label">Ruta</span>
                            <strong>{viajeSeleccionado.rutaNombre}</strong>
                        </div>
                        <div className="ficha-item">
                            <span className="ficha-label">Fecha / Hora</span>
                            <strong>{viajeSeleccionado.fechaSalida} — {viajeSeleccionado.horaSalida}</strong>
                        </div>
                        <div className="ficha-item">
                            <span className="ficha-label">Embarcación</span>
                            <strong>{viajeSeleccionado.embarcacionNombre}</strong>
                        </div>
                    </div>

                    <div className="manifiesto-resumen">
                        <div className="resumen-card">
                            <i className="ti ti-package"></i>
                            <div>
                                <span className="resumen-label">Bultos</span>
                                <span className="resumen-valor">{totalBultos}</span>
                            </div>
                        </div>
                        <div className="resumen-card morado">
                            <i className="ti ti-weight"></i>
                            <div>
                                <span className="resumen-label">Peso total</span>
                                <span className="resumen-valor">{pesoTotal ? `${pesoTotal.toFixed(2)} kg` : "—"}</span>
                            </div>
                        </div>
                        <div className="resumen-card verde">
                            <i className="ti ti-cash"></i>
                            <div>
                                <span className="resumen-label">Monto total</span>
                                <span className="resumen-valor">S/ {montoTotal.toFixed(2)}</span>
                            </div>
                        </div>
                        <div className="resumen-card amarillo">
                            <i className="ti ti-alert-circle"></i>
                            <div>
                                <span className="resumen-label">Por cobrar</span>
                                <span className="resumen-valor">S/ {porCobrar.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {encomiendas.length === 0 ? (
                        <div className="manifiesto-vacio">
                            <i className="ti ti-package-off"></i>
                            <span>Este viaje no tiene encomiendas asignadas</span>
                        </div>
                    ) : (
                        <div className="manifiesto-tabla-wrapper">
                            <table className="manifiesto-tabla">
                                <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Código</th>
                                    <th>Remitente</th>
                                    <th>Destinatario</th>
                                    <th>Contenido</th>
                                    <th>Peso</th>
                                    <th>Baja en</th>
                                    <th>Precio</th>
                                    <th>Pago</th>
                                    <th>Estado</th>
                                </tr>
                                </thead>
                                <tbody>
                                {encomiendas.map((e, i) => (
                                    <tr key={e.id}>
                                        <td className="col-numero">{i + 1}</td>
                                        <td className="codigo"><strong>{e.codigoEncomienda}</strong></td>
                                        <td>
                                            <div className="pasajero-info">
                                                <strong>{e.remitenteNombre}</strong>
                                                {e.remitenteTelefono && <span>{e.remitenteTelefono}</span>}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="pasajero-info">
                                                <strong>{e.destinatarioNombre}</strong>
                                                {e.destinatarioTelefono && <span>{e.destinatarioTelefono}</span>}
                                            </div>
                                        </td>
                                        <td className="col-observacion">{e.descripcion || "—"}</td>
                                        <td>{e.peso ? `${e.peso} kg` : "—"}</td>
                                        <td>
                                            <strong>{e.paradaDestino || e.sucursalDestinoNombre || "—"}</strong>
                                        </td>
                                        <td><strong>S/ {Number(e.precio || 0).toFixed(2)}</strong></td>
                                        <td>
                                            <span className={`badge ${e.estadoPago === "PAGADO" ? "badge-embarcado" : "badge-pendiente"}`}>
                                                {PAGO_LABEL[e.estadoPago] || "Pagado"}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${ESTADO_BADGE[e.estado] || "badge-pendiente"}`}>
                                                {ESTADO_LABEL[e.estado] || e.estado}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default ManifiestoCarga;
