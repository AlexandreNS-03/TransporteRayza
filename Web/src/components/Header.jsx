import { useState, useEffect, useRef } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import Logo from "./Logo";
import AnnouncementBar from "./AnnouncementBar";
import AnuncioModal from "./AnuncioModal";
import ThemeToggle from "./ThemeToggle";
import { IconPackage, IconCard } from "./Icons";
import { estaLogueado, clienteActual } from "../services/authCliente";

// "Comprar pasaje" no va acá: ya está como botón principal a la derecha.
// Rastreo y Pagar carga son lo mismo (encomiendas), así que van agrupados
// para que el menú no crezca sin control.
const LINKS = [
  { to: "/", label: "Inicio", exacto: true },
  { to: "/destinos", label: "Destinos" },
  { to: "/servicios", label: "Servicios" },
];
const ENCOMIENDAS = [
  { to: "/rastreo", label: "Rastrear encomienda", Icono: IconPackage, ayuda: "Mira dónde va tu paquete" },
  { to: "/paga-tu-carga", label: "Pagar carga", Icono: IconCard, ayuda: "Paga tu envío en línea" },
];
const LINKS_FIN = [{ to: "/contacto", label: "Contacto" }];

export default function Header() {
  const logueado = estaLogueado();
  const cliente = clienteActual();
  const [abierto, setAbierto] = useState(false);
  const [menuEnc, setMenuEnc] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const encRef = useRef(null);
  const { pathname } = useLocation();

  const cerrar = () => { setAbierto(false); setMenuEnc(false); };

  // Sombra sutil al bajar: separa el header del contenido sin ocupar más alto
  useEffect(() => {
    const alScroll = () => setScrolled(window.scrollY > 8);
    alScroll();
    window.addEventListener("scroll", alScroll, { passive: true });
    return () => window.removeEventListener("scroll", alScroll);
  }, []);

  // Cierra los menús al cambiar de página
  useEffect(() => { cerrar(); }, [pathname]);

  // Cierra el desplegable al hacer clic fuera
  useEffect(() => {
    const fuera = (e) => { if (encRef.current && !encRef.current.contains(e.target)) setMenuEnc(false); };
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, []);

  const encActivo = ENCOMIENDAS.some((l) => pathname.startsWith(l.to));
  const clase = ({ isActive }) => (isActive ? "activo" : undefined);

  return (
    <>
      <AnnouncementBar />
      <AnuncioModal />
      <header className={`site${scrolled ? " scrolled" : ""}`}>
        <div className="wrap nav">
          <Logo />

          <nav className="nav-links">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.exacto} className={clase}>{l.label}</NavLink>
            ))}

            <div className={`nav-drop${menuEnc ? " abierto" : ""}`} ref={encRef}>
              <button type="button"
                      className={`nav-drop-btn${encActivo ? " activo" : ""}`}
                      aria-expanded={menuEnc}
                      onClick={() => setMenuEnc((v) => !v)}>
                Encomiendas
                <svg width="10" height="6" viewBox="0 0 10 6" aria-hidden="true">
                  <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {menuEnc && (
                <div className="nav-drop-menu">
                  {ENCOMIENDAS.map((l) => (
                    <Link key={l.to} to={l.to} onClick={cerrar}>
                      <span className="nav-drop-ico" aria-hidden="true"><l.Icono /></span>
                      <span>
                        <strong>{l.label}</strong>
                        <small>{l.ayuda}</small>
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {LINKS_FIN.map((l) => (
              <NavLink key={l.to} to={l.to} className={clase}>{l.label}</NavLink>
            ))}
          </nav>

          <div className="nav-actions">
            <ThemeToggle />
            {logueado ? (
              <Link
                className="btn btn-ghost btn-cuenta"
                to="/mi-cuenta"
                aria-label={cliente?.nombres ? `Hola, ${cliente.nombres.split(" ")[0]}` : "Mi cuenta"}
              >
                <svg className="btn-cuenta-ico" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8"/>
                  <path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
                <span className="btn-cuenta-texto">
                  {cliente?.nombres ? `Hola, ${cliente.nombres.split(" ")[0]}` : "Mi cuenta"}
                </span>
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
            <p className="nav-mobile-sec">Encomiendas</p>
            {ENCOMIENDAS.map((l) => (
              <Link key={l.to} to={l.to} onClick={cerrar}>
                <span aria-hidden="true" style={{ marginRight: 8, display: "inline-flex", verticalAlign: "-4px" }}><l.Icono width={16} height={16} /></span>{l.label}
              </Link>
            ))}
            {LINKS_FIN.map((l) => <Link key={l.to} to={l.to} onClick={cerrar}>{l.label}</Link>)}
            {!logueado && <Link to="/ingresar" onClick={cerrar}>Ingresar</Link>}
            <Link className="btn btn-primary nav-mobile-cta" to="/comprar" onClick={cerrar}>
              Comprar pasaje
            </Link>
          </nav>
        )}
      </header>
    </>
  );
}
