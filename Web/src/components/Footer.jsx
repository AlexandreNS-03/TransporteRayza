import { Link } from "react-router-dom";
import { LogoMark } from "./Logo";

export default function Footer() {
  return (
    <footer className="site">
      <div className="wrap">
        <div className="cols">
          <div>
            <div className="logo" style={{ marginBottom: 14 }}>
              <LogoMark size={40} />
              <span className="txt">
                <b style={{ color: "#fff" }}>Transportes <span style={{ color: "var(--accent)" }}>Rayza</span></b>
                <small style={{ color: "#b9c8e0" }}>Amazonía · Perú</small>
              </span>
            </div>
            <p style={{ fontSize: 14.5, maxWidth: 300, lineHeight: 1.7 }}>
              Multiservicios Rayza E.I.R.L. — Transporte fluvial de pasajeros y encomiendas en la región Loreto, Perú.
            </p>
            <div className="social">
              <a href="https://www.facebook.com/multitrayza/" target="_blank" rel="noopener" aria-label="Facebook">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 10-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0022 12z"/></svg>
              </a>
              <a href="https://www.instagram.com/transportes_rayza/" target="_blank" rel="noopener" aria-label="Instagram">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>
              </a>
            </div>
          </div>
          <div>
            <h4>Viaja</h4>
            <ul>
              <li><Link to="/comprar">Comprar pasaje</Link></li>
              <li><Link to="/comprar">Buscar viajes</Link></li>
              <li><Link to="/mi-cuenta">Mis viajes</Link></li>
              <li><a href="/#destinos">Destinos</a></li>
            </ul>
          </div>
          <div>
            <h4>Empresa</h4>
            <ul>
              <li><a href="/#servicios">Servicios</a></li>
              <li><a href="/#nosotros">Nosotros</a></li>
              <li><a href="/#contacto">Contacto</a></li>
              <li><a href="https://sistema.tudominio.com">Acceso del personal</a></li>
            </ul>
          </div>
          <div>
            <h4>Ayuda</h4>
            <ul>
              <li><a href="/#contacto">Centro de ayuda</a></li>
              <li><a href="/#contacto">Encomiendas</a></li>
              <li><a href="/#contacto">Términos y condiciones</a></li>
            </ul>
          </div>
        </div>
        <div className="foot-bottom">
          <span>© {new Date().getFullYear()} Transportes Rayza · Multiservicios Rayza E.I.R.L.</span>
          <span>Iquitos · Requena — Loreto, Perú</span>
        </div>
      </div>
    </footer>
  );
}
