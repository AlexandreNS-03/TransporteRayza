import { useState } from "react";
import { Link } from "react-router-dom";
import Logo from "./Logo";
import AnnouncementBar from "./AnnouncementBar";
import ThemeToggle from "./ThemeToggle";
import { estaLogueado, clienteActual } from "../services/authCliente";

const LINKS = [
  { to: "/", label: "Inicio" },
  { to: "/comprar", label: "Comprar pasaje" },
  { to: "/servicios", label: "Servicios" },
  { to: "/destinos", label: "Destinos" },
  { to: "/contacto", label: "Contacto" },
];

export default function Header() {
  const logueado = estaLogueado();
  const cliente = clienteActual();
  const [abierto, setAbierto] = useState(false);
  const cerrar = () => setAbierto(false);

  return (
    <>
      <AnnouncementBar />
      <header className="site">
        <div className="wrap nav">
          <Logo />
          <nav className="nav-links">
            {LINKS.map((l) => <Link key={l.to} to={l.to}>{l.label}</Link>)}
          </nav>
          <div className="nav-actions">
            <ThemeToggle />
            {logueado ? (
              <Link className="btn btn-ghost" to="/mi-cuenta">
                {cliente?.nombres ? `Hola, ${cliente.nombres.split(" ")[0]}` : "Mi cuenta"}
              </Link>
            ) : (
              <Link className="btn btn-ghost hide-sm" to="/ingresar">Ingresar</Link>
            )}
            <Link className="btn btn-primary hide-sm" to="/comprar">Comprar pasaje</Link>
            <button
              type="button"
              className={`nav-burger${abierto ? " abierto" : ""}`}
              aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={abierto}
              onClick={() => setAbierto((v) => !v)}
            >
              <span /><span /><span />
            </button>
          </div>
        </div>

        {abierto && (
          <nav className="nav-mobile">
            {LINKS.map((l) => <Link key={l.to} to={l.to} onClick={cerrar}>{l.label}</Link>)}
            {!logueado && <Link to="/ingresar" onClick={cerrar}>Ingresar</Link>}
          </nav>
        )}
      </header>
    </>
  );
}
