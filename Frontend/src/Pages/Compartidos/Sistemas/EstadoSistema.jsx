import { useState, useEffect, useRef } from "react";
import "./EstadoSistema.css";
import { apiFetch, apiBlob, usuarioActual } from "../../../Services/api.js";
import { useToast, Toasts } from "../../../Components/Toast.jsx";
import { guardarArchivo, avisarGuardado, CARPETAS } from "../../../Utils/descargas.js";

/** Cada cuánto se vuelve a revisar todo y cada cuánto se mide la conexión. */
const CADA_DIAGNOSTICO = 60_000;
const CADA_PING        = 8_000;
const MEDICIONES       = 20;        // las últimas, para el gráfico

const SEMAFORO = {
    OK:          { luz: "verde",   titulo: "Todo en orden",        icono: "ti-circle-check" },
    ADVERTENCIA: { luz: "ambar",   titulo: "Atención",             icono: "ti-alert-triangle" },
    CRITICO:     { luz: "rojo",    titulo: "Problemas detectados", icono: "ti-alert-octagon" },
    SIN_DATOS:   { luz: "gris",    titulo: "Verificando…",         icono: "ti-loader-2" },
};

const CRITICIDAD = { ALTA: "Crítico", MEDIA: "Importante", BAJA: "Menor" };

/** La conexión se juzga por el tiempo de respuesta, no por "hay internet" o no. */
function calidadConexion(ms, fallos) {
    if (fallos >= 2) return { luz: "rojo",  texto: "Sin conexión con el sistema" };
    if (ms == null)  return { luz: "gris",  texto: "Midiendo…" };
    if (ms < 400)    return { luz: "verde", texto: "Estable" };
    if (ms < 1200)   return { luz: "ambar", texto: "Lenta" };
    return { luz: "rojo", texto: "Muy lenta" };
}

