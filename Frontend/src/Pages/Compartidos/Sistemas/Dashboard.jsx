import { useState, useEffect, useMemo, useRef } from "react";
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    PieChart, Pie, Cell, Legend, AreaChart, Area,
} from "recharts";
import "./Dashboard.css";

import { apiFetch } from "../../../Services/api.js";

const ESTADO_LABEL = { PROGRAMADO: "Programado", EN_CURSO: "En Curso", COMPLETADO: "Completado", CANCELADO: "Cancelado" };
function badgeViaje(estado) {
    switch (estado) {
        case "PROGRAMADO": return "badge badge-programado";
        case "EN_CURSO":   return "badge badge-encurso";
        default:           return "badge";
    }
}

const COLORES = { azul: "#1a4db5", verde: "#15803d", amarillo: "#a16207", morado: "#7c3aed", cyan: "#0891b2" };
const METODO_LABEL = {
    EFECTIVO: "Efectivo", YAPE: "Yape", PLIN: "Plin", TARJETA: "Tarjeta", TRANSFERENCIA: "Transferencia",
    "WEB SIN REGISTRAR": "Web (sin registrar)",
};
// Cómo entró la plata de una compra en línea. El método dice la pasarela:
// la tarjeta la cobra Izipay y el Yape de la web lo cobra Mercado Pago.
const PASARELA_LABEL = {
    IZIPAY: "Izipay (tarjeta)",
    "MERCADO PAGO": "Mercado Pago (Yape)",
    "SIN REGISTRAR": "Sin registrar",
};

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

/**
 * Una cifra del tablero.
 *
 * Antes cada una era una tarjeta con su icono y su fondo de color propio, y
 * había dieciocho: todas pedían la misma atención, así que ninguna la tenía.
 * Ahora el peso lo da el tamaño del número y el color solo aparece cuando
 * significa algo (plata que entró, algo que está pendiente).
 */
