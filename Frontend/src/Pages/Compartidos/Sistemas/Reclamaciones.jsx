import { useState, useEffect } from "react";
import "../Ventas/Pasajes.css";
import "../Finanzas/Comprobantes.css";
import "./ModalSimple.css";
import "./Reclamaciones.css";
import { apiFetch } from "../../../Services/api.js";
import { useToast, Toasts } from "../../../Components/Toast.jsx";

/**
 * Libro de Reclamaciones: ver las hojas y responderlas.
 *
 * La norma da 15 días hábiles improrrogables para responder, así que lo primero
 * que se ve es cuánto falta —y en rojo si ya se pasó—. Sin eso, una hoja se
 * queda esperando sin que nadie note que el plazo corre.
 *
 * La hoja original no se edita nunca: solo se agrega la respuesta. Son prueba
 * ante una fiscalización.
 */

const fmtFecha = (iso) => (iso ? iso.replace("T", " ").slice(0, 16) : "—");

const fmtDia = (iso) => {
    if (!iso) return "—";
    const [a, m, d] = iso.split("-");
    return `${d}/${m}/${a}`;
};

/** Días hábiles que faltan (negativo = ya se pasó el plazo). */
function habilesHasta(limiteIso) {
    if (!limiteIso) return null;
    const [a, m, d] = limiteIso.split("-").map(Number);
    const limite = new Date(a, m - 1, d);
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);

    const atrasado = limite < hoy;
    let desde = atrasado ? limite : hoy;
    let hasta = atrasado ? hoy : limite;
    let dias = 0;
    const cur = new Date(desde);
    while (cur < hasta) {
        cur.setDate(cur.getDate() + 1);
        const s = cur.getDay();
        if (s !== 0 && s !== 6) dias++;
    }
    return atrasado ? -dias : dias;
}

