import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { soles } from "../services/publicApi";
import ViajesCancelados from "../components/ViajesCancelados";
import MetodosGuardados from "../components/MetodosGuardados";
import CambiarClave from "../components/CambiarClave";
import { estaLogueado, clienteActual, cerrarSesion, getPerfil, actualizarPerfil, getMisViajes } from "../services/authCliente";

export default function MiCuenta() {
  const navigate = useNavigate();
  const [perfil, setPerfil] = useState(clienteActual());
  const [viajes, setViajes] = useState([]);
  const [errorViajes, setErrorViajes] = useState(false);
  const [tab, setTab] = useState("proximos");
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState(null);

  const cargarViajes = () => {
    setErrorViajes(false);
    getMisViajes().then(setViajes).catch(() => setErrorViajes(true));
  };

  useEffect(() => {
    if (!estaLogueado()) { navigate("/ingresar?next=/mi-cuenta"); return; }
    getPerfil().then(setPerfil).catch(() => {});
    cargarViajes();
  }, [navigate]);

  const salir = () => { cerrarSesion(); navigate("/"); };

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true); setMsg(null);
    try { await actualizarPerfil(perfil); setMsg("Datos actualizados."); }
    catch (err) { setMsg(err.message); }
    finally { setGuardando(false); }
  };

  const setP = (c) => (e) => setPerfil({ ...perfil, [c]: e.target.value });
  if (!perfil) return null;

  const proximos = viajes.filter((v) => v.proximo && v.estado === "PAGADO");
  const historial = viajes.filter((v) => !v.proximo || v.estado !== "PAGADO");

  return (
    <>
      <Header />
      <section className="section">
        <div className="wrap">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 30 }}>Hola, {perfil.nombres || "viajero"}</h2>
            </div>
            <button className="btn btn-ghost" onClick={salir}>Cerrar sesión</button>
          </div>

          {/* Saldo a favor y viajes cancelados: va arriba porque es lo que el
              cliente necesita resolver antes que nada. */}
          <div style={{ marginTop: 20 }}>
            <ViajesCancelados />
          </div>

          <div className="steps" style={{ justifyContent: "flex-start", marginTop: 20 }}>
            {[["proximos", "Próximos viajes"], ["historial", "Historial"], ["datos", "Mis datos"],
              ["pagos", "Formas de pago"], ["seguridad", "Seguridad"]].map(([k, label]) => (
              <button key={k} className={`btn ${tab === k ? "btn-primary" : "btn-ghost"}`} onClick={() => setTab(k)}>{label}</button>
            ))}
          </div>

          {(tab === "proximos" || tab === "historial") && errorViajes && (
            <div className="alert alert-warn" style={{ marginTop: 24 }}>
              No pudimos cargar tus viajes. <button className="btn-link" onClick={cargarViajes}>Reintentar</button>
            </div>
          )}
          {tab === "proximos" && !errorViajes &&
            <ListaViajes viajes={proximos} vacio="No tienes viajes próximos. ¡Compra tu pasaje!" />}
          {tab === "historial" && !errorViajes &&
            <ListaViajes viajes={historial} vacio="Aún no tienes viajes en tu historial." />}

          {tab === "datos" && (
            <div className="card" style={{ maxWidth: 660, marginTop: 24 }}>
              {msg && <div className="alert alert-info">{msg}</div>}
              <form onSubmit={guardar}>
                <div className="form-grid">
                  <div className="field"><label>Nombres</label><input value={perfil.nombres || ""} onChange={setP("nombres")} /></div>
                  <div className="field"><label>Apellidos</label><input value={perfil.apellidos || ""} onChange={setP("apellidos")} /></div>
                  <div className="field"><label>Correo (no editable)</label><input value={perfil.email || ""} disabled /></div>
                  <div className="field"><label>Tipo de documento</label>
                    <select value={perfil.tipoDocumento || "DNI"} onChange={setP("tipoDocumento")}>
                      <option value="DNI">DNI</option>
                      <option value="CE">Carné de extranjería</option>
                      <option value="PASAPORTE">Pasaporte</option>
                    </select>
                  </div>
                  <div className="field"><label>N° de documento</label><input value={perfil.numeroDocumento || ""} onChange={setP("numeroDocumento")} /></div>
                  <div className="field"><label>País del documento</label><input value={perfil.paisDocumento || ""} onChange={setP("paisDocumento")} maxLength={2} /></div>
                  <div className="field"><label>Fecha de nacimiento</label><input type="date" value={perfil.fechaNacimiento || ""} onChange={setP("fechaNacimiento")} /></div>
                  <div className="field"><label>Cód. país tel.</label><input value={perfil.codigoPaisTelefono || ""} onChange={setP("codigoPaisTelefono")} /></div>
                  <div className="field"><label>Teléfono</label><input value={perfil.telefono || ""} onChange={setP("telefono")} /></div>
                </div>
                <button className="btn btn-primary" type="submit" disabled={guardando} style={{ marginTop: 18 }}>
                  {guardando ? "Guardando…" : "Guardar cambios"}
                </button>
              </form>
            </div>
          )}

          {tab === "pagos" && <MetodosGuardados />}
          {tab === "seguridad" && <CambiarClave />}
        </div>
      </section>
      <Footer />
    </>
  );
}

