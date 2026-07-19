import { useState, useEffect } from "react";
import "./Roles.css";

import { apiFetch } from "../../../Services/api.js";

const ROLES = ["ADMIN", "SUPERVISOR", "EMPLEADO"];
const ROL_LABEL = { ADMIN: "Administrador", SUPERVISOR: "Supervisor", EMPLEADO: "Empleado" };

function badgeRol(rol) {
    switch (rol) {
        case "ADMIN":      return "badge badge-admin";
        case "SUPERVISOR": return "badge badge-supervisor";
        case "EMPLEADO":   return "badge badge-empleado";
        default:           return "badge";
    }
}

function iniciales(nombre) {
    if (!nombre) return "?";
    const partes = nombre.trim().split(" ");
    return (partes[0][0] + (partes[1]?.[0] || "")).toUpperCase();
}

function Roles() {
    const usuarioActual = JSON.parse(localStorage.getItem("usuario"));

    const [usuarios, setUsuarios]   = useState([]);
    const [sucursales, setSucursales] = useState([]);
    const [cargando, setCargando]   = useState(true);
    const [error, setError]         = useState(null);
    const [busqueda, setBusqueda]   = useState("");
    const [filtroRol, setFiltroRol] = useState("todos");
    const [filtroEstado, setFiltroEstado] = useState("todos");

    // Modal crear usuario
    const [modalCrear, setModalCrear]   = useState(false);
    const [guardando, setGuardando]     = useState(false);
    const [errorModal, setErrorModal]   = useState(null);
    const [formCrear, setFormCrear] = useState({
        username: "", password: "", nombre: "", email: "", rol: "EMPLEADO", sucursalId: ""
    });

    // Modal resetear contraseña
    const [modalReset, setModalReset]       = useState(null); // usuario seleccionado o null
    const [nuevaPassword, setNuevaPassword] = useState("");
    const [confirmarPassword, setConfirmarPassword] = useState("");
    const [reseteando, setReseteando]       = useState(false);
    const [errorReset, setErrorReset]       = useState(null);

    // Feedback de acciones inline (cambiar rol / activo)
    const [accionandoId, setAccionandoId] = useState(null);

    useEffect(() => { fetchUsuarios(); fetchSucursales(); }, []);

    const fetchSucursales = async () => {
        try {
            const data = await apiFetch("/api/sucursales/activas");
            setSucursales(data);
        } catch (err) { console.error(err); }
    };

    const fetchUsuarios = async () => {
        setCargando(true);
        setError(null);
        try {
            const data = await apiFetch("/api/usuarios");
            setUsuarios(data);
        } catch (err) { setError(err.message); }
        finally { setCargando(false); }
    };

    // ── Crear usuario ──
    const abrirModalCrear = () => {
        setFormCrear({ username: "", password: "", nombre: "", email: "", rol: "EMPLEADO", sucursalId: "" });
        setErrorModal(null);
        setModalCrear(true);
    };

    const handleChangeCrear = (e) => {
        const { name, value } = e.target;
        setFormCrear(prev => ({ ...prev, [name]: value }));
    };

    const confirmarCrear = async () => {
        if (!formCrear.username || !formCrear.password || !formCrear.nombre) {
            setErrorModal("Usuario, contraseña y nombre son obligatorios");
            return;
        }
        if (formCrear.password.length < 6) {
            setErrorModal("La contraseña debe tener al menos 6 caracteres");
            return;
        }
        setGuardando(true);
        setErrorModal(null);
        try {
            await apiFetch("/api/usuarios", { method: "POST", body: JSON.stringify(formCrear) });
            setModalCrear(false);
            fetchUsuarios();
        } catch (err) { setErrorModal(err.message); }
        finally { setGuardando(false); }
    };

    // ── Cambiar rol (inline) ──
    const cambiarRol = async (usuario, nuevoRol) => {
        if (nuevoRol === usuario.rol) return;
        setAccionandoId(usuario.id);
        try {
            const actualizado = await apiFetch(`/api/usuarios/${usuario.id}/rol`, {
                method: "PATCH",
                body: JSON.stringify({ rol: nuevoRol })
            });
            setUsuarios(prev => prev.map(u => u.id === usuario.id ? actualizado : u));
        } catch (err) {
            alert("Error al cambiar el rol: " + err.message);
        } finally {
            setAccionandoId(null);
        }
    };

    // ── Cambiar sucursal (inline) ──
    const cambiarSucursal = async (usuario, nuevaSucursalId) => {
        if ((usuario.sucursalId || "") === nuevaSucursalId) return;
        setAccionandoId(usuario.id);
        try {
            const actualizado = await apiFetch(`/api/usuarios/${usuario.id}/sucursal`, {
                method: "PATCH",
                body: JSON.stringify({ sucursalId: nuevaSucursalId })
            });
            setUsuarios(prev => prev.map(u => u.id === usuario.id ? actualizado : u));
        } catch (err) {
            alert("Error al cambiar la sucursal: " + err.message);
        } finally {
            setAccionandoId(null);
        }
    };

    // ── Activar / Desactivar ──
    const toggleActivo = async (usuario) => {
        if (usuario.username === usuarioActual?.username) {
            alert("No puedes desactivar tu propia cuenta");
            return;
        }
        setAccionandoId(usuario.id);
        try {
            const actualizado = await apiFetch(`/api/usuarios/${usuario.id}/activo`, { method: "PATCH" });
            setUsuarios(prev => prev.map(u => u.id === usuario.id ? actualizado : u));
        } catch (err) {
            alert("Error al cambiar el estado: " + err.message);
        } finally {
            setAccionandoId(null);
        }
    };

    // ── Resetear contraseña ──
    const abrirModalReset = (usuario) => {
        setModalReset(usuario);
        setNuevaPassword("");
        setConfirmarPassword("");
        setErrorReset(null);
    };

    const confirmarReset = async () => {
        if (nuevaPassword.length < 6) {
            setErrorReset("La contraseña debe tener al menos 6 caracteres");
            return;
        }
        if (nuevaPassword !== confirmarPassword) {
            setErrorReset("Las contraseñas no coinciden");
            return;
        }
        setReseteando(true);
        setErrorReset(null);
        try {
            await apiFetch(`/api/usuarios/${modalReset.id}/password`, {
                method: "PATCH",
                body: JSON.stringify({ nuevaPassword })
            });
            setModalReset(null);
        } catch (err) { setErrorReset(err.message); }
        finally { setReseteando(false); }
    };

    const usuariosFiltrados = usuarios.filter(u => {
        if (filtroRol !== "todos" && u.rol !== filtroRol) return false;
        if (filtroEstado === "activos" && !u.activo) return false;
        if (filtroEstado === "inactivos" && u.activo) return false;
        if (busqueda.trim()) {
            const q = busqueda.trim().toLowerCase();
            return u.username?.toLowerCase().includes(q) ||
                u.nombre?.toLowerCase().includes(q) ||
                u.email?.toLowerCase().includes(q);
        }
        return true;
    });

    return (
        <div className="roles-page">

            {/* ENCABEZADO */}
            <div className="roles-header">
                <div>
                    <h2>Roles y Usuarios</h2>
                    <p>Gestión de acceso y permisos del sistema</p>
                </div>
                <button className="btn-nuevo" onClick={abrirModalCrear}>
                    <i className="ti ti-user-plus"></i> Nuevo Usuario
                </button>
            </div>

            {/* FILTROS */}
            <div className="roles-filtros">
                <div className="filtro-grupo">
                    <label>Rol</label>
                    <select value={filtroRol} onChange={e => setFiltroRol(e.target.value)}>
                        <option value="todos">Todos</option>
                        {ROLES.map(r => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}
                    </select>
                </div>
                <div className="filtro-grupo">
                    <label>Estado</label>
                    <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
                        <option value="todos">Todos</option>
                        <option value="activos">Activos</option>
                        <option value="inactivos">Inactivos</option>
                    </select>
                </div>
                <div className="filtro-grupo">
                    <label>Buscar</label>
                    <div className="filtro-buscar">
                        <i className="ti ti-search"></i>
                        <input
                            type="text"
                            placeholder="Usuario, nombre o email..."
                            value={busqueda}
                            onChange={e => setBusqueda(e.target.value)}
                        />
                    </div>
                </div>
                <button className="btn-limpiar" onClick={() => { setBusqueda(""); setFiltroRol("todos"); setFiltroEstado("todos"); }}>
                    <i className="ti ti-filter-off"></i> Limpiar
                </button>
            </div>

            {/* TABLA */}
            {cargando && <div className="roles-estado"><i className="ti ti-loader-2 spin"></i> Cargando...</div>}
            {error && !cargando && <div className="roles-estado error"><i className="ti ti-alert-circle"></i> {error}</div>}

            {!cargando && !error && (
                <div className="roles-tabla-wrapper">
                    <table className="roles-tabla">
                        <thead>
                        <tr>
                            <th>Usuario</th>
                            <th>Contacto</th>
                            <th>Rol</th>
                            <th>Sucursal</th>
                            <th>Estado</th>
                            <th>Último acceso</th>
                            <th>Acciones</th>
                        </tr>
                        </thead>
                        <tbody>
                        {usuariosFiltrados.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="tabla-vacia">
                                    <i className="ti ti-users"></i>
                                    <span>No se encontraron usuarios</span>
                                </td>
                            </tr>
                        ) : (
                            usuariosFiltrados.map(u => (
                                <tr key={u.id} className={!u.activo ? "fila-inactiva" : ""}>
                                    <td>
                                        <div className="usuario-info">
                                            <div className="usuario-avatar">{iniciales(u.nombre)}</div>
                                            <div className="usuario-info-texto">
                                                <strong>{u.nombre}</strong>
                                                <span>@{u.username}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="usuario-email">{u.email || "—"}</span>
                                    </td>
                                    <td>
                                        <div className="rol-selector">
                                            <span className={badgeRol(u.rol)}>{ROL_LABEL[u.rol] || u.rol}</span>
                                            <select
                                                className="rol-select"
                                                value={u.rol}
                                                disabled={accionandoId === u.id}
                                                onChange={e => cambiarRol(u, e.target.value)}
                                                title="Cambiar rol"
                                            >
                                                {ROLES.map(r => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}
                                            </select>
                                        </div>
                                    </td>
                                    <td>
                                        <select
                                            className="sucursal-select"
                                            value={u.sucursalId || ""}
                                            disabled={accionandoId === u.id}
                                            onChange={e => cambiarSucursal(u, e.target.value)}
                                            title="Asignar sucursal (el usuario solo venderá viajes de su sucursal)"
                                        >
                                            <option value="">Todas</option>
                                            {sucursales.map(s => (
                                                <option key={s.id} value={s.id}>{s.nombre}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td>
                                        <button
                                            className={`estado-toggle ${u.activo ? "activo" : "inactivo"}`}
                                            onClick={() => toggleActivo(u)}
                                            disabled={accionandoId === u.id}
                                            title={u.activo ? "Clic para desactivar" : "Clic para activar"}
                                        >
                                            <span className="estado-toggle-dot"></span>
                                            {u.activo ? "Activo" : "Inactivo"}
                                        </button>
                                    </td>
                                    <td className="usuario-fecha">
                                        {u.ultimoLogin ? new Date(u.ultimoLogin).toLocaleString("es-PE", {
                                            day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
                                        }) : "Nunca"}
                                    </td>
                                    <td className="acciones-cell">
                                        <button
                                            className="btn-accion password"
                                            onClick={() => abrirModalReset(u)}
                                            title="Resetear contraseña"
                                        >
                                            <i className="ti ti-key"></i>
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* MODAL CREAR USUARIO */}
            {modalCrear && (
                <div className="modal-overlay" onClick={() => setModalCrear(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header-simple">
                            <h3><i className="ti ti-user-plus"></i> Nuevo Usuario</h3>
                            <button className="modal-cerrar" onClick={() => setModalCrear(false)}>
                                <i className="ti ti-x"></i>
                            </button>
                        </div>

                        <div className="modal-body">
                            <div className="form-fila">
                                <div className="form-grupo">
                                    <label>Usuario *</label>
                                    <input type="text" name="username" value={formCrear.username}
                                           onChange={handleChangeCrear} placeholder="jperez" />
                                </div>
                                <div className="form-grupo">
                                    <label>Contraseña *</label>
                                    <input type="password" name="password" value={formCrear.password}
                                           onChange={handleChangeCrear} placeholder="Mínimo 6 caracteres" />
                                </div>
                            </div>

                            <div className="form-grupo">
                                <label>Nombre completo *</label>
                                <input type="text" name="nombre" value={formCrear.nombre}
                                       onChange={handleChangeCrear} placeholder="Juan Pérez" />
                            </div>

                            <div className="form-grupo">
                                <label>Correo electrónico</label>
                                <input type="email" name="email" value={formCrear.email}
                                       onChange={handleChangeCrear} placeholder="jperez@rayza.com" />
                            </div>

                            <div className="form-fila">
                                <div className="form-grupo">
                                    <label>Rol *</label>
                                    <select name="rol" value={formCrear.rol} onChange={handleChangeCrear}>
                                        {ROLES.map(r => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}
                                    </select>
                                </div>
                                <div className="form-grupo">
                                    <label>Sucursal</label>
                                    <select name="sucursalId" value={formCrear.sucursalId} onChange={handleChangeCrear}>
                                        <option value="">Todas</option>
                                        {sucursales.map(s => (
                                            <option key={s.id} value={s.id}>{s.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {errorModal && (
                                <div className="modal-error">
                                    <i className="ti ti-alert-circle"></i> {errorModal}
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button className="btn-cancelar" onClick={() => setModalCrear(false)}>Cancelar</button>
                            <button className="btn-guardar" onClick={confirmarCrear} disabled={guardando}>
                                {guardando
                                    ? <><i className="ti ti-loader-2 spin"></i> Creando...</>
                                    : <><i className="ti ti-check"></i> Crear Usuario</>
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL RESETEAR CONTRASEÑA */}
            {modalReset && (
                <div className="modal-overlay" onClick={() => setModalReset(null)}>
                    <div className="modal modal-pequeno" onClick={e => e.stopPropagation()}>
                        <div className="modal-header-simple">
                            <h3><i className="ti ti-key"></i> Resetear Contraseña</h3>
                            <button className="modal-cerrar" onClick={() => setModalReset(null)}>
                                <i className="ti ti-x"></i>
                            </button>
                        </div>

                        <div className="modal-body">
                            <p className="reset-usuario-info">
                                Nueva contraseña para <strong>{modalReset.nombre}</strong> (@{modalReset.username})
                            </p>

                            <div className="form-grupo">
                                <label>Nueva contraseña *</label>
                                <input type="password" value={nuevaPassword}
                                       onChange={e => setNuevaPassword(e.target.value)}
                                       placeholder="Mínimo 6 caracteres" />
                            </div>

                            <div className="form-grupo">
                                <label>Confirmar contraseña *</label>
                                <input type="password" value={confirmarPassword}
                                       onChange={e => setConfirmarPassword(e.target.value)}
                                       placeholder="Repite la contraseña" />
                            </div>

                            {errorReset && (
                                <div className="modal-error">
                                    <i className="ti ti-alert-circle"></i> {errorReset}
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button className="btn-cancelar" onClick={() => setModalReset(null)}>Cancelar</button>
                            <button className="btn-guardar" onClick={confirmarReset} disabled={reseteando}>
                                {reseteando
                                    ? <><i className="ti ti-loader-2 spin"></i> Guardando...</>
                                    : <><i className="ti ti-check"></i> Guardar</>
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Roles;