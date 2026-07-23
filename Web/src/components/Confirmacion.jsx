import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Link } from "react-router-dom";
import { soles } from "../services/publicApi";

export default function Confirmacion({ data }) {
  const [qr, setQr] = useState(null);

  useEffect(() => {
    if (data?.codigoQr) {
      QRCode.toDataURL(data.codigoQr, { width: 220, margin: 1 }).then(setQr).catch(() => setQr(null));
    }
  }, [data]);

  if (!data) return null;

  return (
    <div className="card" style={{ maxWidth: 560, margin: "0 auto", textAlign: "center" }}>
      <div style={{ fontSize: 46 }}>✅</div>
      <h3 style={{ fontSize: 24, marginBottom: 6 }}>{data.mensaje || "¡Pago realizado!"}</h3>
      <p className="muted">
        {data.correoEnviado
          ? "Te enviamos el boleto a tu correo."
          : "Guarda o descarga este boleto: no pudimos enviártelo por correo."}
      </p>

      {qr && <img src={qr} alt="Código QR del boleto" style={{ width: 220, height: 220, margin: "18px auto" }} />}

      <div style={{ textAlign: "left", marginTop: 10 }}>
        <div className="resumen" style={{ position: "static", boxShadow: "none" }}>
          <div className="linea"><span>Pasajero</span><span>{data.pasajeroNombre}</span></div>
          <div className="linea"><span>Ruta</span><span>{data.ruta}</span></div>
          <div className="linea"><span>Fecha</span><span>{data.fechaSalida || "—"} {data.horaSalida ? "· " + data.horaSalida.slice(0,5) + " h" : ""}</span></div>
          <div className="linea"><span>Asiento</span><span>{data.asiento}</span></div>
          <div className="linea"><span>Boleto</span><span>{data.comprobante}</span></div>
          {data.comprobanteElectronico && (
            <div className="linea">
              <span>Comprobante electrónico</span>
              <span>{data.comprobanteElectronico}</span>
            </div>
          )}
          <div className="total"><span>Pagado</span><span>{soles(data.precio)}</span></div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 22, flexWrap: "wrap" }}>
        {data.enlacePdf && (
          <a className="btn btn-ghost" href={data.enlacePdf} target="_blank" rel="noreferrer">
            Descargar comprobante
          </a>
        )}
        <Link className="btn btn-ghost" to="/comprar">Comprar otro pasaje</Link>
        <Link className="btn btn-primary" to="/mi-cuenta">Ver mis viajes</Link>
      </div>
      <p className="muted" style={{ marginTop: 14, fontSize: 13 }}>Presenta este QR al momento de embarcar.</p>
    </div>
  );
}
