import { useState, useEffect } from "react";
import "./Embarque.css";
import EscanerQR from "./EscanerQR.jsx";
import SelectorViaje from "../../../Components/SelectorViaje.jsx";
import { motivoDelError } from "../../../Services/api.js";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";


function Embarque() {
    const usuario      = JSON.parse(localStorage.getItem("usuario"));
    const esAdmin      = usuario?.rol === "ADMIN";
    const esSupervisor = usuario?.rol === "SUPERVISOR";
    const puedeEmbarcar = esAdmin || esSupervisor;

    const [viajes, setViajes]           = useState([]);
    const [viajeId, setViajeId]         = useState("");
    const [pasajeros, setPasajeros]     = useState([]);
    const [cargando, setCargando]       = useState(false);
    const [cargandoViajes, setCargandoViajes] = useState(true);
    const [error, setError]             = useState(null);
    const [busqueda, setBusqueda]       = useState("");
    const [filtroEstado, setFiltroEstado] = useState("todos");
    const [procesando, setProcesando]   = useState(null);
    const [escanerAbierto, setEscanerAbierto] = useState(false);

    // --- NUEVO: toast de confirmación ---
    const [toast, setToast] = useState(null); // { tipo: "success" | "error", mensaje: string }

    // --- NUEVO: modal "Ver mi turno" ---
    const [modalTurnoAbierto, setModalTurnoAbierto] = useState(false);
    const [misEmbarques, setMisEmbarques]           = useState([]);
    const [cargandoTurno, setCargandoTurno]         = useState(false);

    useEffect(() => { fetchViajes(); }, []);
    useEffect(() => { if (viajeId) fetchPasajeros(); }, [viajeId]);

    // --- NUEVO: autocerrar el toast a los 4s ---
    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(null), 4000);
        return () => clearTimeout(timer);
    }, [toast]);

    const fetchViajes = async () => {
        setCargandoViajes(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE}/api/viajes?estado=PROGRAMADO,EN_CURSO`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            setViajes(await res.json());
        } catch (err) {
            console.error(err);
        } finally {
            setCargandoViajes(false);
        }
    };

    const fetchPasajeros = async () => {
        setCargando(true);
        setError(null);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE}/api/ventas/viaje/${viajeId}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!res.ok) throw new Error(await motivoDelError(res, "Error al obtener pasajeros"));
            const data = await res.json();
            setPasajeros(data.filter(v => v.estado !== "ANULADO"));
        } catch (err) {
            setError(err.message);
        } finally {
            setCargando(false);
        }
    };

    const marcarEmbarcado = async (ventaId, pasajeroNombre) => {
        setProcesando(ventaId);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE}/api/ventas/${ventaId}/embarcar`, {
                method: "PATCH",
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (!res.ok) {
                let mensaje = "Error al embarcar pasajero";
                if (res.status === 403) {
                    mensaje = "No tienes permiso para embarcar pasajeros";
                } else if (res.status === 401) {
                    mensaje = "Tu sesión expiró, vuelve a iniciar sesión";
                } else {
                    try {
                        const data = await res.json();
                        mensaje = data.message || data.error || mensaje;
                    } catch {}
                }
                throw new Error(mensaje);
            }

            // --- NUEVO: toast de éxito en vez de solo refrescar ---
            setToast({
                tipo: "success",
                mensaje: `${pasajeroNombre} embarcado correctamente. Se envió confirmación por correo.`
            });

            fetchPasajeros();
        } catch (err) {
            setToast({ tipo: "error", mensaje: err.message });
        } finally {
            setProcesando(null);
        }
    };

    const buscarPorQrODoc = async () => {
        if (!busqueda.trim()) return;
        setCargando(true);
        setError(null);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(
                `${API_BASE}/api/ventas/documento/${busqueda.trim()}`,
                { headers: { "Authorization": `Bearer ${token}` } }
            );
            if (!res.ok) throw new Error("No se encontró el pasajero");
            const data = await res.json();
            setPasajeros(data.filter(v => v.estado !== "ANULADO"));
            setViajeId("");
        } catch (err) {
            setError(err.message);
        } finally {
            setCargando(false);
        }
    };

    // --- NUEVO: procesar el QR escaneado (busca la venta por su codigoQr) ---
    /**
     * Embarca directo tras escanear el QR. No recarga por viaje (la búsqueda por
     * QR muestra un solo pasaje): actualiza la fila con lo que devuelve el backend.
     */
    const embarcarDirecto = async (venta) => {
        setProcesando(venta.id);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE}/api/ventas/${venta.id}/embarcar`, {
                method: "PATCH",
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!res.ok) {
                let mensaje = "Error al embarcar pasajero";
                if (res.status === 403)      mensaje = "No tienes permiso para embarcar pasajeros";
                else if (res.status === 401) mensaje = "Tu sesión expiró, vuelve a iniciar sesión";
                else {
                    try { const d = await res.json(); mensaje = d.message || d.error || mensaje; } catch {}
                }
                throw new Error(mensaje);
            }
            const actualizada = await res.json();
            setPasajeros([actualizada]);
            setToast({
                tipo: "success",
                mensaje: `${venta.pasajeroNombre} embarcado correctamente. Se envió confirmación por correo.`
            });
        } catch (err) {
            setToast({ tipo: "error", mensaje: err.message });
        } finally {
            setProcesando(null);
        }
    };

    const procesarQrEscaneado = async (codigo) => {
        setEscanerAbierto(false);
        if (!codigo) return;
        // El QR del ticket contiene el codigoQr (UUID). Por si viene como URL, toma el último segmento.
        const cod = codigo.includes("/") ? codigo.split("/").filter(Boolean).pop() : codigo;
        setCargando(true);
        setError(null);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE}/api/ventas/qr/${encodeURIComponent(cod)}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!res.ok) throw new Error("Ese QR no corresponde a ningún pasaje registrado");
            const venta = await res.json();
            if (venta.estado === "ANULADO") {
                setToast({ tipo: "error", mensaje: "Ese pasaje está anulado, no se puede embarcar." });
                setPasajeros([]);
                return;
            }
            setViajeId("");
            setBusqueda("");
            setFiltroEstado("todos");
            setPasajeros([venta]);

            if (venta.embarqueEstado === "EMBARCADO") {
                setToast({ tipo: "error", mensaje: `${venta.pasajeroNombre} ya estaba embarcado.` });
                return;
            }
            if (!puedeEmbarcar) {
                setToast({ tipo: "error", mensaje: "No tienes permiso para embarcar pasajeros." });
                return;
            }
            // Al escanear se marca el embarque de una vez (sin pulsar "Embarcar")
            await embarcarDirecto(venta);
        } catch (err) {
            setError(err.message);
            setPasajeros([]);
        } finally {
            setCargando(false);
        }
    };

    // --- NUEVO: cargar "mis embarques de hoy" ---
    const abrirModalTurno = async () => {
        setModalTurnoAbierto(true);
        setCargandoTurno(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE}/api/ventas/mis-embarques-hoy`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!res.ok) throw new Error("No se pudo cargar tu turno");
            const data = await res.json();
            setMisEmbarques(data);
        } catch (err) {
            setToast({ tipo: "error", mensaje: err.message });
            setModalTurnoAbierto(false);
        } finally {
            setCargandoTurno(false);
        }
    };

    const viajeSeleccionado = viajes.find(v => v.id === viajeId);

    const totalEmbarcados  = pasajeros.filter(p => p.embarqueEstado === "EMBARCADO").length;
    const totalPendientes  = pasajeros.filter(p => p.embarqueEstado === "PENDIENTE").length;

    const pasajerosFiltrados = pasajeros.filter(p => {
        if (filtroEstado === "embarcado" && p.embarqueEstado !== "EMBARCADO") return false;
        if (filtroEstado === "pendiente" && p.embarqueEstado !== "PENDIENTE") return false;
        return true;
    });

    return (
        <div className="embarque-page">

            {/* --- NUEVO: TOAST --- */}
            {toast && (
                <div className={`toast toast-${toast.tipo}`}>
                    <i className={`ti ${toast.tipo === "success" ? "ti-circle-check" : "ti-alert-circle"}`}></i>
                    <span>{toast.mensaje}</span>
                    <button className="toast-cerrar" onClick={() => setToast(null)}>
                        <i className="ti ti-x"></i>
                    </button>
                </div>
            )}

            {/* ENCABEZADO */}
            <div className="embarque-header">
                <div>
                    <h2>Embarque</h2>
                    <p>Control de embarque de pasajeros</p>
                </div>
                {/* --- NUEVO: botón Ver mi turno --- */}
                {puedeEmbarcar && (
                    <button className="btn-mi-turno" onClick={abrirModalTurno}>
                        <i className="ti ti-clipboard-list"></i> Ver mi turno
                    </button>
                )}
            </div>

            {/* SELECTOR DE VIAJE Y BÚSQUEDA */}
            <div className="embarque-controles">
                <div className="control-grupo">
                    <label>Seleccionar Viaje</label>
                    <SelectorViaje
                        viajes={viajes}
                        value={viajeId}
                        onChange={(id) => { setViajeId(id); setBusqueda(""); }}
                        cargando={cargandoViajes}
                    />
                </div>

                <div className="control-separador">o</div>

                <div className="control-grupo">
                    <label>Buscar por Documento o QR</label>
                    <div className="buscar-doc">
                        <input
                            type="text"
                            placeholder="DNI, CE o código QR..."
                            value={busqueda}
                            onChange={e => setBusqueda(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && buscarPorQrODoc()}
                        />
                        <button className="btn-buscar" onClick={buscarPorQrODoc}>
                            <i className="ti ti-search"></i> Buscar
                        </button>
                        <button className="btn-escanear" onClick={() => setEscanerAbierto(true)}
                                title="Escanea el QR del boleto y el pasajero queda embarcado">
                            <i className="ti ti-qrcode"></i> Escanear y embarcar
                        </button>
                    </div>
                </div>
            </div>

            {/* ESCÁNER QR */}
            {escanerAbierto && (
                <EscanerQR
                    onDetectar={procesarQrEscaneado}
                    onCerrar={() => setEscanerAbierto(false)}
                />
            )}

            {/* RESUMEN DEL VIAJE */}
            {viajeSeleccionado && (
                <div className="embarque-resumen">
                    <div className="resumen-item">
                        <i className="ti ti-ship"></i>
                        <div>
                            <span className="resumen-label">Embarcación</span>
                            <span className="resumen-valor">{viajeSeleccionado.embarcacionNombre}</span>
                        </div>
                    </div>
                    <div className="resumen-item">
                        <i className="ti ti-route"></i>
                        <div>
                            <span className="resumen-label">Ruta</span>
                            <span className="resumen-valor">{viajeSeleccionado.rutaNombre}</span>
                        </div>
                    </div>
                    <div className="resumen-item resumen-embarcados">
                        <i className="ti ti-user-check"></i>
                        <div>
                            <span className="resumen-label">Embarcados</span>
                            <span className="resumen-valor">{totalEmbarcados}</span>
                        </div>
                    </div>
                    <div className="resumen-item resumen-pendientes">
                        <i className="ti ti-user-clock"></i>
                        <div>
                            <span className="resumen-label">Pendientes</span>
                            <span className="resumen-valor">{totalPendientes}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* FILTRO ESTADO */}
            {pasajeros.length > 0 && (
                <div className="embarque-filtros">
                    <button
                        className={`filtro-btn ${filtroEstado === "todos" ? "activo" : ""}`}
                        onClick={() => setFiltroEstado("todos")}
                    >
                        Todos ({pasajeros.length})
                    </button>
                    <button
                        className={`filtro-btn ${filtroEstado === "pendiente" ? "activo" : ""}`}
                        onClick={() => setFiltroEstado("pendiente")}
                    >
                        Pendientes ({totalPendientes})
                    </button>
                    <button
                        className={`filtro-btn ${filtroEstado === "embarcado" ? "activo" : ""}`}
                        onClick={() => setFiltroEstado("embarcado")}
                    >
                        Embarcados ({totalEmbarcados})
                    </button>
                </div>
            )}

            {/* ESTADOS */}
            {!viajeId && !busqueda && (
                <div className="embarque-vacio">
                    <i className="ti ti-ship"></i>
                    <span>Selecciona un viaje o busca un pasajero para comenzar</span>
                </div>
            )}

            {cargando && (
                <div className="embarque-estado">
                    <i className="ti ti-loader-2 spin"></i>
                    <span>Cargando pasajeros...</span>
                </div>
            )}

            {error && !cargando && (
                <div className="embarque-estado error">
                    <i className="ti ti-alert-circle"></i>
                    <span>{error}</span>
                </div>
            )}

            {/* TABLA PASAJEROS */}
            {!cargando && !error && pasajeros.length > 0 && (
                <div className="embarque-tabla-wrapper">
                    <table className="embarque-tabla">
                        <thead>
                        <tr>
                            <th>Asiento</th>
                            <th>Pasajero</th>
                            <th>Documento</th>
                            <th>Tramo</th>
                            <th>Comprobante</th>
                            <th>Estado</th>
                            {puedeEmbarcar && <th>Acción</th>}
                        </tr>
                        </thead>
                        <tbody>
                        {pasajerosFiltrados.length === 0 ? (
                            <tr>
                                <td colSpan={puedeEmbarcar ? 7 : 6} className="tabla-vacia">
                                    <i className="ti ti-users-off"></i>
                                    <span>No hay pasajeros con ese filtro</span>
                                </td>
                            </tr>
                        ) : (
                            pasajerosFiltrados.map(p => (
                                <tr key={p.id} className={p.embarqueEstado === "EMBARCADO" ? "fila-embarcada" : ""}>
                                    <td>
                                        <div className="asiento-badge">
                                                <span className={`asiento-tipo ${p.asientoTipo?.toLowerCase()}`}>
                                                    {p.asientoTipo}
                                                </span>
                                            <strong>#{p.asientoNumero}</strong>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="pasajero-info">
                                            <strong>{p.pasajeroNombre}</strong>
                                            <span>{p.edad} años — {p.sexo}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="pasajero-info">
                                            <span>{p.tipoDocumento}</span>
                                            <strong>{p.pasajeroDocumento}</strong>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="tramo-info">
                                            <span>{p.paradaOrigen}</span>
                                            <i className="ti ti-arrow-right"></i>
                                            <span>{p.paradaDestino}</span>
                                        </div>
                                    </td>
                                    <td className="codigo">
                                        {p.serieComprobante}-{p.numeroComprobante}
                                    </td>
                                    <td>
                                            <span className={`badge ${p.embarqueEstado === "EMBARCADO" ? "badge-embarcado" : "badge-pendiente"}`}>
                                                {p.embarqueEstado === "EMBARCADO" ? "Embarcado" : "Pendiente"}
                                            </span>
                                    </td>
                                    {puedeEmbarcar && (
                                        <td>
                                            {p.embarqueEstado === "PENDIENTE" ? (
                                                <button
                                                    className="btn-embarcar"
                                                    onClick={() => marcarEmbarcado(p.id, p.pasajeroNombre)}
                                                    disabled={procesando === p.id}
                                                >
                                                    {procesando === p.id
                                                        ? <i className="ti ti-loader-2 spin"></i>
                                                        : <><i className="ti ti-user-check"></i> Embarcar</>
                                                    }
                                                </button>
                                            ) : (
                                                <span className="ya-embarcado">
                                                        <i className="ti ti-check"></i> Embarcado
                                                    </span>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>
            )}

            {!cargando && !error && viajeId && pasajeros.length === 0 && (
                <div className="embarque-vacio">
                    <i className="ti ti-users-off"></i>
                    <span>No hay pasajeros registrados para este viaje</span>
                </div>
            )}

            {/* --- NUEVO: MODAL "Ver mi turno" --- */}
            {modalTurnoAbierto && (
                <div className="modal-overlay" onClick={() => setModalTurnoAbierto(false)}>
                    <div className="modal-turno" onClick={e => e.stopPropagation()}>
                        <div className="modal-turno-header">
                            <h3><i className="ti ti-clipboard-list"></i> Mi turno de hoy</h3>
                            <button onClick={() => setModalTurnoAbierto(false)}>
                                <i className="ti ti-x"></i>
                            </button>
                        </div>

                        {cargandoTurno ? (
                            <div className="embarque-estado">
                                <i className="ti ti-loader-2 spin"></i>
                                <span>Cargando tu turno...</span>
                            </div>
                        ) : misEmbarques.length === 0 ? (
                            <div className="embarque-vacio">
                                <i className="ti ti-users-off"></i>
                                <span>Todavía no embarcaste a nadie hoy</span>
                            </div>
                        ) : (
                            <>
                                <p className="modal-turno-resumen">
                                    Embarcaste a <strong>{misEmbarques.length}</strong> pasajero(s) hoy
                                </p>
                                <ul className="modal-turno-lista">
                                    {misEmbarques.map(p => (
                                        <li key={p.id}>
                                            <div className="pasajero-info">
                                                <strong>{p.pasajeroNombre}</strong>
                                                <span>{p.viajeDescripcion}</span>
                                            </div>
                                            <span className="modal-turno-hora">
                                                {p.embarcadoAt
                                                    ? new Date(p.embarcadoAt).toLocaleTimeString("es-PE", {
                                                        hour: "2-digit", minute: "2-digit"
                                                    })
                                                    : ""}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
}

export default Embarque;