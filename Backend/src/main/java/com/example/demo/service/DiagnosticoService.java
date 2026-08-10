package com.example.demo.service;

import com.example.demo.model.Comprobante;
import com.example.demo.model.Venta;
import com.example.demo.repository.ComprobanteRepository;
import com.example.demo.repository.VentaRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TimeZone;

/**
 * Verificador del sistema: revisa en el momento que todo lo que el sistema necesita
 * para trabajar esté en pie, y cuando algo falla dice qué hacer.
 *
 * Está pensado para que lo entienda quien atiende en el mostrador, no solo quien
 * programa: cada revisión trae una explicación en palabras normales y una
 * recomendación concreta. Los problemas se ordenan por criticidad, así se ve de un
 * vistazo si es algo que frena la venta o algo que puede esperar.
 */
@Service
public class DiagnosticoService {

    /** Cómo salió una revisión. El semáforo general es el peor de todos. */
    public enum Estado { OK, ADVERTENCIA, CRITICO }

    /** Qué tan urgente es resolverlo. */
    public enum Criticidad { ALTA, MEDIA, BAJA }

    public static class Chequeo {
        public String clave;
        public String nombre;
        public String estado;
        public String criticidad;
        public String mensaje;
        public String recomendacion;
        public Long milisegundos;      // lo que tardó, cuando se mide

        Chequeo(String clave, String nombre, Estado estado, Criticidad criticidad,
                String mensaje, String recomendacion) {
            this.clave = clave;
            this.nombre = nombre;
            this.estado = estado.name();
            this.criticidad = criticidad.name();
            this.mensaje = mensaje;
            this.recomendacion = recomendacion;
        }
    }

    private final JdbcTemplate jdbc;
    private final EmailService emailService;
    private final IzipayService izipayService;
    private final MercadoPagoService mercadoPagoService;
    private final NubefactService nubefactService;
    private final VentaRepository ventaRepository;
    private final ComprobanteRepository comprobanteRepository;

    @Value("${apisperu.token:}")
    private String apisperuToken;

    public DiagnosticoService(JdbcTemplate jdbc,
                              EmailService emailService,
                              IzipayService izipayService,
                              MercadoPagoService mercadoPagoService,
                              NubefactService nubefactService,
                              VentaRepository ventaRepository,
                              ComprobanteRepository comprobanteRepository) {
        this.jdbc = jdbc;
        this.emailService = emailService;
        this.izipayService = izipayService;
        this.mercadoPagoService = mercadoPagoService;
        this.nubefactService = nubefactService;
        this.ventaRepository = ventaRepository;
        this.comprobanteRepository = comprobanteRepository;
    }

    /**
     * Columnas que agregaron las migraciones. Si falta alguna, la parte del sistema
     * que la usa falla con un error feo; acá se detecta antes y se dice qué archivo
     * hay que correr.
     */
    private static final String[][] COLUMNAS_ESPERADAS = {
            { "ventas",       "orden_pago",         "izipay-ipn.sql" },
            { "ventas",       "aviso_pago_enviado", "aviso-pago-pendiente.sql" },
            { "ventas",       "grupo_venta_id",     "venta-varios-pasajeros.sql" },
            { "ventas",       "resolucion",         "cancelacion-viajes.sql" },
            { "comprobantes", "grupo_venta_id",     "venta-varios-pasajeros.sql" },
            { "encomiendas",  "clave_seguridad",    "encomienda-clave-recojo.sql" },
            { "encomiendas",  "estado_pago",        "encomienda-estado-pago.sql" },
            { "encomiendas",  "parada_origen",      "encomienda-tramos.sql" },
    };

    public Map<String, Object> diagnosticar() {
        List<Chequeo> chequeos = new ArrayList<>();

        chequeos.add(revisarBaseDeDatos());
        chequeos.add(revisarEsquema());
        chequeos.add(revisarCorreo());
        chequeos.add(revisarPagoTarjeta());
        chequeos.add(revisarPagoYape());
        chequeos.add(revisarFacturacion());
        chequeos.add(revisarConsultaDocumentos());
        chequeos.add(revisarReservasVencidas());
        chequeos.add(revisarComprobantesPendientes());
        chequeos.add(revisarHora());

        // El semáforo general es lo peor que se encontró: si algo frena la venta,
        // no sirve de nada que el resto esté en verde.
        Estado general = Estado.OK;
        int ok = 0, advertencias = 0, criticos = 0;
        for (Chequeo c : chequeos) {
            switch (Estado.valueOf(c.estado)) {
                case CRITICO -> { criticos++; general = Estado.CRITICO; }
                case ADVERTENCIA -> {
                    advertencias++;
                    if (general == Estado.OK) general = Estado.ADVERTENCIA;
                }
                default -> ok++;
            }
        }

        // Primero lo que está mal, y dentro de eso lo más urgente.
        chequeos.sort((a, b) -> {
            int pa = peso(a), pb = peso(b);
            return pa != pb ? Integer.compare(pb, pa) : a.nombre.compareTo(b.nombre);
        });

        Map<String, Object> r = new LinkedHashMap<>();
        r.put("estadoGeneral", general.name());
        r.put("verificadoEn", LocalDateTime.now().toString());
        r.put("resumen", Map.of("ok", ok, "advertencias", advertencias, "criticos", criticos));
        r.put("chequeos", chequeos);
        r.put("mensajeGeneral", switch (general) {
            case OK -> "Todo funcionando con normalidad.";
            case ADVERTENCIA -> "El sistema funciona, pero hay " + advertencias
                    + " punto(s) que conviene revisar.";
            case CRITICO -> "Hay " + criticos + " problema(s) que pueden frenar la operación. "
                    + "Avisa a soporte desde el botón de esta pantalla.";
        });
        return r;
    }

