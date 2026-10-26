package com.example.demo.dto;

/**
 * Un acompañante guardado, con los campos que pide el formulario de compra:
 * así la pantalla puede llenarlo de una sin traducir nada.
 *
 * La edad viene calculada y no se guarda: una edad guardada queda mal al año
 * siguiente sin que nadie lo note, y la edad va al manifiesto.
 */
public class AcompananteDTO {

    private String id;
    private String nombreCompleto;
    private String tipoDocumento;
    private String numeroDocumento;
    /** yyyy-MM-dd */
    private String fechaNacimiento;
    /** Calculada al momento de pedirla. Null si no hay fecha de nacimiento. */
    private Integer edad;
    private String sexo;
    private String telefono;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getNombreCompleto() { return nombreCompleto; }
    public void setNombreCompleto(String v) { this.nombreCompleto = v; }
    public String getTipoDocumento() { return tipoDocumento; }
    public void setTipoDocumento(String v) { this.tipoDocumento = v; }
    public String getNumeroDocumento() { return numeroDocumento; }
    public void setNumeroDocumento(String v) { this.numeroDocumento = v; }
    public String getFechaNacimiento() { return fechaNacimiento; }
    public void setFechaNacimiento(String v) { this.fechaNacimiento = v; }
    public Integer getEdad() { return edad; }
    public void setEdad(Integer edad) { this.edad = edad; }
    public String getSexo() { return sexo; }
    public void setSexo(String sexo) { this.sexo = sexo; }
    public String getTelefono() { return telefono; }
    public void setTelefono(String telefono) { this.telefono = telefono; }
}
