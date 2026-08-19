package com.example.demo.dto;

import java.math.BigDecimal;

/**
 * Precio más bajo disponible para una fecha concreta, para la tira de fechas de
 * la web. `precioDesde` es null cuando ese día no hay viajes vendibles.
 */
public class PrecioFechaDTO {

    private String fecha;            // ISO yyyy-MM-dd
    private BigDecimal precioDesde;  // null = sin viajes ese día
    private boolean enOferta;        // el más barato de ese día está en oferta

    public PrecioFechaDTO() {}

    public PrecioFechaDTO(String fecha, BigDecimal precioDesde, boolean enOferta) {
        this.fecha = fecha;
        this.precioDesde = precioDesde;
        this.enOferta = enOferta;
    }

    public String getFecha() { return fecha; }
    public void setFecha(String fecha) { this.fecha = fecha; }

    public BigDecimal getPrecioDesde() { return precioDesde; }
    public void setPrecioDesde(BigDecimal precioDesde) { this.precioDesde = precioDesde; }

    public boolean isEnOferta() { return enOferta; }
    public void setEnOferta(boolean enOferta) { this.enOferta = enOferta; }
}
