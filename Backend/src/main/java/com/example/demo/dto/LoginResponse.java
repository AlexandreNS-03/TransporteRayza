package com.example.demo.dto;

public class LoginResponse {

    private String token;
    private String username;
    private String nombre;
    private String rol;
    private String sucursalId;
    private String sucursalNombre;

    /* Cuando el usuario tiene segundo factor, el login NO devuelve token: devuelve
       el desafío para que el navegador pida el código. Sin esto, bastaría ignorar
       el aviso en pantalla para entrar igual. */
    private boolean requiereCodigo;
    private String desafioId;
    private String correoPista;

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

    public boolean isRequiereCodigo() { return requiereCodigo; }
    public void setRequiereCodigo(boolean v) { this.requiereCodigo = v; }
    public String getDesafioId() { return desafioId; }
    public void setDesafioId(String v) { this.desafioId = v; }
    public String getCorreoPista() { return correoPista; }
    public void setCorreoPista(String v) { this.correoPista = v; }
}
