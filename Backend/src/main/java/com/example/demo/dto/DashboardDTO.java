package com.example.demo.dto;

import java.math.BigDecimal;
import java.util.List;

public class DashboardDTO {

    private int totalViajesHoy;
    private int totalVentasHoy;
    private int totalPasajerosEmbarcados;
    private BigDecimal ingresosHoy;
    private int totalVentasSemana;
    private BigDecimal ingresosSemana;
    private int totalVentasMes;
    private BigDecimal ingresosMes;
    // Efectivo cobrado HOY separado por oficina (para cuadrar caja)
    private BigDecimal efectivoIquitosHoy;
    private BigDecimal efectivoRequenaHoy;
    private BigDecimal descuentosHoy;
    private BigDecimal efectivoHoy;
    private BigDecimal digitalHoy;
    private List<CobroMetodoDTO> cobrosMetodoHoy;

    // Compras por la web, separadas del mostrador: esta plata entra a la cuenta de
    // la pasarela, no a la caja de la oficina, y confundirlas descuadra el arqueo.
    private int totalVentasWebHoy;
    private BigDecimal ingresosWebHoy;
    private int totalVentasWebMes;
    private BigDecimal ingresosWebMes;
    private BigDecimal ingresosMostradorHoy;
    /** Desglose de lo cobrado hoy en la web por pasarela (Izipay / Mercado Pago). */
    private List<CobroMetodoDTO> cobrosWebHoy;
    private List<ViajeProximoDTO> viajesProximos;
    private List<UltimaVentaDTO> ultimasVentas;
    private List<VentaPorDiaDTO> ventasPorDia;
    private List<TopRutaDTO> topRutas;
    private List<OcupacionTipoDTO> ocupacionPorTipo;

    public int getTotalVentasWebHoy() { return totalVentasWebHoy; }
    public void setTotalVentasWebHoy(int v) { this.totalVentasWebHoy = v; }

    public BigDecimal getIngresosWebHoy() { return ingresosWebHoy; }
    public void setIngresosWebHoy(BigDecimal v) { this.ingresosWebHoy = v; }

    public int getTotalVentasWebMes() { return totalVentasWebMes; }
    public void setTotalVentasWebMes(int v) { this.totalVentasWebMes = v; }

    public BigDecimal getIngresosWebMes() { return ingresosWebMes; }
    public void setIngresosWebMes(BigDecimal v) { this.ingresosWebMes = v; }

    public BigDecimal getIngresosMostradorHoy() { return ingresosMostradorHoy; }
    public void setIngresosMostradorHoy(BigDecimal v) { this.ingresosMostradorHoy = v; }

    public List<CobroMetodoDTO> getCobrosWebHoy() { return cobrosWebHoy; }
    public void setCobrosWebHoy(List<CobroMetodoDTO> v) { this.cobrosWebHoy = v; }

    public static class ViajeProximoDTO {
        private String codigoViaje;
        private String rutaNombre;
        private String embarcacionNombre;
        private String fechaSalida;
        private String horaSalida;
        private String estado;

        public ViajeProximoDTO(String codigoViaje, String rutaNombre,
                               String embarcacionNombre, String fechaSalida,
                               String horaSalida, String estado) {
            this.codigoViaje      = codigoViaje;
            this.rutaNombre       = rutaNombre;
            this.embarcacionNombre = embarcacionNombre;
            this.fechaSalida      = fechaSalida;
            this.horaSalida       = horaSalida;
            this.estado           = estado;
        }

        public String getCodigoViaje()       { return codigoViaje; }
        public String getRutaNombre()        { return rutaNombre; }
        public String getEmbarcacionNombre() { return embarcacionNombre; }
        public String getFechaSalida()       { return fechaSalida; }
        public String getHoraSalida()        { return horaSalida; }
        public String getEstado()            { return estado; }
    }

    public static class UltimaVentaDTO {
        private String pasajeroNombre;
        private String paradaOrigen;
        private String paradaDestino;
        private String asientoTipo;
        private Integer asientoNumero;
        private java.math.BigDecimal precio;
        private String tipoComprobante;
        private String fechaVenta;

        public UltimaVentaDTO(String pasajeroNombre, String paradaOrigen,
                              String paradaDestino, String asientoTipo,
                              Integer asientoNumero, java.math.BigDecimal precio,
                              String tipoComprobante, String fechaVenta) {
            this.pasajeroNombre  = pasajeroNombre;
            this.paradaOrigen    = paradaOrigen;
            this.paradaDestino   = paradaDestino;
            this.asientoTipo     = asientoTipo;
            this.asientoNumero   = asientoNumero;
            this.precio          = precio;
            this.tipoComprobante = tipoComprobante;
            this.fechaVenta      = fechaVenta;
        }

        public String getPasajeroNombre()  { return pasajeroNombre; }
        public String getParadaOrigen()    { return paradaOrigen; }
        public String getParadaDestino()   { return paradaDestino; }
        public String getAsientoTipo()     { return asientoTipo; }
        public Integer getAsientoNumero()  { return asientoNumero; }
        public java.math.BigDecimal getPrecio() { return precio; }
        public String getTipoComprobante() { return tipoComprobante; }
        public String getFechaVenta()      { return fechaVenta; }
    }

