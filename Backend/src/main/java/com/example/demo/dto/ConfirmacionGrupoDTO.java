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

    /**
     * El id con el que esta compra se le avisa a Meta.
     *
     * <p>El navegador lo manda tal cual en SU evento de compra para que los dos
     * avisos —el del navegador y el del servidor— se reconozcan como el mismo y
     * no se cuenten dos ventas. Va nulo cuando el servidor no avisa nada: ahí el
     * del navegador es el único y no hay nada que deduplicar.
     */
    private String eventoId;

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

    public String getEventoId() { return eventoId; }
    public void setEventoId(String eventoId) { this.eventoId = eventoId; }
}
