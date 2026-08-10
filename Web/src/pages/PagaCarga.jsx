import { useState, useEffect, lazy, Suspense } from "react";
import "./Rastreo.css";
import "./PagaCarga.css";
import Header from "../components/Header";
import Footer from "../components/Footer";
import {
    rastrearEncomienda, metodosDePago, formularioPagoEncomienda,
    pagarEncomienda, pagarEncomiendaYape,
} from "../services/publicApi";
import { pagarConIzipay, limpiarIzipay } from "../services/izipay";
import { tokenizarYape } from "../services/yape";

// El lector de QR arrastra la librería que decodifica la imagen: se descarga
// recién cuando alguien abre la cámara, no al entrar a la página.
const EscanerQR = lazy(() => import("../components/EscanerQR"));

const PAGO = {
    PAGADO:       { label: "Pagado",            clase: "pago-ok",   icono: "ti-circle-check", desc: "Esta encomienda ya está pagada. No necesitas hacer nada más." },
    PENDIENTE:    { label: "Pendiente de pago", clase: "pago-pend", icono: "ti-clock",        desc: "Esta encomienda tiene el pago pendiente. Puedes pagarla aquí mismo." },
    PAGA_DESTINO: { label: "Paga en destino",   clase: "pago-dest", icono: "ti-map-pin",      desc: "El pago se realiza al recoger la encomienda en la oficina de destino. Si prefieres, puedes adelantarlo aquí." },
};

