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
    private List<ViajeProximoDTO> viajesProximos;
    private List<UltimaVentaDTO> ultimasVentas;
    private List<VentaPorDiaDTO> ventasPorDia;
    private List<TopRutaDTO> topRutas;
    private List<OcupacionTipoDTO> ocupacionPorTipo;

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