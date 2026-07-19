package com.example.demo.dto;

import java.math.BigDecimal;

public class ComprobanteDTO {

    private String id;
    private String ventaId;
    private String encomiendaId;
    private String tipoDeComprobante;
    private String serie;
    private Long numero;
    private String clienteTipoDeDocumento;
    private String clienteNumeroDeDocumento;
    private String clienteDenominacion;
    private String clienteDireccion;
    private String clienteEmail;
    private String fechaDeEmision;
    private Integer moneda;
    private BigDecimal porcentajeDeIgv;
    private BigDecimal totalExonerada;
    private BigDecimal totalIgv;
    private BigDecimal total;
    private String descripcion;
    private String estado;
    private String motivoAnulacion;
    private String anuladoAt;
    private String enlacePdf;
    private String usuarioNombre;
    private String createdAt;
    private String refSerie;
    private Long refNumero;

    // Datos de la venta asociada (referencia)
    private String viajeCodigo;
    private String pasajeroNombre;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getVentaId() { return ventaId; }
    public void setVentaId(String ventaId) { this.ventaId = ventaId; }

    public String getEncomiendaId() { return encomiendaId; }
    public void setEncomiendaId(String encomiendaId) { this.encomiendaId = encomiendaId; }

    public String getTipoDeComprobante() { return tipoDeComprobante; }
    public void setTipoDeComprobante(String tipoDeComprobante) { this.tipoDeComprobante = tipoDeComprobante; }

    public String getSerie() { return serie; }
    public void setSerie(String serie) { this.serie = serie; }

    public Long getNumero() { return numero; }
    public void setNumero(Long numero) { this.numero = numero; }

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

    public String getFechaDeEmision() { return fechaDeEmision; }
    public void setFechaDeEmision(String fechaDeEmision) { this.fechaDeEmision = fechaDeEmision; }

    public Integer getMoneda() { return moneda; }
    public void setMoneda(Integer moneda) { this.moneda = moneda; }

    public BigDecimal getPorcentajeDeIgv() { return porcentajeDeIgv; }
    public void setPorcentajeDeIgv(BigDecimal porcentajeDeIgv) { this.porcentajeDeIgv = porcentajeDeIgv; }

    public BigDecimal getTotalExonerada() { return totalExonerada; }
    public void setTotalExonerada(BigDecimal totalExonerada) { this.totalExonerada = totalExonerada; }

    public BigDecimal getTotalIgv() { return totalIgv; }
    public void setTotalIgv(BigDecimal totalIgv) { this.totalIgv = totalIgv; }

    public BigDecimal getTotal() { return total; }
    public void setTotal(BigDecimal total) { this.total = total; }

    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }

    public String getMotivoAnulacion() { return motivoAnulacion; }
    public void setMotivoAnulacion(String motivoAnulacion) { this.motivoAnulacion = motivoAnulacion; }

    public String getAnuladoAt() { return anuladoAt; }
    public void setAnuladoAt(String anuladoAt) { this.anuladoAt = anuladoAt; }

    public String getEnlacePdf() { return enlacePdf; }
    public void setEnlacePdf(String enlacePdf) { this.enlacePdf = enlacePdf; }

    public String getUsuarioNombre() { return usuarioNombre; }
    public void setUsuarioNombre(String usuarioNombre) { this.usuarioNombre = usuarioNombre; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public String getViajeCodigo() { return viajeCodigo; }
    public void setViajeCodigo(String viajeCodigo) { this.viajeCodigo = viajeCodigo; }

    public String getPasajeroNombre() { return pasajeroNombre; }
    public void setPasajeroNombre(String pasajeroNombre) { this.pasajeroNombre = pasajeroNombre; }

    public String getRefSerie() { return refSerie; }
    public void setRefSerie(String refSerie) { this.refSerie = refSerie; }

    public Long getRefNumero() { return refNumero; }
    public void setRefNumero(Long refNumero) { this.refNumero = refNumero; }
}
