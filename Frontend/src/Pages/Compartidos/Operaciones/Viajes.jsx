import { useState, useEffect } from "react";
import "./Viajes.css";

function Viajes() {

    const usuario = JSON.parse(localStorage.getItem("usuario"));
    const esAdmin      = usuario?.rol === "ADMIN";
    const esSupervisor = usuario?.rol === "SUPERVISOR";
    const esEmpleado   = usuario?.rol === "EMPLEADO";
    const [viajes, setViajes]           = useState([]);
    const [cargando, setCargando]       = useState(true);
    const [error, setError]             = useState(null);

    // Filtros
    const [fechaDesde, setFechaDesde]   = useState("");
    const [fechaHasta, setFechaHasta]   = useState("");
    const [rutaFiltro, setRutaFiltro]   = useState("");
    const [embFiltro, setEmbFiltro]     = useState("");
    const [estadoFiltro, setEstado]     = useState("Todos los estados");
    const [busqueda, setBusqueda]       = useState("");

    // Modal
    const [modalAbierto, setModalAbierto] = useState(false);
    const [modoEditar, setModoEditar]     = useState(false);
    const [viajeSeleccionada, setViajeSeleccionada] = useState(null);
    const [guardando, setGuardando]       = useState(false);
    const [errorModal, setErrorModal]     = useState(null);

    // Form
    const [form, setForm] = useState({
        nombre: "", direccion: "", ciudad: "", telefono: "", activo: true
    });

    // Listas únicas para los selects
    const [rutas, setRutas]             = useState([]);
    const [embarcaciones, setEmb]       = useState([]);

    useEffect(() => {
        fetchViajes();
    }, []);

    const fetchViajes = async () => {
        setCargando(true);
        setError(null);
        try {
            const token = localStorage.getItem("token");

            console.log("Token:", token); // ← para verificar en consola

            const res = await fetch("http://localhost:8080/api/viajes", {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            if (!res.ok) throw new Error("Error al obtener viajes");

            const data = await res.json();
            setViajes(data);

            const rutasUnicas = [...new Set(data.map(v => v.rutaNombre).filter(Boolean))];
            const embsUnicas  = [...new Set(data.map(v => v.embarcacionNombre).filter(Boolean))];

            setRutas(rutasUnicas);
            setEmb(embsUnicas);
        } catch (err) {
            setError(err.message);
        } finally {
            setCargando(false);
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
                <button className="btn-recargar" onClick={fetchViajes}>
                    <i className="ti ti-refresh"></i> Recargar
                </button>
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

            {/* TABLA */}

            {!cargando && !error && esAdmin && esEmpleado && esSupervisor (

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

        </div>
    );
}

export default Viajes;