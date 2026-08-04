import { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    PieChart, Pie, Cell, Legend, ComposedChart, Line,
} from "recharts";
import "./Reportes.css";

const COLORES = ["#1a4db5", "#15803d", "#a16207", "#7c3aed", "#0891b2", "#db2777"];

const API = (import.meta.env.VITE_API_URL || "http://localhost:8080") + "/api";
const authHeaders = () => ({ "Authorization": `Bearer ${localStorage.getItem("token")}` });

const hoy = () => new Date().toISOString().slice(0, 10);
const haceDias = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
};

const TIPOS = [
    { key: "resumen",    label: "Análisis General", icon: "ti-chart-histogram" },
    { key: "ventas",     label: "Ventas e Ingresos", icon: "ti-cash" },
    { key: "pagos",      label: "Formas de Pago", icon: "ti-wallet" },
    { key: "pagosviaje", label: "Pagos por Viaje", icon: "ti-ship" },
    { key: "vendedores", label: "Vendedores", icon: "ti-user-dollar" },
    { key: "horas",      label: "Ventas por Hora", icon: "ti-clock" },
    { key: "asientos",   label: "VIP vs Normal", icon: "ti-armchair-2" },
    { key: "ocupacion",  label: "Ocupación de Viajes", icon: "ti-armchair" },
    { key: "rutas",      label: "Rutas más Vendidas", icon: "ti-route" },
    { key: "sucursales", label: "Sucursales", icon: "ti-building-store" },
    { key: "viajes",     label: "Estado de Viajes", icon: "ti-ship" },
];

const esEfectivoMetodo = (m) => !m || String(m).toUpperCase() === "EFECTIVO";

