import { useState, useEffect } from "react";
import "./Manifiesto.css";
import "../Ventas/Pasajes.css";   // .resumen-barra, compartida con el resto de las listas
import generarManifiestoCargaPDF from "./generarManifiestoCargaPDF.jsx";
import SelectorViaje from "../../../Components/SelectorViaje.jsx";
import { apiFetch } from "../../../Services/api.js";
import { useToast, Toasts } from "../../../Components/Toast.jsx";
import { avisarGuardado, CARPETAS } from "../../../Utils/descargas.js";

const ESTADO_LABEL = {
    REGISTRADO: "Registrado", EN_TRANSITO: "En tránsito",
    ENTREGADO: "Entregado", DEVUELTO: "Devuelto",
};
const ESTADO_BADGE = {
    REGISTRADO: "badge-pendiente", EN_TRANSITO: "badge-pendiente",
    ENTREGADO: "badge-embarcado", DEVUELTO: "badge-pendiente",
};
const PAGO_LABEL = { PAGADO: "Pagado", PENDIENTE: "Pendiente", PAGA_DESTINO: "Paga en destino" };

const DIAS  = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"];

/** 2026-07-18 → "sáb 18 jul". Quien carga el bote piensa en el día, no en el ISO. */
function fechaLarga(iso) {
    if (!iso) return "—";
    const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
    return `${DIAS[new Date(a, m - 1, d).getDay()]} ${String(d).padStart(2, "0")} ${MESES[m - 1]}`;
}

/**
 * Manifiesto de carga: la lista de encomiendas que lleva un viaje. Es el
 * equivalente del manifiesto de pasajeros, pero para la carga; sirve para que
 * la tripulación sepa qué bultos van a bordo y en qué parada baja cada uno.
 */
