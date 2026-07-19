package com.example.demo.dto;

/**
 * Campos editables de una venta ya registrada. Solo datos del pasajero y del
 * comprobante interno: NO se puede cambiar viaje, asiento, tramo ni precio
 * (eso afectaría la ocupación del asiento y el saldo de caja; para eso se anula
 * y se vuelve a vender).
 */
public class VentaEditRequest {

    private String tipoDocumento;
    private String pasajeroNombre;
    private String pasajeroDocumento;
    private String procedencia;
    private String pasajeroTelefono;
    private String clienteEmail;
    private Integer edad;
    private String sexo;
    private String clienteNombre;
    private String clienteTipoDoc;
    private String clienteDocumento;
    private String detalleComprobante;

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

    public String getClienteNombre() { return clienteNombre; }
    public void setClienteNombre(String clienteNombre) { this.clienteNombre = clienteNombre; }

    public String getClienteTipoDoc() { return clienteTipoDoc; }
    public void setClienteTipoDoc(String clienteTipoDoc) { this.clienteTipoDoc = clienteTipoDoc; }

    public String getClienteDocumento() { return clienteDocumento; }
    public void setClienteDocumento(String clienteDocumento) { this.clienteDocumento = clienteDocumento; }

    public String getDetalleComprobante() { return detalleComprobante; }
    public void setDetalleComprobante(String detalleComprobante) { this.detalleComprobante = detalleComprobante; }
}