// Métodos y oficinas para el reporte de formas de pago
const METODOS_PAGO = ["EFECTIVO", "YAPE", "PLIN", "TARJETA", "TRANSFERENCIA"];
const METODO_LABEL = { EFECTIVO: "Efectivo", YAPE: "Yape", PLIN: "Plin", TARJETA: "Tarjeta", TRANSFERENCIA: "Transferencia", SIN: "Sin registrar" };
const LUGARES_PAGO = [["IQUITOS", "Iquitos"], ["REQUENA", "Requena"], ["OTRO", "Otro / Web"]];

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
    const descuentoTotal = ventasFiltradas.reduce((s, v) => s + (Number(v.descuento) || 0), 0);
    const ventasConRebaja = ventasFiltradas.filter(v => Number(v.descuento) > 0).length;
    const ingresoAnulado = ventasAnuladas.reduce((s, v) => s + (Number(v.precio) || 0), 0);

    // Serie por día con ingresos y pasajes (para el gráfico combinado)
    const serieDia = useMemo(() => {
        const m = new Map();
        ventasFiltradas.forEach(v => {
            const d = v.fechaVenta;
            const a = m.get(d) || { dia: d, ingreso: 0, pasajes: 0 };
            a.ingreso += Number(v.precio || 0);
            a.pasajes += 1;
            m.set(d, a);
        });
        return [...m.values()]
            .sort((a, b) => a.dia.localeCompare(b.dia))
            .map(x => ({ ...x, etq: x.dia.slice(5) }));  // MM-DD
    }, [ventasFiltradas]);

    // ---------- Reporte: VENDEDORES ----------
    const rankingVendedores = useMemo(() => {
        const m = new Map();
        ventasFiltradas.forEach(v => {
            const nombre = v.usuarioNombre || "Sin registrar";
            const a = m.get(nombre) || { nombre, pasajes: 0, ingreso: 0 };
            a.pasajes += 1;
            a.ingreso += Number(v.precio || 0);
            m.set(nombre, a);
        });
        return [...m.values()].sort((a, b) => b.ingreso - a.ingreso);
    }, [ventasFiltradas]);

    // ---------- Reporte: POR HORA DEL DÍA ----------
    const ventasPorHora = useMemo(() => {
        const base = Array.from({ length: 24 }, (_, h) => ({ hora: `${String(h).padStart(2, "0")}:00`, pasajes: 0, ingreso: 0 }));
        ventasFiltradas.forEach(v => {
            const ts = v.createdAt || (v.fechaVenta ? v.fechaVenta + "T00:00:00" : null);
            if (!ts) return;
            const h = new Date(ts).getHours();
            if (h >= 0 && h < 24) { base[h].pasajes += 1; base[h].ingreso += Number(v.precio || 0); }
        });
        return base;
    }, [ventasFiltradas]);

    // ---------- Reporte: VIP vs NORMAL ----------
    const asientosTipo = useMemo(() => {
        let vip = { tipo: "VIP", pasajes: 0, ingreso: 0 };
        let nor = { tipo: "Normal", pasajes: 0, ingreso: 0 };
        ventasFiltradas.forEach(v => {
            const t = (v.asientoTipo === "VIP") ? vip : nor;
            t.pasajes += 1; t.ingreso += Number(v.precio || 0);
        });
        return [vip, nor].filter(x => x.pasajes > 0);
    }, [ventasFiltradas]);

    const ventasPorTipoComprobante = useMemo(() => {
        const m = new Map();
        ventasFiltradas.forEach(v => {
            const key = v.tipoComprobante || "N/D";
            m.set(key, (m.get(key) || 0) + 1);
        });
        return [...m.entries()];
    }, [ventasFiltradas]);

    // ---------- Reporte: FORMAS DE PAGO ----------
    const norm = (s) => (s || "").toUpperCase();
    const reportePagos = useMemo(() => {
        const filas = [...METODOS_PAGO, "SIN"];
        const m = {};
        filas.forEach(f => {
            m[f] = { IQUITOS: { i: 0, c: 0 }, REQUENA: { i: 0, c: 0 }, OTRO: { i: 0, c: 0 }, total: { i: 0, c: 0 } };
        });
        ventasFiltradas.forEach(v => {
            let met = norm(v.metodoPago);
            if (!METODOS_PAGO.includes(met)) met = "SIN";
            let lug = norm(v.lugarPago);
            if (lug !== "IQUITOS" && lug !== "REQUENA") lug = "OTRO";
            const val = Number(v.precio) || 0;
            m[met][lug].i += val; m[met][lug].c += 1;
            m[met].total.i += val; m[met].total.c += 1;
        });
        // Totales por oficina
        const totalCol = { IQUITOS: { i: 0, c: 0 }, REQUENA: { i: 0, c: 0 }, OTRO: { i: 0, c: 0 }, total: { i: 0, c: 0 } };
        filas.forEach(f => {
            ["IQUITOS", "REQUENA", "OTRO", "total"].forEach(l => {
                totalCol[l].i += m[f][l].i; totalCol[l].c += m[f][l].c;
            });
        });
        // Solo mostramos filas con algún movimiento
        const filasVisibles = filas.filter(f => m[f].total.c > 0);
        return { m, totalCol, filasVisibles };
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

    // ---------- Reporte: PAGOS POR VIAJE ----------
    const pagosPorViaje = useMemo(() => {
        const m = new Map();
        ventasFiltradas.forEach(v => {
            const viaje = viajesPorId.get(v.viajeId);
            const id = v.viajeId || "s/v";
            const a = m.get(id) || {
                codigo: viaje?.codigoViaje || v.viajeDescripcion || "—",
                ruta: viaje?.rutaNombre || "—",
                fecha: viaje?.fechaSalida || "",
                efectivo: 0, digital: 0, total: 0, pasajes: 0,
            };
            const monto = Number(v.precio) || 0;
            if (esEfectivoMetodo(v.metodoPago)) a.efectivo += monto; else a.digital += monto;
            a.total += monto; a.pasajes += 1;
            m.set(id, a);
        });
        return [...m.values()].sort((x, y) => (y.fecha + "").localeCompare(x.fecha + ""));
    }, [ventasFiltradas, viajesPorId]);

    // ---------- Reporte: ANÁLISIS GENERAL (KPIs) ----------
    const totEfectivo = reportePagos.m.EFECTIVO.total.i + reportePagos.m.SIN.total.i;
    const totDigital = reportePagos.totalCol.total.i - totEfectivo;
    const pctEfectivo = reportePagos.totalCol.total.i > 0 ? (totEfectivo / reportePagos.totalCol.total.i) * 100 : 0;
    const ocupacionProm = ocupacionViajes.length
        ? Math.round(ocupacionViajes.reduce((s, v) => s + v.pct, 0) / ocupacionViajes.length) : 0;
    const diaPico = serieDia.length ? serieDia.reduce((a, b) => (b.ingreso > a.ingreso ? b : a)) : null;
    const horaPico = ventasPorHora.reduce((a, b) => (b.pasajes > a.pasajes ? b : a), { hora: "—", pasajes: 0 });
    const topRuta = rankingRutas[0];
    const topVendedor = rankingVendedores[0];
    const topSucursal = rankingSucursales[0];

    // ---------- Exportar a Excel ----------
    // Devuelve { cols, filas } (números como number) para el reporte activo.
    const datosDelReporte = (t = tipo) => {
        let cols = [], filas = [];
        const n = (x) => Number(x) || 0;
        if (t === "resumen") {
            cols = ["Indicador", "Valor"];
            filas = [
                ["Ingreso total (S/)", n(ingresoTotal)],
                ["Pasajes vendidos", ventasFiltradas.length],
                ["Ticket promedio (S/)", n(ticketPromedio)],
                ["Efectivo (S/)", n(totEfectivo)],
                ["Digital (S/)", n(totDigital)],
                ["% Efectivo", n(pctEfectivo)],
                ["Descuentos (S/)", n(descuentoTotal)],
                ["Ventas con rebaja", ventasConRebaja],
                ["Ventas anuladas", ventasAnuladas.length],
                ["Monto anulado (S/)", n(ingresoAnulado)],
                ["Ocupación promedio (%)", ocupacionProm],
                ["Ruta top", topRuta?.nombre || "—"],
                ["Vendedor top", topVendedor?.nombre || "—"],
                ["Sucursal top", topSucursal?.nombre || "—"],
                ["Día pico", diaPico ? `${diaPico.dia} (S/ ${diaPico.ingreso.toFixed(2)})` : "—"],
                ["Hora pico", `${horaPico.hora} (${horaPico.pasajes} pasajes)`],
            ];
        } else if (t === "ventas") {
            cols = ["Fecha", "Comprobante", "Pasajero", "Ruta", "Metodo", "Descuento", "Precio"];
            ventasFiltradas.forEach(v => {
                const viaje = viajesPorId.get(v.viajeId);
                filas.push([v.fechaVenta, `${v.serieComprobante}-${v.numeroComprobante}`, v.pasajeroNombre,
                    viaje?.rutaNombre || "", v.metodoPago || "", n(v.descuento), n(v.precio)]);
            });
        } else if (t === "pagos") {
            cols = ["Metodo", "Iquitos", "Requena", "Otro/Web", "Total", "Pasajes"];
            reportePagos.filasVisibles.forEach(f => {
                const r = reportePagos.m[f];
                filas.push([METODO_LABEL[f], r.IQUITOS.i, r.REQUENA.i, r.OTRO.i, r.total.i, r.total.c]);
            });
            const tc = reportePagos.totalCol;
            filas.push(["TOTAL", tc.IQUITOS.i, tc.REQUENA.i, tc.OTRO.i, tc.total.i, tc.total.c]);
        } else if (t === "pagosviaje") {
            cols = ["Código", "Ruta", "Fecha", "Efectivo", "Digital", "Total", "Pasajes"];
            pagosPorViaje.forEach(v => filas.push([v.codigo, v.ruta, v.fecha, v.efectivo, v.digital, v.total, v.pasajes]));
        } else if (t === "vendedores") {
            cols = ["Vendedor", "Pasajes", "Ingreso", "Ticket promedio"];
            rankingVendedores.forEach(r => filas.push([r.nombre, r.pasajes, r.ingreso, r.pasajes ? r.ingreso / r.pasajes : 0]));
        } else if (t === "horas") {
            cols = ["Hora", "Pasajes", "Ingreso"];
            ventasPorHora.filter(h => h.pasajes > 0).forEach(h => filas.push([h.hora, h.pasajes, h.ingreso]));
        } else if (t === "asientos") {
            cols = ["Tipo", "Pasajes", "Ingreso"];
            asientosTipo.forEach(a => filas.push([a.tipo, a.pasajes, a.ingreso]));
        } else if (t === "ocupacion") {
            cols = ["Código", "Ruta", "Fecha", "Hora", "Vendidos", "Capacidad", "% Ocupación"];
            ocupacionViajes.forEach(v => filas.push([v.codigoViaje, v.rutaNombre, v.fechaSalida, v.horaSalida, v.vendidos, v.capacidad, v.pct]));
        } else if (t === "rutas") {
            cols = ["Ruta", "Pasajes", "Ingreso"];
            rankingRutas.forEach(r => filas.push([r.nombre, r.pasajes, r.ingreso]));
        } else if (t === "sucursales") {
            cols = ["Sucursal", "Pasajes", "Ingreso"];
            rankingSucursales.forEach(s => filas.push([s.nombre, s.pasajes, s.ingreso]));
        } else if (t === "viajes") {
            cols = ["Código", "Ruta", "Fecha", "Hora", "Estado"];
            viajesEnRango.forEach(v => filas.push([v.codigoViaje, v.rutaNombre, v.fechaSalida, v.horaSalida, v.estado]));
        }
        return { cols, filas };
    };

    const exportarExcel = () => {
        const meta = TIPOS.find(t => t.key === tipo)?.label || tipo;
        const { cols, filas } = datosDelReporte();
        // Encabezado con el rango + tabla
        const aoa = [
            [meta],
            [`Del ${desde} al ${hasta}`],
            [],
            cols,
            ...filas,
        ];
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        ws["!cols"] = cols.map((c, i) => ({ wch: Math.max(12, ...aoa.slice(3).map(r => String(r[i] ?? "").length + 2)) }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, meta.slice(0, 28));
        XLSX.writeFile(wb, `reporte_${tipo}_${desde}_a_${hasta}.xlsx`);
    };

    const imprimir = () => {
        // Damos un instante para que los gr\u00E1ficos (SVG) queden pintados antes de imprimir
        requestAnimationFrame(() => setTimeout(() => window.print(), 60));
    };

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
                    <button className="btn-secundario" onClick={exportarExcel}>
                        <i className="ti ti-file-spreadsheet"></i> Exportar Excel
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
                    {/* ================= ANÁLISIS GENERAL ================= */}
                    {tipo === "resumen" && (
                        <div className="reporte-bloque">
                            <div className="kpi-grid">
                                <div className="kpi-card"><i className="ti ti-cash kpi-icon"></i><div><span className="kpi-label">Ingreso Total</span><span className="kpi-valor">{moneda(ingresoTotal)}</span></div></div>
                                <div className="kpi-card"><i className="ti ti-ticket kpi-icon"></i><div><span className="kpi-label">Pasajes Vendidos</span><span className="kpi-valor">{ventasFiltradas.length}</span></div></div>
                                <div className="kpi-card"><i className="ti ti-receipt kpi-icon"></i><div><span className="kpi-label">Ticket Promedio</span><span className="kpi-valor">{moneda(ticketPromedio)}</span></div></div>
                                <div className="kpi-card"><i className="ti ti-cash kpi-icon"></i><div><span className="kpi-label">Efectivo</span><span className="kpi-valor">{moneda(totEfectivo)}</span></div></div>
                                <div className="kpi-card"><i className="ti ti-device-mobile kpi-icon"></i><div><span className="kpi-label">Digital</span><span className="kpi-valor">{moneda(totDigital)}</span></div></div>
                                <div className="kpi-card"><i className="ti ti-percentage kpi-icon"></i><div><span className="kpi-label">% Efectivo</span><span className="kpi-valor">{pctEfectivo.toFixed(0)}%</span></div></div>
                                <div className="kpi-card"><i className="ti ti-discount kpi-icon"></i><div><span className="kpi-label">Descuentos ({ventasConRebaja})</span><span className="kpi-valor">{moneda(descuentoTotal)}</span></div></div>
                                <div className="kpi-card kpi-alerta"><i className="ti ti-ban kpi-icon"></i><div><span className="kpi-label">Anuladas ({ventasAnuladas.length})</span><span className="kpi-valor">{moneda(ingresoAnulado)}</span></div></div>
                                <div className="kpi-card"><i className="ti ti-armchair kpi-icon"></i><div><span className="kpi-label">Ocupación Prom.</span><span className="kpi-valor">{ocupacionProm}%</span></div></div>
                                <div className="kpi-card"><i className="ti ti-route kpi-icon"></i><div><span className="kpi-label">Ruta Top</span><span className="kpi-valor kpi-texto">{topRuta?.nombre || "—"}</span></div></div>
                                <div className="kpi-card"><i className="ti ti-user-dollar kpi-icon"></i><div><span className="kpi-label">Vendedor Top</span><span className="kpi-valor kpi-texto">{topVendedor?.nombre || "—"}</span></div></div>
                                <div className="kpi-card"><i className="ti ti-clock kpi-icon"></i><div><span className="kpi-label">Hora Pico</span><span className="kpi-valor">{horaPico.hora}</span></div></div>
                            </div>

                            <div className="reporte-panel">
                                <h3>Ingresos y Pasajes por Día</h3>
                                {serieDia.length === 0 ? (
                                    <div className="sin-datos">Sin ventas en el rango seleccionado</div>
                                ) : (
                                    <div className="chart-print">
                                        <ResponsiveContainer width="100%" height={280}>
                                            <ComposedChart data={serieDia} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                                                <XAxis dataKey="etq" tick={{ fontSize: 11, fill: "#6b7280" }} />
                                                <YAxis yAxisId="l" tick={{ fontSize: 11, fill: "#6b7280" }} />
                                                <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11, fill: "#6b7280" }} allowDecimals={false} />
                                                <Tooltip formatter={(val, name) => name === "Ingreso" ? moneda(val) : val} />
                                                <Legend />
                                                <Bar yAxisId="l" dataKey="ingreso" name="Ingreso" fill="#1a4db5" radius={[4, 4, 0, 0]} maxBarSize={46} />
                                                <Line yAxisId="r" type="monotone" dataKey="pasajes" name="Pasajes" stroke="#a16207" strokeWidth={2} dot={{ r: 3 }} />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

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
                                <div className="kpi-card">
                                    <i className="ti ti-discount kpi-icon"></i>
                                    <div>
                                        <span className="kpi-label">Descuentos ({ventasConRebaja})</span>
                                        <span className="kpi-valor">{moneda(descuentoTotal)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="reporte-panel">
                                <h3>Ingresos y Pasajes por Día</h3>
                                {serieDia.length === 0 ? (
                                    <div className="sin-datos">Sin ventas en el rango seleccionado</div>
                                ) : (
                                    <div className="chart-print">
                                        <ResponsiveContainer width="100%" height={300}>
                                            <ComposedChart data={serieDia} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                                                <XAxis dataKey="etq" tick={{ fontSize: 11, fill: "#6b7280" }} />
                                                <YAxis yAxisId="l" tick={{ fontSize: 11, fill: "#6b7280" }} />
                                                <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11, fill: "#6b7280" }} allowDecimals={false} />
                                                <Tooltip formatter={(val, name) => name === "Ingreso" ? moneda(val) : val} />
                                                <Legend />
                                                <Bar yAxisId="l" dataKey="ingreso" name="Ingreso" fill="#1a4db5" radius={[4, 4, 0, 0]} maxBarSize={46} />
                                                <Line yAxisId="r" type="monotone" dataKey="pasajes" name="Pasajes" stroke="#a16207" strokeWidth={2} dot={{ r: 3 }} />
                                            </ComposedChart>
                                        </ResponsiveContainer>
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

                    {/* ================= FORMAS DE PAGO ================= */}
                    {tipo === "pagos" && (
                        <div className="reporte-bloque">
                            <div className="kpi-grid">
                                <div className="kpi-card">
                                    <i className="ti ti-cash kpi-icon"></i>
                                    <div>
                                        <span className="kpi-label">Efectivo</span>
                                        <span className="kpi-valor">{moneda(reportePagos.m.EFECTIVO.total.i)}</span>
                                    </div>
                                </div>
                                <div className="kpi-card">
                                    <i className="ti ti-device-mobile kpi-icon"></i>
                                    <div>
                                        <span className="kpi-label">Digital (Yape/Plin/Transf.)</span>
                                        <span className="kpi-valor">{moneda(reportePagos.m.YAPE.total.i + reportePagos.m.PLIN.total.i + reportePagos.m.TRANSFERENCIA.total.i)}</span>
                                    </div>
                                </div>
                                <div className="kpi-card">
                                    <i className="ti ti-credit-card kpi-icon"></i>
                                    <div>
                                        <span className="kpi-label">Tarjeta</span>
                                        <span className="kpi-valor">{moneda(reportePagos.m.TARJETA.total.i)}</span>
                                    </div>
                                </div>
                                <div className="kpi-card">
                                    <i className="ti ti-wallet kpi-icon"></i>
                                    <div>
                                        <span className="kpi-label">Total Cobrado</span>
                                        <span className="kpi-valor">{moneda(reportePagos.totalCol.total.i)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="reporte-panel">
                                <h3>Distribución por Método</h3>
                                {reportePagos.filasVisibles.length === 0 ? (
                                    <div className="sin-datos">Sin ventas en el rango seleccionado</div>
                                ) : (
                                    <div className="chart-print">
                                        <ResponsiveContainer width="100%" height={280}>
                                            <PieChart>
                                                <Pie
                                                    data={reportePagos.filasVisibles.map(f => ({ nombre: METODO_LABEL[f], valor: reportePagos.m[f].total.i }))}
                                                    dataKey="valor" nameKey="nombre" cx="50%" cy="50%"
                                                    innerRadius={60} outerRadius={95} paddingAngle={3}
                                                    label={({ nombre, percent }) => `${nombre} ${(percent * 100).toFixed(0)}%`}
                                                >
                                                    {reportePagos.filasVisibles.map((f, i) => <Cell key={f} fill={COLORES[i % COLORES.length]} />)}
                                                </Pie>
                                                <Tooltip formatter={(val) => moneda(val)} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </div>

                            <div className="reporte-panel">
                                <h3>Cobros por Método y Oficina</h3>
                                {reportePagos.filasVisibles.length === 0 ? (
                                    <div className="sin-datos">Sin ventas en el rango seleccionado</div>
                                ) : (
                                    <div className="tabla-wrapper">
                                        <table className="reportes-tabla">
                                            <thead>
                                            <tr>
                                                <th>Método</th>
                                                {LUGARES_PAGO.map(([, label]) => <th key={label}>{label}</th>)}
                                                <th>Total</th>
                                                <th>N° pasajes</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {reportePagos.filasVisibles.map(f => (
                                                <tr key={f}>
                                                    <td><strong>{METODO_LABEL[f]}</strong></td>
                                                    {LUGARES_PAGO.map(([lug]) => (
                                                        <td key={lug}>{moneda(reportePagos.m[f][lug].i)}</td>
                                                    ))}
                                                    <td><strong>{moneda(reportePagos.m[f].total.i)}</strong></td>
                                                    <td>{reportePagos.m[f].total.c}</td>
                                                </tr>
                                            ))}
                                            <tr className="fila-total">
                                                <td><strong>TOTAL</strong></td>
                                                {LUGARES_PAGO.map(([lug]) => (
                                                    <td key={lug}><strong>{moneda(reportePagos.totalCol[lug].i)}</strong></td>
                                                ))}
                                                <td><strong>{moneda(reportePagos.totalCol.total.i)}</strong></td>
                                                <td><strong>{reportePagos.totalCol.total.c}</strong></td>
                                            </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ================= PAGOS POR VIAJE ================= */}
                    {tipo === "pagosviaje" && (
                        <div className="reporte-bloque">
                            <div className="reporte-panel">
                                <h3>Efectivo vs Digital por Viaje</h3>
                                {pagosPorViaje.length === 0 ? (
                                    <div className="sin-datos">Sin ventas en el rango seleccionado</div>
                                ) : (
                                    <div className="chart-print">
                                        <ResponsiveContainer width="100%" height={Math.max(240, pagosPorViaje.length * 40)}>
                                            <BarChart data={pagosPorViaje.slice(0, 20)} layout="vertical" margin={{ top: 5, right: 24, left: 10, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" horizontal={false} />
                                                <XAxis type="number" tick={{ fontSize: 11, fill: "#6b7280" }} />
                                                <YAxis type="category" dataKey="codigo" width={130} tick={{ fontSize: 10, fill: "#374151" }} />
                                                <Tooltip formatter={(val) => moneda(val)} />
                                                <Legend />
                                                <Bar dataKey="efectivo" name="Efectivo" stackId="a" fill="#15803d" maxBarSize={24} />
                                                <Bar dataKey="digital" name="Digital" stackId="a" fill="#0891b2" maxBarSize={24} radius={[0, 4, 4, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </div>
                            <div className="reporte-panel">
                                <h3>Detalle por Viaje</h3>
                                <div className="tabla-wrapper">
                                    <table className="reportes-tabla">
                                        <thead><tr><th>Código</th><th>Ruta</th><th>Fecha</th><th>Efectivo</th><th>Digital</th><th>Total</th><th>Pasajes</th></tr></thead>
                                        <tbody>
                                        {pagosPorViaje.map((v, i) => (
                                            <tr key={i}>
                                                <td className="codigo">{v.codigo}</td>
                                                <td>{v.ruta}</td>
                                                <td>{v.fecha}</td>
                                                <td>{moneda(v.efectivo)}</td>
                                                <td>{moneda(v.digital)}</td>
                                                <td><strong>{moneda(v.total)}</strong></td>
                                                <td>{v.pasajes}</td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ================= VENDEDORES ================= */}
                    {tipo === "vendedores" && (
                        <div className="reporte-bloque">
                            <div className="reporte-panel">
                                <h3>Ingreso por Vendedor</h3>
                                {rankingVendedores.length === 0 ? (
                                    <div className="sin-datos">Sin ventas en el rango seleccionado</div>
                                ) : (
                                    <div className="chart-print">
                                        <ResponsiveContainer width="100%" height={Math.max(220, rankingVendedores.length * 44)}>
                                            <BarChart data={rankingVendedores} layout="vertical" margin={{ top: 5, right: 24, left: 10, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" horizontal={false} />
                                                <XAxis type="number" tick={{ fontSize: 11, fill: "#6b7280" }} />
                                                <YAxis type="category" dataKey="nombre" width={140} tick={{ fontSize: 11, fill: "#374151" }} />
                                                <Tooltip formatter={(val) => moneda(val)} />
                                                <Bar dataKey="ingreso" name="Ingreso" fill="#15803d" radius={[0, 4, 4, 0]} maxBarSize={26} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </div>
                            <div className="reporte-panel">
                                <h3>Detalle por Vendedor</h3>
                                <div className="tabla-wrapper">
                                    <table className="reportes-tabla">
                                        <thead><tr><th>Vendedor</th><th>Pasajes</th><th>Ingreso</th><th>Ticket prom.</th></tr></thead>
                                        <tbody>
                                        {rankingVendedores.map(r => (
                                            <tr key={r.nombre}>
                                                <td><strong>{r.nombre}</strong></td>
                                                <td>{r.pasajes}</td>
                                                <td>{moneda(r.ingreso)}</td>
                                                <td>{moneda(r.pasajes ? r.ingreso / r.pasajes : 0)}</td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ================= POR HORA ================= */}
                    {tipo === "horas" && (
                        <div className="reporte-bloque">
                            <div className="reporte-panel">
                                <h3>Pasajes por Hora del Día</h3>
                                {ventasFiltradas.length === 0 ? (
                                    <div className="sin-datos">Sin ventas en el rango seleccionado</div>
                                ) : (
                                    <div className="chart-print">
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={ventasPorHora} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                                                <XAxis dataKey="hora" tick={{ fontSize: 10, fill: "#6b7280" }} interval={1} />
                                                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#6b7280" }} />
                                                <Tooltip formatter={(val, name) => name === "Ingreso" ? moneda(val) : val} />
                                                <Bar dataKey="pasajes" name="Pasajes" fill="#0891b2" radius={[4, 4, 0, 0]} maxBarSize={22} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ================= VIP vs NORMAL ================= */}
                    {tipo === "asientos" && (
                        <div className="reporte-bloque">
                            <div className="reporte-panel">
                                <h3>VIP vs Normal</h3>
                                {asientosTipo.length === 0 ? (
                                    <div className="sin-datos">Sin ventas en el rango seleccionado</div>
                                ) : (
                                    <div className="chart-print">
                                        <ResponsiveContainer width="100%" height={280}>
                                            <PieChart>
                                                <Pie data={asientosTipo} dataKey="pasajes" nameKey="tipo" cx="50%" cy="50%"
                                                     innerRadius={60} outerRadius={95} paddingAngle={3}
                                                     label={({ tipo, percent }) => `${tipo} ${(percent * 100).toFixed(0)}%`}>
                                                    {asientosTipo.map((a, i) => <Cell key={a.tipo} fill={COLORES[i % COLORES.length]} />)}
                                                </Pie>
                                                <Tooltip formatter={(val) => `${val} pasajes`} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </div>
                            <div className="reporte-panel">
                                <div className="tabla-wrapper">
                                    <table className="reportes-tabla">
                                        <thead><tr><th>Tipo</th><th>Pasajes</th><th>Ingreso</th></tr></thead>
                                        <tbody>
                                        {asientosTipo.map(a => (
                                            <tr key={a.tipo}><td><strong>{a.tipo}</strong></td><td>{a.pasajes}</td><td>{moneda(a.ingreso)}</td></tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
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
