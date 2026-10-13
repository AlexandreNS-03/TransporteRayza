import { useState, useEffect } from "react";
import CuentaLayout from "../../components/CuentaLayout";
import FormularioAcompanante from "../../components/FormularioAcompanante";
import { getMisAcompanantes, borrarAcompanante } from "../../services/authCliente";

/**
 * La gente con la que el cliente suele viajar.
 *
 * Quien compra para su familia escribe cinco veces los mismos nombres y
 * documentos, en cada compra. Acá se guardan una vez y después se eligen de
 * una lista al comprar.
 *
 * La pantalla dice algo que importa: son datos de otra persona. El que los
 * carga es el titular, no el acompañante, así que conviene que quede claro de
 * quién es la responsabilidad y qué guardamos.
 */
export default function Acompanantes() {
  const [lista, setLista] = useState(null);
  const [error, setError] = useState(null);
  const [msg, setMsg] = useState(null);
  const [editando, setEditando] = useState(null);   // el objeto, o "nuevo"
  const [borrando, setBorrando] = useState(null);

  const cargar = () => {
    setError(null);
    getMisAcompanantes().then(setLista).catch((e) => setError(e.message));
  };
  useEffect(() => { cargar(); }, []);

  const quitar = async (a) => {
    setBorrando(a.id); setMsg(null);
    try {
      await borrarAcompanante(a.id);
      await cargar();
      setMsg(`Sacamos a ${a.nombreCompleto} de tu lista.`);
    } catch (e) { setMsg(e.message); }
    finally { setBorrando(null); }
  };

  const alGuardar = async (texto) => {
    setEditando(null); setMsg(texto); await cargar();
  };

  return (
    <CuentaLayout titulo="Acompañantes frecuentes">
      <p className="meta" style={{ marginTop: 4, maxWidth: 620 }}>
        Si siempre viajas con las mismas personas, guárdalas acá y al comprar las eliges
        de una lista en vez de escribir todo otra vez.
      </p>

      {msg && <div className="alert alert-info" style={{ marginTop: 16 }} role="status">{msg}</div>}

      {error ? (
        <div className="alert alert-warn" style={{ marginTop: 16 }}>
          No pudimos cargar tu lista. <button className="btn-link" onClick={cargar}>Reintentar</button>
        </div>
      ) : lista === null ? (
        <div className="card" style={{ marginTop: 16 }}>Cargando…</div>
      ) : (
        <>
          {lista.length === 0 && !editando && (
            <div className="card" style={{ marginTop: 16 }}>
              <h3 style={{ marginTop: 0 }}>Tu lista está vacía</h3>
              <p className="meta" style={{ marginBottom: 0 }}>
                Agrega a quien viaja contigo seguido: tu familia, tu socio, quien sea.
              </p>
            </div>
          )}

          {lista.map((a) => (
            <div className="card" key={a.id} style={{ marginTop: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <strong style={{ fontSize: 16 }}>{a.nombreCompleto}</strong>
                  <div className="meta" style={{ marginTop: 4 }}>
                    {a.tipoDocumento} {a.numeroDocumento}
                    {a.edad != null && ` · ${a.edad} años`}
                    {a.sexo && ` · ${a.sexo}`}
                  </div>
                  {a.telefono && <div className="meta">Tel. {a.telefono}</div>}
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="btn btn-ghost" onClick={() => { setEditando(a); setMsg(null); }}>
                    Editar
                  </button>
                  <button className="btn btn-ghost" disabled={borrando === a.id}
                          onClick={() => quitar(a)}>
                    {borrando === a.id ? "Sacando…" : "Sacar"}
                  </button>
                </div>
              </div>
            </div>
          ))}

          {editando ? (
            <FormularioAcompanante
              inicial={editando === "nuevo" ? null : editando}
              onGuardado={alGuardar}
              onCancelar={() => setEditando(null)}
            />
          ) : (
            <button className="btn btn-primary" style={{ marginTop: 18 }}
                    onClick={() => { setEditando("nuevo"); setMsg(null); }}>
              Agregar acompañante
            </button>
          )}

          <p className="meta" style={{ marginTop: 22, maxWidth: 620 }}>
            Son datos de otra persona, así que guardamos lo mínimo para emitirle el pasaje:
            nombre, documento, nacimiento, sexo y un teléfono. Nada de correo ni dirección, y
            no le escribimos nunca. Asegúrate de que esté de acuerdo, y sácala de la lista
            cuando quieras.
          </p>
        </>
      )}
    </CuentaLayout>
  );
}
