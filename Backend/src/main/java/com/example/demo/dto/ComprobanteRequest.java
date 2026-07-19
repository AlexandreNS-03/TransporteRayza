package com.example.demo.dto;

public class ComprobanteRequest {

    private String ventaId;                  // venta de pasaje…
    private String encomiendaId;             // …o encomienda (solo uno de los dos)
    private String tipoDeComprobante;        // FACTURA | BOLETA
    private String clienteTipoDeDocumento;   // Código SUNAT: 1=DNI, 4=CE, 6=RUC, 7=PASAPORTE
    private String clienteNumeroDeDocumento;
    private String clienteDenominacion;
    private String clienteDireccion;
    private String clienteEmail;
    private String descripcion;

    public String getVentaId() { return ventaId; }
    public void setVentaId(String ventaId) { this.ventaId = ventaId; }

    public String getEncomiendaId() { return encomiendaId; }
    public void setEncomiendaId(String encomiendaId) { this.encomiendaId = encomiendaId; }

    public String getTipoDeComprobante() { return tipoDeComprobante; }
    public void setTipoDeComprobante(String tipoDeComprobante) { this.tipoDeComprobante = tipoDeComprobante; }

    public String getClienteTipoDeDocumento() { return clienteTipoDeDocumento; }
    public void setClienteTipoDeDocumento(String clienteTipoDeDocumento) { this.clienteTipoDeDocumento = clienteTipoDeDocumento; }

    public String getClienteNumeroDeDocumento() { return clienteNumeroDeDocumento; }
    public void setClienteNumeroDeDocumento(String clienteNumeroDeDocumento) { this.clienteNumeroDeDocumento = clienteNumeroDeDocumento; }

    public String getClienteDenominacion() { return clienteDenominacion; }
    public void setClienteDenominacion(String clienteDenominacion) { this.clienteDenominacion = clienteDenominacion; }

    public String getClienteDireccion() { return clienteDireccion; }
    public void setClienteDireccion(String clienteDireccion) { this.clienteDireccion = clienteDireccion; }

    public String getClienteEmail() { return clienteEmail; }
    public void setClienteEmail(String clienteEmail) { this.clienteEmail = clienteEmail; }

    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
}
