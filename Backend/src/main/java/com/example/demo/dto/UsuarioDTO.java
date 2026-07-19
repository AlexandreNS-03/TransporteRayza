package com.example.demo.dto;

import java.time.LocalDateTime;

public class UsuarioDTO {
    private String id;
    private String username;
    private String nombre;
    private String email;
    private String rol;
    private Boolean activo;
    private String ultimoLogin;
    private String createdAt;
    private String sucursalId;
    private String sucursalNombre;

    public UsuarioDTO(String id, String username, String nombre, String email,
                      String rol, Boolean activo, String ultimoLogin, String createdAt,
                      String sucursalId, String sucursalNombre) {
        this.id = id;
        this.username = username;
        this.nombre = nombre;
        this.email = email;
        this.rol = rol;
        this.activo = activo;
        this.ultimoLogin = ultimoLogin;
        this.createdAt = createdAt;
        this.sucursalId = sucursalId;
        this.sucursalNombre = sucursalNombre;
    }

    public String getId() { return id; }
    public String getUsername() { return username; }
    public String getNombre() { return nombre; }
    public String getEmail() { return email; }
    public String getRol() { return rol; }
    public Boolean getActivo() { return activo; }
    public String getUltimoLogin() { return ultimoLogin; }
    public String getCreatedAt() { return createdAt; }
    public String getSucursalId() { return sucursalId; }
    public String getSucursalNombre() { return sucursalNombre; }
}