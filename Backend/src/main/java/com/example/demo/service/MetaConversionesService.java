package com.example.demo.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Le cuenta la compra a Meta <strong>desde el servidor</strong> (Conversions API).
 *
 * <p><strong>Por qué existe:</strong> el píxel del navegador pierde cerca de un
 * tercio de los eventos —iOS los corta, los bloqueadores los bloquean, una
 * pestaña que se cierra antes de tiempo se los lleva—. El servidor, en cambio,
 * sabe con certeza que la venta se cobró. Sin esto, las campañas se optimizan
 * con un tercio menos de datos y el costo por venta que muestra Meta no se
 * parece al de la caja.
 *
 * <p><strong>Los dos eventos no se suman:</strong> el navegador y el servidor
 * mandan la MISMA compra con el mismo {@code event_id}, y Meta se queda con una.
 * Ese id lo decide este servidor y viaja en la confirmación para que el
 * navegador use exactamente el mismo; adivinarlo desde los dos lados es cómo se
 * terminan contando las ventas dos veces. Por eso, cuando esto está apagado, la
 * confirmación va sin id y el navegador manda su evento sin deduplicar: es el
 * único que hay.
 *
 * <p><strong>No se manda ningún dato personal.</strong> Ni correo, ni documento,
 * ni nombre, ni teléfono, ni en forma de hash. Viajan la IP y el navegador del
 * comprador —lo mismo que el píxel ya transmite desde el navegador— más qué
 * ruta y cuánto. El "emparejamiento avanzado", que mejora la atribución a cambio
 * de darle a Meta la identidad de cada comprador, es una decisión de privacidad
 * que nadie tomó todavía: ver {@link #CON_IDENTIDAD}.
 *
 * <p>Apagado mientras no haya token, igual que el resto de las integraciones.
 */
@Service
public class MetaConversionesService {

    /**
     * Marcador de la decisión pendiente, no una opción encendible.
     *
     * <p>Meta empata mejor el evento del servidor con una persona si le mandamos
     * el correo o el teléfono en SHA-256. Mejora la atribución y <em>no</em> es
     * gratis: Meta recibe un identificador estable de cada uno de los clientes.
     * Mientras no haya una decisión explícita, la respuesta es no.
     */
    static final boolean CON_IDENTIDAD = false;

    @Value("${meta.capi.enabled:false}")
    private boolean habilitada;

    /** El id del píxel. Es público: viaja en el HTML de cada página. */
    @Value("${meta.capi.pixel-id:}")
    private String pixelId;

    /**
     * El token. <strong>Esto sí es una clave</strong> y nunca puede salir de acá:
     * ni al navegador, ni a un log, ni a un mensaje de error. Por eso viaja en el
     * cuerpo del pedido y no en la URL — una excepción de red imprime la URL.
     */
    @Value("${meta.capi.access-token:}")
    private String accessToken;

    /**
     * Código de prueba de Meta. Con él, los eventos aparecen en "Probar eventos"
     * del Administrador y <strong>no</strong> entran en los informes ni en las
     * campañas. Es lo que permite comprobar esto sin ensuciar la cuenta.
     */
    @Value("${meta.capi.test-code:}")
    private String codigoDePrueba;

    @Value("${meta.capi.endpoint:https://graph.facebook.com/v21.0}")
    private String endpoint;

    /** De dónde dice que viene la compra. Meta lo usa para agrupar. */
    @Value("${meta.capi.origen-url:https://transporterayza.com/comprar}")
    private String origenUrl;

    private final RestTemplate http = new RestTemplate();

    /** ¿Hay con qué mandar? Sin esto, la confirmación va sin id de evento. */
    public boolean estaHabilitada() {
        return habilitada && !pixelId.isBlank() && !accessToken.isBlank();
    }

    /**
     * El id que identifica esta compra como UN evento.
     *
     * <p>Se deriva del grupo de la compra y no de un azar: si se reintenta el
     * aviso, tiene que caer el mismo id o Meta cuenta dos ventas. Una compra de
     * cuatro pasajes es una sola venta para una campaña.
     */
    public String idDeEvento(String grupoVentaId, String ventaId) {
        String base = (grupoVentaId != null && !grupoVentaId.isBlank()) ? grupoVentaId : ventaId;
        return base == null ? null : "compra-" + base;
    }

    /**
     * Avisa la compra.
     *
     * <p><strong>Nunca lanza.</strong> Llega después de que la plata entró y el
     * asiento quedó confirmado: que Meta esté caído no puede romper una venta ni
     * demorar el boleto del pasajero. Si falla, se pierde un evento de medición
     * y nada más.
     */
    public void avisarCompra(String eventoId, BigDecimal total, int pasajes, String ruta) {
        if (!estaHabilitada() || eventoId == null) return;
        try {
            http.postForEntity(endpoint + "/" + pixelId + "/events",
                    new HttpEntity<>(cuerpo(eventoId, total, pasajes, ruta), cabeceras()),
                    String.class);
        } catch (Exception e) {
            // Sin `e` entero y sin la URL: el token va en el cuerpo, pero un
            // mensaje de red puede arrastrar lo que le pasen. Solo la clase y el
            // id, que es lo único que sirve para rastrear el evento perdido.
            System.err.println("[MetaCAPI] No se pudo avisar la compra " + eventoId
                    + " (" + e.getClass().getSimpleName() + ")");
        }
    }

    private HttpHeaders cabeceras() {
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_JSON);
        return h;
    }

    private Map<String, Object> cuerpo(String eventoId, BigDecimal total, int pasajes, String ruta) {
        Map<String, Object> evento = new LinkedHashMap<>();
        evento.put("event_name", "Purchase");
        evento.put("event_time", Instant.now().getEpochSecond());
        // El mismo id que manda el navegador: así Meta se queda con una sola.
        evento.put("event_id", eventoId);
        evento.put("event_source_url", origenUrl);
        evento.put("action_source", "website");
        evento.put("user_data", datosDelComprador());

        Map<String, Object> custom = new LinkedHashMap<>();
        custom.put("currency", "PEN");
        custom.put("value", total == null ? 0 : total);
        custom.put("num_items", pasajes);
        if (ruta != null && !ruta.isBlank()) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", ruta);
            item.put("quantity", pasajes);
            custom.put("contents", List.of(item));
            custom.put("content_type", "product");
        }
        evento.put("custom_data", custom);

        Map<String, Object> cuerpo = new LinkedHashMap<>();
        cuerpo.put("data", List.of(evento));
        // En el cuerpo y no en la URL: una excepción de red imprime la URL.
        cuerpo.put("access_token", accessToken);
        if (!codigoDePrueba.isBlank()) cuerpo.put("test_event_code", codigoDePrueba);
        return cuerpo;
    }

    /**
     * Quién compró, sin decir quién es.
     *
     * <p>Meta exige al menos un dato del comprador. Van la IP y el navegador, que
     * es exactamente lo que el píxel ya le manda desde el navegador: esto no le
     * da nada que no tuviera. Ningún correo, documento ni nombre, ni en hash.
     */
    private Map<String, Object> datosDelComprador() {
        Map<String, Object> u = new LinkedHashMap<>();
        String ip = ipDeQuienPide();
        if (ip != null) u.put("client_ip_address", ip);
        String agente = cabeceraDeLaPeticion("User-Agent");
        if (agente != null) u.put("client_user_agent", agente);
        return u;
    }

    /**
     * La IP real del comprador. En Railway la petición llega por un proxy, así
     * que sin `X-Forwarded-For` todas las compras saldrían desde la misma IP y
     * Meta no empataría ninguna.
     */
    private String ipDeQuienPide() {
        String reenviada = cabeceraDeLaPeticion("X-Forwarded-For");
        if (reenviada != null && !reenviada.isBlank()) return reenviada.split(",")[0].trim();
        try {
            var attrs = (org.springframework.web.context.request.ServletRequestAttributes)
                    org.springframework.web.context.request.RequestContextHolder.getRequestAttributes();
            return attrs == null ? null : attrs.getRequest().getRemoteAddr();
        } catch (Exception e) {
            return null;
        }
    }

    private String cabeceraDeLaPeticion(String nombre) {
        try {
            var attrs = (org.springframework.web.context.request.ServletRequestAttributes)
                    org.springframework.web.context.request.RequestContextHolder.getRequestAttributes();
            if (attrs == null) return null;   // webhook o tarea programada, sin navegador detrás
            return attrs.getRequest().getHeader(nombre);
        } catch (Exception e) {
            return null;
        }
    }

    /** Solo para las pruebas: el cuerpo que se mandaría, sin mandarlo. */
    Map<String, Object> cuerpoParaPrueba(String eventoId, BigDecimal total, int pasajes, String ruta) {
        return cuerpo(eventoId, total, pasajes, ruta);
    }

    /** Para armar un servicio en las pruebas sin levantar Spring. */
    static MetaConversionesService paraPruebas(String pixelId, String token, String testCode) {
        MetaConversionesService s = new MetaConversionesService();
        s.habilitada = true;
        s.pixelId = pixelId;
        s.accessToken = token;
        s.codigoDePrueba = testCode == null ? "" : testCode;
        s.endpoint = "https://graph.facebook.com/v21.0";
        s.origenUrl = "https://transporterayza.com/comprar";
        return s;
    }
}
