package com.example.demo.dto;

/**
 * Un método de pago guardado, como lo ve el cliente.
 *
 * Tarjetas y Yape viven en tablas distintas porque son contratos distintos —uno
 * es con Izipay y el otro con GMoney, y se dan de baja de maneras distintas—,
 * pero para quien mira la pantalla son la misma cosa: formas de pagar que ya
 * dejó listas. Esto es lo que las junta.
 *
 * Lo que viaja al navegador es deliberadamente poco: tipo, una etiqueta para
 * reconocerlo y si está vencido. Nada de tokens; con el token se cobra.
 */
public class MetodoPagoGuardadoDTO {

    public enum Tipo { TARJETA, YAPE }

    private String id;
    private Tipo tipo;
    /** "Visa ···· 4242" o "Yape ···· 3456". */
    private String etiqueta;
    private String marca;
    private String ultimos4;
    /** "09/28", o null para Yape. */
    private String vence;
    private boolean vencida;
    private boolean preferida;
    /** True mientras el proveedor esté apagado: se muestra, pero no cobra. */
    private boolean simulado;

    public MetodoPagoGuardadoDTO() {}

    public MetodoPagoGuardadoDTO(String id, Tipo tipo, String etiqueta, String marca,
                                 String ultimos4, String vence, boolean vencida,
                                 boolean preferida, boolean simulado) {
        this.id = id; this.tipo = tipo; this.etiqueta = etiqueta; this.marca = marca;
        this.ultimos4 = ultimos4; this.vence = vence; this.vencida = vencida;
        this.preferida = preferida; this.simulado = simulado;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public Tipo getTipo() { return tipo; }
    public void setTipo(Tipo tipo) { this.tipo = tipo; }
    public String getEtiqueta() { return etiqueta; }
    public void setEtiqueta(String etiqueta) { this.etiqueta = etiqueta; }
    public String getMarca() { return marca; }
    public void setMarca(String marca) { this.marca = marca; }
    public String getUltimos4() { return ultimos4; }
    public void setUltimos4(String ultimos4) { this.ultimos4 = ultimos4; }
    public String getVence() { return vence; }
    public void setVence(String vence) { this.vence = vence; }
    public boolean isVencida() { return vencida; }
    public void setVencida(boolean vencida) { this.vencida = vencida; }
    public boolean isPreferida() { return preferida; }
    public void setPreferida(boolean preferida) { this.preferida = preferida; }
    public boolean isSimulado() { return simulado; }
    public void setSimulado(boolean simulado) { this.simulado = simulado; }
}
