import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import "./EscanerQR.css";

/**
 * Escáner de código QR con la cámara. Muestra el video en vivo con un
 * recuadro de guía y detecta el QR automáticamente. Al leer uno válido
 * llama a onDetectar(texto) una sola vez y se cierra.
 *
 * Props:
 *   - onDetectar(texto): callback con el contenido del QR leído.
 *   - onCerrar(): cierra el escáner sin leer nada.
 */
function EscanerQR({ onDetectar, onCerrar }) {
    const videoRef  = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const rafRef    = useRef(null);
    const leidoRef  = useRef(false);   // evita disparar onDetectar más de una vez

    const [error, setError]     = useState(null);
    const [iniciando, setIniciando] = useState(true);

    useEffect(() => {
        let cancelado = false;

        const iniciar = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: { ideal: "environment" } },
                    audio: false,
                });
                if (cancelado) { detenerStream(stream); return; }
                streamRef.current = stream;
                const video = videoRef.current;
                if (video) {
                    video.srcObject = stream;
                    video.setAttribute("playsinline", "true"); // iOS: no abrir en pantalla completa
                    await video.play();
                    setIniciando(false);
                    rafRef.current = requestAnimationFrame(escanearFrame);
                }
            } catch (err) {
                if (cancelado) return;
                setIniciando(false);
                if (err?.name === "NotAllowedError")
                    setError("Diste permiso de cámara denegado. Actívalo en el navegador y reintenta.");
                else if (err?.name === "NotFoundError")
                    setError("No se encontró una cámara en este dispositivo.");
                else
                    setError("No se pudo abrir la cámara: " + (err?.message || "error desconocido"));
            }
        };

        iniciar();
        return () => {
            cancelado = true;
            cancelAnimationFrame(rafRef.current);
            detenerStream(streamRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const detenerStream = (stream) => {
        if (stream) stream.getTracks().forEach(t => t.stop());
    };

    const escanearFrame = () => {
        const video  = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
            rafRef.current = requestAnimationFrame(escanearFrame);
            return;
        }
        const w = video.videoWidth, h = video.videoHeight;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(video, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);
        const codigo = jsQR(imageData.data, w, h, { inversionAttempts: "dontInvert" });

        if (codigo && codigo.data && !leidoRef.current) {
            leidoRef.current = true;
            cancelAnimationFrame(rafRef.current);
            detenerStream(streamRef.current);
            onDetectar(codigo.data.trim());
            return;
        }
        rafRef.current = requestAnimationFrame(escanearFrame);
    };

    return (
        <div className="qr-overlay" onClick={onCerrar}>
            <div className="qr-modal" onClick={e => e.stopPropagation()}>
                <div className="qr-modal-header">
                    <h3><i className="ti ti-qrcode"></i> Escanear QR del ticket</h3>
                    <button className="qr-cerrar" onClick={onCerrar} aria-label="Cerrar">
                        <i className="ti ti-x"></i>
                    </button>
                </div>

                <div className="qr-video-wrap">
                    <video ref={videoRef} className="qr-video" muted playsInline />
                    {/* Recuadro de guía */}
                    {!error && (
                        <div className="qr-marco">
                            <span className="qr-esq qr-esq-tl"></span>
                            <span className="qr-esq qr-esq-tr"></span>
                            <span className="qr-esq qr-esq-bl"></span>
                            <span className="qr-esq qr-esq-br"></span>
                            <div className="qr-linea"></div>
                        </div>
                    )}
                    {iniciando && !error && (
                        <div className="qr-estado">
                            <i className="ti ti-loader-2 spin"></i>
                            <span>Abriendo cámara...</span>
                        </div>
                    )}
                    {error && (
                        <div className="qr-estado qr-error">
                            <i className="ti ti-camera-off"></i>
                            <span>{error}</span>
                        </div>
                    )}
                </div>

                <p className="qr-ayuda">Apunta la cámara al código QR del boleto. Se detecta solo.</p>

                <canvas ref={canvasRef} style={{ display: "none" }} />
            </div>
        </div>
    );
}

export default EscanerQR;
