import { useState, useEffect, useMemo } from "react";
import "./Reportes.css";

const API = (import.meta.env.VITE_API_URL || "http://localhost:8080") + "/api";
const authHeaders = () => ({ "Authorization": `Bearer ${localStorage.getItem("token")}` });

const hoy = () => new Date().toISOString().slice(0, 10);
const haceDias = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
};

const TIPOS = [
    { key: "ventas",     label: "Ventas e Ingresos", icon: "ti-cash" },
    { key: "ocupacion",  label: "Ocupación de Viajes", icon: "ti-armchair" },
    { key: "rutas",      label: "Rutas más Vendidas", icon: "ti-route" },
    { key: "sucursales", label: "Sucursales", icon: "ti-building-store" },
    { key: "viajes",     label: "Estado de Viajes", icon: "ti-ship" },
];

function Reportes() {
    const [tipo, setTipo] = useState("ventas");

    const [ventas, setVentas]           = useState([]);
    const [viajes, setViajes]           = useState([]);
    const [sucursales, setSucursales]   = useState([]);
    const [embarcaciones, setEmbarcaciones] = useState([]);

    const [cargando, setCargando] = useState(true);
    const [error, setError]       = useState(null);

    const [desde, setDesde] = useState(haceDias(30));
    const [hasta, setHasta] = useState(hoy());

    useEffect(() => {
        const cargarTodo = async () => {
            setCargando(true);
            setError(null);
            try {
                const [rVentas, rViajes, rSucursales, rEmbarcaciones] = await Promise.all([
                    fetch(`${API}/ventas`, { headers: authHeaders() }),
                    fetch(`${API}/viajes`, { headers: authHeaders() }),
                    fetch(`${API}/sucursales`, { headers: authHeaders() }),
                    fetch(`${API}/embarcaciones`, { headers: authHeaders() }),
                ]);
                if (!rVentas.ok || !rViajes.ok) throw new Error("Error al cargar los datos de reportes");
                setVentas(await rVentas.json());
                setViajes(await rViajes.json());
                setSucursales(rSucursales.ok ? await rSucursales.json() : []);
                setEmbarcaciones(rEmbarcaciones.ok ? await rEmbarcaciones.json() : []);
            } catch (err) {
                setError(err.message);
            } finally {
                setCargando(false);
            }
        };
        cargarTodo();
    }, []);

    // ---------- Helpers ----------
    const enRango = (fecha) => fecha && fecha >= desde && fecha <= hasta;

    const viajesPorId = useMemo(() => {
        const m = new Map();
        viajes.forEach(v => m.set(v.id, v));
        return m;
    }, [viajes]);

    const capacidadPorNombre = useMemo(() => {
        const m = new Map();
        embarcaciones.forEach(e => m.set(e.nombre, e.capacidadTotal));
        return m;
    }, [embarcaciones]);

    // ---------- Reporte: VENTAS ----------
    const ventasFiltradas = useMemo(
        () => ventas.filter(v => enRango(v.fechaVenta) && v.estado !== "ANULADO"),
        [ventas, desde, hasta]
    );
    const ventasAnuladas = useMemo(
        () => ventas.filter(v => enRango(v.fechaVenta) && v.estado === "ANULADO"),
        [ventas, desde, hasta]
    );
    const ingresoTotal = ventasFiltradas.reduce((s, v) => s + (Number(v.precio) || 0), 0);
    const ticketPromedio = ventasFiltradas.length ? ingresoTotal / ventasFiltradas.length : 0;

    const ventasPorDia = useMemo(() => {
        const m = new Map();
        ventasFiltradas.forEach(v => {
            m.set(v.fechaVenta, (m.get(v.fechaVenta) || 0) + Number(v.precio || 0));
        });
        return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    }, [ventasFiltradas]);
    const maxVentaDia = Math.max(1, ...ventasPorDia.map(([, monto]) => monto));

    const ventasPorTipoComprobante = useMemo(() => {
        const m = new Map();
        ventasFiltradas.forEach(v => {
            const key = v.tipoComprobante || "N/D";
            m.set(key, (m.get(key) || 0) + 1);
        });
        return [...m.entries()];
    }, [ventasFiltradas]);

    // ---------- Reporte: OCUPACIÓN ----------
    const ocupacionViajes = useMemo(() => {
        return viajes
            .filter(v => enRango(v.fechaSalida))
            .map(v => {
                const vendidos = ventas.filter(ve => ve.viajeId === v.id && ve.estado !== "ANULADO").length;
                const capacidad = capacidadPorNombre.get(v.embarcacionNombre) || 0;
                const pct = capacidad ? Math.round((vendidos / capacidad) * 100) : 0;
                return { ...v, vendidos, capacidad, pct };
            })
            .sort((a, b) => (a.fechaSalida + a.horaSalida).localeCompare(b.fechaSalida + b.horaSalida));
    }, [viajes, ventas, capacidadPorNombre, desde, hasta]);

    // ---------- Reporte: RUTAS ----------
    const rankingRutas = useMemo(() => {
        const m = new Map();
        ventasFiltradas.forEach(v => {
            const viaje = viajesPorId.get(v.viajeId);
            const nombre = viaje?.rutaNombre || v.viajeDescripcion || "Sin ruta";
            const actual = m.get(nombre) || { nombre, pasajes: 0, ingreso: 0 };
            actual.pasajes += 1;
            actual.ingreso += Number(v.precio || 0);
            m.set(nombre, actual);
        });
        return [...m.values()].sort((a, b) => b.ingreso - a.ingreso);
    }, [ventasFiltradas, viajesPorId]);
    const maxIngresoRuta = Math.max(1, ...rankingRutas.map(r => r.ingreso));

    // ---------- Reporte: SUCURSALES ----------
    const rankingSucursales = useMemo(() => {
        const m = new Map();
        ventasFiltradas.forEach(v => {
            const viaje = viajesPorId.get(v.viajeId);
            const nombre = viaje?.sucursalNombre || "Sin sucursal";
            const actual = m.get(nombre) || { nombre, pasajes: 0, ingreso: 0 };
            actual.pasajes += 1;
            actual.ingreso += Number(v.precio || 0);
            m.set(nombre, actual);
        });
        sucursales.forEach(s => { if (!m.has(s.nombre)) m.set(s.nombre, { nombre: s.nombre, pasajes: 0, ingreso: 0 }); });
        return [...m.values()].sort((a, b) => b.ingreso - a.ingreso);
    }, [ventasFiltradas, viajesPorId, sucursales]);
    const maxIngresoSucursal = Math.max(1, ...rankingSucursales.map(s => s.ingreso));

    // ---------- Reporte: VIAJES POR ESTADO ----------
    const viajesEnRango = useMemo(() => viajes.filter(v => enRango(v.fechaSalida)), [viajes, desde, hasta]);
    const conteoEstados = useMemo(() => {
        const base = { PROGRAMADO: 0, EN_CURSO: 0, COMPLETADO: 0, CANCELADO: 0 };
        viajesEnRango.forEach(v => { base[v.estado] = (base[v.estado] || 0) + 1; });
        return base;
    }, [viajesEnRango]);

    // ---------- Exportar CSV ----------
    const exportarCSV = () => {
        let filas = [];
        const nombreArchivo = `reporte_${tipo}_${desde}_a_${hasta}.csv`;

        if (tipo === "ventas") {
            filas = [["Fecha", "Comprobante", "Pasajero", "Ruta", "Precio"]];
            ventasFiltradas.forEach(v => {
                const viaje = viajesPorId.get(v.viajeId);
                filas.push([v.fechaVenta, `${v.serieComprobante}-${v.numeroComprobante}`, v.pasajeroNombre, viaje?.rutaNombre || "", v.precio]);
            });
        } else if (tipo === "ocupacion") {
            filas = [["Código Viaje", "Ruta", "Fecha", "Hora", "Vendidos", "Capacidad", "% Ocupación"]];
            ocupacionViajes.forEach(v => {
                filas.push([v.codigoViaje, v.rutaNombre, v.fechaSalida, v.horaSalida, v.vendidos, v.capacidad, v.pct]);
            });
        } else if (tipo === "rutas") {
            filas = [["Ruta", "Pasajes Vendidos", "Ingreso Total"]];
            rankingRutas.forEach(r => filas.push([r.nombre, r.pasajes, r.ingreso.toFixed(2)]));
        } else if (tipo === "sucursales") {
            filas = [["Sucursal", "Pasajes Vendidos", "Ingreso Total"]];
            rankingSucursales.forEach(s => filas.push([s.nombre, s.pasajes, s.ingreso.toFixed(2)]));
        } else if (tipo === "viajes") {
            filas = [["Código Viaje", "Ruta", "Fecha", "Hora", "Estado"]];
            viajesEnRango.forEach(v => filas.push([v.codigoViaje, v.rutaNombre, v.fechaSalida, v.horaSalida, v.estado]));
        }

        const csv = filas.map(fila => fila.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = nombreArchivo;
        a.click();
        URL.revokeObjectURL(url);
    };

    const imprimir = () => window.print();

    const moneda = (n) => `S/ ${Number(n || 0).toFixed(2)}`;

    return (
        <div className="reportes-page">

            {/* ENCABEZADO */}
            <div className="reportes-header">
                <div>
                    <h2>Reportes</h2>
                    <p>Panel de reportes e indicadores del negocio</p>
                </div>
                <div className="reportes-acciones">
                    <button className="btn-secundario" onClick={exportarCSV}>
                        <i className="ti ti-download"></i> Exportar CSV
                    </button>
                    <button className="btn-primario" onClick={imprimir}>
                        <i className="ti ti-printer"></i> Imprimir
                    </button>
                </div>
            </div>

            {/* FILTROS */}
            <div className="reportes-filtros">
                <div className="filtro-fecha">
                    <label>Desde</label>
                    <input type="date" value={desde} onChange={e => setDesde(e.target.value)} />
                </div>
                <div className="filtro-fecha">
                    <label>Hasta</label>
                    <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} />
                </div>
                <div className="filtro-rapido">
                    <button onClick={() => { setDesde(haceDias(7)); setHasta(hoy()); }}>7 días</button>
                    <button onClick={() => { setDesde(haceDias(30)); setHasta(hoy()); }}>30 días</button>
                    <button onClick={() => { setDesde(haceDias(90)); setHasta(hoy()); }}>90 días</button>
                </div>
            </div>

            {/* TABS */}
            <div className="reportes-tabs">
                {TIPOS.map(t => (
                    <button
                        key={t.key}
                        className={`tab-btn ${tipo === t.key ? "activo" : ""}`}
                        onClick={() => setTipo(t.key)}
                    >
                        <i className={`ti ${t.icon}`}></i> {t.label}
                    </button>
                ))}
            </div>

            {cargando && (
                <div className="reportes-estado">
                    <i className="ti ti-loader-2 spin"></i>
                    <span>Cargando datos...</span>
                </div>
            )}

            {error && !cargando && (
                <div className="reportes-estado error">
                    <i className="ti ti-alert-circle"></i>
                    <span>{error}</span>
                </div>
            )}

            {!cargando && !error && (
                <>
                    {/* ================= VENTAS ================= */}
                    {tipo === "ventas" && (
                        <div className="reporte-bloque">
                            <div className="kpi-grid">
                                <div className="kpi-card">
                                    <i className="ti ti-cash kpi-icon"></i>
                                    <div>
                                        <span className="kpi-label">Ingreso Total</span>
                                        <span className="kpi-valor">{moneda(ingresoTotal)}</span>
                                    </div>
                                </div>
                                <div className="kpi-card">
                                    <i className="ti ti-ticket kpi-icon"></i>
                                    <div>
                                        <span className="kpi-label">Pasajes Vendidos</span>
                                        <span className="kpi-valor">{ventasFiltradas.length}</span>
                                    </div>
                                </div>
                                <div className="kpi-card">
                                    <i className="ti ti-receipt kpi-icon"></i>
                                    <div>
                                        <span className="kpi-label">Ticket Promedio</span>
                                        <span className="kpi-valor">{moneda(ticketPromedio)}</span>
                                    </div>
                                </div>
                                <div className="kpi-card kpi-alerta">
                                    <i className="ti ti-ban kpi-icon"></i>
                                    <div>
                                        <span className="kpi-label">Ventas Anuladas</span>
                                        <span className="kpi-valor">{ventasAnuladas.length}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="reporte-panel">
                                <h3>Ingresos por Día</h3>
                                {ventasPorDia.length === 0 ? (
                                    <div className="sin-datos">Sin ventas en el rango seleccionado</div>
                                ) : (
                                    <div className="grafico-barras">
                                        {ventasPorDia.map(([fecha, monto]) => (
                                            <div className="barra-item" key={fecha}>
                                                <div className="barra-col">
                                                    <div
                                                        className="barra"
                                                        style={{ height: `${(monto / maxVentaDia) * 100}%` }}
                                                        title={moneda(monto)}
                                                    ></div>
                                                </div>
                                                <span className="barra-valor">{moneda(monto)}</span>
                                                <span className="barra-label">{fecha.slice(5)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="reporte-panel">
                                <h3>Ventas por Tipo de Comprobante</h3>
                                {ventasPorTipoComprobante.length === 0 ? (
                                    <div className="sin-datos">Sin datos</div>
                                ) : (
                                    <div className="chip-lista">
                                        {ventasPorTipoComprobante.map(([tipoDoc, cant]) => (
                                            <div className="chip-stat" key={tipoDoc}>
                                                <span className="chip-stat-label">{tipoDoc}</span>
                                                <span className="chip-stat-valor">{cant}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ================= OCUPACIÓN ================= */}
                    {tipo === "ocupacion" && (
                        <div className="reporte-bloque">
                            <div className="reporte-panel">
                                <h3>Ocupación por Viaje</h3>
                                {ocupacionViajes.length === 0 ? (
                                    <div className="sin-datos">No hay viajes en el rango seleccionado</div>
                                ) : (
                                    <div className="tabla-wrapper">
                                        <table className="reportes-tabla">
                                            <thead>
                                            <tr>
                                                <th>Código</th>
                                                <th>Ruta</th>
                                                <th>Fecha</th>
                                                <th>Vendidos</th>
                                                <th>Capacidad</th>
                                                <th>Ocupación</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {ocupacionViajes.map(v => (
                                                <tr key={v.id}>
                                                    <td className="codigo">{v.codigoViaje}</td>
                                                    <td>{v.rutaNombre}</td>
                                                    <td>{v.fechaSalida} {v.horaSalida}</td>
                                                    <td>{v.vendidos}</td>
                                                    <td>{v.capacidad || "-"}</td>
                                                    <td>
                                                        <div className="ocupacion-barra-wrapper">
                                                            <div className="ocupacion-barra-fondo">
                                                                <div
                                                                    className={`ocupacion-barra-relleno ${v.pct >= 80 ? "alto" : v.pct >= 40 ? "medio" : "bajo"}`}
                                                                    style={{ width: `${Math.min(v.pct, 100)}%` }}
                                                                ></div>
                                                            </div>
                                                            <span>{v.pct}%</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ================= RUTAS ================= */}
                    {tipo === "rutas" && (
                        <div className="reporte-bloque">
                            <div className="reporte-panel">
                                <h3>Ranking de Rutas por Ingreso</h3>
                                {rankingRutas.length === 0 ? (
                                    <div className="sin-datos">Sin ventas en el rango seleccionado</div>
                                ) : (
                                    <div className="ranking-lista">
                                        {rankingRutas.map((r, idx) => (
                                            <div className="ranking-item" key={r.nombre}>
                                                <span className="ranking-pos">#{idx + 1}</span>
                                                <div className="ranking-info">
                                                    <div className="ranking-cabecera">
                                                        <strong>{r.nombre}</strong>
                                                        <span>{moneda(r.ingreso)} — {r.pasajes} pasajes</span>
                                                    </div>
                                                    <div className="ranking-barra-fondo">
                                                        <div
                                                            className="ranking-barra-relleno"
                                                            style={{ width: `${(r.ingreso / maxIngresoRuta) * 100}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ================= SUCURSALES ================= */}
                    {tipo === "sucursales" && (
                        <div className="reporte-bloque">
                            <div className="reporte-panel">
                                <h3>Ventas por Sucursal</h3>
                                {rankingSucursales.length === 0 ? (
                                    <div className="sin-datos">Sin datos</div>
                                ) : (
                                    <div className="ranking-lista">
                                        {rankingSucursales.map((s, idx) => (
                                            <div className="ranking-item" key={s.nombre}>
                                                <span className="ranking-pos">#{idx + 1}</span>
                                                <div className="ranking-info">
                                                    <div className="ranking-cabecera">
                                                        <strong>{s.nombre}</strong>
                                                        <span>{moneda(s.ingreso)} — {s.pasajes} pasajes</span>
                                                    </div>
                                                    <div className="ranking-barra-fondo">
                                                        <div
                                                            className="ranking-barra-relleno sucursal"
                                                            style={{ width: `${(s.ingreso / maxIngresoSucursal) * 100}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ================= VIAJES POR ESTADO ================= */}
                    {tipo === "viajes" && (
                        <div className="reporte-bloque">
                            <div className="kpi-grid">
                                <div className="kpi-card">
                                    <i className="ti ti-calendar-event kpi-icon"></i>
                                    <div>
                                        <span className="kpi-label">Programados</span>
                                        <span className="kpi-valor">{conteoEstados.PROGRAMADO}</span>
                                    </div>
                                </div>
                                <div className="kpi-card">
                                    <i className="ti ti-ship kpi-icon"></i>
                                    <div>
                                        <span className="kpi-label">En Curso</span>
                                        <span className="kpi-valor">{conteoEstados.EN_CURSO}</span>
                                    </div>
                                </div>
                                <div className="kpi-card">
                                    <i className="ti ti-circle-check kpi-icon"></i>
                                    <div>
                                        <span className="kpi-label">Completados</span>
                                        <span className="kpi-valor">{conteoEstados.COMPLETADO}</span>
                                    </div>
                                </div>
                                <div className="kpi-card kpi-alerta">
                                    <i className="ti ti-circle-x kpi-icon"></i>
                                    <div>
                                        <span className="kpi-label">Cancelados</span>
                                        <span className="kpi-valor">{conteoEstados.CANCELADO}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="reporte-panel">
                                <h3>Detalle de Viajes</h3>
                                {viajesEnRango.length === 0 ? (
                                    <div className="sin-datos">No hay viajes en el rango seleccionado</div>
                                ) : (
                                    <div className="tabla-wrapper">
                                        <table className="reportes-tabla">
                                            <thead>
                                            <tr>
                                                <th>Código</th>
                                                <th>Ruta</th>
                                                <th>Fecha</th>
                                                <th>Hora</th>
                                                <th>Estado</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {viajesEnRango.map(v => (
                                                <tr key={v.id}>
                                                    <td className="codigo">{v.codigoViaje}</td>
                                                    <td>{v.rutaNombre}</td>
                                                    <td>{v.fechaSalida}</td>
                                                    <td>{v.horaSalida}</td>
                                                    <td>
                                                        <span className={`badge-estado estado-${v.estado?.toLowerCase()}`}>
                                                            {v.estado}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default Reportes;
