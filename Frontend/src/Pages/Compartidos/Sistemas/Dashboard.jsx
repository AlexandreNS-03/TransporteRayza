import { useState, useEffect, useMemo, useRef } from "react";
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    PieChart, Pie, Cell, Legend, AreaChart, Area,
} from "recharts";
import "./Dashboard.css";

const API = "http://localhost:8080";
function token() { return localStorage.getItem("token"); }
async function apiFetch(url) {
    const res = await fetch(`${API}${url}`, {
        headers: { "Authorization": `Bearer ${token()}` }
    });
    if (!res.ok) throw new Error("Error");
    return res.json();
}

const ESTADO_LABEL = { PROGRAMADO: "Programado", EN_CURSO: "En Curso", COMPLETADO: "Completado", CANCELADO: "Cancelado" };
function badgeViaje(estado) {
    switch (estado) {
        case "PROGRAMADO": return "badge badge-programado";
        case "EN_CURSO":   return "badge badge-encurso";
        default:           return "badge";
    }
}

const COLORES = { azul: "#1a4db5", verde: "#15803d", amarillo: "#a16207", morado: "#7c3aed", cyan: "#0891b2" };

/* ---------- Hook: animación de conteo para las tarjetas de stats ---------- */
function useCountUp(valor, duracion = 700) {
    const [n, setN] = useState(0);
    const frame = useRef(null);
    useEffect(() => {
        const destino = Number(valor) || 0;
        const inicio = performance.now();
        const desde = n;
        cancelAnimationFrame(frame.current);
        const tick = (ahora) => {
            const t = Math.min(1, (ahora - inicio) / duracion);
            const easedT = 1 - Math.pow(1 - t, 3); // ease-out
            setN(Math.round(desde + (destino - desde) * easedT));
            if (t < 1) frame.current = requestAnimationFrame(tick);
        };
        frame.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [valor]);
    return n;
}

function StatCard({ label, valorRaw, formato, icono, color }) {
    const animado = useCountUp(valorRaw);
    const valorMostrado = formato === "moneda"
        ? `S/ ${animado.toLocaleString("es-PE")}`
        : animado.toLocaleString("es-PE");
    return (
        <div className={`stat-card stat-${color}`}>
            <div className="stat-icono"><i className={`ti ${icono}`}></i></div>
            <div className="stat-info">
                <span className="stat-label">{label}</span>
                <strong className="stat-valor">{valorMostrado}</strong>
            </div>
        </div>
    );
}

/* ---------- Tooltip propio para que combine con el estilo del dashboard ---------- */
function ChartTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="chart-tooltip">
            <strong>{label}</strong>
            {payload.map((p, i) => (
                <div key={i} className="chart-tooltip-row">
                    <span className="chart-tooltip-dot" style={{ background: p.color }}></span>
                    <span>{p.name}: {typeof p.value === "number" ? p.value.toLocaleString("es-PE") : p.value}</span>
                </div>
            ))}
        </div>
    );
}

