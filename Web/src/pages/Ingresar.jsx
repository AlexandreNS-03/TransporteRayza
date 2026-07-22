import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { login, registrar } from "../services/authCliente";

const REG_INICIAL = {
  email: "", password: "", nombres: "", apellidos: "",
  tipoDocumento: "DNI", numeroDocumento: "", paisDocumento: "PE",
  fechaNacimiento: "", codigoPaisTelefono: "+51", telefono: "",
};

export default function Ingresar() {
  const [modo, setModo] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [reg, setReg] = useState(REG_INICIAL);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const destino = sp.get("next") || "/mi-cuenta";

  const setR = (c) => (e) => setReg({ ...reg, [c]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError(null); setCargando(true);
    try {
      if (modo === "login") await login(email, password);
      else await registrar(reg);
      navigate(destino);
    } catch (err) { setError(err.message); }
    finally { setCargando(false); }
  };

  return (
    <>
      <Header />
      <section className="section">
        <div className="wrap" style={{ maxWidth: 620 }}>
          <div className="section-head" style={{ marginBottom: 20 }}>
            <div className="kicker">Mi cuenta</div>
            <h2>{modo === "login" ? "Iniciar sesión" : "Crear cuenta"}</h2>
          </div>

          <div className="card">
            {error && <div className="alert alert-warn">{error}</div>}
            <form onSubmit={submit}>
              {modo === "login" ? (
                <div className="form-grid">
                  <div className="field full"><label>Correo electrónico</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                  <div className="field full"><label>Contraseña</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
                </div>
              ) : (
                <div className="form-grid">
                  <div className="field"><label>Nombres</label><input value={reg.nombres} onChange={setR("nombres")} required /></div>
                  <div className="field"><label>Apellidos</label><input value={reg.apellidos} onChange={setR("apellidos")} required /></div>
                  <div className="field"><label>Correo electrónico</label><input type="email" value={reg.email} onChange={setR("email")} required /></div>
                  <div className="field"><label>Contraseña (mín. 6)</label><input type="password" value={reg.password} onChange={setR("password")} required /></div>
                  <div className="field"><label>Tipo de documento</label>
                    <select value={reg.tipoDocumento} onChange={setR("tipoDocumento")}>
                      <option value="DNI">DNI</option>
                      <option value="CE">Carné de extranjería</option>
                      <option value="PASAPORTE">Pasaporte</option>
                    </select>
                  </div>
                  <div className="field"><label>N° de documento</label><input value={reg.numeroDocumento} onChange={setR("numeroDocumento")} /></div>
                  <div className="field"><label>País del documento</label><input value={reg.paisDocumento} onChange={setR("paisDocumento")} placeholder="PE" maxLength={2} /></div>
                  <div className="field"><label>Fecha de nacimiento</label><input type="date" value={reg.fechaNacimiento} onChange={setR("fechaNacimiento")} /></div>
                  <div className="field"><label>Cód. país tel.</label><input value={reg.codigoPaisTelefono} onChange={setR("codigoPaisTelefono")} placeholder="+51" /></div>
                  <div className="field"><label>Teléfono</label><input value={reg.telefono} onChange={setR("telefono")} /></div>
                </div>
              )}

              <button className="btn btn-primary btn-block" type="submit" disabled={cargando} style={{ marginTop: 20 }}>
                {cargando ? "Procesando…" : modo === "login" ? "Ingresar" : "Crear cuenta"}
              </button>
            </form>

            <p className="muted center" style={{ marginTop: 18 }}>
              {modo === "login" ? (
                <>¿No tienes cuenta? <a href="#" onClick={(e) => { e.preventDefault(); setModo("registro"); setError(null); }}>Regístrate</a></>
              ) : (
                <>¿Ya tienes cuenta? <a href="#" onClick={(e) => { e.preventDefault(); setModo("login"); setError(null); }}>Inicia sesión</a></>
              )}
            </p>
            <p className="center" style={{ marginTop: 6 }}>
              <Link className="muted" to="/comprar">Comprar como invitado →</Link>
            </p>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
