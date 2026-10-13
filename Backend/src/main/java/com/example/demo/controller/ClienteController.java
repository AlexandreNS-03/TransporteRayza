package com.example.demo.controller;

import com.example.demo.dto.ClienteDTO;
import com.example.demo.dto.AcompananteDTO;
import com.example.demo.dto.ClienteComprobanteDTO;
import com.example.demo.dto.ClienteViajeDTO;
import com.example.demo.dto.DocumentoViajeDTO;
import com.example.demo.dto.PreferenciasNotificacionDTO;
import com.example.demo.dto.MetodoPagoGuardadoDTO;
import com.example.demo.service.ClienteService;
import com.example.demo.service.AcompanantesService;
import com.example.demo.service.DocumentosViajeService;
import com.example.demo.service.MetodosPagoGuardadosService;
import com.example.demo.service.NotificacionesService;
import com.example.demo.service.VerificacionCelularService;
import com.example.demo.service.VerificacionEmailService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Cuenta del cliente autenticado (rol CLIENTE): perfil e historial de viajes. */
@RestController
@RequestMapping("/api/cliente")
public class ClienteController {

    private final ClienteService clienteService;
    private final MetodosPagoGuardadosService metodosPago;
    private final VerificacionEmailService verificacionEmail;
    private final DocumentosViajeService documentos;
    private final AcompanantesService acompanantes;
    private final NotificacionesService notificaciones;
    private final VerificacionCelularService verificacionCelular;

    public ClienteController(ClienteService clienteService,
                             MetodosPagoGuardadosService metodosPago,
                             VerificacionEmailService verificacionEmail,
                             DocumentosViajeService documentos,
                             AcompanantesService acompanantes,
                             NotificacionesService notificaciones,
                             VerificacionCelularService verificacionCelular) {
        this.clienteService = clienteService;
        this.metodosPago = metodosPago;
        this.verificacionEmail = verificacionEmail;
        this.documentos = documentos;
        this.acompanantes = acompanantes;
        this.notificaciones = notificaciones;
        this.verificacionCelular = verificacionCelular;
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<?> handleError(RuntimeException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("message", e.getMessage()));
    }

    // El subject del JWT del cliente es su email.
    @GetMapping("/perfil")
    public ResponseEntity<ClienteDTO> perfil(Authentication auth) {
        return ResponseEntity.ok(clienteService.perfil(auth.getName()));
    }

    @PutMapping("/perfil")
    public ResponseEntity<ClienteDTO> actualizar(@RequestBody ClienteDTO datos, Authentication auth) {
        return ResponseEntity.ok(clienteService.actualizarPerfil(auth.getName(), datos));
    }

    /** Cambia la contraseña desde adentro de la cuenta. Pide la actual. */
    @PostMapping("/cambiar-clave")
    public ResponseEntity<?> cambiarClave(@RequestBody Map<String, String> body, Authentication auth) {
        clienteService.cambiarClave(auth.getName(), body.get("actual"), body.get("nueva"));
        return ResponseEntity.ok(Map.of("message", "Tu contraseña quedó cambiada."));
    }

    /* ── Notificaciones ──
       Por dónde le escribimos y para qué. Lo informativo es el servicio que
       compró; lo promocional necesita que diga que sí, y queda anotado cuándo
       lo dijo. */

    @GetMapping("/notificaciones")
    public ResponseEntity<PreferenciasNotificacionDTO> misNotificaciones(Authentication auth) {
        return ResponseEntity.ok(notificaciones.deCliente(auth.getName()));
    }

    @PutMapping("/notificaciones")
    public ResponseEntity<PreferenciasNotificacionDTO> guardarNotificaciones(
            @RequestBody PreferenciasNotificacionDTO datos, Authentication auth) {
        return ResponseEntity.ok(notificaciones.guardar(auth.getName(), datos));
    }

    /* ── Acompañantes frecuentes ──
       Quien compra para su familia escribe cinco veces los mismos nombres y
       documentos. Esto los guarda una vez. Son datos de terceros: solo lo que
       ya se escribe al comprar, y el titular los borra cuando quiera. */

    @GetMapping("/acompanantes")
    public ResponseEntity<List<AcompananteDTO>> misAcompanantes(Authentication auth) {
        return ResponseEntity.ok(acompanantes.deCliente(auth.getName()));
    }

    /** Agrega uno o actualiza el que ya estaba, si coincide el documento. */
    @PostMapping("/acompanantes")
    public ResponseEntity<AcompananteDTO> guardarAcompanante(@RequestBody AcompananteDTO datos,
                                                             Authentication auth) {
        return ResponseEntity.ok(acompanantes.guardar(auth.getName(), datos));
    }

