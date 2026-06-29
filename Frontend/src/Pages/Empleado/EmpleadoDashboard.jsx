import { useState } from "react";
import { useNavigate, Outlet, NavLink } from "react-router-dom";
import "./EmpleadoDashboard.css";

function EmpleadoDashboard() {
    const navigate = useNavigate();
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

            {/* SIDEBAR */}
            <aside className="sidebar">
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

                <nav className="sb-menu">
                    <NavLink to="/empleado" end className={({ isActive }) => isActive ? "sb-item active" : "sb-item"}>
                        <i className="ti ti-home"></i> Dashboard
                    </NavLink>

                    <p className="sb-section">OPERACIONES</p>
                    <NavLink to="/empleado/viajes" className={({ isActive }) => isActive ? "sb-item active" : "sb-item"}>
                        <i className="ti ti-ship"></i> Viajes
                    </NavLink>

                    {(esAdmin || esSupervisor) && (
                        <NavLink to="/empleado/manifiesto" className={({ isActive }) => isActive ? "sb-item active" : "sb-item"}>
                            <i className="ti ti-clipboard-list"></i> Manifiesto
                        </NavLink>
                    )}

                    <NavLink to="/empleado/embarque" className={({ isActive }) => isActive ? "sb-item active" : "sb-item"}>
                        <i className="ti ti-package"></i> Embarque
                    </NavLink>

                    <NavLink to="/empleado/paradas" className={({ isActive }) => isActive ? "sb-item active" : "sb-item"}>
                        <i className="ti ti-map-pin"></i> Paradas
                    </NavLink>

                    <p className="sb-section">VENTAS</p>
                    <NavLink to="/empleado/pasajes" className={({ isActive }) => isActive ? "sb-item active" : "sb-item"}>
                        <i className="ti ti-ticket"></i> Pasajes
                    </NavLink>

                    <NavLink to="/empleado/encomiendas" className={({ isActive }) => isActive ? "sb-item active" : "sb-item"}>
                        <i className="ti ti-box"></i> Encomiendas
                    </NavLink>

                    <p className="sb-section">FINANZAS</p>
                    <NavLink to="/empleado/caja" className={({ isActive }) => isActive ? "sb-item active" : "sb-item"}>
                        <i className="ti ti-cash"></i> Caja
                    </NavLink>

                    {esAdmin && (
                        <NavLink to="/empleado/comprobantes" className={({ isActive }) => isActive ? "sb-item active" : "sb-item"}>
                            <i className="ti ti-file-invoice"></i> Comprobantes
                        </NavLink>
                    )}

                    {(esAdmin || esEmpleado || esSupervisor ) && (
                        <>
                            <p className="sb-section">ADMINISTRACIÓN</p>
                            <NavLink to="/empleado/sucursales" className={({ isActive }) => isActive ? "sb-item active" : "sb-item"}>
                                <i className="ti ti-building"></i> Sucursales
                            </NavLink>
                            <NavLink to="/empleado/rutas" className={({ isActive }) => isActive ? "sb-item active" : "sb-item"}>
                                <i className="ti ti-route"></i> Rutas
                            </NavLink>
                        </>
                    )}

                    {esAdmin && (
                        <>
                            <p className="sb-section">SISTEMA</p>
                            <NavLink to="/empleado/reportes" className={({ isActive }) => isActive ? "sb-item active" : "sb-item"}>
                                <i className="ti ti-chart-bar"></i> Reportes
                            </NavLink>
                            <NavLink to="/empleado/auditorias" className={({ isActive }) => isActive ? "sb-item active" : "sb-item"}>
                                <i className="ti ti-shield"></i> Auditorías
                            </NavLink>
                            <NavLink to="/empleado/roles" className={({ isActive }) => isActive ? "sb-item active" : "sb-item"}>
                                <i className="ti ti-users"></i> Roles y Permisos
                            </NavLink>
                        </>
                    )}

                </nav>
            </aside>

            {/* MAIN */}
            <div className="main-area">

                {/* NAVBAR */}
                <header className="navbar">
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

export default EmpleadoDashboard;