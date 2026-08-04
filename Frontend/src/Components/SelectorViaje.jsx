import { useState, useMemo, useRef, useEffect } from "react";
import "./SelectorViaje.css";

/**
 * Selector de viaje pensado para que no se confundan: en vez de un combo con el
 * código técnico primero, muestra tarjetas agrupadas por día donde lo que se lee
 * primero es la RUTA y la HORA. El código queda como dato secundario.
 *
 * Props: viajes, value (id), onChange(id), placeholder, cargando
 */
export default function SelectorViaje({ viajes = [], value, onChange, placeholder = "Seleccionar viaje...", cargando = false }) {
    const [abierto, setAbierto] = useState(false);
    const [busqueda, setBusqueda] = useState("");
    const cajaRef = useRef(null);

    // Cierra al hacer clic fuera
    useEffect(() => {
        const fuera = (e) => { if (cajaRef.current && !cajaRef.current.contains(e.target)) setAbierto(false); };
        document.addEventListener("mousedown", fuera);
        return () => document.removeEventListener("mousedown", fuera);
    }, []);

    const seleccionado = viajes.find(v => v.id === value);

    const filtrados = useMemo(() => {
        const q = busqueda.trim().toLowerCase();
        if (!q) return viajes;
        return viajes.filter(v =>
            (v.rutaNombre || "").toLowerCase().includes(q) ||
            (v.codigoViaje || "").toLowerCase().includes(q) ||
            (v.fechaSalida || "").includes(q) ||
            (v.embarcacionNombre || "").toLowerCase().includes(q)
        );
    }, [viajes, busqueda]);

    // Agrupados por fecha, del más próximo al más lejano
    const grupos = useMemo(() => {
        const m = new Map();
        [...filtrados]
            .sort((a, b) => (a.fechaSalida + a.horaSalida).localeCompare(b.fechaSalida + b.horaSalida))
            .forEach(v => {
                const k = v.fechaSalida || "sin-fecha";
                if (!m.has(k)) m.set(k, []);
                m.get(k).push(v);
            });
        return [...m.entries()];
    }, [filtrados]);

    const hoyISO = new Date().toLocaleDateString("en-CA");
    const mananaISO = new Date(Date.now() + 86400000).toLocaleDateString("en-CA");

    const etiquetaFecha = (iso) => {
        if (iso === "sin-fecha") return "Sin fecha";
        if (iso === hoyISO) return "Hoy";
        if (iso === mananaISO) return "Mañana";
        const [a, m, d] = iso.split("-").map(Number);
        const f = new Date(a, m - 1, d);
        const txt = f.toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" });
        return txt.charAt(0).toUpperCase() + txt.slice(1);
    };

    const hhmm = (h) => (h || "").slice(0, 5);

    const elegir = (v) => { onChange(v.id); setAbierto(false); setBusqueda(""); };

    return (
        <div className="selviaje" ref={cajaRef}>
            <button type="button" className={`selviaje-trigger ${abierto ? "abierto" : ""}`}
                    onClick={() => setAbierto(a => !a)} disabled={cargando}>
                {seleccionado ? (
                    <span className="selviaje-elegido">
                        <span className="selviaje-ruta"><i className="ti ti-ship"></i> {seleccionado.rutaNombre}</span>
                        <span className="selviaje-meta">
                            {etiquetaFecha(seleccionado.fechaSalida)} · {hhmm(seleccionado.horaSalida)}
                            <span className="selviaje-cod">{seleccionado.codigoViaje}</span>
                        </span>
                    </span>
                ) : (
                    <span className="selviaje-placeholder">
                        {cargando ? "Cargando viajes..." : placeholder}
                    </span>
                )}
                <i className={`ti ti-chevron-${abierto ? "up" : "down"} selviaje-flecha`}></i>
            </button>

            {abierto && (
                <div className="selviaje-panel">
                    <div className="selviaje-buscar">
                        <i className="ti ti-search"></i>
                        <input autoFocus type="text" placeholder="Buscar por ruta, fecha o código..."
                               value={busqueda} onChange={e => setBusqueda(e.target.value)} />
                    </div>

                    <div className="selviaje-lista">
                        {grupos.length === 0 && (
                            <p className="selviaje-vacio"><i className="ti ti-ship-off"></i> No hay viajes que coincidan</p>
                        )}
                        {grupos.map(([fecha, items]) => (
                            <div key={fecha} className="selviaje-grupo">
                                <p className="selviaje-fecha">
                                    <i className="ti ti-calendar"></i> {etiquetaFecha(fecha)}
                                    <span className="selviaje-conteo">{items.length}</span>
                                </p>
                                {items.map(v => (
                                    <button type="button" key={v.id}
                                            className={`selviaje-item ${v.id === value ? "activo" : ""}`}
                                            onClick={() => elegir(v)}>
                                        <span className="selviaje-hora">{hhmm(v.horaSalida)}</span>
                                        <span className="selviaje-info">
                                            <strong>{v.rutaNombre}</strong>
                                            <span className="selviaje-sub">
                                                {v.embarcacionNombre ? `${v.embarcacionNombre} · ` : ""}{v.codigoViaje}
                                            </span>
                                        </span>
                                        {v.id === value && <i className="ti ti-check selviaje-check"></i>}
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
