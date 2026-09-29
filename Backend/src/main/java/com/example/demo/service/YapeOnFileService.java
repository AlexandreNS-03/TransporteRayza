package com.example.demo.service;

import com.example.demo.model.AutorizacionYape;
import com.example.demo.repository.AutorizacionYapeRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Yape On File: cobrar por Yape sin que el cliente tenga que abrir la app.
 *
 * El cliente autoriza UNA vez —entra a Yape por un enlace y aprueba— y desde
 * ahí el sistema puede cobrarle. Sirve para lo que ya está pactado pero se
 * cobra después: la encomienda que se paga al entregar, sobre todo, donde hoy
 * la tripulación vuelve con efectivo encima.
 *
 * <h3>Qué está hecho y qué no</h3>
 *
 * Todo lo de nuestro lado: guardar la autorización, su ciclo de vida, y el
 * punto donde se dispara un cobro. Lo que falta es hablar con el proveedor
 * de verdad, y eso no se puede escribir todavía porque la propuesta comercial
 * de GMoney no trae la documentación técnica: no dice ni las URLs, ni cómo se
 * autentica, ni qué forma tienen las respuestas, ni cómo avisa el resultado.
 *
 * Mientras no esté, corre en modo simulado, igual que Izipay y Mercado Pago
 * en local: el flujo completo se puede probar de punta a punta, pero no sale
 * plata de ningún lado. Cuando llegue la documentación, lo único que cambia
 * son los dos métodos marcados con PENDIENTE PROVEEDOR acá abajo.
 */
@Service
public class YapeOnFileService {

    private final AutorizacionYapeRepository repositorio;
    private final AuditoriaService auditoriaService;

    public YapeOnFileService(AutorizacionYapeRepository repositorio,
                             AuditoriaService auditoriaService) {
        this.repositorio = repositorio;
        this.auditoriaService = auditoriaService;
    }

    @Value("${yape.onfile.enabled:false}")
    private boolean enabled;

    /** Credenciales del comercio, que da GMoney al firmar. */
    @Value("${yape.onfile.api-key:}")
    private String apiKey;

    @Value("${yape.onfile.endpoint:}")
    private String endpoint;

    /**
     * Con la integración apagada todo funciona igual pero simulado. Así la
     * pantalla y las pruebas corren sin credenciales, y encender esto es
     * cambiar una variable, no tocar código.
     */
    public boolean estaActiva() {
        return enabled && !apiKey.isBlank() && !endpoint.isBlank();
    }

    public boolean esSimulado() { return !estaActiva(); }

    /* ───────────────────────────── Autorizar ───────────────────────────── */

    /** Lo que necesita la pantalla para mandar al cliente a aprobar en Yape. */
    public record Invitacion(String autorizacionId, String deeplink, boolean simulado) {}

    /**
     * Arranca una autorización y devuelve el enlace que abre Yape.
     *
     * Queda en PENDIENTE: recién sirve para cobrar cuando la persona aprueba
     * y el proveedor nos avisa. Que exista la fila no significa que se pueda
     * cobrar, y esa distinción es a propósito.
     */
    @Transactional
    public Invitacion pedirAutorizacion(String clienteEmail, String clienteNombre, String celular) {
        if (clienteEmail == null || clienteEmail.isBlank())
            throw new RuntimeException("Hace falta el correo del cliente para guardar su autorización");

        AutorizacionYape a = new AutorizacionYape();
        a.setId(UUID.randomUUID().toString());
        a.setClienteEmail(clienteEmail);
        a.setClienteNombre(clienteNombre);
        a.setCelularFinal(ultimosCuatro(celular));
        a.setEstado(AutorizacionYape.Estado.PENDIENTE);
        a.setCreatedAt(LocalDateTime.now());
        repositorio.save(a);

        auditoriaService.registrar("AUTORIZACION_YAPE", "PAGOS", a.getId(),
                "Se pidió autorización de Yape On File a " + clienteEmail);

        return new Invitacion(a.getId(), deeplinkDe(a), esSimulado());
    }

    /**
     * PENDIENTE PROVEEDOR — el enlace que abre Yape con la solicitud.
     *
     * La propuesta dice que "Yape brinda un deeplink para que el usuario
     * ingrese a Yape a aprobar el credential-on-file", pero no dice cómo se
     * pide ni qué forma tiene. Con la documentación, acá va la llamada a
     * GMoney que devuelve el enlace de verdad.
     */
    private String deeplinkDe(AutorizacionYape a) {
        if (estaActiva()) {
            throw new UnsupportedOperationException(
                    "Falta la documentación técnica de GMoney para pedir el deeplink de autorización");
        }
        return "yape-simulado://autorizar?ref=" + a.getId();
    }

