import { useState, useEffect } from "react";
import "../Ventas/Pasajes.css";
import "./Comprobantes.css";
import "./Cajas.css";
import { apiFetch, usuarioActual } from "../../../Services/api.js";
import { useToast, Toasts } from "../../../Components/Toast.jsx";

const CATEGORIAS_GASTO = ["COMBUSTIBLE", "MANTENIMIENTO", "PERSONAL", "SERVICIOS", "OTROS"];

function fmt(n) { return `S/ ${Number(n ?? 0).toFixed(2)}`; }

function Cajas() {
    const usuario     = usuarioActual();
    const esAdmin     = usuario?.rol === "ADMIN";
    const puedeGastos = esAdmin || usuario?.rol === "SUPERVISOR";
    const { toasts, mostrarToast } = useToast();

    const [tab, setTab] = useState("micaja"); // micaja | historial | gastos

    // Mi caja
    const [miCaja, setMiCaja]           = useState(null);
    const [movimientos, setMovimientos] = useState([]);
    const [cargando, setCargando]       = useState(true);
    const [error, setError]             = useState(null);

    // Historial
    const [cajas, setCajas] = useState([]);

    // Gastos
    const [gastos, setGastos] = useState([]);

    // Modales
    const [modalAbrir, setModalAbrir]   = useState(false);
    const [modalCerrar, setModalCerrar] = useState(false);
    const [modalMov, setModalMov]       = useState(false);
    const [modalGasto, setModalGasto]   = useState(false);
    const [guardando, setGuardando]     = useState(false);
    const [errorModal, setErrorModal]   = useState(null);

    const [formAbrir, setFormAbrir]   = useState({ montoInicial: "", observacion: "" });
    const [formCerrar, setFormCerrar] = useState({ montoCierre: "", observacion: "" });
    const [formMov, setFormMov]       = useState({ tipo: "INGRESO", monto: "", motivo: "", observacion: "" });
    const [formGasto, setFormGasto]   = useState({ fecha: "", categoria: "OTROS", descripcion: "", monto: "", observacion: "", afectaCaja: true });

    useEffect(() => { cargarTodo(); }, []);

    const cargarTodo = async () => {
        setCargando(true);
        setError(null);
        try {
            const res = await apiFetch("/api/cajas/mi-caja");
            setMiCaja(res.abierta ? res.caja : null);
            if (res.abierta) {
                setMovimientos(await apiFetch(`/api/cajas/${res.caja.id}/movimientos`));
            } else {
                setMovimientos([]);
            }
            setCajas(await apiFetch("/api/cajas"));
            setGastos(await apiFetch("/api/gastos"));
        } catch (err) { setError(err.message); }
        finally { setCargando(false); }
    };

    // Totales de la caja abierta (en vivo, a partir de los movimientos)
    const ingresos = movimientos.filter(m => m.tipo === "INGRESO").reduce((s, m) => s + Number(m.monto), 0);
    const egresos  = movimientos.filter(m => m.tipo === "EGRESO").reduce((s, m) => s + Number(m.monto), 0);
    const enCaja   = Number(miCaja?.montoInicial ?? 0) + ingresos - egresos;

    const accion = async (fn) => {
        setGuardando(true);
        setErrorModal(null);
        try {
            await fn();
            setModalAbrir(false); setModalCerrar(false); setModalMov(false); setModalGasto(false);
            cargarTodo();
        } catch (err) { setErrorModal(err.message); }
        finally { setGuardando(false); }
    };

    const abrirCaja = () => accion(() => apiFetch("/api/cajas/abrir", {
        method: "POST",
        body: JSON.stringify({ montoInicial: parseFloat(formAbrir.montoInicial), observacion: formAbrir.observacion })
    }));

    const cerrarCaja = () => accion(() => apiFetch(`/api/cajas/${miCaja.id}/cerrar`, {
        method: "PATCH",
        body: JSON.stringify({ montoCierre: parseFloat(formCerrar.montoCierre), observacion: formCerrar.observacion })
    }));

    const registrarMov = () => accion(() => apiFetch("/api/cajas/movimientos", {
        method: "POST",
        body: JSON.stringify({ ...formMov, monto: parseFloat(formMov.monto) })
    }));

    const registrarGasto = () => accion(() => apiFetch("/api/gastos", {
        method: "POST",
        body: JSON.stringify({ ...formGasto, monto: parseFloat(formGasto.monto) })
    }));

    const eliminarGasto = async (g) => {
        if (!confirm(`¿Eliminar el gasto "${g.descripcion}" (${fmt(g.monto)})?`)) return;
        try {
            await apiFetch(`/api/gastos/${g.id}`, { method: "DELETE" });
            cargarTodo();
        } catch (err) { mostrarToast("error", "Error al eliminar el gasto: " + err.message); }
    };

    return (
        <div className="pasajes-page">

            {/* ENCABEZADO */}
            <div className="pasajes-header">
                <div>
                    <h2>Caja</h2>
                    <p>Apertura, cierre y movimientos de caja por usuario</p>
                </div>
            </div>

            {/* TABS */}
            <div className="caja-tabs">
                <button className={tab === "micaja" ? "activo" : ""} onClick={() => setTab("micaja")}>
                    <i className="ti ti-cash-register"></i> Mi Caja
                </button>
                <button className={tab === "historial" ? "activo" : ""} onClick={() => setTab("historial")}>
                    <i className="ti ti-history"></i> Historial
                </button>
                <button className={tab === "gastos" ? "activo" : ""} onClick={() => setTab("gastos")}>
                    <i className="ti ti-receipt-refund"></i> Gastos
                </button>
            </div>

            {cargando && <div className="pasajes-estado"><i className="ti ti-loader-2 spin"></i> Cargando...</div>}
            {error && !cargando && <div className="pasajes-estado error"><i className="ti ti-alert-circle"></i> {error}</div>}

            {/* ── TAB MI CAJA ── */}
            {!cargando && !error && tab === "micaja" && (
                miCaja ? (
                    <>
                        <div className="comp-stats">
                            <div className="comp-stat">
                                <i className="ti ti-lock-open"></i>
                                <div><strong>{fmt(miCaja.montoInicial)}</strong><span>Monto inicial — {miCaja.fechaApertura}</span></div>
                            </div>
                            <div className="comp-stat monto">
                                <i className="ti ti-arrow-down-left"></i>
                                <div><strong>{fmt(ingresos)}</strong><span>Ingresos</span></div>
                            </div>
                            <div className="comp-stat anulado">
                                <i className="ti ti-arrow-up-right"></i>
                                <div><strong>{fmt(egresos)}</strong><span>Egresos</span></div>
                            </div>
                            <div className="comp-stat">
                                <i className="ti ti-cash"></i>
                                <div><strong>{fmt(enCaja)}</strong><span>En caja (esperado)</span></div>
                            </div>
                        </div>

                        <div className="caja-acciones">
                            <button className="btn-nuevo" onClick={() => { setFormMov({ tipo: "INGRESO", monto: "", motivo: "", observacion: "" }); setErrorModal(null); setModalMov(true); }}>
                                <i className="ti ti-plus"></i> Registrar Movimiento
                            </button>
                            <button className="btn-cerrar-caja" onClick={() => { setFormCerrar({ montoCierre: "", observacion: "" }); setErrorModal(null); setModalCerrar(true); }}>
                                <i className="ti ti-lock"></i> Cerrar Caja
                            </button>
                        </div>

                        <div className="pasajes-tabla-wrapper">
                            <table className="pasajes-tabla">
                                <thead>
                                <tr>
                                    <th>Fecha / Hora</th>
                                    <th>Tipo</th>
                                    <th>Motivo</th>
                                    <th>Monto</th>
                                </tr>
                                </thead>
                                <tbody>
                                {movimientos.length === 0 ? (
                                    <tr><td colSpan={4} className="tabla-vacia"><i className="ti ti-cash-off"></i><span>Sin movimientos aún</span></td></tr>
                                ) : (
                                    movimientos.map(m => (
                                        <tr key={m.id}>
                                            <td>{m.fecha} {m.hora?.slice(0, 8)}</td>
                                            <td>
                                                <span className={`badge ${m.tipo === "INGRESO" ? "badge-pagado" : "badge-anulado"}`}>
                                                    {m.tipo === "INGRESO" ? "Ingreso" : "Egreso"}
                                                </span>
                                            </td>
                                            <td>{m.motivo}</td>
                                            <td><strong>{m.tipo === "EGRESO" ? "-" : ""}{fmt(m.monto)}</strong></td>
                                        </tr>
                                    ))
                                )}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : (
                    <div className="caja-cerrada-card">
                        <i className="ti ti-lock"></i>
                        <h3>No tienes una caja abierta</h3>
                        <p>Abre tu caja para empezar a registrar las ventas del día</p>
                        <button className="btn-nuevo" onClick={() => { setFormAbrir({ montoInicial: "", observacion: "" }); setErrorModal(null); setModalAbrir(true); }}>
                            <i className="ti ti-lock-open"></i> Abrir Caja
                        </button>
                    </div>
                )
            )}

            {/* ── TAB HISTORIAL ── */}
            {!cargando && !error && tab === "historial" && (
                <div className="pasajes-tabla-wrapper">
                    <table className="pasajes-tabla">
                        <thead>
                        <tr>
                            <th>Usuario</th>
                            <th>Sucursal</th>
                            <th>Apertura</th>
                            <th>Inicial</th>
                            <th>Ventas</th>
                            <th>Neto</th>
                            <th>Cierre</th>
                            <th>Diferencia</th>
                            <th>Estado</th>
                        </tr>
                        </thead>
                        <tbody>
                        {cajas.length === 0 ? (
                            <tr><td colSpan={9} className="tabla-vacia"><i className="ti ti-cash-off"></i><span>Sin cajas registradas</span></td></tr>
                        ) : (
                            cajas.map(c => (
                                <tr key={c.id}>
                                    <td><strong>{c.usuarioNombre}</strong></td>
                                    <td>{c.sucursalNombre || "—"}</td>
                                    <td>{c.fechaApertura} {c.horaApertura?.slice(0, 5)}</td>
                                    <td>{fmt(c.montoInicial)}</td>
                                    <td>{c.estado === "CERRADA" ? fmt(c.totalVentas) : "—"}</td>
                                    <td>{c.estado === "CERRADA" ? fmt(c.totalNeto) : "—"}</td>
                                    <td>{c.estado === "CERRADA" ? fmt(c.montoCierre) : "—"}</td>
                                    <td>
                                        {c.estado === "CERRADA" ? (
                                            <strong className={Number(c.diferencia) < 0 ? "dif-negativa" : "dif-ok"}>
                                                {fmt(c.diferencia)}
                                            </strong>
                                        ) : "—"}
                                    </td>
                                    <td>
                                        <span className={`badge ${c.estado === "ABIERTA" ? "badge-pagado" : "badge-cerrada"}`}>
                                            {c.estado === "ABIERTA" ? "Abierta" : "Cerrada"}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── TAB GASTOS ── */}
            {!cargando && !error && tab === "gastos" && (
                <>
                    {puedeGastos && (
                        <div className="caja-acciones">
                            <button className="btn-nuevo" onClick={() => { setFormGasto({ fecha: "", categoria: "OTROS", descripcion: "", monto: "", observacion: "", afectaCaja: true }); setErrorModal(null); setModalGasto(true); }}>
                                <i className="ti ti-plus"></i> Registrar Gasto
                            </button>
                        </div>
                    )}
                    <div className="pasajes-tabla-wrapper">
                        <table className="pasajes-tabla">
                            <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Categoría</th>
                                <th>Descripción</th>
                                <th>Responsable</th>
                                <th>Sucursal</th>
                                <th>Monto</th>
                                {esAdmin && <th>Acciones</th>}
                            </tr>
                            </thead>
                            <tbody>
                            {gastos.length === 0 ? (
                                <tr><td colSpan={esAdmin ? 7 : 6} className="tabla-vacia"><i className="ti ti-receipt-off"></i><span>Sin gastos registrados</span></td></tr>
                            ) : (
                                gastos.map(g => (
                                    <tr key={g.id}>
                                        <td>{g.fecha}</td>
                                        <td><span className="comp-tipo boleta">{g.categoria}</span></td>
                                        <td>{g.descripcion}</td>
                                        <td>{g.responsableNombre || "—"}</td>
                                        <td>{g.sucursalNombre || "—"}</td>
                                        <td><strong>{fmt(g.monto)}</strong></td>
                                        {esAdmin && (
                                            <td className="acciones-cell">
                                                <button className="btn-accion anular" onClick={() => eliminarGasto(g)} title="Eliminar gasto">
                                                    <i className="ti ti-trash"></i>
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* ── MODAL ABRIR CAJA ── */}
            {modalAbrir && (
                <div className="modal-overlay" onClick={() => setModalAbrir(false)}>
                    <div className="modal modal-wizard modal-anular" onClick={e => e.stopPropagation()}>
                        <div className="wizard-header">
                            <h3>Abrir Caja</h3>
                            <button className="modal-cerrar" onClick={() => setModalAbrir(false)}><i className="ti ti-x"></i></button>
                        </div>
                        <div className="modal-body">
                            <div className="wizard-contenido">
                                <div className="form-grupo">
                                    <label>Monto inicial (efectivo con el que abres) *</label>
                                    <input type="number" min="0" step="0.01" value={formAbrir.montoInicial}
                                           onChange={e => setFormAbrir(p => ({ ...p, montoInicial: e.target.value }))}
                                           placeholder="100.00" />
                                </div>
                                <div className="form-grupo">
                                    <label>Observación</label>
                                    <input type="text" value={formAbrir.observacion}
                                           onChange={e => setFormAbrir(p => ({ ...p, observacion: e.target.value }))}
                                           placeholder="Apertura del día" />
                                </div>
                                {errorModal && <div className="modal-error"><i className="ti ti-alert-circle"></i> {errorModal}</div>}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancelar" onClick={() => setModalAbrir(false)}>Cancelar</button>
                            <button className="btn-guardar" onClick={abrirCaja} disabled={guardando}>
                                {guardando ? <><i className="ti ti-loader-2 spin"></i> Abriendo...</> : <><i className="ti ti-lock-open"></i> Abrir Caja</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL CERRAR CAJA ── */}
            {modalCerrar && miCaja && (
                <div className="modal-overlay" onClick={() => setModalCerrar(false)}>
                    <div className="modal modal-wizard modal-anular" onClick={e => e.stopPropagation()}>
                        <div className="wizard-header">
                            <h3>Cerrar Caja</h3>
                            <button className="modal-cerrar" onClick={() => setModalCerrar(false)}><i className="ti ti-x"></i></button>
                        </div>
                        <div className="modal-body">
                            <div className="wizard-contenido">
                                <div className="resumen-venta">
                                    <p className="resumen-titulo"><i className="ti ti-cash"></i> Resumen del día</p>
                                    <div className="resumen-fila"><span>Monto inicial</span><strong>{fmt(miCaja.montoInicial)}</strong></div>
                                    <div className="resumen-fila"><span>Ingresos</span><strong>{fmt(ingresos)}</strong></div>
                                    <div className="resumen-fila"><span>Egresos</span><strong>- {fmt(egresos)}</strong></div>
                                    <div className="resumen-fila resumen-total"><span>Debe haber en caja</span><strong>{fmt(enCaja)}</strong></div>
                                </div>
                                <div className="form-grupo">
                                    <label>Efectivo contado al cierre *</label>
                                    <input type="number" min="0" step="0.01" value={formCerrar.montoCierre}
                                           onChange={e => setFormCerrar(p => ({ ...p, montoCierre: e.target.value }))}
                                           placeholder={enCaja.toFixed(2)} />
                                </div>
                                {formCerrar.montoCierre !== "" && (
                                    <div className={`caja-dif ${parseFloat(formCerrar.montoCierre) - enCaja < 0 ? "neg" : "ok"}`}>
                                        Diferencia: {fmt(parseFloat(formCerrar.montoCierre || 0) - enCaja)}
                                    </div>
                                )}
                                <div className="form-grupo">
                                    <label>Observación</label>
                                    <input type="text" value={formCerrar.observacion}
                                           onChange={e => setFormCerrar(p => ({ ...p, observacion: e.target.value }))} />
                                </div>
                                {errorModal && <div className="modal-error"><i className="ti ti-alert-circle"></i> {errorModal}</div>}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancelar" onClick={() => setModalCerrar(false)}>Cancelar</button>
                            <button className="btn-anular-confirmar" onClick={cerrarCaja} disabled={guardando}>
                                {guardando ? <><i className="ti ti-loader-2 spin"></i> Cerrando...</> : <><i className="ti ti-lock"></i> Cerrar Caja</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL MOVIMIENTO MANUAL ── */}
            {modalMov && (
                <div className="modal-overlay" onClick={() => setModalMov(false)}>
                    <div className="modal modal-wizard modal-anular" onClick={e => e.stopPropagation()}>
                        <div className="wizard-header">
                            <h3>Registrar Movimiento</h3>
                            <button className="modal-cerrar" onClick={() => setModalMov(false)}><i className="ti ti-x"></i></button>
                        </div>
                        <div className="modal-body">
                            <div className="wizard-contenido">
                                <div className="form-grupo">
                                    <label>Tipo *</label>
                                    <div className="comp-selector">
                                        {["INGRESO", "EGRESO"].map(t => (
                                            <button key={t}
                                                    className={`comp-btn ${formMov.tipo === t ? "activo" : ""}`}
                                                    onClick={() => setFormMov(p => ({ ...p, tipo: t }))}>
                                                {t === "INGRESO" ? "Ingreso" : "Egreso"}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="form-fila">
                                    <div className="form-grupo">
                                        <label>Monto *</label>
                                        <input type="number" min="0" step="0.01" value={formMov.monto}
                                               onChange={e => setFormMov(p => ({ ...p, monto: e.target.value }))}
                                               placeholder="50.00" />
                                    </div>
                                    <div className="form-grupo">
                                        <label>Motivo *</label>
                                        <input type="text" value={formMov.motivo}
                                               onChange={e => setFormMov(p => ({ ...p, motivo: e.target.value }))}
                                               placeholder="Ej: Sencillo para vueltos" />
                                    </div>
                                </div>
                                <div className="form-grupo">
                                    <label>Observación</label>
                                    <input type="text" value={formMov.observacion}
                                           onChange={e => setFormMov(p => ({ ...p, observacion: e.target.value }))} />
                                </div>
                                {errorModal && <div className="modal-error"><i className="ti ti-alert-circle"></i> {errorModal}</div>}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancelar" onClick={() => setModalMov(false)}>Cancelar</button>
                            <button className="btn-guardar" onClick={registrarMov} disabled={guardando}>
                                {guardando ? <><i className="ti ti-loader-2 spin"></i> Guardando...</> : <><i className="ti ti-check"></i> Registrar</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL GASTO ── */}
            {modalGasto && (
                <div className="modal-overlay" onClick={() => setModalGasto(false)}>
                    <div className="modal modal-wizard modal-anular" onClick={e => e.stopPropagation()}>
                        <div className="wizard-header">
                            <h3>Registrar Gasto</h3>
                            <button className="modal-cerrar" onClick={() => setModalGasto(false)}><i className="ti ti-x"></i></button>
                        </div>
                        <div className="modal-body">
                            <div className="wizard-contenido">
                                <div className="form-fila">
                                    <div className="form-grupo">
                                        <label>Fecha</label>
                                        <input type="date" value={formGasto.fecha}
                                               onChange={e => setFormGasto(p => ({ ...p, fecha: e.target.value }))} />
                                    </div>
                                    <div className="form-grupo">
                                        <label>Categoría *</label>
                                        <select value={formGasto.categoria}
                                                onChange={e => setFormGasto(p => ({ ...p, categoria: e.target.value }))}>
                                            {CATEGORIAS_GASTO.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="form-grupo">
                                    <label>Descripción *</label>
                                    <input type="text" value={formGasto.descripcion}
                                           onChange={e => setFormGasto(p => ({ ...p, descripcion: e.target.value }))}
                                           placeholder="Ej: Combustible embarcación RAYZA I" />
                                </div>
                                <div className="form-fila">
                                    <div className="form-grupo">
                                        <label>Monto *</label>
                                        <input type="number" min="0" step="0.01" value={formGasto.monto}
                                               onChange={e => setFormGasto(p => ({ ...p, monto: e.target.value }))}
                                               placeholder="150.00" />
                                    </div>
                                    <div className="form-grupo">
                                        <label>Observación</label>
                                        <input type="text" value={formGasto.observacion}
                                               onChange={e => setFormGasto(p => ({ ...p, observacion: e.target.value }))} />
                                    </div>
                                </div>
                                <label className="caja-check">
                                    <input type="checkbox" checked={formGasto.afectaCaja}
                                           onChange={e => setFormGasto(p => ({ ...p, afectaCaja: e.target.checked }))} />
                                    Descontar de mi caja abierta (registra un egreso)
                                </label>
                                {errorModal && <div className="modal-error"><i className="ti ti-alert-circle"></i> {errorModal}</div>}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancelar" onClick={() => setModalGasto(false)}>Cancelar</button>
                            <button className="btn-guardar" onClick={registrarGasto} disabled={guardando}>
                                {guardando ? <><i className="ti ti-loader-2 spin"></i> Guardando...</> : <><i className="ti ti-check"></i> Registrar Gasto</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Toasts toasts={toasts} />
        </div>
    );
}

export default Cajas;
