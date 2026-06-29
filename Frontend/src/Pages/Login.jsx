import { useState } from "react";
import '../assets/Login.css';
import LOGO2 from '../assets/LOGO2.png';
import { useNavigate } from "react-router-dom";
import { login } from "../services/authService";

function Login() {

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    const handleSubmit = async (e) => {

        e.preventDefault();

        try {

            const respuesta =
                await login(username, password);

            console.log(respuesta);

            localStorage.setItem("token", respuesta.token);
            localStorage.setItem("usuario", JSON.stringify({
                username: respuesta.username,
                nombre:   respuesta.nombre,
                rol:      respuesta.rol
            }));

            if (respuesta.rol === "ADMIN") {
                navigate("/admin");
            }

            if (respuesta.rol === "SUPERVISOR") {
                navigate("/supervisor");
            }

            if (respuesta.rol === "EMPLEADO") {
                navigate("/empleado");
            }

        } catch (error) {

            alert("Error al iniciar sesión");

            console.error(error);

        }
    };



    return (

        <div className="login-container">

            <div className="left-panel">

                <div className="logo-container">
                    <img src={LOGO2} alt="Logo" className="logo" />
                </div>

                <div className="overlay">

                    <div className="brand-section">
                        <h1>Transportes Rayza</h1>
                        <div className="brand-line"></div>
                    </div>

                    <h2>
                        Sistema de gestión
                        <br />
                        para transporte
                        <br />
                        fluvial
                    </h2>

                    <p>
                        Sistema administrativo para la gestión de transporte fluvial.
                        Control y organización en una sola plataforma.
                    </p>

                </div>

            </div>

            {/* Lado derecho */}
            <div className="right-panel">

                <div className="login-card">

                    <h2>Iniciar Sesión</h2>

                    <p className="subtitle">
                        Ingrese sus credenciales para acceder al panel administrativo
                    </p>

                    <form onSubmit={handleSubmit}>

                        <label>Correo Electrónico</label>

                        <input
                            type="text"
                            placeholder="capitan@rayza.com"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />

                        <label>Contraseña</label>

                        <input
                            type="password"
                            placeholder="••••••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />

                        <div className="remember">
                            <input type="checkbox" />
                            <span>Mantén mi sesión iniciada</span>
                        </div>

                        <button type="submit">
                            Authorize Access
                        </button>

                    </form>

                </div>

            </div>

        </div>
    );
}

export default Login;