function Dashboard() {
    const usuario  = JSON.parse(localStorage.getItem("usuario"));
    const [data, setData]       = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError]     = useState(null);
    const [tab, setTab]         = useState("hoy");

    useEffect(() => { fetchDashboard(); }, []);

    const fetchDashboard = async () => {
        setCargando(true);
        setError(null);
        try {
            const d = await apiFetch("/api/dashboard");
            setData(d);
        } catch (err) { setError("Error al cargar el dashboard"); }
        finally { setCargando(false); }
    };

    const statsHoy = data ? [
        { label: "Viajes Hoy",        valorRaw: data.totalViajesHoy,          icono: "ti-ship",        color: "azul" },
        { label: "Ventas Hoy",        valorRaw: data.totalVentasHoy,          icono: "ti-ticket",      color: "verde" },
        { label: "Embarcados Hoy",    valorRaw: data.totalPasajerosEmbarcados, icono: "ti-user-check",  color: "amarillo" },
        { label: "Ingresos Hoy",      valorRaw: data.ingresosHoy, formato: "moneda", icono: "ti-cash",  color: "morado" },
    ] : [];

    const statsSemana = data ? [
        { label: "Ventas Semana",     valorRaw: data.totalVentasSemana,        icono: "ti-ticket",      color: "verde" },
        { label: "Ingresos Semana",   valorRaw: data.ingresosSemana, formato: "moneda", icono: "ti-cash", color: "morado" },
    ] : [];

    const statsMes = data ? [
        { label: "Ventas Mes",        valorRaw: data.totalVentasMes,           icono: "ti-ticket",      color: "verde" },
        { label: "Ingresos Mes",      valorRaw: data.ingresosMes, formato: "moneda", icono: "ti-cash",   color: "morado" },
    ] : [];

    const statsActivas = tab === "hoy" ? statsHoy : tab === "semana" ? [...statsHoy, ...statsSemana] : [...statsHoy, ...statsSemana, ...statsMes];

    /* ---------- Datos derivados para los gráficos ----------
       Si el backend ya envía series listas (data.ventasPorDia, data.topRutas,
       data.ocupacionPorTipo) se usan directo. Si no existen, se calculan
       aquí mismo a partir de data.ultimasVentas, para que los gráficos
       funcionen sin tocar el backend. */
    const ventasPorDia = useMemo(() => {
        if (data?.ventasPorDia) return data.ventasPorDia;
        if (!data?.ultimasVentas?.length) return [];
        const mapa = {};
        data.ultimasVentas.forEach(v => {
            const dia = v.fechaVenta;
            if (!mapa[dia]) mapa[dia] = { dia, ventas: 0, ingresos: 0 };
            mapa[dia].ventas += 1;
            mapa[dia].ingresos += Number(v.precio) || 0;
        });
        return Object.values(mapa).sort((a, b) => a.dia.localeCompare(b.dia));
    }, [data]);

    const topRutas = useMemo(() => {
        if (data?.topRutas) return data.topRutas;
        if (!data?.ultimasVentas?.length) return [];
        const mapa = {};
        data.ultimasVentas.forEach(v => {
            const ruta = `${v.paradaOrigen} → ${v.paradaDestino}`;
            mapa[ruta] = (mapa[ruta] || 0) + 1;
        });
        return Object.entries(mapa)
            .map(([ruta, ventas]) => ({ ruta, ventas }))
            .sort((a, b) => b.ventas - a.ventas)
            .slice(0, 5);
    }, [data]);

    const ocupacionPorTipo = useMemo(() => {
        if (data?.ocupacionPorTipo) return data.ocupacionPorTipo;
        if (!data?.ultimasVentas?.length) return [];
        let vip = 0, normal = 0;
        data.ultimasVentas.forEach(v => v.asientoTipo === "VIP" ? vip++ : normal++);
        return [
            { tipo: "VIP", cantidad: vip },
            { tipo: "Normal", cantidad: normal },
        ].filter(x => x.cantidad > 0);
    }, [data]);

    if (cargando) return (
        <div className="dash-cargando">
            <i className="ti ti-loader-2 spin"></i>
            <span>Cargando dashboard...</span>
        </div>
    );

    if (error) return (
        <div className="dash-error">
            <i className="ti ti-alert-circle"></i>
            <span>{error}</span>
            <button onClick={fetchDashboard}>Reintentar</button>
        </div>
    );

    return (
        <div className="dash-page">

            {/* ENCABEZADO */}
            <div className="dash-header">
                <div>
                    <h2>Dashboard</h2>
                    <p>Bienvenido, <strong>{usuario?.nombre}</strong> — {new Date().toLocaleDateString("es-PE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                </div>
                <button className="btn-recargar" onClick={fetchDashboard}>
                    <i className="ti ti-refresh"></i> Actualizar
                </button>
            </div>

            {/* TABS */}
            <div className="dash-tabs">
                <button className={`dash-tab ${tab === "hoy" ? "activo" : ""}`} onClick={() => setTab("hoy")}>
                    <i className="ti ti-calendar-day"></i> Hoy
                </button>
                <button className={`dash-tab ${tab === "semana" ? "activo" : ""}`} onClick={() => setTab("semana")}>
                    <i className="ti ti-calendar-week"></i> Esta Semana
                </button>
                <button className={`dash-tab ${tab === "mes" ? "activo" : ""}`} onClick={() => setTab("mes")}>
                    <i className="ti ti-calendar-month"></i> Este Mes
                </button>
            </div>

            {/* TARJETAS STATS (con conteo animado) */}
            <div className="dash-stats">
                {statsActivas.map((s, i) => <StatCard key={i} {...s} />)}
            </div>

            {/* GRÁFICOS */}
            <div className="dash-charts">

                <div className="dash-card chart-card">
                    <div className="dash-card-header">
                        <h3><i className="ti ti-chart-area-line"></i> Ventas e Ingresos</h3>
                        <span className="dash-card-sub">Por día</span>
                    </div>
                    <div className="dash-card-body chart-body">
                        {!ventasPorDia.length ? (
                            <div className="dash-vacio"><i className="ti ti-chart-line"></i><span>Sin datos suficientes</span></div>
                        ) : (
                            <ResponsiveContainer width="100%" height={260}>
                                <AreaChart data={ventasPorDia} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="gradVentas" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={COLORES.azul} stopOpacity={0.35} />
                                            <stop offset="95%" stopColor={COLORES.azul} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Area type="monotone" dataKey="ventas" name="Ventas" stroke={COLORES.azul} fill="url(#gradVentas)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                <div className="dash-card chart-card">
                    <div className="dash-card-header">
                        <h3><i className="ti ti-route"></i> Rutas Más Vendidas</h3>
                        <span className="dash-card-sub">Top 5</span>
                    </div>
                    <div className="dash-card-body chart-body">
                        {!topRutas.length ? (
                            <div className="dash-vacio"><i className="ti ti-route-off"></i><span>Sin datos suficientes</span></div>
                        ) : (
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={topRutas} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                    <XAxis type="number" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} allowDecimals={false} />
                                    <YAxis type="category" dataKey="ruta" width={110} tick={{ fontSize: 11, fill: "#374151" }} axisLine={false} tickLine={false} />
                                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f8fafc" }} />
                                    <Bar dataKey="ventas" name="Ventas" fill={COLORES.verde} radius={[0, 6, 6, 0]} barSize={18} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                <div className="dash-card chart-card">
                    <div className="dash-card-header">
                        <h3><i className="ti ti-chart-pie"></i> Ocupación por Tipo</h3>
                        <span className="dash-card-sub">VIP vs Normal</span>
                    </div>
                    <div className="dash-card-body chart-body">
                        {!ocupacionPorTipo.length ? (
                            <div className="dash-vacio"><i className="ti ti-chart-pie-off"></i><span>Sin datos suficientes</span></div>
                        ) : (
                            <ResponsiveContainer width="100%" height={260}>
                                <PieChart>
                                    <Pie
                                        data={ocupacionPorTipo}
                                        dataKey="cantidad"
                                        nameKey="tipo"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={55}
                                        outerRadius={85}
                                        paddingAngle={3}
                                    >
                                        {ocupacionPorTipo.map((_, i) => (
                                            <Cell key={i} fill={[COLORES.amarillo, COLORES.azul, COLORES.cyan][i % 3]} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<ChartTooltip />} />
                                    <Legend wrapperStyle={{ fontSize: 12 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

            </div>

            {/* GRID INFERIOR */}
            <div className="dash-grid">

                {/* VIAJES PRÓXIMOS */}
                <div className="dash-card">
                    <div className="dash-card-header">
                        <h3><i className="ti ti-ship"></i> Viajes Próximos</h3>
                        <span className="dash-card-sub">{data?.viajesProximos?.length || 0} programados</span>
                    </div>
                    <div className="dash-card-body">
                        {!data?.viajesProximos?.length ? (
                            <div className="dash-vacio">
                                <i className="ti ti-ship-off"></i>
                                <span>No hay viajes próximos</span>
                            </div>
                        ) : (
                            data.viajesProximos.map((v, i) => (
                                <div key={i} className="viaje-item">
                                    <div className="viaje-item-icon">
                                        <i className="ti ti-ship"></i>
                                    </div>
                                    <div className="viaje-item-info">
                                        <strong>{v.rutaNombre}</strong>
                                        <span>{v.embarcacionNombre} — {v.fechaSalida} a las {v.horaSalida}</span>
                                        <span className="viaje-codigo">{v.codigoViaje}</span>
                                    </div>
                                    <span className={badgeViaje(v.estado)}>
                                        {ESTADO_LABEL[v.estado]}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* ÚLTIMAS VENTAS */}
                <div className="dash-card">
                    <div className="dash-card-header">
                        <h3><i className="ti ti-ticket"></i> Últimas Ventas</h3>
                        <span className="dash-card-sub">Más recientes</span>
                    </div>
                    <div className="dash-card-body">
                        {!data?.ultimasVentas?.length ? (
                            <div className="dash-vacio">
                                <i className="ti ti-ticket-off"></i>
                                <span>No hay ventas registradas</span>
                            </div>
                        ) : (
                            data.ultimasVentas.map((v, i) => (
                                <div key={i} className="venta-item">
                                    <div className={`venta-tipo ${v.asientoTipo?.toLowerCase()}`}>
                                        {v.asientoTipo === "VIP" ? "⭐" : "💺"}
                                    </div>
                                    <div className="venta-item-info">
                                        <strong>{v.pasajeroNombre}</strong>
                                        <span>{v.paradaOrigen} → {v.paradaDestino} — Asiento #{v.asientoNumero}</span>
                                        <span className="venta-comp">{v.tipoComprobante} — {v.fechaVenta}</span>
                                    </div>
                                    <strong className="venta-precio">S/ {v.precio}</strong>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}

export default Dashboard;