function ManifiestoCarga() {
    const { toasts, mostrarToast } = useToast();
    const [viajes, setViajes]         = useState([]);
    const [viajeId, setViajeId]       = useState("");
    const [encomiendas, setEncomiendas] = useState([]);

    const [cargandoViajes, setCargandoViajes] = useState(true);
    const [cargando, setCargando]     = useState(false);
    const [error, setError]           = useState(null);
    const [generandoPdf, setGenerandoPdf] = useState(false);

    useEffect(() => { fetchViajes(); }, []);
    useEffect(() => { if (viajeId) fetchEncomiendas(); }, [viajeId]);

    const fetchViajes = async () => {
        setCargandoViajes(true);
        try {
            const data = await apiFetch("/api/viajes");
            setViajes(data
                .filter(v => v.estado !== "CANCELADO")
                .sort((a, b) => (b.fechaSalida + b.horaSalida).localeCompare(a.fechaSalida + a.horaSalida)));
        } catch (err) { console.error(err); }
        finally { setCargandoViajes(false); }
    };

    const fetchEncomiendas = async () => {
        setCargando(true);
        setError(null);
        try {
            setEncomiendas(await apiFetch(`/api/encomiendas/viaje/${viajeId}`));
        } catch (err) { setError(err.message); }
        finally { setCargando(false); }
    };

    const viajeSeleccionado = viajes.find(v => v.id === viajeId);

    const totalBultos = encomiendas.length;
    const pesoTotal   = encomiendas.reduce((s, e) => s + (Number(e.peso) || 0), 0);
    const montoTotal  = encomiendas.reduce((s, e) => s + (Number(e.precio) || 0), 0);
    const porCobrar   = encomiendas
        .filter(e => e.estadoPago && e.estadoPago !== "PAGADO")
        .reduce((s, e) => s + (Number(e.precio) || 0), 0);

    const descargarPdf = async () => {
        if (!viajeSeleccionado || encomiendas.length === 0) return;
        setGenerandoPdf(true);
        try {
            const enCarpeta = await generarManifiestoCargaPDF(viajeSeleccionado, encomiendas);
            avisarGuardado(mostrarToast, enCarpeta, "Manifiesto de carga", CARPETAS.MANIFIESTOS);
        }
        finally { setGenerandoPdf(false); }
    };

    return (
        <div className="manifiesto-page">

            <div className="manifiesto-header">
                <div>
                    <h2>Manifiesto de Carga</h2>
                    <p>Encomiendas que lleva cada viaje y en qué parada baja cada bulto</p>
                </div>
                {viajeSeleccionado && encomiendas.length > 0 && (
                    <button className="btn-descargar" onClick={descargarPdf} disabled={generandoPdf}>
                        {generandoPdf
                            ? <><i className="ti ti-loader-2 spin"></i> Generando...</>
                            : <><i className="ti ti-file-download"></i> Descargar PDF</>}
                    </button>
                )}
            </div>

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

            {!viajeId && (
                <div className="manifiesto-vacio">
                    <i className="ti ti-package"></i>
                    <span>Selecciona un viaje para ver su carga</span>
                </div>
            )}

            {cargando && (
                <div className="manifiesto-estado">
                    <i className="ti ti-loader-2 spin"></i>
                    <span>Cargando encomiendas...</span>
                </div>
            )}

            {error && !cargando && (
                <div className="manifiesto-estado error">
                    <i className="ti ti-alert-circle"></i>
                    <span>{error}</span>
                </div>
            )}

            {!cargando && !error && viajeSeleccionado && (
                <>
                    {/* Cuatro recuadros de ficha y cuatro tarjetas de colores para
                        ocho datos cortos: el viaje se identifica en dos renglones,
                        igual que en el manifiesto de pasajeros. */}
                    <div className="viaje-ficha">
                        <div className="ficha-identidad">
                            <strong className="ficha-codigo">{viajeSeleccionado.codigoViaje}</strong>
                            <span className="ficha-ruta">
                                {viajeSeleccionado.origen}
                                <i className="ti ti-arrow-right"></i>
                                {viajeSeleccionado.destino}
                            </span>
                        </div>
                        <div className="ficha-datos">
                            <span>
                                <i className="ti ti-calendar-event"></i>
                                {fechaLarga(viajeSeleccionado.fechaSalida)} · {(viajeSeleccionado.horaSalida || "").slice(0, 5)}
                            </span>
                            <span>
                                <i className="ti ti-ship"></i>
                                {viajeSeleccionado.embarcacionNombre}
                            </span>
                        </div>
                    </div>

                    {encomiendas.length === 0 ? (
                        <div className="manifiesto-vacio">
                            <i className="ti ti-package-off"></i>
                            <span>Todavía no se asignó ninguna encomienda a este viaje</span>
                        </div>
                    ) : (
                        <>
                        {/* Lo que la tripulación necesita saber antes de zarpar:
                            cuántos bultos van y cuánto hay que cobrar al entregar.
                            "Por cobrar" era una tarjeta más entre cuatro iguales. */}
                        <div className="resumen-barra">
                            <div className="resumen-dato">
                                <strong>{totalBultos}</strong>
                                <span>{totalBultos === 1 ? "bulto" : "bultos"}</span>
                            </div>
                            {pesoTotal > 0 && (
                                <div className="resumen-dato">
                                    <strong>{pesoTotal.toFixed(1)}</strong>
                                    <span>kg en total</span>
                                </div>
                            )}
                            <div className="resumen-dato resumen-plata">
                                <strong>S/ {montoTotal.toFixed(2)}</strong>
                                <span>en flete</span>
                            </div>
                            {porCobrar > 0 && (
                                <div className="resumen-dato resumen-cobrar">
                                    <strong>S/ {porCobrar.toFixed(2)}</strong>
                                    <span>por cobrar al entregar</span>
                                </div>
                            )}
                        </div>
                        <div className="manifiesto-tabla-wrapper">
                            <table className="manifiesto-tabla">
                                <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Código</th>
                                    <th>Remitente</th>
                                    <th>Destinatario</th>
                                    <th>Contenido</th>
                                    <th>Peso</th>
                                    <th>Baja en</th>
                                    <th>Precio</th>
                                    <th>Pago</th>
                                    <th>Estado</th>
                                </tr>
                                </thead>
                                <tbody>
                                {encomiendas.map((e, i) => (
                                    <tr key={e.id}>
                                        <td className="col-numero" data-label="#">{i + 1}</td>
                                        <td className="codigo" data-label="Código"><strong>{e.codigoEncomienda}</strong></td>
                                        <td data-label="Remitente">
                                            <div className="pasajero-info">
                                                <strong>{e.remitenteNombre}</strong>
                                                {e.remitenteTelefono && <span>{e.remitenteTelefono}</span>}
                                            </div>
                                        </td>
                                        <td data-label="Destinatario">
                                            <div className="pasajero-info">
                                                <strong>{e.destinatarioNombre}</strong>
                                                {e.destinatarioTelefono && <span>{e.destinatarioTelefono}</span>}
                                            </div>
                                        </td>
                                        <td className="col-observacion" data-label="Contenido">{e.descripcion || "—"}</td>
                                        <td data-label="Peso">{e.peso ? `${e.peso} kg` : "—"}</td>
                                        <td data-label="Baja en">
                                            <strong>{e.paradaDestino || e.sucursalDestinoNombre || "—"}</strong>
                                        </td>
                                        <td data-label="Precio"><strong>S/ {Number(e.precio || 0).toFixed(2)}</strong></td>
                                        <td data-label="Pago">
                                            <span className={`badge ${e.estadoPago === "PAGADO" ? "badge-embarcado" : "badge-pendiente"}`}>
                                                {PAGO_LABEL[e.estadoPago] || "Pagado"}
                                            </span>
                                        </td>
                                        <td data-label="Estado">
                                            <span className={`badge ${ESTADO_BADGE[e.estado] || "badge-pendiente"}`}>
                                                {ESTADO_LABEL[e.estado] || e.estado}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                        </>
                    )}
                </>
            )}
            <Toasts toasts={toasts} />
        </div>
    );
}

export default ManifiestoCarga;
