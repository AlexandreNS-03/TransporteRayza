import { useState } from "react";
import { enviarCodigoCelular, confirmarCelular, getPerfil } from "../services/authCliente";

/**
 * Verificar el celular desde los datos de la cuenta.
 *
 * Tiene tres estados y los tres dicen la verdad:
 *
 *  - ya verificado: no pide nada;
 *  - sin canal contratado: dice que todavía no se puede, en vez de ofrecer un
 *    botón que iba a fallar;
 *  - con canal: manda el código y pide los seis dígitos.
 */
export default function VerificarCelular({ perfil, onVerificado }) {
  const [paso, setPaso] = useState("inicio");   // inicio | codigo
  const [codigo, setCodigo] = useState("");
  const [estado, setEstado] = useState(null);
  const [cargando, setCargando] = useState(false);

  if (!perfil) return null;

  if (perfil.celularVerificado) {
    return (
      <p className="meta" style={{ marginTop: 6 }}>
        Tu celular está verificado.
      </p>
    );
  }

  if (!perfil.puedeVerificarCelular) {
    return (
      <p className="meta" style={{ marginTop: 6 }}>
        Todavía no podemos mandarte mensajes al celular, así que por ahora no hay cómo
        verificarlo. Lo vamos a habilitar.
      </p>
    );
  }

  if (!perfil.telefono) {
    return (
      <p className="meta" style={{ marginTop: 6 }}>
        Escribe tu número acá arriba y guarda, y después lo verificamos.
      </p>
    );
  }

  const pedirCodigo = async () => {
    setCargando(true); setEstado(null);
    try {
      setEstado({ ok: true, texto: await enviarCodigoCelular() });
      setPaso("codigo");
    } catch (e) { setEstado({ ok: false, texto: e.message }); }
    finally { setCargando(false); }
  };

  const confirmar = async (e) => {
    e.preventDefault();
    setCargando(true); setEstado(null);
    try {
      const texto = await confirmarCelular(codigo);
      setCodigo("");
      setPaso("inicio");
      setEstado({ ok: true, texto });
      // El perfil cambió: que la pantalla lo refleje sin recargar.
      try { onVerificado(await getPerfil()); } catch { /* da igual: el mensaje ya se mostró */ }
    } catch (err) { setEstado({ ok: false, texto: err.message }); }
    finally { setCargando(false); }
  };

  return (
    <div style={{ marginTop: 10 }}>
      {paso === "inicio" ? (
        <button className="btn-link" onClick={pedirCodigo} disabled={cargando}>
          {cargando ? "Enviando…" : "Verificar mi celular"}
        </button>
      ) : (
        <form onSubmit={confirmar} style={{ marginTop: 6 }}>
          <label htmlFor="codigo-celular" className="meta" style={{ display: "block" }}>
            Escribe el código de 6 dígitos
          </label>
          <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
            <input id="codigo-celular" value={codigo} inputMode="numeric" maxLength={6}
                   autoComplete="one-time-code" style={{ maxWidth: 140 }}
                   onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))} />
            <button className="btn btn-primary" type="submit"
                    disabled={cargando || codigo.length < 6}>
              {cargando ? "Comprobando…" : "Confirmar"}
            </button>
            <button className="btn btn-ghost" type="button" disabled={cargando}
                    onClick={pedirCodigo}>
              Mandar otro
            </button>
          </div>
        </form>
      )}

      {estado && (
        <div className={`alert ${estado.ok ? "alert-info" : "alert-warn"}`}
             style={{ marginTop: 10 }} role="status">
          {estado.texto}
        </div>
      )}
    </div>
  );
}
