package com.example.demo.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "comprobantes")
public class Comprobante {

    @Id
    @Column(length = 36)
    private String id;

    // El comprobante referencia una venta de pasaje O una encomienda
    @Column(name = "venta_id", length = 36)
    private String ventaId;

    @Column(name = "encomienda_id", length = 36)
    private String encomiendaId;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_de_comprobante", nullable = false)
    private TipoComprobante tipoDeComprobante;

    @Column(name = "serie", length = 10, nullable = false)
    private String serie;

    @Column(name = "numero", nullable = false)
    private Long numero;

    // Códigos SUNAT/Nubefact: 1=DNI, 4=CE, 6=RUC, 7=PASAPORTE
    @Column(name = "cliente_tipo_de_documento", length = 2)
    private String clienteTipoDeDocumento;

    @Column(name = "cliente_numero_de_documento", length = 20)
    private String clienteNumeroDeDocumento;

    @Column(name = "cliente_denominacion", length = 200)
    private String clienteDenominacion;

    @Column(name = "cliente_direccion", length = 200)
    private String clienteDireccion;

    @Column(name = "cliente_email", length = 100)
    private String clienteEmail;

    @Column(name = "fecha_de_emision")
    private LocalDate fechaDeEmision;

    // 1 = PEN (Soles)
    @Column(name = "moneda")
    private Integer moneda;

    @Column(name = "porcentaje_de_igv", precision = 5, scale = 2)
    private BigDecimal porcentajeDeIgv;

    // Operación exonerada de IGV — Ley 27037 (Amazonía)
    @Column(name = "total_exonerada", precision = 10, scale = 2)
    private BigDecimal totalExonerada;

    @Column(name = "total_igv", precision = 10, scale = 2)
    private BigDecimal totalIgv;

    @Column(name = "total", precision = 10, scale = 2)
    private BigDecimal total;

    @Column(name = "descripcion", columnDefinition = "TEXT")
    private String descripcion;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado", nullable = false)
    private EstadoComprobante estado;

    @Column(name = "motivo_anulacion", columnDefinition = "TEXT")
    private String motivoAnulacion;

    @Column(name = "anulado_at")
    private LocalDateTime anuladoAt;

    @Column(name = "enlace_pdf", length = 300)
    private String enlacePdf;

    @Column(name = "respuesta_nubefact", columnDefinition = "TEXT")
    private String respuestaNubefact;

    // Solo para NOTA_CREDITO: comprobante al que modifica
    @Column(name = "ref_serie", length = 10)
    private String refSerie;

    @Column(name = "ref_numero")
    private Long refNumero;

    @Column(name = "usuario_nombre", length = 150)
    private String usuarioNombre;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public enum TipoComprobante { FACTURA, BOLETA, NOTA_CREDITO }
    public enum EstadoComprobante { ACEPTADO, ANULADO }

    // Getters y Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getVentaId() { return ventaId; }
    public void setVentaId(String ventaId) { this.ventaId = ventaId; }

    public String getEncomiendaId() { return encomiendaId; }
    public void setEncomiendaId(String encomiendaId) { this.encomiendaId = encomiendaId; }

    public TipoComprobante getTipoDeComprobante() { return tipoDeComprobante; }
    public void setTipoDeComprobante(TipoComprobante tipoDeComprobante) { this.tipoDeComprobante = tipoDeComprobante; }

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

    public LocalDate getFechaDeEmision() { return fechaDeEmision; }
    public void setFechaDeEmision(LocalDate fechaDeEmision) { this.fechaDeEmision = fechaDeEmision; }

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

    public EstadoComprobante getEstado() { return estado; }
    public void setEstado(EstadoComprobante estado) { this.estado = estado; }

    public String getMotivoAnulacion() { return motivoAnulacion; }
    public void setMotivoAnulacion(String motivoAnulacion) { this.motivoAnulacion = motivoAnulacion; }

    public LocalDateTime getAnuladoAt() { return anuladoAt; }
    public void setAnuladoAt(LocalDateTime anuladoAt) { this.anuladoAt = anuladoAt; }

    public String getEnlacePdf() { return enlacePdf; }
    public void setEnlacePdf(String enlacePdf) { this.enlacePdf = enlacePdf; }

    public String getRespuestaNubefact() { return respuestaNubefact; }
    public void setRespuestaNubefact(String respuestaNubefact) { this.respuestaNubefact = respuestaNubefact; }

    public String getRefSerie() { return refSerie; }
    public void setRefSerie(String refSerie) { this.refSerie = refSerie; }

    public Long getRefNumero() { return refNumero; }
    public void setRefNumero(Long refNumero) { this.refNumero = refNumero; }

    public String getUsuarioNombre() { return usuarioNombre; }
    public void setUsuarioNombre(String usuarioNombre) { this.usuarioNombre = usuarioNombre; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
