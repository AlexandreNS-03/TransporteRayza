import { useState, useEffect } from "react";
import "./Sucursales.css";

function Sucursales() {
    const usuario = JSON.parse(localStorage.getItem("usuario"));
    const esAdmin = usuario?.rol === "ADMIN";
    const esEmpleado= usuario?.rol === "EMPLEADO"
    const esSupervisor = usuario?.rol === "SUPERVISOR"

    const [sucursales, setSucursales]   = useState([]);
    const [cargando, setCargando]       = useState(true);
    const [error, setError]             = useState(null);

    // Filtros
    const [busqueda, setBusqueda]       = useState("");
    const [estadoFiltro, setEstado]     = useState("todos");

    // Modal
    const [modalAbierto, setModalAbierto] = useState(false);
    const [modoEditar, setModoEditar]     = useState(false);
    const [sucursalSeleccionada, setSucursalSeleccionada] = useState(null);
    const [guardando, setGuardando]       = useState(false);
    const [errorModal, setErrorModal]     = useState(null);

    // Form
    const [form, setForm] = useState({
        nombre: "", direccion: "", ciudad: "", telefono: "", activo: true
    });

    useEffect(() => { fetchSucursales(); }, []);

    const fetchSucursales = async () => {
        setCargando(true);
        setError(null);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("http://localhost:8080/api/sucursales", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!res.ok) throw new Error("Error al obtener sucursales");
            const data = await res.json();
            setSucursales(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setCargando(false);
        }
    };

    const abrirModalCrear = () => {
        setForm({ nombre: "", direccion: "", ciudad: "", telefono: "", activo: true });
        setModoEditar(false);
        setSucursalSeleccionada(null);
        setErrorModal(null);
        setModalAbierto(true);
    };

    const abrirModalEditar = (s) => {
        setForm({
            nombre: s.nombre,
            direccion: s.direccion,
            ciudad: s.ciudad,
            telefono: s.telefono,
            activo: s.activo
        });
        setModoEditar(true);
        setSucursalSeleccionada(s);
        setErrorModal(null);
        setModalAbierto(true);
    };

    const cerrarModal = () => {
        setModalAbierto(false);
        setSucursalSeleccionada(null);
        setErrorModal(null);
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm(prev => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value
        }));
    };

    const guardar = async () => {
        if (!form.nombre || !form.ciudad) {
            setErrorModal("Nombre y ciudad son obligatorios");
            return;
        }
        setGuardando(true);
        setErrorModal(null);
        try {
            const token = localStorage.getItem("token");
            const url = modoEditar
                ? `http://localhost:8080/api/sucursales/${sucursalSeleccionada.id}`
                : "http://localhost:8080/api/sucursales";
            const method = modoEditar ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(form)
            });

            if (!res.ok) throw new Error("Error al guardar sucursal");
            cerrarModal();
            fetchSucursales();
        } catch (err) {
            setErrorModal(err.message);
        } finally {
            setGuardando(false);
        }
    };

    const toggleActivo = async (s) => {
        try {
            const token = localStorage.getItem("token");
            const url = s.activo
                ? `http://localhost:8080/api/sucursales/${s.id}`
                : `http://localhost:8080/api/sucursales/${s.id}`;

            if (s.activo) {
                await fetch(url, {
                    method: "DELETE",
                    headers: { "Authorization": `Bearer ${token}` }
                });
            } else {
                await fetch(url, {
                    method: "PUT",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ ...s, activo: true })
                });
            }
            fetchSucursales();
        } catch (err) {
            console.error(err);
        }
    };

    const limpiarFiltros = () => {
        setBusqueda("");
        setEstado("todos");
    };

    const sucursalesFiltradas = sucursales.filter(s => {
        if (busqueda && !s.nombre?.toLowerCase().includes(busqueda.toLowerCase()) &&
            !s.ciudad?.toLowerCase().includes(busqueda.toLowerCase())) return false;
        if (estadoFiltro === "activo" && !s.activo) return false;
        if (estadoFiltro === "inactivo" && s.activo) return false;
        return true;
    });

    return (
        <div className="sucursales-page">

            {/* ENCABEZADO */}
            <div className="sucursales-header">
                <div>
                    <h2>Sucursales</h2>
                    <p>Gestión de sucursales del sistema</p>
                </div>
                {esAdmin && (
                    <button className="btn-nuevo" onClick={abrirModalCrear}>
                        <i className="ti ti-plus"></i> Nueva Sucursal
                    </button>
                )}
            </div>

            {/* FILTROS */}
            <div className="sucursales-filtros">
                <div className="filtro-grupo">
                    <label>Estado</label>
                    <select value={estadoFiltro} onChange={e => setEstado(e.target.value)}>
                        <option value="todos">Todos</option>
                        <option value="activo">Activo</option>
                        <option value="inactivo">Inactivo</option>
                    </select>
                </div>

                <div className="filtro-grupo">
                    <label>Buscar</label>
                    <div className="filtro-buscar">
                        <i className="ti ti-search"></i>
                        <input
                            type="text"
                            placeholder="Nombre o ciudad..."
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
                <div className="sucursales-estado">
                    <i className="ti ti-loader-2 spin"></i>
                    <span>Cargando sucursales...</span>
                </div>
            )}

            {error && !cargando && (
                <div className="sucursales-estado error">
                    <i className="ti ti-alert-circle"></i>
                    <span>{error}</span>
                    <button onClick={fetchSucursales}>Reintentar</button>
                </div>
            )}

            {/* TABLA */}
            {!cargando && !error && (
                <div className="sucursales-tabla-wrapper">
                    <table className="sucursales-tabla">
                        <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nombre</th>
                            <th>Ciudad</th>
                            <th>Dirección</th>
                            <th>Teléfono</th>
                            <th>Estado</th>
                            {esAdmin && <th>Acciones</th>}
                        </tr>
                        </thead>
                        <tbody>
                        {sucursalesFiltradas.length === 0 ? (
                            <tr>
                                <td colSpan={esAdmin ? 7 : 6} className="tabla-vacia">
                                    <i className="ti ti-building-off"></i>
                                    <span>No se encontraron sucursales</span>
                                </td>
                            </tr>
                        ) : (
                            sucursalesFiltradas.map(s => (
                                <tr key={s.id}>
                                    <td className="codigo">{s.id}</td>
                                    <td><strong>{s.nombre}</strong></td>
                                    <td>{s.ciudad}</td>
                                    <td>{s.direccion || "—"}</td>
                                    <td>{s.telefono || "—"}</td>
                                    <td>
                                            <span className={s.activo ? "badge badge-activo" : "badge badge-inactivo"}>
                                                {s.activo ? "Activo" : "Inactivo"}
                                            </span>
                                    </td>
                                    {esAdmin && (
                                        <td className="acciones">
                                            <button
                                                className="btn-accion editar"
                                                onClick={() => abrirModalEditar(s)}
                                            >
                                                <i className="ti ti-pencil"></i>
                                            </button>
                                            <button
                                                className={`btn-accion ${s.activo ? "desactivar" : "activar"}`}
                                                onClick={() => toggleActivo(s)}
                                                title={s.activo ? "Desactivar" : "Activar"}
                                            >
                                                <i className={`ti ${s.activo ? "ti-toggle-right" : "ti-toggle-left"}`}></i>
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* MODAL */}
            {modalAbierto && (
                <div className="modal-overlay" onClick={cerrarModal}>
                    <div className="modal" onClick={e => e.stopPropagation()}>

                        <div className="modal-header">
                            <h3>{modoEditar ? "Editar Sucursal" : "Nueva Sucursal"}</h3>
                            <button className="modal-cerrar" onClick={cerrarModal}>
                                <i className="ti ti-x"></i>
                            </button>
                        </div>

                        <div className="modal-body">
                            <div className="form-grupo">
                                <label>Nombre *</label>
                                <input
                                    type="text"
                                    name="nombre"
                                    value={form.nombre}
                                    onChange={handleChange}
                                    placeholder="Ej: Sucursal Iquitos"
                                />
                            </div>

                            <div className="form-grupo">
                                <label>Ciudad *</label>
                                <input
                                    type="text"
                                    name="ciudad"
                                    value={form.ciudad}
                                    onChange={handleChange}
                                    placeholder="Ej: Iquitos"
                                />
                            </div>

                            <div className="form-grupo">
                                <label>Dirección</label>
                                <input
                                    type="text"
                                    name="direccion"
                                    value={form.direccion}
                                    onChange={handleChange}
                                    placeholder="Ej: Jr. Próspero 456"
                                />
                            </div>

                            <div className="form-grupo">
                                <label>Teléfono</label>
                                <input
                                    type="text"
                                    name="telefono"
                                    value={form.telefono}
                                    onChange={handleChange}
                                    placeholder="Ej: 065-123456"
                                />
                            </div>

                            <div className="form-grupo-check">
                                <input
                                    type="checkbox"
                                    name="activo"
                                    id="activo"
                                    checked={form.activo}
                                    onChange={handleChange}
                                />
                                <label htmlFor="activo">Sucursal activa</label>
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
                                    : <><i className="ti ti-check"></i> {modoEditar ? "Actualizar" : "Guardar"}</>
                                }
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}

export default Sucursales;