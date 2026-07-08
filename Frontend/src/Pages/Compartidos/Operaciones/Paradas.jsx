import { useState, useEffect } from "react";
import "./Paradas.css";

const API = "http://localhost:8080";

function token() { return localStorage.getItem("token"); }

async function apiFetch(url, opts = {}) {
    const res = await fetch(`${API}${url}`, {
        ...opts,
        headers: { "Authorization": `Bearer ${token()}`, "Content-Type": "application/json", ...opts.headers }
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

function Paradas() {
    const usuario  = JSON.parse(localStorage.getItem("usuario"));
    const esAdmin  = usuario?.rol === "ADMIN";

    const [rutas, setRutas]               = useState([]);
    const [rutaId, setRutaId]             = useState("");
    const [rutaDetalle, setRutaDetalle]   = useState(null);
    const [paradas, setParadas]           = useState([]);
    const [cargando, setCargando]         = useState(false);
    const [cargandoRutas, setCargandoRutas] = useState(true);
    const [error, setError]               = useState(null);
    const [tabActivo, setTabActivo] = useState("paradas");
    const [embarcaciones, setEmbarcaciones] = useState([]);

    // Modal
    const [modalAbierto, setModal]        = useState(false);
    const [modoEditar, setModoEditar]     = useState(false);
    const [paradaSeleccionada, setParadaSel] = useState(null);
    const [guardando, setGuardando]       = useState(false);
    const [errorModal, setErrorModal]     = useState(null);
    const [form, setForm]                 = useState({ nombre: "", orden: "" });

    // Reordenar
    const [reordenando, setReordenando]   = useState(false);
    const [guardandoOrden, setGuardandoOrden] = useState(false);

    useEffect(() => { fetchRutas(); }, []);
    useEffect(() => { if (rutaId) fetchParadas(); }, [rutaId]);

    const fetchRutas = async () => {
        setCargandoRutas(true);
        try {
            const data = await apiFetch("/api/rutas");
            setRutas(data);
        } catch (err) { console.error(err); }
        finally { setCargandoRutas(false); }
    };

    const fetchParadas = async () => {
        setCargando(true);
        setError(null);
        try {
            const data = await apiFetch(`/api/rutas/${rutaId}`);
            setRutaDetalle(data);
            setParadas([...(data.paradas || [])].sort((a, b) => a.orden - b.orden));
        } catch (err) { setError("Error al cargar paradas"); }
        finally { setCargando(false); }
    };

    const fetchEmbarcaciones = async () => {
        try {
            const data = await apiFetch("/api/embarcaciones");
            // Filtrar solo las que tienen viajes en esta ruta
            // Por ahora mostramos todas las activas
            setEmbarcaciones(data.filter(e => e.activo));
        } catch (err) { console.error(err); }
    };

    const abrirModalCrear = () => {
        const maxOrden = paradas.length > 0 ? Math.max(...paradas.map(p => p.orden)) + 1 : 1;
        setForm({ nombre: "", orden: maxOrden });
        setModoEditar(false);
        setParadaSel(null);
        setErrorModal(null);
        setModal(true);
    };

    const abrirModalEditar = (p) => {
        setForm({ nombre: p.nombre, orden: p.orden });
        setModoEditar(true);
        setParadaSel(p);
        setErrorModal(null);
        setModal(true);
    };

    const cerrarModal = () => { setModal(false); setErrorModal(null); };

    const guardar = async () => {
        if (!form.nombre || !form.orden) {
            setErrorModal("Nombre y orden son obligatorios");
            return;
        }
        setGuardando(true);
        setErrorModal(null);
        try {
            // Reconstruir paradas completas con el cambio
            let nuevasParadas;
            if (modoEditar) {
                nuevasParadas = paradas.map(p =>
                    p.id === paradaSeleccionada.id
                        ? { nombre: form.nombre, orden: parseInt(form.orden) }
                        : { nombre: p.nombre, orden: p.orden }
                );
            } else {
                nuevasParadas = [
                    ...paradas.map(p => ({ nombre: p.nombre, orden: p.orden })),
                    { nombre: form.nombre, orden: parseInt(form.orden) }
                ];
            }

            await apiFetch(`/api/rutas/${rutaId}`, {
                method: "PUT",
                body: JSON.stringify({
                    origen:                   rutaDetalle.origen,
                    destino:                  rutaDetalle.destino,
                    sucursalAdministradoraId: rutaDetalle.sucursalAdministradoraId,
                    precioNormal:             rutaDetalle.precioNormal,
                    precioVip:                rutaDetalle.precioVip,
                    duracionAproximada:       rutaDetalle.duracionAproximada,
                    activo:                   rutaDetalle.activo,
                    paradas:                  nuevasParadas,
                    tarifas:                  (rutaDetalle.tarifas || []).map(t => ({
                        origenTramo:  t.origenTramo,
                        destinoTramo: t.destinoTramo,
                        ordenOrigen:  t.ordenOrigen,
                        ordenDestino: t.ordenDestino,
                        precioNormal: t.precioNormal,
                        precioVip:    t.precioVip
                    }))
                })
            });
            cerrarModal();
            fetchParadas();
        } catch (err) { setErrorModal("Error al guardar parada"); }
        finally { setGuardando(false); }
    };

    const eliminarParada = async (parada) => {
        if (!confirm(`¿Eliminar la parada "${parada.nombre}"?`)) return;
        try {
            const nuevasParadas = paradas
                .filter(p => p.id !== parada.id)
                .map(p => ({ nombre: p.nombre, orden: p.orden }));

            await apiFetch(`/api/rutas/${rutaId}`, {
                method: "PUT",
                body: JSON.stringify({
                    origen:                   rutaDetalle.origen,
                    destino:                  rutaDetalle.destino,
                    sucursalAdministradoraId: rutaDetalle.sucursalAdministradoraId,
                    precioNormal:             rutaDetalle.precioNormal,
                    precioVip:                rutaDetalle.precioVip,
                    duracionAproximada:       rutaDetalle.duracionAproximada,
                    activo:                   rutaDetalle.activo,
                    paradas:                  nuevasParadas,
                    tarifas:                  (rutaDetalle.tarifas || []).map(t => ({
                        origenTramo:  t.origenTramo,
                        destinoTramo: t.destinoTramo,
                        ordenOrigen:  t.ordenOrigen,
                        ordenDestino: t.ordenDestino,
                        precioNormal: t.precioNormal,
                        precioVip:    t.precioVip
                    }))
                })
            });
            fetchParadas();
        } catch (err) { alert("Error al eliminar parada"); }
    };

    // Reordenar arrastrando
    const moverArriba = (i) => {
        if (i === 0) return;
        const nuevas = [...paradas];
        const temp = nuevas[i].orden;
        nuevas[i].orden = nuevas[i - 1].orden;
        nuevas[i - 1].orden = temp;
        setParadas([...nuevas].sort((a, b) => a.orden - b.orden));
    };

    const moverAbajo = (i) => {
        if (i === paradas.length - 1) return;
        const nuevas = [...paradas];
        const temp = nuevas[i].orden;
        nuevas[i].orden = nuevas[i + 1].orden;
        nuevas[i + 1].orden = temp;
        setParadas([...nuevas].sort((a, b) => a.orden - b.orden));
    };

    const guardarOrden = async () => {
        setGuardandoOrden(true);
        try {
            await apiFetch(`/api/rutas/${rutaId}`, {
                method: "PUT",
                body: JSON.stringify({
                    origen:                   rutaDetalle.origen,
                    destino:                  rutaDetalle.destino,
                    sucursalAdministradoraId: rutaDetalle.sucursalAdministradoraId,
                    precioNormal:             rutaDetalle.precioNormal,
                    precioVip:                rutaDetalle.precioVip,
                    duracionAproximada:       rutaDetalle.duracionAproximada,
                    activo:                   rutaDetalle.activo,
                    paradas: paradas.map((p, i) => ({ nombre: p.nombre, orden: i + 1 })),
                    tarifas: (rutaDetalle.tarifas || []).map(t => ({
                        origenTramo:  t.origenTramo,
                        destinoTramo: t.destinoTramo,
                        ordenOrigen:  t.ordenOrigen,
                        ordenDestino: t.ordenDestino,
                        precioNormal: t.precioNormal,
                        precioVip:    t.precioVip
                    }))
                })
            });
            setReordenando(false);
            fetchParadas();
        } catch (err) { alert("Error al guardar orden"); }
        finally { setGuardandoOrden(false); }
    };

    const rutaSeleccionada = rutas.find(r => r.id === rutaId);

    return (
        <div className="paradas-page">

            {/* ENCABEZADO */}
            <div className="paradas-header">
                <div>
                    <h2>Paradas</h2>
                    <p>Gestión de paradas por ruta</p>
                </div>
            </div>

            {/* SELECTOR RUTA */}
            <div className="paradas-selector">
                <div className="filtro-grupo">
                    <label>Seleccionar Ruta</label>
                    <select
                        value={rutaId}
                        onChange={e => { setRutaId(e.target.value); setReordenando(false); }}
                        disabled={cargandoRutas}
                    >
                        <option value="">
                            {cargandoRutas ? "Cargando rutas..." : "Seleccionar ruta..."}
                        </option>
                        {rutas.map(r => (
                            <option key={r.id} value={r.id}>
                                {r.origen} → {r.destino} — {r.sucursalAdministradoraNombre || "Sin sucursal"}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* ESTADO VACÍO */}
            {!rutaId && (
                <div className="paradas-vacio">
                    <i className="ti ti-map-pin-off"></i>
                    <span>Selecciona una ruta para ver sus paradas</span>
                </div>
            )}

            {/* CARGANDO */}
            {rutaId && cargando && (
                <div className="paradas-estado">
                    <i className="ti ti-loader-2 spin"></i>
                    <span>Cargando paradas...</span>
                </div>
            )}

            {/* ERROR */}
            {rutaId && error && !cargando && (
                <div className="paradas-estado error">
                    <i className="ti ti-alert-circle"></i>
                    <span>{error}</span>
                </div>
            )}

            {/* CONTENIDO */}
            {rutaId && !cargando && !error && (
                <div className="paradas-contenido">

                    {/* INFO RUTA */}
                    <div className="ruta-info-card">
                        <div className="ruta-info-item">
                            <i className="ti ti-route"></i>
                            <span><strong>{rutaSeleccionada?.origen}</strong> → <strong>{rutaSeleccionada?.destino}</strong></span>
                        </div>
                        <div className="ruta-info-item">
                            <i className="ti ti-building"></i>
                            <span>{rutaDetalle?.sucursalAdministradoraNombre || "—"}</span>
                        </div>
                        <div className="ruta-info-item">
                            <i className="ti ti-clock"></i>
                            <span>{rutaSeleccionada?.duracionAproximada || "—"}</span>
                        </div>
                        <div className="ruta-info-item">
                            <i className="ti ti-cash"></i>
                            <span>Normal: <strong>S/ {rutaDetalle?.precioNormal}</strong></span>
                        </div>
                        <div className="ruta-info-item">
                            <i className="ti ti-star"></i>
                            <span>VIP: <strong>S/ {rutaDetalle?.precioVip}</strong></span>
                        </div>
                    </div>

                    {/* TABS */}
                    <div className="tabs-container">
                        <div className="tabs-header">
                            <button
                                className={`tab-btn ${tabActivo === "paradas" ? "activo" : ""}`}
                                onClick={() => setTabActivo("paradas")}
                            >
                                <i className="ti ti-map-pin"></i> Paradas ({paradas.length})
                            </button>
                            <button
                                className={`tab-btn ${tabActivo === "tarifas" ? "activo" : ""}`}
                                onClick={() => setTabActivo("tarifas")}
                            >
                                <i className="ti ti-receipt"></i> Tarifas por Tramo ({rutaDetalle?.tarifas?.length || 0})
                            </button>

                        </div>

                        <div className="tabs-body">

                            {/* TAB PARADAS */}
                            {tabActivo === "paradas" && (
                                <>
                                    {esAdmin && (
                                        <div className="paradas-acciones">
                                            <button className="btn-nuevo" onClick={abrirModalCrear}>
                                                <i className="ti ti-plus"></i> Agregar Parada
                                            </button>
                                            {!reordenando ? (
                                                <button className="btn-reordenar" onClick={() => setReordenando(true)}>
                                                    <i className="ti ti-arrows-sort"></i> Reordenar
                                                </button>
                                            ) : (
                                                <>
                                                    <button className="btn-guardar-orden" onClick={guardarOrden} disabled={guardandoOrden}>
                                                        {guardandoOrden
                                                            ? <><i className="ti ti-loader-2 spin"></i> Guardando...</>
                                                            : <><i className="ti ti-check"></i> Guardar Orden</>
                                                        }
                                                    </button>
                                                    <button className="btn-cancelar-orden" onClick={() => { setReordenando(false); fetchParadas(); }}>
                                                        Cancelar
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {paradas.length === 0 ? (
                                        <div className="tab-vacio">
                                            <i className="ti ti-map-pin-off"></i>
                                            <span>Esta ruta no tiene paradas registradas</span>
                                        </div>
                                    ) : (
                                        <div className="paradas-lista">
                                            {paradas.map((p, i) => (
                                                <div key={p.id || i} className={`parada-card ${reordenando ? "reordenando" : ""}`}>
                                                    {i < paradas.length - 1 && <div className="parada-linea"></div>}
                                                    <div className="parada-orden-badge">{p.orden}</div>
                                                    <div className="parada-info">
                                                        <strong>{p.nombre}</strong>
                                                        {i === 0 && <span className="parada-tag origen">Origen</span>}
                                                        {i === paradas.length - 1 && <span className="parada-tag destino">Destino</span>}
                                                        {i > 0 && i < paradas.length - 1 && <span className="parada-tag intermedia">Parada</span>}
                                                    </div>
                                                    {reordenando && (
                                                        <div className="parada-orden-btns">
                                                            <button className="btn-orden" onClick={() => moverArriba(i)} disabled={i === 0}>
                                                                <i className="ti ti-chevron-up"></i>
                                                            </button>
                                                            <button className="btn-orden" onClick={() => moverAbajo(i)} disabled={i === paradas.length - 1}>
                                                                <i className="ti ti-chevron-down"></i>
                                                            </button>
                                                        </div>
                                                    )}
                                                    {esAdmin && !reordenando && (
                                                        <div className="parada-btns">
                                                            <button className="btn-accion editar" onClick={() => abrirModalEditar(p)}>
                                                                <i className="ti ti-pencil"></i>
                                                            </button>
                                                            <button className="btn-accion eliminar" onClick={() => eliminarParada(p)}>
                                                                <i className="ti ti-trash"></i>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}

                            {/* TAB TARIFAS */}
                            {tabActivo === "tarifas" && (
                                <div className="tarifas-wrapper">
                                    {!rutaDetalle?.tarifas?.length ? (
                                        <div className="tab-vacio">
                                            <i className="ti ti-receipt-off"></i>
                                            <span>No hay tarifas registradas para esta ruta</span>
                                        </div>
                                    ) : (
                                        <table className="tarifas-tabla">
                                            <thead>
                                            <tr>
                                                <th>Origen</th>
                                                <th>Destino</th>
                                                <th>Orden Origen</th>
                                                <th>Orden Destino</th>
                                                <th>Precio Normal</th>
                                                <th>Precio VIP</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {rutaDetalle.tarifas
                                                .sort((a, b) => a.ordenOrigen - b.ordenOrigen)
                                                .map((t, i) => (
                                                    <tr key={i}>
                                                        <td><strong>{t.origenTramo}</strong></td>
                                                        <td><strong>{t.destinoTramo}</strong></td>
                                                        <td>
                                                            <span className="orden-badge">{t.ordenOrigen}</span>
                                                        </td>
                                                        <td>
                                                            <span className="orden-badge">{t.ordenDestino}</span>
                                                        </td>
                                                        <td>
                                                            <span className="precio-normal">S/ {t.precioNormal}</span>
                                                        </td>
                                                        <td>
                                                            <span className="precio-vip">S/ {t.precioVip}</span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL */}
            {modalAbierto && (
                <div className="modal-overlay" onClick={cerrarModal}>
                    <div className="modal" onClick={e => e.stopPropagation()}>

                        <div className="modal-header">
                            <h3>{modoEditar ? "Editar Parada" : "Nueva Parada"}</h3>
                            <button className="modal-cerrar" onClick={cerrarModal}>
                                <i className="ti ti-x"></i>
                            </button>
                        </div>

                        <div className="modal-body">
                            <div className="form-grupo">
                                <label>Nombre de la Parada *</label>
                                <input
                                    type="text"
                                    value={form.nombre}
                                    onChange={e => setForm(prev => ({ ...prev, nombre: e.target.value }))}
                                    placeholder="Ej: Herrera"
                                    autoFocus
                                />
                            </div>
                            <div className="form-grupo">
                                <label>Orden *</label>
                                <input
                                    type="number"
                                    value={form.orden}
                                    onChange={e => setForm(prev => ({ ...prev, orden: e.target.value }))}
                                    placeholder="1"
                                    min="1"
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
                            <button className="btn-cancelar" onClick={cerrarModal}>Cancelar</button>
                            <button className="btn-guardar" onClick={guardar} disabled={guardando}>
                                {guardando
                                    ? <><i className="ti ti-loader-2 spin"></i> Guardando...</>
                                    : <><i className="ti ti-check"></i> {modoEditar ? "Actualizar" : "Agregar"}</>
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Paradas;