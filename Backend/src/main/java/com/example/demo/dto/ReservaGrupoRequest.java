package com.example.demo.dto;

import java.util.List;

/**
 * Reserva de varios pasajes en una sola compra. Los datos del viaje, el tramo, el
 * correo de contacto y el comprobante son comunes; cada pasajero aporta su asiento
 * y sus datos personales. Todos los pasajes se pagan juntos en una sola operación.
 */
public class ReservaGrupoRequest {
    private String viajeId;
    private Integer ordenOrigen;
    private Integer ordenDestino;
    private String paradaOrigen;
    private String paradaDestino;

    // Contacto y comprobante (compartidos por todo el grupo)
    private String clienteEmail;
    private String tipoComprobante;    // BOLETA | FACTURA
    private String clienteNombre;      // razón social (factura)
    private String clienteDocumento;   // RUC (factura)

    /** Cada pasajero: asientoNumero, asientoTipo y sus datos personales. */
    private List<ReservaRequest> pasajeros;

    public String getViajeId() { return viajeId; }
    public void setViajeId(String viajeId) { this.viajeId = viajeId; }

    public Integer getOrdenOrigen() { return ordenOrigen; }
    public void setOrdenOrigen(Integer ordenOrigen) { this.ordenOrigen = ordenOrigen; }

    public Integer getOrdenDestino() { return ordenDestino; }
    public void setOrdenDestino(Integer ordenDestino) { this.ordenDestino = ordenDestino; }

    public String getParadaOrigen() { return paradaOrigen; }
    public void setParadaOrigen(String paradaOrigen) { this.paradaOrigen = paradaOrigen; }

    public String getParadaDestino() { return paradaDestino; }
    public void setParadaDestino(String paradaDestino) { this.paradaDestino = paradaDestino; }

    public String getClienteEmail() { return clienteEmail; }
    public void setClienteEmail(String clienteEmail) { this.clienteEmail = clienteEmail; }

    public String getTipoComprobante() { return tipoComprobante; }
    public void setTipoComprobante(String tipoComprobante) { this.tipoComprobante = tipoComprobante; }

    public String getClienteNombre() { return clienteNombre; }
    public void setClienteNombre(String clienteNombre) { this.clienteNombre = clienteNombre; }

    public String getClienteDocumento() { return clienteDocumento; }
    public void setClienteDocumento(String clienteDocumento) { this.clienteDocumento = clienteDocumento; }

    public List<ReservaRequest> getPasajeros() { return pasajeros; }
    public void setPasajeros(List<ReservaRequest> pasajeros) { this.pasajeros = pasajeros; }
}