function Reclamaciones() {
    const { toasts, mostrarToast } = useToast();

    const [hojas, setHojas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [soloPendientes, setSoloPendientes] = useState(true);
    const [abierta, setAbierta] = useState(null);
    const [respuesta, setRespuesta] = useState("");
    const [enviando, setEnviando] = useState(false);

    useEffect(() => { cargar(); }, []);

    const cargar = async () => {
        setCargando(true);
        try {
            setHojas(await apiFetch("/api/reclamaciones"));
        } catch (e) {
            mostrarToast("error", e.message || "No se pudieron cargar las reclamaciones");
        } finally {
            setCargando(false);
        }
    };

    const responder = async () => {
        if (!respuesta.trim()) {
            mostrarToast("error", "Escribe la respuesta antes de enviarla");
            return;
        }
        setEnviando(true);
        try {
            await apiFetch(`/api/reclamaciones/${abierta.id}/responder`, {
                method: "PATCH",
                body: JSON.stringify({ respuesta }),
            });
            mostrarToast("success", `Respondida la hoja N° ${abierta.numero}. Se le avisó al consumidor por correo.`);
            setAbierta(null);
            setRespuesta("");
            cargar();
        } catch (e) {
            mostrarToast("error", e.message || "No se pudo guardar la respuesta");
        } finally {
            setEnviando(false);
        }
    };

    const visibles = soloPendientes ? hojas.filter((h) => h.estado === "PENDIENTE") : hojas;
    const pendientes = hojas.filter((h) => h.estado === "PENDIENTE").length;
    const vencidas = hojas.filter(
        (h) => h.estado === "PENDIENTE" && (habilesHasta(h.limiteRespuesta) ?? 0) < 0
    ).length;

    return (
        <div className="pasajes-page">
            <Toasts toasts={toasts} />

            <div className="pasajes-header">
                <div>
                    <h2>Libro de Reclamaciones</h2>
                    <p className="muted">
                        La norma da <strong>15 días hábiles improrrogables</strong> para responder cada hoja.
                    </p>
                </div>
                <button className="btn-secundario" onClick={cargar} disabled={cargando}>
                    {cargando ? "Cargando…" : "Actualizar"}
                </button>
            </div>

            {/* Lo primero que hay que ver es si alguna se pasó de plazo: eso es lo
                que se sanciona, no la cantidad de reclamos. */}
            {vencidas > 0 && (
                <div className="rec-alerta">
                    <strong>{vencidas} {vencidas === 1 ? "hoja pasó" : "hojas pasaron"} del plazo de 15 días hábiles.</strong>{" "}
                    Respóndelas cuanto antes: el incumplimiento es sancionable por INDECOPI.
                </div>
            )}

            <div className="rec-filtros">
                <button className={`filtro-btn ${soloPendientes ? "activo" : ""}`}
                        onClick={() => setSoloPendientes(true)}>
                    Pendientes ({pendientes})
                </button>
                <button className={`filtro-btn ${!soloPendientes ? "activo" : ""}`}
                        onClick={() => setSoloPendientes(false)}>
                    Todas ({hojas.length})
                </button>
            </div>

            {cargando ? (
                <p className="muted">Cargando…</p>
            ) : visibles.length === 0 ? (
                <p className="muted">
                    {soloPendientes ? "No hay reclamaciones pendientes." : "Todavía no hay reclamaciones registradas."}
                </p>
            ) : (
                <div className="rec-lista">
                    {visibles.map((h) => {
                        const faltan = habilesHasta(h.limiteRespuesta);
                        const vencida = h.estado === "PENDIENTE" && faltan < 0;
                        return (
                            <article key={h.id} className={`rec-hoja ${vencida ? "vencida" : ""}`}>
                                <header>
                                    <div>
                                        <span className="rec-numero">N° {h.numero}</span>
                                        <span className={`badge ${h.tipo === "QUEJA" ? "badge-transito" : "badge-anulado"}`}>
                                            {h.tipo === "QUEJA" ? "Queja" : "Reclamo"}
                                        </span>
                                        <span className={`badge ${h.estado === "RESPONDIDO" ? "badge-pagado" : "badge-pendiente"}`}>
                                            {h.estado === "RESPONDIDO" ? "Respondida" : "Pendiente"}
                                        </span>
                                    </div>
                                    {h.estado === "PENDIENTE" && (
                                        <span className={`rec-plazo ${vencida ? "rec-plazo-vencido" : ""}`}>
                                            {vencida
                                                ? `Vencida hace ${Math.abs(faltan)} ${Math.abs(faltan) === 1 ? "día hábil" : "días hábiles"}`
                                                : `Faltan ${faltan} ${faltan === 1 ? "día hábil" : "días hábiles"} · hasta el ${fmtDia(h.limiteRespuesta)}`}
                                        </span>
                                    )}
                                </header>

                                <div className="rec-datos">
                                    <p><strong>{h.consumidorNombre}</strong> · {h.consumidorTipoDocumento} {h.consumidorDocumento}</p>
                                    <p className="muted">
                                        {fmtFecha(h.createdAt)} · {h.consumidorEmail}
                                        {h.consumidorTelefono ? ` · ${h.consumidorTelefono}` : ""}
                                    </p>
                                    {h.bienDescripcion && <p className="muted">Servicio: {h.bienDescripcion}</p>}
                                    {h.montoReclamado != null && <p className="muted">Monto reclamado: S/ {h.montoReclamado}</p>}
                                </div>

                                <div className="rec-texto">
                                    <span className="rec-etiqueta">Detalle</span>
                                    <p>{h.detalle}</p>
                                </div>
                                {h.pedido && (
                                    <div className="rec-texto">
                                        <span className="rec-etiqueta">Lo que pide</span>
                                        <p>{h.pedido}</p>
                                    </div>
                                )}

                                {/* La evidencia que subió el consumidor: hay que poder
                                    verla antes de responder, no después. */}
                                {h.adjuntos?.length > 0 && (
                                    <div className="rec-texto">
                                        <span className="rec-etiqueta">Adjuntos ({h.adjuntos.length})</span>
                                        <div className="rec-adjuntos">
                                            {h.adjuntos.map((a) => (
                                                <a key={a.url} href={a.url} target="_blank" rel="noopener">
                                                    <i className="ti ti-paperclip"></i> {a.nombre}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {h.estado === "RESPONDIDO" ? (
                                    <div className="rec-respuesta">
                                        <span className="rec-etiqueta">Nuestra respuesta · {fmtFecha(h.respondidoAt)}</span>
                                        <p>{h.respuesta}</p>
                                    </div>
                                ) : (
                                    <button className="btn-primario" onClick={() => { setAbierta(h); setRespuesta(""); }}>
                                        Responder
                                    </button>
                                )}
                            </article>
                        );
                    })}
                </div>
            )}

            {abierta && (
                <div className="modal-overlay" onClick={() => !enviando && setAbierta(null)}>
                    <div className="modal rec-modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Responder la hoja N° {abierta.numero}</h3>
                        <p className="muted">
                            Se le enviará a <strong>{abierta.consumidorEmail}</strong>. La hoja original no se modifica.
                        </p>

                        <div className="rec-texto" style={{ marginTop: 12 }}>
                            <span className="rec-etiqueta">Lo que nos dijo</span>
                            <p>{abierta.detalle}</p>
                        </div>

                        <label className="rec-campo">
                            <span>Tu respuesta</span>
                            <textarea rows={7} value={respuesta} autoFocus
                                      placeholder="Explica qué pasó y qué se hará al respecto."
                                      onChange={(e) => setRespuesta(e.target.value)} />
                        </label>

                        <div className="modal-acciones">
                            <button className="btn-secundario" onClick={() => setAbierta(null)} disabled={enviando}>
                                Cancelar
                            </button>
                            <button className="btn-primario" onClick={responder} disabled={enviando}>
                                {enviando ? "Enviando…" : "Enviar respuesta"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Reclamaciones;