function PagaCarga() {
    const [codigo, setCodigo]     = useState("");
    const [enc, setEnc]           = useState(null);
    const [cargando, setCargando] = useState(false);
    const [error, setError]       = useState(null);
    const [escaner, setEscaner]   = useState(false);

    // Pago
    const [metodos, setMetodos]           = useState(null);
    const [medio, setMedio]               = useState(null);      // "tarjeta" | "yape"
    const [pagando, setPagando]           = useState(false);
    const [errorPago, setErrorPago]       = useState(null);
    const [formVisible, setFormVisible]   = useState(false);
    const [yapeDatos, setYapeDatos]       = useState({ otp: "", phoneNumber: "" });
    const [pagado, setPagado]             = useState(false);

    useEffect(() => { metodosDePago().then(setMetodos).catch(() => setMetodos(null)); }, []);

    const buscar = async (valor = codigo) => {
        if (!String(valor).trim()) return;
        setCargando(true); setError(null); setEnc(null);
        setMedio(null); setErrorPago(null); setPagado(false);
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

    const terminar = (actualizada) => {
        setEnc(actualizada);
        setPagado(true);
        setMedio(null);
    };

    const pagarTarjeta = async () => {
        setPagando(true); setErrorPago(null);
        try {
            const form = await formularioPagoEncomienda(enc.codigoEncomienda);
            const respuesta = await pagarConIzipay({
                ...form, contenedor: "#izipay-form-enc",
                alMostrarFormulario: () => setFormVisible(true),
            });
            setFormVisible(false);
            const actualizada = await pagarEncomienda(enc.codigoEncomienda, respuesta);
            limpiarIzipay("#izipay-form-enc");
            terminar(actualizada);
        } catch (e) {
            setErrorPago(e.message); setFormVisible(false); limpiarIzipay("#izipay-form-enc");
        } finally { setPagando(false); }
    };

    const pagarYape = async () => {
        setPagando(true); setErrorPago(null);
        try {
            const cfg = metodos?.yape || {};
            const token = await tokenizarYape({
                publicKey: cfg.publicKey, simulado: cfg.simulado,
                otp: yapeDatos.otp.trim(), phoneNumber: yapeDatos.phoneNumber.trim(),
            });
            terminar(await pagarEncomiendaYape(enc.codigoEncomienda, token));
        } catch (e) { setErrorPago(e.message); }
        finally { setPagando(false); }
    };

    const info = enc ? (PAGO[enc.estadoPago] || PAGO.PENDIENTE) : null;
    const puedePagar = enc && enc.estadoPago !== "PAGADO";

    return (
        <>
            <Header />
            <div className="rastreo-page">
                <div className="rastreo-hero">
                    <div className="rastreo-hero-inner">
                        <i className="ti ti-cash rastreo-hero-icono"></i>
                        <h1>Paga tu Carga</h1>
                        <p>Ingresa el código de tu encomienda para ver el estado de tu pago y pagarla en línea.</p>

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

                            {pagado && (
                                <div className="paga-exito">
                                    <i className="ti ti-circle-check"></i>
                                    <div>
                                        <strong>¡Pago realizado!</strong>
                                        <span>Tu encomienda quedó pagada. Guarda tu código {enc.codigoEncomienda}.</span>
                                    </div>
                                </div>
                            )}

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

                            {puedePagar && !pagado && (
                                <div className="paga-accion">
                                    {!medio && (
                                        <>
                                            <p className="paga-titulo">¿Cómo quieres pagar?</p>
                                            <div className="paga-medios">
                                                <button className="paga-medio" onClick={() => { setMedio("tarjeta"); setErrorPago(null); }}>
                                                    <i className="ti ti-credit-card"></i>
                                                    <strong>Tarjeta</strong>
                                                    <span>Débito o crédito</span>
                                                </button>
                                                <button className="paga-medio" onClick={() => { setMedio("yape"); setErrorPago(null); }}>
                                                    <i className="ti ti-device-mobile"></i>
                                                    <strong>Yape</strong>
                                                    <span>Con tu celular</span>
                                                </button>
                                            </div>
                                        </>
                                    )}

                                    {medio === "tarjeta" && (
                                        <div className="paga-form">
                                            <button className="paga-volver" onClick={() => { setMedio(null); limpiarIzipay("#izipay-form-enc"); setFormVisible(false); }}>
                                                <i className="ti ti-arrow-left"></i> Cambiar método
                                            </button>
                                            {!formVisible && (
                                                <button className="rastreo-btn paga-btn" onClick={pagarTarjeta} disabled={pagando}>
                                                    {pagando ? <><i className="ti ti-loader-2 spin"></i> Procesando...</>
                                                             : <><i className="ti ti-credit-card"></i> Pagar S/ {Number(enc.precio).toFixed(2)}</>}
                                                </button>
                                            )}
                                            <div id="izipay-form-enc" style={{ marginTop: 14 }} />
                                        </div>
                                    )}

                                    {medio === "yape" && (
                                        <div className="paga-form">
                                            <button className="paga-volver" onClick={() => setMedio(null)}>
                                                <i className="ti ti-arrow-left"></i> Cambiar método
                                            </button>
                                            {metodos?.yape?.prueba && (
                                                <p className="paga-nota">Modo de prueba: usa los celulares de prueba de Mercado Pago.</p>
                                            )}
                                            <div className="paga-campo">
                                                <label>Número de celular (Yape)</label>
                                                <input type="tel" inputMode="numeric" placeholder="999888777"
                                                       value={yapeDatos.phoneNumber}
                                                       onChange={e => setYapeDatos(p => ({ ...p, phoneNumber: e.target.value }))} />
                                            </div>
                                            <div className="paga-campo">
                                                <label>Código de aprobación (6 dígitos)</label>
                                                <input type="text" inputMode="numeric" maxLength={6} placeholder="******"
                                                       value={yapeDatos.otp}
                                                       onChange={e => setYapeDatos(p => ({ ...p, otp: e.target.value.replace(/\D/g, "").slice(0, 6) }))} />
                                                <span className="paga-ayuda">Lo generas en tu app de Yape → "Pagar servicio".</span>
                                            </div>
                                            <button className="rastreo-btn paga-btn" onClick={pagarYape} disabled={pagando}>
                                                {pagando ? <><i className="ti ti-loader-2 spin"></i> Procesando...</>
                                                         : <><i className="ti ti-device-mobile"></i> Pagar S/ {Number(enc.precio).toFixed(2)}</>}
                                            </button>
                                        </div>
                                    )}

                                    {errorPago && (
                                        <div className="rastreo-error" style={{ marginTop: 12 }}>
                                            <i className="ti ti-alert-circle"></i><p>{errorPago}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {escaner && (
              <Suspense fallback={null}>
                <EscanerQR onDetectar={alEscanear} onCerrar={() => setEscaner(false)} />
              </Suspense>
            )}
            <Footer />
        </>
    );
}

export default PagaCarga;
