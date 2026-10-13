import { useState } from "react";
import CuentaLayout from "../../components/CuentaLayout";
import CambiarClave from "../../components/CambiarClave";
import { OpcionesDePais } from "../../components/paises";
import { actualizarPerfil } from "../../services/authCliente";

const GENEROS = [["MASCULINO", "Masculino"], ["FEMENINO", "Femenino"], ["OTRO", "Otro"]];

/**
 * Datos de acceso y datos personales, en una sola página pero en dos bloques.
 *
 * Son cosas distintas: uno es cómo entras, el otro es quién eres para el
 * manifiesto. Mezclarlos en una lista de campos era parte de por qué la cuenta
 * se sentía un formulario largo.
 */
export default function Perfil() {
  const [msg, setMsg] = useState(null);
  const [guardando, setGuardando] = useState(false);

  return (
    <CuentaLayout>
      {(perfil, setPerfil) => {
        const campo = (c) => (e) => setPerfil({ ...perfil, [c]: e.target.value });

        const guardar = async (e) => {
          e.preventDefault();
          setGuardando(true); setMsg(null);
          try {
            // El "+51" del contacto de emergencia se mostraba pero no se
            // guardaba: quedaba un teléfono sin código de país, y el día que
            // alguien tenga que marcarlo no va a estar para adivinarlo. Si
            // escribió el número y no tocó el código, es Perú.
            const aGuardar = { ...perfil };
            if (aGuardar.emergenciaTelefono && !aGuardar.emergenciaCodigoPais)
              aGuardar.emergenciaCodigoPais = "+51";

            const actualizado = await actualizarPerfil(aGuardar);
            setPerfil(actualizado);
            setMsg("Datos actualizados.");
          }
          catch (err) { setMsg(err.message); }
          finally { setGuardando(false); }
        };

        return (
          <>
            <h3 style={{ marginTop: 26 }}>Datos de acceso</h3>
            <div className="card" style={{ maxWidth: 660, marginTop: 16 }}>
              <div className="field">
                <label htmlFor="correo">Correo</label>
                <input id="correo" value={perfil.email || ""} disabled />
                <div className="meta" style={{ marginTop: 6 }}>
                  Con este correo entras a tu cuenta, y es donde te llegan los boletos y
                  las boletas.{" "}
                  {perfil.correoVerificado
                    ? "Está confirmado."
                    : "Todavía no está confirmado."}
                </div>
              </div>

              <div className="field">
                <label htmlFor="telefono">Teléfono</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input id="codpais" style={{ maxWidth: 90 }} value={perfil.codigoPaisTelefono || ""}
                         onChange={campo("codigoPaisTelefono")} aria-label="Código de país" />
                  <input id="telefono" value={perfil.telefono || ""} onChange={campo("telefono")} />
                </div>
                <div className="meta" style={{ marginTop: 6 }}>
                  Lo usamos para avisarte si tu viaje cambia de hora.
                </div>
              </div>
            </div>

            <CambiarClave />

            <h3 style={{ marginTop: 34 }}>Datos personales</h3>
            <p className="meta" style={{ marginTop: 4, maxWidth: 620 }}>
              Tienen que coincidir con tu documento: el género y la nacionalidad van en el
              manifiesto de pasajeros que pide la Capitanía antes de cada salida.
            </p>

            <div className="card" style={{ maxWidth: 660, marginTop: 16 }}>
              <form onSubmit={guardar}>
                <div className="field"><label htmlFor="nombres">Nombres</label>
                  <input id="nombres" value={perfil.nombres || ""} onChange={campo("nombres")} /></div>
                <div className="field"><label htmlFor="apellidos">Apellidos</label>
                  <input id="apellidos" value={perfil.apellidos || ""} onChange={campo("apellidos")} /></div>

                <div className="field"><label htmlFor="tipodoc">Tipo de documento</label>
                  <select id="tipodoc" value={perfil.tipoDocumento || "DNI"} onChange={campo("tipoDocumento")}>
                    <option value="DNI">DNI</option>
                    <option value="CE">Carné de extranjería</option>
                    <option value="PASAPORTE">Pasaporte</option>
                  </select></div>
                <div className="field"><label htmlFor="numdoc">N° de documento</label>
                  <input id="numdoc" value={perfil.numeroDocumento || ""} onChange={campo("numeroDocumento")} /></div>

                <div className="field"><label htmlFor="nacimiento">Fecha de nacimiento</label>
                  <input id="nacimiento" type="date" value={perfil.fechaNacimiento || ""}
                         onChange={campo("fechaNacimiento")} /></div>

                <div className="field"><label htmlFor="genero">Género</label>
                  <select id="genero" value={perfil.genero || ""} onChange={campo("genero")}>
                    <option value="">Prefiero no decirlo</option>
                    {GENEROS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select></div>

                <div className="field"><label htmlFor="nacionalidad">Nacionalidad</label>
                  <select id="nacionalidad" value={perfil.nacionalidad || ""} onChange={campo("nacionalidad")}>
                    <option value="">Elige tu país</option>
                    <OpcionesDePais />
                  </select></div>

                <div className="field"><label htmlFor="paisdoc">País que emitió tu documento</label>
                  <select id="paisdoc" value={perfil.paisDocumento || "PE"} onChange={campo("paisDocumento")}>
                    <OpcionesDePais />
                  </select></div>

                {msg && <div className="alert alert-info" style={{ marginTop: 14 }} role="status">{msg}</div>}

                <button className="btn btn-primary" type="submit" disabled={guardando}
                        style={{ marginTop: 18 }}>
                  {guardando ? "Guardando…" : "Guardar cambios"}
                </button>
              </form>
            </div>

            <h3 style={{ marginTop: 34 }}>Contacto de emergencia</h3>
            <p className="meta" style={{ marginTop: 4, maxWidth: 620 }}>
              A quién llamamos si pasa algo durante tu viaje. No lo usamos para
              ninguna otra cosa, y no le escribimos nunca salvo que haga falta.
            </p>

            <div className="card" style={{ maxWidth: 660, marginTop: 16 }}>
              <form onSubmit={guardar}>
                <div className="field"><label htmlFor="em-nombres">Nombres</label>
                  <input id="em-nombres" value={perfil.emergenciaNombres || ""}
                         onChange={campo("emergenciaNombres")} /></div>
                <div className="field"><label htmlFor="em-apellidos">Apellidos</label>
                  <input id="em-apellidos" value={perfil.emergenciaApellidos || ""}
                         onChange={campo("emergenciaApellidos")} /></div>
                <div className="field"><label htmlFor="em-relacion">Qué es tuyo</label>
                  <input id="em-relacion" value={perfil.emergenciaRelacion || ""}
                         onChange={campo("emergenciaRelacion")}
                         placeholder="Madre, hermano, pareja…" maxLength={40} /></div>
                <div className="field">
                  <label htmlFor="em-telefono">Teléfono</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input id="em-codpais" style={{ maxWidth: 90 }}
                           value={perfil.emergenciaCodigoPais || "+51"}
                           onChange={campo("emergenciaCodigoPais")} aria-label="Código de país" />
                    <input id="em-telefono" value={perfil.emergenciaTelefono || ""}
                           onChange={campo("emergenciaTelefono")} />
                  </div>
                  <div className="meta" style={{ marginTop: 6 }}>
                    Es lo único imprescindible: con el número alcanza.
                  </div>
                </div>

                <button className="btn btn-primary" type="submit" disabled={guardando}
                        style={{ marginTop: 18 }}>
                  {guardando ? "Guardando…" : "Guardar contacto"}
                </button>
              </form>
            </div>
          </>
        );
      }}
    </CuentaLayout>
  );
}
