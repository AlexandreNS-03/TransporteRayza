import { useState, useEffect } from "react";
import "../Ventas/Pasajes.css";
import { apiFetch } from "../../../Services/api.js";
import { useToast, Toasts } from "../../../Components/Toast.jsx";
import SelectorViaje from "../../../Components/SelectorViaje.jsx";

/**
 * Pasajes de viajes cancelados que todavía nadie resolvió.
 *
 * Cancelar un viaje no mueve dinero: deja los pasajes acá. Recién en esta
 * pantalla alguien decide, pasajero por pasajero, si se devuelve el dinero,
 * se reprograma a otro viaje o se guarda como saldo a favor.
 */
function PorResolver() {
    const { toasts, mostrarToast } = useToast();

    const [pendientes, setPendientes] = useState([]);
    const [viajes, setViajes]         = useState([]);
    const [cargando, setCargando]     = useState(true);
    const [error, setError]           = useState(null);
    const [procesando, setProcesando] = useState(null);

    // Reprogramación
    const [reprogramar, setReprogramar] = useState(null);
    const [viajeDestino, setViajeDestino] = useState("");
    const [errorRepro, setErrorRepro]   = useState(null);

    useEffect(() => { cargar(); }, []);

    const cargar = async () => {
        setCargando(true);
        setError(null);
        try {
            setPendientes(await apiFetch("/api/ventas/por-resolver"));
            const vs = await apiFetch("/api/viajes");
            setViajes(vs.filter(v => v.estado === "PROGRAMADO"));
        } catch (err) { setError(err.message); }
        finally { setCargando(false); }
    };

    const accion = async (venta, ruta, etiqueta, cuerpo) => {
        setProcesando(venta.id);
        try {
            await apiFetch(`/api/ventas/${venta.id}/${ruta}`, {
                method: "PATCH",
                ...(cuerpo ? { body: JSON.stringify(cuerpo) } : {}),
            });
            mostrarToast("success", `${venta.pasajeroNombre}: ${etiqueta}`);
            setReprogramar(null);
            cargar();
        } catch (err) { mostrarToast("error", err.message); }
        finally { setProcesando(null); }
    };

    const devolver = (v) => {
        if (!confirm(`¿Devolver S/ ${v.precio} a ${v.pasajeroNombre}? Se registrará el egreso en tu caja.`)) return;
        accion(v, "devolver", "dinero devuelto");
    };

    const saldoAFavor = (v) => {
        if (!v.clienteEmail) {
            mostrarToast("error", "Este pasaje no tiene correo del cliente. Usa devolución.");
            return;
        }
        if (!confirm(`¿Guardar S/ ${v.precio} como saldo a favor de ${v.clienteEmail}?`)) return;
        accion(v, "saldo-favor", "saldo a favor guardado");
    };

    const confirmarRepro = () => {
        if (!viajeDestino) { setErrorRepro("Elige el viaje nuevo"); return; }
        accion(reprogramar, "reprogramar", "pasaje reprogramado", { viajeId: viajeDestino });
    };

    const total = pendientes.reduce((s, v) => s + (Number(v.precio) || 0), 0);

    return (
        <div className="pasajes-page">
            <div className="pasajes-header">
                <div>
                    <h2>Pasajes por resolver</h2>
                    <p>Pasajeros de viajes cancelados que esperan una respuesta</p>
                </div>
                <button className="btn-recargar" onClick={cargar}>
                    <i className="ti ti-refresh"></i> Actualizar
                </button>
            </div>

            {cargando && <div className="pasajes-estado"><i className="ti ti-loader-2 spin"></i> Cargando...</div>}
            {error && !cargando && (
                <div className="pasajes-estado error"><i className="ti ti-alert-circle"></i> {error}</div>
            )}

            {!cargando && !error && pendientes.length === 0 && (
                <div className="pasajes-estado">
                    <i className="ti ti-circle-check"></i> No hay pasajes pendientes de resolver
                </div>
            )}

            {!cargando && !error && pendientes.length > 0 && (
                <>
                    <div className="aviso-cancel">
                        <i className="ti ti-alert-triangle"></i>
                        <div>
                            <strong>{pendientes.length} pasaje(s) por resolver — S/ {total.toFixed(2)}</strong>
                            <span>
                                <b>Devolver</b> entrega el dinero y lo descuenta de tu caja.
                                <b> Reprogramar</b> mueve el pasaje a otro viaje sin cobrar de nuevo.
                                <b> Saldo a favor</b> le guarda el monto al cliente para su próxima compra.
                            </span>
                        </div>
                    </div>

                    <div className="pasajes-tabla-wrapper">
                        <table className="pasajes-tabla">
                            <thead>
                            <tr>
                                <th>Pasajero</th>
                                <th>Viaje cancelado</th>
                                <th>Tramo</th>
                                <th>Contacto</th>
                                <th>Monto</th>
                                <th>Qué hacer</th>
                            </tr>
                            </thead>
                            <tbody>
                            {pendientes.map(v => (
                                <tr key={v.id}>
                                    <td>
                                        <div className="pasajero-info">
                                            <strong>{v.pasajeroNombre}</strong>
                                            <span>{v.tipoDocumento} {v.pasajeroDocumento}</span>
                                        </div>
                                    </td>
                                    <td className="codigo">{v.viajeCodigo}</td>
                                    <td>
                                        <div className="tramo-info">
                                            <span>{v.paradaOrigen}</span>
                                            <i className="ti ti-arrow-right"></i>
                                            <span>{v.paradaDestino}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="pasajero-info">
                                            {v.clienteEmail && <span>{v.clienteEmail}</span>}
                                            {v.pasajeroTelefono && <span>{v.pasajeroTelefono}</span>}
                                            {!v.clienteEmail && !v.pasajeroTelefono && <span>—</span>}
                                        </div>
                                    </td>
                                    <td><strong>S/ {Number(v.precio).toFixed(2)}</strong></td>
                                    <td className="acciones-cell">
                                        <button className="btn-accion anular" title="Devolver el dinero"
                                                disabled={procesando === v.id}
                                                onClick={() => devolver(v)}>
                                            <i className="ti ti-cash"></i>
                                        </button>
                                        <button className="btn-accion comprobante" title="Reprogramar a otro viaje"
                                                disabled={procesando === v.id}
                                                onClick={() => { setReprogramar(v); setViajeDestino(""); setErrorRepro(null); }}>
                                            <i className="ti ti-calendar-plus"></i>
                                        </button>
                                        <button className="btn-accion generar" title="Guardar como saldo a favor"
                                                disabled={procesando === v.id}
                                                onClick={() => saldoAFavor(v)}>
                                            <i className="ti ti-wallet"></i>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* MODAL REPROGRAMAR */}
            {reprogramar && (
                <div className="modal-overlay" onClick={() => setReprogramar(null)}>
                    <div className="modal modal-wizard" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
                        <div className="wizard-header">
                            <h3>Reprogramar pasaje de {reprogramar.pasajeroNombre}</h3>
                            <button className="modal-cerrar" onClick={() => setReprogramar(null)}>
                                <i className="ti ti-x"></i>
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="wizard-contenido">
                                <div className="resumen-venta">
                                    <div className="resumen-fila"><span>Viaje cancelado</span><strong>{reprogramar.viajeCodigo}</strong></div>
                                    <div className="resumen-fila"><span>Tramo</span><strong>{reprogramar.paradaOrigen} → {reprogramar.paradaDestino}</strong></div>
                                    <div className="resumen-fila resumen-total"><span>Ya pagó</span><strong>S/ {Number(reprogramar.precio).toFixed(2)}</strong></div>
                                </div>
                                <div className="form-grupo">
                                    <label>Nuevo viaje *</label>
                                    <SelectorViaje viajes={viajes} value={viajeDestino} onChange={setViajeDestino} />
                                    <span className="campo-ayuda">No se le cobra de nuevo: se mueve el pasaje tal cual.</span>
                                </div>
                                {errorRepro && <div className="modal-error"><i className="ti ti-alert-circle"></i> {errorRepro}</div>}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancelar" onClick={() => setReprogramar(null)}>Volver</button>
                            <button className="btn-guardar" onClick={confirmarRepro} disabled={procesando === reprogramar.id}>
                                {procesando === reprogramar.id
                                    ? <><i className="ti ti-loader-2 spin"></i> Moviendo...</>
                                    : <><i className="ti ti-check"></i> Reprogramar</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Toasts toasts={toasts} />
        </div>
    );
}

export default PorResolver;
