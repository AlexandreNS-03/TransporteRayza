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

    /*
     * Remitente del Libro de Reclamaciones.
     *
     * Va aparte del de boletos porque a un reclamo la persona SÍ le responde, y
     * esa respuesta tiene que llegar a alguien. Si queda vacío se usa el de
     * siempre, así que no configurar nada no rompe el envío.
     */
    @Value("${resend.from-reclamaciones:}")
    private String remitenteReclamaciones;

    /** Copia de cada reclamo a la empresa: quien tiene que responder debe enterarse. */
    @Value("${email.copia-reclamaciones:}")
    private String copiaReclamaciones;

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

    // ------------------------------------------------- Recuperar contraseña

    /**
     * Enlace para poner una contraseña nueva.
     *
     * El correo dice qué hacer si NO fue quien lo pidió: alguien puede escribir el
     * correo ajeno en el formulario, y el dueño tiene que entender que su cuenta
     * sigue a salvo mientras no use el enlace.
     */
    public void enviarEnlaceRecuperacion(String destinatario, String nombre,
                                         String enlace, int minutos) throws MessagingException {
        String html = "<div style=\"font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#0f172a\">"
                + "<h2 style=\"margin:0 0 6px\">Recupera tu contraseña</h2>"
                + "<p style=\"margin:0 0 18px;color:#55617a\">Hola " + esc(nombre) + ",</p>"
                + "<p>Pediste volver a entrar a tu cuenta de Transportes Rayza. "
                + "Haz clic en el botón y elige una contraseña nueva.</p>"
                + "<p style=\"margin:24px 0\"><a href=\"" + esc(enlace) + "\" "
                + "style=\"display:inline-block;padding:13px 26px;background:#e01e2a;color:#fff;"
                + "border-radius:9px;text-decoration:none;font-weight:700\">Cambiar mi contraseña</a></p>"
                + "<p style=\"color:#55617a;font-size:14px\">El enlace vence en " + minutos
                + " minutos y sirve una sola vez.</p>"
                + "<p style=\"color:#55617a;font-size:14px\"><strong>¿No fuiste tú?</strong> "
                + "Ignora este correo: tu contraseña no cambia mientras no uses el enlace.</p>"
                + "</div>";

        String asunto = "Recupera tu contraseña - Transportes Rayza";
        if (usaResend()) enviarPorResend(destinatario, asunto, html, null);
        else             enviarPorSmtp(destinatario, asunto, html, null);
    }

    /**
     * Aviso de que la contraseña cambió.
     *
     * Es la única señal que tendría el dueño si alguien más entrara a su correo y
     * le robara la cuenta, así que se manda aunque el cambio haya sido legítimo.
     */
    public void enviarAvisoClaveCambiada(String destinatario, String nombre) throws MessagingException {
        String html = "<div style=\"font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#0f172a\">"
                + "<h2 style=\"margin:0 0 6px\">Tu contraseña cambió</h2>"
                + "<p style=\"margin:0 0 18px;color:#55617a\">Hola " + esc(nombre) + ",</p>"
                + "<p>La contraseña de tu cuenta de Transportes Rayza acaba de cambiar.</p>"
                + "<p style=\"color:#55617a;font-size:14px\"><strong>Si no fuiste tú</strong>, "
                + "escríbenos cuanto antes: alguien más pudo entrar a tu correo.</p>"
                + "</div>";

        String asunto = "Tu contraseña cambió - Transportes Rayza";
        if (usaResend()) enviarPorResend(destinatario, asunto, html, null);
        else             enviarPorSmtp(destinatario, asunto, html, null);
    }

    // ------------------------------------------------- Libro de Reclamaciones

    /**
     * Copia de la hoja para el consumidor.
     *
     * La norma exige poder imprimirla o mandarla al correo; esto es lo segundo.
     * Lleva el número correlativo, que es lo que el consumidor necesita si más
     * adelante acude a INDECOPI.
     */
    public void enviarCopiaReclamacion(com.example.demo.model.Reclamacion r) throws MessagingException {
        String asunto = "Hoja de Reclamación N° " + r.getNumero() + " - Transportes Rayza";
        String html = construirHtmlReclamacion(r, false);

        // Con copia a la empresa: alguien tiene que responder dentro de los 15 días
        // hábiles, y enterarse por el panel supone que alguien lo esté mirando.
        if (usaResend()) enviarPorResend(r.getConsumidorEmail(), asunto, html, null,
                                         remitenteReclamaciones, copiaReclamaciones);
        else             enviarPorSmtp(r.getConsumidorEmail(), asunto, html, null,
                                       copiaReclamaciones);
    }

    /** Aviso al consumidor de que su hoja ya tiene respuesta. */
    public void enviarRespuestaReclamacion(com.example.demo.model.Reclamacion r) throws MessagingException {
        String asunto = "Respuesta a tu Hoja de Reclamación N° " + r.getNumero() + " - Transportes Rayza";
        String html = construirHtmlReclamacion(r, true);

        if (usaResend()) enviarPorResend(r.getConsumidorEmail(), asunto, html, null,
                                         remitenteReclamaciones, null);
        else             enviarPorSmtp(r.getConsumidorEmail(), asunto, html, null);
    }

    private String construirHtmlReclamacion(com.example.demo.model.Reclamacion r, boolean conRespuesta) {
        String tipo = r.getTipo() == com.example.demo.model.Reclamacion.Tipo.QUEJA ? "Queja" : "Reclamo";
        StringBuilder b = new StringBuilder();
        b.append("<div style=\"font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#0f172a\">");
        b.append("<h2 style=\"margin:0 0 4px\">Hoja de Reclamación N° ").append(r.getNumero()).append("</h2>");
        b.append("<p style=\"margin:0 0 18px;color:#55617a\">Transportes Rayza · ")
         .append(tipo).append(" registrado el ").append(fechaBonita(r.getCreatedAt())).append("</p>");

        b.append(fila("Consumidor", esc(r.getConsumidorNombre())));
        b.append(fila("Documento", esc(r.getConsumidorTipoDocumento()) + " " + esc(r.getConsumidorDocumento())));
        if (noVacio(r.getConsumidorTelefono())) b.append(fila("Teléfono", esc(r.getConsumidorTelefono())));
        if (noVacio(r.getBienDescripcion()))    b.append(fila("Servicio", esc(r.getBienDescripcion())));
        b.append(fila("Detalle", esc(r.getDetalle())));
        if (noVacio(r.getPedido())) b.append(fila("Tu pedido", esc(r.getPedido())));

        if (conRespuesta && noVacio(r.getRespuesta())) {
            b.append("<div style=\"margin-top:18px;padding:14px;background:#eef3fd;border-radius:8px\">");
            b.append("<strong>Respuesta de Transportes Rayza</strong>");
            b.append("<p style=\"margin:8px 0 0;white-space:pre-wrap\">").append(esc(r.getRespuesta())).append("</p>");
            b.append("</div>");
        } else {
            b.append("<p style=\"margin-top:18px;color:#55617a;font-size:14px\">")
             .append("Te responderemos a este correo dentro de los 15 días hábiles que establece la norma. ")
             .append("Guarda el número de tu hoja: es lo que te van a pedir si acudes a INDECOPI.</p>");
        }

        b.append("<p style=\"margin-top:22px;color:#55617a;font-size:12px\">")
         .append("Este mensaje es la constancia de tu registro en nuestro Libro de Reclamaciones virtual.</p>");
        b.append("</div>");
        return b.toString();
    }

    private String fila(String etiqueta, String valor) {
        return "<p style=\"margin:0 0 10px\"><strong>" + etiqueta + ":</strong><br>"
             + "<span style=\"white-space:pre-wrap\">" + valor + "</span></p>";
    }

    private String fechaBonita(java.time.LocalDateTime f) {
        return f == null ? "" : f.format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
    }

    private boolean noVacio(String s) { return s != null && !s.trim().isEmpty(); }

    /* El texto lo escribe el consumidor: se escapa para que no pueda inyectar HTML
       en el correo que le llega a él ni en el que revisa la empresa. */
    private String esc(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }

    // ------------------------------------------------- Reserva pendiente de pago

    /**
     * Aviso al cliente que dejó la compra a medias: el asiento sigue retenido pero
     * vence en pocos minutos. El botón lleva a terminar el pago.
     */
    public void enviarPagoPendiente(String destinatario, String nombre, String ruta,
                                    String fecha, String hora, String asientos,
                                    int cantidad, java.math.BigDecimal total,
                                    long minutos, String enlace) throws MessagingException {

        String html = construirHtmlPagoPendiente(nombre, ruta, fecha, hora, asientos,
                                                 cantidad, total, minutos, enlace);
        String asunto = "¡Atención! Tu reserva tiene un pago pendiente - Transportes Rayza";

        if (usaResend())
            enviarPorResend(destinatario, asunto, html, null);
        else
            enviarPorSmtp(destinatario, asunto, html, null);
    }

    // ------------------------------------------------------- Correo de texto simple

    /**
     * Envía un correo de texto (avisos internos, soporte). Usa el mismo camino que el
     * resto: Resend en producción, SMTP como respaldo local.
     */
    public void enviarTexto(String destinatario, String asunto, String texto) throws MessagingException {
        String html = "<div style=\"font-family:Arial,sans-serif;font-size:15px;line-height:1.6\">"
                + texto.replace("\n", "<br>") + "</div>";
        if (usaResend())
            enviarPorResend(destinatario, asunto, html, null);
        else
            enviarPorSmtp(destinatario, asunto, html, null);
    }

    // ------------------------------------------------------------- Resend (HTTPS)

    /** El QR va como adjunto con content_id "qrcode", que el HTML referencia con cid:qrcode. */
    private void enviarPorResend(String destinatario, String asunto, String html, byte[] qr)
            throws MessagingException {
        enviarPorResend(destinatario, asunto, html, qr, null, null);
    }

    /**
     * @param de     remitente distinto al de siempre, o null para el de siempre
     * @param copia  dirección en copia, o null
     */
    private void enviarPorResend(String destinatario, String asunto, String html, byte[] qr,
                                 String de, String copia)
            throws MessagingException {

        Map<String, Object> cuerpo = new LinkedHashMap<>();
        cuerpo.put("from", noVacio(de) ? de : remitente);
        if (noVacio(copia)) cuerpo.put("cc", List.of(copia.trim()));
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
        enviarPorSmtp(destinatario, asunto, html, qr, null);
    }

    private void enviarPorSmtp(String destinatario, String asunto, String html, byte[] qr,
                               String copia)
            throws MessagingException {

        MimeMessage mensaje = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(mensaje, true, "UTF-8");
        helper.setTo(destinatario);
        // Por SMTP el remitente lo fija la cuenta que autentica, así que solo se
        // puede agregar la copia; el "de" no se puede cambiar libremente.
        if (noVacio(copia)) helper.setCc(copia.trim());
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

    private String construirHtmlPagoPendiente(String nombre, String ruta, String fecha,
                                              String hora, String asientos, int cantidad,
                                              java.math.BigDecimal total, long minutos,
                                              String enlace) {
        String cuando = (fecha == null || fecha.isBlank()) ? "—"
                : fecha + (hora == null || hora.isBlank() ? "" : " · " + hora + " h");
        String queGuardamos = cantidad == 1 ? "tu pasaje" : "tus pasajes";
        String tiempo = minutos == 1 ? "1 minuto" : minutos + " minutos";

        return """
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background:#f4f6fb;">
            <div style="background: #1a4db5; padding: 24px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 22px;">¡Atención!</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 6px 0 0; font-size: 18px;">
                    En tu reserva hay un <strong>pago pendiente</strong>
                </p>
            </div>
            <div style="padding: 24px; background: #fff;">
                <p style="font-size:16px;">Hola <strong>%s</strong>,</p>
                <p>Vimos que empezaste a comprar tus pasajes pero el pago no llegó a completarse,
                   por lo que todavía no podemos emitir tu boleto.</p>

                <div style="background:#fff7ed; border:1px solid #fed7aa; border-radius:8px; padding:14px; margin:18px 0;">
                    <p style="margin:0; color:#9a3412; font-size:15px;">
                        Guardamos %s por <strong>%s más</strong>. Pasado ese tiempo el
                        asiento se libera y queda disponible para otra persona.
                    </p>
                </div>

                <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0;">
                    <p style="margin: 4px 0;"><strong>Ruta:</strong> %s</p>
                    <p style="margin: 4px 0;"><strong>Salida:</strong> %s</p>
                    <p style="margin: 4px 0;"><strong>Asiento(s):</strong> %s</p>
                    <p style="margin: 4px 0;"><strong>Total a pagar:</strong> S/ %s</p>
                </div>

                <div style="text-align:center; margin: 26px 0;">
                    <a href="%s" style="background:#1a4db5; color:#fff; text-decoration:none;
                       padding:14px 32px; border-radius:6px; font-weight:bold; font-size:16px;
                       display:inline-block;">Pagar mi reserva</a>
                </div>

                <p style="color:#6b7280; font-size:12px; text-align:center; word-break:break-all;">
                    Si el botón no funciona, copia este enlace en tu navegador:<br>%s
                </p>
                <p style="color:#6b7280; font-size:12px;">
                    Si ya pagaste o prefieres no continuar, puedes ignorar este mensaje.
                </p>
            </div>
            <div style="background: #f8fafc; padding: 16px; text-align: center;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                    Transportes Rayza · Requena e Iquitos, Loreto
                </p>
            </div>
        </body>
        </html>
    """.formatted(nombre == null ? "" : nombre, queGuardamos, tiempo, ruta, cuando, asientos,
                  total == null ? "0.00" : total.toPlainString(), enlace, enlace);
    }
}
