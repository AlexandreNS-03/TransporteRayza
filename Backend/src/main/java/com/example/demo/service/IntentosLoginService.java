package com.example.demo.service;

import com.example.demo.model.IntentoLogin;
import com.example.demo.repository.IntentoLoginRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;

/**
 * Freno a los intentos de adivinar contraseñas.
 *
 * Sin esto, cualquiera puede probar contraseñas contra /auth/login todas las veces
 * que quiera hasta acertar: es el ataque más común y el más barato de hacer.
 *
 * Se cuenta por usuario y por dirección de internet a la vez, porque cada uno tapa
 * un agujero distinto:
 *   - por usuario: alguien probando mil contraseñas contra "admin";
 *   - por dirección: alguien probando la misma contraseña contra muchos usuarios.
 *
 * El bloqueo va creciendo (5, 15 y 30 minutos) para no castigar de más al empleado
 * que simplemente se equivocó dos veces, y sí frenar al que insiste.
 *
 * <p><strong>La cuenta vive en la base y no en memoria.</strong> En memoria tenía
 * dos agujeros que no se ven leyendo el código: cada despliegue de Railway
 * reiniciaba los contadores —y a quien prueba contraseñas le alcanza con esperar
 * al próximo—, y el día que haya dos instancias cada una contaría por su lado,
 * así que la tolerancia real sería el doble de la que dice acá.
 */
@Service
public class IntentosLoginService {

    /** Intentos fallidos permitidos antes de bloquear una cuenta. */
    private static final int TOLERANCIA = 5;

    /**
     * Lo mismo, pero por dirección de internet, y solo para la web pública.
     *
     * En el panel los cinco alcanzan: son cuatro personas en dos oficinas. En
     * la web no: buena parte de Loreto entra por datos móviles, y ahí mucha
     * gente distinta sale por la misma dirección. Con cinco, bastaría que cinco
     * clientes se equivocaran de contraseña en media hora para dejar sin
     * comprar a todos los que estén detrás de esa antena.
     *
     * Por cuenta se mantiene en cinco, que es donde de verdad importa: quien
     * ataca una cuenta ataca un correo concreto.
     */
    private static final int TOLERANCIA_IP_PUBLICA = 30;

    /** Cuánto dura el bloqueo según cuántas veces ya se bloqueó. */
    private static final int[] MINUTOS_BLOQUEO = { 5, 15, 30 };

    /** Los fallos sueltos se olvidan solos: equivocarse el lunes y el viernes no suma. */
    private static final Duration MEMORIA = Duration.ofMinutes(30);

    private final IntentoLoginRepository repositorio;
    private final AuditoriaService auditoriaService;

    public IntentosLoginService(IntentoLoginRepository repositorio,
                                AuditoriaService auditoriaService) {
        this.repositorio = repositorio;
        this.auditoriaService = auditoriaService;
    }

    /**
     * Se llama antes de comprobar la contraseña. Si la llave está bloqueada, lanza el
     * error con los minutos que faltan.
     */
    public void verificar(String usuario, String ip) {
        revisar("usuario:" + normalizar(usuario));
        revisar("ip:" + normalizar(ip));
    }

    /**
     * Igual, pero para el login de la web pública: la cuenta se bloquea al
     * quinto fallo y la dirección aguanta mucho más. Ver TOLERANCIA_IP_PUBLICA.
     */
    public void verificarPublico(String usuario, String ip) {
        revisar("usuario:" + normalizar(usuario));
        revisar("ip-publica:" + normalizar(ip));
    }

    private void revisar(String llave) {
        IntentoLogin r = repositorio.findById(llave).orElse(null);
        if (r == null || r.getBloqueadoHasta() == null) return;

        // El bloqueo vencido no se borra acá: borrar en cada intento sería
        // escribir en la base en cada login. Lo saca la limpieza programada, y
        // mientras tanto la fecha pasada ya no frena a nadie.
        if (LocalDateTime.now().isAfter(r.getBloqueadoHasta())) return;

        long minutos = Math.max(1,
                Duration.between(LocalDateTime.now(), r.getBloqueadoHasta()).toMinutes() + 1);
        throw new RuntimeException("Demasiados intentos fallidos. Vuelve a intentarlo en "
                + minutos + " minuto(s).");
    }

