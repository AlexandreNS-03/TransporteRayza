import { useState } from "react";
import "./Comprobantes.css";
import { apiFetch, consultarDni, consultarRuc } from "../../../Services/api.js";

// Códigos de tipo de documento según SUNAT / Nubefact
const DOC_LABEL = { "1": "DNI", "4": "CARNET DE EXTRANJERÍA", "6": "RUC", "7": "PASAPORTE" };
const DOC_A_CODIGO = { DNI: "1", CE: "4", RUC: "6", PASAPORTE: "7" };

/**
 * Modal para emitir una boleta o factura electrónica (formato Nubefact)
 * a partir de una venta de pasaje o de una encomienda.
 */
function GenerarComprobanteModal({ venta, encomienda, onClose, onGenerado }) {
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState(null);
    const [consultando, setConsultando] = useState(false);
    const [infoConsulta, setInfoConsulta] = useState(null); // aviso RUC (empresa)

    // Datos precargados según el origen (venta o encomienda)
    const docCliente = venta ? (DOC_A_CODIGO[venta.clienteTipoDoc] || "1") : "1";
    const descripcionInicial = venta
        ? `Servicio de transporte fluvial ${venta.paradaOrigen} - ${venta.paradaDestino}, Viaje ${venta.viajeCodigo}, Asiento ${venta.asientoTipo} #${venta.asientoNumero}`
        : `Servicio de encomienda ${encomienda.codigoEncomienda}: ${encomienda.descripcion}${encomienda.peso ? ` (${encomienda.peso} kg)` : ""}`;

    const [form, setForm] = useState({
        tipoDeComprobante: "BOLETA",
        clienteTipoDeDocumento: docCliente,
        clienteNumeroDeDocumento: venta ? (venta.clienteDocumento || "") : (encomienda.remitenteDocumento || ""),
        clienteDenominacion: venta ? (venta.clienteNombre || "") : (encomienda.remitenteNombre || ""),
        clienteDireccion: "",
        clienteEmail: venta ? (venta.clienteEmail || "") : "",
        descripcion: descripcionInicial
    });

    // Operación exonerada de IGV (Ley 27037 - Amazonía): el precio es el monto final, sin IGV
    const total = parseFloat(venta ? venta.precio : encomienda.precio) || 0;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const cambiarTipo = (tipo) => {
        setForm(prev => ({
            ...prev,
            tipoDeComprobante: tipo,
            // La factura exige RUC; la boleta por defecto DNI
            clienteTipoDeDocumento: tipo === "FACTURA" ? "6" : (docCliente === "6" ? "1" : docCliente)
        }));
    };

    const emitir = async () => {
        setError(null);

        if (!form.clienteDenominacion.trim()) {
            setError("La denominación / razón social es obligatoria");
            return;
        }
        if (form.tipoDeComprobante === "FACTURA" && !/^\d{11}$/.test(form.clienteNumeroDeDocumento.trim())) {
            setError("La factura requiere un RUC de 11 dígitos");
            return;
        }
        if (form.tipoDeComprobante === "BOLETA" && form.clienteTipoDeDocumento === "1" && !/^\d{8}$/.test(form.clienteNumeroDeDocumento.trim())) {
            setError("El DNI debe tener 8 dígitos");
            return;
        }

        setGuardando(true);
        try {
            const referencia = venta ? { ventaId: venta.id } : { encomiendaId: encomienda.id };
            const comprobante = await apiFetch("/api/comprobantes", {
                method: "POST",
                body: JSON.stringify({ ...referencia, ...form })
            });
            onGenerado(comprobante);
        } catch (err) {
            setError(err.message);
        } finally {
            setGuardando(false);
        }
    };

    // Consulta el documento: FACTURA (RUC) muestra la empresa sin autocompletar;
    // BOLETA con DNI autocompleta el nombre.
    const consultarDocumento = async () => {
        const num = form.clienteNumeroDeDocumento.trim();
        setError(null);
        setInfoConsulta(null);
        setConsultando(true);
        try {
            if (form.tipoDeComprobante === "FACTURA") {
                const data = await consultarRuc(num);
                setInfoConsulta({
                    tipo: "ruc",
                    razonSocial: data.razonSocial,
                    direccion: data.direccion,
                    estado: `${data.estado} · ${data.condicion}`
                });
            } else if (form.clienteTipoDeDocumento === "1") {
                const data = await consultarDni(num);
                setForm(prev => ({ ...prev, clienteDenominacion: data.nombreCompleto }));
                setInfoConsulta({ tipo: "dni", razonSocial: data.nombreCompleto });
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setConsultando(false);
        }
    };

    const usarRazonSocial = () => {
        if (infoConsulta?.razonSocial) {
            setForm(prev => ({
                ...prev,
                clienteDenominacion: infoConsulta.razonSocial,
                clienteDireccion: infoConsulta.direccion || prev.clienteDireccion
            }));
        }
    };

    const puedeConsultar = form.tipoDeComprobante === "FACTURA"
        ? /^\d{11}$/.test(form.clienteNumeroDeDocumento.trim())
        : form.clienteTipoDeDocumento === "1" && /^\d{8}$/.test(form.clienteNumeroDeDocumento.trim());

    const opcionesDoc = form.tipoDeComprobante === "FACTURA" ? ["6"] : ["1", "4", "7"];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal modal-wizard" onClick={e => e.stopPropagation()}>

                <div className="wizard-header">
                    <h3>Generar Comprobante Electrónico</h3>
                    <button className="modal-cerrar" onClick={onClose}>
                        <i className="ti ti-x"></i>
                    </button>
                </div>

                <div className="modal-body modal-scroll">
                    <div className="wizard-contenido">

                        <div className="form-grupo">
                            <label>Tipo de Comprobante *</label>
                            <div className="comp-selector">
                                {["BOLETA", "FACTURA"].map(t => (
                                    <button
                                        key={t}
                                        className={`comp-btn ${form.tipoDeComprobante === t ? "activo" : ""}`}
                                        onClick={() => cambiarTipo(t)}
                                    >
                                        {t === "BOLETA" ? "Boleta de Venta" : "Factura"}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="form-fila">
                            <div className="form-grupo">
                                <label>Tipo Documento *</label>
                                <select name="clienteTipoDeDocumento" value={form.clienteTipoDeDocumento} onChange={handleChange}>
                                    {opcionesDoc.map(c => (
                                        <option key={c} value={c}>{DOC_LABEL[c]}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-grupo">
                                <label>{form.tipoDeComprobante === "FACTURA" ? "RUC *" : "Número Documento *"}</label>
                                <div className="doc-consulta">
                                    <input type="text" name="clienteNumeroDeDocumento"
                                           value={form.clienteNumeroDeDocumento}
                                           onChange={e => { handleChange(e); setInfoConsulta(null); }}
                                           placeholder={form.tipoDeComprobante === "FACTURA" ? "20123456789" : "12345678"} />
                                    <button type="button" className="btn-consulta"
                                            onClick={consultarDocumento}
                                            disabled={!puedeConsultar || consultando}
                                            title={form.tipoDeComprobante === "FACTURA" ? "Consultar empresa (SUNAT)" : "Consultar nombre (RENIEC)"}>
                                        {consultando
                                            ? <i className="ti ti-loader-2 spin"></i>
                                            : <><i className="ti ti-search"></i> Consultar</>}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {infoConsulta?.tipo === "ruc" && (
                            <div className="consulta-resultado">
                                <div className="consulta-empresa">
                                    <i className="ti ti-building"></i>
                                    <div>
                                        <strong>{infoConsulta.razonSocial}</strong>
                                        {infoConsulta.direccion && <span>{infoConsulta.direccion}</span>}
                                        <span className="consulta-estado">SUNAT: {infoConsulta.estado}</span>
                                    </div>
                                </div>
                                <button type="button" className="btn-usar-empresa" onClick={usarRazonSocial}>
                                    <i className="ti ti-arrow-down"></i> Usar estos datos
                                </button>
                            </div>
                        )}

                        <div className="form-grupo">
                            <label>{form.tipoDeComprobante === "FACTURA" ? "Razón Social *" : "Nombre / Denominación *"}</label>
                            <input type="text" name="clienteDenominacion"
                                   value={form.clienteDenominacion} onChange={handleChange}
                                   placeholder={form.tipoDeComprobante === "FACTURA" ? "EMPRESA S.A.C." : "Juan Pérez García"} />
                        </div>

                        <div className="form-grupo">
                            <label>Dirección {form.tipoDeComprobante === "FACTURA" ? "Fiscal" : ""}</label>
                            <input type="text" name="clienteDireccion"
                                   value={form.clienteDireccion} onChange={handleChange}
                                   placeholder="Av. Ejemplo 123, Iquitos" />
                        </div>

                        <div className="form-grupo">
                            <label>Correo electrónico (envío automático)</label>
                            <input type="email" name="clienteEmail"
                                   value={form.clienteEmail} onChange={handleChange}
                                   placeholder="correo@ejemplo.com" />
                        </div>

                        <div className="form-grupo">
                            <label>Descripción del servicio *</label>
                            <input type="text" name="descripcion"
                                   value={form.descripcion} onChange={handleChange} />
                        </div>

                        {/* Resumen estilo Nubefact */}
                        <div className="resumen-venta">
                            <p className="resumen-titulo"><i className="ti ti-file-invoice"></i> Resumen del comprobante</p>
                            <div className="resumen-fila"><span>Serie - Número</span><strong>Asignados automáticamente al emitir</strong></div>
                            <div className="resumen-fila"><span>Fecha de emisión</span><strong>{new Date().toLocaleDateString("es-PE")}</strong></div>
                            <div className="resumen-fila"><span>Moneda</span><strong>PEN (Soles)</strong></div>
                            <div className="resumen-fila"><span>Op. Exonerada</span><strong>S/ {total.toFixed(2)}</strong></div>
                            <div className="resumen-fila"><span>IGV (Exonerado)</span><strong>S/ 0.00</strong></div>
                            <div className="resumen-fila resumen-total"><span>Importe Total</span><strong>S/ {total.toFixed(2)}</strong></div>
                            <p className="comp-nota-exoneracion">
                                Operación exonerada del IGV — Ley N° 27037, Ley de Promoción de la Inversión en la Amazonía
                            </p>
                        </div>

                        {error && (
                            <div className="modal-error">
                                <i className="ti ti-alert-circle"></i> {error}
                            </div>
                        )}
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn-cancelar" onClick={onClose}>Cancelar</button>
                    <button className="btn-guardar" onClick={emitir} disabled={guardando}>
                        {guardando
                            ? <><i className="ti ti-loader-2 spin"></i> Emitiendo...</>
                            : <><i className="ti ti-file-check"></i> Emitir {form.tipoDeComprobante === "FACTURA" ? "Factura" : "Boleta"}</>
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}

export default GenerarComprobanteModal;
