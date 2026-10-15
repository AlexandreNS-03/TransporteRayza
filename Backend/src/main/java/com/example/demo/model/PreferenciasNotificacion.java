package com.example.demo.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Por dónde quiere el cliente que le escribamos, y para qué.
 *
 * <p><strong>Son dos cosas distintas y la ley las trata distinto.</strong>
 *
 * <p>Lo <em>informativo</em> es parte del servicio que compró: el boleto, el
 * comprobante, el aviso de que su viaje cambió de hora. Eso no se pregunta — se
 * manda, porque sin eso el pasaje no sirve. Lo único que elige es si además
 * quiere que le llegue por WhatsApp o por mensaje de texto.
 *
 * <p>Lo <em>promocional</em> es publicidad, y esa sí necesita que diga que sí.
 * Viene apagado, se enciende a mano y queda anotado cuándo lo encendió, porque
 * la Ley 29733 pide poder demostrar ese consentimiento. Apagarlo tiene que ser
 * igual de fácil, y también queda anotado.
 */
@Entity
@Table(name = "preferencias_notificacion")
public class PreferenciasNotificacion {

    /** Por dónde. */
    public enum Canal { EMAIL, WHATSAPP, SMS }

    /** Para qué. */
    public enum Tipo { INFORMATIVO, PROMOCIONAL }

    @Id
    @Column(name = "cliente_id", length = 36)
    private String clienteId;

    /* ── Informativo ──
       El correo no está acá: va siempre. Es donde llegan el boleto y el
       comprobante, y apagarlo sería vender un pasaje que el pasajero no
       puede mostrar. */
    @Column(name = "info_whatsapp")
    private Boolean infoWhatsapp = false;

    @Column(name = "info_sms")
    private Boolean infoSms = false;

    /* ── Promocional ── Todo apagado hasta que lo encienda. */
    @Column(name = "promo_email")
    private Boolean promoEmail = false;

    @Column(name = "promo_whatsapp")
    private Boolean promoWhatsapp = false;

    @Column(name = "promo_sms")
    private Boolean promoSms = false;

    /** Cuándo dijo que sí a la publicidad. Null = nunca. */
    @Column(name = "promo_aceptado_at")
    private LocalDateTime promoAceptadoAt;

    /** Cuándo la apagó del todo. */
    @Column(name = "promo_revocado_at")
    private LocalDateTime promoRevocadoAt;

    /** Dónde lo dijo, para que el registro sirva de algo: "cuenta web". */
    @Column(name = "promo_origen", length = 40)
    private String promoOrigen;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /** ¿Aceptó publicidad por algún lado? */
    public boolean aceptaPromociones() {
        return Boolean.TRUE.equals(promoEmail)
            || Boolean.TRUE.equals(promoWhatsapp)
            || Boolean.TRUE.equals(promoSms);
    }

    /**
     * La pregunta que tiene que hacerse cualquiera antes de mandar algo.
     *
     * El correo informativo devuelve true siempre, a propósito: es el servicio,
     * no una suscripción.
     */
    public boolean permite(Tipo tipo, Canal canal) {
        if (tipo == Tipo.INFORMATIVO) {
            return switch (canal) {
                case EMAIL    -> true;
                case WHATSAPP -> Boolean.TRUE.equals(infoWhatsapp);
                case SMS      -> Boolean.TRUE.equals(infoSms);
            };
        }
        return switch (canal) {
            case EMAIL    -> Boolean.TRUE.equals(promoEmail);
            case WHATSAPP -> Boolean.TRUE.equals(promoWhatsapp);
            case SMS      -> Boolean.TRUE.equals(promoSms);
        };
    }

    public String getClienteId() { return clienteId; }
    public void setClienteId(String clienteId) { this.clienteId = clienteId; }
    public Boolean getInfoWhatsapp() { return infoWhatsapp; }
    public void setInfoWhatsapp(Boolean v) { this.infoWhatsapp = v; }
    public Boolean getInfoSms() { return infoSms; }
    public void setInfoSms(Boolean v) { this.infoSms = v; }
    public Boolean getPromoEmail() { return promoEmail; }
    public void setPromoEmail(Boolean v) { this.promoEmail = v; }
    public Boolean getPromoWhatsapp() { return promoWhatsapp; }
    public void setPromoWhatsapp(Boolean v) { this.promoWhatsapp = v; }
    public Boolean getPromoSms() { return promoSms; }
    public void setPromoSms(Boolean v) { this.promoSms = v; }
    public LocalDateTime getPromoAceptadoAt() { return promoAceptadoAt; }
    public void setPromoAceptadoAt(LocalDateTime v) { this.promoAceptadoAt = v; }
    public LocalDateTime getPromoRevocadoAt() { return promoRevocadoAt; }
    public void setPromoRevocadoAt(LocalDateTime v) { this.promoRevocadoAt = v; }
    public String getPromoOrigen() { return promoOrigen; }
    public void setPromoOrigen(String v) { this.promoOrigen = v; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime v) { this.updatedAt = v; }
}
