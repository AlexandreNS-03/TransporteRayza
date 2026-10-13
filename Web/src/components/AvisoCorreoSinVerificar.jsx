import { useState } from "react";
import { reenviarVerificacion } from "../services/authCliente";

/**
 * El aviso de que el correo todavía no está confirmado.
 *
 * No es un trámite: el boleto, el comprobante y el aviso de cada cobro salen
 * por ese correo. Si está mal escrito —o es el de otra persona— esas tres
 * cosas se pierden sin que nadie se entere hasta el día del viaje.
 */
export default function AvisoCorreoSinVerificar({ perfil }) {
  const [estado, setEstado] = useState(null);
  const [enviando, setEnviando] = useState(false);

  if (!perfil || perfil.correoVerificado) return null;

  const reenviar = async () => {
    setEnviando(true); setEstado(null);
    try { setEstado({ ok: true, texto: await reenviarVerificacion() }); }
    catch (e) { setEstado({ ok: false, texto: e.message }); }
    finally { setEnviando(false); }
  };

  return (
    <div className="alert alert-warn" style={{ marginTop: 20 }}>
      <strong>Confirma tu correo.</strong>{" "}
      Tus boletos y tus comprobantes van a <strong>{perfil.email}</strong>. Mientras no lo
      confirmes no sabemos si llegan.
      {estado
        ? <div style={{ marginTop: 8 }}>{estado.texto}</div>
        : <div style={{ marginTop: 8 }}>
            <button className="btn-link" onClick={reenviar} disabled={enviando}>
              {enviando ? "Enviando…" : "Mandarme el enlace otra vez"}
            </button>
          </div>}
    </div>
  );
}
