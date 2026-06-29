import { Navigate } from "react-router-dom";

function PrivateRoute({ children, rolPermitido }) {

    const usuario = JSON.parse(
        localStorage.getItem("usuario")
    );

    if (!usuario) {
        return <Navigate to="/" />;
    }

    if (usuario.rol !== rolPermitido) {
        return <Navigate to="/" />;
    }

    return children;
}

export default PrivateRoute;