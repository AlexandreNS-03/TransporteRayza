package com.example.demo.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Confirmación de una compra de varios pasajes: un boleto (con su QR) por pasajero,
 * el total cobrado y si el correo salió. Cada pasajero embarca con su propio QR.
 */
public class ConfirmacionGrupoDTO {
    private List<ConfirmacionDTO> pasajeros;
    private BigDecimal montoTotal;
    private boolean correoEnviado;
    private String mensaje;
    private String correo;

    public List<ConfirmacionDTO> getPasajeros() { return pasajeros; }
    public void setPasajeros(List<ConfirmacionDTO> pasajeros) { this.pasajeros = pasajeros; }

    public BigDecimal getMontoTotal() { return montoTotal; }
    public void setMontoTotal(BigDecimal montoTotal) { this.montoTotal = montoTotal; }

    public boolean isCorreoEnviado() { return correoEnviado; }
    public void setCorreoEnviado(boolean correoEnviado) { this.correoEnviado = correoEnviado; }

    public String getMensaje() { return mensaje; }
    public void setMensaje(String mensaje) { this.mensaje = mensaje; }

    public String getCorreo() { return correo; }
    public void setCorreo(String correo) { this.correo = correo; }
}
