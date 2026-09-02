import { useState, useEffect } from "react";
import Ruleta from "../../../Components/RuletaSorteo.jsx";
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

const VACIO = {
    nombre: "", fechaSorteo: "", basesUrl: "",
    // El primero es el premio mayor: se sortea al final, que es cuando la gente
    // está mirando.
    premios: [{ descripcion: "", valor: "" }],
    // Dejarlo preparado en vez de abrirlo: sirve para tener el siguiente listo
    // mientras el actual sigue corriendo.
    preparado: false,
};

const VUELTAS = 6;              // vueltas completas antes de frenar
const DURACION_GIRO = 15000;    // ms; el mismo que ve el público en la web

const fmt = (iso) => (iso ? iso.replace("T", " ").slice(0, 16) : "—");

/** Los participantes del sorteo. Es un endpoint público: no lleva sesión. */
async function cargarParticipantes(sorteoId) {
    const base = import.meta.env.VITE_API_URL || "http://localhost:8080";
    const r = await fetch(`${base}/api/public/sorteo/${sorteoId}/participantes`);
    return r.ok ? r.json() : [];
}

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
    // Los participantes del sorteo que se transmite: son los nombres de la rueda.
    const [gente, setGente] = useState([]);

    useEffect(() => { cargar(); }, []);

    const cargar = async () => {
        setCargando(true);
        try { setSorteos(await apiFetch("/api/sorteos")); }
        catch (e) { mostrarToast("error", e.message || "No se pudieron cargar los sorteos"); }
        finally { setCargando(false); }
    };

    const cambiar = (c) => (e) => setForm((f) => ({ ...f, [c]: e.target.value }));

    const cambiarPremio = (i, campo, valor) => setForm((f) => ({
        ...f,
        premios: f.premios.map((p, j) => (j === i ? { ...p, [campo]: valor } : p)),
    }));
    const agregarPremio = () => setForm((f) => ({ ...f, premios: [...f.premios, { descripcion: "", valor: "" }] }));
    const quitarPremio = (i) => setForm((f) => ({ ...f, premios: f.premios.filter((_, j) => j !== i) }));

    const crear = async (e) => {
        e.preventDefault();
        setCreando(true);
        try {
            const preparado = form.preparado || hayAbierto;
            const premios = form.premios.filter(p => p.descripcion.trim());
            if (premios.length === 0) throw new Error("Escribe al menos un premio");
            await apiFetch("/api/sorteos", {
                method: "POST",
                body: JSON.stringify({ ...form, preparado, premios, premio: premios[0].descripcion }),
            });
            mostrarToast("success", preparado
                ? "Sorteo preparado. No recibe códigos ni sale en la web hasta que lo abras."
                : "Sorteo creado. Los pasajes que se vendan desde ahora llevarán su código.");
            setForm(VACIO);
            cargar();
        } catch (err) {
            mostrarToast("error", err.message);
        } finally { setCreando(false); }
    };

    /**
     * Emite los códigos que hayan quedado sin generar.
     *
     * Está a la vista porque el operador no tiene cómo saber que a un pasaje le
     * faltó el suyo: lo descubre cuando el cliente reclama que su ticket salió
     * sin código.
     */
    const emitirFaltantes = async (s) => {
        try {
            const r = await apiFetch(`/api/sorteos/${s.id}/emitir-faltantes`, { method: "POST" });
            mostrarToast(r.emitidos > 0 ? "success" : "info", r.message);
            cargar();
        } catch (e) { mostrarToast("error", e.message); }
    };

    const abrir = async (s) => {
        if (!confirm(`¿Abrir "${s.nombre}"?\n\nDesde ahora cada pasaje vendido llevará su código impreso, y el sorteo aparecerá en la web.`)) return;
        try {
            await apiFetch(`/api/sorteos/${s.id}/abrir`, { method: "PATCH" });
            mostrarToast("success", "Sorteo abierto. Los pasajes que se vendan desde ahora llevarán su código.");
            cargar();
        } catch (e) { mostrarToast("error", e.message); }
    };

    const cerrar = async (s) => {
        if (!confirm(`Cerrar el registro de "${s.nombre}"?\n\nDespués de esto nadie más podrá registrar su código.`)) return;
        try {
            await apiFetch(`/api/sorteos/${s.id}/cerrar`, { method: "PATCH" });
            mostrarToast("success", "Registro cerrado. Ya puedes ejecutar el sorteo.");
            cargar();
        } catch (e) { mostrarToast("error", e.message); }
    };

    const ejecutar = async (sorteo) => {
        const s = sorteo || confirmando;
        setConfirmando(null);
        setTextoConfirma("");
        // La ruleta arranca antes de tener la respuesta: en la web pública gira
        // desde que el servidor emite el ganador, y si acá esperáramos la
        // respuesta, el panel iría siempre unos segundos por detrás.
        const arranque = Date.now();
        setEnVivo((v) => ({ sorteo: s, ganador: null, destino: null,
                            entregados: v?.entregados || [] }));
        // La lista es pública y no necesita sesión: es la misma que pinta la web.
        cargarParticipantes(s.id).then(setGente).catch(() => setGente([]));

        try {
            const r = await apiFetch(`/api/sorteos/${s.id}/ejecutar`, { method: "POST" });
            // El destino se sabe apenas responde el servidor: la rueda necesita
            // saber DÓNDE frenar aunque el nombre se muestre recién al final.
            const p = r.premioSorteado || {};
            const premiado = { codigo: p.ganadorCodigo, nombre: p.ganadorNombre };
            setEnVivo((v) => ({ ...v, destino: premiado }));

            const falta = Math.max(0, DURACION_GIRO - (Date.now() - arranque));
            setTimeout(() => {
                setEnVivo((v) => ({
                    ...v,
                    ganador: p,
                    destino: premiado,
                    quedan: r.quedanPremios,
                    // Se van apilando: al terminar se ve la lista completa de
                    // quién ganó qué, que es lo que hay que anunciar y entregar.
                    entregados: [...(v.entregados || []), p],
                }));
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

            {esAdmin && (
                <form className="sorteo-nuevo" onSubmit={crear}>
                    <h3>Nuevo sorteo</h3>
                    <div className="sorteo-grid">
                        <label className="campo-s">
                            <span>Nombre</span>
                            <input value={form.nombre} onChange={cambiar("nombre")} required
                                   placeholder="Ej. Sorteo Fiestas Patrias" />
                        </label>
                        <div className="campo-s ancho">
                            <span>Premios</span>
                            {/* Uno o varios. Con varios, la rueda gira una vez por
                                premio y empieza por el último: el grande se anuncia
                                al final. Nadie se lleva dos. */}
                            {form.premios.map((p, i) => (
                                <div className="premio-fila" key={i}>
                                    <span className="premio-puesto">{i + 1}°</span>
                                    <input value={p.descripcion} placeholder="Ej. Un pasaje gratis a cualquier destino"
                                           onChange={e => cambiarPremio(i, "descripcion", e.target.value)} />
                                    <input type="number" step="0.01" value={p.valor} placeholder="Valor S/"
                                           className="premio-valor"
                                           onChange={e => cambiarPremio(i, "valor", e.target.value)} />
                                    {form.premios.length > 1 && (
                                        <button type="button" className="premio-quitar" title="Quitar este premio"
                                                onClick={() => quitarPremio(i)}>
                                            <i className="ti ti-x"></i>
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button type="button" className="premio-agregar" onClick={agregarPremio}>
                                <i className="ti ti-plus"></i> Agregar otro premio
                            </button>
                            <small>El valor de cada uno lo exigen las bases.</small>
                        </div>
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
                    {/* Con uno abierto solo se puede preparar el siguiente: dos abiertos
                        dejarían al pasaje sin saber a cuál pertenece su código. */}
                    <label className="check-preparado">
                        <input type="checkbox" checked={form.preparado || hayAbierto}
                               disabled={hayAbierto}
                               onChange={(e) => setForm((f) => ({ ...f, preparado: e.target.checked }))} />
                        <span>
                            Dejarlo preparado, sin abrir
                            <em>
                                {hayAbierto
                                    ? "Ya hay un sorteo abierto, así que este queda en borrador hasta que cierres el otro."
                                    : "No recibe códigos ni sale en la web hasta que lo abras."}
                            </em>
                        </span>
                    </label>

                    <button className="btn-primario" disabled={creando}>
                        {creando ? "Creando…" : (form.preparado || hayAbierto) ? "Preparar sorteo" : "Abrir sorteo"}
                    </button>
                </form>
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
                                <div>
                                    <strong>{s.cupones}</strong>
                                    <span>{s.cupones === 1 ? "código emitido" : "códigos emitidos"}</span>
                                </div>
                                <div><strong>{s.participantes}</strong><span>registrados</span></div>
                                {s.estado !== "SORTEADO" && (
                                    <div><strong>{s.viendoAhora}</strong><span>viendo ahora</span></div>
                                )}
                            </div>

                            {s.fechaSorteo && (
                                <p className="muted">
                                    Anunciado para el {fmt(s.fechaSorteo)}
                                    {s.estado === "ABIERTO" && " · el registro se cierra solo a esa hora"}
                                </p>
                            )}

                            {s.premios?.length > 1 && (
                                <ul className="premios-lista">
                                    {s.premios.map((p) => (
                                        <li key={p.orden}>
                                            <b>{p.orden}°</b> {p.descripcion}
                                            {p.sorteado
                                                ? <span className="premio-ganador"> — {p.ganadorNombreCompleto || p.ganadorNombre}</span>
                                                : <span className="muted"> — sin sortear</span>}
                                        </li>
                                    ))}
                                </ul>
                            )}

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
                                    {s.estado === "BORRADOR" && esAdmin && (
                                        <button className="btn-primario" onClick={() => abrir(s)}>
                                            Abrir sorteo
                                        </button>
                                    )}
                                    {s.estado === "ABIERTO" && (
                                        <>
                                            <button className="btn-secundario" onClick={() => emitirFaltantes(s)}>
                                                Emitir códigos faltantes
                                            </button>
                                            <button className="btn-secundario" onClick={() => cerrar(s)}>
                                                Cerrar registro
                                            </button>
                                        </>
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
                        <h3>
                            {envivo.ganador
                                ? `${envivo.ganador.orden}° premio: ${envivo.ganador.descripcion || ""}`
                                : "Sorteando…"}
                        </h3>
                        <p className="muted">
                            Esto mismo se está viendo en la página del sorteo.
                        </p>

                        <Ruleta
                            participantes={gente}
                            girando={!envivo.ganador}
                            destino={envivo.destino}
                            ganador={envivo.ganador
                                ? { codigo: envivo.ganador.ganadorCodigo, nombre: envivo.ganador.ganadorNombre }
                                : null}
                            duracion={DURACION_GIRO}
                            total={envivo.sorteo.participantes}
                        />

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

                        {/* Lo ya repartido, para cantarlo sin equivocarse. */}
                        {envivo.entregados?.length > 1 && (
                            <ul className="premios-entregados">
                                {envivo.entregados.map((p) => (
                                    <li key={p.orden}>
                                        <b>{p.orden}°</b> {p.descripcion} — {p.ganadorNombreCompleto}
                                    </li>
                                ))}
                            </ul>
                        )}

                        <div className="modal-acciones">
                            {envivo.ganador && envivo.quedan ? (
                                <button className="btn-primario" onClick={() => ejecutar(envivo.sorteo)}>
                                    <i className="ti ti-player-play"></i> Sortear el siguiente premio
                                </button>
                            ) : (
                                <button className="btn-primario" onClick={() => setEnVivo(null)}
                                        disabled={!envivo.ganador}>
                                    {envivo.ganador ? "Listo" : "Sorteando…"}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {confirmando && (
                <div className="modal-overlay" onClick={() => setConfirmando(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Ejecutar el sorteo</h3>
                        <p>
                            {confirmando.premios?.length > 1
                                ? <>Se repartirán <strong>{confirmando.premios.length} premios</strong> entre{" "}
                                   <strong>{confirmando.participantes}</strong> participantes, uno por giro y
                                   empezando por el último. Nadie se lleva dos.</>
                                : <>Se elegirá al ganador entre <strong>{confirmando.participantes}</strong> participantes.</>}
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
                            {/* Sin la flecha, React le pasaría el evento del clic como
                                si fuera el sorteo, y la llamada saldría con id vacío. */}
                            <button className="btn-primario" onClick={() => ejecutar()}
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

export default Sorteos;