    public static class VentaPorDiaDTO {
        private String dia;
        private int ventas;
        private BigDecimal ingresos;

        public VentaPorDiaDTO(String dia, int ventas, BigDecimal ingresos) {
            this.dia = dia;
            this.ventas = ventas;
            this.ingresos = ingresos;
        }
        public String getDia() { return dia; }
        public int getVentas() { return ventas; }
        public BigDecimal getIngresos() { return ingresos; }
    }

    public static class TopRutaDTO {
        private String ruta;
        private int ventas;

        public TopRutaDTO(String ruta, int ventas) {
            this.ruta = ruta;
            this.ventas = ventas;
        }
        public String getRuta() { return ruta; }
        public int getVentas() { return ventas; }
    }

    public static class OcupacionTipoDTO {
        private String tipo;
        private int cantidad;

        public OcupacionTipoDTO(String tipo, int cantidad) {
            this.tipo = tipo;
            this.cantidad = cantidad;
        }
        public String getTipo() { return tipo; }
        public int getCantidad() { return cantidad; }
    }

    // Getters y Setters
    public int getTotalViajesHoy() { return totalViajesHoy; }
    public void setTotalViajesHoy(int t) { this.totalViajesHoy = t; }

    public int getTotalVentasHoy() { return totalVentasHoy; }
    public void setTotalVentasHoy(int t) { this.totalVentasHoy = t; }

    public int getTotalPasajerosEmbarcados() { return totalPasajerosEmbarcados; }
    public void setTotalPasajerosEmbarcados(int t) { this.totalPasajerosEmbarcados = t; }

    public BigDecimal getIngresosHoy() { return ingresosHoy; }
    public void setIngresosHoy(BigDecimal i) { this.ingresosHoy = i; }

    public int getTotalVentasSemana() { return totalVentasSemana; }
    public void setTotalVentasSemana(int t) { this.totalVentasSemana = t; }

    public BigDecimal getIngresosSemana() { return ingresosSemana; }
    public void setIngresosSemana(BigDecimal i) { this.ingresosSemana = i; }

    public int getTotalVentasMes() { return totalVentasMes; }
    public void setTotalVentasMes(int t) { this.totalVentasMes = t; }

    public BigDecimal getIngresosMes() { return ingresosMes; }
    public void setIngresosMes(BigDecimal i) { this.ingresosMes = i; }

    public BigDecimal getEfectivoIquitosHoy() { return efectivoIquitosHoy; }
    public void setEfectivoIquitosHoy(BigDecimal i) { this.efectivoIquitosHoy = i; }

    public BigDecimal getEfectivoRequenaHoy() { return efectivoRequenaHoy; }
    public void setEfectivoRequenaHoy(BigDecimal i) { this.efectivoRequenaHoy = i; }

    public BigDecimal getDescuentosHoy() { return descuentosHoy; }
    public void setDescuentosHoy(BigDecimal d) { this.descuentosHoy = d; }

    public BigDecimal getEfectivoHoy() { return efectivoHoy; }
    public void setEfectivoHoy(BigDecimal e) { this.efectivoHoy = e; }

    public BigDecimal getDigitalHoy() { return digitalHoy; }
    public void setDigitalHoy(BigDecimal d) { this.digitalHoy = d; }

    public List<CobroMetodoDTO> getCobrosMetodoHoy() { return cobrosMetodoHoy; }
    public void setCobrosMetodoHoy(List<CobroMetodoDTO> c) { this.cobrosMetodoHoy = c; }

    public static class CobroMetodoDTO {
        private String metodo;
        private BigDecimal monto;
        public CobroMetodoDTO(String metodo, BigDecimal monto) { this.metodo = metodo; this.monto = monto; }
        public String getMetodo() { return metodo; }
        public BigDecimal getMonto() { return monto; }
    }

    public List<ViajeProximoDTO> getViajesProximos() { return viajesProximos; }
    public void setViajesProximos(List<ViajeProximoDTO> v) { this.viajesProximos = v; }

    public List<UltimaVentaDTO> getUltimasVentas() { return ultimasVentas; }
    public void setUltimasVentas(List<UltimaVentaDTO> u) { this.ultimasVentas = u; }

    public void setVentasPorDia(List<VentaPorDiaDTO> ventasPorDia) { this.ventasPorDia = ventasPorDia; }
    public void setTopRutas(List<TopRutaDTO> topRutas) { this.topRutas = topRutas; }
    public void setOcupacionPorTipo(List<OcupacionTipoDTO> ocupacionPorTipo) { this.ocupacionPorTipo = ocupacionPorTipo; }

    public List<VentaPorDiaDTO> getVentasPorDia() { return ventasPorDia; }
    public List<TopRutaDTO> getTopRutas() { return topRutas; }
    public List<OcupacionTipoDTO> getOcupacionPorTipo() { return ocupacionPorTipo; }
}