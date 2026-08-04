package com.example.demo.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "encomiendas")
public class Encomienda {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "codigo_encomienda", length = 30, nullable = false)
    private String codigoEncomienda;

    @Column(name = "fecha_registro", nullable = false)
    private LocalDate fechaRegistro;

    @Column(name = "remitente_nombre", length = 150, nullable = false)
    private String remitenteNombre;

    @Column(name = "remitente_documento", length = 20)
    private String remitenteDocumento;

    @Column(name = "remitente_telefono", length = 20)
    private String remitenteTelefono;

    @Column(name = "destinatario_nombre", length = 150, nullable = false)
    private String destinatarioNombre;

    @Column(name = "destinatario_documento", length = 20)
    private String destinatarioDocumento;

    @Column(name = "destinatario_telefono", length = 20)
    private String destinatarioTelefono;

    @Column(name = "viaje_id", length = 36)
    private String viajeId;

    @Column(name = "viaje_descripcion", length = 200)
    private String viajeDescripcion;

    @Column(name = "sucursal_origen_id", length = 36)
    private String sucursalOrigenId;

    @Column(name = "sucursal_origen_nombre", length = 100)
    private String sucursalOrigenNombre;

    @Column(name = "sucursal_destino_id", length = 36)
    private String sucursalDestinoId;

    @Column(name = "sucursal_destino_nombre", length = 100)
    private String sucursalDestinoNombre;

    /** Tramo dentro del viaje: muchas encomiendas bajan en una parada intermedia. */
    @Column(name = "parada_origen", length = 100)
    private String paradaOrigen;

    @Column(name = "parada_destino", length = 100)
    private String paradaDestino;

    /** Orden de las paradas en la ruta (para ordenar el manifiesto por bajada). */
    @Column(name = "orden_origen")
    private Integer ordenOrigen;

    @Column(name = "orden_destino")
    private Integer ordenDestino;

    @Column(name = "descripcion", length = 300)
    private String descripcion;

    @Column(name = "peso", precision = 8, scale = 3)
    private BigDecimal peso;

    @Column(name = "precio", precision = 10, scale = 2, nullable = false)
    private BigDecimal precio;

    @Column(name = "observacion", columnDefinition = "TEXT")
    private String observacion;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado", nullable = false)
    private EstadoEncomienda estado;

    /** Estado del pago: PENDIENTE / PAGADO / PAGA_DESTINO (contra entrega). */
    @Enumerated(EnumType.STRING)
    @Column(name = "estado_pago", length = 20)
    private EstadoPago estadoPago;

    @Column(name = "usuario_id", length = 36)
    private String usuarioId;

    @Column(name = "usuario_nombre", length = 150)
    private String usuarioNombre;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    /** Clave de seguridad de 4 dígitos para el recojo (la fija el remitente). */
    @Column(name = "clave_seguridad", length = 10)
    private String claveSeguridad;

    /** Datos de quién recogió la encomienda (al entregar). */
    @Column(name = "receptor_nombre", length = 150)
    private String receptorNombre;

    @Column(name = "receptor_documento", length = 20)
    private String receptorDocumento;

    @Column(name = "entregado_at")
    private LocalDateTime entregadoAt;

    /** Referencia de la transacción cuando se paga en línea (Izipay / Yape). */
    @Column(name = "pasarela_referencia", length = 100)
    private String pasarelaReferencia;

    public enum EstadoEncomienda { REGISTRADO, EN_TRANSITO, ENTREGADO, DEVUELTO }
    public enum EstadoPago { PENDIENTE, PAGADO, PAGA_DESTINO }

    // Getters y Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getCodigoEncomienda() { return codigoEncomienda; }
    public void setCodigoEncomienda(String codigoEncomienda) { this.codigoEncomienda = codigoEncomienda; }

    public LocalDate getFechaRegistro() { return fechaRegistro; }
    public void setFechaRegistro(LocalDate fechaRegistro) { this.fechaRegistro = fechaRegistro; }

    public String getRemitenteNombre() { return remitenteNombre; }
    public void setRemitenteNombre(String remitenteNombre) { this.remitenteNombre = remitenteNombre; }

    public String getRemitenteDocumento() { return remitenteDocumento; }
    public void setRemitenteDocumento(String remitenteDocumento) { this.remitenteDocumento = remitenteDocumento; }

    public String getRemitenteTelefono() { return remitenteTelefono; }
    public void setRemitenteTelefono(String remitenteTelefono) { this.remitenteTelefono = remitenteTelefono; }

    public String getDestinatarioNombre() { return destinatarioNombre; }
    public void setDestinatarioNombre(String destinatarioNombre) { this.destinatarioNombre = destinatarioNombre; }

    public String getDestinatarioDocumento() { return destinatarioDocumento; }
    public void setDestinatarioDocumento(String destinatarioDocumento) { this.destinatarioDocumento = destinatarioDocumento; }

    public String getDestinatarioTelefono() { return destinatarioTelefono; }
    public void setDestinatarioTelefono(String destinatarioTelefono) { this.destinatarioTelefono = destinatarioTelefono; }

    public String getViajeId() { return viajeId; }
    public void setViajeId(String viajeId) { this.viajeId = viajeId; }

    public String getViajeDescripcion() { return viajeDescripcion; }
    public void setViajeDescripcion(String viajeDescripcion) { this.viajeDescripcion = viajeDescripcion; }

    public String getSucursalOrigenId() { return sucursalOrigenId; }
    public void setSucursalOrigenId(String sucursalOrigenId) { this.sucursalOrigenId = sucursalOrigenId; }

    public String getSucursalOrigenNombre() { return sucursalOrigenNombre; }
    public void setSucursalOrigenNombre(String sucursalOrigenNombre) { this.sucursalOrigenNombre = sucursalOrigenNombre; }

    public String getSucursalDestinoId() { return sucursalDestinoId; }
    public void setSucursalDestinoId(String sucursalDestinoId) { this.sucursalDestinoId = sucursalDestinoId; }

    public String getSucursalDestinoNombre() { return sucursalDestinoNombre; }
    public void setSucursalDestinoNombre(String sucursalDestinoNombre) { this.sucursalDestinoNombre = sucursalDestinoNombre; }

    public String getParadaOrigen() { return paradaOrigen; }
    public void setParadaOrigen(String paradaOrigen) { this.paradaOrigen = paradaOrigen; }

    public String getParadaDestino() { return paradaDestino; }
    public void setParadaDestino(String paradaDestino) { this.paradaDestino = paradaDestino; }

    public Integer getOrdenOrigen() { return ordenOrigen; }
    public void setOrdenOrigen(Integer ordenOrigen) { this.ordenOrigen = ordenOrigen; }

    public Integer getOrdenDestino() { return ordenDestino; }
    public void setOrdenDestino(Integer ordenDestino) { this.ordenDestino = ordenDestino; }

    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }

    public BigDecimal getPeso() { return peso; }
    public void setPeso(BigDecimal peso) { this.peso = peso; }

    public BigDecimal getPrecio() { return precio; }
    public void setPrecio(BigDecimal precio) { this.precio = precio; }

    public String getObservacion() { return observacion; }
    public void setObservacion(String observacion) { this.observacion = observacion; }

    public EstadoEncomienda getEstado() { return estado; }
    public void setEstado(EstadoEncomienda estado) { this.estado = estado; }

    public EstadoPago getEstadoPago() { return estadoPago; }
    public void setEstadoPago(EstadoPago estadoPago) { this.estadoPago = estadoPago; }

    @com.fasterxml.jackson.annotation.JsonIgnore
    public String getClaveSeguridad() { return claveSeguridad; }
    public void setClaveSeguridad(String claveSeguridad) { this.claveSeguridad = claveSeguridad; }

    public String getReceptorNombre() { return receptorNombre; }
    public void setReceptorNombre(String receptorNombre) { this.receptorNombre = receptorNombre; }

    public String getReceptorDocumento() { return receptorDocumento; }
    public void setReceptorDocumento(String receptorDocumento) { this.receptorDocumento = receptorDocumento; }

    public LocalDateTime getEntregadoAt() { return entregadoAt; }
    public void setEntregadoAt(LocalDateTime entregadoAt) { this.entregadoAt = entregadoAt; }

    public String getPasarelaReferencia() { return pasarelaReferencia; }
    public void setPasarelaReferencia(String r) { this.pasarelaReferencia = r; }

    public String getUsuarioId() { return usuarioId; }
    public void setUsuarioId(String usuarioId) { this.usuarioId = usuarioId; }

    public String getUsuarioNombre() { return usuarioNombre; }
    public void setUsuarioNombre(String usuarioNombre) { this.usuarioNombre = usuarioNombre; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
