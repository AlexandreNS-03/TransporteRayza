import { useState } from "react";
import "./Rastreo.css";
import Header from "../components/Header";
import Footer from "../components/Footer";
import EscanerQR from "../components/EscanerQR";
import { rastrearEncomienda } from "../services/publicApi";

const ESTADOS = ["REGISTRADO", "EN_TRANSITO", "ENTREGADO", "DEVUELTO"];
const ESTADO_LABEL = {
    REGISTRADO:  "Registrado",
    EN_TRANSITO: "En Tránsito",
    ENTREGADO:   "Entregado",
    DEVUELTO:    "Devuelto",
};
const ESTADO_DESC = {
    REGISTRADO:  "Tu encomienda ha sido registrada en nuestra oficina y está lista para ser enviada.",
    EN_TRANSITO: "Tu encomienda está en camino a su destino a bordo de nuestra embarcación.",
    ENTREGADO:   "Tu encomienda ha sido entregada exitosamente al destinatario.",
    DEVUELTO:    "Tu encomienda fue devuelta a la sucursal de origen.",
};

const TABS = [
    { id: "codigo",       label: "Código",           placeholder: "Ej: ENC-000001", icono: "ti-hash" },
    { id: "remitente",    label: "Doc. Remitente",   placeholder: "Ej: 45678901",   icono: "ti-user" },
    { id: "destinatario", label: "Doc. Destinatario", placeholder: "Ej: 52341678",  icono: "ti-user-check" },
];

function EstadoTimeline({ estado }) {
    const idx = ESTADOS.indexOf(estado);
    return (
        <div className="timeline">
            {ESTADOS.map((e, i) => (
                <div key={e} className={`timeline-paso ${i <= idx ? "completado" : ""} ${e === estado ? "activo" : ""}`}>
                    <div className="timeline-circulo">
                        {i < idx ? <i className="ti ti-check"></i> : i + 1}
                    </div>
                    <div className="timeline-info">
                        <span className="timeline-label">{ESTADO_LABEL[e]}</span>
                    </div>
                    {i < ESTADOS.length - 1 && (
                        <div className={`timeline-linea ${i < idx ? "completada" : ""}`}></div>
                    )}
                </div>
            ))}
        </div>
    );
}

function TarjetaEncomienda({ enc }) {
    return (
        <div className="enc-card">
            <div className="enc-card-header">
                <div className="enc-codigo">
                    <i className="ti ti-package"></i>
                    <span>{enc.codigoEncomienda}</span>
                </div>
                <span className={`estado-badge estado-${enc.estado?.toLowerCase()}`}>
                    {ESTADO_LABEL[enc.estado]}
                </span>
            </div>

            <EstadoTimeline estado={enc.estado} />

            <p className="estado-desc">{ESTADO_DESC[enc.estado]}</p>

            {(enc.estado === "REGISTRADO" || enc.estado === "EN_TRANSITO") && (
                <p className="enc-recojo-nota">
                    <i className="ti ti-shield-lock"></i>
                    Para el recojo, el destinatario debe presentar su <strong>documento de identidad</strong> y la <strong>clave de seguridad de 4 dígitos</strong> que le dio el remitente.
                </p>
            )}

            <div className="enc-grid">
                <div className="enc-seccion">
                    <p className="enc-seccion-titulo"><i className="ti ti-user"></i> Remitente</p>
                    <p className="enc-nombre">{enc.remitenteNombre}</p>
                    {enc.remitenteDocumento && <p className="enc-detalle">Doc: {enc.remitenteDocumento}</p>}
                    {enc.remitenteTelefono  && <p className="enc-detalle">Tel: {enc.remitenteTelefono}</p>}
                </div>
                <div className="enc-seccion">
                    <p className="enc-seccion-titulo"><i className="ti ti-user-check"></i> Destinatario</p>
                    <p className="enc-nombre">{enc.destinatarioNombre}</p>
                    {enc.destinatarioDocumento && <p className="enc-detalle">Doc: {enc.destinatarioDocumento}</p>}
                    {enc.destinatarioTelefono  && <p className="enc-detalle">Tel: {enc.destinatarioTelefono}</p>}
                </div>
            </div>

            <div className="enc-ruta">
                <div className="enc-ruta-punto">
                    <i className="ti ti-map-pin" style={{ color: "#1a4db5" }}></i>
                    <div>
                        <span className="enc-ruta-label">Origen</span>
                        <strong>{enc.sucursalOrigenNombre || "—"}</strong>
                    </div>
                </div>
                <div className="enc-ruta-linea"></div>
                <div className="enc-ruta-punto">
                    <i className="ti ti-map-pin" style={{ color: "#15803d" }}></i>
                    <div>
                        <span className="enc-ruta-label">Destino</span>
                        <strong>{enc.sucursalDestinoNombre || "—"}</strong>
                    </div>
                </div>
            </div>

            {enc.viajeDescripcion && (
                <div className="enc-viaje">
                    <i className="ti ti-ship"></i>
                    <span>{enc.viajeDescripcion}</span>
                </div>
            )}

            <div className="enc-detalles">
                {enc.descripcion && (
                    <div className="enc-detalle-item">
                        <span>Descripción</span>
                        <strong>{enc.descripcion}</strong>
                    </div>
                )}
                {enc.peso && (
                    <div className="enc-detalle-item">
                        <span>Peso</span>
                        <strong>{enc.peso} kg</strong>
                    </div>
                )}
                <div className="enc-detalle-item">
                    <span>Precio</span>
                    <strong>S/ {enc.precio}</strong>
                </div>
                <div className="enc-detalle-item">
                    <span>Fecha Registro</span>
                    <strong>{enc.fechaRegistro}</strong>
                </div>
            </div>
        </div>
    );
}

