import { useState, useEffect } from "react";
import "./Embarcaciones.css";

function Embarcaciones() {
    const usuario = JSON.parse(localStorage.getItem("usuario"));
    const esAdmin = usuario?.rol === "ADMIN";

    const [embarcaciones, setEmbarcaciones] = useState([]);
    const [cargando, setCargando]           = useState(true);
    const [error, setError]                 = useState(null);
    const [busqueda, setBusqueda]           = useState("");
    const [estadoFiltro, setEstado]         = useState("todos");

    // Detalle asientos
    const [embDetalle, setEmbDetalle]             = useState(null);
    const [cargandoDetalle, setCargandoDetalle]   = useState(false);

    // Modal
    const [modalAbierto, setModalAbierto]         = useState(false);
    const [modoEditar, setModoEditar]             = useState(false);
    const [embSeleccionada, setEmbSeleccionada]   = useState(null);
    const [guardando, setGuardando]               = useState(false);
    const [errorModal, setErrorModal]             = useState(null);

    const [form, setForm] = useState({
        nombre: "", codigo: "", cantidadVip: "", cantidadNormal: "", activo: true
    });

    useEffect(() => { fetchEmbarcaciones(); }, []);

    const fetchEmbarcaciones = async () => {
        setCargando(true);
        setError(null);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("http://localhost:8080/api/embarcaciones", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!res.ok) throw new Error("Error al obtener embarcaciones");
            setEmbarcaciones(await res.json());
        } catch (err) {
            setError(err.message);
        } finally {
            setCargando(false);
        }
    };

    const verDetalle = async (emb) => {
        if (embDetalle?.id === emb.id) { setEmbDetalle(null); return; }
        setCargandoDetalle(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`http://localhost:8080/api/embarcaciones/${emb.id}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            setEmbDetalle(await res.json());
        } catch (err) {
            console.error(err);
        } finally {
            setCargandoDetalle(false);
        }
    };

    const abrirModalCrear = () => {
        setForm({ nombre: "", codigo: "", cantidadVip: "", cantidadNormal: "", activo: true });
        setModoEditar(false);
        setEmbSeleccionada(null);
        setErrorModal(null);
        setModalAbierto(true);
    };

    const abrirModalEditar = (emb) => {
        setForm({
            nombre: emb.nombre,
            codigo: emb.codigo,
            cantidadVip: emb.cantidadVip,
            cantidadNormal: emb.cantidadNormal,
            activo: emb.activo
        });
        setModoEditar(true);
        setEmbSeleccionada(emb);
        setErrorModal(null);
        setModalAbierto(true);
    };

    const cerrarModal = () => { setModalAbierto(false); setErrorModal(null); };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    };

    const guardar = async () => {
        if (!form.nombre || !form.codigo || !form.cantidadVip || !form.cantidadNormal) {
            setErrorModal("Todos los campos son obligatorios");
            return;
        }
        setGuardando(true);
        setErrorModal(null);
        try {
            const token = localStorage.getItem("token");
            const url = modoEditar
                ? `http://localhost:8080/api/embarcaciones/${embSeleccionada.id}`
                : "http://localhost:8080/api/embarcaciones";
            const method = modoEditar ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    ...form,
                    cantidadVip:    parseInt(form.cantidadVip),
                    cantidadNormal: parseInt(form.cantidadNormal)
                })
            });

            if (!res.ok) throw new Error("Error al guardar embarcación");
            cerrarModal();
            fetchEmbarcaciones();
        } catch (err) {
            setErrorModal(err.message);
        } finally {
            setGuardando(false);
        }
    };

    const toggleActivo = async (emb) => {
        try {
            const token = localStorage.getItem("token");
            if (emb.activo) {
                await fetch(`http://localhost:8080/api/embarcaciones/${emb.id}`, {
                    method: "DELETE",
                    headers: { "Authorization": `Bearer ${token}` }
                });
            } else {
                await fetch(`http://localhost:8080/api/embarcaciones/${emb.id}`, {
                    method: "PUT",
                    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                    body: JSON.stringify({ ...emb, activo: true })
                });
            }
            fetchEmbarcaciones();
        } catch (err) { console.error(err); }
    };

    const limpiarFiltros = () => { setBusqueda(""); setEstado("todos"); };

    const embFiltradas = embarcaciones.filter(e => {
        if (busqueda && !e.nombre?.toLowerCase().includes(busqueda.toLowerCase()) &&
            !e.codigo?.toLowerCase().includes(busqueda.toLowerCase())) return false;
        if (estadoFiltro === "activo"   && !e.activo) return false;
        if (estadoFiltro === "inactivo" && e.activo)  return false;
        return true;
    });

    // Calcular capacidad total al vuelo
    const capacidadTotal = parseInt(form.cantidadVip || 0) + parseInt(form.cantidadNormal || 0);

    return (
        <div className="emb-page">

            {/* ENCABEZADO */}
            <div className="emb-header">
                <div>
                    <h2>Embarcaciones</h2>
                    <p>Gestión de embarcaciones fluviales</p>
                </div>
                {esAdmin && (
                    <button className="btn-nuevo" onClick={abrirModalCrear}>
                        <i className="ti ti-plus"></i> Nueva Embarcación
                    </button>
                )}
            </div>

            {/* FILTROS */}
            <div className="emb-filtros">
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
                            placeholder="Nombre o código..."
                            value={busqueda}
                            onChange={e => setBusqueda(e.target.value)}
                        />
                    </div>
                </div>
                <button className="btn-limpiar" onClick={limpiarFiltros}>
                    <i className="ti ti-filter-off"></i> Limpiar filtro
                </button>
            </div>

            {/* ESTADOS */}
            {cargando && (
                <div className="emb-estado">
                    <i className="ti ti-loader-2 spin"></i>
                    <span>Cargando embarcaciones...</span>
                </div>
            )}

            {error && !cargando && (
                <div className="emb-estado error">
                    <i className="ti ti-alert-circle"></i>
                    <span>{error}</span>
                    <button onClick={fetchEmbarcaciones}>Reintentar</button>
                </div>
            )}

            {/* TABLA */}
            {!cargando && !error && (
                <div className="emb-tabla-wrapper">
                    <table className="emb-tabla">
                        <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nombre</th>
                            <th>Código</th>
                            <th>VIP</th>
                            <th>Normal</th>
                            <th>Total</th>
                            <th>Estado</th>
                            <th>Asientos</th>
                            {esAdmin && <th>Acciones</th>}
                        </tr>
                        </thead>
                        <tbody>
                        {embFiltradas.length === 0 ? (
                            <tr>
                                <td colSpan={esAdmin ? 9 : 8} className="tabla-vacia">
                                    <i className="ti ti-ship-off"></i>
                                    <span>No se encontraron embarcaciones</span>
                                </td>
                            </tr>
                        ) : (
                            embFiltradas.map(emb => (
                                <>
                                    <tr key={emb.id}>
                                        <td className="codigo">{emb.id}</td>
                                        <td><strong>{emb.nombre}</strong></td>
                                        <td>{emb.codigo}</td>
                                        <td>
                                                <span className="cant-badge vip">
                                                    {emb.cantidadVip} VIP
                                                </span>
                                        </td>
                                        <td>
                                                <span className="cant-badge normal">
                                                    {emb.cantidadNormal} Normal
                                                </span>
                                        </td>
                                        <td><strong>{emb.capacidadTotal}</strong></td>
                                        <td>
                                                <span className={emb.activo ? "badge badge-activo" : "badge badge-inactivo"}>
                                                    {emb.activo ? "Activo" : "Inactivo"}
                                                </span>
                                        </td>
                                        <td>
                                            <button
                                                className="btn-accion detalle"
                                                onClick={() => verDetalle(emb)}
                                                title="Ver asientos"
                                            >
                                                <i className={`ti ${embDetalle?.id === emb.id ? "ti-chevron-up" : "ti-chevron-down"}`}></i>
                                            </button>
                                        </td>
                                        {esAdmin && (
                                            <td className="acciones">
                                                <button className="btn-accion editar" onClick={() => abrirModalEditar(emb)}>
                                                    <i className="ti ti-pencil"></i>
                                                </button>
                                                <button
                                                    className={`btn-accion ${emb.activo ? "desactivar" : "activar"}`}
                                                    onClick={() => toggleActivo(emb)}
                                                >
                                                    <i className={`ti ${emb.activo ? "ti-toggle-right" : "ti-toggle-left"}`}></i>
                                                </button>
                                            </td>
                                        )}
                                    </tr>

                                    {/* FILA DETALLE ASIENTOS */}
                                    {embDetalle?.id === emb.id && (
                                        <tr key={`detalle-${emb.id}`} className="fila-detalle">
                                            <td colSpan={esAdmin ? 9 : 8}>
                                                {cargandoDetalle ? (
                                                    <div className="detalle-cargando">
                                                        <i className="ti ti-loader-2 spin"></i> Cargando asientos...
                                                    </div>
                                                ) : (
                                                    <div className="detalle-contenido">
                                                        <h4><i className="ti ti-armchair"></i> Distribución de Asientos</h4>

                                                        {/* VIP */}
                                                        {embDetalle.asientos?.filter(a => a.tipo === "VIP").length > 0 && (
                                                            <div className="asientos-grupo">
                                                                <p className="asientos-titulo">VIP</p>
                                                                <div className="asientos-grid">
                                                                    {embDetalle.asientos
                                                                        .filter(a => a.tipo === "VIP")
                                                                        .map(a => (
                                                                            <div key={a.id} className="asiento-box vip">
                                                                                {a.numero}
                                                                            </div>
                                                                        ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* NORMAL */}
                                                        {embDetalle.asientos?.filter(a => a.tipo === "NORMAL").length > 0 && (
                                                            <div className="asientos-grupo">
                                                                <p className="asientos-titulo">Normal</p>
                                                                <div className="asientos-grid">
                                                                    {embDetalle.asientos
                                                                        .filter(a => a.tipo === "NORMAL")
                                                                        .map(a => (
                                                                            <div key={a.id} className="asiento-box normal">
                                                                                {a.numero}
                                                                            </div>
                                                                        ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    )}
                                </>
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
                            <h3>{modoEditar ? "Editar Embarcación" : "Nueva Embarcación"}</h3>
                            <button className="modal-cerrar" onClick={cerrarModal}>
                                <i className="ti ti-x"></i>
                            </button>
                        </div>

                        <div className="modal-body">
                            <div className="form-grupo">
                                <label>Nombre *</label>
                                <input type="text" name="nombre" value={form.nombre}
                                       onChange={handleChange} placeholder="Ej: RAYZA II" />
                            </div>

                            <div className="form-grupo">
                                <label>Código *</label>
                                <input type="text" name="codigo" value={form.codigo}
                                       onChange={handleChange} placeholder="Ej: RAY-002"
                                       disabled={modoEditar} />
                                {modoEditar && (
                                    <span className="form-hint">El código no se puede cambiar</span>
                                )}
                            </div>

                            <div className="form-fila">
                                <div className="form-grupo">
                                    <label>Cantidad VIP *</label>
                                    <input type="number" name="cantidadVip" value={form.cantidadVip}
                                           onChange={handleChange} placeholder="0" min="0" />
                                </div>
                                <div className="form-grupo">
                                    <label>Cantidad Normal *</label>
                                    <input type="number" name="cantidadNormal" value={form.cantidadNormal}
                                           onChange={handleChange} placeholder="0" min="0" />
                                </div>
                            </div>

                            {/* Capacidad total calculada */}
                            {(form.cantidadVip || form.cantidadNormal) && (
                                <div className="capacidad-total">
                                    <i className="ti ti-armchair"></i>
                                    Capacidad total: <strong>{capacidadTotal} asientos</strong>
                                    {modoEditar && (
                                        <span className="form-hint" style={{ marginLeft: "8px" }}>
                                            (los asientos se regenerarán)
                                        </span>
                                    )}
                                </div>
                            )}

                            <div className="form-grupo-check">
                                <input type="checkbox" name="activo" id="activo"
                                       checked={form.activo} onChange={handleChange} />
                                <label htmlFor="activo">Embarcación activa</label>
                            </div>

                            {errorModal && (
                                <div className="modal-error">
                                    <i className="ti ti-alert-circle"></i>
                                    {errorModal}
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button className="btn-cancelar" onClick={cerrarModal}>Cancelar</button>
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

export default Embarcaciones;