import { useState, useEffect } from "react";
import { getMisComprobantes } from "../services/authCliente";
import { soles } from "../services/publicApi";
import "./MisComprobantes.css";

/**
 * Las boletas y facturas del cliente.
 *
 * <p>Hasta que esta pantalla existió, el comprobante solo llegaba por correo al
 * comprar. Quien lo borraba, o compró en el mostrador y dio mal su correo, no
 * tenía de dónde sacarlo: tenía que llamar a la oficina y que alguien se lo
 * reenviara.
 *
 * <p><strong>La pantalla tiene un solo trabajo: encontrar uno.</strong> Nadie
 * entra acá a mirar la lista; entra porque el contador le pidió el de marzo, o
 * porque la empresa le reclama la factura de un viaje. Por eso van agrupados
 * por año y la fecha se lee de un vistazo, en vez de ser una fila más de datos
 * como salen de la base.
 *
 * <p>El PDF lo sirve Nubefact, que es donde vive el documento fiscal. Acá solo
 * se enlaza: el documento es de ellos y abre fuera del sitio.
 */

const MESES = ["ene", "feb", "mar", "abr", "may", "jun",
               "jul", "ago", "set", "oct", "nov", "dic"];

/** "2026-10-15" → "15 oct 2026". Sin Date: una fecha suelta se corre de huso. */
function fechaCorta(iso) {
  if (!iso) return "—";
  const [a, m, d] = String(iso).slice(0, 10).split("-");
  if (!a || !m || !d) return iso;
  return `${Number(d)} ${MESES[Number(m) - 1] ?? ""} ${a}`;
}

function anioDe(iso) {
  const a = String(iso ?? "").slice(0, 4);
  return /^\d{4}$/.test(a) ? a : "Sin fecha";
}

/**
 * El concepto, sin el encabezado que llevan todos.
 *
 * Toda descripción empieza con "Servicio de transporte fluvial", que en una
 * lista es ruido: ocupa el ancho que necesita la parte que SÍ distingue una
 * fila de otra, la ruta. No se cambia nada del documento — el PDF de Nubefact
 * sigue diciendo lo que dice.
 */
function conceptoCorto(texto) {
  if (!texto) return null;
  return texto.replace(/^Servicio de transporte fluvial\s+/i, "").trim() || texto;
}

/** La inicial del tipo, para reconocerlo sin leer. */
function sello(tipo = "") {
  if (tipo.startsWith("Factura")) return { letra: "F", clase: "factura" };
  if (tipo.startsWith("Nota de crédito")) return { letra: "NC", clase: "nota" };
  if (tipo.startsWith("Nota de venta")) return { letra: "NV", clase: "otro" };
  if (tipo.startsWith("Ticket")) return { letra: "T", clase: "otro" };
  return { letra: "B", clase: "boleta" };
}

export default function MisComprobantes() {
  const [comprobantes, setComprobantes] = useState(null);
  const [error, setError] = useState(null);

  const cargar = () => {
    setError(null);
    getMisComprobantes().then(setComprobantes).catch((e) => setError(e.message));
  };
  useEffect(() => { cargar(); }, []);

  if (error) return (
    <div className="alert alert-warn">
      No pudimos cargar tus comprobantes.{" "}
      <button className="btn-link" onClick={cargar}>Reintentar</button>
    </div>
  );

  if (comprobantes === null) return <p className="meta">Cargando tus comprobantes…</p>;

  if (comprobantes.length === 0) return (
    <div className="comp-vacio">
      <h3>Todavía no tienes comprobantes</h3>
      <p>
        Cuando compres un pasaje te emitimos su boleta, y va a aparecer acá para que la
        bajes cuando la necesites.
      </p>
    </div>
  );

  // Ya vienen del servidor del más nuevo al más viejo; agrupar mantiene ese orden.
  const porAnio = [];
  for (const c of comprobantes) {
    const anio = anioDe(c.fechaDeEmision);
    const ultimo = porAnio[porAnio.length - 1];
    if (ultimo && ultimo.anio === anio) ultimo.items.push(c);
    else porAnio.push({ anio, items: [c] });
  }

  return (
    <div className="comp">
      {porAnio.map(({ anio, items }) => (
        <section className="comp-anio" key={anio}>
          <h3 className="comp-anio-tit">
            {anio}
            {/* Cuántos, no cuánto: una nota de crédito anula una boleta, así que
                sumar los totales del año daría una cifra que no es lo que se
                gastó. En una pantalla de documentos fiscales, un número de más
                es peor que ninguno. */}
            <span className="comp-anio-cuenta">
              {items.length} {items.length === 1 ? "documento" : "documentos"}
            </span>
          </h3>

          <ul className="comp-lista">
            {items.map((c) => {
              const s = sello(c.tipo);
              const anulado = c.estado === "ANULADO";

              return (
                <li className={`comp-fila ${anulado ? "anulada" : ""}`} key={c.numero}>
                  <span className={`comp-sello ${s.clase}`} aria-hidden="true">{s.letra}</span>

                  <div className="comp-que">
                    <p className="comp-tipo">
                      {c.tipo} <span className="comp-numero">{c.numero}</span>
                    </p>
                    {c.concepto && (
                      <p className="comp-concepto" title={c.concepto}>
                        {conceptoCorto(c.concepto)}
                      </p>
                    )}
                    {anulado && <span className="comp-anulada-eti">Anulado</span>}
                  </div>

                  {/* Envoltorio con display:contents en pantalla grande, para que
                      la fecha y el monto sigan siendo columnas de la grilla; en el
                      teléfono se vuelve una fila y van juntos. Sin él los dos
                      caían en la misma celda y se pisaban. */}
                  <span className="comp-meta">
                    <span className="comp-fecha">{fechaCorta(c.fechaDeEmision)}</span>
                    <span className="comp-total">{soles(c.total)}</span>
                  </span>

                  <span className="comp-accion">
                    {c.enlacePdf ? (
                      <a className="btn btn-ghost comp-pdf" href={c.enlacePdf}
                         target="_blank" rel="noopener noreferrer">
                        Ver el PDF
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M14 4h6v6M20 4l-8.5 8.5M18 14v4.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"
                                stroke="currentColor" strokeWidth="1.8"
                                strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="sr-only"> (se abre en otra pestaña)</span>
                      </a>
                    ) : (
                      <span className="comp-sin-pdf" title="Suele tardar unos minutos.">
                        Generando el PDF…
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <p className="comp-nota">
        El documento lo guarda <strong>Nubefact</strong>, que es con quien emitimos ante
        SUNAT. Si necesitas una factura a nombre de una empresa, pídela al momento de
        comprar: una vez emitida la boleta no se puede cambiar.
      </p>
    </div>
  );
}