    /** Contraseña equivocada: suma y, si se pasó, bloquea. */
    @Transactional
    public void registrarFallo(String usuario, String ip) {
        sumar("usuario:" + normalizar(usuario), "el usuario \"" + usuario + "\"", TOLERANCIA);
        sumar("ip:" + normalizar(ip), "la dirección " + ip, TOLERANCIA);
    }

    /** Lo mismo para la web pública, donde la dirección aguanta más. */
    @Transactional
    public void registrarFalloPublico(String usuario, String ip) {
        sumar("usuario:" + normalizar(usuario), "la cuenta \"" + usuario + "\"", TOLERANCIA);
        sumar("ip-publica:" + normalizar(ip), "la dirección " + ip, TOLERANCIA_IP_PUBLICA);
    }

    @Transactional
    public void registrarExitoPublico(String usuario, String ip) {
        repositorio.deleteById("usuario:" + normalizar(usuario));
        repositorio.deleteById("ip-publica:" + normalizar(ip));
    }

    /* Sin @Transactional: lo llama registrarFallo desde esta misma clase, y una
       llamada interna no pasa por la envoltura de Spring, así que la anotación
       acá no haría nada. La transacción se abre en los métodos públicos. */
    private void sumar(String llave, String descripcion, int tolerancia) {
        LocalDateTime ahora = LocalDateTime.now();

        // Sumar sin leer antes: leer, sumar y guardar pierde cuentas cuando
        // entran dos intentos a la vez, y perder cuentas es justo lo que busca
        // quien está probando contraseñas.
        if (repositorio.sumarFallo(llave, ahora) == 0) {
            IntentoLogin nuevo = new IntentoLogin();
            nuevo.setLlave(llave);
            nuevo.setFallos(1);
            nuevo.setUltimoFallo(ahora);
            try {
                repositorio.saveAndFlush(nuevo);
            } catch (DataIntegrityViolationException e) {
                // Otro intento creó la fila en el medio: entonces alcanza con sumarle.
                repositorio.sumarFallo(llave, ahora);
            }
        }

        IntentoLogin r = repositorio.findById(llave).orElse(null);
        if (r == null || r.getFallos() < tolerancia) return;

        int minutos = MINUTOS_BLOQUEO[Math.min(r.getBloqueos(), MINUTOS_BLOQUEO.length - 1)];

        // La condición sobre los fallos hace que, si dos intentos llegan juntos
        // al límite, solo uno bloquee; el otro no cambia nada.
        if (repositorio.bloquearSiCorresponde(llave, ahora.plusMinutes(minutos), tolerancia) == 0)
            return;

        // Queda en auditoría: si alguien está atacando, se ve.
        try {
            auditoriaService.registrar("BLOQUEO_LOGIN", "SEGURIDAD", null,
                    "Bloqueado por " + minutos + " minuto(s) tras " + tolerancia
                            + " intentos fallidos para " + descripcion);
        } catch (Exception ignorado) { /* el bloqueo vale igual aunque falle el registro */ }
    }

    /** Entró bien: se borra lo acumulado para que no arrastre bloqueos. */
    @Transactional
    public void registrarExito(String usuario, String ip) {
        repositorio.deleteById("usuario:" + normalizar(usuario));
        repositorio.deleteById("ip:" + normalizar(ip));
    }

    /**
     * Saca lo que ya no sirve, para que la tabla no crezca sin límite.
     *
     * <p>Va programada y no en cada intento: limpiar en cada login sería
     * escribir en la base cada vez que alguien entra, y lo que se borra no
     * cambia ninguna decisión —un bloqueo vencido ya no frena a nadie—.
     */
    @Scheduled(fixedDelay = 10 * 60 * 1000, initialDelay = 60 * 1000)
    @Transactional
    public void limpiarViejos() {
        LocalDateTime ahora = LocalDateTime.now();
        repositorio.limpiar(ahora, ahora.minus(MEMORIA));
    }

    private String normalizar(String s) {
        return s == null ? "?" : s.trim().toLowerCase();
    }
}
