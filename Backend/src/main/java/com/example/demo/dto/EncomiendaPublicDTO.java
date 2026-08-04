package com.example.demo.dto;

import java.math.BigDecimal;

/**
 * Datos que se exponen en el rastreo público de encomiendas (sin login).
 * Solo información que el cliente necesita ver — nada interno (ids de usuario, etc.).
 */
public class EncomiendaPublicDTO {

    private String codigoEncomienda;
    private String fechaRegistro;
    private String remitenteNombre;
    private String remitenteDocumento;
    private String remitenteTelefono;
    private String destinatarioNombre;
    private String destinatarioDocumento;
    private String destinatarioTelefono;
    private String viajeDescripcion;
    private String sucursalOrigenNombre;
    private String sucursalDestinoNombre;
    private String descripcion;
    private BigDecimal peso;
    private BigDecimal precio;
    private String estado;
    private String estadoPago;
    private String paradaOrigen;
    private String paradaDestino;

    public String getEstadoPago() { return estadoPago; }
    public void setEstadoPago(String v) { this.estadoPago = v; }

    public String getParadaOrigen() { return paradaOrigen; }
    public void setParadaOrigen(String v) { this.paradaOrigen = v; }

    public String getParadaDestino() { return paradaDestino; }
    public void setParadaDestino(String v) { this.paradaDestino = v; }

    public String getCodigoEncomienda() { return codigoEncomienda; }
    public void setCodigoEncomienda(String v) { this.codigoEncomienda = v; }

    public String getFechaRegistro() { return fechaRegistro; }
    public void setFechaRegistro(String v) { this.fechaRegistro = v; }

    public String getRemitenteNombre() { return remitenteNombre; }
    public void setRemitenteNombre(String v) { this.remitenteNombre = v; }

    public String getRemitenteDocumento() { return remitenteDocumento; }
    public void setRemitenteDocumento(String v) { this.remitenteDocumento = v; }

    public String getRemitenteTelefono() { return remitenteTelefono; }
    public void setRemitenteTelefono(String v) { this.remitenteTelefono = v; }

    public String getDestinatarioNombre() { return destinatarioNombre; }
    public void setDestinatarioNombre(String v) { this.destinatarioNombre = v; }

    public String getDestinatarioDocumento() { return destinatarioDocumento; }
    public void setDestinatarioDocumento(String v) { this.destinatarioDocumento = v; }

    public String getDestinatarioTelefono() { return destinatarioTelefono; }
    public void setDestinatarioTelefono(String v) { this.destinatarioTelefono = v; }

    public String getViajeDescripcion() { return viajeDescripcion; }
    public void setViajeDescripcion(String v) { this.viajeDescripcion = v; }

    public String getSucursalOrigenNombre() { return sucursalOrigenNombre; }
    public void setSucursalOrigenNombre(String v) { this.sucursalOrigenNombre = v; }

    public String getSucursalDestinoNombre() { return sucursalDestinoNombre; }
    public void setSucursalDestinoNombre(String v) { this.sucursalDestinoNombre = v; }

    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String v) { this.descripcion = v; }

    public BigDecimal getPeso() { return peso; }
    public void setPeso(BigDecimal v) { this.peso = v; }

    public BigDecimal getPrecio() { return precio; }
    public void setPrecio(BigDecimal v) { this.precio = v; }

    public String getEstado() { return estado; }
    public void setEstado(String v) { this.estado = v; }
}
