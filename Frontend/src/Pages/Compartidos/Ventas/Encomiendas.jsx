import { useState, useEffect } from "react";
import "./Pasajes.css";
import "../Finanzas/Comprobantes.css";
import { apiFetch, usuarioActual } from "../../../Services/api.js";
import { useToast, Toasts } from "../../../Components/Toast.jsx";
import { usePaginacion, Paginacion } from "../../../Components/Paginacion.jsx";
import GenerarComprobanteModal from "../Finanzas/GenerarComprobanteModal.jsx";
import generarTicketEncomienda from "../../../Utils/generarTicketEncomienda.jsx";

const ESTADO_LABEL = {
    REGISTRADO: "Registrado", EN_TRANSITO: "En tránsito",
    ENTREGADO: "Entregado", DEVUELTO: "Devuelto"
};
const ESTADO_BADGE = {
    REGISTRADO: "badge-pagado", EN_TRANSITO: "badge-transito",
    ENTREGADO: "badge-entregado", DEVUELTO: "badge-anulado"
};

function Encomiendas() {
    const usuario      = usuarioActual();
    const puedeOperar  = usuario?.rol === "ADMIN" || usuario?.rol === "SUPERVISOR";
    const { toasts, mostrarToast } = useToast();

    const [encomiendas, setEncomiendas]   = useState([]);
    const [comprobantes, setComprobantes] = useState([]);
    const [sucursales, setSucursales]     = useState([]);
    const [viajes, setViajes]             = useState([]);
    const [cargando, setCargando]         = useState(true);
    const [error, setError]               = useState(null);

    // Filtros
    const [filtroEstado, setFiltroEstado] = useState("todos");
    const [busqueda, setBusqueda]         = useState("");

    // Modales
    const [modalCrear, setModalCrear]     = useState(false);
    const [guardando, setGuardando]       = useState(false);
    const [errorModal, setErrorModal]     = useState(null);
    const [encParaComp, setEncParaComp]   = useState(null);

    const formVacio = {
        remitenteNombre: "", remitenteDocumento: "", remitenteTelefono: "",
        destinatarioNombre: "", destinatarioDocumento: "", destinatarioTelefono: "",
        descripcion: "", peso: "", precio: "", sucursalDestinoId: "", viajeId: "", observacion: ""
    };
    const [form, setForm] = useState(formVacio);

    useEffect(() => { cargarTodo(); }, []);

    const cargarTodo = async () => {
        setCargando(true);
        setError(null);
        try {
            setEncomiendas(await apiFetch("/api/encomiendas"));
            setComprobantes(await apiFetch("/api/comprobantes"));
        } catch (err) { setError(err.message); }
        finally { setCargando(false); }
    };

    const comprobanteDeEncomienda = (encId) =>
        comprobantes.find(c => c.encomiendaId === encId && c.estado === "ACEPTADO" && c.tipoDeComprobante !== "NOTA_CREDITO");

    const abrirCrear = async () => {
        setForm(formVacio);
        setErrorModal(null);
        try {
            setSucursales(await apiFetch("/api/sucursales/activas"));
            const vs = await apiFetch("/api/viajes");
            setViajes(vs.filter(v => v.estado === "PROGRAMADO"));
        } catch (err) { console.error(err); }
        setModalCrear(true);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const registrar = async () => {
        setGuardando(true);
        setErrorModal(null);
        try {
            const creada = await apiFetch("/api/encomiendas", {
                method: "POST",
                body: JSON.stringify({
                    ...form,
                    peso: form.peso ? parseFloat(form.peso) : null,
                    precio: parseFloat(form.precio)
                })
            });
            setModalCrear(false);
            mostrarToast("success", `Encomienda ${creada.codigoEncomienda} registrada`);
            cargarTodo();
        } catch (err) { setErrorModal(err.message); }
        finally { setGuardando(false); }
    };

    const cambiarEstado = async (e, nuevoEstado) => {
        const etiqueta = ESTADO_LABEL[nuevoEstado];
        if (!confirm(`¿Marcar la encomienda ${e.codigoEncomienda} como "${etiqueta}"?`)) return;
        try {
            await apiFetch(`/api/encomiendas/${e.id}/estado`, {
                method: "PATCH",
                body: JSON.stringify({ estado: nuevoEstado })
            });
            mostrarToast("success", `${e.codigoEncomienda} marcada como ${etiqueta}`);
            cargarTodo();
        } catch (err) { mostrarToast("error", err.message); }
    };

    const filtradas = encomiendas.filter(e => {
        if (filtroEstado !== "todos" && e.estado !== filtroEstado) return false;
        if (busqueda.trim()) {
            const q = busqueda.trim().toLowerCase();
            const coincide =
                (e.codigoEncomienda || "").toLowerCase().includes(q) ||
                (e.remitenteNombre || "").toLowerCase().includes(q) ||
                (e.destinatarioNombre || "").toLowerCase().includes(q) ||
                (e.remitenteDocumento || "").includes(q) ||
                (e.destinatarioDocumento || "").includes(q);
            if (!coincide) return false;
        }
        return true;
    });

    const pag = usePaginacion(filtradas, 10);

    const enTransito = encomiendas.filter(e => e.estado === "EN_TRANSITO").length;
    const registradas = encomiendas.filter(e => e.estado === "REGISTRADO").length;
    const montoTotal = encomiendas
        .filter(e => e.estado !== "DEVUELTO")
        .reduce((s, e) => s + (parseFloat(e.precio) || 0), 0);

    return (
        <div className="pasajes-page">

            <div className="pasajes-header">
                <div>
                    <h2>Encomiendas</h2>
                    <p>Envío de paquetes entre sucursales</p>
                </div>
                {puedeOperar && (
                    <button className="btn-nuevo" onClick={abrirCrear}>
                        <i className="ti ti-plus"></i> Nueva Encomienda
                    </button>
                )}
            </div>

            {/* RESUMEN */}
            <div className="comp-stats">
                <div className="comp-stat">
                    <i className="ti ti-package"></i>
                    <div><strong>{registradas}</strong><span>Registradas</span></div>
                </div>
                <div className="comp-stat">
                    <i className="ti ti-truck-delivery"></i>
                    <div><strong>{enTransito}</strong><span>En tránsito</span></div>
                </div>
                <div className="comp-stat monto">
                    <i className="ti ti-cash"></i>
                    <div><strong>S/ {montoTotal.toFixed(2)}</strong><span>Total cobrado</span></div>
                </div>
            </div>

            {/* FILTROS */}
            <div className="pasajes-filtros">
                <div className="filtro-grupo">
                    <label>Estado</label>
                    <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
                        <option value="todos">Todos</option>
                        {Object.keys(ESTADO_LABEL).map(k => <option key={k} value={k}>{ESTADO_LABEL[k]}</option>)}
                    </select>
                </div>
                <div className="filtro-grupo">
                    <label>Buscar</label>
                    <div className="filtro-buscar">
                        <i className="ti ti-search"></i>
                        <input type="text" placeholder="Código, remitente, destinatario, DNI..."
                               value={busqueda} onChange={e => setBusqueda(e.target.value)} />
                    </div>
                </div>
                <button className="btn-limpiar" onClick={() => { setBusqueda(""); setFiltroEstado("todos"); }}>
                    <i className="ti ti-filter-off"></i> Limpiar
                </button>
            </div>

            {cargando && <div className="pasajes-estado"><i className="ti ti-loader-2 spin"></i> Cargando...</div>}
            {error && !cargando && <div className="pasajes-estado error"><i className="ti ti-alert-circle"></i> {error}</div>}

            {!cargando && !error && (
                <>
                <div className="pasajes-tabla-wrapper">
                    <table className="pasajes-tabla">
                        <thead>
                        <tr>
                            <th>Código</th>
                            <th>Remitente</th>
                            <th>Destinatario</th>
                            <th>Paquete</th>
                            <th>Destino</th>
                            <th>Precio</th>
                            <th>Estado</th>
                            {puedeOperar && <th>Acciones</th>}
                        </tr>
                        </thead>
                        <tbody>
                        {pag.items.length === 0 ? (
                            <tr><td colSpan={puedeOperar ? 8 : 7} className="tabla-vacia">
                                <i className="ti ti-package-off"></i><span>No se encontraron encomiendas</span>
                            </td></tr>
                        ) : (
                            pag.items.map(e => (
                                <tr key={e.id} className={e.estado === "DEVUELTO" ? "fila-anulada" : ""}>
                                    <td>
                                        <div className="pasajero-info">
                                            <strong className="codigo">{e.codigoEncomienda}</strong>
                                            <span>{e.fechaRegistro}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="pasajero-info">
                                            <strong>{e.remitenteNombre}</strong>
                                            <span>{e.remitenteDocumento || "—"}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="pasajero-info">
                                            <strong>{e.destinatarioNombre}</strong>
                                            <span>{e.destinatarioDocumento || "—"}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="pasajero-info">
                                            <span>{e.descripcion}</span>
                                            {e.peso && <span>{e.peso} kg</span>}
                                        </div>
                                    </td>
                                    <td>{e.sucursalDestinoNombre || "—"}</td>
                                    <td><strong>S/ {Number(e.precio).toFixed(2)}</strong></td>
                                    <td>
                                        <span className={`badge ${ESTADO_BADGE[e.estado]}`}>{ESTADO_LABEL[e.estado]}</span>
                                    </td>
                                    {puedeOperar && (
                                        <td className="acciones-cell">
                                            {/* Ticket / guía de encomienda (cualquier estado) */}
                                            <button className="btn-accion comprobante"
                                                    onClick={() => generarTicketEncomienda(e)}
                                                    title="Descargar guía / ticket del envío">
                                                <i className="ti ti-file-invoice"></i>
                                            </button>
                                            {e.estado !== "DEVUELTO" && (
                                                comprobanteDeEncomienda(e.id) ? (
                                                    <button className="btn-accion emitido" disabled
                                                            title={`Comprobante emitido: ${comprobanteDeEncomienda(e.id).serie}-${String(comprobanteDeEncomienda(e.id).numero).padStart(8, "0")}`}>
                                                        <i className="ti ti-file-check"></i>
                                                    </button>
                                                ) : (
                                                    <button className="btn-accion generar"
                                                            onClick={() => setEncParaComp(e)}
                                                            title="Generar boleta / factura del envío">
                                                        <i className="ti ti-receipt-2"></i>
                                                    </button>
                                                )
                                            )}
                                            {e.estado === "REGISTRADO" && (
                                                <button className="btn-accion comprobante"
                                                        onClick={() => cambiarEstado(e, "EN_TRANSITO")}
                                                        title="Marcar en tránsito">
                                                    <i className="ti ti-truck-delivery"></i>
                                                </button>
                                            )}
                                            {(e.estado === "REGISTRADO" || e.estado === "EN_TRANSITO") && (
                                                <>
                                                    <button className="btn-accion email"
                                                            onClick={() => cambiarEstado(e, "ENTREGADO")}
                                                            title="Marcar entregado">
                                                        <i className="ti ti-circle-check"></i>
                                                    </button>
                                                    <button className="btn-accion anular"
                                                            onClick={() => cambiarEstado(e, "DEVUELTO")}
                                                            title="Devolver (registra egreso en tu caja)">
                                                        <i className="ti ti-arrow-back-up"></i>
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>
                <Paginacion {...pag} />
                </>
            )}

            {/* MODAL CREAR */}
            {modalCrear && (
                <div className="modal-overlay" onClick={() => setModalCrear(false)}>
                    <div className="modal modal-wizard" onClick={e => e.stopPropagation()}>
                        <div className="wizard-header">
                            <h3>Nueva Encomienda</h3>
                            <button className="modal-cerrar" onClick={() => setModalCrear(false)}><i className="ti ti-x"></i></button>
                        </div>
                        <div className="modal-body modal-scroll">
                            <div className="wizard-contenido">
                                <p className="wizard-titulo">Remitente (quien envía y paga)</p>
                                <div className="form-grupo">
                                    <label>Nombre completo *</label>
                                    <input type="text" name="remitenteNombre" value={form.remitenteNombre} onChange={handleChange} placeholder="Juan Pérez García" />
                                </div>
                                <div className="form-fila">
                                    <div className="form-grupo">
                                        <label>Documento</label>
                                        <input type="text" name="remitenteDocumento" value={form.remitenteDocumento} onChange={handleChange} placeholder="12345678" />
                                    </div>
                                    <div className="form-grupo">
                                        <label>Teléfono</label>
                                        <input type="text" name="remitenteTelefono" value={form.remitenteTelefono} onChange={handleChange} placeholder="999888777" />
                                    </div>
                                </div>

                                <p className="wizard-titulo">Destinatario (quien recibe)</p>
                                <div className="form-grupo">
                                    <label>Nombre completo *</label>
                                    <input type="text" name="destinatarioNombre" value={form.destinatarioNombre} onChange={handleChange} placeholder="María López" />
                                </div>
                                <div className="form-fila">
                                    <div className="form-grupo">
                                        <label>Documento</label>
                                        <input type="text" name="destinatarioDocumento" value={form.destinatarioDocumento} onChange={handleChange} placeholder="87654321" />
                                    </div>
                                    <div className="form-grupo">
                                        <label>Teléfono</label>
                                        <input type="text" name="destinatarioTelefono" value={form.destinatarioTelefono} onChange={handleChange} placeholder="988777666" />
                                    </div>
                                </div>

                                <p className="wizard-titulo">Paquete y envío</p>
                                <div className="form-grupo">
                                    <label>Descripción del paquete *</label>
                                    <input type="text" name="descripcion" value={form.descripcion} onChange={handleChange} placeholder="Caja con repuestos" />
                                </div>
                                <div className="form-fila">
                                    <div className="form-grupo">
                                        <label>Peso (kg)</label>
                                        <input type="number" min="0" step="0.1" name="peso" value={form.peso} onChange={handleChange} placeholder="5.5" />
                                    </div>
                                    <div className="form-grupo">
                                        <label>Precio del envío (S/) *</label>
                                        <input type="number" min="0" step="0.01" name="precio" value={form.precio} onChange={handleChange} placeholder="25.00" />
                                    </div>
                                </div>
                                <div className="form-fila">
                                    <div className="form-grupo">
                                        <label>Sucursal de destino</label>
                                        <select name="sucursalDestinoId" value={form.sucursalDestinoId} onChange={handleChange}>
                                            <option value="">Seleccionar...</option>
                                            {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-grupo">
                                        <label>Viaje (opcional)</label>
                                        <select name="viajeId" value={form.viajeId} onChange={handleChange}>
                                            <option value="">Sin viaje asignado</option>
                                            {viajes.map(v => (
                                                <option key={v.id} value={v.id}>{v.codigoViaje} — {v.fechaSalida} {v.horaSalida}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="form-grupo">
                                    <label>Observación</label>
                                    <input type="text" name="observacion" value={form.observacion} onChange={handleChange} placeholder="Frágil, entregar con cuidado" />
                                </div>

                                {errorModal && <div className="modal-error"><i className="ti ti-alert-circle"></i> {errorModal}</div>}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancelar" onClick={() => setModalCrear(false)}>Cancelar</button>
                            <button className="btn-guardar" onClick={registrar} disabled={guardando}>
                                {guardando ? <><i className="ti ti-loader-2 spin"></i> Registrando...</> : <><i className="ti ti-check"></i> Registrar Encomienda</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL COMPROBANTE */}
            {encParaComp && (
                <GenerarComprobanteModal
                    encomienda={encParaComp}
                    onClose={() => setEncParaComp(null)}
                    onGenerado={(c) => {
                        setEncParaComp(null);
                        cargarTodo();
                        mostrarToast("success", `Comprobante ${c.serie}-${String(c.numero).padStart(8, "0")} emitido`);
                    }}
                />
            )}

            <Toasts toasts={toasts} />
        </div>
    );
}

export default Encomiendas;
