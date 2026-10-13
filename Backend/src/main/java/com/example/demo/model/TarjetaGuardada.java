package com.example.demo.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Una tarjeta que el cliente dejó guardada para no volver a escribirla.
 *
 * <p><strong>Acá no hay ninguna tarjeta.</strong> No se guarda el número, ni el
 * código de seguridad, ni nada que sirva para cobrar por fuera. Lo único que se
 * guarda es el identificador que devuelve Izipay —el <em>token</em>— junto con
 * los cuatro últimos dígitos y la marca, que son para que la persona reconozca
 * cuál de sus tarjetas es.
 *
 * <p>El número nunca pasa por nuestro servidor: lo escribe el cliente dentro del
 * formulario de Izipay, igual que hoy. Lo único que cambia es que al pagar se le
 * pide a Izipay que además la registre, y de vuelta llega ese token.
 *
 * <p>Si esta tabla se filtrara, lo que se filtra es una lista de correos, marcas
 * y cuatro dígitos. Con el token solo se puede cobrar desde nuestra cuenta de
 * comercio y con nuestras credenciales; a nadie más le sirve.
 *
 * <p>Esa es toda la razón de usar un token: la tarjeta queda guardada en Izipay,
 * que para eso está certificado, y nosotros guardamos un recibo que apunta a
 * ella. Guardar números de tarjeta nosotros exigiría cumplir PCI DSS y no tiene
 * ningún sentido hacerlo.
 */
@Entity
@Table(name = "tarjetas_guardadas")
public class TarjetaGuardada {

    public enum Estado { ACTIVA, REVOCADA }

    @Id
    @Column(name = "id", length = 36)
    private String id;

    /** De quién es. Es la llave por la que se buscan. */
    @Column(name = "cliente_email", nullable = false, length = 150)
    private String clienteEmail;

    /** Visa, Mastercard, Amex… Lo dice el proveedor, no lo deducimos. */
    @Column(name = "marca", length = 30)
    private String marca;

    /** Los cuatro últimos dígitos, solo para reconocerla. Nunca el número. */
    @Column(name = "ultimos4", length = 4)
    private String ultimos4;

    /** Mes y año de vencimiento, para poder avisar antes de que caduque. */
    @Column(name = "vence_mes")
    private Integer venceMes;

    @Column(name = "vence_anio")
    private Integer venceAnio;

    /** El identificador de Izipay. Es lo único que se manda al cobrar. */
    @Column(name = "token", nullable = false, length = 200)
    private String token;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado", nullable = false, length = 20)
    private Estado estado = Estado.ACTIVA;

    /**
     * La que se ofrece primero al pagar. Solo una por cliente puede serlo; de
     * eso se encarga el servicio, no la base.
     */
    @Column(name = "preferida")
    private Boolean preferida = false;

    @Column(name = "motivo_baja", length = 200)
    private String motivoBaja;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    /** Última vez que se cobró con ella. Sirve para ordenarlas por uso. */
    @Column(name = "usada_at")
    private LocalDateTime usadaAt;

    @Column(name = "revocada_at")
    private LocalDateTime revocadaAt;

    public boolean estaActiva() { return estado == Estado.ACTIVA; }

    /** ¿Ya venció? Se compara con el último día del mes de vencimiento. */
    public boolean estaVencida(java.time.LocalDate hoy) {
        if (venceMes == null || venceAnio == null) return false;
        return java.time.YearMonth.of(venceAnio, venceMes).isBefore(java.time.YearMonth.from(hoy));
    }

    /** Cómo se le muestra al cliente: "Visa ···· 4242". */
    public String etiqueta() {
        String m = marca != null && !marca.isBlank() ? marca : "Tarjeta";
        return m + " ···· " + (ultimos4 != null ? ultimos4 : "????");
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getClienteEmail() { return clienteEmail; }
    public void setClienteEmail(String clienteEmail) { this.clienteEmail = clienteEmail; }

    public String getMarca() { return marca; }
    public void setMarca(String marca) { this.marca = marca; }

    public String getUltimos4() { return ultimos4; }
    public void setUltimos4(String ultimos4) { this.ultimos4 = ultimos4; }

    public Integer getVenceMes() { return venceMes; }
    public void setVenceMes(Integer venceMes) { this.venceMes = venceMes; }

    public Integer getVenceAnio() { return venceAnio; }
    public void setVenceAnio(Integer venceAnio) { this.venceAnio = venceAnio; }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public Estado getEstado() { return estado; }
    public void setEstado(Estado estado) { this.estado = estado; }

    public Boolean getPreferida() { return preferida; }
    public void setPreferida(Boolean preferida) { this.preferida = preferida; }

    public String getMotivoBaja() { return motivoBaja; }
    public void setMotivoBaja(String motivoBaja) { this.motivoBaja = motivoBaja; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUsadaAt() { return usadaAt; }
    public void setUsadaAt(LocalDateTime usadaAt) { this.usadaAt = usadaAt; }

    public LocalDateTime getRevocadaAt() { return revocadaAt; }
    public void setRevocadaAt(LocalDateTime revocadaAt) { this.revocadaAt = revocadaAt; }
}
