package com.example.demo.controller;

import com.example.demo.dto.EncomiendaPublicDTO;
import com.example.demo.service.EncomiendaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Rastreo público de encomiendas (sin login). Va bajo /api/public/** que ya es
 * de acceso abierto en la configuración de seguridad.
 */
@RestController
@RequestMapping("/api/public/encomiendas")
public class EncomiendaPublicController {

    private final EncomiendaService encomiendaService;

    public EncomiendaPublicController(EncomiendaService encomiendaService) {
        this.encomiendaService = encomiendaService;
    }

    @GetMapping("/rastrear/{codigo}")
    public ResponseEntity<EncomiendaPublicDTO> rastrearPorCodigo(@PathVariable String codigo) {
        return ResponseEntity.ok(encomiendaService.rastrearPorCodigo(codigo));
    }

    @GetMapping("/remitente/{documento}")
    public ResponseEntity<List<EncomiendaPublicDTO>> rastrearPorRemitente(@PathVariable String documento) {
        return ResponseEntity.ok(encomiendaService.rastrearPorRemitente(documento));
    }

    @GetMapping("/destinatario/{documento}")
    public ResponseEntity<List<EncomiendaPublicDTO>> rastrearPorDestinatario(@PathVariable String documento) {
        return ResponseEntity.ok(encomiendaService.rastrearPorDestinatario(documento));
    }
}
