import { useState, useEffect } from "react";
import { getMetodosDePago, quitarMetodoDePago, marcarPreferida } from "../services/authCliente";

/**
 * Las formas de pago que el cliente dejó guardadas.
 *
 * Tarjetas y Yape se muestran juntos a propósito: son contratos distintos por
 * dentro, pero para quien mira la pantalla son lo mismo — maneras de pagar sin
 * volver a escribir nada.
 *
 * Acá no hay ningún dato de tarjeta. Lo que llega del servidor es la marca, los
 * cuatro últimos dígitos y el vencimiento; con eso la persona reconoce cuál es
 * y nada más.
 */
export default function MetodosGuardados() {
  const [metodos, setMetodos] = useState(null);
  const [msg, setMsg] = useState(null);
  const [quitando, setQuitando] = useState(null);
  const [confirmando, setConfirmando] = useState(null);

  const cargar = () => getMetodosDePago().then(setMetodos);
  useEffect(() => { cargar(); }, []);

  const quitar = async (m) => {
    setQuitando(m.id); setMsg(null);
    try {
      await quitarMetodoDePago(m.tipo, m.id);
      setConfirmando(null);
      await cargar();
      setMsg(`Quitamos ${m.etiqueta} de tu cuenta.`);
    } catch (e) { setMsg(e.message); }
    finally { setQuitando(null); }
  };

  const preferir = async (m) => {
    setMsg(null);
    try { await marcarPreferida(m.id); await cargar(); }
    catch (e) { setMsg(e.message); }
  };

  if (metodos === null) return <div className="card" style={{ marginTop: 24 }}>Cargando…</div>;

  return (
    <div style={{ marginTop: 24 }}>
      {msg && <div className="alert alert-info" style={{ marginBottom: 16 }}>{msg}</div>}

      {metodos.length === 0 ? (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Todavía no tienes formas de pago guardadas</h3>
          <p className="meta" style={{ marginBottom: 0 }}>
            Cuando pagues un pasaje con tarjeta, te vamos a preguntar si quieres dejarla
            guardada para la próxima. No guardamos el número: eso queda del lado del banco.
          </p>
        </div>
      ) : (
        metodos.map((m) => (
          <div className="card" key={`${m.tipo}-${m.id}`} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <strong style={{ fontSize: 16 }}>{m.etiqueta}</strong>
                <div className="meta" style={{ marginTop: 4 }}>
                  {m.tipo === "YAPE" ? "Yape" : "Tarjeta"}
                  {m.vence && ` · vence ${m.vence}`}
                  {m.preferida && " · se ofrece primero"}
                </div>

                {m.vencida && (
                  <div className="alert alert-warn" style={{ marginTop: 10 }}>
                    Esta tarjeta ya venció. Al pagar te vamos a pedir una nueva.
                  </div>
                )}
                {m.simulado && (
                  <div className="alert alert-info" style={{ marginTop: 10 }}>
                    En prueba: todavía no cobra. Está acá para que veas cómo va a funcionar.
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {m.tipo === "TARJETA" && !m.preferida && !m.vencida && (
                  <button className="btn btn-ghost" onClick={() => preferir(m)}>
                    Usar esta primero
                  </button>
                )}
                {confirmando === m.id ? (
                  <>
                    <button className="btn btn-primary" disabled={quitando === m.id}
                            onClick={() => quitar(m)}>
                      {quitando === m.id ? "Quitando…" : "Sí, quitar"}
                    </button>
                    <button className="btn btn-ghost" onClick={() => setConfirmando(null)}>
                      Mejor no
                    </button>
                  </>
                ) : (
                  <button className="btn btn-ghost" onClick={() => setConfirmando(m.id)}>
                    Quitar
                  </button>
                )}
              </div>
            </div>
          </div>
        ))
      )}

      <p className="meta" style={{ marginTop: 18 }}>
        Puedes quitar cualquiera cuando quieras y sin dar explicaciones. Si quitas una
        tarjeta, dejamos de poder cobrarte con ella en el momento.
      </p>
    </div>
  );
}