    @DeleteMapping("/acompanantes/{id}")
    public ResponseEntity<?> borrarAcompanante(@PathVariable String id, Authentication auth) {
        acompanantes.borrar(auth.getName(), id);
        return ResponseEntity.ok(Map.of("message", "Lo sacamos de tu lista."));
    }

    /* ── Documentos de viaje ──
       Varios por cliente: acá se viaja con DNI dentro del país y con pasaporte
       o CPF cuando se cruza a Brasil. El servidor calcula si están vencidos o
       por vencer; la pantalla no debería hacer cuentas de fechas. */

    @GetMapping("/documentos")
    public ResponseEntity<List<DocumentoViajeDTO>> misDocumentos(Authentication auth) {
        return ResponseEntity.ok(documentos.deCliente(auth.getName()));
    }

    /** Agrega uno o actualiza el que ya estaba, si coinciden tipo y número. */
    @PostMapping("/documentos")
    public ResponseEntity<DocumentoViajeDTO> guardarDocumento(@RequestBody DocumentoViajeDTO datos,
                                                              Authentication auth) {
        return ResponseEntity.ok(documentos.guardar(auth.getName(), datos));
    }

    @DeleteMapping("/documentos/{id}")
    public ResponseEntity<?> borrarDocumento(@PathVariable String id, Authentication auth) {
        documentos.borrar(auth.getName(), id);
        return ResponseEntity.ok(Map.of("message", "Lo borramos de tu cuenta."));
    }

    /* ── Métodos de pago guardados ──
       Tarjetas y Yape llegan en un solo listado: para el cliente son lo mismo.
       Nunca viaja el token, solo lo justo para reconocer cada uno. */

    @GetMapping("/metodos-de-pago")
    public ResponseEntity<List<MetodoPagoGuardadoDTO>> metodosDePago(Authentication auth) {
        return ResponseEntity.ok(metodosPago.deCliente(auth.getName()));
    }

    /** Elige cuál se ofrece primero al pagar. Solo aplica a tarjetas. */
    @PatchMapping("/metodos-de-pago/{id}/preferida")
    public ResponseEntity<?> preferida(@PathVariable String id, Authentication auth) {
        metodosPago.marcarPreferida(auth.getName(), id);
        return ResponseEntity.ok(Map.of("message", "Listo, esa se ofrece primero."));
    }

    /** Lo quita. El tipo va en la ruta porque cada uno se da de baja distinto. */
    @DeleteMapping("/metodos-de-pago/{tipo}/{id}")
    public ResponseEntity<?> quitarMetodo(@PathVariable String tipo, @PathVariable String id,
                                          Authentication auth) {
        MetodoPagoGuardadoDTO.Tipo t;
        try { t = MetodoPagoGuardadoDTO.Tipo.valueOf(tipo.toUpperCase()); }
        catch (IllegalArgumentException e) { throw new RuntimeException("Tipo de método desconocido"); }
        metodosPago.quitar(auth.getName(), t, id);
        return ResponseEntity.ok(Map.of("message", "Lo quitamos de tu cuenta."));
    }

    /** Vuelve a mandar el enlace para confirmar el correo. */
    @PostMapping("/verificar-correo/reenviar")
    public ResponseEntity<?> reenviarVerificacion(Authentication auth) {
        verificacionEmail.reenviar(auth.getName());
        return ResponseEntity.ok(Map.of("message",
                "Te mandamos el enlace. Revisa tu correo; también puede estar en spam."));
    }

    /* ── Verificación del celular ──
       Un código de seis dígitos: lo que lo protege no es que venza, es que se
       cuentan los intentos. Ver VerificacionCelularService. */

    @PostMapping("/verificar-celular/enviar")
    public ResponseEntity<?> enviarCodigoCelular(Authentication auth) {
        String tapado = verificacionCelular.enviarCodigo(auth.getName());
        return ResponseEntity.ok(Map.of("message",
                "Te mandamos un código a " + tapado + ". Vence en 10 minutos."));
    }

    @PostMapping("/verificar-celular")
    public ResponseEntity<?> confirmarCelular(@RequestBody Map<String, String> body,
                                              Authentication auth) {
        verificacionCelular.confirmar(auth.getName(), body.get("codigo"));
        return ResponseEntity.ok(Map.of("message", "Listo, tu celular quedó verificado."));
    }

    /** Las boletas y facturas del cliente, con el enlace al PDF. */
    @GetMapping("/comprobantes")
    public ResponseEntity<List<ClienteComprobanteDTO>> misComprobantes(Authentication auth) {
        return ResponseEntity.ok(clienteService.misComprobantes(auth.getName()));
    }

    @GetMapping("/viajes")
    public ResponseEntity<List<ClienteViajeDTO>> misViajes(Authentication auth) {
        return ResponseEntity.ok(clienteService.misViajes(auth.getName()));
    }
}
