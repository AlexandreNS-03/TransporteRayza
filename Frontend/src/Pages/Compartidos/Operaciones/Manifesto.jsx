import { useState, useEffect } from "react";
import "./Manifiesto.css";
import generarManifiestoPDF    from "./generarManifiestoPDF.jsx";
import { useToast, Toasts } from "../../../Components/Toast.jsx";
import { avisarGuardado, CARPETAS } from "../../../Utils/descargas.js";

import { apiFetch } from "../../../Services/api.js";
import SelectorViaje from "../../../Components/SelectorViaje.jsx";

// Compara valores (texto o número) para ordenar A-Z / Z-A y número de asiento.
function comparar(a, b, dir) {
    const m = dir === "asc" ? 1 : -1;
    if (a == null) a = "";
    if (b == null) b = "";
    if (typeof a === "number" && typeof b === "number") return (a - b) * m;
    return String(a).localeCompare(String(b), "es", { numeric: true }) * m;
}

function Manifiesto() {
    const { toasts, mostrarToast } = useToast();
    const [viajes, setViajes]       = useState([]);
    const [viajeId, setViajeId]     = useState("");
    const [pasajeros, setPasajeros] = useState([]);
    const [capacidad, setCapacidad] = useState(null);
    const [capacidadPorNombre, setCapacidadPorNombre] = useState({});
    const [orden, setOrden]         = useState({ key: "asientoNumero", dir: "asc" });

    const [cargandoViajes, setCargandoViajes] = useState(true);
    const [cargando, setCargando]   = useState(false);
    const [error, setError]         = useState(null);
    const [generandoPdf, setGenerandoPdf] = useState(false);

    useEffect(() => { fetchViajes(); fetchEmbarcaciones(); }, []);
    useEffect(() => { if (viajeId) fetchDatosViaje(); }, [viajeId]);

    // Capacidad por nombre de embarcación (el ViajeDTO no trae embarcacionId)
    const fetchEmbarcaciones = async () => {
        try {
            const data = await apiFetch("/api/embarcaciones");
            const mapa = {};
            data.forEach(e => { mapa[e.nombre] = e.capacidadTotal; });
            setCapacidadPorNombre(mapa);
        } catch (err) { console.error(err); }
    };

    const fetchViajes = async () => {
        setCargandoViajes(true);
        try {
            const data = await apiFetch("/api/viajes");
            // Excluye cancelados; incluye programados, en curso y completados (para reimprimir)
            const filtrados = data
                .filter(v => v.estado !== "CANCELADO")
                .sort((a, b) => (b.fechaSalida + b.horaSalida).localeCompare(a.fechaSalida + a.horaSalida));
            setViajes(filtrados);
        } catch (err) {
            console.error(err);
        } finally {
            setCargandoViajes(false);
        }
    };

    const fetchDatosViaje = async () => {
        setCargando(true);
        setError(null);
        setCapacidad(null);
        try {
            const ventas = await apiFetch(`/api/ventas/viaje/${viajeId}`);
            setPasajeros(ventas.filter(v => v.estado !== "ANULADO"));

            const viaje = viajes.find(v => v.id === viajeId);
            // La capacidad se resuelve por el nombre de la embarcación
            setCapacidad(capacidadPorNombre[viaje?.embarcacionNombre] ?? null);
        } catch (err) {
            setError(err.message);
        } finally {
            setCargando(false);
        }
    };

    const viajeSeleccionado = viajes.find(v => v.id === viajeId);

    const totalPasajeros  = pasajeros.length;
    const totalEmbarcados = pasajeros.filter(p => p.embarqueEstado === "EMBARCADO").length;
    const totalPendientes = totalPasajeros - totalEmbarcados;
    const ocupacion = capacidad ? Math.round((totalPasajeros / capacidad) * 100) : null;

    const alternarOrden = (key) => setOrden(o =>
        o.key === key ? { key, dir: o.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" });

    // Lista ordenada según la columna elegida (el PDF usa este mismo orden)
    const pasajerosOrdenados = [...pasajeros].sort((a, b) => {
        const val = (p) => {
            switch (orden.key) {
                case "pasajeroNombre": return p.pasajeroNombre || "";
                case "asientoNumero":  return p.asientoNumero ?? 0;
                default:               return p[orden.key];
            }
        };
        return comparar(val(a), val(b), orden.dir);
    });

    const ThOrden = ({ label, ordKey }) => (
        <th className="th-orden" onClick={() => alternarOrden(ordKey)} title="Ordenar">
            <span>{label}</span>
            <i className={`ti ${orden.key === ordKey
                ? (orden.dir === "asc" ? "ti-sort-ascending" : "ti-sort-descending")
                : "ti-arrows-sort"}`}></i>
        </th>
    );

    const descargarPdf = async () => {
        if (!viajeSeleccionado || pasajerosOrdenados.length === 0) return;
        setGenerandoPdf(true);
        try {
            const enCarpeta = await generarManifiestoPDF(viajeSeleccionado, pasajerosOrdenados, capacidad);
            avisarGuardado(mostrarToast, enCarpeta, "Manifiesto", CARPETAS.MANIFIESTOS);
        } finally {
            setGenerandoPdf(false);
        }
    };

    return (
        <div className="manifiesto-page">

            {/* ENCABEZADO */}
            <div className="manifiesto-header">
                <div>
                    <h2>Manifiesto de Pasajeros</h2>
                    <p>Documento oficial de tripulantes por viaje</p>
                </div>
                {viajeSeleccionado && pasajeros.length > 0 && (
                    <button className="btn-descargar" onClick={descargarPdf} disabled={generandoPdf}>
                        {generandoPdf
                            ? <><i className="ti ti-loader-2 spin"></i> Generando...</>
                            : <><i className="ti ti-file-download"></i> Descargar PDF</>
                        }
                    </button>
                )}
            </div>

            {/* SELECTOR DE VIAJE */}
            <div className="manifiesto-controles">
                <div className="control-grupo">
                    <label>Seleccionar Viaje</label>
                    <SelectorViaje
                        viajes={viajes}
                        value={viajeId}
                        onChange={setViajeId}
                        cargando={cargandoViajes}
                    />
                </div>
            </div>

            {/* ESTADOS */}
            {!viajeId && (
                <div className="manifiesto-vacio">
                    <i className="ti ti-clipboard-list"></i>
                    <span>Selecciona un viaje para ver su manifiesto</span>
                </div>
            )}

            {cargando && (
                <div className="manifiesto-estado">
                    <i className="ti ti-loader-2 spin"></i>
                    <span>Cargando manifiesto...</span>
                </div>
            )}

            {error && !cargando && (
                <div className="manifiesto-estado error">
                    <i className="ti ti-alert-circle"></i>
                    <span>{error}</span>
                </div>
            )}

            {/* CONTENIDO DEL MANIFIESTO */}
            {!cargando && !error && viajeSeleccionado && (
                <>
                    {/* FICHA DEL VIAJE */}
                    <div className="manifiesto-ficha">
                        <div className="ficha-item">
                            <span className="ficha-label">Código de viaje</span>
                            <strong>{viajeSeleccionado.codigoViaje}</strong>
                        </div>
                        <div className="ficha-item">
                            <span className="ficha-label">Ruta</span>
                            <strong>{viajeSeleccionado.rutaNombre}</strong>
                        </div>
                        <div className="ficha-item">
                            <span className="ficha-label">Origen → Destino</span>
                            <strong>{viajeSeleccionado.origen} → {viajeSeleccionado.destino}</strong>
                        </div>
                        <div className="ficha-item">
                            <span className="ficha-label">Fecha / Hora</span>
                            <strong>{viajeSeleccionado.fechaSalida} — {viajeSeleccionado.horaSalida}</strong>
                        </div>
                        <div className="ficha-item">
                            <span className="ficha-label">Embarcación</span>
                            <strong>{viajeSeleccionado.embarcacionNombre}</strong>
                        </div>
                        <div className="ficha-item">
                            <span className="ficha-label">Capacidad</span>
                            <strong>{capacidad ? `${capacidad} pasajeros` : "No disponible"}</strong>
                        </div>
                    </div>

                    {/* RESUMEN */}
                    <div className="manifiesto-resumen">
                        <div className="resumen-card">
                            <i className="ti ti-users"></i>
                            <div>
                                <span className="resumen-label">Total Pasajeros</span>
                                <span className="resumen-valor">{totalPasajeros}</span>
                            </div>
                        </div>
                        <div className="resumen-card verde">
                            <i className="ti ti-user-check"></i>
                            <div>
                                <span className="resumen-label">Embarcados</span>
                                <span className="resumen-valor">{totalEmbarcados}</span>
                            </div>
                        </div>
                        <div className="resumen-card amarillo">
                            <i className="ti ti-user-clock"></i>
                            <div>
                                <span className="resumen-label">Pendientes</span>
                                <span className="resumen-valor">{totalPendientes}</span>
                            </div>
                        </div>
                        {ocupacion !== null && (
                            <div className="resumen-card morado">
                                <i className="ti ti-gauge"></i>
                                <div>
                                    <span className="resumen-label">Ocupación</span>
                                    <span className="resumen-valor">{ocupacion}%</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* TABLA */}
                    {pasajeros.length === 0 ? (
                        <div className="manifiesto-vacio">
                            <i className="ti ti-users-off"></i>
                            <span>Este viaje no tiene pasajeros registrados</span>
                        </div>
                    ) : (
                        <div className="manifiesto-tabla-wrapper">
                            <table className="manifiesto-tabla">
                                <thead>
                                <tr>
                                    <th>#</th>
                                    <ThOrden label="Nombre Completo" ordKey="pasajeroNombre" />
                                    <th>Documento</th>
                                    <th>Edad</th>
                                    <th>Sexo</th>
                                    <th>Procedencia</th>
                                    <th>Teléfono</th>
                                    <th>Tramo</th>
                                    <ThOrden label="Asiento" ordKey="asientoNumero" />
                                    <th>Precio</th>
                                    <th>Observación</th>
                                    <th>Estado</th>
                                </tr>
                                </thead>
                                <tbody>
                                {pasajerosOrdenados.map((p, i) => (
                                    <tr key={p.id}>
                                        <td className="col-numero" data-label="#">{i + 1}</td>
                                        <td data-label="Nombre Completo"><strong>{p.pasajeroNombre}</strong></td>
                                        <td data-label="Documento">{p.tipoDocumento}: {p.pasajeroDocumento}</td>
                                        <td data-label="Edad">{p.edad ?? "—"}</td>
                                        <td data-label="Sexo">{p.sexo || "—"}</td>
                                        <td data-label="Procedencia">{p.procedencia || "—"}</td>
                                        <td data-label="Teléfono">{p.pasajeroTelefono || "—"}</td>
                                        <td data-label="Tramo">
                                            <div className="tramo-info">
                                                <span>{p.paradaOrigen}</span>
                                                <i className="ti ti-arrow-right"></i>
                                                <span>{p.paradaDestino}</span>
                                            </div>
                                        </td>
                                        <td data-label="Asiento">
                                            <span className={`asiento-tipo ${p.asientoTipo?.toLowerCase()}`}>
                                                {p.asientoTipo}
                                            </span>
                                            <strong> #{p.asientoNumero}</strong>
                                        </td>
                                        <td data-label="Precio">{p.precio != null ? `S/ ${Number(p.precio).toFixed(2)}` : "—"}</td>
                                        <td className="col-observacion" data-label="Observación">{p.observacion || "—"}</td>
                                        <td data-label="Estado">
                                            <span className={`badge ${p.embarqueEstado === "EMBARCADO" ? "badge-embarcado" : "badge-pendiente"}`}>
                                                {p.embarqueEstado === "EMBARCADO" ? "Embarcado" : "Pendiente"}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
            <Toasts toasts={toasts} />
        </div>
    );
}

export default Manifiesto;