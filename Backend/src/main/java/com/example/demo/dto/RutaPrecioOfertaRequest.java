package com.example.demo.dto;

import java.math.BigDecimal;

/** Solo el precio de oferta web de una ruta — no toca paradas, tarifas ni el resto. */
public class RutaPrecioOfertaRequest {

    private BigDecimal precioNormalOferta;
    private BigDecimal precioVipOferta;
    private Boolean ofertaActiva;
    /** Rango de fechas de VIAJE (ISO yyyy-MM-dd). Vacío = sin ese límite. */
    private String ofertaDesde;
    private String ofertaHasta;

    public BigDecimal getPrecioNormalOferta() { return precioNormalOferta; }
    public void setPrecioNormalOferta(BigDecimal precioNormalOferta) { this.precioNormalOferta = precioNormalOferta; }

    public BigDecimal getPrecioVipOferta() { return precioVipOferta; }
    public void setPrecioVipOferta(BigDecimal precioVipOferta) { this.precioVipOferta = precioVipOferta; }

    public Boolean getOfertaActiva() { return ofertaActiva; }
    public void setOfertaActiva(Boolean ofertaActiva) { this.ofertaActiva = ofertaActiva; }

    public String getOfertaDesde() { return ofertaDesde; }
    public void setOfertaDesde(String ofertaDesde) { this.ofertaDesde = ofertaDesde; }

    public String getOfertaHasta() { return ofertaHasta; }
    public void setOfertaHasta(String ofertaHasta) { this.ofertaHasta = ofertaHasta; }
}
