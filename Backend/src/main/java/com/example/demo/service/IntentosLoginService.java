package com.example.demo.service;

import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

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

    private static class Registro {
        int fallos;
        int bloqueos;
        LocalDateTime ultimoFallo;
        LocalDateTime bloqueadoHasta;
    }

    private final Map<String, Registro> registros = new ConcurrentHashMap<>();
    private final AuditoriaService auditoriaService;

    public IntentosLoginService(AuditoriaService auditoriaService) {
        this.auditoriaService = auditoriaService;
    }

    /**
     * Se llama antes de comprobar la contraseña. Si la llave está bloqueada, lanza el
     * error con los minutos que faltan.
     */
    public void verificar(String usuario, String ip) {
        limpiarViejos();
        revisar("usuario:" + normalizar(usuario));
        revisar("ip:" + normalizar(ip));
    }

    /**
     * Igual, pero para el login de la web pública: la cuenta se bloquea al
     * quinto fallo y la dirección aguanta mucho más. Ver TOLERANCIA_IP_PUBLICA.
     */
    public void verificarPublico(String usuario, String ip) {
        limpiarViejos();
        revisar("usuario:" + normalizar(usuario));
        revisar("ip-publica:" + normalizar(ip));
    }

    private void revisar(String llave) {
        Registro r = registros.get(llave);
        if (r == null || r.bloqueadoHasta == null) return;
        if (LocalDateTime.now().isAfter(r.bloqueadoHasta)) {
            r.bloqueadoHasta = null;
            r.fallos = 0;
            return;
        }
        long minutos = Math.max(1, Duration.between(LocalDateTime.now(), r.bloqueadoHasta).toMinutes() + 1);
        throw new RuntimeException("Demasiados intentos fallidos. Vuelve a intentarlo en "
                + minutos + " minuto(s).");
    }

    /** Contraseña equivocada: suma y, si se pasó, bloquea. */
    public void registrarFallo(String usuario, String ip) {
        sumar("usuario:" + normalizar(usuario), "el usuario \"" + usuario + "\"", TOLERANCIA);
        sumar("ip:" + normalizar(ip), "la dirección " + ip, TOLERANCIA);
    }

    /** Lo mismo para la web pública, donde la dirección aguanta más. */
    public void registrarFalloPublico(String usuario, String ip) {
        sumar("usuario:" + normalizar(usuario), "la cuenta \"" + usuario + "\"", TOLERANCIA);
        sumar("ip-publica:" + normalizar(ip), "la dirección " + ip, TOLERANCIA_IP_PUBLICA);
    }

    public void registrarExitoPublico(String usuario, String ip) {
        registros.remove("usuario:" + normalizar(usuario));
        registros.remove("ip-publica:" + normalizar(ip));
    }

    private void sumar(String llave, String descripcion, int tolerancia) {
        Registro r = registros.computeIfAbsent(llave, k -> new Registro());
        synchronized (r) {
            r.fallos++;
            r.ultimoFallo = LocalDateTime.now();
            if (r.fallos < tolerancia) return;

            int minutos = MINUTOS_BLOQUEO[Math.min(r.bloqueos, MINUTOS_BLOQUEO.length - 1)];
            r.bloqueos++;
            r.fallos = 0;
            r.bloqueadoHasta = LocalDateTime.now().plusMinutes(minutos);

            // Queda en auditoría: si alguien está atacando, se ve.
            try {
                auditoriaService.registrar("BLOQUEO_LOGIN", "SEGURIDAD", null,
                        "Bloqueado por " + minutos + " minuto(s) tras " + tolerancia
                                + " intentos fallidos para " + descripcion);
            } catch (Exception ignorado) { /* el bloqueo vale igual aunque falle el registro */ }
        }
    }

    /** Entró bien: se borra lo acumulado para que no arrastre bloqueos. */
    public void registrarExito(String usuario, String ip) {
        registros.remove("usuario:" + normalizar(usuario));
        registros.remove("ip:" + normalizar(ip));
    }

    /** Saca de memoria lo que ya no sirve, para que el mapa no crezca sin límite. */
    private void limpiarViejos() {
        LocalDateTime corte = LocalDateTime.now().minus(MEMORIA);
        registros.entrySet().removeIf(e -> {
            Registro r = e.getValue();
            boolean bloqueoVigente = r.bloqueadoHasta != null && r.bloqueadoHasta.isAfter(LocalDateTime.now());
            boolean falloReciente = r.ultimoFallo != null && r.ultimoFallo.isAfter(corte);
            return !bloqueoVigente && !falloReciente;
        });
    }

    private String normalizar(String s) {
        return s == null ? "?" : s.trim().toLowerCase();
    }
}
