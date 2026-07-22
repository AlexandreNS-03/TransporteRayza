package com.example.demo.dto;

import java.math.BigDecimal;
import java.util.List;

public class VentaDTO {

    private String id;
    private String viajeId;
    private String viajeCodigo;
    private String viajeDescripcion;
    private String fechaSalida;
    private String horaSalida;
    private String tipoDocumento;
    private String pasajeroNombre;
    private String pasajeroDocumento;
    private String procedencia;
    private String pasajeroTelefono;
    private String clienteEmail;
    private Integer edad;
    private String sexo;
    private String observacion;
    private String tipoComprobante;
    private String serieComprobante;
    private String numeroComprobante;
    private String clienteNombre;
    private String clienteTipoDoc;
    private String clienteDocumento;
    private String detalleComprobante;
    private Integer asientoNumero;
    private String asientoTipo;
    private String paradaOrigen;
    private String paradaDestino;
    private Integer ordenOrigen;
    private Integer ordenDestino;
    private BigDecimal precio;
    private String codigoQr;
    private String embarqueEstado;
    private String estado;
    private String canal;              // MOSTRADOR | WEB
    private String fechaVenta;
    private String usuarioNombre;
    private String createdAt;
    private String embarcadoPor;
    private String embarcadoAt;
    private List<String> tramosUsados;

    // Getters y Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getViajeId() { return viajeId; }
    public void setViajeId(String viajeId) { this.viajeId = viajeId; }

    public String getViajeCodigo() { return viajeCodigo; }
    public void setViajeCodigo(String viajeCodigo) { this.viajeCodigo = viajeCodigo; }

    public String getViajeDescripcion() { return viajeDescripcion; }
    public void setViajeDescripcion(String viajeDescripcion) { this.viajeDescripcion = viajeDescripcion; }

    public String getFechaSalida() { return fechaSalida; }
    public void setFechaSalida(String fechaSalida) { this.fechaSalida = fechaSalida; }

    public String getHoraSalida() { return horaSalida; }
    public void setHoraSalida(String horaSalida) { this.horaSalida = horaSalida; }

    public String getTipoDocumento() { return tipoDocumento; }
    public void setTipoDocumento(String tipoDocumento) { this.tipoDocumento = tipoDocumento; }

    public String getPasajeroNombre() { return pasajeroNombre; }
    public void setPasajeroNombre(String pasajeroNombre) { this.pasajeroNombre = pasajeroNombre; }

    public String getPasajeroDocumento() { return pasajeroDocumento; }
    public void setPasajeroDocumento(String pasajeroDocumento) { this.pasajeroDocumento = pasajeroDocumento; }

    public String getProcedencia() { return procedencia; }
    public void setProcedencia(String procedencia) { this.procedencia = procedencia; }

    public String getPasajeroTelefono() { return pasajeroTelefono; }
    public void setPasajeroTelefono(String pasajeroTelefono) { this.pasajeroTelefono = pasajeroTelefono; }

    public String getClienteEmail() { return clienteEmail; }
    public void setClienteEmail(String clienteEmail) { this.clienteEmail = clienteEmail; }

    public Integer getEdad() { return edad; }
    public void setEdad(Integer edad) { this.edad = edad; }

    public String getSexo() { return sexo; }
    public void setSexo(String sexo) { this.sexo = sexo; }

    public String getObservacion() { return observacion; }
    public void setObservacion(String observacion) { this.observacion = observacion; }

    public String getTipoComprobante() { return tipoComprobante; }
    public void setTipoComprobante(String tipoComprobante) { this.tipoComprobante = tipoComprobante; }

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

    public String getAsientoTipo() { return asientoTipo; }
    public void setAsientoTipo(String asientoTipo) { this.asientoTipo = asientoTipo; }

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

    public String getEmbarqueEstado() { return embarqueEstado; }
    public void setEmbarqueEstado(String embarqueEstado) { this.embarqueEstado = embarqueEstado; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }

    public String getCanal() { return canal; }
    public void setCanal(String canal) { this.canal = canal; }

    public String getFechaVenta() { return fechaVenta; }
    public void setFechaVenta(String fechaVenta) { this.fechaVenta = fechaVenta; }

    public String getUsuarioNombre() { return usuarioNombre; }
    public void setUsuarioNombre(String usuarioNombre) { this.usuarioNombre = usuarioNombre; }

    public List<String> getTramosUsados() { return tramosUsados; }
    public void setTramosUsados(List<String> tramosUsados) { this.tramosUsados = tramosUsados; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public String getEmbarcadoPor() { return embarcadoPor; }
    public void setEmbarcadoPor(String embarcadoPor) { this.embarcadoPor = embarcadoPor; }

    public String getEmbarcadoAt() { return embarcadoAt; }
    public void setEmbarcadoAt(String embarcadoAt) { this.embarcadoAt = embarcadoAt; }
}