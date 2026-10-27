package com.example.demo.dto;

/**
 * Lo que el mostrador ve de una cuenta cuando el pasajero dicta su código.
 *
 * <p>Es a propósito más chico que {@link ClienteDTO}: acá solo va lo que hace
 * falta para llenar la venta. Ni el correo, ni el saldo, ni el contacto de
 * emergencia, ni el historial. Quien atiende necesita saber a quién está
 * vendiendo, no leer la cuenta entera de un cliente.
 */
public class PasajeroFrecuenteDTO {

    private String codigoPasajero;
    private String nombreCompleto;
    private String tipoDocumento;
    private String numeroDocumento;
    private String telefono;
    private String fechaNacimiento;   // yyyy-MM-dd, para calcular la edad del día del viaje
    private String sexo;              // Masculino | Femenino | Otro

    public String getCodigoPasajero() { return codigoPasajero; }
    public void setCodigoPasajero(String v) { this.codigoPasajero = v; }

    public String getNombreCompleto() { return nombreCompleto; }
    public void setNombreCompleto(String v) { this.nombreCompleto = v; }

    public String getTipoDocumento() { return tipoDocumento; }
    public void setTipoDocumento(String v) { this.tipoDocumento = v; }

    public String getNumeroDocumento() { return numeroDocumento; }
    public void setNumeroDocumento(String v) { this.numeroDocumento = v; }

    public String getTelefono() { return telefono; }
    public void setTelefono(String v) { this.telefono = v; }

    public String getFechaNacimiento() { return fechaNacimiento; }
    public void setFechaNacimiento(String v) { this.fechaNacimiento = v; }

    public String getSexo() { return sexo; }
    public void setSexo(String v) { this.sexo = v; }
}