/**
 * El QR del boleto, dentro de la cuenta.
 *
 * El código ya venía en los datos de cada viaje; lo único que faltaba era
 * mostrarlo. Hasta ahora el pasajero solo lo tenía en el correo de la compra:
 * si lo borraba o cambiaba de teléfono, llegaba al muelle sin nada.
 */
function BoletoQR({ codigo }) {
  const [qr, setQr] = useState(null);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (abierto && codigo && !qr)
      QRCode.toDataURL(codigo, { width: 220, margin: 1 }).then(setQr).catch(() => setQr(null));
  }, [abierto, codigo, qr]);

  if (!codigo) return null;

  return (
    <div style={{ marginTop: 10 }}>
      <button className="btn-link" onClick={() => setAbierto((v) => !v)}>
        {abierto ? "Ocultar el QR" : "Ver mi boleto"}
      </button>
      {abierto && (
        <div style={{ marginTop: 10 }}>
          {qr
            ? <img src={qr} alt={"Código QR del boleto " + codigo} width={180} height={180} />
            : <span className="meta">Generando…</span>}
          <div className="meta" style={{ marginTop: 6 }}>
            Muéstralo al embarcar. También te llegó por correo al comprar.
          </div>
        </div>
      )}
    </div>
  );
}

function ListaViajes({ viajes, vacio }) {
  if (!viajes.length) return <div className="alert alert-info" style={{ marginTop: 24 }}>{vacio}</div>;
  return (
    <div style={{ marginTop: 24 }}>
      {viajes.map((v) => (
        <div className="viaje-row" key={v.ventaId}>
          <div>
            <div className="ruta">{v.ruta}</div>
            <div className="meta">
              {v.fechaSalida || "—"} · {v.horaSalida ? v.horaSalida.slice(0, 5) : "—"} h · Asiento {v.asientoTipo} #{v.asientoNumero}
            </div>
            <div style={{ marginTop: 8 }}>
              <span className="tag">{v.estado}</span>{" "}
              {v.embarqueEstado === "EMBARCADO" && <span className="tag">Embarcado</span>}
            </div>
            {v.estado === "PAGADO" && v.embarqueEstado !== "EMBARCADO" && (
              <BoletoQR codigo={v.codigoQr} />
            )}
          </div>
          <div className="center">
            <div className="meta">Viaje</div>
            <div style={{ fontWeight: 700 }}>{v.viajeCodigo || "—"}</div>
          </div>
          <div className="center"><div className="precio" style={{ fontSize: 18 }}>{soles(v.precio)}</div></div>
        </div>
      ))}
    </div>
  );
}
