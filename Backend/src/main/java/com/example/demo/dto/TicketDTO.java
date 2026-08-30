package com.example.demo.dto;

import java.math.BigDecimal;

/**
 * Datos completos de una venta para imprimir el TICKET DE EMBARQUE (80mm o A4) en el
 * web-cliente. Los nombres coinciden con los que usan los generadores jsPDF, para
 * pasarlo casi directo. Campos públicos: Jackson los serializa igual que los getters.
 */
public class TicketDTO {
    public String id;
    public String serieComprobante;
    public String numeroComprobante;
    public String viajeCodigo;
    /** Nave en la que viaja, para que en el puerto sepan a cuál subir. */
    public String embarcacionNombre;
    public String paradaOrigen;
    public String paradaDestino;
    public String fechaSalida;
    public String horaSalida;
    public Integer asientoNumero;
    public String asientoTipo;
    public String pasajeroNombre;
    public String tipoDocumento;
    public String pasajeroDocumento;
    public Integer edad;
    public String sexo;
    public String procedencia;
    public String pasajeroTelefono;
    public BigDecimal precio;
    public String codigoQr;
    public String fechaVenta;
    public String usuarioNombre;
    public String clienteNombre;
    public String clienteTipoDoc;
    public String clienteDocumento;
    public String detalleComprobante;
    /** El código del sorteo, si la venta generó uno. Va impreso en el ticket. */
    public String codigoSorteo;
}
