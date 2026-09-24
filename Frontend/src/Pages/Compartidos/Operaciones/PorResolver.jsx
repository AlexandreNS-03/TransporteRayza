import { useState, useEffect } from "react";
import "../Ventas/Pasajes.css";
import "./PorResolver.css";
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

const METODO_LABEL = {
    EFECTIVO: "Efectivo", YAPE: "Yape", PLIN: "Plin",
    TARJETA: "Tarjeta", TRANSFERENCIA: "Transferencia",
};

/** 2026-12-15 → 15/12. El año no entra en una columna angosta y no hace falta. */
function fechaCorta(iso) {
    if (!iso) return "";
    const [, m, d] = iso.slice(0, 10).split("-");
    return `${d}/${m}`;
}

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
            setViajes(await apiFetch("/api/viajes?estado=PROGRAMADO"));
        } catch (err) {
            setError(err.message);
        }
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
            // Si al recargar falla algo, el pasaje YA quedó resuelto: hay que
            // decirlo, o parece que la acción no se hizo y se intenta de nuevo.
            cargar().catch(() => {});
        } catch (err) { mostrarToast("error", err.message); }
        finally { setProcesando(null); }
    };

    const devolver = (v) => {
        // Lo cobrado por la web no está en el cajón (entra a Izipay o Mercado
        // Pago): quien devuelve en efectivo tiene que saberlo antes de abrirlo.
        const avisoWeb = v.canal === "WEB"
            ? `\n\nOJO: este pasaje se pagó por la web (${METODO_LABEL[v.metodoPago] || v.metodoPago}). Ese dinero no está en tu cajón.`
            : "";
        if (!confirm(`¿Devolver S/ ${Number(v.precio).toFixed(2)} a ${v.pasajeroNombre}? Se registrará el egreso en tu caja.${avisoWeb}`)) return;
        accion(v, "devolver", "dinero devuelto");
    };

    const saldoAFavor = (v) => {
        if (!confirm(`¿Guardar S/ ${Number(v.precio).toFixed(2)} como saldo a favor de ${v.clienteEmail}?`)) return;
        accion(v, "saldo-favor", "saldo a favor guardado");
    };

    const confirmarRepro = () => {
        if (!viajeDestino) { setErrorRepro("Elige el viaje nuevo"); return; }
        accion(reprogramar, "reprogramar", "pasaje reprogramado", { viajeId: viajeDestino });
    };

    const total = pendientes.reduce((s, v) => s + (Number(v.precio) || 0), 0);
    const viajesAfectados = new Set(pendientes.map(v => v.viajeCodigo)).size;

    // Los pasajeros del mismo viaje cancelado se resuelven de una sentada: van
    // juntos aunque la lista llegue mezclada.
    const lista = [...pendientes].sort((a, b) =>
        (a.viajeCodigo || "").localeCompare(b.viajeCodigo || "", "es", { numeric: true })
        || (a.pasajeroNombre || "").localeCompare(b.pasajeroNombre || "", "es"));

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
                <div className="pasajes-estado error">
                    <i className="ti ti-alert-circle"></i>
                    <span>
                        {error}
                        <br />
                        <small>
                            Esto es al cargar la lista: lo que ya resolviste quedó guardado.
                            Pulsa Actualizar para verla al día.
                        </small>
                    </span>
                </div>
            )}

            {!cargando && !error && pendientes.length === 0 && (
                <div className="pasajes-estado">
                    <i className="ti ti-circle-check"></i> No hay pasajes pendientes de resolver
                </div>
            )}

            {!cargando && !error && pendientes.length > 0 && (
                <>
                    <div className="resumen-barra">
                        <div className="resumen-dato">
                            <strong>{pendientes.length}</strong>
                            <span>{pendientes.length === 1 ? "pasaje por resolver" : "pasajes por resolver"}</span>
                        </div>
                        <div className="resumen-dato resumen-plata">
                            <strong>S/ {total.toFixed(2)}</strong>
                            <span>en juego</span>
                        </div>
                        <div className="resumen-dato">
                            <strong>{viajesAfectados}</strong>
                            <span>{viajesAfectados === 1 ? "viaje cancelado" : "viajes cancelados"}</span>
                        </div>
                    </div>

                    {/* Los botones dicen qué hacen; esta línea dice qué pasa después,
                        que es lo que no se puede leer del nombre. */}
                    <p className="resolver-leyenda">
                        <b>Devolver</b> saca la plata de tu caja ·
                        <b> Reprogramar</b> lo mueve a otro viaje sin cobrarle de nuevo ·
                        <b> Saldo a favor</b> se lo guarda para su próxima compra
                    </p>

                    <div className="pasajes-tabla-wrapper">
                        <table className="pasajes-tabla tabla-resolver">
                            <thead>
                            <tr>
                                <th>Pasajero</th>
                                <th>Viaje cancelado</th>
                                <th>Tramo</th>
                                <th className="th-pago">Pagó</th>
                                <th>Qué hacer</th>
                            </tr>
                            </thead>
                            <tbody>
                            {lista.map(v => {
                                const ocupado = procesando === v.id;
                                const sinCorreo = !v.clienteEmail;
                                return (
                                <tr key={v.id}>
                                    <td data-label="Pasajero">
                                        <div className="pasajero-info">
                                            <strong>{v.pasajeroNombre}</strong>
                                            <span>{v.tipoDocumento} {v.pasajeroDocumento}</span>
                                            <span className="resolver-contacto">
                                                {v.pasajeroTelefono && <em><i className="ti ti-phone"></i>{v.pasajeroTelefono}</em>}
                                                {v.clienteEmail && <em><i className="ti ti-mail"></i>{v.clienteEmail}</em>}
                                                {!v.pasajeroTelefono && !v.clienteEmail && <em className="sin-dato">sin teléfono ni correo</em>}
                                            </span>
                                        </div>
                                    </td>
                                    <td data-label="Viaje cancelado">
                                        <div className="pasajero-info">
                                            <strong className="codigo">{v.viajeCodigo}</strong>
                                            {v.fechaSalida && (
                                                <span className="celda-fecha">
                                                    salía {fechaCorta(v.fechaSalida)} · {(v.horaSalida || "").slice(0, 5)}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td data-label="Tramo">
                                        <span className="tramo-linea">
                                            {v.paradaOrigen} <i className="ti ti-arrow-right"></i> {v.paradaDestino}
                                        </span>
                                    </td>
                                    <td className="celda-precio" data-label="Pagó">
                                        <strong>S/ {Number(v.precio).toFixed(2)}</strong>
                                        <span className="celda-metodo">
                                            {METODO_LABEL[v.metodoPago] || v.metodoPago || (v.canal === "WEB" ? "" : "—")}
                                            {v.canal === "WEB" && <em>{v.metodoPago ? " · web" : "web"}</em>}
                                        </span>
                                    </td>
                                    <td className="acciones-cell" data-label="Qué hacer">
                                        <button className="btn-resolver devolver" disabled={ocupado}
                                                title="Entregar el dinero y registrar el egreso en tu caja"
                                                onClick={() => devolver(v)}>
                                            <i className="ti ti-cash"></i> Devolver
                                        </button>
                                        <button className="btn-resolver mover" disabled={ocupado}
                                                title="Mover el pasaje a otro viaje sin volver a cobrar"
                                                onClick={() => { setReprogramar(v); setViajeDestino(""); setErrorRepro(null); }}>
                                            <i className="ti ti-calendar-plus"></i> Reprogramar
                                        </button>
                                        <button className="btn-resolver saldo" disabled={ocupado || sinCorreo}
                                                title={sinCorreo
                                                    ? "Sin correo del cliente no se puede guardar saldo: usa Devolver"
                                                    : `Guardar el monto para ${v.clienteEmail}`}
                                                onClick={() => saldoAFavor(v)}>
                                            <i className="ti ti-wallet"></i> Saldo a favor
                                        </button>
                                    </td>
                                </tr>
                                );
                            })}
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
