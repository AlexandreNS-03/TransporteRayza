package com.example.demo.dto;

import java.math.BigDecimal;

public class EncomiendaRequest {

    private String remitenteNombre;
    private String remitenteDocumento;
    private String remitenteTelefono;
    private String destinatarioNombre;
    private String destinatarioDocumento;
    private String destinatarioTelefono;
    private String viajeId;              // opcional: viaje en el que se transporta
    private String sucursalDestinoId;
    private String descripcion;          // contenido del paquete
    private BigDecimal peso;             // kg
    private BigDecimal precio;
    private String observacion;

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

    public String getSucursalDestinoId() { return sucursalDestinoId; }
    public void setSucursalDestinoId(String sucursalDestinoId) { this.sucursalDestinoId = sucursalDestinoId; }

    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }

    public BigDecimal getPeso() { return peso; }
    public void setPeso(BigDecimal peso) { this.peso = peso; }

    public BigDecimal getPrecio() { return precio; }
    public void setPrecio(BigDecimal precio) { this.precio = precio; }

    public String getObservacion() { return observacion; }
    public void setObservacion(String observacion) { this.observacion = observacion; }
}