    private int peso(Chequeo c) {
        int estado = switch (Estado.valueOf(c.estado)) {
            case CRITICO -> 300; case ADVERTENCIA -> 200; default -> 0;
        };
        int urgencia = switch (Criticidad.valueOf(c.criticidad)) {
            case ALTA -> 30; case MEDIA -> 20; default -> 10;
        };
        return estado + (estado == 0 ? 0 : urgencia);
    }

    // ------------------------------------------------------------------ revisiones

    private Chequeo revisarBaseDeDatos() {
        long inicio = System.currentTimeMillis();
        try {
            jdbc.queryForObject("SELECT 1", Integer.class);
            long ms = System.currentTimeMillis() - inicio;
            Chequeo c = ms > 1500
                    ? new Chequeo("base_datos", "Base de datos", Estado.ADVERTENCIA, Criticidad.ALTA,
                        "Responde, pero lenta (" + ms + " ms).",
                        "Puede ser la conexión a internet de la oficina o el servidor con mucha carga. "
                        + "Si se repite durante el día, avisa a soporte.")
                    : new Chequeo("base_datos", "Base de datos", Estado.OK, Criticidad.ALTA,
                        "Conectada y respondiendo en " + ms + " ms.", null);
            c.milisegundos = ms;
            return c;
        } catch (Exception e) {
            Chequeo c = new Chequeo("base_datos", "Base de datos", Estado.CRITICO, Criticidad.ALTA,
                    "No se pudo conectar: " + e.getMessage(),
                    "Sin base de datos no se puede vender ni consultar. Avisa a soporte de inmediato; "
                    + "mientras tanto, anota las ventas en papel para registrarlas después.");
            c.milisegundos = System.currentTimeMillis() - inicio;
            return c;
        }
    }

    private Chequeo revisarEsquema() {
        try {
            List<String> faltantes = new ArrayList<>();
            for (String[] col : COLUMNAS_ESPERADAS) {
                Integer existe = jdbc.queryForObject("""
                        SELECT COUNT(*) FROM information_schema.COLUMNS
                        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
                        """, Integer.class, col[0], col[1]);
                if (existe == null || existe == 0) faltantes.add(col[0] + "." + col[1] + " (" + col[2] + ")");
            }
            if (faltantes.isEmpty())
                return new Chequeo("esquema", "Estructura de la base", Estado.OK, Criticidad.ALTA,
                        "Todas las actualizaciones están aplicadas.", null);

            return new Chequeo("esquema", "Estructura de la base", Estado.CRITICO, Criticidad.ALTA,
                    "Faltan " + faltantes.size() + " actualización(es): " + String.join(", ", faltantes),
                    "Las funciones que usan esos datos van a fallar. Hay que correr en la base los "
                    + "archivos indicados entre paréntesis (están en Backend/sql). Avisa a soporte.");
        } catch (Exception e) {
            return new Chequeo("esquema", "Estructura de la base", Estado.ADVERTENCIA, Criticidad.MEDIA,
                    "No se pudo revisar: " + e.getMessage(),
                    "Vuelve a intentarlo; si sigue igual, avisa a soporte.");
        }
    }

    private Chequeo revisarCorreo() {
        if (emailService.estaConfigurado())
            return new Chequeo("correo", "Envío de correos", Estado.OK, Criticidad.ALTA,
                    "Configurado: los boletos salen automáticamente.", null);
        return new Chequeo("correo", "Envío de correos", Estado.CRITICO, Criticidad.ALTA,
                "Sin configurar: los boletos NO se están enviando por correo.",
                "La venta funciona igual, pero hay que entregar el boleto impreso hasta que se "
                + "arregle. Avisa a soporte para que configure el correo del sistema.");
    }

    private Chequeo revisarPagoTarjeta() {
        if (izipayService.estaActiva())
            return new Chequeo("pago_tarjeta", "Pago con tarjeta (Izipay)", Estado.OK, Criticidad.MEDIA,
                    "Activo: la web cobra con tarjeta de verdad.", null);
        return new Chequeo("pago_tarjeta", "Pago con tarjeta (Izipay)", Estado.ADVERTENCIA, Criticidad.MEDIA,
                "En modo prueba: los pagos con tarjeta de la web NO cobran.",
                "En el mostrador no afecta. Si la web ya está publicada, avisa a soporte para "
                + "poner las credenciales de producción de Izipay.");
    }

