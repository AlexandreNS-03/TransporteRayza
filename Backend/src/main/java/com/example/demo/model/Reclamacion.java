package com.example.demo.model;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Hoja del Libro de Reclamaciones (INDECOPI, D.S. 011-2011-PCM).
 *
 * Los campos y su obligatoriedad salen de la norma, no de nuestro gusto: número
 * correlativo, fecha, datos del consumidor —y de su apoderado si es menor de
 * edad—, identificación del bien o servicio, el detalle, y un espacio para las
 * acciones del proveedor.
 *
 * RECLAMO es disconformidad con el producto o servicio; QUEJA es malestar por la
 * atención. La diferencia la exige la norma y decide el trámite, así que se
 * guarda tal cual la eligió el consumidor.
 *
 * Nada de esto se borra: hay que conservarlo dos años como mínimo.
 */
@Entity
@Table(name = "reclamaciones")
public class Reclamacion {

    @Id
    @Column(name = "id", length = 36)
    private String id;

    /** Correlativo visible para el consumidor. No se reutiliza ni se reordena. */
    @Column(name = "numero", nullable = false, unique = true)
    private Integer numero;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo", nullable = false, length = 10)
    private Tipo tipo;

    // ---- Consumidor ----
    @Column(name = "consumidor_nombre", length = 150)
    private String consumidorNombre;

    @Column(name = "consumidor_tipo_documento", length = 20)
    private String consumidorTipoDocumento;

    @Column(name = "consumidor_documento", length = 20)
    private String consumidorDocumento;

    @Column(name = "consumidor_domicilio", length = 250)
    private String consumidorDomicilio;

    @Column(name = "consumidor_email", length = 150)
    private String consumidorEmail;

    @Column(name = "consumidor_telefono", length = 30)
    private String consumidorTelefono;

    /** Si es menor de edad, la norma pide los datos del padre o representante. */
    @Column(name = "menor_de_edad")
    private Boolean menorDeEdad;

    @Column(name = "apoderado_nombre", length = 150)
    private String apoderadoNombre;

    @Column(name = "apoderado_documento", length = 20)
    private String apoderadoDocumento;

    // ---- Bien contratado ----
    @Enumerated(EnumType.STRING)
    @Column(name = "bien_tipo", length = 10)
    private BienTipo bienTipo;

    @Column(name = "bien_descripcion", length = 500)
    private String bienDescripcion;

    @Column(name = "monto_reclamado", precision = 10, scale = 2)
    private BigDecimal montoReclamado;

    // ---- Detalle ----
    @Column(name = "detalle", length = 2000)
    private String detalle;

    @Column(name = "pedido", length = 2000)
    private String pedido;

    // ---- Respuesta del proveedor ----
    @Enumerated(EnumType.STRING)
    @Column(name = "estado", nullable = false, length = 20)
    private Estado estado;

    @Column(name = "respuesta", length = 2000)
    private String respuesta;

    @Column(name = "respondido_at")
    private LocalDateTime respondidoAt;

    @Column(name = "respondido_por", length = 100)
    private String respondidoPor;

    public enum Tipo { RECLAMO, QUEJA }
    public enum BienTipo { PRODUCTO, SERVICIO }
    public enum Estado { PENDIENTE, RESPONDIDO }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public Integer getNumero() { return numero; }
    public void setNumero(Integer numero) { this.numero = numero; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime v) { this.createdAt = v; }
    public Tipo getTipo() { return tipo; }
    public void setTipo(Tipo tipo) { this.tipo = tipo; }
    public String getConsumidorNombre() { return consumidorNombre; }
    public void setConsumidorNombre(String v) { this.consumidorNombre = v; }
    public String getConsumidorTipoDocumento() { return consumidorTipoDocumento; }
    public void setConsumidorTipoDocumento(String v) { this.consumidorTipoDocumento = v; }
    public String getConsumidorDocumento() { return consumidorDocumento; }
    public void setConsumidorDocumento(String v) { this.consumidorDocumento = v; }
    public String getConsumidorDomicilio() { return consumidorDomicilio; }
    public void setConsumidorDomicilio(String v) { this.consumidorDomicilio = v; }
    public String getConsumidorEmail() { return consumidorEmail; }
    public void setConsumidorEmail(String v) { this.consumidorEmail = v; }
    public String getConsumidorTelefono() { return consumidorTelefono; }
    public void setConsumidorTelefono(String v) { this.consumidorTelefono = v; }
    public Boolean getMenorDeEdad() { return menorDeEdad; }
    public void setMenorDeEdad(Boolean v) { this.menorDeEdad = v; }
    public String getApoderadoNombre() { return apoderadoNombre; }
    public void setApoderadoNombre(String v) { this.apoderadoNombre = v; }
    public String getApoderadoDocumento() { return apoderadoDocumento; }
    public void setApoderadoDocumento(String v) { this.apoderadoDocumento = v; }
    public BienTipo getBienTipo() { return bienTipo; }
    public void setBienTipo(BienTipo v) { this.bienTipo = v; }
    public String getBienDescripcion() { return bienDescripcion; }
    public void setBienDescripcion(String v) { this.bienDescripcion = v; }
    public BigDecimal getMontoReclamado() { return montoReclamado; }
    public void setMontoReclamado(BigDecimal v) { this.montoReclamado = v; }
    public String getDetalle() { return detalle; }
    public void setDetalle(String v) { this.detalle = v; }
    public String getPedido() { return pedido; }
    public void setPedido(String v) { this.pedido = v; }
    public Estado getEstado() { return estado; }
    public void setEstado(Estado v) { this.estado = v; }
    public String getRespuesta() { return respuesta; }
    public void setRespuesta(String v) { this.respuesta = v; }
    public LocalDateTime getRespondidoAt() { return respondidoAt; }
    public void setRespondidoAt(LocalDateTime v) { this.respondidoAt = v; }
    public String getRespondidoPor() { return respondidoPor; }
    public void setRespondidoPor(String v) { this.respondidoPor = v; }
}
