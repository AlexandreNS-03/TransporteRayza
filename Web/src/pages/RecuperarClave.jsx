import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Seo from "../components/Seo";
import { pedirEnlaceRecuperacion, restablecerClave } from "../services/authCliente";

/**
 * Recuperar la contraseña, en sus dos momentos:
 *
 *   sin token en la URL  → pedir el enlace por correo
 *   con token            → elegir la contraseña nueva
 *
 * Es la misma página porque para quien la usa es un solo trámite; separarla en
 * dos rutas obligaría a explicar cuál es cuál.
 */
export default function RecuperarClave() {
  const [params] = useSearchParams();
  const token = params.get("token");

  return (
    <>
      <Seo titulo={token ? "Elige tu nueva contraseña" : "Recuperar contraseña"} />
      <Header />
      <section className="section">
        <div className="wrap" style={{ maxWidth: "min(460px, 100%)" }}>
          {token ? <ElegirNueva token={token} /> : <PedirEnlace />}
        </div>
      </section>
      <Footer />
    </>
  );
}

function PedirEnlace() {
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [error, setError] = useState(null);

  const enviar = async (e) => {
    e.preventDefault();
    setEnviando(true); setError(null);
    try {
      setAviso(await pedirEnlaceRecuperacion(email));
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  // El aviso no confirma que la cuenta exista: eso es a propósito.
  if (aviso) {
    return (
      <div className="card">
        <h1 style={{ fontSize: 22, marginTop: 0 }}>Revisa tu correo</h1>
        <p className="muted">{aviso}</p>
        <p className="muted" style={{ fontSize: 13 }}>
          El enlace vence en una hora. Si no te llega, revisa la carpeta de spam.
        </p>
        <Link className="btn btn-ghost" to="/ingresar">Volver a ingresar</Link>
      </div>
    );
  }

  return (
    <form className="card" onSubmit={enviar}>
      <h1 style={{ fontSize: 22, marginTop: 0 }}>¿Olvidaste tu contraseña?</h1>
      <p className="muted">
        Escribe tu correo y te enviamos un enlace para elegir una nueva.
      </p>

      <label className="campo" style={{ marginTop: 14 }}>
        <span>Tu correo</span>
        <input type="email" value={email} required autoFocus
               onChange={(e) => setEmail(e.target.value)} />
      </label>

      {error && <div className="alert alert-warn" style={{ marginTop: 12 }}>{error}</div>}

      <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
        <button className="btn btn-primary" disabled={enviando}>
          {enviando ? "Enviando…" : "Enviar enlace"}
        </button>
        <Link className="btn btn-ghost" to="/ingresar">Volver</Link>
      </div>
    </form>
  );
}

function ElegirNueva({ token }) {
  const [clave, setClave] = useState("");
  const [repetir, setRepetir] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState(null);

  const enviar = async (e) => {
    e.preventDefault();
    // Se avisa acá y no después del viaje al servidor: el token es de un solo
    // uso y gastarlo por un error de tipeo obligaría a pedir otro correo.
    if (clave !== repetir) { setError("Las dos contraseñas no son iguales."); return; }
    if (clave.length < 8)  { setError("La contraseña debe tener al menos 8 caracteres."); return; }

    setEnviando(true); setError(null);
    try {
      await restablecerClave(token, clave);
      setListo(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  if (listo) {
    return (
      <div className="card">
        <h1 style={{ fontSize: 22, marginTop: 0 }}>Contraseña cambiada</h1>
        <p className="muted">Ya puedes entrar con tu contraseña nueva.</p>
        <Link className="btn btn-primary" to="/ingresar">Ingresar</Link>
      </div>
    );
  }

  return (
    <form className="card" onSubmit={enviar}>
      <h1 style={{ fontSize: 22, marginTop: 0 }}>Elige tu nueva contraseña</h1>

      <label className="campo" style={{ marginTop: 14 }}>
        <span>Nueva contraseña (mínimo 8)</span>
        <input type="password" value={clave} required autoFocus autoComplete="new-password"
               onChange={(e) => setClave(e.target.value)} />
      </label>

      <label className="campo" style={{ marginTop: 12 }}>
        <span>Repítela</span>
        <input type="password" value={repetir} required autoComplete="new-password"
               onChange={(e) => setRepetir(e.target.value)} />
      </label>

      {error && <div className="alert alert-warn" style={{ marginTop: 12 }}>{error}</div>}

      <button className="btn btn-primary" style={{ marginTop: 18 }} disabled={enviando}>
        {enviando ? "Guardando…" : "Cambiar mi contraseña"}
      </button>
    </form>
  );
}
