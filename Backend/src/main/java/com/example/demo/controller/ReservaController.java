package com.example.demo.controller;

import com.example.demo.dto.ConfirmacionDTO;
import com.example.demo.dto.ConfirmacionGrupoDTO;
import com.example.demo.dto.ReservaGrupoRequest;
import com.example.demo.dto.ReservaGrupoResponse;
import com.example.demo.dto.ReservaRequest;
import com.example.demo.dto.ReservaResponse;
import com.example.demo.service.RecordatorioPagoService;
import com.example.demo.service.ReservaService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Reserva y pago en línea (público). Permite compra como invitado; si el cliente está
 * autenticado (rol CLIENTE), la compra queda asociada a su cuenta.
 */
@RestController
@RequestMapping("/api/public/reservas")
public class ReservaController {

    private final ReservaService reservaService;
    private final RecordatorioPagoService recordatorioPagoService;

    public ReservaController(ReservaService reservaService,
                             RecordatorioPagoService recordatorioPagoService) {
        this.reservaService = reservaService;
        this.recordatorioPagoService = recordatorioPagoService;
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<?> handleError(RuntimeException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("message", e.getMessage()));
    }

    @PostMapping
    public ResponseEntity<ReservaResponse> reservar(@RequestBody ReservaRequest req,
                                                    Authentication auth) {
        String email = (auth != null) ? auth.getName() : null;
        return ResponseEntity.ok(reservaService.crearReserva(req, email));
    }

    /** Datos completos de un boleto para imprimir el ticket de embarque (80mm/A4). */
    @GetMapping("/{id}/ticket")
    public ResponseEntity<?> ticket(@PathVariable String id) {
        return ResponseEntity.ok(reservaService.datosTicket(id));
    }

    /**
     * Reservas que siguen esperando pago, para la página "termina tu pago" a la que
     * llega el cliente desde el correo de aviso. Los ids van separados por coma.
     */
    @GetMapping("/pendientes")
    public ResponseEntity<?> pendientes(@RequestParam String ids) {
        List<String> lista = java.util.Arrays.stream(ids.split(","))
                .map(String::trim).filter(s -> !s.isEmpty()).toList();
        if (lista.isEmpty()) throw new RuntimeException("Enlace inválido");
        return ResponseEntity.ok(reservaService.pendientesPorIds(lista));
    }

    /** Reserva de varios pasajes (1 a 5) en una sola compra. */
    @PostMapping("/grupo")
    public ResponseEntity<ReservaGrupoResponse> reservarGrupo(@RequestBody ReservaGrupoRequest req,
                                                              Authentication auth) {
        String email = (auth != null) ? auth.getName() : null;
        return ResponseEntity.ok(reservaService.crearReservaGrupo(req, email));
    }

    /**
     * El cliente cerró la pestaña en el paso de pago. El navegador lo avisa con un
     * "beacon" al descargarse la página; acá se le manda el correo para que pueda
     * terminar la compra antes de que el asiento se libere.
     *
     * No cambia nada de la venta: si ya pagó o la reserva venció, no se hace nada.
     */
    @PostMapping("/abandono")
    public ResponseEntity<?> abandono(@RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(Map.of("resultado",
                recordatorioPagoService.avisarPorIds(reservaIds(body))));
    }

    /** Formulario de Izipay para el total del grupo. */
    @PostMapping("/grupo/pago/formulario")
    public ResponseEntity<?> formularioDePagoGrupo(@RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(reservaService.prepararPagoGrupo(reservaIds(body)));
    }

    /** Confirma el pago con tarjeta del grupo. */
    @PostMapping("/grupo/pagar")
    public ResponseEntity<ConfirmacionGrupoDTO> pagarGrupo(@RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(reservaService.pagarGrupo(
                reservaIds(body), (String) body.get("krAnswer"), (String) body.get("krHash")));
    }

    /** Confirma el pago con Yape del grupo. */
    @PostMapping("/grupo/pagar/yape")
    public ResponseEntity<ConfirmacionGrupoDTO> pagarGrupoYape(@RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(reservaService.pagarGrupoYape(
                reservaIds(body), (String) body.get("token")));
    }

    @SuppressWarnings("unchecked")
    private List<String> reservaIds(Map<String, Object> body) {
        Object ids = body.get("reservaIds");
        if (!(ids instanceof List))
            throw new RuntimeException("Faltan las reservas del grupo");
        return (List<String>) ids;
    }

    /**
     * Medios de pago disponibles y las claves públicas que necesita el navegador.
     * Se consulta antes de elegir: así no se pide un formulario a Izipay cuando el
     * cliente va a pagar con Yape, y no quedan órdenes abandonadas en la pasarela.
     */
    @GetMapping("/metodos-de-pago")
    public ResponseEntity<?> metodosDePago() {
        return ResponseEntity.ok(reservaService.metodosDePago());
    }

    /** Paso previo del pago con tarjeta: pide a Izipay el formulario de esta reserva. */
    @PostMapping("/{id}/pago/formulario")
    public ResponseEntity<?> formularioDePago(@PathVariable String id) {
        return ResponseEntity.ok(reservaService.prepararPago(id));
    }

    /**
     * Confirma el pago con lo que devolvió el formulario de Izipay. No recibe datos de
     * tarjeta: solo la respuesta firmada, que el servidor verifica antes de dar la
     * venta por pagada.
     */
    /** Pago con Yape: el navegador manda el token que generó el SDK de Mercado Pago. */
    @PostMapping("/{id}/pagar/yape")
    public ResponseEntity<ConfirmacionDTO> pagarYape(@PathVariable String id,
                                                     @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(reservaService.pagarConYape(id, body.get("token")));
    }

    @PostMapping("/{id}/pagar")
    public ResponseEntity<ConfirmacionDTO> pagar(@PathVariable String id,
                                                 @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(
                reservaService.pagarReserva(id, body.get("krAnswer"), body.get("krHash")));
    }
}
