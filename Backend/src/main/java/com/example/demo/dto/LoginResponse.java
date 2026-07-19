package com.example.demo.dto;

public class LoginResponse {

    private String token;
    private String username;
    private String nombre;
    private String rol;
    private String sucursalId;
    private String sucursalNombre;

    public LoginResponse(String token, String username, String nombre, String rol,
                         String sucursalId, String sucursalNombre) {
        this.token = token;
        this.username = username;
        this.nombre = nombre;
        this.rol = rol;
        this.sucursalId = sucursalId;
        this.sucursalNombre = sucursalNombre;
    }

    public String getToken()    { return token; }

    public String getNombre() {return nombre;}

    public String getRol() {
        return rol;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getSucursalId() { return sucursalId; }

    public String getSucursalNombre() { return sucursalNombre; }
}
