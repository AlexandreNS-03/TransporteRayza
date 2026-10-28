import { useState, useEffect } from "react";
import {
  estaLogueado, getMisAcompanantes, getMisDocumentos, getPerfil,
} from "../services/authCliente";

/**
 * "Llenar con mis datos", arriba del formulario de cada pasajero.
 *
 * <p>Antes solo ofrecía los acompañantes guardados: servía para la familia,
 * pero no para uno mismo, que es quien más veces escribe sus propios datos.
 * Ahora ofrece las dos cosas, y de uno mismo ofrece <strong>cada documento de
 * viaje guardado</strong>: acá se viaja con DNI dentro del país y con pasaporte
 * o CPF cuando se cruza a Brasil, así que no alcanza con "mis datos" a secas.
 *
 * <p><strong>Avisa si el documento no llega al viaje.</strong> Para eso se
 * guarda la fecha de vencimiento: enterarse en el embarcadero de que el
 * pasaporte venció no le sirve a nadie. Avisa, no bloquea — el documento puede
 * renovarse antes de viajar, y quien decide es el pasajero.
 *
 * <p>Sin sesión no se muestra nada: no tiene sentido ofrecer algo que no se
 * puede usar.
 */

const GENERO_A_SEXO = { MASCULINO: "Masculino", FEMENINO: "Femenino", OTRO: "Otro" };

/** La edad al día del viaje, que es la que va al manifiesto. */
function edadEn(fechaNacimiento, fechaViaje) {
  if (!fechaNacimiento) return "";
  const [an, mn, dn] = fechaNacimiento.split("-").map(Number);
  const ref = fechaViaje ? fechaViaje.split("-").map(Number) : null;
  const hoy = ref ? new Date(ref[0], ref[1] - 1, ref[2]) : new Date();
  let edad = hoy.getFullYear() - an;
  const cumplioYa = hoy.getMonth() + 1 > mn || (hoy.getMonth() + 1 === mn && hoy.getDate() >= dn);
  if (!cumplioYa) edad--;
  return edad >= 0 ? String(edad) : "";
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun",
               "jul", "ago", "set", "oct", "nov", "dic"];

/** "2026-11-30" → "30 nov 2026". La fecha cruda es de la base, no de la gente. */
function fecha(iso) {
  if (!iso) return "";
  const [a, m, d] = iso.split("-");
  return `${Number(d)} ${MESES[Number(m) - 1] ?? ""} ${a}`;
}

/** ¿El documento sirve el día del viaje? */
function avisoDe(doc, fechaViaje) {
  if (!doc?.fechaExpiracion) return null;
  if (doc.vencido) return `Ese ${doc.tipo.toLowerCase()} ya está vencido.`;
  if (fechaViaje && doc.fechaExpiracion < fechaViaje)
    return `Ese ${doc.tipo.toLowerCase()} vence el ${fecha(doc.fechaExpiracion)}, antes de tu viaje.`;
  if (doc.vencePronto)
    return `Ese ${doc.tipo.toLowerCase()} vence el ${fecha(doc.fechaExpiracion)}. Revisa que te sirva para volver.`;
  return null;
}

export default function ElegirPasajero({ onElegir, fechaViaje }) {
  const [perfil, setPerfil] = useState(null);
  const [documentos, setDocumentos] = useState([]);
  const [acompanantes, setAcompanantes] = useState([]);
  const [aviso, setAviso] = useState(null);

  useEffect(() => {
    if (!estaLogueado()) return;
    // Si alguna falla, las otras siguen sirviendo: esto es una comodidad, no
    // un paso obligatorio de la compra.
    getPerfil().then(setPerfil).catch(() => {});
    getMisDocumentos().then(setDocumentos).catch(() => {});
    getMisAcompanantes().then(setAcompanantes).catch(() => {});
  }, []);

  const nombrePropio = [perfil?.nombres, perfil?.apellidos].filter(Boolean).join(" ").trim();

  /* Lo que se puede elegir de uno mismo: el documento de la cuenta y cada
     documento de viaje guardado. Si son el mismo número, no se repite. */
  const mios = [];
  if (perfil?.numeroDocumento) {
    mios.push({
      id: "yo",
      etiqueta: `${perfil.tipoDocumento || "DNI"} ${perfil.numeroDocumento}`,
      tipoDocumento: perfil.tipoDocumento || "DNI",
      numero: perfil.numeroDocumento,
    });
  }
  for (const d of documentos) {
    if (d.numero === perfil?.numeroDocumento) continue;
    mios.push({
      id: "doc-" + d.id,
      etiqueta: `${d.tipo} ${d.numero}` + (d.paisEmision ? ` · ${d.paisEmision}` : ""),
      tipoDocumento: d.tipo,
      numero: d.numero,
      doc: d,
    });
  }

  if (!mios.length && !acompanantes.length) return null;

  const elegir = (e) => {
    const valor = e.target.value;
    setAviso(null);
    if (!valor) return;

    const mio = mios.find((m) => m.id === valor);
    if (mio) {
      onElegir({
        tipoDocumento: mio.tipoDocumento,
        pasajeroDocumento: mio.numero,
        pasajeroNombre: nombrePropio,
        pasajeroTelefono: perfil?.telefono || "",
        edad: edadEn(perfil?.fechaNacimiento, fechaViaje),
        sexo: GENERO_A_SEXO[perfil?.genero] || "",
      });
      setAviso(avisoDe(mio.doc, fechaViaje));
      return;
    }

    const a = acompanantes.find((x) => x.id === valor);
    if (!a) return;
    onElegir({
      tipoDocumento: a.tipoDocumento,
      pasajeroDocumento: a.numeroDocumento,
      pasajeroNombre: a.nombreCompleto,
      pasajeroTelefono: a.telefono || "",
      edad: a.edad != null ? String(a.edad) : "",
      sexo: a.sexo || "",
    });
  };

  return (
    <div className="elegir-pasajero">
      <label className="elegir-pasajero-eti" htmlFor={"elegir-" + (fechaViaje || "x")}>
        Llenar con datos guardados
      </label>
      <select id={"elegir-" + (fechaViaje || "x")} defaultValue="" onChange={elegir}>
        <option value="">Escribir a mano</option>

        {mios.length > 0 && (
          <optgroup label={nombrePropio ? `Yo · ${nombrePropio}` : "Yo"}>
            {mios.map((m) => (
              <option key={m.id} value={m.id}>{m.etiqueta}</option>
            ))}
          </optgroup>
        )}

        {acompanantes.length > 0 && (
          <optgroup label="Mis acompañantes">
            {acompanantes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombreCompleto} · {a.tipoDocumento} {a.numeroDocumento}
              </option>
            ))}
          </optgroup>
        )}
      </select>

      {aviso && <p className="elegir-pasajero-aviso">{aviso}</p>}
    </div>
  );
}
