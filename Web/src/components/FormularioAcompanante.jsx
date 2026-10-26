import { useState } from "react";
import { guardarAcompanante } from "../services/authCliente";

const TIPOS = [["DNI", "DNI"], ["CE", "Carné de extranjería"],
               ["PASAPORTE", "Pasaporte"], ["CPF", "CPF (Brasil)"]];

/** Los mismos tres que guarda la venta, para que coincidan sin traducir. */
const SEXOS = ["Masculino", "Femenino", "Otro"];

/**
 * Alta de un acompañante.
 *
 * Pide la fecha de nacimiento y no la edad: una edad escrita hoy queda mal el
 * año que viene sin que nadie lo note, y la edad va al manifiesto.
 */
export default function FormularioAcompanante({ inicial, onGuardado, onCancelar }) {
  const [a, setA] = useState(inicial || {
    nombreCompleto: "", tipoDocumento: "DNI", numeroDocumento: "",
    fechaNacimiento: "", sexo: "", telefono: "",
  });
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const campo = (c) => (e) => setA({ ...a, [c]: e.target.value });

  const enviar = async (e) => {
    e.preventDefault();
    setGuardando(true); setError(null);
    try {
      await guardarAcompanante(a);
      onGuardado(inicial ? "Actualizamos sus datos." : "Lo agregamos a tu lista.");
    } catch (err) { setError(err.message); }
    finally { setGuardando(false); }
  };

  const listo = a.nombreCompleto.trim() && a.numeroDocumento.trim();

  return (
    <div className="card" style={{ marginTop: 18, maxWidth: 560 }}>
      <h3 style={{ marginTop: 0 }}>{inicial ? "Editar acompañante" : "Agregar acompañante"}</h3>
      <form onSubmit={enviar}>
        <div className="field">
          <label htmlFor="ac-nombre">Nombres y apellidos</label>
          <input id="ac-nombre" value={a.nombreCompleto} onChange={campo("nombreCompleto")}
                 placeholder="Como figura en su documento" autoComplete="off" />
        </div>

        <div className="field">
          <label htmlFor="ac-tipo">Tipo de documento</label>
          <select id="ac-tipo" value={a.tipoDocumento} onChange={campo("tipoDocumento")}
                  disabled={!!inicial}>
            {TIPOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        <div className="field">
          <label htmlFor="ac-numero">Número de documento</label>
          <input id="ac-numero" value={a.numeroDocumento} onChange={campo("numeroDocumento")}
                 autoComplete="off" disabled={!!inicial} />
          {inicial && (
            <div className="meta" style={{ marginTop: 6 }}>
              El documento no se cambia: si es otra persona, agrégala aparte.
            </div>
          )}
        </div>

        <div className="field">
          <label htmlFor="ac-nacimiento">Fecha de nacimiento</label>
          <input id="ac-nacimiento" type="date" value={a.fechaNacimiento || ""}
                 onChange={campo("fechaNacimiento")} />
          <div className="meta" style={{ marginTop: 6 }}>
            Con esto calculamos su edad cada vez, así no queda vieja al año siguiente.
          </div>
        </div>

        <div className="field">
          <label htmlFor="ac-sexo">Sexo</label>
          <select id="ac-sexo" value={a.sexo || ""} onChange={campo("sexo")}>
            <option value="">Sin especificar</option>
            {SEXOS.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>

        <div className="field">
          <label htmlFor="ac-telefono">Teléfono (opcional)</label>
          <input id="ac-telefono" value={a.telefono || ""} onChange={campo("telefono")}
                 placeholder="Ej. 965123456" autoComplete="off" />
        </div>

        {error && <div className="alert alert-warn" style={{ marginTop: 14 }} role="alert">{error}</div>}

        <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
          <button className="btn btn-primary" type="submit" disabled={guardando || !listo}>
            {guardando ? "Guardando…" : "Guardar"}
          </button>
          <button className="btn btn-ghost" type="button" onClick={onCancelar}>Cancelar</button>
        </div>
      </form>
    </div>
  );
}