function Cifra({ label, valorRaw, formato, tono, nota, grande }) {
    const animado = useCountUp(valorRaw);
    const valorMostrado = formato === "moneda"
        ? `S/ ${animado.toLocaleString("es-PE")}`
        : animado.toLocaleString("es-PE");
    return (
        <div className={`dash-cifra${grande ? " cifra-grande" : ""}${tono ? ` cifra-${tono}` : ""}`}>
            <span className="cifra-label">{label}</span>
            <strong className="cifra-valor">{valorMostrado}</strong>
            {nota && <span className="cifra-nota">{nota}</span>}
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
    const [extras, setExtras]   = useState(null); // encomiendas + caja
    const [cargando, setCargando] = useState(true);
    const [error, setError]     = useState(null);
    const [tab, setTab]         = useState("hoy");

    useEffect(() => { fetchDashboard(); }, []);

    const fetchDashboard = async () => {
        setCargando(true);
        setError(null);
        try {
            const [d, encomiendas, cajas] = await Promise.all([
                apiFetch("/api/dashboard"),
                apiFetch("/api/encomiendas").catch(() => []),
                apiFetch("/api/cajas").catch(() => []),
            ]);
            setData(d);

            const hoy = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD en hora local (no UTC)
            const encHoy = encomiendas.filter(e => e.fechaRegistro === hoy);
            const cajasAbiertas = cajas.filter(c => c.estado === "ABIERTA");
            const cerradasHoy = cajas.filter(c => c.estado === "CERRADA" && (c.cerradaAt || "").slice(0, 10) === hoy);
            setExtras({
                encomiendasHoy: encHoy.length,
                ingresoEncomiendasHoy: encHoy.filter(e => e.estado !== "DEVUELTO").reduce((s, e) => s + (Number(e.precio) || 0), 0),
                encomiendasPendientes: encomiendas.filter(e => e.estado === "REGISTRADO" || e.estado === "EN_TRANSITO").length,
                cajasAbiertas: cajasAbiertas.length,
                cajasAbiertasList: cajasAbiertas,
                netoCerradasHoy: cerradasHoy.reduce((s, c) => s + (Number(c.totalNeto) || 0), 0),
                digitalCerradasHoy: cerradasHoy.reduce((s, c) => s + (Number(c.totalDigital) || 0), 0),
            });
        } catch (err) { setError("Error al cargar el dashboard"); }
        finally { setCargando(false); }
    };

    /* Las pestañas sumaban en vez de elegir: "Este Mes" mostraba las cifras de
       hoy, más las de la semana, más las del mes, ocho tarjetas a la vez. Ahora
       cada una responde una pregunta —cómo va hoy, la semana o el mes— y las
       dos cifras que solo existen para el día de hoy (viajes y embarcados) se
       muestran aparte, dichas como lo que son. */
    const PERIODOS = {
        hoy:    { titulo: "hoy",        ventas: "totalVentasHoy",    ingresos: "ingresosHoy" },
        semana: { titulo: "esta semana", ventas: "totalVentasSemana", ingresos: "ingresosSemana" },
        mes:    { titulo: "este mes",   ventas: "totalVentasMes",    ingresos: "ingresosMes" },
    };
    const periodo = PERIODOS[tab] || PERIODOS.hoy;

    /* Efectivo de hoy que el backend no pudo atribuir a Iquitos ni a Requena
       porque la venta no guardó el lugar de pago. */
    const sinOficinaHoy = data
        ? Math.max(0, (data.efectivoHoy || 0) - (data.efectivoIquitosHoy || 0) - (data.efectivoRequenaHoy || 0))
        : 0;

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

            {/* LO PRINCIPAL DEL PERÍODO ELEGIDO */}
            {data && (
                <div className="dash-titulares">
                    <div className="titulares-periodo">
                        <Cifra grande label={`Pasajes vendidos ${periodo.titulo}`}
                               valorRaw={data[periodo.ventas] || 0} />
                        <Cifra grande tono="plata" label={`Cobrado ${periodo.titulo}`}
                               valorRaw={data[periodo.ingresos] || 0} formato="moneda" />
                    </div>
                    {/* Estas dos son del día, siempre: no tienen versión semanal ni mensual. */}
                    <div className="titulares-dia">
                        <Cifra label="Viajes" valorRaw={data.totalViajesHoy || 0} nota="hoy" />
                        <Cifra label="Embarcados" valorRaw={data.totalPasajerosEmbarcados || 0} nota="hoy" />
                    </div>
                </div>
            )}

            {/* EFECTIVO POR OFICINA (HOY) — para cuadrar caja */}
            {data && (
                <div className="dash-bloque">
                    <div className="bloque-titulo">
                        <h3><i className="ti ti-cash"></i> Lo cobrado hoy, por oficina</h3>
                        <p>Con esto se cuadra la caja al cierre.</p>
                    </div>
                    <div className="dash-cifras">
                        <Cifra label="Efectivo Iquitos" valorRaw={data.efectivoIquitosHoy || 0} formato="moneda" />
                        <Cifra label="Efectivo Requena" valorRaw={data.efectivoRequenaHoy || 0} formato="moneda" />
                        {/* Una venta en efectivo sin oficina registrada entra al total pero
                            a ninguna de las dos columnas de arriba. Antes la diferencia no
                            se veía y al cuadrar caja no cerraba sin saber por qué. */}
                        {sinOficinaHoy > 0 && (
                            <Cifra tono="resta" label="Efectivo sin oficina" valorRaw={sinOficinaHoy}
                                   formato="moneda" nota="la venta no registró dónde se cobró" />
                        )}
                        <Cifra tono="plata" label="Total en efectivo" valorRaw={data.efectivoHoy || 0} formato="moneda" />
                        <Cifra label="Total digital" valorRaw={data.digitalHoy || 0} formato="moneda" nota="Yape, Plin, tarjeta" />
                        <Cifra tono={data.descuentosHoy > 0 ? "resta" : null} label="Descuentos" valorRaw={data.descuentosHoy || 0} formato="moneda" />
                    </div>

                    {/* Cobros de hoy por método */}
                    {data.cobrosMetodoHoy?.length > 0 && (
                        <div className="dash-card chart-card" style={{ marginTop: 12 }}>
                            <div className="dash-card-header">
                                <h3><i className="ti ti-wallet"></i> Cobros de hoy por método</h3>
                            </div>
                            <div className="dash-card-body chart-body">
                                <ResponsiveContainer width="100%" height={240}>
                                    <PieChart>
                                        <Pie data={data.cobrosMetodoHoy} dataKey="monto" nameKey="metodo"
                                             cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}
                                             label={({ metodo, percent }) => `${METODO_LABEL[metodo] || metodo} ${(percent * 100).toFixed(0)}%`}>
                                            {data.cobrosMetodoHoy.map((_, i) => (
                                                <Cell key={i} fill={Object.values(COLORES)[i % 5]} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<ChartTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* COMPRAS POR LA WEB */}
            {data && (
                <div className="dash-bloque">
                    <div className="bloque-titulo">
                        <h3><i className="ti ti-world"></i> Comprado por la web</h3>
                        <p>Esta plata entra a la cuenta de la pasarela, no a la caja de la oficina.</p>
                    </div>
                    <div className="dash-cifras">
                        <Cifra label="Ventas web hoy" valorRaw={data.totalVentasWebHoy || 0} />
                        <Cifra tono="plata" label="Ingresos web hoy" valorRaw={data.ingresosWebHoy || 0} formato="moneda" />
                        <Cifra label="Cobrado en mostrador hoy" valorRaw={data.ingresosMostradorHoy || 0} formato="moneda" />
                        {/* Estas dos son del mes aunque el bloque empiece por hoy: lo dice el rótulo. */}
                        <Cifra label="Ventas web del mes" valorRaw={data.totalVentasWebMes || 0} />
                        <Cifra label="Ingresos web del mes" valorRaw={data.ingresosWebMes || 0} formato="moneda" />
                    </div>

                    {data.cobrosWebHoy?.length > 0 && (
                        <div className="dash-card chart-card" style={{ marginTop: 12 }}>
                            <div className="dash-card-header">
                                <h3><i className="ti ti-credit-card"></i> Cobros web de hoy por pasarela</h3>
                            </div>
                            <div className="dash-card-body chart-body">
                                <ResponsiveContainer width="100%" height={240}>
                                    <PieChart>
                                        <Pie data={data.cobrosWebHoy} dataKey="monto" nameKey="metodo"
                                             cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}
                                             label={({ metodo, percent }) => `${PASARELA_LABEL[metodo] || metodo} ${(percent * 100).toFixed(0)}%`}>
                                            {data.cobrosWebHoy.map((_, i) => (
                                                <Cell key={i} fill={Object.values(COLORES)[i % 5]} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<ChartTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ENCOMIENDAS Y CAJA */}
            {extras && (
                <div className="dash-extras">
                    <div className="dash-bloque">
                        <div className="bloque-titulo">
                            <h3><i className="ti ti-box-seam"></i> Encomiendas</h3>
                        </div>
                        <div className="dash-cifras">
                            <Cifra label="Registradas" valorRaw={extras.encomiendasHoy} nota="hoy" />
                            <Cifra tono="plata" label="Cobrado en flete" valorRaw={extras.ingresoEncomiendasHoy} formato="moneda" nota="hoy" />
                            <Cifra tono={extras.encomiendasPendientes > 0 ? "pendiente" : null}
                                   label="Sin entregar" valorRaw={extras.encomiendasPendientes}
                                   nota="esperando a su destinatario" />
                        </div>
                    </div>

                    <div className="dash-cajas-panel">
                        <div className="dash-cajas-header">
                            <strong><i className="ti ti-cash"></i> Cajas abiertas ahora</strong>
                            <span>Cerradas hoy — efectivo: <b>S/ {extras.netoCerradasHoy.toLocaleString("es-PE")}</b> · digital: <b>S/ {extras.digitalCerradasHoy.toLocaleString("es-PE")}</b></span>
                        </div>
                        {extras.cajasAbiertasList.length === 0 ? (
                            <p className="dash-cajas-vacio"><i className="ti ti-lock"></i> No hay cajas abiertas en este momento</p>
                        ) : (
                            <table className="dash-cajas-tabla">
                                <thead>
                                <tr><th>Usuario</th><th>Sucursal</th><th>Apertura</th><th>Monto inicial</th></tr>
                                </thead>
                                <tbody>
                                {extras.cajasAbiertasList.map(c => (
                                    <tr key={c.id}>
                                        <td><strong>{c.usuarioNombre}</strong></td>
                                        <td>{c.sucursalNombre || "—"}</td>
                                        <td>{c.fechaApertura} {(c.horaApertura || "").slice(0, 5)}</td>
                                        <td>S/ {Number(c.montoInicial).toFixed(2)}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

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
                                        <i className={`ti ${v.asientoTipo === "VIP" ? "ti-star" : "ti-armchair"}`}></i>
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