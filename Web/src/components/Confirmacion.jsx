import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Link } from "react-router-dom";
import { soles } from "../services/publicApi";
import { EMPRESA } from "../datos";

/**
 * Dibuja el boleto (QR + datos) en un canvas y lo descarga como PNG. No depende de
 * Nubefact: sirve aunque la venta sea solo ticket. `qr` es el data URL del QR.
 */
function descargarBoleto(b, qr) {
  const W = 560, H = 780;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  const pintar = (qrImg) => {
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#1ea6dd"; ctx.fillRect(0, 0, W, 92);
    ctx.textAlign = "center"; ctx.fillStyle = "#ffffff";
    ctx.font = "bold 30px Arial, sans-serif"; ctx.fillText(EMPRESA.nombreCorto || "Transportes Rayza", W / 2, 46);
    ctx.font = "16px Arial, sans-serif"; ctx.fillText("Boleto de viaje", W / 2, 74);

    if (qrImg) ctx.drawImage(qrImg, (W - 240) / 2, 118, 240, 240);

    let y = 408;
    const linea = (label, val) => {
      ctx.textAlign = "left"; ctx.fillStyle = "#64748b"; ctx.font = "15px Arial, sans-serif";
      ctx.fillText(label, 40, y);
      ctx.textAlign = "right"; ctx.fillStyle = "#0f172a"; ctx.font = "bold 18px Arial, sans-serif";
      ctx.fillText(String(val ?? "—"), W - 40, y);
      ctx.strokeStyle = "#eef2f7"; ctx.beginPath(); ctx.moveTo(40, y + 14); ctx.lineTo(W - 40, y + 14); ctx.stroke();
      y += 44;
    };
    linea("Pasajero", b.pasajeroNombre);
    linea("Ruta", b.ruta);
    linea("Fecha", `${b.fechaSalida || "—"}${b.horaSalida ? " · " + b.horaSalida.slice(0, 5) + " h" : ""}`);
    linea("Asiento", b.asiento);
    linea("Boleto", b.comprobante);
    if (b.comprobanteElectronico) linea("Comprobante", b.comprobanteElectronico);
    linea("Pagado", soles(b.precio));

    ctx.textAlign = "center"; ctx.fillStyle = "#64748b"; ctx.font = "14px Arial, sans-serif";
    ctx.fillText("Presenta este QR al momento de embarcar", W / 2, H - 28);

    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `boleto-${String(b.comprobante || "rayza").replace(/[^\w-]/g, "")}.png`;
    document.body.appendChild(a); a.click(); a.remove();
  };

  if (qr) { const img = new Image(); img.onload = () => pintar(img); img.onerror = () => pintar(null); img.src = qr; }
  else pintar(null);
}

/** Un boleto con su QR (uno por pasajero). */
function Boleto({ b }) {
  const [qr, setQr] = useState(null);
  useEffect(() => {
    if (b?.codigoQr) QRCode.toDataURL(b.codigoQr, { width: 220, margin: 1 }).then(setQr).catch(() => setQr(null));
  }, [b]);

  return (
    <div className="boleto">
      {qr && <img src={qr} alt="Código QR del boleto" className="boleto-qr" />}
      <div className="resumen" style={{ position: "static", boxShadow: "none", flex: 1 }}>
        <div className="linea"><span>Pasajero</span><span>{b.pasajeroNombre}</span></div>
        <div className="linea"><span>Ruta</span><span>{b.ruta}</span></div>
        <div className="linea"><span>Fecha</span><span>{b.fechaSalida || "—"} {b.horaSalida ? "· " + b.horaSalida.slice(0, 5) + " h" : ""}</span></div>
        <div className="linea"><span>Asiento</span><span>{b.asiento}</span></div>
        <div className="linea"><span>Boleto</span><span>{b.comprobante}</span></div>
        {b.comprobanteElectronico && (
          <div className="linea"><span>Comprobante</span><span>{b.comprobanteElectronico}</span></div>
        )}
        <div className="total"><span>Pagado</span><span>{soles(b.precio)}</span></div>
        <div className="boleto-acciones">
          <button type="button" className="btn btn-primary btn-sm" onClick={() => descargarBoleto(b, qr)}>
            Descargar boleto
          </button>
          {b.enlacePdf && (
            <a className="btn btn-ghost btn-sm" href={b.enlacePdf} target="_blank" rel="noreferrer">
              Descargar comprobante
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Confirmación de la compra. `data` puede traer un solo boleto (compra de 1 pasaje)
 * o una lista `pasajeros` (compra de varios): en ambos casos se muestra un QR por
 * pasajero, porque cada uno embarca con el suyo.
 */
export default function Confirmacion({ data }) {
  if (!data) return null;

  const boletos = data.pasajeros || [data];
  const total = data.montoTotal != null
    ? data.montoTotal
    : boletos.reduce((s, b) => s + Number(b.precio || 0), 0);
  const correo = data.correo || boletos[0]?.correo;

  return (
    <div className="card" style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
      <div style={{ fontSize: 46 }}>✅</div>
      <h3 style={{ fontSize: 24, marginBottom: 6 }}>{data.mensaje || "¡Pago realizado!"}</h3>
      <p className="muted">
        {data.correoEnviado
          ? `Te enviamos ${boletos.length > 1 ? "los boletos" : "el boleto"} a tu correo. También puedes descargarlos aquí.`
          : `Descarga ${boletos.length > 1 ? "tus boletos" : "tu boleto"}: no pudimos enviártelos por correo.`}
      </p>

      <div className="boletos-lista">
        {boletos.map((b, i) => <Boleto key={b.ventaId || i} b={b} />)}
      </div>

      {boletos.length > 1 && (
        <div className="total" style={{ maxWidth: 320, margin: "18px auto 0" }}>
          <span>Total pagado</span><span>{soles(total)}</span>
        </div>
      )}

      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 22, flexWrap: "wrap" }}>
        <Link className="btn btn-ghost" to="/comprar">Comprar otro pasaje</Link>
        <Link className="btn btn-primary" to={`/historial${correo ? "?correo=" + encodeURIComponent(correo) : ""}`}>Ver mis boletos</Link>
      </div>
      <p className="muted" style={{ marginTop: 14, fontSize: 13 }}>Presenta cada QR al momento de embarcar.</p>
    </div>
  );
}
