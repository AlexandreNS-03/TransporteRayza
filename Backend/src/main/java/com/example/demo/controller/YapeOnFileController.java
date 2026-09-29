package com.example.demo.controller;

import com.example.demo.model.AutorizacionYape;
import com.example.demo.service.YapeOnFileService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Yape On File. Prototipo: corre en modo simulado hasta que GMoney entregue
 * la documentación técnica y se firme el contrato. Ver {@link YapeOnFileService}.
 */
@RestController
@RequestMapping("/api/yape-on-file")
@CrossOrigin(origins = "${app.frontend.url}")
public class YapeOnFileController {

    private final YapeOnFileService servicio;

    public YapeOnFileController(YapeOnFileService servicio) {
        this.servicio = servicio;
    }

    /** Para que la pantalla sepa si mostrar la opción y si está simulada. */
    @GetMapping("/estado")
    public ResponseEntity<Map<String, Object>> estado() {
        return ResponseEntity.ok(Map.of(
                "activa", servicio.estaActiva(),
                "simulado", servicio.esSimulado()));
    }

    /** Arranca una autorización: devuelve el enlace que abre Yape. */
    @PostMapping("/autorizaciones")
    public ResponseEntity<YapeOnFileService.Invitacion> pedir(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(servicio.pedirAutorizacion(
                body.get("clienteEmail"), body.get("clienteNombre"), body.get("celular")));
    }

    /**
     * El cliente aprobó en Yape.
     *
     * Con el proveedor de verdad esto lo llama su webhook, no el navegador.
     * Cuando llegue la documentación hay que verificar la firma del aviso
     * antes de dar por buena la autorización: si no, cualquiera que conozca
     * el id podría activarla.
     */
    @PostMapping("/autorizaciones/{id}/confirmar")
    public ResponseEntity<AutorizacionYape> confirmar(@PathVariable String id,
                                                      @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(servicio.confirmarAutorizacion(
                id, body.get("token"), body.get("referenciaExterna")));
    }

    @PatchMapping("/autorizaciones/{id}/revocar")
    public ResponseEntity<AutorizacionYape> revocar(@PathVariable String id,
                                                    @RequestBody(required = false) Map<String, String> body) {
        return ResponseEntity.ok(servicio.revocar(id, body != null ? body.get("motivo") : null));
    }

    @GetMapping("/autorizaciones")
    public ResponseEntity<List<AutorizacionYape>> historial(@RequestParam String clienteEmail) {
        return ResponseEntity.ok(servicio.historialDe(clienteEmail));
    }

    /** Cobra contra la autorización vigente del cliente. */
    @PostMapping("/cobros")
    public ResponseEntity<YapeOnFileService.Resultado> cobrar(@RequestBody Map<String, Object> body) {
        BigDecimal monto = body.get("monto") == null ? null
                : new BigDecimal(String.valueOf(body.get("monto")));
        return ResponseEntity.ok(servicio.cobrar(
                (String) body.get("clienteEmail"), monto, (String) body.get("concepto")));
    }
}
