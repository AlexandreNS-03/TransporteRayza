import { useState } from "react";
import { cambiarClave } from "../services/authCliente";

/** El mínimo que exige el servidor. Si cambia allá, cambia acá. */
const MINIMO = 8;

/**
 * Cambiar la contraseña desde adentro de la cuenta.
 *
 * Antes el único camino era "olvidé mi clave" y esperar un correo, que es el
 * camino para quien no puede entrar. Quien sí puede entrar y solo quiere
 * cambiarla no tenía por dónde.
 *
 * Pide la actual aunque la sesión ya esté abierta: si alguien se sienta en una
 * computadora con la sesión puesta, que no pueda quedarse con la cuenta.
 */
export default function CambiarClave() {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetida, setRepetida] = useState("");
  const [verNueva, setVerNueva] = useState(false);
  const [estado, setEstado] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const cortaDeMas = nueva.length > 0 && nueva.length < MINIMO;
  const noCoinciden = repetida.length > 0 && nueva !== repetida;
  const puedeEnviar = actual && nueva.length >= MINIMO && nueva === repetida && !enviando;

  const enviar = async (e) => {
    e.preventDefault();
    setEstado(null); setEnviando(true);
    try {
      const msg = await cambiarClave(actual, nueva);
      setEstado({ ok: true, texto: msg + " Te enviamos un correo avisando del cambio." });
      setActual(""); setNueva(""); setRepetida("");
    } catch (err) {
      setEstado({ ok: false, texto: err.message });
    } finally { setEnviando(false); }
  };

  return (
    <div className="card" style={{ maxWidth: 520, marginTop: 24 }}>
      <h3 style={{ marginTop: 0 }}>Cambiar mi contraseña</h3>

      <form onSubmit={enviar}>
        <div className="field">
          <label htmlFor="clave-actual">Contraseña actual</label>
          <input id="clave-actual" type="password" autoComplete="current-password"
                 value={actual} onChange={(e) => setActual(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="clave-nueva">Contraseña nueva</label>
          <input id="clave-nueva" type={verNueva ? "text" : "password"}
                 autoComplete="new-password"
                 value={nueva} onChange={(e) => setNueva(e.target.value)} />
          <button type="button" className="btn-link" style={{ marginTop: 6 }}
                  onClick={() => setVerNueva((v) => !v)}>
            {verNueva ? "Ocultar" : "Ver lo que escribo"}
          </button>
          <div className="meta" style={{ marginTop: 6 }}>
            {cortaDeMas
              ? `Le faltan ${MINIMO - nueva.length} caracteres.`
              : `Al menos ${MINIMO} caracteres. Una frase corta que recuerdes sirve mejor que una palabra con símbolos.`}
          </div>
        </div>

        <div className="field">
          <label htmlFor="clave-repetida">Repite la nueva</label>
          <input id="clave-repetida" type={verNueva ? "text" : "password"}
                 autoComplete="new-password"
                 value={repetida} onChange={(e) => setRepetida(e.target.value)} />
          {noCoinciden && (
            <div className="meta" style={{ marginTop: 6 }}>Las dos no son iguales.</div>
          )}
        </div>

        {estado && (
          <div className={`alert ${estado.ok ? "alert-info" : "alert-warn"}`}
               style={{ marginTop: 14 }} role="status">
            {estado.texto}
          </div>
        )}

        <button className="btn btn-primary" type="submit"
                disabled={!puedeEnviar} style={{ marginTop: 18 }}>
          {enviando ? "Cambiando…" : "Cambiar contraseña"}
        </button>
      </form>
    </div>
  );
}
