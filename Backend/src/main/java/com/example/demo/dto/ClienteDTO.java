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
    /** MASCULINO | FEMENINO | OTRO. Lo pide la Capitanía para el manifiesto. */
    private String genero;
    /** ISO-2 del país de nacionalidad. También va al manifiesto. */
    private String nacionalidad;
    /** Solo lectura: el cliente no se marca a sí mismo como verificado. */
    private boolean correoVerificado;
    private boolean celularVerificado;
    /** Si hoy hay canal para mandar el código. Si no, no se ofrece. */
    private boolean puedeVerificarCelular;
    /* Contacto de emergencia: a quién llamamos si pasa algo en el viaje. */
    private String emergenciaNombres;
    private String emergenciaApellidos;
    private String emergenciaRelacion;
    private String emergenciaCodigoPais;
    private String emergenciaTelefono;

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

    public String getGenero() { return genero; }
    public void setGenero(String genero) { this.genero = genero; }

    public String getNacionalidad() { return nacionalidad; }
    public void setNacionalidad(String nacionalidad) { this.nacionalidad = nacionalidad; }

    public boolean isCorreoVerificado() { return correoVerificado; }
    public void setCorreoVerificado(boolean correoVerificado) { this.correoVerificado = correoVerificado; }

    public String getEmergenciaNombres() { return emergenciaNombres; }
    public void setEmergenciaNombres(String v) { this.emergenciaNombres = v; }

    public String getEmergenciaApellidos() { return emergenciaApellidos; }
    public void setEmergenciaApellidos(String v) { this.emergenciaApellidos = v; }

    public String getEmergenciaRelacion() { return emergenciaRelacion; }
    public void setEmergenciaRelacion(String v) { this.emergenciaRelacion = v; }

    public String getEmergenciaCodigoPais() { return emergenciaCodigoPais; }
    public void setEmergenciaCodigoPais(String v) { this.emergenciaCodigoPais = v; }

    public String getEmergenciaTelefono() { return emergenciaTelefono; }
    public void setEmergenciaTelefono(String v) { this.emergenciaTelefono = v; }

    public boolean isCelularVerificado() { return celularVerificado; }
    public void setCelularVerificado(boolean v) { this.celularVerificado = v; }

    public boolean isPuedeVerificarCelular() { return puedeVerificarCelular; }
    public void setPuedeVerificarCelular(boolean v) { this.puedeVerificarCelular = v; }
}
