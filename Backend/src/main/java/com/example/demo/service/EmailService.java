package com.example.demo.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Envío de correos (boleto con QR y confirmación de embarque).
 *
 * Usa dos caminos según lo configurado:
 *   - Resend (API HTTPS) si hay RESEND_API_KEY. Es lo que funciona en Railway, que
 *     bloquea el SMTP saliente en los planes Free/Hobby.
 *   - SMTP (Gmail) como respaldo, para desarrollo local o si se contrata un plan que
 *     permita SMTP.
 *
 * Si no hay ninguno configurado, no se envía nada (y se avisa al arrancar).
 */
@Service
public class EmailService implements InitializingBean {

    private static final String RESEND_URL = "https://api.resend.com/emails";

    @Value("${resend.api-key:}")
    private String resendApiKey;

    /** Remitente. Hasta verificar el dominio en Resend, debe ser onboarding@resend.dev. */
    @Value("${resend.from:Transportes Rayza <onboarding@resend.dev>}")
    private String remitente;

    @Value("${spring.mail.password:}")
    private String claveSmtp;

    private final JavaMailSender mailSender;
    private final RestTemplate restTemplate = new RestTemplate();

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    private boolean usaResend() { return resendApiKey != null && !resendApiKey.isBlank(); }
    private boolean usaSmtp()   { return claveSmtp != null && !claveSmtp.isBlank(); }

    public boolean estaConfigurado() { return usaResend() || usaSmtp(); }

    @Override
    public void afterPropertiesSet() {
        if (usaResend())      System.out.println("[Email] Enviando por Resend (API HTTPS).");
        else if (usaSmtp())   System.out.println("[Email] Enviando por SMTP (Gmail).");
        else System.err.println("[Email] Sin RESEND_API_KEY ni MAIL_PASSWORD: NO se enviará "
                + "ningún boleto por correo. Configura una de las dos para activar el envío.");
    }

    // ------------------------------------------------------------- Boleto con QR

    public void enviarComprobante(String destinatario, String nombrePasajero,
                                  String serieNumero, String rutaNombre,
                                  String fechaSalida, String asiento,
                                  String precio, String codigoQr) throws MessagingException {

        String html = construirHtml(nombrePasajero, serieNumero, rutaNombre, fechaSalida, asiento, precio);
        byte[] qr;
        try {
            qr = generarQrComoBytes(codigoQr);
        } catch (WriterException | IOException e) {
            throw new MessagingException("Error al generar el código QR: " + e.getMessage());
        }

        if (usaResend())
            enviarPorResend(destinatario, "Tu comprobante de viaje - Transportes Rayza", html, qr);
        else
            enviarPorSmtp(destinatario, "Tu comprobante de viaje - Transportes Rayza", html, qr);
    }

    // ------------------------------------------------------- Confirmación de embarque

    public void enviarConfirmacionEmbarque(String destinatario, String nombrePasajero,
                                           String rutaNombre, String asiento,
                                           String horaEmbarque) throws MessagingException {

        String html = construirHtmlEmbarque(nombrePasajero, rutaNombre, asiento, horaEmbarque);

        if (usaResend())
            enviarPorResend(destinatario, "Embarque confirmado - Transportes Rayza", html, null);
        else
            enviarPorSmtp(destinatario, "Embarque confirmado - Transportes Rayza", html, null);
    }

    // ------------------------------------------------------------- Resend (HTTPS)

