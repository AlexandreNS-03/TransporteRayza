import { useState, useEffect } from "react";
import CuentaLayout from "../../components/CuentaLayout";
import { OpcionesDePais, nombreDePais } from "../../components/paises";
import { getMisDocumentos, guardarDocumento, borrarDocumento } from "../../services/authCliente";

const TIPOS = [
  ["DNI", "DNI"],
  ["CE", "Carné de extranjería"],
  ["PASAPORTE", "Pasaporte"],
  ["CPF", "CPF (Brasil)"],
];

function nombreDeTipo(t) {
  const x = TIPOS.find(([v]) => v === t);
  return x ? x[1] : t;
}

/**
 * Los documentos con los que el cliente puede viajar.
 *
 * Son varios a propósito: acá se viaja con DNI dentro del país y con pasaporte
 * o CPF cuando se cruza a Brasil.
 *
 * Lo que de verdad resuelve esta pantalla no es ahorrar tecleo, es el
 * vencimiento. Nadie se acuerda de cuándo caduca su documento hasta que está en
 * el muelle y no puede embarcar.
 */
export default function Documentos() {
  const [docs, setDocs] = useState(null);
  const [error, setError] = useState(null);
  const [msg, setMsg] = useState(null);
  const [agregando, setAgregando] = useState(false);
  const [borrando, setBorrando] = useState(null);

  const cargar = () => {
    setError(null);
    getMisDocumentos().then(setDocs).catch((e) => setError(e.message));
  };
  useEffect(() => { cargar(); }, []);

  const quitar = async (d) => {
    setBorrando(d.id); setMsg(null);
    try {
      await borrarDocumento(d.id);
      await cargar();
      setMsg(`Borramos tu ${nombreDeTipo(d.tipo).toLowerCase()}.`);
    } catch (e) { setMsg(e.message); }
    finally { setBorrando(null); }
  };

  return (
    <CuentaLayout titulo="Documentos de viaje">
      {(perfil) => (
        <>
          <p className="meta" style={{ marginTop: 4, maxWidth: 620 }}>
            Revísalos antes de viajar. Van a nombre de{" "}
            <strong>{[perfil.nombres, perfil.apellidos].filter(Boolean).join(" ") || "tu cuenta"}</strong>,
            así que tienen que decir lo mismo que tu documento.
          </p>

          {msg && <div className="alert alert-info" style={{ marginTop: 16 }} role="status">{msg}</div>}

          {error ? (
            <div className="alert alert-warn" style={{ marginTop: 16 }}>
              No pudimos cargar tus documentos.{" "}
              <button className="btn-link" onClick={cargar}>Reintentar</button>
            </div>
          ) : docs === null ? (
            <div className="card" style={{ marginTop: 16 }}>Cargando…</div>
          ) : (
            <>
              {docs.length === 0 && !agregando && (
                <div className="card" style={{ marginTop: 16 }}>
                  <h3 style={{ marginTop: 0 }}>Todavía no guardaste ninguno</h3>
                  <p className="meta" style={{ marginBottom: 0 }}>
                    Si lo guardas acá, no tienes que escribirlo en cada compra y te avisamos
                    antes de que venza.
                  </p>
                </div>
              )}

              {docs.map((d) => (
                <div className="card" key={d.id} style={{ marginTop: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <strong style={{ fontSize: 16 }}>{nombreDeTipo(d.tipo)} {d.numero}</strong>
                      <div className="meta" style={{ marginTop: 4 }}>
                        {d.paisEmision ? `Emitido en ${nombreDePais(d.paisEmision)}` : "Sin país de emisión"}
                        {d.fechaExpiracion ? ` · vence ${d.fechaExpiracion}` : " · no vence"}
                      </div>

                      {d.vencido && (
                        <div className="alert alert-warn" style={{ marginTop: 10 }}>
                          Este documento ya venció. Renuévalo antes de tu próximo viaje.
                        </div>
                      )}
                      {d.vencePronto && !d.vencido && (
                        <div className="alert alert-info" style={{ marginTop: 10 }}>
                          Vence pronto. Si tienes un viaje después de esa fecha, conviene
                          renovarlo ahora.
                        </div>
                      )}
                    </div>

                    <button className="btn btn-ghost" disabled={borrando === d.id}
                            onClick={() => quitar(d)}>
                      {borrando === d.id ? "Borrando…" : "Borrar"}
                    </button>
                  </div>
                </div>
              ))}

              {agregando ? (
                <FormularioDocumento
                  onCancelar={() => setAgregando(false)}
                  onGuardado={async (texto) => {
                    setAgregando(false); setMsg(texto); await cargar();
                  }}
                />
              ) : (
                <button className="btn btn-primary" style={{ marginTop: 18 }}
                        onClick={() => { setAgregando(true); setMsg(null); }}>
                  Agregar documento
                </button>
              )}
            </>
          )}
        </>
      )}
    </CuentaLayout>
  );
}

function FormularioDocumento({ onGuardado, onCancelar }) {
  const [tipo, setTipo] = useState("DNI");
  const [pais, setPais] = useState("PE");
  const [numero, setNumero] = useState("");
  const [expira, setExpira] = useState("");
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    setGuardando(true); setError(null);
    try {
      await guardarDocumento({ tipo, paisEmision: pais, numero, fechaExpiracion: expira || null });
      onGuardado("Guardamos tu documento.");
    } catch (err) { setError(err.message); }
    finally { setGuardando(false); }
  };

  return (
    <div className="card" style={{ marginTop: 18, maxWidth: 560 }}>
      <h3 style={{ marginTop: 0 }}>Agregar documento</h3>
      <form onSubmit={enviar}>
        <div className="field">
          <label htmlFor="doc-tipo">Tipo de documento</label>
          <select id="doc-tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {TIPOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        <div className="field">
          <label htmlFor="doc-pais">País que lo emitió</label>
          <select id="doc-pais" value={pais} onChange={(e) => setPais(e.target.value)}>
            <OpcionesDePais />
          </select>
        </div>

        <div className="field">
          <label htmlFor="doc-numero">Número</label>
          <input id="doc-numero" value={numero} onChange={(e) => setNumero(e.target.value)}
                 autoComplete="off" />
        </div>

        <div className="field">
          <label htmlFor="doc-expira">Vence el</label>
          <input id="doc-expira" type="date" value={expira}
                 onChange={(e) => setExpira(e.target.value)} />
          <div className="meta" style={{ marginTop: 6 }}>
            Déjalo vacío si ese documento no vence. Te avisamos tres meses antes.
          </div>
        </div>

        {error && <div className="alert alert-warn" style={{ marginTop: 14 }} role="alert">{error}</div>}

        <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
          <button className="btn btn-primary" type="submit" disabled={guardando || !numero.trim()}>
            {guardando ? "Guardando…" : "Guardar"}
          </button>
          <button className="btn btn-ghost" type="button" onClick={onCancelar}>Cancelar</button>
        </div>
      </form>
    </div>
  );
}
