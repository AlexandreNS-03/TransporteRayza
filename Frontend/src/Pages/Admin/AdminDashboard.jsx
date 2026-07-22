import { useState } from "react";
import {NavLink, Outlet, useNavigate} from "react-router-dom";

function AdminDashboard() {
    const navigate = useNavigate();
    const [menuAbierto, setMenuAbierto] = useState(false);
    const usuario = JSON.parse(localStorage.getItem("usuario"));
    const rol = usuario?.rol;
    const esAdmin      = rol === "ADMIN";
    const esSupervisor = rol === "SUPERVISOR";
    const esEmpleado   = rol === "EMPLEADO";

    const cerrarSesion = () => {
        localStorage.removeItem("usuario");
        navigate("/");
    };

    const iniciales = usuario?.nombre
        ?.split(" ")
        .map(n => n[0])
        .slice(0, 2)
        .join("") || "U";

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
                    <NavLink to="/admin" end className={({ isActive }) => isActive ? "sb-item active" : "sb-item"}>
                        <i className="ti ti-home"></i> Dashboard
                    </NavLink>

                    <p className="sb-section">OPERACIONES</p>
                    <NavLink to="/admin/viajes" className={({ isActive }) => isActive ? "sb-item active" : "sb-item"}>
                        <i className="ti ti-ship"></i> Viajes
                    </NavLink>

                    {(esAdmin || esSupervisor) && (
                        <NavLink to="/admin/manifiesto" className={({ isActive }) => isActive ? "sb-item active" : "sb-item"}>
                            <i className="ti ti-clipboard-list"></i> Manifiesto
                        </NavLink>
                    )}

                    <NavLink to="/admin/embarque" className={({ isActive }) => isActive ? "sb-item active" : "sb-item"}>
                        <i className="ti ti-package"></i> Embarque
                    </NavLink>

                    <p className="sb-section">VENTAS</p>
                    <NavLink to="/admin/pasajes" className={({ isActive }) => isActive ? "sb-item active" : "sb-item"}>
                        <i className="ti ti-ticket"></i> Pasajes
                    </NavLink>
                    <NavLink to="/admin/encomiendas" className={({ isActive }) => isActive ? "sb-item active" : "sb-item"}>
                        <i className="ti ti-box-seam"></i> Encomiendas
                    </NavLink>

                    <p className="sb-section">FINANZAS</p>
                    <NavLink to="/admin/caja" className={({ isActive }) => isActive ? "sb-item active" : "sb-item"}>
                        <i className="ti ti-cash"></i> Caja
                    </NavLink>

                    {esAdmin && (
                        <NavLink to="/admin/comprobantes" className={({ isActive }) => isActive ? "sb-item active" : "sb-item"}>
                            <i className="ti ti-file-invoice"></i> Comprobantes
                        </NavLink>
                    )}

                    {esAdmin && (
                        <>
                            <p className="sb-section">ADMINISTRACIÓN</p>
                            <NavLink to="/admin/embarcaciones" className={({ isActive }) => isActive ? "sb-item active" : "sb-item"}>
                                <i className="ti ti-building"></i> Embarcaciones
                            </NavLink>
                            <NavLink to="/admin/sucursales" className={({ isActive }) => isActive ? "sb-item active" : "sb-item"}>
                                <i className="ti ti-building"></i> Sucursales
                            </NavLink>
                            <NavLink to="/admin/rutas" className={({ isActive }) => isActive ? "sb-item active" : "sb-item"}>
                                <i className="ti ti-route"></i> Rutas
                            </NavLink>

                            <NavLink to="/admin/paradas" className={({ isActive }) => isActive ? "sb-item active" : "sb-item"}>
                                <i className="ti ti-map-pin"></i> Paradas
                            </NavLink>
                        </>
                    )}

                    {esAdmin && (
                        <>
                            <p className="sb-section">SISTEMA</p>
                            <NavLink to="/admin/reportes" className={({ isActive }) => isActive ? "sb-item active" : "sb-item"}>
                                <i className="ti ti-chart-bar"></i> Reportes
                            </NavLink>
                            <NavLink to="/admin/roles" className={({ isActive }) => isActive ? "sb-item active" : "sb-item"}>
                                <i className="ti ti-users"></i> Roles
                            </NavLink>
                            <NavLink to="/admin/auditoria" className={({ isActive }) => isActive ? "sb-item active" : "sb-item"}>
                                <i className="ti ti-clipboard-check"></i> Auditoría
                            </NavLink>
                        </>
                    )}

                    <p className="sb-section">AYUDA</p>
                    <NavLink to="/admin/soporte" className={({ isActive }) => isActive ? "sb-item active" : "sb-item"}>
                        <i className="ti ti-lifebuoy"></i> Soporte
                    </NavLink>

                </nav>
            </aside>

            {/* MAIN */}
            <div className="main-area">

                {/* NAVBAR */}
                <header className="navbar">
                    <button className="menu-toggle" onClick={() => setMenuAbierto(true)} aria-label="Abrir menú"><i className="ti ti-menu-2"></i></button>
                    <span className="navbar-title">SISTEMA ADMINISTRATIVO</span>
                    <div className="navbar-user">
                        <div className="user-info">
                            <strong>{usuario?.nombre}</strong>
                            <span>{usuario?.rol}</span>
                        </div>
                        <div className="user-avatar">{iniciales}</div>
                        <button className="logout-btn" onClick={cerrarSesion}>
                            <i className="ti ti-logout"></i>
                        </button>
                    </div>
                </header>

                {/* CONTENIDO DE CADA PÁGINA */}

                <main className="content">
                    <Outlet />
                </main>

            </div>
        </div>
    );
}
export default AdminDashboard;