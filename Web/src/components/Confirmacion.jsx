import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Link } from "react-router-dom";
import { soles, getTicket } from "../services/publicApi";

/** Un boleto con su QR (uno por pasajero). El botón descarga el ticket de embarque 80mm. */
function Boleto({ b }) {
  const [qr, setQr] = useState(null);
  const [bajando, setBajando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (b?.codigoQr) QRCode.toDataURL(b.codigoQr, { width: 220, margin: 1 }).then(setQr).catch(() => setQr(null));
  }, [b]);

  const descargar = async () => {
    setBajando(true); setError(null);
    try {
      const t = await getTicket(b.ventaId);
      // Se descarga jsPDF recién ahora: pesa más que el resto de la página junta
      // y la mayoría de la gente nunca toca este botón.
      const { generarTicket80mm } = await import("../Utils/generarTicket80mm");
      await generarTicket80mm(t);
    } catch (e) {
      setError("No se pudo generar el ticket. Intenta de nuevo.");
    } finally {
      setBajando(false);
    }
  };

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
          <button type="button" className="btn btn-primary btn-sm" onClick={descargar} disabled={bajando}>
            {bajando ? "Generando…" : "Descargar ticket"}
          </button>
        </div>
        {error && <p className="muted" style={{ fontSize: 13, color: "var(--accent)" }}>{error}</p>}
      </div>
    </div>
  );
}

/**
 * Confirmación de la compra. `data` puede traer un solo boleto (compra de 1 pasaje)
 * o una lista `pasajeros` (compra de varios): en ambos casos se muestra un QR por
 * pasajero, porque cada uno embarca con el suyo, y se puede descargar el ticket 80mm.
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
          ? `Te enviamos ${boletos.length > 1 ? "los boletos" : "el boleto"} a tu correo. Descarga tu ticket para embarcar.`
          : `Descarga ${boletos.length > 1 ? "tus tickets" : "tu ticket"} para embarcar.`}
        {" "}La boleta o factura llega por correo.
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
      <p className="muted" style={{ marginTop: 14, fontSize: 13 }}>Presenta el QR del ticket al momento de embarcar.</p>
    </div>
  );
}
