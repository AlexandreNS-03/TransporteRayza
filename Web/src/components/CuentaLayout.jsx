import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import AvisoCorreoSinVerificar from "./AvisoCorreoSinVerificar";
import { estaLogueado, clienteActual, cerrarSesion, getPerfil } from "../services/authCliente";

/**
 * El marco de la cuenta: saludo, menú y salida.
 *
 * La cuenta era una sola página con seis solapas y seguía creciendo. Pasa a
 * varias páginas con dirección propia, que además es lo que la gente espera:
 * poder guardar "mis boletas" en favoritos, o volver atrás sin perder dónde
 * estaba.
 */
const PAGINAS = [
  ["/mi-cuenta", "Resumen", true],
  ["/mi-cuenta/viajes", "Mis viajes"],
  ["/mi-cuenta/comprobantes", "Boletas y facturas"],
  ["/mi-cuenta/perfil", "Mis datos"],
  ["/mi-cuenta/documentos", "Documentos"],
  ["/mi-cuenta/pagos", "Formas de pago"],
  ["/mi-cuenta/ayuda", "Ayuda"],
];

export default function CuentaLayout({ titulo, children }) {
  const navigate = useNavigate();
  const [perfil, setPerfil] = useState(clienteActual());

  useEffect(() => {
    if (!estaLogueado()) {
      navigate("/ingresar?next=" + encodeURIComponent(window.location.pathname));
      return;
    }
    getPerfil().then(setPerfil).catch(() => {});
  }, [navigate]);

  const salir = () => { cerrarSesion(); navigate("/"); };

  if (!perfil) return null;

  return (
    <>
      <Header />
      <section className="section">
        <div className="wrap">
          <div style={{ display: "flex", justifyContent: "space-between",
                        alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <h2 style={{ fontSize: 30 }}>Hola, {perfil.nombres || "viajero"}</h2>
            <button className="btn btn-ghost" onClick={salir}>Cerrar sesión</button>
          </div>

          <nav className="steps" style={{ justifyContent: "flex-start", marginTop: 20 }}
               aria-label="Secciones de mi cuenta">
            {PAGINAS.map(([ruta, label, exacta]) => (
              <NavLink key={ruta} to={ruta} end={!!exacta}
                       className={({ isActive }) => `btn ${isActive ? "btn-primary" : "btn-ghost"}`}>
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Va en el marco y no en una página: mientras el correo no esté
              confirmado, el boleto puede estar llegando a otra bandeja. Eso hay
              que verlo desde cualquier sección, no solo si uno entra a sus datos. */}
          <AvisoCorreoSinVerificar perfil={perfil} onVerificado={setPerfil} />

          {titulo && <h3 style={{ marginTop: 26 }}>{titulo}</h3>}
          {typeof children === "function" ? children(perfil, setPerfil) : children}
        </div>
      </section>
      <Footer />
    </>
  );
}
