package com.example.demo.dto;

/**
 * Las preferencias como las ve y las manda la pantalla.
 *
 * El correo informativo no está entre los campos editables: va siempre, y
 * mostrarlo como un interruptor apagable sería mentir. La pantalla lo explica.
 */
public class PreferenciasNotificacionDTO {

    private boolean infoWhatsapp;
    private boolean infoSms;
    private boolean promoEmail;
    private boolean promoWhatsapp;
    private boolean promoSms;

    /** Solo lectura: cuándo aceptó la publicidad, para que lo pueda ver. */
    private String promoAceptadoAt;

    /**
     * Solo lectura. Hoy no mandamos nada por WhatsApp ni SMS: la preferencia se
     * guarda, pero no hay por dónde salir todavía. Decirlo evita prometer algo
     * que no pasa.
     */
    private boolean whatsappDisponible;
    private boolean smsDisponible;

    public boolean isInfoWhatsapp() { return infoWhatsapp; }
    public void setInfoWhatsapp(boolean v) { this.infoWhatsapp = v; }
    public boolean isInfoSms() { return infoSms; }
    public void setInfoSms(boolean v) { this.infoSms = v; }
    public boolean isPromoEmail() { return promoEmail; }
    public void setPromoEmail(boolean v) { this.promoEmail = v; }
    public boolean isPromoWhatsapp() { return promoWhatsapp; }
    public void setPromoWhatsapp(boolean v) { this.promoWhatsapp = v; }
    public boolean isPromoSms() { return promoSms; }
    public void setPromoSms(boolean v) { this.promoSms = v; }
    public String getPromoAceptadoAt() { return promoAceptadoAt; }
    public void setPromoAceptadoAt(String v) { this.promoAceptadoAt = v; }
    public boolean isWhatsappDisponible() { return whatsappDisponible; }
    public void setWhatsappDisponible(boolean v) { this.whatsappDisponible = v; }
    public boolean isSmsDisponible() { return smsDisponible; }
    public void setSmsDisponible(boolean v) { this.smsDisponible = v; }
}
