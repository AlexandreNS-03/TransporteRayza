import { useState, useEffect } from "react";
import "./Viajes.css";

const ESTADOS = ["Todos los estados", "PROGRAMADO", "EN_CURSO", "COMPLETADO", "CANCELADO"];
const ESTADO_LABEL = {
    PROGRAMADO: "Programado",
    EN_CURSO:   "En Curso",
    COMPLETADO: "Completado",
    CANCELADO:  "Cancelado",
};

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
            const res = await fetch("http://localhost:8080/api/viajes", {
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

    const abrirModal = async () => {
        setForm({ rutaId: "", embarcacionId: "", sucursalId: "", fechaSalida: "", horaSalida: "" });
        setErrorModal(null);
        setModalAbierto(true);

        // Cargar datos para los selects
        const token = localStorage.getItem("token");
        const [rutasRes, embsRes, sucRes] = await Promise.all([
            fetch("http://localhost:8080/api/rutas/activas", { headers: { "Authorization": `Bearer ${token}` } }),
            fetch("http://localhost:8080/api/embarcaciones/activas", { headers: { "Authorization": `Bearer ${token}` } }),
            fetch("http://localhost:8080/api/sucursales/activas", { headers: { "Authorization": `Bearer ${token}` } })
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
            const res = await fetch("http://localhost:8080/api/viajes", {
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

    return (
        <div className="viajes-page">

            {/* ENCABEZADO */}
            <div className="viajes-header">
                <div>
                    <h2>Viajes</h2>
                    <p>Gestión administrativa de trayectos fluviales</p>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                    {(esAdmin || esSupervisor) && (
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

            {/* TABLA - todos los roles la ven */}
            {!cargando && !error && (
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
                        </tr>
                        </thead>
                        <tbody>
                        {viajesFiltrados.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="tabla-vacia">
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
                                    </td>
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

        </div>
    );
}

export default Viajes;