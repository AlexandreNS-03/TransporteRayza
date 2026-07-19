import { useState, useEffect } from "react";
import "../Ventas/Pasajes.css";
import "../Finanzas/Comprobantes.css";
import { apiFetch, usuarioActual } from "../../../Services/api.js";
import { useToast, Toasts } from "../../../Components/Toast.jsx";
import { usePaginacion, Paginacion } from "../../../Components/Paginacion.jsx";

const SEVERIDADES = [
    { valor: "ERROR",   label: "El sistema está fallando",     desc: "Errores, pantallas en blanco, no puedo trabajar" },
    { valor: "WARNING", label: "Algo no funciona bien",         desc: "Un dato salió mal, algo se ve raro" },
    { valor: "INFO",    label: "Consulta o sugerencia",         desc: "Duda sobre el uso o idea de mejora" },
];

const TIPO_BADGE = { ERROR: "badge-anulado", WARNING: "badge-transito", INFO: "badge-pagado", SUCCESS: "badge-pagado" };

function fmtFecha(iso) {
    if (!iso) return "—";
    return iso.replace("T", " ").slice(0, 16);
}

function Soporte() {
    const usuario = usuarioActual();
    const esAdmin = usuario?.rol === "ADMIN";
    const { toasts, mostrarToast } = useToast();

    const [form, setForm] = useState({ severidad: "WARNING", asunto: "", detalle: "" });
    const [enviando, setEnviando] = useState(false);
    const [errorForm, setErrorForm] = useState(null);

    // Vista del administrador
    const [reportes, setReportes] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [soloPendientes, setSoloPendientes] = useState(true);

    useEffect(() => { if (esAdmin) cargarReportes(); }, []);

    const cargarReportes = async () => {
        setCargando(true);
        try {
            setReportes(await apiFetch("/api/soporte"));
        } catch (err) { mostrarToast("error", err.message); }
        finally { setCargando(false); }
    };

    const enviar = async () => {
        setErrorForm(null);
        if (!form.asunto.trim()) { setErrorForm("Escribe un asunto breve"); return; }
        if (!form.detalle.trim()) { setErrorForm("Describe qué pasó para poder ayudarte"); return; }

        setEnviando(true);
        try {
            // Contexto útil para el administrador
            const contexto = `\n\n— Página: ${window.location.pathname} · Navegador: ${navigator.userAgent.split(") ")[0]})`;
            await apiFetch("/api/soporte", {
                method: "POST",
                body: JSON.stringify({ ...form, detalle: form.detalle.trim() + contexto })
            });
            setForm({ severidad: "WARNING", asunto: "", detalle: "" });
            mostrarToast("success", "Reporte enviado. El administrador fue notificado.");
            if (esAdmin) cargarReportes();
        } catch (err) { setErrorForm(err.message); }
        finally { setEnviando(false); }
    };

    const marcarAtendido = async (r) => {
        try {
            await apiFetch(`/api/soporte/${r.id}/atendido`, { method: "PATCH" });
            mostrarToast("success", "Reporte marcado como atendido");
            cargarReportes();
        } catch (err) { mostrarToast("error", err.message); }
    };

    const visibles = soloPendientes ? reportes.filter(r => !r.leido) : reportes;
    const pag = usePaginacion(visibles, 8);
    const pendientes = reportes.filter(r => !r.leido).length;

    return (
        <div className="pasajes-page">

            <div className="pasajes-header">
                <div>
                    <h2>Soporte</h2>
                    <p>¿Algo está fallando? Repórtalo y el administrador será notificado</p>
                </div>
            </div>

            {/* CONTACTOS DIRECTOS */}
            <div className="soporte-contactos">
                <a className="contacto-card whatsapp" href="https://wa.me/51921457763" target="_blank" rel="noreferrer">
                    <i className="ti ti-brand-whatsapp"></i>
                    <div>
                        <strong>Rafael Flores</strong>
                        <span>Administrador del sistema</span>
                        <span className="contacto-dato">WhatsApp: 921 457 763</span>
                    </div>
                </a>
                <a className="contacto-card correo" href="mailto:rfloressiad@gmail.com">
                    <i className="ti ti-mail"></i>
                    <div>
                        <strong>Correo de soporte</strong>
                        <span>Administrador del sistema</span>
                        <span className="contacto-dato">rfloressiad@gmail.com</span>
                    </div>
                </a>
                <a className="contacto-card whatsapp" href="https://wa.me/51969370722" target="_blank" rel="noreferrer">
                    <i className="ti ti-brand-whatsapp"></i>
                    <div>
                        <strong>Fabricio</strong>
                        <span>Coautor del sistema</span>
                        <span className="contacto-dato">WhatsApp: 969 370 722</span>
                    </div>
                </a>
            </div>

            {/* FORMULARIO DE REPORTE */}
            <div className="soporte-form">
                <p className="wizard-titulo">Nuevo reporte de incidente</p>

                <div className="form-grupo">
                    <label>¿Qué tan grave es? *</label>
                    <div className="comp-selector soporte-severidades">
                        {SEVERIDADES.map(s => (
                            <button key={s.valor}
                                    className={`comp-btn ${form.severidad === s.valor ? "activo" : ""}`}
                                    onClick={() => setForm(p => ({ ...p, severidad: s.valor }))}
                                    title={s.desc}>
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="form-grupo">
                    <label>Asunto *</label>
                    <input type="text" value={form.asunto}
                           onChange={e => setForm(p => ({ ...p, asunto: e.target.value }))}
                           placeholder="Ej: No puedo emitir boletas desde esta mañana" />
                </div>

                <div className="form-grupo">
                    <label>¿Qué pasó? Cuéntanos con detalle *</label>
                    <textarea rows={4} value={form.detalle}
                              onChange={e => setForm(p => ({ ...p, detalle: e.target.value }))}
                              placeholder="Qué estabas haciendo, qué mensaje de error apareció, desde cuándo pasa..." />
                </div>

                {errorForm && <div className="modal-error"><i className="ti ti-alert-circle"></i> {errorForm}</div>}

                <div className="soporte-form-footer">
                    <span className="soporte-nota">
                        Se enviará con tu usuario ({usuario?.nombre}) y también llegará al correo del administrador.
                    </span>
                    <button className="btn-guardar" onClick={enviar} disabled={enviando}>
                        {enviando ? <><i className="ti ti-loader-2 spin"></i> Enviando...</> : <><i className="ti ti-send"></i> Enviar Reporte</>}
                    </button>
                </div>
            </div>

            {/* BANDEJA DEL ADMINISTRADOR */}
            {esAdmin && (
                <>
                    <div className="pasajes-header" style={{ marginTop: 28 }}>
                        <div>
                            <h2 style={{ fontSize: 18 }}>Bandeja de reportes</h2>
                            <p>{pendientes} pendiente{pendientes === 1 ? "" : "s"} de atender</p>
                        </div>
                        <div className="caja-acciones" style={{ marginBottom: 0 }}>
                            <button className="btn-limpiar" onClick={() => setSoloPendientes(!soloPendientes)}>
                                <i className={`ti ${soloPendientes ? "ti-eye" : "ti-eye-off"}`}></i>
                                {soloPendientes ? "Ver todos" : "Solo pendientes"}
                            </button>
                            <button className="btn-limpiar" onClick={cargarReportes}>
                                <i className="ti ti-refresh"></i> Actualizar
                            </button>
                        </div>
                    </div>

                    {cargando && <div className="pasajes-estado"><i className="ti ti-loader-2 spin"></i> Cargando...</div>}

                    {!cargando && (
                        <>
                        <div className="pasajes-tabla-wrapper">
                            <table className="pasajes-tabla">
                                <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Severidad</th>
                                    <th>Asunto</th>
                                    <th>Detalle</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                                </thead>
                                <tbody>
                                {pag.items.length === 0 ? (
                                    <tr><td colSpan={6} className="tabla-vacia">
                                        <i className="ti ti-inbox-off"></i><span>Sin reportes {soloPendientes ? "pendientes" : ""}</span>
                                    </td></tr>
                                ) : (
                                    pag.items.map(r => (
                                        <tr key={r.id} className={r.leido ? "fila-anulada" : ""}>
                                            <td className="codigo">{fmtFecha(r.createdAt)}</td>
                                            <td><span className={`badge ${TIPO_BADGE[r.tipo] || "badge-pagado"}`}>{r.tipo}</span></td>
                                            <td><strong>{r.titulo}</strong></td>
                                            <td className="soporte-detalle">{r.mensaje}</td>
                                            <td>
                                                <span className={`badge ${r.leido ? "badge-pagado" : "badge-transito"}`}>
                                                    {r.leido ? "Atendido" : "Pendiente"}
                                                </span>
                                            </td>
                                            <td className="acciones-cell">
                                                {!r.leido && (
                                                    <button className="btn-accion email" onClick={() => marcarAtendido(r)} title="Marcar como atendido">
                                                        <i className="ti ti-check"></i>
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                                </tbody>
                            </table>
                        </div>
                        <Paginacion {...pag} />
                        </>
                    )}
                </>
            )}

            <Toasts toasts={toasts} />
        </div>
    );
}

export default Soporte;
