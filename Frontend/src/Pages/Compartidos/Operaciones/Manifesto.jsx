import { useState, useEffect } from "react";
import "./Manifiesto.css";
import generarManifiestoPDF    from "./generarManifiestoPDF.jsx";

import { apiFetch } from "../../../Services/api.js";

function Manifiesto() {
    const [viajes, setViajes]       = useState([]);
    const [viajeId, setViajeId]     = useState("");
    const [pasajeros, setPasajeros] = useState([]);
    const [capacidad, setCapacidad] = useState(null);

    const [cargandoViajes, setCargandoViajes] = useState(true);
    const [cargando, setCargando]   = useState(false);
    const [error, setError]         = useState(null);
    const [generandoPdf, setGenerandoPdf] = useState(false);

    useEffect(() => { fetchViajes(); }, []);
    useEffect(() => { if (viajeId) fetchDatosViaje(); }, [viajeId]);

    const fetchViajes = async () => {
        setCargandoViajes(true);
        try {
            const data = await apiFetch("/api/viajes");
            // Excluye cancelados; incluye programados, en curso y completados (para reimprimir)
            const filtrados = data
                .filter(v => v.estado !== "CANCELADO")
                .sort((a, b) => (b.fechaSalida + b.horaSalida).localeCompare(a.fechaSalida + a.horaSalida));
            setViajes(filtrados);
        } catch (err) {
            console.error(err);
        } finally {
            setCargandoViajes(false);
        }
    };

    const fetchDatosViaje = async () => {
        setCargando(true);
        setError(null);
        setCapacidad(null);
        try {
            const ventas = await apiFetch(`/api/ventas/viaje/${viajeId}`);
            setPasajeros(ventas.filter(v => v.estado !== "ANULADO"));

            const viaje = viajes.find(v => v.id === viajeId);
            if (viaje?.embarcacionId) {
                try {
                    const emb = await apiFetch(`/api/embarcaciones/${viaje.embarcacionId}`);
                    setCapacidad(emb.capacidadTotal ?? null);
                } catch {
                    setCapacidad(null); // si falla, simplemente no se muestra la capacidad
                }
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setCargando(false);
        }
    };

    const viajeSeleccionado = viajes.find(v => v.id === viajeId);

    const totalPasajeros  = pasajeros.length;
    const totalEmbarcados = pasajeros.filter(p => p.embarqueEstado === "EMBARCADO").length;
    const totalPendientes = totalPasajeros - totalEmbarcados;
    const ocupacion = capacidad ? Math.round((totalPasajeros / capacidad) * 100) : null;

    const descargarPdf = async () => {
        if (!viajeSeleccionado || pasajeros.length === 0) return;
        setGenerandoPdf(true);
        try {
            await generarManifiestoPDF(viajeSeleccionado, pasajeros, capacidad);
        } finally {
            setGenerandoPdf(false);
        }
    };

    return (
        <div className="manifiesto-page">

            {/* ENCABEZADO */}
            <div className="manifiesto-header">
                <div>
                    <h2>Manifiesto de Pasajeros</h2>
                    <p>Documento oficial de tripulantes por viaje</p>
                </div>
                {viajeSeleccionado && pasajeros.length > 0 && (
                    <button className="btn-descargar" onClick={descargarPdf} disabled={generandoPdf}>
                        {generandoPdf
                            ? <><i className="ti ti-loader-2 spin"></i> Generando...</>
                            : <><i className="ti ti-file-download"></i> Descargar PDF</>
                        }
                    </button>
                )}
            </div>

            {/* SELECTOR DE VIAJE */}
            <div className="manifiesto-controles">
                <div className="control-grupo">
                    <label>Seleccionar Viaje</label>
                    <select
                        value={viajeId}
                        onChange={e => setViajeId(e.target.value)}
                        disabled={cargandoViajes}
                    >
                        <option value="">
                            {cargandoViajes ? "Cargando viajes..." : "Seleccionar viaje..."}
                        </option>
                        {viajes.map(v => (
                            <option key={v.id} value={v.id}>
                                {v.codigoViaje} — {v.rutaNombre} — {v.fechaSalida} {v.horaSalida} ({v.estado})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* ESTADOS */}
            {!viajeId && (
                <div className="manifiesto-vacio">
                    <i className="ti ti-clipboard-list"></i>
                    <span>Selecciona un viaje para ver su manifiesto</span>
                </div>
            )}

            {cargando && (
                <div className="manifiesto-estado">
                    <i className="ti ti-loader-2 spin"></i>
                    <span>Cargando manifiesto...</span>
                </div>
            )}

            {error && !cargando && (
                <div className="manifiesto-estado error">
                    <i className="ti ti-alert-circle"></i>
                    <span>{error}</span>
                </div>
            )}

            {/* CONTENIDO DEL MANIFIESTO */}
            {!cargando && !error && viajeSeleccionado && (
                <>
                    {/* FICHA DEL VIAJE */}
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
                            <span className="ficha-label">Origen → Destino</span>
                            <strong>{viajeSeleccionado.origen} → {viajeSeleccionado.destino}</strong>
                        </div>
                        <div className="ficha-item">
                            <span className="ficha-label">Fecha / Hora</span>
                            <strong>{viajeSeleccionado.fechaSalida} — {viajeSeleccionado.horaSalida}</strong>
                        </div>
                        <div className="ficha-item">
                            <span className="ficha-label">Embarcación</span>
                            <strong>{viajeSeleccionado.embarcacionNombre}</strong>
                        </div>
                        <div className="ficha-item">
                            <span className="ficha-label">Capacidad</span>
                            <strong>{capacidad ? `${capacidad} pasajeros` : "No disponible"}</strong>
                        </div>
                    </div>

                    {/* RESUMEN */}
                    <div className="manifiesto-resumen">
                        <div className="resumen-card">
                            <i className="ti ti-users"></i>
                            <div>
                                <span className="resumen-label">Total Pasajeros</span>
                                <span className="resumen-valor">{totalPasajeros}</span>
                            </div>
                        </div>
                        <div className="resumen-card verde">
                            <i className="ti ti-user-check"></i>
                            <div>
                                <span className="resumen-label">Embarcados</span>
                                <span className="resumen-valor">{totalEmbarcados}</span>
                            </div>
                        </div>
                        <div className="resumen-card amarillo">
                            <i className="ti ti-user-clock"></i>
                            <div>
                                <span className="resumen-label">Pendientes</span>
                                <span className="resumen-valor">{totalPendientes}</span>
                            </div>
                        </div>
                        {ocupacion !== null && (
                            <div className="resumen-card morado">
                                <i className="ti ti-gauge"></i>
                                <div>
                                    <span className="resumen-label">Ocupación</span>
                                    <span className="resumen-valor">{ocupacion}%</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* TABLA */}
                    {pasajeros.length === 0 ? (
                        <div className="manifiesto-vacio">
                            <i className="ti ti-users-off"></i>
                            <span>Este viaje no tiene pasajeros registrados</span>
                        </div>
                    ) : (
                        <div className="manifiesto-tabla-wrapper">
                            <table className="manifiesto-tabla">
                                <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Nombre Completo</th>
                                    <th>Documento</th>
                                    <th>Edad</th>
                                    <th>Sexo</th>
                                    <th>Procedencia</th>
                                    <th>Tramo</th>
                                    <th>Asiento</th>
                                    <th>Estado</th>
                                </tr>
                                </thead>
                                <tbody>
                                {pasajeros.map((p, i) => (
                                    <tr key={p.id}>
                                        <td className="col-numero">{i + 1}</td>
                                        <td><strong>{p.pasajeroNombre}</strong></td>
                                        <td>{p.tipoDocumento}: {p.pasajeroDocumento}</td>
                                        <td>{p.edad ?? "—"}</td>
                                        <td>{p.sexo || "—"}</td>
                                        <td>{p.procedencia || "—"}</td>
                                        <td>
                                            <div className="tramo-info">
                                                <span>{p.paradaOrigen}</span>
                                                <i className="ti ti-arrow-right"></i>
                                                <span>{p.paradaDestino}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`asiento-tipo ${p.asientoTipo?.toLowerCase()}`}>
                                                {p.asientoTipo}
                                            </span>
                                            <strong> #{p.asientoNumero}</strong>
                                        </td>
                                        <td>
                                            <span className={`badge ${p.embarqueEstado === "EMBARCADO" ? "badge-embarcado" : "badge-pendiente"}`}>
                                                {p.embarqueEstado === "EMBARCADO" ? "Embarcado" : "Pendiente"}
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

export default Manifiesto;