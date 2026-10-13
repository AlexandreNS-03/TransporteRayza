import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import CuentaLayout from "../../components/CuentaLayout";
import { getMisNotificaciones, guardarNotificaciones } from "../../services/authCliente";

/**
 * Por dónde le escribimos al cliente, y para qué.
 *
 * Son dos cosas distintas y la pantalla las separa, porque la ley también las
 * separa: lo informativo es el servicio que compró —el boleto, el comprobante,
 * el aviso de que su viaje cambió de hora— y lo promocional es publicidad, que
 * necesita que diga que sí.
 *
 * Por eso el correo informativo no es un interruptor: va siempre. Mostrarlo
 * apagable sería mentir, porque igual se lo íbamos a mandar.
 */
export default function Notificaciones() {
  const [prefs, setPrefs] = useState(null);
  const [error, setError] = useState(null);
  const [msg, setMsg] = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    getMisNotificaciones().then(setPrefs).catch((e) => setError(e.message));
  }, []);

  const marcar = (campo) => (e) => setPrefs({ ...prefs, [campo]: e.target.checked });

  const guardar = async () => {
    setGuardando(true); setMsg(null);
    try {
      setPrefs(await guardarNotificaciones(prefs));
      setMsg("Guardamos tus preferencias.");
    } catch (e) { setMsg(e.message); }
    finally { setGuardando(false); }
  };

  if (error) return (
    <CuentaLayout titulo="Notificaciones">
      <div className="alert alert-warn" style={{ marginTop: 16 }}>{error}</div>
    </CuentaLayout>
  );
  if (!prefs) return (
    <CuentaLayout titulo="Notificaciones">
      <div className="card" style={{ marginTop: 16 }}>Cargando…</div>
    </CuentaLayout>
  );

  const sinCanales = !prefs.whatsappDisponible && !prefs.smsDisponible;

  return (
    <CuentaLayout titulo="Notificaciones">
      {msg && <div className="alert alert-info" style={{ marginTop: 16 }} role="status">{msg}</div>}

      {sinCanales && (
        <div className="alert alert-info" style={{ marginTop: 16 }}>
          Todavía no enviamos por WhatsApp ni por mensaje de texto. Puedes dejar marcado lo
          que quieras y lo vamos a respetar desde el día que los conectemos — no te lo vamos
          a volver a preguntar.
        </div>
      )}

      <div className="card" style={{ maxWidth: 620, marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Sobre tus viajes</h3>
        <p className="meta">
          Tu boleto, tu comprobante y los avisos si tu viaje cambia de hora o se cancela.
        </p>

        <label className="casilla">
          <input type="checkbox" checked disabled />
          <span className="casilla-texto">
            <strong>Correo</strong>
            <span className="casilla-nota">
              Siempre. Es donde llega tu boleto con el QR: sin eso no tendrías qué mostrar
              al embarcar.
            </span>
          </span>
        </label>

        <Casilla etiqueta="WhatsApp" marcado={prefs.infoWhatsapp} onChange={marcar("infoWhatsapp")}
                 disponible={prefs.whatsappDisponible} />
        <Casilla etiqueta="Mensaje de texto" marcado={prefs.infoSms} onChange={marcar("infoSms")}
                 disponible={prefs.smsDisponible} />
      </div>

      <div className="card" style={{ maxWidth: 620, marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>Ofertas y novedades</h3>
        <p className="meta">
          Promociones, descuentos y sorteos. Viene apagado: solo te escribimos si lo
          enciendes, y lo puedes apagar cuando quieras.
        </p>

        <Casilla etiqueta="Correo" marcado={prefs.promoEmail} onChange={marcar("promoEmail")} disponible />
        <Casilla etiqueta="WhatsApp" marcado={prefs.promoWhatsapp} onChange={marcar("promoWhatsapp")}
                 disponible={prefs.whatsappDisponible} />
        <Casilla etiqueta="Mensaje de texto" marcado={prefs.promoSms} onChange={marcar("promoSms")}
                 disponible={prefs.smsDisponible} />

        {/* Solo mientras esté aceptada. Decir "aceptaste el tal día" con todo
            apagado suena a que le siguen llegando cosas. */}
        {prefs.promoAceptadoAt && (prefs.promoEmail || prefs.promoWhatsapp || prefs.promoSms) && (
          <p className="meta" style={{ marginTop: 14 }}>
            Aceptaste recibir publicidad el {prefs.promoAceptadoAt.slice(0, 10)}.
          </p>
        )}
      </div>

      <button className="btn btn-primary" style={{ marginTop: 18 }}
              onClick={guardar} disabled={guardando}>
        {guardando ? "Guardando…" : "Guardar preferencias"}
      </button>

      <p className="meta" style={{ marginTop: 22, maxWidth: 620 }}>
        Puedes cambiar esto cuando quieras. Lo que decidas acá no afecta a los correos que
        son parte de tu compra. Cómo tratamos tus datos está en la{" "}
        <Link to="/privacidad">política de privacidad</Link>.
      </p>
    </CuentaLayout>
  );
}

function Casilla({ etiqueta, marcado, onChange, disponible }) {
  return (
    <label className="casilla">
      <input type="checkbox" checked={marcado} onChange={onChange} />
      <span className="casilla-texto">
        <strong>{etiqueta}</strong>
        {!disponible && (
          <span className="casilla-nota">Todavía no lo tenemos conectado.</span>
        )}
      </span>
    </label>
  );
}