    /** El QR va como adjunto con content_id "qrcode", que el HTML referencia con cid:qrcode. */
    private void enviarPorResend(String destinatario, String asunto, String html, byte[] qr)
            throws MessagingException {

        Map<String, Object> cuerpo = new LinkedHashMap<>();
        cuerpo.put("from", remitente);
        cuerpo.put("to", List.of(destinatario));
        cuerpo.put("subject", asunto);
        cuerpo.put("html", html);

        if (qr != null) {
            Map<String, Object> adjunto = new LinkedHashMap<>();
            adjunto.put("filename", "codigo-qr.png");
            adjunto.put("content", Base64.getEncoder().encodeToString(qr));
            adjunto.put("content_type", "image/png");
            adjunto.put("content_id", "qrcode");
            List<Map<String, Object>> adjuntos = new ArrayList<>();
            adjuntos.add(adjunto);
            cuerpo.put("attachments", adjuntos);
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(resendApiKey);

        try {
            restTemplate.postForEntity(RESEND_URL, new HttpEntity<>(cuerpo, headers), Map.class);
        } catch (Exception e) {
            throw new MessagingException("Resend rechazó el envío: " + e.getMessage());
        }
    }

    // ------------------------------------------------------------- SMTP (respaldo)

    private void enviarPorSmtp(String destinatario, String asunto, String html, byte[] qr)
            throws MessagingException {

        MimeMessage mensaje = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(mensaje, true, "UTF-8");
        helper.setTo(destinatario);
        helper.setSubject(asunto);
        helper.setText(html, true);
        if (qr != null)
            helper.addInline("qrcode", new ByteArrayResource(qr), "image/png");
        mailSender.send(mensaje);
    }

    // ------------------------------------------------------------- Contenido

    private byte[] generarQrComoBytes(String contenido) throws WriterException, IOException {
        QRCodeWriter writer = new QRCodeWriter();
        BitMatrix matrix = writer.encode(contenido, BarcodeFormat.QR_CODE, 250, 250);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        MatrixToImageWriter.writeToStream(matrix, "PNG", out);
        return out.toByteArray();
    }

    private String construirHtml(String nombre, String serie, String ruta,
                                 String fecha, String asiento, String precio) {
        return """
            <!DOCTYPE html>
            <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #1a4db5; padding: 24px; text-align: center;">
                    <h1 style="color: white; margin: 0;">Transportes Rayza</h1>
                    <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0;">Comprobante de Viaje</p>
                </div>
                <div style="padding: 24px; background: #fff;">
                    <p>Hola <strong>%s</strong>,</p>
                    <p>Tu comprobante <strong>%s</strong> ha sido generado exitosamente.</p>
                    <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0;">
                        <p style="margin: 4px 0;"><strong>Ruta:</strong> %s</p>
                        <p style="margin: 4px 0;"><strong>Fecha:</strong> %s</p>
                        <p style="margin: 4px 0;"><strong>Asiento:</strong> %s</p>
                        <p style="margin: 4px 0;"><strong>Total:</strong> S/ %s</p>
                    </div>
                    <div style="text-align: center; margin: 20px 0;">
                        <img src="cid:qrcode" alt="Código QR" style="width: 160px; height: 160px;" />
                    </div>
                    <p style="color: #6b7280; font-size: 12px; text-align: center;">
                        Presenta el código QR de tu comprobante al momento del embarque.
                    </p>
                </div>
                <div style="background: #f8fafc; padding: 16px; text-align: center;">
                    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                        Gracias por viajar con Transportes Rayza
                    </p>
                </div>
            </body>
            </html>
        """.formatted(nombre, serie, ruta, fecha, asiento, precio);
    }

    private String construirHtmlEmbarque(String nombre, String ruta, String asiento, String hora) {
        return """
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #15803d; padding: 24px; text-align: center;">
                <h1 style="color: white; margin: 0;">¡Embarque Confirmado!</h1>
                <p style="color: rgba(255,255,255,0.85); margin: 4px 0 0;">Transportes Rayza</p>
            </div>
            <div style="padding: 24px; background: #fff;">
                <p>Hola <strong>%s</strong>,</p>
                <p>Confirmamos que has embarcado exitosamente. ¡Buen viaje!</p>
                <div style="background: #f0fdf4; border-radius: 8px; padding: 16px; margin: 16px 0;">
                    <p style="margin: 4px 0;"><strong>Ruta:</strong> %s</p>
                    <p style="margin: 4px 0;"><strong>Asiento:</strong> %s</p>
                    <p style="margin: 4px 0;"><strong>Hora de embarque:</strong> %s</p>
                </div>
            </div>
            <div style="background: #f8fafc; padding: 16px; text-align: center;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                    Gracias por viajar con Transportes Rayza
                </p>
            </div>
        </body>
        </html>
    """.formatted(nombre, ruta, asiento, hora);
    }
}
