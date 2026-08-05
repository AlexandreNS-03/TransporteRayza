package com.example.demo.dto;

import java.util.List;

/**
 * Venta de varios pasajes en una sola operación (una familia, un grupo de trabajo).
 *
 * Lo que es común a todos —el viaje, el tramo, los datos del comprobante y la forma
 * de pago— va acá arriba y no se repite por pasajero; cada pasajero solo trae sus
 * datos y su asiento.
 */
public class VentaGrupoRequest {

    private String viajeId;
    private String paradaOrigen;
    private String paradaDestino;
    private Integer ordenOrigen;
    private Integer ordenDestino;

    // Comprobante y contacto (uno solo para toda la compra)
    private String tipoComprobante;
    private String clienteNombre;
    private String clienteTipoDoc;
    private String clienteDocumento;
    private String clienteEmail;
    private String detalleComprobante;

    private String lugarPago;
    private String metodoPago;
    private String observacion;

    /** Un elemento por pasajero: sus datos, su asiento y su precio. */
    private List<VentaRequest> pasajeros;

    public String getViajeId() { return viajeId; }
    public void setViajeId(String viajeId) { this.viajeId = viajeId; }

    public String getParadaOrigen() { return paradaOrigen; }
    public void setParadaOrigen(String paradaOrigen) { this.paradaOrigen = paradaOrigen; }

    public String getParadaDestino() { return paradaDestino; }
    public void setParadaDestino(String paradaDestino) { this.paradaDestino = paradaDestino; }

    public Integer getOrdenOrigen() { return ordenOrigen; }
    public void setOrdenOrigen(Integer ordenOrigen) { this.ordenOrigen = ordenOrigen; }

    public Integer getOrdenDestino() { return ordenDestino; }
    public void setOrdenDestino(Integer ordenDestino) { this.ordenDestino = ordenDestino; }

    public String getTipoComprobante() { return tipoComprobante; }
    public void setTipoComprobante(String tipoComprobante) { this.tipoComprobante = tipoComprobante; }

    public String getClienteNombre() { return clienteNombre; }
    public void setClienteNombre(String clienteNombre) { this.clienteNombre = clienteNombre; }

    public String getClienteTipoDoc() { return clienteTipoDoc; }
    public void setClienteTipoDoc(String clienteTipoDoc) { this.clienteTipoDoc = clienteTipoDoc; }

    public String getClienteDocumento() { return clienteDocumento; }
    public void setClienteDocumento(String clienteDocumento) { this.clienteDocumento = clienteDocumento; }

    public String getClienteEmail() { return clienteEmail; }
    public void setClienteEmail(String clienteEmail) { this.clienteEmail = clienteEmail; }

    public String getDetalleComprobante() { return detalleComprobante; }
    public void setDetalleComprobante(String detalleComprobante) { this.detalleComprobante = detalleComprobante; }

    public String getLugarPago() { return lugarPago; }
    public void setLugarPago(String lugarPago) { this.lugarPago = lugarPago; }

    public String getMetodoPago() { return metodoPago; }
    public void setMetodoPago(String metodoPago) { this.metodoPago = metodoPago; }

    public String getObservacion() { return observacion; }
    public void setObservacion(String observacion) { this.observacion = observacion; }

    public List<VentaRequest> getPasajeros() { return pasajeros; }
    public void setPasajeros(List<VentaRequest> pasajeros) { this.pasajeros = pasajeros; }
}