function EstadoSistema() {
    const usuario = usuarioActual();
    const puedeRespaldar = usuario?.rol === "ADMIN" || usuario?.rol === "SUPERVISOR";
    const { toasts, mostrarToast } = useToast();

    const [diag, setDiag]         = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError]       = useState(null);

    const [latencias, setLatencias] = useState([]);   // últimos tiempos de respuesta
    const [fallos, setFallos]       = useState(0);
    const fallosRef = useRef(0);

    const [respaldando, setRespaldando] = useState(false);
    const [reportando, setReportando]   = useState(false);

    // ── Verificación completa ──
    const verificar = async (silencioso = false) => {
        if (!silencioso) setCargando(true);
        try {
            setDiag(await apiFetch("/api/diagnostico"));
            setError(null);
        } catch (e) {
            setError(e.message);
        } finally { setCargando(false); }
    };

    useEffect(() => {
        verificar();
        const t = setInterval(() => verificar(true), CADA_DIAGNOSTICO);
        return () => clearInterval(t);
    }, []);

    // ── Medición de la conexión ──
    // Se mide el viaje de ida y vuelta a una respuesta mínima del servidor: es lo que
    // de verdad siente el usuario al guardar una venta.
    useEffect(() => {
        let vivo = true;
        const medir = async () => {
            const inicio = performance.now();
            try {
                await apiFetch("/api/diagnostico/ping");
                if (!vivo) return;
                fallosRef.current = 0;
                setFallos(0);
                setLatencias(prev => [...prev, Math.round(performance.now() - inicio)].slice(-MEDICIONES));
            } catch {
                if (!vivo) return;
                fallosRef.current += 1;
                setFallos(fallosRef.current);
                setLatencias(prev => [...prev, null].slice(-MEDICIONES));
            }
        };
        medir();
        const t = setInterval(medir, CADA_PING);
        return () => { vivo = false; clearInterval(t); };
    }, []);

    const validas   = latencias.filter(l => l != null);
    const ultima    = validas.length ? validas[validas.length - 1] : null;
    const promedio  = validas.length ? Math.round(validas.reduce((a, b) => a + b, 0) / validas.length) : null;
    const conexion  = calidadConexion(ultima, fallos);

    const estado    = diag?.estadoGeneral || "SIN_DATOS";
    const semaforo  = SEMAFORO[estado] || SEMAFORO.SIN_DATOS;
    const problemas = (diag?.chequeos || []).filter(c => c.estado !== "OK");

    // ── Avisar a soporte con el diagnóstico ya escrito ──
    const avisarSoporte = async () => {
        if (problemas.length === 0) return;
        setReportando(true);
        try {
            const detalle = [
                `Verificación del sistema (${diag.verificadoEn?.replace("T", " ").slice(0, 16)})`,
                `Estado general: ${estado}`,
                `Conexión: ${conexion.texto}${ultima != null ? ` (${ultima} ms)` : ""}`,
                "",
                ...problemas.map(c => `• [${CRITICIDAD[c.criticidad]}] ${c.nombre}: ${c.mensaje}`),
            ].join("\n");

            await apiFetch("/api/soporte", {
                method: "POST",
                body: JSON.stringify({
                    severidad: estado === "CRITICO" ? "ERROR" : "WARNING",
                    asunto: `Verificación del sistema: ${problemas.length} problema(s) detectado(s)`,
                    detalle
                })
            });
            mostrarToast("success", "Soporte fue avisado con el detalle de la verificación");
        } catch (e) {
            mostrarToast("error", e.message);
        } finally { setReportando(false); }
    };

    // ── Respaldo ──
    const descargarRespaldo = async () => {
        setRespaldando(true);
        try {
            const blob = await apiBlob("/api/diagnostico/respaldo");
            const nombre = `respaldo-rayza-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.zip`;
            const enCarpeta = await guardarArchivo(blob, nombre, CARPETAS.RESPALDOS);
            avisarGuardado(mostrarToast, enCarpeta, "Respaldo", CARPETAS.RESPALDOS);
        } catch (e) {
            mostrarToast("error", e.message);
        } finally { setRespaldando(false); }
    };

    return (
        <div className="estado-page">

            <div className="estado-header">
                <div>
                    <h2>Estado del sistema</h2>
                    <p>Verificación en tiempo real de todo lo que el sistema necesita para trabajar</p>
                </div>
                <button className="btn-secundario" onClick={() => verificar()} disabled={cargando}>
                    <i className={`ti ti-refresh ${cargando ? "spin" : ""}`}></i> Verificar ahora
                </button>
            </div>

            {error && (
                <div className="estado-error">
                    <i className="ti ti-alert-octagon"></i>
                    No se pudo verificar el sistema: {error}
                </div>
            )}

            {/* SEMÁFORO + CONEXIÓN */}
            <div className="estado-cabecera">
                <div className={`semaforo-card luz-${semaforo.luz}`}>
                    <div className="semaforo">
                        <span className={`luz roja ${semaforo.luz === "rojo" ? "on" : ""}`}></span>
                        <span className={`luz ambar ${semaforo.luz === "ambar" ? "on" : ""}`}></span>
                        <span className={`luz verde ${semaforo.luz === "verde" ? "on" : ""}`}></span>
                    </div>
                    <div className="semaforo-texto">
                        <p className="semaforo-titulo">
                            <i className={`ti ${semaforo.icono}`}></i> {semaforo.titulo}
                        </p>
                        <p className="semaforo-detalle">{diag?.mensajeGeneral || "Revisando el sistema…"}</p>
                        {diag && (
                            <p className="semaforo-hora">
                                Última verificación: {diag.verificadoEn?.replace("T", " ").slice(0, 19)}
                            </p>
                        )}
                    </div>
                </div>

                <div className="conexion-card">
                    <p className="tarjeta-titulo"><i className="ti ti-wifi"></i> Conexión</p>
                    <div className="conexion-estado">
                        <span className={`punto luz-${conexion.luz}`}></span>
                        <strong>{conexion.texto}</strong>
                    </div>
                    <div className="conexion-datos">
                        <span>Ahora <strong>{ultima != null ? `${ultima} ms` : "—"}</strong></span>
                        <span>Promedio <strong>{promedio != null ? `${promedio} ms` : "—"}</strong></span>
                    </div>
                    {/* Cada barra es una medición; las cortadas son intentos sin respuesta */}
                    <div className="conexion-grafico">
                        {latencias.map((l, i) => (
                            <span key={i}
                                  className={`barra-ping ${l == null ? "sin" : l < 400 ? "ok" : l < 1200 ? "media" : "alta"}`}
                                  style={{ height: `${l == null ? 100 : Math.min(100, 10 + l / 15)}%` }}
                                  title={l == null ? "Sin respuesta" : `${l} ms`} />
                        ))}
                    </div>
                    <p className="conexion-nota">Se mide cada {CADA_PING / 1000} segundos</p>
                </div>
            </div>

            {/* RESUMEN */}
            {diag && (
                <div className="estado-resumen">
                    <div className="resumen-item ok">
                        <strong>{diag.resumen.ok}</strong><span>funcionando</span>
                    </div>
                    <div className="resumen-item adv">
                        <strong>{diag.resumen.advertencias}</strong><span>por revisar</span>
                    </div>
                    <div className="resumen-item crit">
                        <strong>{diag.resumen.criticos}</strong><span>críticos</span>
                    </div>
                    {problemas.length > 0 && (
                        <button className="btn-soporte" onClick={avisarSoporte} disabled={reportando}>
                            <i className="ti ti-lifebuoy"></i>
                            {reportando ? "Avisando…" : "Avisar a soporte"}
                        </button>
                    )}
                </div>
            )}

            {/* REVISIONES */}
            <div className="chequeos-lista">
                {(diag?.chequeos || []).map(c => (
                    <div key={c.clave} className={`chequeo chequeo-${c.estado.toLowerCase()}`}>
                        <div className="chequeo-luz"></div>
                        <div className="chequeo-cuerpo">
                            <div className="chequeo-cabecera">
                                <strong>{c.nombre}</strong>
                                {c.estado !== "OK" && (
                                    <span className={`badge-criticidad crit-${c.criticidad.toLowerCase()}`}>
                                        {CRITICIDAD[c.criticidad]}
                                    </span>
                                )}
                                {c.milisegundos != null && (
                                    <span className="chequeo-ms">{c.milisegundos} ms</span>
                                )}
                            </div>
                            <p className="chequeo-mensaje">{c.mensaje}</p>
                            {c.recomendacion && (
                                <p className="chequeo-recomendacion">
                                    <i className="ti ti-bulb"></i> {c.recomendacion}
                                </p>
                            )}
                        </div>
                    </div>
                ))}
                {!diag && !error && <div className="chequeo-cargando">Revisando el sistema…</div>}
            </div>

            {/* RESPALDO (administración) */}
            {puedeRespaldar && (
                <div className="respaldo-card">
                    <div>
                        <p className="tarjeta-titulo"><i className="ti ti-database-export"></i> Respaldo de datos</p>
                        <p className="respaldo-texto">
                            Descarga una copia de toda la información del sistema —pasajes, encomiendas,
                            comprobantes, caja— en un ZIP con un archivo por tabla, que se abre con Excel.
                            Es la copia de la empresa: guárdala en un lugar seguro, porque contiene datos
                            personales de los pasajeros. Las contraseñas y las claves de recojo no se
                            incluyen.
                        </p>
                    </div>
                    <button className="btn-primario" onClick={descargarRespaldo} disabled={respaldando}>
                        <i className={`ti ${respaldando ? "ti-loader-2 spin" : "ti-download"}`}></i>
                        {respaldando ? "Preparando…" : "Descargar respaldo"}
                    </button>
                </div>
            )}

            <Toasts toasts={toasts} />
        </div>
    );
}

export default EstadoSistema;
