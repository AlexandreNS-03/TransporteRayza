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