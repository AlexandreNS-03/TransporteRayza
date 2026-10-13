import { useState, useEffect } from "react";
import { getMisComprobantes } from "../services/authCliente";
import { soles } from "../services/publicApi";

/**
 * Las boletas y facturas del cliente.
 *
 * Hasta ahora el comprobante solo llegaba por correo al comprar. Quien lo
 * borraba, o compró en el mostrador y dio su correo mal, no tenía de dónde
 * sacarlo: tenía que llamar a la oficina y que alguien se lo reenviara.
 *
 * El PDF lo sirve Nubefact, que es donde vive el documento fiscal. Acá solo se
 * enlaza.
 */
export default function MisComprobantes() {
  const [comprobantes, setComprobantes] = useState(null);
  const [error, setError] = useState(null);

  const cargar = () => {
    setError(null);
    getMisComprobantes().then(setComprobantes).catch((e) => setError(e.message));
  };
  useEffect(() => { cargar(); }, []);

  if (error) return (
    <div className="alert alert-warn" style={{ marginTop: 24 }}>
      No pudimos cargar tus comprobantes. <button className="btn-link" onClick={cargar}>Reintentar</button>
    </div>
  );
  if (comprobantes === null) return <div className="card" style={{ marginTop: 24 }}>Cargando…</div>;

  if (comprobantes.length === 0) return (
    <div className="card" style={{ marginTop: 24 }}>
      <h3 style={{ marginTop: 0 }}>Todavía no tienes comprobantes</h3>
      <p className="meta" style={{ marginBottom: 0 }}>
        Cuando compres un pasaje te vamos a emitir su boleta, y va a aparecer acá para
        que la bajes cuando quieras.
      </p>
    </div>
  );

  return (
    <div style={{ marginTop: 24 }}>
      {comprobantes.map((c) => (
        <div className="card" key={c.numero} style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <strong style={{ fontSize: 16 }}>{c.tipo} {c.numero}</strong>
              <div className="meta" style={{ marginTop: 4 }}>
                {c.fechaDeEmision || "—"} · {soles(c.total)}
                {c.estado === "ANULADO" && " · anulado"}
              </div>
              {c.concepto && (
                <div className="meta" style={{ marginTop: 4 }}>{c.concepto}</div>
              )}
            </div>

            {c.enlacePdf ? (
              <a className="btn btn-ghost" href={c.enlacePdf}
                 target="_blank" rel="noopener noreferrer">
                Ver el PDF
              </a>
            ) : (
              <span className="meta">
                El PDF todavía no está listo. Suele tardar unos minutos.
              </span>
            )}
          </div>
        </div>
      ))}

      <p className="meta" style={{ marginTop: 18 }}>
        El documento lo guarda Nubefact, que es con quien emitimos ante SUNAT. Si
        necesitas una factura a nombre de una empresa, pídela en el momento de comprar:
        después de emitida la boleta no se puede cambiar.
      </p>
    </div>
  );
}
