package com.example.demo.dto;

import java.math.BigDecimal;

/** Solo el precio de oferta web de una ruta — no toca paradas, tarifas ni el resto. */
public class RutaPrecioOfertaRequest {

    private BigDecimal precioNormalOferta;
    private BigDecimal precioVipOferta;
    private Boolean ofertaActiva;

    public BigDecimal getPrecioNormalOferta() { return precioNormalOferta; }
    public void setPrecioNormalOferta(BigDecimal precioNormalOferta) { this.precioNormalOferta = precioNormalOferta; }

    public BigDecimal getPrecioVipOferta() { return precioVipOferta; }
    public void setPrecioVipOferta(BigDecimal precioVipOferta) { this.precioVipOferta = precioVipOferta; }

    public Boolean getOfertaActiva() { return ofertaActiva; }
    public void setOfertaActiva(Boolean ofertaActiva) { this.ofertaActiva = ofertaActiva; }
}