    private Chequeo revisarPagoYape() {
        if (mercadoPagoService.estaActiva())
            return new Chequeo("pago_yape", "Pago con Yape", Estado.OK, Criticidad.MEDIA,
                    "Activo: la web cobra con Yape de verdad.", null);
        return new Chequeo("pago_yape", "Pago con Yape", Estado.ADVERTENCIA, Criticidad.MEDIA,
                "En modo prueba: los pagos con Yape de la web NO cobran.",
                "En el mostrador no afecta. Si la web ya está publicada, avisa a soporte para "
                + "poner las credenciales de producción de Mercado Pago.");
    }

    private Chequeo revisarFacturacion() {
        if (nubefactService.isEnabled())
            return new Chequeo("facturacion", "Comprobantes electrónicos", Estado.OK, Criticidad.ALTA,
                    "Conectado con Nubefact: las boletas y facturas se envían a SUNAT.", null);
        return new Chequeo("facturacion", "Comprobantes electrónicos", Estado.ADVERTENCIA, Criticidad.ALTA,
                "Desconectado: los comprobantes se guardan pero no llegan a SUNAT.",
                "Se pueden seguir emitiendo, pero hay que regularizarlos después. "
                + "Avisa a soporte para reconectar Nubefact.");
    }

    private Chequeo revisarConsultaDocumentos() {
        if (apisperuToken != null && !apisperuToken.isBlank())
            return new Chequeo("consulta_documentos", "Consulta de DNI y RUC", Estado.OK, Criticidad.BAJA,
                    "Activa: el nombre se completa solo al escribir el documento.", null);
        return new Chequeo("consulta_documentos", "Consulta de DNI y RUC", Estado.ADVERTENCIA, Criticidad.BAJA,
                "Sin configurar: hay que escribir el nombre a mano.",
                "No frena la venta. Avisa a soporte cuando puedas para volver a activarla.");
    }

    private Chequeo revisarReservasVencidas() {
        try {
            long vencidas = ventaRepository.countByEstadoAndReservaExpiraBefore(
                    Venta.EstadoVenta.RESERVADO, LocalDateTime.now().minusMinutes(5));
            if (vencidas == 0)
                return new Chequeo("reservas", "Asientos reservados en la web", Estado.OK, Criticidad.MEDIA,
                        "No hay asientos trabados: los que no se pagan se liberan solos.", null);

            return new Chequeo("reservas", "Asientos reservados en la web", Estado.ADVERTENCIA, Criticidad.MEDIA,
                    vencidas + " asiento(s) siguen retenidos aunque ya venció el plazo de pago.",
                    "Esos asientos figuran como ocupados y no se pueden vender. Deberían liberarse "
                    + "solos en un minuto; si el número no baja, avisa a soporte.");
        } catch (Exception e) {
            return new Chequeo("reservas", "Asientos reservados en la web", Estado.ADVERTENCIA, Criticidad.BAJA,
                    "No se pudo revisar: " + e.getMessage(), "Vuelve a intentarlo más tarde.");
        }
    }

    private Chequeo revisarComprobantesPendientes() {
        try {
            long rechazados = comprobanteRepository.countByEstadoNot(
                    Comprobante.EstadoComprobante.ACEPTADO);
            if (rechazados == 0)
                return new Chequeo("comprobantes", "Comprobantes emitidos", Estado.OK, Criticidad.MEDIA,
                        "Todos los comprobantes quedaron aceptados.", null);

            return new Chequeo("comprobantes", "Comprobantes emitidos", Estado.ADVERTENCIA, Criticidad.MEDIA,
                    rechazados + " comprobante(s) no quedaron aceptados.",
                    "Revísalos en Comprobantes y vuelve a emitirlos. Si el error se repite, "
                    + "avisa a soporte con el número del comprobante.");
        } catch (Exception e) {
            return new Chequeo("comprobantes", "Comprobantes emitidos", Estado.ADVERTENCIA, Criticidad.BAJA,
                    "No se pudo revisar: " + e.getMessage(), "Vuelve a intentarlo más tarde.");
        }
    }

    private Chequeo revisarHora() {
        String zona = TimeZone.getDefault().getID();
        if ("America/Lima".equals(zona))
            return new Chequeo("hora", "Hora del servidor", Estado.OK, Criticidad.ALTA,
                    "En hora de Perú: " + LocalDateTime.now(), null);
        return new Chequeo("hora", "Hora del servidor", Estado.CRITICO, Criticidad.ALTA,
                "El servidor está en la zona horaria " + zona + ", no en la de Perú.",
                "Las ventas pueden quedar con la fecha del día siguiente y descuadrar la caja y "
                + "los reportes. Avisa a soporte.");
    }
}
