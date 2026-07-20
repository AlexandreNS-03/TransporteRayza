import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

function SupervisorDashboard() {
    const navigate = useNavigate();
    const [menuAbierto, setMenuAbierto] = useState(false);
    const usuario = JSON.parse(localStorage.getItem("usuario"));

    const cerrarSesion = () => {
        localStorage.removeItem("usuario");
        localStorage.removeItem("token");
        navigate("/");
    };

    const iniciales = usuario?.nombre
        ?.split(" ")
        .map(n => n[0])
        .slice(0, 2)
        .join("") || "U";

    const item = ({ isActive }) => isActive ? "sb-item active" : "sb-item";

    return (
        <div className="dashboard-layout">

            {menuAbierto && <div className="sidebar-overlay" onClick={() => setMenuAbierto(false)}></div>}

            {/* SIDEBAR */}
            <aside className={"sidebar" + (menuAbierto ? " abierta" : "")}>
                <div className="sb-header">
                    <div className="sb-logo">
                        <div className="sb-gear">
                            <i className="ti ti-settings"></i>
                        </div>
                        <div className="sb-logo-text">
                            <strong>TRANSPORTES RAYZA</strong>
                            <span>Sistema Administrativo</span>
                            <span>v1.0</span>
                        </div>
                    </div>
                </div>

                <nav className="sb-menu" onClick={() => setMenuAbierto(false)}>
                    <NavLink to="/supervisor" end className={item}>
                        <i className="ti ti-home"></i> Dashboard
                    </NavLink>

                    <p className="sb-section">OPERACIONES</p>
                    <NavLink to="/supervisor/viajes" className={item}>
                        <i className="ti ti-ship"></i> Viajes
                    </NavLink>
                    <NavLink to="/supervisor/manifiesto" className={item}>
                        <i className="ti ti-clipboard-list"></i> Manifiesto
                    </NavLink>
                    <NavLink to="/supervisor/embarque" className={item}>
                        <i className="ti ti-package"></i> Embarque
                    </NavLink>

                    <p className="sb-section">VENTAS</p>
                    <NavLink to="/supervisor/pasajes" className={item}>
                        <i className="ti ti-ticket"></i> Pasajes
                    </NavLink>
                    <NavLink to="/supervisor/encomiendas" className={item}>
                        <i className="ti ti-box-seam"></i> Encomiendas
                    </NavLink>

                    <p className="sb-section">FINANZAS</p>
                    <NavLink to="/supervisor/caja" className={item}>
                        <i className="ti ti-cash"></i> Caja
                    </NavLink>
                    <NavLink to="/supervisor/comprobantes" className={item}>
                        <i className="ti ti-file-invoice"></i> Comprobantes
                    </NavLink>

                    <p className="sb-section">AYUDA</p>
                    <NavLink to="/supervisor/soporte" className={item}>
                        <i className="ti ti-lifebuoy"></i> Soporte
                    </NavLink>
                </nav>
            </aside>

            {/* MAIN */}
            <div className="main-area">
                <header className="navbar">
                    <button className="menu-toggle" onClick={() => setMenuAbierto(true)} aria-label="Abrir menú"><i className="ti ti-menu-2"></i></button>
                    <span className="navbar-title">SISTEMA ADMINISTRATIVO</span>
                    <div className="navbar-user">
                        <div className="user-info">
                            <strong>{usuario?.nombre}</strong>
                            <span>{usuario?.sucursalNombre || usuario?.rol}</span>
                        </div>
                        <div className="user-avatar">{iniciales}</div>
                        <button className="logout-btn" onClick={cerrarSesion}>
                            <i className="ti ti-logout"></i>
                        </button>
                    </div>
                </header>

                <main className="content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

export default SupervisorDashboard;
