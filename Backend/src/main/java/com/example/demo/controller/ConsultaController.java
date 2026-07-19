package com.example.demo.controller;

import com.example.demo.service.ConsultaDocumentoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/consulta")
@CrossOrigin(origins = "${app.frontend.url}")
public class ConsultaController {

    private final ConsultaDocumentoService consultaService;

    public ConsultaController(ConsultaDocumentoService consultaService) {
        this.consultaService = consultaService;
    }

    @GetMapping("/dni/{dni}")
    public ResponseEntity<Map<String, Object>> dni(@PathVariable String dni) {
        return ResponseEntity.ok(consultaService.consultarDni(dni));
    }

    @GetMapping("/ruc/{ruc}")
    public ResponseEntity<Map<String, Object>> ruc(@PathVariable String ruc) {
        return ResponseEntity.ok(consultaService.consultarRuc(ruc));
    }
}
