import { useState, useEffect } from "react";
import "../Ventas/Pasajes.css";
import "./Comprobantes.css";
import generarComprobantePDF from "../../../Utils/generarComprobantePDF.jsx";
import generarComprobante80mm from "../../../Utils/generarComprobante80mm.jsx";

import { apiFetch } from "../../../Services/api.js";
import { useToast, Toasts } from "../../../Components/Toast.jsx";
import { usePaginacion, Paginacion } from "../../../Components/Paginacion.jsx";

const DOC_LABEL  = { "1": "DNI", "4": "CE", "6": "RUC", "7": "PASAPORTE" };
const TIPO_LABEL = { BOLETA: "Boleta", FACTURA: "Factura", NOTA_CREDITO: "N. Crédito" };

function numeroFmt(n) { return String(n).padStart(8, "0"); }

function Comprobantes() {
    const usuario       = JSON.parse(localStorage.getItem("usuario"));
    const puedeAnular   = usuario?.rol === "ADMIN" || usuario?.rol === "SUPERVISOR";
    const { toasts, mostrarToast } = useToast();

    const [comprobantes, setComprobantes] = useState([]);
    const [cargando, setCargando]         = useState(true);
    const [error, setError]               = useState(null);

    // Filtros
    const [filtroTipo, setFiltroTipo]     = useState("todos");
    const [filtroEstado, setFiltroEstado] = useState("todos");
    const [fechaDesde, setFechaDesde]     = useState("");
    const [fechaHasta, setFechaHasta]     = useState("");
    const [busqueda, setBusqueda]         = useState("");

    // Modales
    const [compDetalle, setCompDetalle]   = useState(null);
    const [jsonNubefact, setJsonNubefact] = useState(null);
    const [compAnular, setCompAnular]     = useState(null);
    const [compNC, setCompNC]             = useState(null);
    const [motivo, setMotivo]             = useState("");
    const [anulando, setAnulando]         = useState(false);
    const [errorAnular, setErrorAnular]   = useState(null);

    useEffect(() => { fetchComprobantes(); }, []);

    const fetchComprobantes = async () => {
        setCargando(true);
        setError(null);
        try {
            const data = await apiFetch("/api/comprobantes");
            setComprobantes(data);
        } catch (err) { setError(err.message); }
        finally { setCargando(false); }
    };

    const verDetalle = async (c) => {
        setCompDetalle(c);
        setJsonNubefact(null);
        try {
            const json = await apiFetch(`/api/comprobantes/${c.id}/nubefact`);
            setJsonNubefact(json);
        } catch (err) { console.error(err); }
    };

    const abrirAnular = (c) => {
        setCompAnular(c);
        setMotivo("");
        setErrorAnular(null);
    };

    const abrirNC = (c) => {
        setCompNC(c);
        setMotivo("");
        setErrorAnular(null);
    };

    const confirmarNotaCredito = async () => {
        if (!motivo.trim()) { setErrorAnular("El motivo es obligatorio"); return; }
        setAnulando(true);
        setErrorAnular(null);
        try {
            const nc = await apiFetch(`/api/comprobantes/${compNC.id}/nota-credito`, {
                method: "POST",
                body: JSON.stringify({ motivo: motivo.trim() })
            });
            setCompNC(null);
            fetchComprobantes();
            mostrarToast("success", `Nota de crédito ${nc.serie}-${numeroFmt(nc.numero)} emitida correctamente`);
        } catch (err) { setErrorAnular(err.message); }
        finally { setAnulando(false); }
    };

    const confirmarAnulacion = async () => {
        if (!motivo.trim()) { setErrorAnular("El motivo de anulación es obligatorio"); return; }
        setAnulando(true);
        setErrorAnular(null);
        try {
            await apiFetch(`/api/comprobantes/${compAnular.id}/anular`, {
                method: "PATCH",
                body: JSON.stringify({ motivo: motivo.trim() })
            });
            setCompAnular(null);
            mostrarToast("success", "Comprobante anulado (comunicación de baja enviada)");
            fetchComprobantes();
        } catch (err) { setErrorAnular(err.message); }
        finally { setAnulando(false); }
    };

    const descargarPDF = async (c, formato = "a4") => {
        if (formato === "80mm") { await generarComprobante80mm(c); return; }
        await generarComprobantePDF(c); // A4: nuestro diseño A4
    };

    // PDF oficial de Nubefact (formato del proveedor), si existe
    const verOficialNubefact = (c) => {
        if (c.enlacePdf) window.open(c.enlacePdf, "_blank");
    };

    const limpiarFiltros = () => {
        setFiltroTipo("todos");
        setFiltroEstado("todos");
        setFechaDesde("");
        setFechaHasta("");
        setBusqueda("");
    };

    const filtrados = comprobantes.filter(c => {
        if (filtroTipo !== "todos" && c.tipoDeComprobante !== filtroTipo) return false;
        if (filtroEstado !== "todos" && c.estado !== filtroEstado) return false;
        if (fechaDesde && c.fechaDeEmision < fechaDesde) return false;
        if (fechaHasta && c.fechaDeEmision > fechaHasta) return false;
        if (busqueda.trim()) {
            const q = busqueda.trim().toLowerCase();
            const serieNum = `${c.serie}-${numeroFmt(c.numero)}`.toLowerCase();
            const coincide =
                serieNum.includes(q) ||
                (c.clienteDenominacion || "").toLowerCase().includes(q) ||
                (c.clienteNumeroDeDocumento || "").toLowerCase().includes(q) ||
                (c.pasajeroNombre || "").toLowerCase().includes(q) ||
                (c.viajeCodigo || "").toLowerCase().includes(q);
            if (!coincide) return false;
        }
        return true;
    });

    const pag = usePaginacion(filtrados, 10);

    // Resumen
    const totalBoletas  = comprobantes.filter(c => c.tipoDeComprobante === "BOLETA").length;
    const totalFacturas = comprobantes.filter(c => c.tipoDeComprobante === "FACTURA").length;
    const totalAnulados = comprobantes.filter(c => c.estado === "ANULADO").length;
    const montoEmitido  = comprobantes
        .filter(c => c.estado === "ACEPTADO" && c.tipoDeComprobante !== "NOTA_CREDITO")
        .reduce((sum, c) => sum + (parseFloat(c.total) || 0), 0);

    return (
        <div className="pasajes-page">

            {/* ENCABEZADO */}
            <div className="pasajes-header">
                <div>
                    <h2>Comprobantes Electrónicos</h2>
                    <p>Historial de boletas y facturas emitidas (Nubefact)</p>
                </div>
            </div>

            {/* RESUMEN */}
            <div className="comp-stats">
                <div className="comp-stat">
                    <i className="ti ti-receipt"></i>
                    <div><strong>{totalBoletas}</strong><span>Boletas</span></div>
                </div>
                <div className="comp-stat">
                    <i className="ti ti-file-invoice"></i>
                    <div><strong>{totalFacturas}</strong><span>Facturas</span></div>
                </div>
                <div className="comp-stat anulado">
                    <i className="ti ti-ban"></i>
                    <div><strong>{totalAnulados}</strong><span>Anulados</span></div>
                </div>
                <div className="comp-stat monto">
                    <i className="ti ti-cash"></i>
                    <div><strong>S/ {montoEmitido.toFixed(2)}</strong><span>Total emitido</span></div>
                </div>
            </div>

            {/* FILTROS */}
            <div className="pasajes-filtros">
                <div className="filtro-grupo">
                    <label>Tipo</label>
                    <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
                        <option value="todos">Todos</option>
                        <option value="BOLETA">Boletas</option>
                        <option value="FACTURA">Facturas</option>
                        <option value="NOTA_CREDITO">Notas de crédito</option>
                    </select>
                </div>
                <div className="filtro-grupo">
                    <label>Estado</label>
                    <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
                        <option value="todos">Todos</option>
                        <option value="ACEPTADO">Aceptado</option>
                        <option value="ANULADO">Anulado</option>
                    </select>
                </div>
                <div className="filtro-grupo">
                    <label>Desde</label>
                    <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
                </div>
                <div className="filtro-grupo">
                    <label>Hasta</label>
                    <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
                </div>
                <div className="filtro-grupo">
                    <label>Buscar</label>
                    <div className="filtro-buscar">
                        <i className="ti ti-search"></i>
                        <input
                            type="text"
                            placeholder="Serie, cliente, RUC/DNI..."
                            value={busqueda}
                            onChange={e => setBusqueda(e.target.value)}
                        />
                    </div>
                </div>
                <button className="btn-limpiar" onClick={limpiarFiltros}>
                    <i className="ti ti-filter-off"></i> Limpiar
                </button>
            </div>

            {/* TABLA */}
            {cargando && <div className="pasajes-estado"><i className="ti ti-loader-2 spin"></i> Cargando...</div>}
            {error && !cargando && <div className="pasajes-estado error"><i className="ti ti-alert-circle"></i> {error}</div>}

            {!cargando && !error && (
                <div className="pasajes-tabla-wrapper">
                    <table className="pasajes-tabla">
                        <thead>
                        <tr>
                            <th>Comprobante</th>
                            <th>Cliente</th>
                            <th>Venta</th>
                            <th>Emisión</th>
                            <th>Op. Exonerada</th>
                            <th>IGV</th>
                            <th>Total</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                        </thead>
                        <tbody>
                        {pag.items.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="tabla-vacia">
                                    <i className="ti ti-file-off"></i>
                                    <span>No se encontraron comprobantes</span>
                                </td>
                            </tr>
                        ) : (
                            pag.items.map(c => (
                                <tr key={c.id} className={c.estado === "ANULADO" ? "fila-anulada" : ""}>
                                    <td>
                                        <div className="pasajero-info">
                                            <strong className="codigo">{c.serie}-{numeroFmt(c.numero)}</strong>
                                            <span className={`comp-tipo ${c.tipoDeComprobante.toLowerCase()}`}>
                                                {TIPO_LABEL[c.tipoDeComprobante]}
                                            </span>
                                            {c.refSerie && (
                                                <span className="comp-ref">modifica {c.refSerie}-{numeroFmt(c.refNumero)}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="pasajero-info">
                                            <strong>{c.clienteDenominacion}</strong>
                                            <span>{DOC_LABEL[c.clienteTipoDeDocumento]}: {c.clienteNumeroDeDocumento}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="pasajero-info">
                                            <strong className="codigo">{c.viajeCodigo || "—"}</strong>
                                            <span>{c.pasajeroNombre || ""}</span>
                                        </div>
                                    </td>
                                    <td>{c.fechaDeEmision}</td>
                                    <td>S/ {Number(c.totalExonerada).toFixed(2)}</td>
                                    <td>S/ {Number(c.totalIgv).toFixed(2)}</td>
                                    <td><strong>S/ {Number(c.total).toFixed(2)}</strong></td>
                                    <td>
                                        <span className={`badge ${c.estado === "ACEPTADO" ? "badge-pagado" : "badge-anulado"}`}>
                                            {c.estado === "ACEPTADO" ? "Aceptado" : "Anulado"}
                                        </span>
                                    </td>
                                    <td className="acciones-cell">
                                        <button
                                            className="btn-accion comprobante"
                                            onClick={() => verDetalle(c)}
                                            title="Ver detalle / JSON Nubefact"
                                        >
                                            <i className="ti ti-eye"></i>
                                        </button>
                                        <button
                                            className="btn-accion email"
                                            onClick={() => descargarPDF(c, "a4")}
                                            title="Descargar PDF A4"
                                        >
                                            <i className="ti ti-file-type-pdf"></i>
                                        </button>
                                        <button
                                            className="btn-accion a4"
                                            onClick={() => descargarPDF(c, "80mm")}
                                            title="Descargar PDF 80mm (térmica)"
                                        >
                                            <i className="ti ti-receipt"></i>
                                        </button>
                                        {puedeAnular && c.estado === "ACEPTADO" && c.tipoDeComprobante !== "NOTA_CREDITO" && (
                                            <>
                                                <button
                                                    className="btn-accion generar"
                                                    onClick={() => abrirNC(c)}
                                                    title="Emitir nota de crédito (anulación de la operación)"
                                                >
                                                    <i className="ti ti-file-minus"></i>
                                                </button>
                                                <button
                                                    className="btn-accion anular"
                                                    onClick={() => abrirAnular(c)}
                                                    title="Anular comprobante (comunicación de baja)"
                                                >
                                                    <i className="ti ti-ban"></i>
                                                </button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>
            )}

            {!cargando && !error && <Paginacion {...pag} />}

            {/* MODAL DETALLE / JSON NUBEFACT */}
            {compDetalle && (
                <div className="modal-overlay" onClick={() => setCompDetalle(null)}>
                    <div className="modal modal-wizard" onClick={e => e.stopPropagation()}>
                        <div className="wizard-header">
                            <h3>
                                {TIPO_LABEL[compDetalle.tipoDeComprobante]} {compDetalle.serie}-{numeroFmt(compDetalle.numero)}
                            </h3>
                            <button className="modal-cerrar" onClick={() => setCompDetalle(null)}>
                                <i className="ti ti-x"></i>
                            </button>
                        </div>
                        <div className="modal-body modal-scroll">
                            <div className="wizard-contenido">
                                <div className="resumen-venta">
                                    <p className="resumen-titulo"><i className="ti ti-file-invoice"></i> Detalle del comprobante</p>
                                    <div className="resumen-fila"><span>Cliente</span><strong>{compDetalle.clienteDenominacion}</strong></div>
                                    <div className="resumen-fila"><span>Documento</span><strong>{DOC_LABEL[compDetalle.clienteTipoDeDocumento]}: {compDetalle.clienteNumeroDeDocumento}</strong></div>
                                    <div className="resumen-fila"><span>Descripción</span><strong>{compDetalle.descripcion}</strong></div>
                                    <div className="resumen-fila"><span>Emisión</span><strong>{compDetalle.fechaDeEmision}</strong></div>
                                    <div className="resumen-fila"><span>Emitido por</span><strong>{compDetalle.usuarioNombre || "—"}</strong></div>
                                    {compDetalle.estado === "ANULADO" && (
                                        <>
                                            <div className="resumen-fila"><span>Anulado</span><strong>{compDetalle.anuladoAt?.replace("T", " ").slice(0, 19)}</strong></div>
                                            <div className="resumen-fila"><span>Motivo</span><strong>{compDetalle.motivoAnulacion}</strong></div>
                                        </>
                                    )}
                                    <div className="resumen-fila"><span>Op. Exonerada</span><strong>S/ {Number(compDetalle.totalExonerada).toFixed(2)}</strong></div>
                                    <div className="resumen-fila"><span>IGV (Exonerado)</span><strong>S/ {Number(compDetalle.totalIgv).toFixed(2)}</strong></div>
                                    <div className="resumen-fila resumen-total"><span>Total</span><strong>S/ {Number(compDetalle.total).toFixed(2)}</strong></div>
                                    <p className="comp-nota-exoneracion">
                                        Operación exonerada del IGV — Ley N° 27037 (Amazonía)
                                    </p>
                                </div>

                                <p className="wizard-titulo">JSON enviado a Nubefact</p>
                                <pre className="comp-json">
                                    {jsonNubefact ? JSON.stringify(jsonNubefact, null, 2) : "Cargando..."}
                                </pre>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancelar" onClick={() => setCompDetalle(null)}>Cerrar</button>
                            {compDetalle.enlacePdf && (
                                <button className="btn-cancelar" onClick={() => verOficialNubefact(compDetalle)}>
                                    <i className="ti ti-external-link"></i> Oficial Nubefact
                                </button>
                            )}
                            <button className="btn-cancelar" onClick={() => descargarPDF(compDetalle, "80mm")}>
                                <i className="ti ti-receipt"></i> PDF 80mm
                            </button>
                            <button className="btn-guardar" onClick={() => descargarPDF(compDetalle, "a4")}>
                                <i className="ti ti-file-type-pdf"></i> PDF A4
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL NOTA DE CRÉDITO */}
            {compNC && (
                <div className="modal-overlay" onClick={() => setCompNC(null)}>
                    <div className="modal modal-wizard modal-anular" onClick={e => e.stopPropagation()}>
                        <div className="wizard-header">
                            <h3>Nota de Crédito — {TIPO_LABEL[compNC.tipoDeComprobante]} {compNC.serie}-{numeroFmt(compNC.numero)}</h3>
                            <button className="modal-cerrar" onClick={() => setCompNC(null)}>
                                <i className="ti ti-x"></i>
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="wizard-contenido">
                                <div className="comp-alerta">
                                    <i className="ti ti-info-circle"></i>
                                    Se emitirá una nota de crédito por <strong> anulación de la operación</strong> (S/ {Number(compNC.total).toFixed(2)}).
                                    Úsala cuando ya pasó el plazo de la comunicación de baja. El comprobante original quedará anulado.
                                </div>
                                <div className="form-grupo">
                                    <label>Motivo *</label>
                                    <textarea
                                        rows={3}
                                        value={motivo}
                                        onChange={e => setMotivo(e.target.value)}
                                        placeholder="Ej: Pasajero desistió del viaje"
                                    />
                                </div>
                                {errorAnular && (
                                    <div className="modal-error">
                                        <i className="ti ti-alert-circle"></i> {errorAnular}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancelar" onClick={() => setCompNC(null)}>Cancelar</button>
                            <button className="btn-guardar" onClick={confirmarNotaCredito} disabled={anulando}>
                                {anulando
                                    ? <><i className="ti ti-loader-2 spin"></i> Emitiendo...</>
                                    : <><i className="ti ti-file-minus"></i> Emitir Nota de Crédito</>
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL ANULAR */}
            {compAnular && (
                <div className="modal-overlay" onClick={() => setCompAnular(null)}>
                    <div className="modal modal-wizard modal-anular" onClick={e => e.stopPropagation()}>
                        <div className="wizard-header">
                            <h3>Anular {TIPO_LABEL[compAnular.tipoDeComprobante]} {compAnular.serie}-{numeroFmt(compAnular.numero)}</h3>
                            <button className="modal-cerrar" onClick={() => setCompAnular(null)}>
                                <i className="ti ti-x"></i>
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="wizard-contenido">
                                <div className="comp-alerta">
                                    <i className="ti ti-alert-triangle"></i>
                                    Se enviará una comunicación de baja a SUNAT a través de Nubefact. Esta acción no se puede deshacer.
                                </div>
                                <div className="form-grupo">
                                    <label>Motivo de anulación *</label>
                                    <textarea
                                        rows={3}
                                        value={motivo}
                                        onChange={e => setMotivo(e.target.value)}
                                        placeholder="Ej: Error en los datos del cliente"
                                    />
                                </div>
                                {errorAnular && (
                                    <div className="modal-error">
                                        <i className="ti ti-alert-circle"></i> {errorAnular}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancelar" onClick={() => setCompAnular(null)}>Cancelar</button>
                            <button className="btn-anular-confirmar" onClick={confirmarAnulacion} disabled={anulando}>
                                {anulando
                                    ? <><i className="ti ti-loader-2 spin"></i> Anulando...</>
                                    : <><i className="ti ti-ban"></i> Anular Comprobante</>
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <Toasts toasts={toasts} />
        </div>
    );
}

export default Comprobantes;
