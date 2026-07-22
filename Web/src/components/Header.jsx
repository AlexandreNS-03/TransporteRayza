import { Link } from "react-router-dom";
import Logo from "./Logo";
import AnnouncementBar from "./AnnouncementBar";
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
            <a href="/#servicios">Servicios</a>
            <a href="/#destinos">Destinos</a>
            <a href="/#contacto">Contacto</a>
          </nav>
          <div className="nav-actions">
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
