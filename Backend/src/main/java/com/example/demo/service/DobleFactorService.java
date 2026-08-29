package com.example.demo.service;

import com.example.demo.model.CodigoVerificacion;
import com.example.demo.model.Usuario;
import com.example.demo.repository.CodigoVerificacionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Segundo factor por correo para el personal.
 *
 * La contraseña sola alcanza para que alguien que la vio de reojo entre a caja,
 * anule ventas o saque plata. El código pide, además, acceso al correo.
 *
 * No es tan fuerte como una app tipo Authenticator —quien controle el correo
 * pasa igual— pero no obliga a instalar nada, y en un equipo repartido entre
 * Iquitos y Requena eso es la diferencia entre usarlo y no usarlo.
 */
@Service
public class DobleFactorService {

    /** Suficiente para abrir el correo, poco para dejarlo dando vueltas. */
    private static final int VALIDEZ_MINUTOS = 10;

    private final CodigoVerificacionRepository repositorio;
    private final EmailService emailService;
    private final IntentoCodigoService intentoCodigoService;
    private final SecureRandom aleatorio = new SecureRandom();

    public DobleFactorService(CodigoVerificacionRepository repositorio, EmailService emailService,
                              IntentoCodigoService intentoCodigoService) {
        this.repositorio = repositorio;
        this.emailService = emailService;
        this.intentoCodigoService = intentoCodigoService;
    }

    /**
     * Crea el código, lo manda por correo y devuelve el id del desafío.
     *
     * El id del desafío no sirve de nada por sí solo: sin el código del correo no
     * abre nada, así que puede viajar al navegador sin problema.
     */
    @Transactional
    public String iniciar(Usuario usuario) {
        if (usuario.getEmail() == null || usuario.getEmail().isBlank())
            throw new RuntimeException("Tu usuario no tiene correo registrado. "
                    + "Pídele a un administrador que lo agregue o que desactive la verificación.");

        repositorio.invalidarAnteriores(usuario.getId(), LocalDateTime.now());

        String codigo = generarCodigo();
        CodigoVerificacion c = new CodigoVerificacion();
        c.setId(UUID.randomUUID().toString());
        c.setUsuarioId(usuario.getId());
        c.setCodigoHash(RecuperacionService.hashear(codigo));
        c.setCreatedAt(LocalDateTime.now());
        c.setExpiraAt(LocalDateTime.now().plusMinutes(VALIDEZ_MINUTOS));
        c.setIntentos(0);
        repositorio.save(c);

        try {
            emailService.enviarCodigoVerificacion(usuario.getEmail(), usuario.getNombre(),
                    codigo, VALIDEZ_MINUTOS);
        } catch (Exception e) {
            // Si el correo no sale, el código es inalcanzable: mejor decirlo que
            // dejar a la persona esperando algo que no va a llegar.
            System.err.println("[2FA] no se pudo enviar el código: " + e.getMessage());
            throw new RuntimeException("No pudimos enviarte el código. Intenta de nuevo en un momento.");
        }

        return c.getId();
    }

    /**
     * Comprueba el código. Devuelve el id del usuario si es correcto.
     *
     * Cada fallo suma un intento y al quinto el código queda muerto: seis dígitos
     * se prueban todos por la fuerza en poco tiempo si nadie lo frena.
     */
    @Transactional
    public String verificar(String desafioId, String codigo) {
        if (desafioId == null || codigo == null)
            throw new RuntimeException("Escribe el código que te llegó al correo.");

        CodigoVerificacion c = repositorio.findById(desafioId).orElse(null);
        // Mismo mensaje si no existe, venció o se agotó: no hay nada que ganar
        // distinguiéndolos y sí algo que perder.
        if (c == null || !c.estaVigente())
            throw new RuntimeException("El código venció o ya no es válido. Vuelve a iniciar sesión.");

        if (!RecuperacionService.hashear(codigo.trim()).equals(c.getCodigoHash())) {
            // En su propia transacción: la excepción de abajo hace rollback de esta,
            // y con el incremento adentro el contador nunca subía —el código se
            // podía probar sin límite—.
            int usados = intentoCodigoService.registrarFallo(c.getId());
            int quedan = CodigoVerificacion.MAX_INTENTOS - usados;
            throw new RuntimeException(quedan > 0
                    ? "Código incorrecto. Te " + (quedan == 1 ? "queda 1 intento." : "quedan " + quedan + " intentos.")
                    : "Demasiados intentos. Vuelve a iniciar sesión para pedir otro código.");
        }

        c.setUsadoAt(LocalDateTime.now());
        repositorio.save(c);
        return c.getUsuarioId();
    }

    /** Seis dígitos, con ceros a la izquierda si toca. */
    private String generarCodigo() {
        return String.format("%06d", aleatorio.nextInt(1_000_000));
    }
}