    /**
     * El cliente aprobó: desde acá se le puede cobrar.
     *
     * Lo llama el retorno o el webhook del proveedor. Es idempotente: que
     * llegue dos veces no rompe nada, porque estos avisos se reintentan.
     */
    @Transactional
    public AutorizacionYape confirmarAutorizacion(String autorizacionId, String token, String referenciaExterna) {
        AutorizacionYape a = repositorio.findById(autorizacionId)
                .orElseThrow(() -> new RuntimeException("Esa autorización no existe"));

        if (a.getEstado() == AutorizacionYape.Estado.REVOCADA)
            throw new RuntimeException("Esa autorización fue dada de baja: hay que pedir una nueva");

        if (a.getEstado() == AutorizacionYape.Estado.ACTIVA) return a;   // ya estaba

        a.setToken(token);
        a.setReferenciaExterna(referenciaExterna);
        a.setEstado(AutorizacionYape.Estado.ACTIVA);
        a.setAutorizadoAt(LocalDateTime.now());
        repositorio.save(a);

        auditoriaService.registrar("AUTORIZACION_YAPE", "PAGOS", a.getId(),
                "Autorización de Yape On File activada para " + a.getClienteEmail());
        return a;
    }

    /** El cliente ya no quiere que le cobremos. A partir de acá, no se cobra. */
    @Transactional
    public AutorizacionYape revocar(String autorizacionId, String motivo) {
        AutorizacionYape a = repositorio.findById(autorizacionId)
                .orElseThrow(() -> new RuntimeException("Esa autorización no existe"));
        a.setEstado(AutorizacionYape.Estado.REVOCADA);
        a.setMotivoBaja(motivo);
        a.setRevocadoAt(LocalDateTime.now());
        repositorio.save(a);

        auditoriaService.registrar("AUTORIZACION_YAPE", "PAGOS", a.getId(),
                "Autorización de Yape On File dada de baja para " + a.getClienteEmail()
                        + (motivo != null ? " (" + motivo + ")" : ""));
        return a;
    }

    public java.util.Optional<AutorizacionYape> autorizacionVigenteDe(String clienteEmail) {
        if (clienteEmail == null || clienteEmail.isBlank()) return java.util.Optional.empty();
        return repositorio.findFirstByClienteEmailAndEstadoOrderByAutorizadoAtDesc(
                clienteEmail.trim().toLowerCase(), AutorizacionYape.Estado.ACTIVA);
    }

    public List<AutorizacionYape> historialDe(String clienteEmail) {
        return repositorio.findByClienteEmailOrderByCreatedAtDesc(
                clienteEmail == null ? "" : clienteEmail.trim().toLowerCase());
    }

    /* ────────────────────────────── Cobrar ─────────────────────────────── */

    public record Resultado(boolean pagado, String referencia, String motivo) {}

    /**
     * Cobra contra una autorización guardada.
     *
     * No cobra si la autorización no está viva, y el motivo se devuelve en
     * texto para poder mostrárselo a quien está en el mostrador.
     */
    @Transactional
    public Resultado cobrar(String clienteEmail, BigDecimal monto, String concepto) {
        if (monto == null || monto.signum() <= 0)
            return new Resultado(false, null, "El monto tiene que ser mayor que cero");

        AutorizacionYape a = autorizacionVigenteDe(clienteEmail).orElse(null);
        if (a == null || !a.sirveParaCobrar())
            return new Resultado(false, null,
                    "Ese cliente no tiene una autorización de Yape vigente: hay que pedirle que autorice");

        Resultado r = ejecutarCobro(a, monto, concepto);

        auditoriaService.registrar("COBRO_YAPE_ONFILE", "PAGOS", a.getId(),
                (r.pagado() ? "Cobrado S/ " : "Rechazado el cobro de S/ ") + monto
                        + " a " + a.getClienteEmail()
                        + (concepto != null ? " por " + concepto : "")
                        + (r.motivo() != null ? " — " + r.motivo() : ""));
        return r;
    }

    /**
     * PENDIENTE PROVEEDOR — el cobro contra GMoney.
     *
     * Falta saber la URL, cómo se autentica, qué campos lleva el pedido y qué
     * devuelve, y si el resultado llega en la respuesta o por webhook. Nada de
     * eso está en la propuesta comercial.
     *
     * Ojo con una cosa cuando se escriba: un cobro que se reintenta **no puede
     * cobrar dos veces**. Hay que mandar una clave de idempotencia propia y
     * que el proveedor la respete; si no la soporta, el reintento lo tenemos
     * que controlar de este lado antes de encender esto en producción.
     */
    private Resultado ejecutarCobro(AutorizacionYape a, BigDecimal monto, String concepto) {
        if (estaActiva()) {
            throw new UnsupportedOperationException(
                    "Falta la documentación técnica de GMoney para ejecutar el cobro");
        }
        return new Resultado(true,
                "yape_onfile_simulado_" + UUID.randomUUID().toString().substring(0, 12),
                null);
    }

    private String ultimosCuatro(String celular) {
        if (celular == null) return null;
        String soloDigitos = celular.replaceAll("\\D", "");
        return soloDigitos.length() < 4 ? null : soloDigitos.substring(soloDigitos.length() - 4);
    }
}
