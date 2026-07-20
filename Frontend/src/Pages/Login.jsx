import { useState } from "react";
import '../assets/Login.css';
import { useNavigate } from "react-router-dom";
import { login } from "../services/authService";

function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [verPass, setVerPass]   = useState(false);
    const [cargando, setCargando] = useState(false);
    const [error, setError]       = useState(null);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!username.trim() || !password) {
            setError("Ingresa tu usuario y contraseña");
            return;
        }
        setCargando(true);
        setError(null);
        try {
            const respuesta = await login(username, password);

            localStorage.setItem("token", respuesta.token);
            localStorage.setItem("usuario", JSON.stringify({
                username:       respuesta.username,
                nombre:         respuesta.nombre,
                rol:            respuesta.rol,
                sucursalId:     respuesta.sucursalId,
                sucursalNombre: respuesta.sucursalNombre
            }));

            if (respuesta.rol === "ADMIN")      navigate("/admin");
            else if (respuesta.rol === "SUPERVISOR") navigate("/supervisor");
            else if (respuesta.rol === "EMPLEADO")   navigate("/empleado");
        } catch (err) {
            setError("Usuario o contraseña incorrectos");
            console.error(err);
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="login-container">

            {/* Panel izquierdo (marca) */}
            <div className="left-panel">
                <div className="left-content">
                    <img src="/logo-rayza.png" alt="Transportes Rayza" className="login-logo" />
                    <h1>TRANSPORTES RAYZA</h1>
                    <div className="brand-line"></div>
                    <h2>Sistema de gestión para transporte fluvial</h2>
                    <p>Pasajes, encomiendas, caja y comprobantes electrónicos en una sola plataforma.</p>
                    <span className="left-footer">Sucursales Iquitos · Requena — Loreto, Perú</span>
                </div>
            </div>

            {/* Panel derecho (formulario) */}
            <div className="right-panel">
                <div className="login-card">
                    {/* Logo visible solo en móvil */}
                    <img src="/logo-rayza.png" alt="Transportes Rayza" className="login-logo-mobile" />

                    <h2>Iniciar Sesión</h2>
                    <p className="subtitle">Ingresa tus credenciales para acceder al sistema</p>

                    <form onSubmit={handleSubmit}>
                        <label htmlFor="usuario">Usuario</label>
                        <div className="input-wrap">
                            <i className="ti ti-user"></i>
                            <input
                                id="usuario"
                                type="text"
                                autoComplete="username"
                                placeholder="Ej: admin"
                                value={username}
                                onChange={(e) => { setUsername(e.target.value); setError(null); }}
                            />
                        </div>

                        <label htmlFor="clave">Contraseña</label>
                        <div className="input-wrap">
                            <i className="ti ti-lock"></i>
                            <input
                                id="clave"
                                type={verPass ? "text" : "password"}
                                autoComplete="current-password"
                                placeholder="Tu contraseña"
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                            />
                            <button type="button" className="toggle-pass"
                                    onClick={() => setVerPass(v => !v)}
                                    tabIndex={-1}
                                    aria-label={verPass ? "Ocultar contraseña" : "Mostrar contraseña"}>
                                <i className={`ti ${verPass ? "ti-eye-off" : "ti-eye"}`}></i>
                            </button>
                        </div>

                        {error && (
                            <div className="login-error">
                                <i className="ti ti-alert-circle"></i> {error}
                            </div>
                        )}

                        <button type="submit" className="btn-login" disabled={cargando}>
                            {cargando
                                ? <><i className="ti ti-loader-2 spin"></i> Ingresando...</>
                                : <><i className="ti ti-login"></i> Iniciar Sesión</>}
                        </button>
                    </form>

                    <p className="login-ayuda">
                        ¿Problemas para ingresar? Contacta al administrador.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Login;
