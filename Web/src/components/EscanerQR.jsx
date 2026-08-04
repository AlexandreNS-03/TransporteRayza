import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import "./EscanerQR.css";

/**
 * Escáner de QR con la cámara. Al leer un código válido llama a onDetectar(texto)
 * una sola vez y se cierra. Pensado para móviles (cámara trasera).
 */
export default function EscanerQR({ onDetectar, onCerrar }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const leidoRef = useRef(false);
  const [error, setError] = useState(null);
  const [iniciando, setIniciando] = useState(true);

  useEffect(() => {
    let cancelado = false;
    const detener = (s) => { if (s) s.getTracks().forEach((t) => t.stop()); };

    const escanear = () => {
      const video = videoRef.current, canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
        rafRef.current = requestAnimationFrame(escanear);
        return;
      }
      const w = video.videoWidth, h = video.videoHeight;
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(video, 0, 0, w, h);
      const code = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "dontInvert" });
      if (code && code.data && !leidoRef.current) {
        leidoRef.current = true;
        cancelAnimationFrame(rafRef.current);
        detener(streamRef.current);
        onDetectar(code.data.trim());
        return;
      }
      rafRef.current = requestAnimationFrame(escanear);
    };

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } }, audio: false,
        });
        if (cancelado) { detener(stream); return; }
        streamRef.current = stream;
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          v.setAttribute("playsinline", "true");
          await v.play();
          setIniciando(false);
          rafRef.current = requestAnimationFrame(escanear);
        }
      } catch (err) {
        if (cancelado) return;
        setIniciando(false);
        if (err?.name === "NotAllowedError") setError("Permiso de cámara denegado. Actívalo en el navegador.");
        else if (err?.name === "NotFoundError") setError("No se encontró una cámara en este dispositivo.");
        else setError("No se pudo abrir la cámara.");
      }
    })();

    return () => { cancelado = true; cancelAnimationFrame(rafRef.current); detener(streamRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="qr-overlay" onClick={onCerrar}>
      <div className="qr-modal" onClick={(e) => e.stopPropagation()}>
        <div className="qr-modal-header">
          <h3><i className="ti ti-qrcode"></i> Escanear código</h3>
          <button className="qr-cerrar" onClick={onCerrar} aria-label="Cerrar"><i className="ti ti-x"></i></button>
        </div>
        <div className="qr-video-wrap">
          <video ref={videoRef} className="qr-video" muted playsInline />
          {!error && (
            <div className="qr-marco">
              <span className="qr-esq qr-esq-tl"></span><span className="qr-esq qr-esq-tr"></span>
              <span className="qr-esq qr-esq-bl"></span><span className="qr-esq qr-esq-br"></span>
              <div className="qr-linea"></div>
            </div>
          )}
          {iniciando && !error && <div className="qr-estado"><i className="ti ti-loader-2 spin"></i><span>Abriendo cámara...</span></div>}
          {error && <div className="qr-estado qr-error"><i className="ti ti-camera-off"></i><span>{error}</span></div>}
        </div>
        <p className="qr-ayuda">Apunta al código QR del ticket de tu encomienda.</p>
        <canvas ref={canvasRef} style={{ display: "none" }} />
      </div>
    </div>
  );
}
