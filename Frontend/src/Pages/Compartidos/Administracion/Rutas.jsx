import { useState, useEffect } from "react";
import "./Rutas.css";

function Rutas() {
    const usuario = JSON.parse(localStorage.getItem("usuario"));
    const esAdmin = usuario?.rol === "ADMIN";

    const [rutas, setRutas]           = useState([]);
    const [cargando, setCargando]     = useState(true);
    const [error, setError]           = useState(null);
    const [busqueda, setBusqueda]     = useState("");
    const [estadoFiltro, setEstado]   = useState("todos");

    // Detalle
    const [rutaDetalle, setRutaDetalle]       = useState(null);
    const [cargandoDetalle, setCargandoDetalle] = useState(false);

    // Modal
    const [modalAbierto, setModalAbierto]     = useState(false);
    const [modoEditar, setModoEditar]         = useState(false);
    const [rutaSeleccionada, setRutaSeleccionada] = useState(null);
    const [guardando, setGuardando]           = useState(false);
    const [errorModal, setErrorModal]         = useState(null);
    const [sucursales, setSucursales]         = useState([]);

    // Form principal
    const [form, setForm] = useState({
        origen: "", destino: "", sucursalAdministradoraId: "",
        precioNormal: "", precioVip: "", duracionAproximada: "", activo: true
    });

    // Paradas dinámicas
    const [paradas, setParadas] = useState([
        { nombre: "", orden: 1 }
    ]);

    // Tarifas dinámicas
    const [tarifas, setTarifas] = useState([
        { origenTramo: "", destinoTramo: "", ordenOrigen: "", ordenDestino: "", precioNormal: "", precioVip: "" }
    ]);

    useEffect(() => { fetchRutas(); }, []);

    const fetchRutas = async () => {
        setCargando(true);
        setError(null);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("http://localhost:8080/api/rutas", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!res.ok) throw new Error("Error al obtener rutas");
            setRutas(await res.json());
        } catch (err) {
            setError(err.message);
        } finally {
            setCargando(false);
        }
    };

    const verDetalle = async (ruta) => {
        if (rutaDetalle?.id === ruta.id) {
            setRutaDetalle(null);
            return;
        }
        setCargandoDetalle(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`http://localhost:8080/api/rutas/${ruta.id}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            setRutaDetalle(await res.json());
        } catch (err) {
            console.error(err);
        } finally {
            setCargandoDetalle(false);
        }
    };

    const abrirModalCrear = async () => {
        setForm({
            origen: "", destino: "", sucursalAdministradoraId: "",
            precioNormal: "", precioVip: "", duracionAproximada: "", activo: true
        });
        setParadas([{ nombre: "", orden: 1 }]);
        setTarifas([{ origenTramo: "", destinoTramo: "", ordenOrigen: "", ordenDestino: "", precioNormal: "", precioVip: "" }]);
        setModoEditar(false);
        setRutaSeleccionada(null);
        setErrorModal(null);
        await cargarSucursales();
        setModalAbierto(true);
    };

    const abrirModalEditar = async (r) => {
        setForm({
            origen: r.origen,
            destino: r.destino,
            sucursalAdministradoraId: r.sucursalAdministradoraId,
            precioNormal: r.precioNormal,
            precioVip: r.precioVip,
            duracionAproximada: r.duracionAproximada,
            activo: r.activo
        });

        // Cargar detalle para tener paradas y tarifas
        const token = localStorage.getItem("token");
        const res = await fetch(`http://localhost:8080/api/rutas/${r.id}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const detalle = await res.json();

        setParadas(detalle.paradas?.length > 0
            ? detalle.paradas.map(p => ({ nombre: p.nombre, orden: p.orden }))
            : [{ nombre: "", orden: 1 }]
        );
        setTarifas(detalle.tarifas?.length > 0
            ? detalle.tarifas.map(t => ({
                origenTramo: t.origenTramo, destinoTramo: t.destinoTramo,
                ordenOrigen: t.ordenOrigen, ordenDestino: t.ordenDestino,
                precioNormal: t.precioNormal, precioVip: t.precioVip
            }))
            : [{ origenTramo: "", destinoTramo: "", ordenOrigen: "", ordenDestino: "", precioNormal: "", precioVip: "" }]
        );

        setModoEditar(true);
        setRutaSeleccionada(r);
        setErrorModal(null);
        await cargarSucursales();
        setModalAbierto(true);
    };

    const cargarSucursales = async () => {
        const token = localStorage.getItem("token");
        const res = await fetch("http://localhost:8080/api/sucursales/activas", {
            headers: { "Authorization": `Bearer ${token}` }
        });
        setSucursales(await res.json());
    };

    const cerrarModal = () => { setModalAbierto(false); setErrorModal(null); };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    };

    // Paradas
    const handleParada = (i, field, value) => {
        const nuevas = [...paradas];
        nuevas[i][field] = field === "orden" ? parseInt(value) : value;
        setParadas(nuevas);
    };

    const agregarParada = () => {
        setParadas(prev => [...prev, { nombre: "", orden: prev.length + 1 }]);
    };

    const eliminarParada = (i) => {
        setParadas(prev => prev.filter((_, idx) => idx !== i));
    };

    // Tarifas
    const handleTarifa = (i, field, value) => {
        const nuevas = [...tarifas];
        nuevas[i][field] = value;
        setTarifas(nuevas);
    };

    const agregarTarifa = () => {
        setTarifas(prev => [...prev, {
            origenTramo: "", destinoTramo: "",
            ordenOrigen: "", ordenDestino: "",
            precioNormal: "", precioVip: ""
        }]);
    };

    const eliminarTarifa = (i) => {
        setTarifas(prev => prev.filter((_, idx) => idx !== i));
    };

    const guardar = async () => {
        if (!form.origen || !form.destino || !form.sucursalAdministradoraId) {
            setErrorModal("Origen, destino y sucursal son obligatorios");
            return;
        }
        setGuardando(true);
        setErrorModal(null);
        try {
            const token = localStorage.getItem("token");
            const url = modoEditar
                ? `http://localhost:8080/api/rutas/${rutaSeleccionada.id}`
                : "http://localhost:8080/api/rutas";
            const method = modoEditar ? "PUT" : "POST";

            const body = {
                ...form,
                precioNormal: parseFloat(form.precioNormal),
                precioVip: parseFloat(form.precioVip),
                paradas: paradas.filter(p => p.nombre),
                tarifas: tarifas.filter(t => t.origenTramo && t.destinoTramo).map(t => ({
                    ...t,
                    ordenOrigen: parseInt(t.ordenOrigen),
                    ordenDestino: parseInt(t.ordenDestino),
                    precioNormal: parseFloat(t.precioNormal),
                    precioVip: parseFloat(t.precioVip)
                }))
            };

            const res = await fetch(url, {
                method,
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(body)
            });

            if (!res.ok) throw new Error("Error al guardar ruta");
            cerrarModal();
            fetchRutas();
        } catch (err) {
            setErrorModal(err.message);
        } finally {
            setGuardando(false);
        }
    };

    const toggleActivo = async (r) => {
        try {
            const token = localStorage.getItem("token");
            if (r.activo) {
                await fetch(`http://localhost:8080/api/rutas/${r.id}`, {
                    method: "DELETE",
                    headers: { "Authorization": `Bearer ${token}` }
                });
            } else {
                await fetch(`http://localhost:8080/api/rutas/${r.id}`, {
                    method: "PUT",
                    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                    body: JSON.stringify({ ...r, activo: true })
                });
            }
            fetchRutas();
        } catch (err) { console.error(err); }
    };

    const limpiarFiltros = () => { setBusqueda(""); setEstado("todos"); };

    const rutasFiltradas = rutas.filter(r => {
        if (busqueda && !r.origen?.toLowerCase().includes(busqueda.toLowerCase()) &&
            !r.destino?.toLowerCase().includes(busqueda.toLowerCase())) return false;
        if (estadoFiltro === "activo"   && !r.activo) return false;
        if (estadoFiltro === "inactivo" && r.activo)  return false;
        return true;
    });

    return (
        <div className="rutas-page">

            {/* ENCABEZADO */}
            <div className="rutas-header">
                <div>
                    <h2>Rutas</h2>
                    <p>Gestión de rutas fluviales</p>
                </div>
                {esAdmin && (
                    <button className="btn-nuevo" onClick={abrirModalCrear}>
                        <i className="ti ti-plus"></i> Nueva Ruta
                    </button>
                )}
            </div>

            {/* FILTROS */}
            <div className="rutas-filtros">
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
                            placeholder="Origen o destino..."
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
                <div className="rutas-estado">
                    <i className="ti ti-loader-2 spin"></i>
                    <span>Cargando rutas...</span>
                </div>
            )}

            {error && !cargando && (
                <div className="rutas-estado error">
                    <i className="ti ti-alert-circle"></i>
                    <span>{error}</span>
                    <button onClick={fetchRutas}>Reintentar</button>
                </div>
            )}

            {/* TABLA */}
            {!cargando && !error && (
                <div className="rutas-tabla-wrapper">
                    <table className="rutas-tabla">
                        <thead>
                        <tr>
                            <th>ID</th>
                            <th>Origen</th>
                            <th>Destino</th>
                            <th>Sucursal</th>
                            <th>Precio Normal</th>
                            <th>Precio VIP</th>
                            <th>Duración</th>
                            <th>Estado</th>
                            <th>Detalle</th>
                            {esAdmin && <th>Acciones</th>}
                        </tr>
                        </thead>
                        <tbody>
                        {rutasFiltradas.length === 0 ? (
                            <tr>
                                <td colSpan={esAdmin ? 10 : 9} className="tabla-vacia">
                                    <i className="ti ti-route-off"></i>
                                    <span>No se encontraron rutas</span>
                                </td>
                            </tr>
                        ) : (
                            rutasFiltradas.map(r => (
                                <>
                                    <tr key={r.id}>
                                        <td className="codigo">{r.id}</td>
                                        <td><strong>{r.origen}</strong></td>
                                        <td><strong>{r.destino}</strong></td>
                                        <td>{r.sucursalAdministradoraNombre || "—"}</td>
                                        <td>S/ {r.precioNormal}</td>
                                        <td>S/ {r.precioVip}</td>
                                        <td>{r.duracionAproximada || "—"}</td>
                                        <td>
                                                <span className={r.activo ? "badge badge-activo" : "badge badge-inactivo"}>
                                                    {r.activo ? "Activo" : "Inactivo"}
                                                </span>
                                        </td>
                                        <td>
                                            <button
                                                className="btn-accion detalle"
                                                onClick={() => verDetalle(r)}
                                                title="Ver paradas y tarifas"
                                            >
                                                <i className={`ti ${rutaDetalle?.id === r.id ? "ti-chevron-up" : "ti-chevron-down"}`}></i>
                                            </button>
                                        </td>
                                        {esAdmin && (
                                            <td className="acciones">
                                                <button className="btn-accion editar" onClick={() => abrirModalEditar(r)}>
                                                    <i className="ti ti-pencil"></i>
                                                </button>
                                                <button
                                                    className={`btn-accion ${r.activo ? "desactivar" : "activar"}`}
                                                    onClick={() => toggleActivo(r)}
                                                >
                                                    <i className={`ti ${r.activo ? "ti-toggle-right" : "ti-toggle-left"}`}></i>
                                                </button>
                                            </td>
                                        )}
                                    </tr>

                                    {/* FILA DE DETALLE */}
                                    {rutaDetalle?.id === r.id && (
                                        <tr key={`detalle-${r.id}`} className="fila-detalle">
                                            <td colSpan={esAdmin ? 10 : 9}>
                                                {cargandoDetalle ? (
                                                    <div className="detalle-cargando">
                                                        <i className="ti ti-loader-2 spin"></i> Cargando...
                                                    </div>
                                                ) : (
                                                    <div className="detalle-contenido">

                                                        {/* PARADAS */}
                                                        <div className="detalle-seccion">
                                                            <h4><i className="ti ti-map-pin"></i> Paradas</h4>
                                                            <div className="paradas-lista">
                                                                {rutaDetalle.paradas?.map((p, i) => (
                                                                    <div key={i} className="parada-item">
                                                                        <span className="parada-orden">{p.orden}</span>
                                                                        <span>{p.nombre}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* TARIFAS */}
                                                        <div className="detalle-seccion">
                                                            <h4><i className="ti ti-receipt"></i> Tarifas por Tramo</h4>
                                                            <table className="tarifas-tabla">
                                                                <thead>
                                                                <tr>
                                                                    <th>Origen</th>
                                                                    <th>Destino</th>
                                                                    <th>Normal</th>
                                                                    <th>VIP</th>
                                                                </tr>
                                                                </thead>
                                                                <tbody>
                                                                {rutaDetalle.tarifas?.map((t, i) => (
                                                                    <tr key={i}>
                                                                        <td>{t.origenTramo}</td>
                                                                        <td>{t.destinoTramo}</td>
                                                                        <td>S/ {t.precioNormal}</td>
                                                                        <td>S/ {t.precioVip}</td>
                                                                    </tr>
                                                                ))}
                                                                </tbody>
                                                            </table>
                                                        </div>

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
                    <div className="modal modal-grande" onClick={e => e.stopPropagation()}>

                        <div className="modal-header">
                            <h3>{modoEditar ? "Editar Ruta" : "Nueva Ruta"}</h3>
                            <button className="modal-cerrar" onClick={cerrarModal}>
                                <i className="ti ti-x"></i>
                            </button>
                        </div>

                        <div className="modal-body modal-scroll">

                            {/* DATOS PRINCIPALES */}
                            <p className="modal-seccion-titulo">Datos de la Ruta</p>

                            <div className="form-fila">
                                <div className="form-grupo">
                                    <label>Origen *</label>
                                    <input type="text" name="origen" value={form.origen}
                                           onChange={handleChange} placeholder="Ej: Requena" />
                                </div>
                                <div className="form-grupo">
                                    <label>Destino *</label>
                                    <input type="text" name="destino" value={form.destino}
                                           onChange={handleChange} placeholder="Ej: Iquitos" />
                                </div>
                            </div>

                            <div className="form-grupo">
                                <label>Sucursal Administradora *</label>
                                <select name="sucursalAdministradoraId"
                                        value={form.sucursalAdministradoraId} onChange={handleChange}>
                                    <option value="">Seleccionar sucursal...</option>
                                    {sucursales.map(s => (
                                        <option key={s.id} value={s.id}>{s.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-fila">
                                <div className="form-grupo">
                                    <label>Precio Normal (S/)</label>
                                    <input type="number" name="precioNormal" value={form.precioNormal}
                                           onChange={handleChange} placeholder="0.00" min="0" step="0.01" />
                                </div>
                                <div className="form-grupo">
                                    <label>Precio VIP (S/)</label>
                                    <input type="number" name="precioVip" value={form.precioVip}
                                           onChange={handleChange} placeholder="0.00" min="0" step="0.01" />
                                </div>
                            </div>

                            <div className="form-fila">
                                <div className="form-grupo">
                                    <label>Duración Aproximada</label>
                                    <input type="text" name="duracionAproximada" value={form.duracionAproximada}
                                           onChange={handleChange} placeholder="Ej: 8 horas" />
                                </div>
                                <div className="form-grupo-check" style={{ alignSelf: "flex-end", paddingBottom: "8px" }}>
                                    <input type="checkbox" name="activo" id="activo"
                                           checked={form.activo} onChange={handleChange} />
                                    <label htmlFor="activo">Ruta activa</label>
                                </div>
                            </div>

                            {/* PARADAS */}
                            <div className="modal-separador"></div>
                            <p className="modal-seccion-titulo">
                                <i className="ti ti-map-pin"></i> Paradas
                            </p>

                            {paradas.map((p, i) => (
                                <div key={i} className="form-fila form-fila-parada">
                                    <div className="form-grupo" style={{ width: "70px" }}>
                                        <label>Orden</label>
                                        <input type="number" value={p.orden} min="1"
                                               onChange={e => handleParada(i, "orden", e.target.value)} />
                                    </div>
                                    <div className="form-grupo" style={{ flex: 1 }}>
                                        <label>Nombre de Parada</label>
                                        <input type="text" value={p.nombre} placeholder="Ej: Herrera"
                                               onChange={e => handleParada(i, "nombre", e.target.value)} />
                                    </div>
                                    {paradas.length > 1 && (
                                        <button className="btn-eliminar-fila" onClick={() => eliminarParada(i)}>
                                            <i className="ti ti-trash"></i>
                                        </button>
                                    )}
                                </div>
                            ))}

                            <button className="btn-agregar-fila" onClick={agregarParada}>
                                <i className="ti ti-plus"></i> Agregar Parada
                            </button>

                            {/* TARIFAS */}
                            <div className="modal-separador"></div>
                            <p className="modal-seccion-titulo">
                                <i className="ti ti-receipt"></i> Tarifas por Tramo
                            </p>

                            {tarifas.map((t, i) => (
                                <div key={i} className="tarifa-fila">
                                    <div className="form-fila">
                                        <div className="form-grupo">
                                            <label>Origen Tramo</label>
                                            <input type="text" value={t.origenTramo} placeholder="Ej: Requena"
                                                   onChange={e => handleTarifa(i, "origenTramo", e.target.value)} />
                                        </div>
                                        <div className="form-grupo">
                                            <label>Destino Tramo</label>
                                            <input type="text" value={t.destinoTramo} placeholder="Ej: Iquitos"
                                                   onChange={e => handleTarifa(i, "destinoTramo", e.target.value)} />
                                        </div>
                                        <div className="form-grupo" style={{ width: "80px" }}>
                                            <label>Ord. Origen</label>
                                            <input type="number" value={t.ordenOrigen} min="1"
                                                   onChange={e => handleTarifa(i, "ordenOrigen", e.target.value)} />
                                        </div>
                                        <div className="form-grupo" style={{ width: "80px" }}>
                                            <label>Ord. Destino</label>
                                            <input type="number" value={t.ordenDestino} min="1"
                                                   onChange={e => handleTarifa(i, "ordenDestino", e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="form-fila">
                                        <div className="form-grupo">
                                            <label>Precio Normal (S/)</label>
                                            <input type="number" value={t.precioNormal} placeholder="0.00" min="0" step="0.01"
                                                   onChange={e => handleTarifa(i, "precioNormal", e.target.value)} />
                                        </div>
                                        <div className="form-grupo">
                                            <label>Precio VIP (S/)</label>
                                            <input type="number" value={t.precioVip} placeholder="0.00" min="0" step="0.01"
                                                   onChange={e => handleTarifa(i, "precioVip", e.target.value)} />
                                        </div>
                                        {tarifas.length > 1 && (
                                            <button className="btn-eliminar-fila" style={{ alignSelf: "flex-end" }}
                                                    onClick={() => eliminarTarifa(i)}>
                                                <i className="ti ti-trash"></i>
                                            </button>
                                        )}
                                    </div>
                                    {i < tarifas.length - 1 && <div className="tarifa-separador"></div>}
                                </div>
                            ))}

                            <button className="btn-agregar-fila" onClick={agregarTarifa}>
                                <i className="ti ti-plus"></i> Agregar Tarifa
                            </button>

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
            {/*FIN DEL MODAL*/}
        </div>
    );
}

export default Rutas;