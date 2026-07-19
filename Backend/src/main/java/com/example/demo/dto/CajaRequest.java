package com.example.demo.dto;

import java.math.BigDecimal;

/** Peticiones del módulo de caja: apertura, cierre y movimientos manuales. */
public class CajaRequest {

    private BigDecimal montoInicial;   // apertura
    private BigDecimal montoCierre;    // cierre (efectivo contado)
    private String observacion;
    private String tipo;               // movimiento manual: INGRESO | EGRESO
    private BigDecimal monto;          // movimiento manual
    private String motivo;             // movimiento manual

    public BigDecimal getMontoInicial() { return montoInicial; }
    public void setMontoInicial(BigDecimal montoInicial) { this.montoInicial = montoInicial; }

    public BigDecimal getMontoCierre() { return montoCierre; }
    public void setMontoCierre(BigDecimal montoCierre) { this.montoCierre = montoCierre; }

    public String getObservacion() { return observacion; }
    public void setObservacion(String observacion) { this.observacion = observacion; }

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }

    public BigDecimal getMonto() { return monto; }
    public void setMonto(BigDecimal monto) { this.monto = monto; }

    public String getMotivo() { return motivo; }
    public void setMotivo(String motivo) { this.motivo = motivo; }
}
