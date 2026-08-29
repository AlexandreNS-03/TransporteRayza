import axios from "axios";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8080") + "/auth";

export const login = async (username, password) => {

    const response = await axios.post(
        `${API_URL}/login`,
        {
            username,
            password
        }
    );

    return response.data;
};

/**
 * Segundo paso del login: el código que llegó al correo.
 *
 * Se llama sin token porque justamente todavía no hay: el token sale de acá.
 */
export const verificarCodigo = async (desafioId, codigo) => {
    const response = await axios.post(`${API_URL}/verificar-codigo`, { desafioId, codigo });
    return response.data;
};
