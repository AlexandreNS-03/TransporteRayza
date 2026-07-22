package com.example.demo.dto;

/** Datos públicos del cliente (sin password). Se usa en perfil y respuestas de auth. */
public class ClienteDTO {
    private String id;
    private String email;
    private String nombres;
    private String apellidos;
    private String tipoDocumento;
    private String numeroDocumento;
    private String paisDocumento;
    private String fechaNacimiento;
    private String codigoPaisTelefono;
    private String telefono;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

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