function Rastreo() {
    const [tabActivo, setTab]       = useState("codigo");
    const [busqueda, setBusqueda]   = useState("");
    const [resultado, setResultado] = useState(null);
    const [cargando, setCargando]   = useState(false);
    const [error, setError]         = useState(null);
    const [escanerAbierto, setEscanerAbierto] = useState(false);

    const buscar = async (tab = tabActivo, valor = busqueda) => {
        if (!String(valor).trim()) return;
        setCargando(true);
        setError(null);
        setResultado(null);
        try {
            const data = await rastrearEncomienda(tab, valor);
            setResultado(data);
        } catch {
            setError("No se encontró ninguna encomienda con ese dato. Verifica e intenta de nuevo.");
        } finally {
            setCargando(false);
        }
    };

    // El QR del ticket contiene el código de la encomienda. Al leerlo, busca directo.
    const alEscanear = (texto) => {
        setEscanerAbierto(false);
        const codigo = texto.includes("/") ? texto.split("/").filter(Boolean).pop() : texto;
        setTab("codigo");
        setBusqueda(codigo);
        buscar("codigo", codigo);
    };

    const tabActual = TABS.find(t => t.id === tabActivo);

    return (
        <>
            <Header />

            <div className="rastreo-page">
                {/* HERO */}
                <div className="rastreo-hero">
                    <div className="rastreo-hero-inner">
                        <i className="ti ti-package rastreo-hero-icono"></i>
                        <h1>Rastrea tu Encomienda</h1>
                        <p>Ingresa el código, o el número de documento del remitente o destinatario para conocer el estado de tu encomienda.</p>

                        {/* BUSCADOR */}
                        <div className="rastreo-buscador">
                            <div className="rastreo-tabs">
                                {TABS.map(t => (
                                    <button
                                        key={t.id}
                                        className={`rastreo-tab ${tabActivo === t.id ? "activo" : ""}`}
                                        onClick={() => { setTab(t.id); setBusqueda(""); setResultado(null); setError(null); }}
                                    >
                                        <i className={`ti ${t.icono}`}></i> {t.label}
                                    </button>
                                ))}
                            </div>
                            <div className="rastreo-input-row">
                                <input
                                    type="text"
                                    placeholder={tabActual?.placeholder}
                                    value={busqueda}
                                    onChange={e => setBusqueda(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && buscar()}
                                />
                                {tabActivo === "codigo" && (
                                    <button className="rastreo-btn-qr" onClick={() => setEscanerAbierto(true)}
                                            title="Escanear QR del ticket" aria-label="Escanear QR">
                                        <i className="ti ti-qrcode"></i>
                                    </button>
                                )}
                                <button className="rastreo-btn" onClick={() => buscar()} disabled={cargando}>
                                    {cargando
                                        ? <i className="ti ti-loader-2 spin"></i>
                                        : <><i className="ti ti-search"></i> Buscar</>
                                    }
                                </button>
                            </div>

                            {tabActivo === "codigo" && (
                                <div className="rastreo-ejemplo">
                                    <span className="rastreo-ejemplo-txt">
                                        <i className="ti ti-info-circle"></i> El <strong>código</strong> está en tu ticket de encomienda:
                                    </span>
                                    <div className="ticket-mini">
                                        <div className="ticket-mini-marca">TRANSPORTES RAYZA · Ticket de encomienda</div>
                                        <div className="ticket-mini-codigo">
                                            <span>CÓDIGO</span>
                                            <strong>ENC-000123</strong>
                                            <i className="ti ti-qrcode ticket-mini-qr"></i>
                                        </div>
                                        <div className="ticket-mini-flecha"><i className="ti ti-arrow-up"></i> aquí</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* RESULTADOS */}
                <div className="rastreo-resultados">
                    {error && (
                        <div className="rastreo-error">
                            <i className="ti ti-alert-circle"></i>
                            <p>{error}</p>
                        </div>
                    )}

                    {resultado && (
                        Array.isArray(resultado)
                            ? resultado.map(enc => <TarjetaEncomienda key={enc.codigoEncomienda} enc={enc} />)
                            : <TarjetaEncomienda enc={resultado} />
                    )}
                </div>
            </div>

            {escanerAbierto && (
                <EscanerQR onDetectar={alEscanear} onCerrar={() => setEscanerAbierto(false)} />
            )}

            <Footer />
        </>
    );
}

export default Rastreo;
