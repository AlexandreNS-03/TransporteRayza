import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { confirmarCorreo } from "../services/authCliente";

/**
 * La página a la que llega el enlace del correo.
 *
 * Quien hace clic viene desde su bandeja, normalmente sin sesión abierta y a
 * veces desde otro teléfono. Por eso no pide entrar: la llave es el token del
 * enlace, que vence en una hora y sirve una sola vez.
 */
export default function VerificarCorreo() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [estado, setEstado] = useState({ cargando: true });

  useEffect(() => {
    if (!token) {
      setEstado({ cargando: false, ok: false, texto: "Este enlace está incompleto." });
      return;
    }
    confirmarCorreo(token)
      .then((texto) => setEstado({ cargando: false, ok: true, texto }))
      .catch((e) => setEstado({ cargando: false, ok: false, texto: e.message }));
  }, [token]);

  return (
    <>
      <Header />
      <section className="section">
        <div className="wrap" style={{ maxWidth: 560 }}>
          <h2 style={{ fontSize: 28 }}>Confirmar tu correo</h2>

          {estado.cargando ? (
            <p className="meta" style={{ marginTop: 16 }}>Un momento…</p>
          ) : (
            <>
              <div className={`alert ${estado.ok ? "alert-info" : "alert-warn"}`}
                   style={{ marginTop: 16 }} role="status">
                {estado.texto}
              </div>

              {estado.ok ? (
                <p style={{ marginTop: 18 }}>
                  Ya está. Tus boletos y tus comprobantes van a llegar a esa bandeja.{" "}
                  <Link to="/mi-cuenta">Ir a mi cuenta</Link>
                </p>
              ) : (
                <p className="meta" style={{ marginTop: 18 }}>
                  Entra a <Link to="/mi-cuenta/perfil">tus datos</Link> y pide un enlace
                  nuevo. Los enlaces vencen en una hora y sirven una sola vez.
                </p>
              )}
            </>
          )}
        </div>
      </section>
      <Footer />
    </>
  );
}
