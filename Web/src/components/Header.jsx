import { Link } from "react-router-dom";
import Logo from "./Logo";
import AnnouncementBar from "./AnnouncementBar";
import ThemeToggle from "./ThemeToggle";
import { estaLogueado, clienteActual } from "../services/authCliente";

export default function Header() {
  const logueado = estaLogueado();
  const cliente = clienteActual();

  return (
    <>
      <AnnouncementBar />
      <header className="site">
        <div className="wrap nav">
          <Logo />
          <nav className="nav-links">
            <Link to="/">Inicio</Link>
            <Link to="/comprar">Comprar pasaje</Link>
            <Link to="/servicios">Servicios</Link>
            <Link to="/destinos">Destinos</Link>
            <Link to="/contacto">Contacto</Link>
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
            <Link className="btn btn-primary" to="/comprar">Comprar pasaje</Link>
          </div>
        </div>
      </header>
    </>
  );
}
