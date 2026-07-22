package com.example.demo.dto;

/** Datos para registrar un cliente nuevo. */
public class ClienteRegisterRequest {
    private String email;
    private String password;
    private String nombres;
    private String apellidos;
    private String tipoDocumento;       // DNI | CE | PASAPORTE
    private String numeroDocumento;
    private String paisDocumento;       // referencial (ISO-2), ej. PE
    private String fechaNacimiento;     // yyyy-MM-dd
    private String codigoPaisTelefono;  // ej. +51
    private String telefono;

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getNombres() { return nombres; }
    public void setNombres(String nombres) { this.nombres = nombres; }

    public String getApellidos() { return apellidos; }
    public void setApellidos(String apellidos) { this.apellidos = apellidos; }

    public String getTipoDocumento() { return tipoDocumento; }
    public void setTipoDocumento(String tipoDocumento) { this.tipoDocumento = tipoDocumento; }

    public String getNumeroDocumento() { return numeroDocumento; }
    public void setNumeroDocumento(String numeroDocumento) { this.numeroDocumento = numeroDocumento; }

    public String getPaisDocumento() { return paisDocumento; }
    public void setPaisDocumento(String paisDocumento) { this.paisDocumento = paisDocumento; }

    public String getFechaNacimiento() { return fechaNacimiento; }
    public void setFechaNacimiento(String fechaNacimiento) { this.fechaNacimiento = fechaNacimiento; }

    public String getCodigoPaisTelefono() { return codigoPaisTelefono; }
    public void setCodigoPaisTelefono(String codigoPaisTelefono) { this.codigoPaisTelefono = codigoPaisTelefono; }

    public String getTelefono() { return telefono; }
    public void setTelefono(String telefono) { this.telefono = telefono; }
}
