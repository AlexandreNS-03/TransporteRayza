import { useState, useEffect } from "react";
import "./Viajes.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";


const ESTADOS = ["Todos los estados", "PROGRAMADO", "EN_CURSO", "COMPLETADO", "CANCELADO"];
const ESTADO_LABEL = {
    PROGRAMADO: "Programado",
    EN_CURSO:   "En Curso",
    COMPLETADO: "Completado",
    CANCELADO:  "Cancelado",
};

/**
 * Etiqueta del día en palabras. La misma que usa el selector de viajes al vender:
 * el personal ya la reconoce y no tiene que traducir una fecha en su cabeza.
 */
function etiquetaDia(iso) {
    if (!iso) return "Sin fecha";
    const hoy    = new Date().toLocaleDateString("en-CA");
    const manana = new Date(Date.now() + 86400000).toLocaleDateString("en-CA");
    const ayer   = new Date(Date.now() - 86400000).toLocaleDateString("en-CA");
    if (iso === hoy)    return "Hoy";
    if (iso === manana) return "Mañana";
    if (iso === ayer)   return "Ayer";
    const [a, m, d] = iso.split("-").map(Number);
    const f = new Date(a, m - 1, d);
    const txt = f.toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" });
    return txt.charAt(0).toUpperCase() + txt.slice(1);
}

/** Fecha corta para el subtítulo del día (14/08/2026). */
function fechaCorta(iso) {
    if (!iso) return "";
    const [a, m, d] = iso.split("-");
    return `${d}/${m}/${a}`;
}

/** Agrupa los viajes por día, con lo más próximo primero. */
function agruparPorFecha(viajes) {
    const dias = new Map();
    for (const v of viajes) {
        const clave = v.fechaSalida || "";
        if (!dias.has(clave)) dias.set(clave, []);
        dias.get(clave).push(v);
    }
    return [...dias.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([fecha, lista]) => ({
            fecha,
            viajes: lista.sort((x, y) => (x.horaSalida || "").localeCompare(y.horaSalida || "")),
        }));
}

function badgeClass(estado) {
    switch (estado) {
        case "PROGRAMADO":  return "badge badge-programado";
        case "EN_CURSO":    return "badge badge-encurso";
        case "COMPLETADO":  return "badge badge-completado";
        case "CANCELADO":   return "badge badge-cancelado";
        default:            return "badge";
    }
}

