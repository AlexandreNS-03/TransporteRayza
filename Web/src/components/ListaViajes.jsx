import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { soles } from "../services/publicApi";
import { DESTINOS } from "../destinos";
import "./ListaViajes.css";

/**
 * Los viajes del cliente, con forma de pase de abordar.
 *
 * <p>Antes era una fila por viaje con los datos como salen de la base: la fecha
 * en "2026-12-15" y el estado en "PAGADO". Eso se lee, pero hay que traducirlo
 * mentalmente cada vez. Ahora la fecha va escrita como se dice y el estado
 * dice qué hacer —"Listo para embarcar"— en vez de nombrar una columna.
 *
 * <p>La figura del talón con la perforación es la misma que usa la app. Es a
 * propósito: quien compra en la web y después abre la app tiene que reconocer
 * lo mismo, no aprender dos cosas.
 *
 * <p><strong>La foto del destino va solo en los próximos.</strong> No es un
 * capricho de diseño: el historial puede tener decenas de viajes y una foto por
 * fila son decenas de descargas que no dicen nada nuevo —todos los
 * Requena → Iquitos tienen la misma foto—. En los próximos, que son dos o tres,
 * la foto sí ayuda a reconocer el viaje de un vistazo.
 */

const MESES = ["ene", "feb", "mar", "abr", "may", "jun",
               "jul", "ago", "set", "oct", "nov", "dic"];
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

/** "2026-12-15" → "lun 15 dic 2026". Sin Date para la cuenta de días: el
 *  string ya viene del servidor y crear un Date de una fecha suelta la corre
 *  de huso horario. El día de la semana sí necesita Date, y se arma a mediodía
 *  para que ningún huso lo pase al día anterior. */
function fechaLarga(iso) {
  if (!iso) return "—";
  const [a, m, d] = iso.split("-").map(Number);
  const diaSemana = DIAS[new Date(a, m - 1, d, 12).getDay()] ?? "";
  return `${diaSemana} ${d} ${MESES[m - 1] ?? ""} ${a}`;
}

/** La foto del destino, si lo conocemos. El destino es lo que va después de la flecha. */
function fotoDe(ruta) {
  const destino = (ruta || "").split("→").pop()?.trim().toLowerCase();
  if (!destino) return null;
  const d = DESTINOS.find((x) => x.nombre.toLowerCase() === destino);
  return d ? `/destinos/${d.imagen}` : null;
}

/** Qué decirle al pasajero sobre este viaje, en vez del nombre de la columna. */
function situacion(v) {
  if (v.estado === "ANULADO") return { texto: "Anulado", tono: "problema" };
  if (v.estado === "RESERVADO") return { texto: "Falta pagar", tono: "problema" };
  if (v.embarqueEstado === "EMBARCADO") return { texto: "Embarcado", tono: "ok" };
  if (v.proximo) return { texto: "Listo para embarcar", tono: "info" };
  return { texto: "Viaje realizado", tono: "neutro" };
}

/**
 * El QR del boleto.
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
      QRCode.toDataURL(codigo, { width: 240, margin: 1 }).then(setQr).catch(() => setQr(null));
  }, [abierto, codigo, qr]);

  if (!codigo) return null;

  return (
    <div className="viaje-boleto">
      <button className="btn-link" onClick={() => setAbierto((v) => !v)} aria-expanded={abierto}>
        {abierto ? "Ocultar el código" : "Ver mi boleto"}
      </button>
      {abierto && (
        <div className="viaje-qr">
          {qr
            ? <img src={qr} alt={"Código QR del boleto " + codigo} width={168} height={168} />
            : <span className="meta">Generando…</span>}
          <p className="meta">
            Muéstralo al embarcar. También te llegó por correo al comprar.
          </p>
        </div>
      )}
    </div>
  );
}

export default function ListaViajes({ viajes, vacio }) {
  if (!viajes.length) {
    return (
      <div className="viajes-vacio">
        <p>{vacio}</p>
      </div>
    );
  }

  return (
    <ul className="viajes">
      {viajes.map((v) => {
        const [origen, destino] = (v.ruta ?? " → ").split("→").map((s) => s.trim());
        const est = situacion(v);
        const foto = v.proximo && v.estado === "PAGADO" ? fotoDe(v.ruta) : null;
        const apagado = v.estado === "ANULADO";

        return (
          <li className={`viaje-pase ${apagado ? "apagado" : ""}`} key={v.ventaId}>

            {/* El talón: el asiento, que es lo que se busca al subir */}
            <div className="viaje-talon">
              {foto && (
                <img className="viaje-talon-foto" src={foto} alt="" loading="lazy" aria-hidden="true" />
              )}
              <span className="viaje-asiento">{v.asientoNumero ?? "—"}</span>
              <span className="viaje-asiento-eti">Asiento</span>
              {v.asientoTipo === "VIP" && <span className="viaje-vip">VIP</span>}
            </div>

            {/* La perforación, como en el talón de papel */}
            <div className="viaje-perforacion" aria-hidden="true">
              <span className="viaje-puntitos" />
            </div>

            <div className="viaje-cuerpo">
              <div className="viaje-ruta">
                <span>{origen}</span>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-label="hacia">
                  <path d="M4 12h15m-5.5-5.5L19 12l-5.5 5.5" stroke="currentColor" strokeWidth="1.9"
                        strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>{destino}</span>
              </div>

              <p className="viaje-cuando">
                {fechaLarga(v.fechaSalida)}
                {v.horaSalida ? ` · ${v.horaSalida.slice(0, 5)} h` : ""}
              </p>

              <div className="viaje-etiquetas">
                <span className={`viaje-eti ${est.tono}`}>{est.texto}</span>
                {v.viajeCodigo && <span className="viaje-codigo">{v.viajeCodigo}</span>}
              </div>

              {v.estado === "PAGADO" && v.embarqueEstado !== "EMBARCADO" && (
                <BoletoQR codigo={v.codigoQr} />
              )}
            </div>

            <div className="viaje-precio">{soles(v.precio)}</div>
          </li>
        );
      })}
    </ul>
  );
}
