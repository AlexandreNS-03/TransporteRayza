package com.example.demo.service;

import com.example.demo.model.Cliente;
import com.example.demo.model.VerificacionEmail;
import com.example.demo.repository.ClienteRepository;
import com.example.demo.repository.VerificacionEmailRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.UUID;

/**
 * Comprobar que el correo de la cuenta es de quien dice.
 *
 * <p>Hasta ahora cualquiera podía registrarse con el correo de otro. Eso no
 * robaba la cuenta ajena, pero sí: le llenaba la bandeja de boletos que no
 * compró, y dejaba al dueño real sin poder registrarse con su propio correo.
 *
 * <p>Del token se guarda el hash, nunca el token. Vive una hora y sirve una vez.
 * Y tiene tabla aparte de la de recuperar contraseña a propósito: un enlace
 * para confirmar un correo no puede terminar sirviendo para cambiar una clave.
 */
@Service
public class VerificacionEmailService {

    private static final int VALIDEZ_MINUTOS = 60;

    /** Entre un envío y el siguiente, para no ser una máquina de mandar correos. */
    private static final int ESPERA_ENTRE_ENVIOS_MINUTOS = 2;

    private final ClienteRepository clienteRepository;
    private final VerificacionEmailRepository repositorio;
    private final EmailService emailService;
    private final SecureRandom aleatorio = new SecureRandom();

    /* La misma variable que usan los demás correos (app.web.url): con una propia,
       estos enlaces habrían apuntado a otro lado que los de recuperación. */
    @Value("${app.web.url:https://transporterayza.com}")
    private String urlWeb;

    public VerificacionEmailService(ClienteRepository clienteRepository,
                                    VerificacionEmailRepository repositorio,
                                    EmailService emailService) {
        this.clienteRepository = clienteRepository;
        this.repositorio = repositorio;
        this.emailService = emailService;
    }

    /**
     * Manda el enlace. Se llama al registrarse y cuando el cliente lo pide otra
     * vez desde su cuenta.
     *
     * <p>No revienta si el correo no sale: alguien que acaba de registrarse no
     * tiene por qué quedarse sin cuenta porque el servidor de correo esté
     * caído. Puede volver a pedirlo desde su cuenta.
     */
    @Transactional
    public void enviarEnlace(Cliente cliente) {
        if (cliente == null || cliente.getEmail() == null || cliente.getEmail().isBlank()) return;
        if (cliente.tieneCorreoVerificado()) return;

        if (repositorio.pedidoReciente(cliente.getId(),
                LocalDateTime.now().minusMinutes(ESPERA_ENTRE_ENVIOS_MINUTOS))) {
            System.out.println("[Verificación] ya se envió un enlace hace menos de "
                    + ESPERA_ENTRE_ENVIOS_MINUTOS + " minutos; no se repite");
            return;
        }

        repositorio.invalidarAnteriores(cliente.getId(), LocalDateTime.now());

        String token = generarToken();
        VerificacionEmail v = new VerificacionEmail();
        v.setId(UUID.randomUUID().toString());
        v.setTokenHash(hashear(token));
        v.setClienteId(cliente.getId());
        v.setEmail(cliente.getEmail());
        v.setCreatedAt(LocalDateTime.now());
        v.setExpiraAt(LocalDateTime.now().plusMinutes(VALIDEZ_MINUTOS));
        repositorio.save(v);

        String enlace = urlWeb + "/verificar-correo?token=" + token;
        try {
            emailService.enviarEnlaceVerificacion(cliente.getEmail(), cliente.getNombres(),
                    enlace, VALIDEZ_MINUTOS);
        } catch (Exception e) {
            System.err.println("[Verificación] no se pudo enviar el correo: " + e.getMessage());
        }
    }

    /** Lo pide el cliente desde su cuenta. */
    @Transactional
    public void reenviar(String email) {
        Cliente c = clienteRepository.findByEmail(email == null ? "" : email.trim().toLowerCase())
                .orElseThrow(() -> new RuntimeException("Cuenta no encontrada"));
        if (c.tieneCorreoVerificado())
            throw new RuntimeException("Tu correo ya está verificado");
        enviarEnlace(c);
    }

    /**
     * Confirma el correo con el token del enlace.
     *
     * <p>Es público: quien hace clic viene desde su bandeja, sin sesión abierta.
     * La única llave es el token, por eso vence y se quema al usarlo.
     */
    @Transactional
    public String confirmar(String token) {
        if (token == null || token.isBlank())
            throw new RuntimeException("Falta el enlace de verificación");

        VerificacionEmail v = repositorio.findByTokenHash(hashear(token)).orElse(null);
        if (v == null || !v.estaVigente(LocalDateTime.now()))
            throw new RuntimeException("Este enlace ya venció o se usó. Pide uno nuevo desde tu cuenta.");

        Cliente c = clienteRepository.findById(v.getClienteId())
                .orElseThrow(() -> new RuntimeException("La cuenta ya no existe"));

        // Si el cliente cambió de correo entre que se mandó el enlace y que lo
        // abrió, este enlace ya no comprueba nada.
        if (c.getEmail() == null || !c.getEmail().equalsIgnoreCase(v.getEmail()))
            throw new RuntimeException("Este enlace era para otro correo. Pide uno nuevo desde tu cuenta.");

        c.setEmailVerificadoAt(LocalDateTime.now());
        clienteRepository.save(c);

        v.setUsadoAt(LocalDateTime.now());
        repositorio.save(v);

        return c.getEmail();
    }

    /** 32 bytes de azar: no se adivina ni se recorre a la fuerza. */
    private String generarToken() {
        byte[] bytes = new byte[32];
        aleatorio.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    static String hashear(String token) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] h = md.digest(token.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(h.length * 2);
            for (byte b : h) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            throw new IllegalStateException("No se pudo procesar el token", e);
        }
    }
}
