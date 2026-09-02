package com.example.demo.service;

import com.example.demo.model.CuponSorteo;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * El sorteo en vivo: lo que ven quienes están mirando la página.
 *
 * Va por SSE y no por WebSocket a propósito. Acá todo fluye en una sola
 * dirección —del servidor a quien mira— y para eso SSE alcanza: el navegador se
 * reconecta solo si se cae la señal, no hace falta ninguna librería, y funciona
 * sobre HTTP normal. WebSocket sería más piezas para el mismo resultado.
 *
 * Las conexiones viven en memoria. Si el servidor se reinicia se cortan, y cada
 * navegador vuelve a conectarse solo; por eso el estado del sorteo se lee de la
 * base al conectar y no se depende de lo que se haya emitido antes.
 */
@Service
public class SorteoVivoService {

    /** Media hora: una transmisión de sorteo no dura más que eso. */
    private static final long TIMEOUT_MS = 30 * 60 * 1000L;

    private final CopyOnWriteArrayList<Conexion> conexiones = new CopyOnWriteArrayList<>();

    private record Conexion(String sorteoId, SseEmitter emitter) { }

    /** Abre la conexión de quien entra a mirar. */
    public SseEmitter conectar(String sorteoId) {
        SseEmitter emitter = new SseEmitter(TIMEOUT_MS);
        Conexion c = new Conexion(sorteoId, emitter);
        conexiones.add(c);

        // Sin limpiar, cada visita dejaría una conexión muerta acumulándose.
        emitter.onCompletion(() -> conexiones.remove(c));
        emitter.onTimeout(() -> { conexiones.remove(c); emitter.complete(); });
        emitter.onError(e -> conexiones.remove(c));

        // Un primer evento inmediato: sin esto algunos proxies mantienen la
        // respuesta en buffer y el navegador cree que no conectó.
        enviar(c, "conectado", Map.of("sorteoId", sorteoId));
        return emitter;
    }

    /**
     * Alguien acaba de registrar su código.
     *
     * Va el nombre recortado además del total: la página muestra quién se va
     * sumando, y un contador solo no dice nada de que hay gente real detrás.
     */
    public void avisarNuevoParticipante(String sorteoId, int total, CuponSorteo cupon) {
        difundir(sorteoId, "participante", Map.of(
                "participantes", total,
                "codigo", cupon.getCodigo(),
                "nombre", nombreCorto(cupon.getPasajeroNombre()),
                "vip", cupon.getPeso() != null && cupon.getPeso() > 1));
    }

    /**
     * El ganador, para todos a la vez.
     *
     * Va el nombre recortado y nunca el documento ni el correo: esto lo ve
     * cualquiera que abra la página.
     */
    public void avisarGanador(String sorteoId, CuponSorteo ganador, int participantes,
                              com.example.demo.model.PremioSorteo premio, boolean quedanPremios) {
        java.util.Map<String, Object> datos = new java.util.HashMap<>();
        datos.put("codigo", ganador.getCodigo());
        datos.put("nombre", nombreCorto(ganador.getPasajeroNombre()));
        datos.put("participantes", participantes);
        // De qué premio se trata: la página lo anuncia con el nombre del premio
        // y, si falta alguno, deja la rueda lista para el siguiente giro.
        datos.put("premio", premio.getDescripcion());
        datos.put("premioOrden", premio.getOrden());
        datos.put("quedanPremios", quedanPremios);
        difundir(sorteoId, "ganador", datos);
    }

    private void difundir(String sorteoId, String evento, Object datos) {
        for (Conexion c : List.copyOf(conexiones))
            if (c.sorteoId().equals(sorteoId)) enviar(c, evento, datos);
    }

    private void enviar(Conexion c, String evento, Object datos) {
        try {
            c.emitter().send(SseEmitter.event().name(evento).data(datos));
        } catch (IOException | IllegalStateException e) {
            // El navegador se fue: se descarta la conexión sin ruido. Que alguien
            // cierre la pestaña no es un error que valga la pena registrar.
            conexiones.remove(c);
        }
    }

    /**
     * "JUAN P." — se anuncia en público y el apellido completo es un dato de más.
     */
    public static String nombreCorto(String completo) {
        if (completo == null || completo.isBlank()) return "Participante";
        String[] partes = completo.trim().replaceAll("\\s+", " ").split(" ");
        if (partes.length == 1) return partes[0];
        return partes[0] + " " + partes[1].charAt(0) + ".";
    }

    /** Cuántos están mirando ahora. Para la pantalla del panel. */
    public long viendo(String sorteoId) {
        return conexiones.stream().filter(c -> c.sorteoId().equals(sorteoId)).count();
    }
}
