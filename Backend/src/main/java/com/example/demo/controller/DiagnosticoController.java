package com.example.demo.controller;

import com.example.demo.service.BackupService;
import com.example.demo.service.DiagnosticoService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Verificación del sistema y respaldo de datos.
 *
 * El diagnóstico lo puede ver cualquiera que trabaje en el sistema: si algo está
 * fallando, quien está en el mostrador es el primero en notarlo y tiene que poder
 * comprobar si es su internet o el sistema. El respaldo, en cambio, se baja con
 * datos de todos los pasajeros, así que queda para administración.
 */
@RestController
@RequestMapping("/api/diagnostico")
@CrossOrigin(origins = "${app.frontend.url}")
public class DiagnosticoController {

    private final DiagnosticoService diagnosticoService;
    private final BackupService backupService;

    public DiagnosticoController(DiagnosticoService diagnosticoService,
                                 BackupService backupService) {
        this.diagnosticoService = diagnosticoService;
        this.backupService = backupService;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> diagnosticar() {
        return ResponseEntity.ok(diagnosticoService.diagnosticar());
    }

    /**
     * Respuesta mínima para medir la conexión desde el navegador: el tiempo de ida y
     * vuelta de esta llamada es lo que tarda el sistema en contestar.
     */
    @GetMapping("/ping")
    public ResponseEntity<Map<String, Object>> ping() {
        return ResponseEntity.ok(Map.of("t", System.currentTimeMillis()));
    }

    /** Respaldo completo en ZIP (un CSV por tabla). Solo administración. */
    @GetMapping("/respaldo")
    public ResponseEntity<byte[]> respaldo(Authentication auth) {
        byte[] zip = backupService.generar(auth != null ? auth.getName() : "sistema");
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + backupService.nombreArchivo() + "\"")
                .body(zip);
    }
}