function Viajes() {
    const usuario      = JSON.parse(localStorage.getItem("usuario"));
    const esAdmin      = usuario?.rol === "ADMIN";
    const esSupervisor = usuario?.rol === "SUPERVISOR";
    const esEmpleado   = usuario?.rol === "EMPLEADO";
    const puedeCancelar = esAdmin || esSupervisor;

    // Cancelar viaje
    const [viajeCancelar, setViajeCancelar] = useState(null);
    const [motivoCancel, setMotivoCancel]   = useState("");
    const [cancelando, setCancelando]       = useState(false);
    const [errorCancel, setErrorCancel]     = useState(null);

    // La vista elegida se recuerda: cada oficina trabaja distinto y no tiene por qué
    // volver a cambiarla cada vez que entra.
    const [vista, setVista] = useState(() => localStorage.getItem("viajes.vista") || "tarjetas");
    const cambiarVista = (v) => { setVista(v); localStorage.setItem("viajes.vista", v); };

    const [viajes, setViajes]         = useState([]);
    const [cargando, setCargando]     = useState(true);
    const [error, setError]           = useState(null);

    // Filtros
    const [fechaDesde, setFechaDesde] = useState("");
    const [fechaHasta, setFechaHasta] = useState("");
    const [rutaFiltro, setRutaFiltro] = useState("");
    const [embFiltro, setEmbFiltro]   = useState("");
    const [estadoFiltro, setEstado]   = useState("Todos los estados");
    const [busqueda, setBusqueda]     = useState("");

    // Listas para selects
    const [rutas, setRutas]           = useState([]);
    const [embarcaciones, setEmb]     = useState([]);

    // Modal crear viaje
    const [modalAbierto, setModalAbierto] = useState(false);
    const [guardando, setGuardando]       = useState(false);
    const [errorModal, setErrorModal]     = useState(null);
    const [rutasDisponibles, setRutasDisponibles]   = useState([]);
    const [embsDisponibles, setEmbsDisponibles]     = useState([]);
    const [sucursalesDisponibles, setSucursalesDisponibles] = useState([]);
    const [form, setForm] = useState({
        rutaId: "", embarcacionId: "", sucursalId: "",
        fechaSalida: "", horaSalida: ""
    });

    useEffect(() => { fetchViajes(); }, []);

    const fetchViajes = async () => {
        setCargando(true);
        setError(null);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE}/api/viajes`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!res.ok) throw new Error("Error al obtener viajes");
            const data = await res.json();
            setViajes(data);
            setRutas([...new Set(data.map(v => v.rutaNombre).filter(Boolean))]);
            setEmb([...new Set(data.map(v => v.embarcacionNombre).filter(Boolean))]);
        } catch (err) {
            setError(err.message);
        } finally {
            setCargando(false);
        }
    };

    const confirmarCancelacion = async () => {
        if (motivoCancel.trim().length < 5) { setErrorCancel("Escribe el motivo (mínimo 5 letras)"); return; }
        setCancelando(true); setErrorCancel(null);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE}/api/viajes/${viajeCancelar.id}/cancelar`, {
                method: "PATCH",
                headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({ motivo: motivoCancel.trim() })
            });
            if (!res.ok) {
                let m = "No se pudo cancelar el viaje";
                try { const d = await res.json(); m = d.message || d.error || m; } catch {}
                throw new Error(m);
            }
            setViajeCancelar(null);
            setMotivoCancel("");
            fetchViajes();
        } catch (err) { setErrorCancel(err.message); }
        finally { setCancelando(false); }
    };

    const abrirModal = async () => {
        setForm({ rutaId: "", embarcacionId: "", sucursalId: "", fechaSalida: "", horaSalida: "" });
        setErrorModal(null);
        setModalAbierto(true);

        // Cargar datos para los selects
        const token = localStorage.getItem("token");
        const [rutasRes, embsRes, sucRes] = await Promise.all([
            fetch(`${API_BASE}/api/rutas/activas`, { headers: { "Authorization": `Bearer ${token}` } }),
            fetch(`${API_BASE}/api/embarcaciones/activas`, { headers: { "Authorization": `Bearer ${token}` } }),
            fetch(`${API_BASE}/api/sucursales/activas`, { headers: { "Authorization": `Bearer ${token}` } })
        ]);
        setRutasDisponibles(await rutasRes.json());
        setEmbsDisponibles(await embsRes.json());
        setSucursalesDisponibles(await sucRes.json());
    };

    const cerrarModal = () => { setModalAbierto(false); setErrorModal(null); };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const guardar = async () => {
        if (!form.rutaId || !form.embarcacionId || !form.sucursalId || !form.fechaSalida || !form.horaSalida) {
            setErrorModal("Todos los campos son obligatorios");
            return;
        }
        setGuardando(true);
        setErrorModal(null);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE}/api/viajes`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(form)
            });
            if (!res.ok) throw new Error("Error al crear viaje");
            cerrarModal();
            fetchViajes();
        } catch (err) {
            setErrorModal(err.message);
        } finally {
            setGuardando(false);
        }
    };

    const limpiarFiltros = () => {
        setFechaDesde("");
        setFechaHasta("");
        setRutaFiltro("");
        setEmbFiltro("");
        setEstado("Todos los estados");
        setBusqueda("");
    };

    const viajesFiltrados = viajes.filter(v => {
        if (fechaDesde && v.fechaSalida < fechaDesde) return false;
        if (fechaHasta && v.fechaSalida > fechaHasta) return false;
        if (rutaFiltro && v.rutaNombre !== rutaFiltro) return false;
        if (embFiltro  && v.embarcacionNombre !== embFiltro) return false;
        if (estadoFiltro !== "Todos los estados" && v.estado !== estadoFiltro) return false;
        if (busqueda && !v.codigoViaje?.toLowerCase().includes(busqueda.toLowerCase())) return false;
        return true;
    });

    const porDia = agruparPorFecha(viajesFiltrados);

    return (
        <div className="viajes-page">

            {/* ENCABEZADO */}
            <div className="viajes-header">
                <div>
                    <h2>Viajes</h2>
                    <p>Gestión administrativa de trayectos fluviales</p>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                    {(esAdmin || esSupervisor || esEmpleado) && (
                        <button className="btn-nuevo" onClick={abrirModal}>
                            <i className="ti ti-plus"></i> Nuevo Viaje
                        </button>
                    )}
                    <button className="btn-recargar" onClick={fetchViajes}>
                        <i className="ti ti-refresh"></i> Recargar
                    </button>
                </div>
            </div>

            {/* FILTROS */}
            <div className="viajes-filtros">
                <div className="filtro-grupo">
                    <label>Rango de Fechas</label>
                    <div className="filtro-fechas">
                        <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
                        <span>—</span>
                        <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
                    </div>
                </div>

                <div className="filtro-grupo">
                    <label>Ruta</label>
                    <select value={rutaFiltro} onChange={e => setRutaFiltro(e.target.value)}>
                        <option value="">Todas las rutas</option>
                        {rutas.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>

                <div className="filtro-grupo">
                    <label>Embarcación</label>
                    <select value={embFiltro} onChange={e => setEmbFiltro(e.target.value)}>
                        <option value="">Todas las naves</option>
                        {embarcaciones.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                </div>

                <div className="filtro-grupo">
                    <label>Estado</label>
                    <select value={estadoFiltro} onChange={e => setEstado(e.target.value)}>
                        {ESTADOS.map(e => <option key={e}>{e}</option>)}
                    </select>
                </div>

                <div className="filtro-grupo">
                    <label>Buscar código</label>
                    <div className="filtro-buscar">
                        <i className="ti ti-search"></i>
                        <input
                            type="text"
                            placeholder="Código de viaje..."
                            value={busqueda}
                            onChange={e => setBusqueda(e.target.value)}
                        />
                    </div>
                </div>

                <button className="btn-limpiar" onClick={limpiarFiltros}>
                    <i className="ti ti-filter-off"></i> Limpiar filtro
                </button>

                {/* Tarjetas para el día a día; tabla para revisar o comparar muchos */}
                <div className="vista-selector" role="group" aria-label="Forma de ver los viajes">
                    <button className={vista === "tarjetas" ? "activo" : ""}
                            onClick={() => cambiarVista("tarjetas")}
                            title="Ver por fechas">
                        <i className="ti ti-layout-grid"></i> Por fechas
                    </button>
                    <button className={vista === "tabla" ? "activo" : ""}
                            onClick={() => cambiarVista("tabla")}
                            title="Ver en tabla">
                        <i className="ti ti-table"></i> Tabla
                    </button>
                </div>
            </div>

            {/* ESTADOS DE CARGA */}
            {cargando && (
                <div className="viajes-estado">
                    <i className="ti ti-loader-2 spin"></i>
                    <span>Cargando viajes...</span>
                </div>
            )}

            {error && !cargando && (
                <div className="viajes-estado error">
                    <i className="ti ti-alert-circle"></i>
                    <span>{error}</span>
                    <button onClick={fetchViajes}>Reintentar</button>
                </div>
            )}

            {/* POR FECHAS: un bloque por día, y dentro una tarjeta por viaje */}
            {!cargando && !error && vista === "tarjetas" && (
                porDia.length === 0 ? (
                    <div className="viajes-vacio">
                        <i className="ti ti-ship-off"></i>
                        <span>No se encontraron viajes</span>
                    </div>
                ) : (
                    <div className="viajes-dias">
                        {porDia.map(({ fecha, viajes: delDia }) => (
                            <section key={fecha} className="dia-bloque">
                                <header className="dia-cabecera">
                                    <h3>{etiquetaDia(fecha)}</h3>
                                    <span className="dia-fecha">{fechaCorta(fecha)}</span>
                                    <span className="dia-cuenta">
                                        {delDia.length} {delDia.length === 1 ? "viaje" : "viajes"}
                                    </span>
                                </header>

                                <div className="dia-viajes">
                                    {delDia.map(v => (
                                        <article key={v.id} className={`viaje-tarjeta t-${v.estado?.toLowerCase()}`}>
                                            {/* La hora primero y grande: es lo que se busca al mirar */}
                                            <div className="tarjeta-hora">
                                                {(v.horaSalida || "--:--").slice(0, 5)}
                                                <span className="tarjeta-hora-h">h</span>
                                            </div>

                                            <div className="tarjeta-cuerpo">
                                                <p className="tarjeta-ruta">
                                                    {v.rutaNombre || `${v.origen} → ${v.destino}`}
                                                </p>
                                                <p className="tarjeta-datos">
                                                    <span><i className="ti ti-ship"></i> {v.embarcacionNombre || "Sin embarcación"}</span>
                                                    <span><i className="ti ti-building"></i> {v.sucursalNombre || "—"}</span>
                                                    <span className="tarjeta-codigo">{v.codigoViaje}</span>
                                                </p>
                                                {v.paradas?.length > 0 && (
                                                    <p className="tarjeta-paradas" title={v.paradas.map(p => p.nombre).join(" → ")}>
                                                        {v.paradas.map(p => p.nombre).join(" → ")}
                                                    </p>
                                                )}
                                                {v.estado === "CANCELADO" && v.motivoCancelacion && (
                                                    <p className="tarjeta-motivo">
                                                        <i className="ti ti-alert-circle"></i> {v.motivoCancelacion}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="tarjeta-lado">
                                                <span className={badgeClass(v.estado)}>
                                                    {ESTADO_LABEL[v.estado] || v.estado}
                                                </span>
                                                {puedeCancelar && (v.estado === "PROGRAMADO" || v.estado === "EN_CURSO") && (
                                                    <button className="btn-cancelar-viaje"
                                                            onClick={() => { setViajeCancelar(v); setMotivoCancel(""); setErrorCancel(null); }}
                                                            title="Cancelar viaje">
                                                        <i className="ti ti-ban"></i> Cancelar
                                                    </button>
                                                )}
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                )
            )}

            {/* TABLA - todos los roles la ven */}
            {!cargando && !error && vista === "tabla" && (
                <div className="viajes-tabla-wrapper">
                    <table className="viajes-tabla">
                        <thead>
                        <tr>
                            <th>Código</th>
                            <th>Ruta</th>
                            <th>Paradas</th>
                            <th>Fecha</th>
                            <th>Hora</th>
                            <th>Embarcación</th>
                            <th>Sucursal</th>
                            <th>Estado</th>
                            {puedeCancelar && <th>Acciones</th>}
                        </tr>
                        </thead>
                        <tbody>
                        {viajesFiltrados.length === 0 ? (
                            <tr>
                                <td colSpan={puedeCancelar ? 9 : 8} className="tabla-vacia">
                                    <i className="ti ti-ship-off"></i>
                                    <span>No se encontraron viajes</span>
                                </td>
                            </tr>
                        ) : (
                            viajesFiltrados.map(v => (
                                <tr key={v.id}>
                                    <td className="codigo">{v.codigoViaje}</td>
                                    <td>{v.rutaNombre || `${v.origen} → ${v.destino}`}</td>
                                    <td className="paradas">
                                        {v.paradas
                                            ? v.paradas.map(p => p.nombre).join(" → ")
                                            : "—"}
                                    </td>
                                    <td>{v.fechaSalida}</td>
                                    <td>{v.horaSalida}</td>
                                    <td>{v.embarcacionNombre || "—"}</td>
                                    <td>{v.sucursalNombre || "—"}</td>
                                    <td>
                                            <span className={badgeClass(v.estado)}>
                                                {ESTADO_LABEL[v.estado] || v.estado}
                                            </span>
                                        {v.estado === "CANCELADO" && v.motivoCancelacion && (
                                            <div className="motivo-cancel" title={v.motivoCancelacion}>
                                                {v.motivoCancelacion}
                                            </div>
                                        )}
                                    </td>
                                    {puedeCancelar && (
                                        <td>
                                            {(v.estado === "PROGRAMADO" || v.estado === "EN_CURSO") && (
                                                <button className="btn-cancelar-viaje"
                                                        onClick={() => { setViajeCancelar(v); setMotivoCancel(""); setErrorCancel(null); }}
                                                        title="Cancelar viaje">
                                                    <i className="ti ti-ban"></i> Cancelar
                                                </button>
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

            {/* MODAL NUEVO VIAJE */}
            {modalAbierto && (
                <div className="modal-overlay" onClick={cerrarModal}>
                    <div className="modal" onClick={e => e.stopPropagation()}>

                        <div className="modal-header">
                            <h3>Nuevo Viaje</h3>
                            <button className="modal-cerrar" onClick={cerrarModal}>
                                <i className="ti ti-x"></i>
                            </button>
                        </div>

                        <div className="modal-body">
                            <div className="form-grupo">
                                <label>Ruta *</label>
                                <select name="rutaId" value={form.rutaId} onChange={handleChange}>
                                    <option value="">Seleccionar ruta...</option>
                                    {rutasDisponibles.map(r => (
                                        <option key={r.id} value={r.id}>
                                            {r.origen} → {r.destino}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-grupo">
                                <label>Embarcación *</label>
                                <select name="embarcacionId" value={form.embarcacionId} onChange={handleChange}>
                                    <option value="">Seleccionar embarcación...</option>
                                    {embsDisponibles.map(e => (
                                        <option key={e.id} value={e.id}>
                                            {e.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-grupo">
                                <label>Sucursal *</label>
                                <select name="sucursalId" value={form.sucursalId} onChange={handleChange}>
                                    <option value="">Seleccionar sucursal...</option>
                                    {sucursalesDisponibles.map(s => (
                                        <option key={s.id} value={s.id}>
                                            {s.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-grupo">
                                <label>Fecha de Salida *</label>
                                <input
                                    type="date"
                                    name="fechaSalida"
                                    value={form.fechaSalida}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="form-grupo">
                                <label>Hora de Salida *</label>
                                <input
                                    type="time"
                                    name="horaSalida"
                                    value={form.horaSalida}
                                    onChange={handleChange}
                                />
                            </div>

                            {errorModal && (
                                <div className="modal-error">
                                    <i className="ti ti-alert-circle"></i>
                                    {errorModal}
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button className="btn-cancelar" onClick={cerrarModal}>
                                Cancelar
                            </button>
                            <button className="btn-guardar" onClick={guardar} disabled={guardando}>
                                {guardando
                                    ? <><i className="ti ti-loader-2 spin"></i> Guardando...</>
                                    : <><i className="ti ti-check"></i> Crear Viaje</>
                                }
                            </button>
                        </div>

                    </div>
                </div>
            )}

            {/* MODAL CANCELAR VIAJE */}
            {viajeCancelar && (
                <div className="modal-overlay" onClick={() => setViajeCancelar(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                        <div className="modal-header">
                            <h3>Cancelar viaje {viajeCancelar.codigoViaje}</h3>
                            <button className="modal-cerrar" onClick={() => setViajeCancelar(null)}>
                                <i className="ti ti-x"></i>
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="aviso-cancel">
                                <i className="ti ti-alert-triangle"></i>
                                <div>
                                    <strong>El viaje dejará de venderse.</strong>
                                    <span>
                                        Los pasajes ya vendidos quedan <b>por resolver</b>: nadie pierde su
                                        dinero todavía. Después decides, pasajero por pasajero, si se devuelve,
                                        se reprograma o queda como saldo a favor.
                                    </span>
                                </div>
                            </div>
                            <div className="form-grupo">
                                <label>Motivo de la cancelación *</label>
                                <input type="text" value={motivoCancel}
                                       onChange={e => setMotivoCancel(e.target.value)}
                                       placeholder="Ej: mal tiempo, falla mecánica, río bajo" />
                                <span className="campo-ayuda">Se le muestra al pasajero y queda en auditoría.</span>
                            </div>
                            {errorCancel && (
                                <div className="modal-error"><i className="ti ti-alert-circle"></i> {errorCancel}</div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancelar" onClick={() => setViajeCancelar(null)}>Volver</button>
                            <button className="btn-peligro" onClick={confirmarCancelacion} disabled={cancelando}>
                                {cancelando
                                    ? <><i className="ti ti-loader-2 spin"></i> Cancelando...</>
                                    : <><i className="ti ti-ban"></i> Cancelar viaje</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Viajes;