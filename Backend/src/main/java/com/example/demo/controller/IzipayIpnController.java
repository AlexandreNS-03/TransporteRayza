package com.example.demo.controller;

import com.example.demo.service.IzipayIpnService;
import com.example.demo.service.IzipayService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Notificación IPN de Izipay (servidor a servidor).
 *
 * Existe porque la confirmación que manda el navegador se puede perder: si el
 * cliente cierra la pestaña o se queda sin señal justo al pagar, el sistema
 * nunca se enteraría del cobro y quedaría pagado sin boleto. Izipay llama a
 * esta URL por su cuenta, así el pago se registra igual.
 *
 * Se configura en el Back Office de Izipay como "URL de notificación (IPN)".
 */
@RestController
@RequestMapping("/api/public/izipay")
public class IzipayIpnController {

    private final IzipayIpnService ipnService;

    public IzipayIpnController(IzipayIpnService ipnService) {
        this.ipnService = ipnService;
    }

    /**
     * Izipay envía un POST con formato de formulario. Siempre respondemos 200:
     * si devolviéramos error, la pasarela reintentaría indefinidamente aunque el
     * problema fuera nuestro. Lo que importa queda en el log y en la auditoría.
     */
    @PostMapping(consumes = "application/x-www-form-urlencoded")
    public ResponseEntity<String> notificacion(@RequestParam(name = "kr-answer", required = false) String krAnswer,
                                               @RequestParam(name = "kr-hash", required = false) String krHash,
                                               @RequestParam(name = "kr-hash-key", required = false) String krHashKey) {
        try {
            String r = ipnService.procesar(krAnswer, krHash, krHashKey);
            return ResponseEntity.ok(r);
        } catch (Exception e) {
            System.err.println("[Izipay IPN] " + e.getMessage());
            return ResponseEntity.ok("Notificación recibida");
        }
    }
}
