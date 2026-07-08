package com.example.demo.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void enviarComprobante(String destinatario, String nombrePasajero,
                                  String serieNumero, String rutaNombre,
                                  String fechaSalida, String asiento,
                                  String precio, String codigoQr) throws MessagingException {

        MimeMessage mensaje = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(mensaje, true, "UTF-8");

        helper.setTo(destinatario);
        helper.setSubject("Tu comprobante de viaje - Transportes Rayza");
        helper.setText(construirHtml(nombrePasajero, serieNumero, rutaNombre,
                fechaSalida, asiento, precio), true);

        // Generar y adjuntar el QR como imagen inline
        try {
            byte[] qrBytes = generarQrComoBytes(codigoQr);
            helper.addInline("qrcode", new ByteArrayResource(qrBytes), "image/png");
        } catch (WriterException | IOException e) {
            throw new MessagingException("Error al generar el código QR: " + e.getMessage());
        }

        mailSender.send(mensaje);
    }

    public void enviarConfirmacionEmbarque(String destinatario, String nombrePasajero,
                                           String rutaNombre, String asiento,
                                           String horaEmbarque) throws MessagingException {

        MimeMessage mensaje = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(mensaje, true, "UTF-8");

        helper.setTo(destinatario);
        helper.setSubject("Embarque confirmado - Transportes Rayza");
        helper.setText(construirHtmlEmbarque(nombrePasajero, rutaNombre, asiento, horaEmbarque), true);

        mailSender.send(mensaje);
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
}