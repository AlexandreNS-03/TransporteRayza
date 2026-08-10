package com.example.demo.service;

import com.example.demo.model.Notificacion;
import com.example.demo.repository.NotificacionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Recoge los errores que revientan en el navegador de los clientes.
 *
 * Cuando la página "Mi cuenta" se rompió, nos enteramos porque alguien la probó
 * de casualidad; el cliente que se topó con la pantalla en blanco simplemente se
 * fue. Ahora el propio navegador avisa y el error aparece en Soporte, junto a los
 * reportes que manda el personal.
 *
 * El endpoint es público, así que se cuida de que no lo usen para llenar la base:
 * el mismo error no se guarda dos veces seguidas y hay un tope por minuto.
 */
@Service
public class ErroresWebService {

    /** Errores distintos aceptados por minuto en total. */
    private static final int TOPE_POR_MINUTO = 20;

    /** Un mismo error no se vuelve a guardar dentro de este rato. */
    private static final Duration REPETIDO = Duration.ofHours(6);

    private static final int MAX_LARGO = 2000;

    private final NotificacionRepository notificacionRepository;

    /** Huella de cada error ya guardado, para no repetirlo. */
    private final Map<String, LocalDateTime> vistos = new ConcurrentHashMap<>();

    private LocalDateTime ventana = LocalDateTime.now();
    private int enLaVentana = 0;

    public ErroresWebService(NotificacionRepository notificacionRepository) {
        this.notificacionRepository = notificacionRepository;
    }

    @Transactional
    public String registrar(Map<String, String> datos, String origen) {
        String mensaje = recortar(datos.get("mensaje"));
        if (mensaje == null || mensaje.isBlank()) return "Sin mensaje";

        String ruta = recortar(datos.get("ruta"));
        String huella = (mensaje + "|" + ruta).toLowerCase();

        limpiarVistos();
        if (vistos.containsKey(huella)) return "Ya registrado";
        if (!hayCupo()) return "Demasiados errores seguidos";
        vistos.put(huella, LocalDateTime.now());

        Notificacion n = new Notificacion();
        n.setId(UUID.randomUUID().toString());
        n.setTitulo("Error en la web: " + resumen(mensaje));
        n.setMensaje("""
                Página: %s
                Navegador: %s
                Origen: %s

                %s

                %s""".formatted(
                        vacioSi(ruta), vacioSi(recortar(datos.get("navegador"))), vacioSi(origen),
                        mensaje, vacioSi(recortar(datos.get("detalle")))).trim());
        n.setTipo(Notificacion.Tipo.ERROR);
        n.setModulo("SOPORTE");
        n.setLeido(false);
        n.setCreatedAt(LocalDateTime.now());
        notificacionRepository.save(n);

        System.err.println("[ErrorWeb] " + ruta + " — " + mensaje);
        return "Registrado";
    }

    /** Tope por minuto: si algo se rompe para todos, no hace falta guardarlo mil veces. */
    private synchronized boolean hayCupo() {
        LocalDateTime ahora = LocalDateTime.now();
        if (Duration.between(ventana, ahora).toMinutes() >= 1) {
            ventana = ahora;
            enLaVentana = 0;
        }
        if (enLaVentana >= TOPE_POR_MINUTO) return false;
        enLaVentana++;
        return true;
    }

    private void limpiarVistos() {
        LocalDateTime corte = LocalDateTime.now().minus(REPETIDO);
        vistos.entrySet().removeIf(e -> e.getValue().isBefore(corte));
    }

    private String recortar(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.length() > MAX_LARGO ? t.substring(0, MAX_LARGO) + "…" : t;
    }

    private String resumen(String mensaje) {
        String una = mensaje.lines().findFirst().orElse(mensaje);
        return una.length() > 90 ? una.substring(0, 90) + "…" : una;
    }

    private String vacioSi(String s) { return s == null || s.isBlank() ? "—" : s; }
}
