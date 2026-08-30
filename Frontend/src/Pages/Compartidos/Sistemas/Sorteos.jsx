import { useState, useEffect, useRef } from "react";
import "../Ventas/Pasajes.css";
import "./ModalSimple.css";
import "./Sorteos.css";
import { apiFetch, usuarioActual } from "../../../Services/api.js";
import { useToast, Toasts } from "../../../Components/Toast.jsx";

/**
 * Sorteos promocionales.
 *
 * Ejecutar es irreversible: elige al ganador en el servidor y lo deja grabado.
 * Por eso pide confirmación escribiendo, y el botón solo aparece cuando el
 * registro ya está cerrado — sortear con gente aún registrándose sería injusto
 * para quien llegó tarde.
 */

const VACIO = { nombre: "", premio: "", premioValor: "", fechaSorteo: "", basesUrl: "" };

const VUELTAS = 6;              // vueltas completas antes de frenar
const DURACION_GIRO = 5200;     // ms; el mismo que ve el público en la web

const fmt = (iso) => (iso ? iso.replace("T", " ").slice(0, 16) : "—");

function Sorteos() {
    const { toasts, mostrarToast } = useToast();
    const esAdmin = usuarioActual()?.rol === "ADMIN";

    const [sorteos, setSorteos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [form, setForm] = useState(VACIO);
    const [creando, setCreando] = useState(false);
    const [confirmando, setConfirmando] = useState(null);
    const [textoConfirma, setTextoConfirma] = useState("");
    // Lo que se está transmitiendo: el operador ve la misma ruleta que el
    // público, y con el mismo tiempo, para poder anunciarlo a la vez.
    const [envivo, setEnVivo] = useState(null);

    useEffect(() => { cargar(); }, []);

    const cargar = async () => {
        setCargando(true);
        try { setSorteos(await apiFetch("/api/sorteos")); }
        catch (e) { mostrarToast("error", e.message || "No se pudieron cargar los sorteos"); }
        finally { setCargando(false); }
    };

    const cambiar = (c) => (e) => setForm((f) => ({ ...f, [c]: e.target.value }));

    const crear = async (e) => {
        e.preventDefault();
        setCreando(true);
        try {
            await apiFetch("/api/sorteos", { method: "POST", body: JSON.stringify(form) });
            mostrarToast("success", "Sorteo creado. Los pasajes que se vendan desde ahora llevarán su código.");
            setForm(VACIO);
            cargar();
        } catch (err) {
            mostrarToast("error", err.message);
        } finally { setCreando(false); }
    };

    const cerrar = async (s) => {
        if (!confirm(`Cerrar el registro de "${s.nombre}"?\n\nDespués de esto nadie más podrá registrar su código.`)) return;
        try {
            await apiFetch(`/api/sorteos/${s.id}/cerrar`, { method: "PATCH" });
            mostrarToast("success", "Registro cerrado. Ya puedes ejecutar el sorteo.");
            cargar();
        } catch (e) { mostrarToast("error", e.message); }
    };

    const ejecutar = async () => {
        const s = confirmando;
        setConfirmando(null);
        setTextoConfirma("");
        // La ruleta arranca antes de tener la respuesta: en la web pública gira
        // desde que el servidor emite el ganador, y si acá esperáramos la
        // respuesta, el panel iría siempre unos segundos por detrás.
        const arranque = Date.now();
        setEnVivo({ sorteo: s, ganador: null });

        try {
            const r = await apiFetch(`/api/sorteos/${s.id}/ejecutar`, { method: "POST" });
            const falta = Math.max(0, DURACION_GIRO - (Date.now() - arranque));
            setTimeout(() => {
                setEnVivo({ sorteo: s, ganador: r });
                cargar();
            }, falta);
        } catch (e) {
            setEnVivo(null);
            mostrarToast("error", e.message);
        }
    };

    const hayAbierto = sorteos.some((s) => s.estado === "ABIERTO");

    return (
        <div className="pasajes-page">
            <Toasts toasts={toasts} />

            <div className="pasajes-header">
                <div>
                    <h2>Sorteos</h2>
                    <p className="muted">
                        Cada pasaje vendido genera un código en el ticket. El asiento VIP vale doble.
                    </p>
                </div>
                <button className="btn-secundario" onClick={cargar} disabled={cargando}>
                    {cargando ? "Cargando…" : "Actualizar"}
                </button>
            </div>

            {/* Un sorteo en Perú necesita autorización y bases publicadas. Va acá
                arriba porque es lo que puede traer una sanción, no un detalle. */}
            <div className="sorteo-legal">
                <strong>Antes de abrir un sorteo:</strong> en Perú se necesita autorización y bases
                publicadas (organizador con RUC, premio y su valor, fecha y hora exactas, y la mecánica).
                Consúltalo con tu asesor legal — hacerlo sin eso puede traer sanciones de INDECOPI.
            </div>

            {esAdmin && !hayAbierto && (
                <form className="sorteo-nuevo" onSubmit={crear}>
                    <h3>Nuevo sorteo</h3>
                    <div className="sorteo-grid">
                        <label className="campo-s">
                            <span>Nombre</span>
                            <input value={form.nombre} onChange={cambiar("nombre")} required
                                   placeholder="Ej. Sorteo Fiestas Patrias" />
                        </label>
                        <label className="campo-s">
                            <span>Premio</span>
                            <input value={form.premio} onChange={cambiar("premio")} required
                                   placeholder="Ej. Un pasaje gratis a cualquier destino" />
                        </label>
                        <label className="campo-s">
                            <span>Valor del premio (S/)</span>
                            <input type="number" step="0.01" value={form.premioValor}
                                   onChange={cambiar("premioValor")} placeholder="120.00" />
                            <small>Las bases lo exigen.</small>
                        </label>
                        <label className="campo-s">
                            <span>Fecha y hora del sorteo</span>
                            <input type="datetime-local" value={form.fechaSorteo} onChange={cambiar("fechaSorteo")} />
                        </label>
                        <label className="campo-s ancho">
                            <span>Enlace a las bases (opcional)</span>
                            <input value={form.basesUrl} onChange={cambiar("basesUrl")}
                                   placeholder="https://…" />
                        </label>
                    </div>
                    <button className="btn-primario" disabled={creando}>
                        {creando ? "Creando…" : "Abrir sorteo"}
                    </button>
                </form>
            )}

            {hayAbierto && esAdmin && (
                <p className="muted" style={{ marginBottom: 14 }}>
                    Ya hay un sorteo abierto. Ciérralo antes de crear otro: con dos abiertos, un
                    pasaje no sabría a cuál pertenece su código.
                </p>
            )}

            {cargando ? <p className="muted">Cargando…</p>
             : sorteos.length === 0 ? <p className="muted">Todavía no hay sorteos.</p>
             : (
                <div className="sorteo-lista">
                    {sorteos.map((s) => (
                        <article key={s.id} className="sorteo-tarjeta">
                            <header>
                                <div>
                                    <h3>{s.nombre}</h3>
                                    <p className="muted">{s.premio}</p>
                                </div>
                                <span className={`badge estado-${s.estado.toLowerCase()}`}>{s.estado}</span>
                            </header>

                            <div className="sorteo-cifras">
                                <div><strong>{s.cupones}</strong><span>códigos emitidos</span></div>
                                <div><strong>{s.participantes}</strong><span>registrados</span></div>
                                {s.estado !== "SORTEADO" && (
                                    <div><strong>{s.viendoAhora}</strong><span>viendo ahora</span></div>
                                )}
                            </div>

                            {s.fechaSorteo && <p className="muted">Anunciado para el {fmt(s.fechaSorteo)}</p>}

                            {s.estado === "SORTEADO" ? (
                                <div className="sorteo-ganador-caja">
                                    <span className="rec-etiqueta">Ganador · {fmt(s.sorteadoAt)}</span>
                                    <p><strong>{s.ganadorNombreCompleto}</strong> · {s.ganadorDocumento}</p>
                                    <p className="muted">
                                        Código {s.ganadorCodigo} · {s.ganadorEmail}
                                        {s.ganadorTelefono ? ` · ${s.ganadorTelefono}` : ""}
                                    </p>
                                    <p className="muted" style={{ fontSize: 12 }}>
                                        Sorteado entre {s.participantes} participantes por {s.sorteadoPor}.
                                    </p>
                                </div>
                            ) : (
                                <div className="sorteo-acciones">
                                    {s.estado === "ABIERTO" && (
                                        <button className="btn-secundario" onClick={() => cerrar(s)}>
                                            Cerrar registro
                                        </button>
                                    )}
                                    {/* Solo con el registro cerrado: sortear mientras la gente
                                        aún se registra dejaría fuera a quien llegó tarde. */}
                                    {s.estado === "CERRADO" && esAdmin && (
                                        <button className="btn-primario" onClick={() => setConfirmando(s)}>
                                            Ejecutar el sorteo
                                        </button>
                                    )}
                                </div>
                            )}
                        </article>
                    ))}
                </div>
            )}

            {envivo && (
                <div className="modal-overlay">
                    <div className="modal sorteo-vivo">
                        <h3>{envivo.ganador ? "Tenemos ganador" : "Sorteando…"}</h3>
                        <p className="muted">
                            Esto mismo se está viendo en la página del sorteo.
                        </p>

                        <RuletaPanel girando={!envivo.ganador} ganador={envivo.ganador} />

                        {envivo.ganador && (
                            <div className="sorteo-ganador-caja">
                                <span className="rec-etiqueta">Cómo ubicarlo</span>
                                <p><strong>{envivo.ganador.ganadorNombreCompleto}</strong> · {envivo.ganador.ganadorDocumento}</p>
                                <p className="muted">
                                    {envivo.ganador.ganadorEmail}
                                    {envivo.ganador.ganadorTelefono ? ` · ${envivo.ganador.ganadorTelefono}` : ""}
                                </p>
                            </div>
                        )}

                        <div className="modal-acciones">
                            <button className="btn-primario" onClick={() => setEnVivo(null)}
                                    disabled={!envivo.ganador}>
                                {envivo.ganador ? "Listo" : "Sorteando…"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {confirmando && (
                <div className="modal-overlay" onClick={() => setConfirmando(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Ejecutar el sorteo</h3>
                        <p>
                            Se elegirá al ganador entre <strong>{confirmando.participantes}</strong> participantes.
                        </p>
                        {/* Es irreversible y hay un premio de por medio: conviene que
                            cueste un poco más que un clic distraído. */}
                        <p className="muted">
                            <strong>Esto no se puede deshacer</strong> ni repetir. Quien esté viendo la
                            página lo verá en vivo.
                        </p>
                        <label className="campo-s" style={{ marginTop: 12 }}>
                            <span>Escribe SORTEAR para confirmar</span>
                            <input value={textoConfirma} autoFocus
                                   onChange={(e) => setTextoConfirma(e.target.value.toUpperCase())} />
                        </label>
                        <div className="modal-acciones">
                            <button className="btn-secundario" onClick={() => setConfirmando(null)}>Cancelar</button>
                            <button className="btn-primario" onClick={ejecutar}
                                    disabled={textoConfirma !== "SORTEAR"}>
                                Sortear ahora
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * La ruleta del panel.
 *
 * Es la misma animación de la web, para que el operador vea lo que ve el
 * público. No elige nada: el ganador ya vino del servidor.
 */
function RuletaPanel({ girando, ganador }) {
    const [angulo, setAngulo] = useState(0);
    const giroPrevio = useRef(0);

    useEffect(() => {
        if (!girando) return;
        giroPrevio.current += 360 * VUELTAS + Math.floor(Math.random() * 360);
        setAngulo(giroPrevio.current);
    }, [girando]);

    return (
        <div className="ruleta-caja">
            <div className="ruleta-aguja" aria-hidden="true" />
            <div className="ruleta" aria-hidden="true"
                 style={{ transform: `rotate(${angulo}deg)`,
                          transitionDuration: girando ? `${DURACION_GIRO}ms` : "0ms" }} />
            <div className="ruleta-centro" role="status" aria-live="polite">
                {ganador ? (
                    <>
                        <span className="ruleta-eti">Ganador</span>
                        <strong className="ruleta-nombre">
                            {ganador.ganadorNombre || ganador.ganadorNombreCompleto}
                        </strong>
                        <span className="ruleta-codigo">{ganador.ganadorCodigo}</span>
                    </>
                ) : (
                    <span className="ruleta-eti">Sorteando…</span>
                )}
            </div>
        </div>
    );
}

export default Sorteos;
