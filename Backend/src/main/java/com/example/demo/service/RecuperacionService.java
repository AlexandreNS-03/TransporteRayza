package com.example.demo.service;

import com.example.demo.model.Cliente;
import com.example.demo.model.TokenRecuperacion;
import com.example.demo.repository.ClienteRepository;
import com.example.demo.repository.TokenRecuperacionRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.UUID;

/**
 * "Olvidé mi contraseña" para los clientes de la web.
 *
 * Reglas que no son negociables acá:
 *
 *  - La respuesta es SIEMPRE la misma, exista o no el correo. Si dijera "ese
 *    correo no está registrado", cualquiera podría averiguar quién tiene cuenta.
 *  - En la base se guarda el hash del token, no el token. Una filtración de la
 *    tabla no debe alcanzar para entrar a las cuentas.
 *  - El enlace dura una hora y sirve una sola vez. Pedir uno nuevo apaga el
 *    anterior: un correo viejo reenviado no debe seguir funcionando.
 */
@Service
public class RecuperacionService {

    /** Una hora: suficiente para leer el correo, poco para que quede dando vueltas. */
    private static final int VALIDEZ_MINUTOS = 60;

    private static final int LARGO_MINIMO_CLAVE = 8;

    /* La misma variable que usan los demás correos (app.web.url). Con una propia
       los enlaces de recuperación habrían ignorado el valor configurado. */
    @Value("${app.web.url:https://transporterayza.com}")
    private String urlWeb;

    private final ClienteRepository clienteRepository;
    private final TokenRecuperacionRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final SecureRandom aleatorio = new SecureRandom();

    public RecuperacionService(ClienteRepository clienteRepository,
                               TokenRecuperacionRepository tokenRepository,
                               PasswordEncoder passwordEncoder,
                               EmailService emailService) {
        this.clienteRepository = clienteRepository;
        this.tokenRepository = tokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
    }

    /**
     * Manda el enlace si el correo tiene cuenta. No dice si la tenía.
     *
     * Quien pide esto no está autenticado: cualquiera puede escribir cualquier
     * correo. Por eso el resultado no cambia — el que sí es dueño lo ve en su
     * bandeja, y el que no, se queda igual que antes.
     */
    @Transactional
    public void pedirEnlace(String email) {
        if (email == null || email.isBlank()) return;
        String limpio = email.trim().toLowerCase();

        Cliente cliente = clienteRepository.findByEmail(limpio).orElse(null);
        if (cliente == null) {
            System.out.println("[Recuperación] pedido para un correo sin cuenta; no se envía nada");
            return;
        }

        tokenRepository.invalidarAnteriores(cliente.getId(), LocalDateTime.now());

        String token = generarToken();
        TokenRecuperacion t = new TokenRecuperacion();
        t.setId(UUID.randomUUID().toString());
        t.setTokenHash(hashear(token));
        t.setCuentaId(cliente.getId());
        t.setTipoCuenta(TokenRecuperacion.TipoCuenta.CLIENTE);
        t.setCreatedAt(LocalDateTime.now());
        t.setExpiraAt(LocalDateTime.now().plusMinutes(VALIDEZ_MINUTOS));
        tokenRepository.save(t);

        String enlace = urlWeb + "/restablecer?token=" + token;
        try {
            emailService.enviarEnlaceRecuperacion(cliente.getEmail(), cliente.getNombres(),
                    enlace, VALIDEZ_MINUTOS);
        } catch (Exception e) {
            // No se le cuenta al que pidió: enterarse de que el envío falló ya
            // revelaría que la cuenta existe.
            System.err.println("[Recuperación] no se pudo enviar el correo: " + e.getMessage());
        }
    }

    /** Cambia la contraseña si el enlace sirve. Lo quema apenas se usa. */
    @Transactional
    public void restablecer(String token, String nuevaClave) {
        if (token == null || token.isBlank())
            throw new RuntimeException("El enlace no es válido. Pide uno nuevo.");

        if (nuevaClave == null || nuevaClave.length() < LARGO_MINIMO_CLAVE)
            throw new RuntimeException("La contraseña debe tener al menos "
                    + LARGO_MINIMO_CLAVE + " caracteres.");

        TokenRecuperacion t = tokenRepository.findByTokenHash(hashear(token)).orElse(null);
        if (t == null || !t.estaVigente())
            throw new RuntimeException("Este enlace ya venció o se usó. Pide uno nuevo.");

        Cliente cliente = clienteRepository.findById(t.getCuentaId())
                .orElseThrow(() -> new RuntimeException("La cuenta ya no existe"));

        cliente.setPassword(passwordEncoder.encode(nuevaClave));
        clienteRepository.save(cliente);

        // Se quema antes de terminar: si dos pestañas envían a la vez, la segunda
        // ya no encuentra el token vigente.
        t.setUsadoAt(LocalDateTime.now());
        tokenRepository.save(t);

        try {
            emailService.enviarAvisoClaveCambiada(cliente.getEmail(), cliente.getNombres());
        } catch (Exception e) {
            System.err.println("[Recuperación] no se pudo avisar el cambio: " + e.getMessage());
        }
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
