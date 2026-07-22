package com.example.demo.dto;

/** Respuesta de registro/login del cliente: token JWT + datos del cliente. */
public class ClienteAuthResponse {
    private String token;
    private ClienteDTO cliente;

    public ClienteAuthResponse() {}
    public ClienteAuthResponse(String token, ClienteDTO cliente) {
        this.token = token;
        this.cliente = cliente;
    }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public ClienteDTO getCliente() { return cliente; }
    public void setCliente(ClienteDTO cliente) { this.cliente = cliente; }
}
