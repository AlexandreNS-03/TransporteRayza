import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { soles } from "../services/publicApi";

/**
 * El QR del boleto, dentro de la cuenta.
 *
 * El código ya venía en los datos de cada viaje; lo único que faltaba era
 * mostrarlo. Hasta ahora el pasajero solo lo tenía en el correo de la compra:
 * si lo borraba o cambiaba de teléfono, llegaba al muelle sin nada.
 */
function BoletoQR({ codigo }) {
  const [qr, setQr] = useState(null);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (abierto && codigo && !qr)
      QRCode.toDataURL(codigo, { width: 220, margin: 1 }).then(setQr).catch(() => setQr(null));
  }, [abierto, codigo, qr]);

  if (!codigo) return null;

  return (
    <div style={{ marginTop: 10 }}>
      <button className="btn-link" onClick={() => setAbierto((v) => !v)}>
        {abierto ? "Ocultar el QR" : "Ver mi boleto"}
      </button>
      {abierto && (
        <div style={{ marginTop: 10 }}>
          {qr
            ? <img src={qr} alt={"Código QR del boleto " + codigo} width={180} height={180} />
            : <span className="meta">Generando…</span>}
          <div className="meta" style={{ marginTop: 6 }}>
            Muéstralo al embarcar. También te llegó por correo al comprar.
          </div>
        </div>
      )}
    </div>
  );
}

export default function ListaViajes({ viajes, vacio }) {
  if (!viajes.length) return <div className="alert alert-info" style={{ marginTop: 24 }}>{vacio}</div>;
  return (
    <div style={{ marginTop: 24 }}>
      {viajes.map((v) => (
        <div className="viaje-row" key={v.ventaId}>
          <div>
            <div className="ruta">{v.ruta}</div>
            <div className="meta">
              {v.fechaSalida || "—"} · {v.horaSalida ? v.horaSalida.slice(0, 5) : "—"} h · Asiento {v.asientoTipo} #{v.asientoNumero}
            </div>
            <div style={{ marginTop: 8 }}>
              <span className="tag">{v.estado}</span>{" "}
              {v.embarqueEstado === "EMBARCADO" && <span className="tag">Embarcado</span>}
            </div>
            {v.estado === "PAGADO" && v.embarqueEstado !== "EMBARCADO" && (
              <BoletoQR codigo={v.codigoQr} />
            )}
          </div>
          <div className="center">
            <div className="meta">Viaje</div>
            <div style={{ fontWeight: 700 }}>{v.viajeCodigo || "—"}</div>
          </div>
          <div className="center">
            <div className="precio" style={{ fontSize: 18 }}>{soles(v.precio)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
