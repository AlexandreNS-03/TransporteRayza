import { useState } from "react";
import "./Rastreo.css";
import "./PagaCarga.css";
import Header from "../components/Header";
import Footer from "../components/Footer";
import EscanerQR from "../components/EscanerQR";
import { rastrearEncomienda } from "../services/publicApi";

const PAGO = {
    PAGADO:       { label: "Pagado",            clase: "pago-ok",   icono: "ti-circle-check", desc: "Esta encomienda ya está pagada. No necesitas hacer nada más." },
    PENDIENTE:    { label: "Pendiente de pago", clase: "pago-pend", icono: "ti-clock",        desc: "Esta encomienda tiene el pago pendiente." },
    PAGA_DESTINO: { label: "Paga en destino",   clase: "pago-dest", icono: "ti-map-pin",      desc: "El pago se realiza al recoger la encomienda en la oficina de destino." },
};

function PagaCarga() {
    const [codigo, setCodigo]       = useState("");
    const [enc, setEnc]             = useState(null);
    const [cargando, setCargando]   = useState(false);
    const [error, setError]         = useState(null);
    const [escaner, setEscaner]     = useState(false);

    const buscar = async (valor = codigo) => {
        if (!String(valor).trim()) return;
        setCargando(true); setError(null); setEnc(null);
        try {
            const data = await rastrearEncomienda("codigo", valor);
            setEnc(Array.isArray(data) ? data[0] : data);
        } catch {
            setError("No se encontró una encomienda con ese código. Verifica e intenta de nuevo.");
        } finally { setCargando(false); }
    };

    const alEscanear = (texto) => {
        setEscaner(false);
        const c = texto.includes("/") ? texto.split("/").filter(Boolean).pop() : texto;
        setCodigo(c); buscar(c);
    };

    const info = enc ? (PAGO[enc.estadoPago] || PAGO.PENDIENTE) : null;

    return (
        <>
            <Header />
            <div className="rastreo-page">
                <div className="rastreo-hero">
                    <div className="rastreo-hero-inner">
                        <i className="ti ti-cash rastreo-hero-icono"></i>
                        <h1>Paga tu Carga</h1>
                        <p>Ingresa el código de tu encomienda para ver el estado de tu pago.</p>

                        <div className="rastreo-buscador">
                            <div className="rastreo-input-row">
                                <input type="text" placeholder="Ej: ENC-000123" value={codigo}
                                       onChange={e => setCodigo(e.target.value)}
                                       onKeyDown={e => e.key === "Enter" && buscar()} />
                                <button className="rastreo-btn-qr" onClick={() => setEscaner(true)}
                                        title="Escanear QR del ticket" aria-label="Escanear QR">
                                    <i className="ti ti-qrcode"></i>
                                </button>
                                <button className="rastreo-btn" onClick={() => buscar()} disabled={cargando}>
                                    {cargando ? <i className="ti ti-loader-2 spin"></i> : <><i className="ti ti-search"></i> Buscar</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rastreo-resultados">
                    {error && (
                        <div className="rastreo-error"><i className="ti ti-alert-circle"></i><p>{error}</p></div>
                    )}

                    {enc && (
                        <div className="enc-card">
                            <div className="enc-card-header">
                                <div className="enc-codigo"><i className="ti ti-package"></i><span>{enc.codigoEncomienda}</span></div>
                                <span className={`pago-badge ${info.clase}`}><i className={`ti ${info.icono}`}></i> {info.label}</span>
                            </div>

                            <div className="paga-monto">
                                <span>Monto</span>
                                <strong>S/ {Number(enc.precio || 0).toFixed(2)}</strong>
                            </div>

                            <p className="estado-desc">{info.desc}</p>

                            <div className="enc-grid">
                                <div className="enc-seccion">
                                    <p className="enc-seccion-titulo"><i className="ti ti-user"></i> Remitente</p>
                                    <p className="enc-nombre">{enc.remitenteNombre}</p>
                                </div>
                                <div className="enc-seccion">
                                    <p className="enc-seccion-titulo"><i className="ti ti-user-check"></i> Destinatario</p>
                                    <p className="enc-nombre">{enc.destinatarioNombre}</p>
                                </div>
                            </div>

                            {enc.estadoPago === "PENDIENTE" && (
                                <div className="paga-accion">
                                    <button className="rastreo-btn" disabled>
                                        <i className="ti ti-credit-card"></i> Pagar en línea (próximamente)
                                    </button>
                                    <p className="paga-nota">Por ahora, acércate a cualquier agencia Rayza para completar el pago.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {escaner && <EscanerQR onDetectar={alEscanear} onCerrar={() => setEscaner(false)} />}
            <Footer />
        </>
    );
}

export default PagaCarga;
