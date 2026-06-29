package com.example.demo.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "ventas")
public class Venta {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "viaje_id", length = 36)
    private String viajeId;

    @Column(name = "viaje_codigo", length = 50)
    private String viajeCodigo;

    @Column(name = "viaje_descripcion", length = 200)
    private String viajeDescripcion;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_documento")
    private TipoDocumento tipoDocumento;

    @Column(name = "pasajero_nombre", length = 150)
    private String pasajeroNombre;

    @Column(name = "pasajero_documento", length = 20)
    private String pasajeroDocumento;

    @Column(name = "procedencia", length = 100)
    private String procedencia;

    @Column(name = "pasajero_telefono", length = 20)
    private String pasajeroTelefono;

    @Column(name = "edad")
    private Integer edad;

    @Enumerated(EnumType.STRING)
    @Column(name = "sexo")
    private Sexo sexo;

    @Column(name = "observacion", columnDefinition = "TEXT")
    private String observacion;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_comprobante")
    private TipoComprobante tipoComprobante;

    @Column(name = "serie_comprobante", length = 10)
    private String serieComprobante;

    @Column(name = "numero_comprobante", length = 10)
    private String numeroComprobante;

    @Column(name = "cliente_nombre", length = 150)
    private String clienteNombre;

    @Column(name = "cliente_tipo_doc", length = 20)
    private String clienteTipoDoc;

    @Column(name = "cliente_documento", length = 20)
    private String clienteDocumento;

    @Column(name = "detalle_comprobante", columnDefinition = "TEXT")
    private String detalleComprobante;

    @Column(name = "asiento_numero")
    private Integer asientoNumero;

    @Enumerated(EnumType.STRING)
    @Column(name = "asiento_tipo")
    private AsientoTipo asientoTipo;

    @Column(name = "parada_origen", length = 100)
    private String paradaOrigen;

    @Column(name = "parada_destino", length = 100)
    private String paradaDestino;

    @Column(name = "orden_origen")
    private Integer ordenOrigen;

    @Column(name = "orden_destino")
    private Integer ordenDestino;

    @Column(name = "precio", precision = 10, scale = 2)
    private BigDecimal precio;

    @Column(name = "codigo_qr", length = 100)
    private String codigoQr;

    @Enumerated(EnumType.STRING)
    @Column(name = "embarque_estado")
    private EmbarqueEstado embarqueEstado;

    @Column(name = "embarcado_at")
    private LocalDateTime embarcadoAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado")
    private EstadoVenta estado;

    @Column(name = "anulada_at")
    private LocalDateTime anuladaAt;

    @Column(name = "fecha_venta")
    private LocalDate fechaVenta;

    @Column(name = "usuario_id", length = 36)
    private String usuarioId;

    @Column(name = "usuario_nombre", length = 150)
    private String usuarioNombre;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "venta", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private List<VentaTramoUsado> tramosUsados;

    public enum TipoDocumento { DNI, CE, PASAPORTE, RUC }
    public enum Sexo { Masculino, Femenino, Otro }
    public enum TipoComprobante { TICKET, BOLETA, FACTURA, NOTA_VENTA }
    public enum AsientoTipo { NORMAL, VIP }
    public enum EmbarqueEstado { PENDIENTE, EMBARCADO }
    public enum EstadoVenta { PAGADO, ANULADO }

    // Getters y Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getViajeId() { return viajeId; }
    public void setViajeId(String viajeId) { this.viajeId = viajeId; }

    public String getViajeCodigo() { return viajeCodigo; }
    public void setViajeCodigo(String viajeCodigo) { this.viajeCodigo = viajeCodigo; }

    public String getViajeDescripcion() { return viajeDescripcion; }
    public void setViajeDescripcion(String viajeDescripcion) { this.viajeDescripcion = viajeDescripcion; }

    public TipoDocumento getTipoDocumento() { return tipoDocumento; }
    public void setTipoDocumento(TipoDocumento tipoDocumento) { this.tipoDocumento = tipoDocumento; }

    public String getPasajeroNombre() { return pasajeroNombre; }
    public void setPasajeroNombre(String pasajeroNombre) { this.pasajeroNombre = pasajeroNombre; }

    public String getPasajeroDocumento() { return pasajeroDocumento; }
    public void setPasajeroDocumento(String pasajeroDocumento) { this.pasajeroDocumento = pasajeroDocumento; }

    public String getProcedencia() { return procedencia; }
    public void setProcedencia(String procedencia) { this.procedencia = procedencia; }

    public String getPasajeroTelefono() { return pasajeroTelefono; }
    public void setPasajeroTelefono(String pasajeroTelefono) { this.pasajeroTelefono = pasajeroTelefono; }

    public Integer getEdad() { return edad; }
    public void setEdad(Integer edad) { this.edad = edad; }

    public Sexo getSexo() { return sexo; }
    public void setSexo(Sexo sexo) { this.sexo = sexo; }

    public String getObservacion() { return observacion; }
    public void setObservacion(String observacion) { this.observacion = observacion; }

    public TipoComprobante getTipoComprobante() { return tipoComprobante; }
    public void setTipoComprobante(TipoComprobante tipoComprobante) { this.tipoComprobante = tipoComprobante; }

    public String getSerieComprobante() { return serieComprobante; }
    public void setSerieComprobante(String serieComprobante) { this.serieComprobante = serieComprobante; }

    public String getNumeroComprobante() { return numeroComprobante; }
    public void setNumeroComprobante(String numeroComprobante) { this.numeroComprobante = numeroComprobante; }

    public String getClienteNombre() { return clienteNombre; }
    public void setClienteNombre(String clienteNombre) { this.clienteNombre = clienteNombre; }

    public String getClienteTipoDoc() { return clienteTipoDoc; }
    public void setClienteTipoDoc(String clienteTipoDoc) { this.clienteTipoDoc = clienteTipoDoc; }

    public String getClienteDocumento() { return clienteDocumento; }
    public void setClienteDocumento(String clienteDocumento) { this.clienteDocumento = clienteDocumento; }

    public String getDetalleComprobante() { return detalleComprobante; }
    public void setDetalleComprobante(String detalleComprobante) { this.detalleComprobante = detalleComprobante; }

    public Integer getAsientoNumero() { return asientoNumero; }
    public void setAsientoNumero(Integer asientoNumero) { this.asientoNumero = asientoNumero; }

    public AsientoTipo getAsientoTipo() { return asientoTipo; }
    public void setAsientoTipo(AsientoTipo asientoTipo) { this.asientoTipo = asientoTipo; }

    public String getParadaOrigen() { return paradaOrigen; }
    public void setParadaOrigen(String paradaOrigen) { this.paradaOrigen = paradaOrigen; }

    public String getParadaDestino() { return paradaDestino; }
    public void setParadaDestino(String paradaDestino) { this.paradaDestino = paradaDestino; }

    public Integer getOrdenOrigen() { return ordenOrigen; }
    public void setOrdenOrigen(Integer ordenOrigen) { this.ordenOrigen = ordenOrigen; }

    public Integer getOrdenDestino() { return ordenDestino; }
    public void setOrdenDestino(Integer ordenDestino) { this.ordenDestino = ordenDestino; }

    public BigDecimal getPrecio() { return precio; }
    public void setPrecio(BigDecimal precio) { this.precio = precio; }

    public String getCodigoQr() { return codigoQr; }
    public void setCodigoQr(String codigoQr) { this.codigoQr = codigoQr; }

    public EmbarqueEstado getEmbarqueEstado() { return embarqueEstado; }
    public void setEmbarqueEstado(EmbarqueEstado embarqueEstado) { this.embarqueEstado = embarqueEstado; }

    public LocalDateTime getEmbarcadoAt() { return embarcadoAt; }
    public void setEmbarcadoAt(LocalDateTime embarcadoAt) { this.embarcadoAt = embarcadoAt; }

    public EstadoVenta getEstado() { return estado; }
    public void setEstado(EstadoVenta estado) { this.estado = estado; }

    public LocalDateTime getAnuladaAt() { return anuladaAt; }
    public void setAnuladaAt(LocalDateTime anuladaAt) { this.anuladaAt = anuladaAt; }

    public LocalDate getFechaVenta() { return fechaVenta; }
    public void setFechaVenta(LocalDate fechaVenta) { this.fechaVenta = fechaVenta; }

    public String getUsuarioId() { return usuarioId; }
    public void setUsuarioId(String usuarioId) { this.usuarioId = usuarioId; }

    public String getUsuarioNombre() { return usuarioNombre; }
    public void setUsuarioNombre(String usuarioNombre) { this.usuarioNombre = usuarioNombre; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public List<VentaTramoUsado> getTramosUsados() { return tramosUsados; }
    public void setTramosUsados(List<VentaTramoUsado> tramosUsados) { this.tramosUsados = tramosUsados; }
}