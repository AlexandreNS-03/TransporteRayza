package com.example.demo.dto;

import java.math.BigDecimal;

public class VentaRequest {

    private String viajeId;
    private String tipoDocumento;
    private String pasajeroNombre;
    private String pasajeroDocumento;
    private String procedencia;
    private String pasajeroTelefono;
    private Integer edad;
    private String sexo;
    private String observacion;
    private String tipoComprobante;
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

    // Getters y Setters
    public String getViajeId() { return viajeId; }
    public void setViajeId(String viajeId) { this.viajeId = viajeId; }

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

    public Integer getEdad() { return edad; }
    public void setEdad(Integer edad) { this.edad = edad; }

    public String getSexo() { return sexo; }
    public void setSexo(String sexo) { this.sexo = sexo; }

    public String getObservacion() { return observacion; }
    public void setObservacion(String observacion) { this.observacion = observacion; }

    public String getTipoComprobante() { return tipoComprobante; }
    public void setTipoComprobante(String tipoComprobante) { this.tipoComprobante = tipoComprobante; }

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
}