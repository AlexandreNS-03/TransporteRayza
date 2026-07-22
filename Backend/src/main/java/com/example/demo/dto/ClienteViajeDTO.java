package com.example.demo.dto;

import java.math.BigDecimal;

/** Un viaje del historial del cliente (para /mi-cuenta). */
public class ClienteViajeDTO {
    private String ventaId;
    private String viajeCodigo;
    private String ruta;             // "Origen → Destino"
    private String fechaSalida;
    private String horaSalida;
    private Integer asientoNumero;
    private String asientoTipo;
    private BigDecimal precio;
    private String estado;           // PAGADO | RESERVADO | ANULADO
    private String embarqueEstado;   // PENDIENTE | EMBARCADO
    private String codigoQr;
    private boolean proximo;

    public String getVentaId() { return ventaId; }
    public void setVentaId(String ventaId) { this.ventaId = ventaId; }

    public String getViajeCodigo() { return viajeCodigo; }
    public void setViajeCodigo(String viajeCodigo) { this.viajeCodigo = viajeCodigo; }

    public String getRuta() { return ruta; }
    public void setRuta(String ruta) { this.ruta = ruta; }

    public String getFechaSalida() { return fechaSalida; }
    public void setFechaSalida(String fechaSalida) { this.fechaSalida = fechaSalida; }

    public String getHoraSalida() { return horaSalida; }
    public void setHoraSalida(String horaSalida) { this.horaSalida = horaSalida; }

    public Integer getAsientoNumero() { return asientoNumero; }
    public void setAsientoNumero(Integer asientoNumero) { this.asientoNumero = asientoNumero; }

    public String getAsientoTipo() { return asientoTipo; }
    public void setAsientoTipo(String asientoTipo) { this.asientoTipo = asientoTipo; }

    public BigDecimal getPrecio() { return precio; }
    public void setPrecio(BigDecimal precio) { this.precio = precio; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }

    public String getEmbarqueEstado() { return embarqueEstado; }
    public void setEmbarqueEstado(String embarqueEstado) { this.embarqueEstado = embarqueEstado; }

    public String getCodigoQr() { return codigoQr; }
    public void setCodigoQr(String codigoQr) { this.codigoQr = codigoQr; }

    public boolean isProximo() { return proximo; }
    public void setProximo(boolean proximo) { this.proximo = proximo; }
}
