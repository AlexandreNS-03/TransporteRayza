package com.example.demo.controller;

import com.example.demo.dto.CajaRequest;
import com.example.demo.model.Caja;
import com.example.demo.model.MovimientoCaja;
import com.example.demo.service.CajaService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/cajas")
@CrossOrigin(origins = "${app.frontend.url}")
public class CajaController {

    private final CajaService cajaService;

    public CajaController(CajaService cajaService) {
        this.cajaService = cajaService;
    }

    @GetMapping
    public ResponseEntity<List<Caja>> listar() {
        return ResponseEntity.ok(cajaService.listar());
    }

    @GetMapping("/mi-caja")
    public ResponseEntity<Map<String, Object>> miCaja(Authentication auth) {
        Caja caja = cajaService.miCajaAbierta(auth.getName());
        Map<String, Object> res = new HashMap<>();
        res.put("abierta", caja != null);
        res.put("caja", caja);
        return ResponseEntity.ok(res);
    }

    @GetMapping("/{id}/movimientos")
    public ResponseEntity<List<MovimientoCaja>> movimientos(@PathVariable String id) {
        return ResponseEntity.ok(cajaService.movimientos(id));
    }

    @PostMapping("/abrir")
    public ResponseEntity<Caja> abrir(@RequestBody CajaRequest req, Authentication auth) {
        return ResponseEntity.ok(cajaService.abrir(req, auth.getName()));
    }

    @PatchMapping("/{id}/cerrar")
    public ResponseEntity<Caja> cerrar(@PathVariable String id,
                                       @RequestBody CajaRequest req,
                                       Authentication auth) {
        return ResponseEntity.ok(cajaService.cerrar(id, req, auth.getName()));
    }

    @PostMapping("/movimientos")
    public ResponseEntity<MovimientoCaja> movimientoManual(@RequestBody CajaRequest req,
                                                           Authentication auth) {
        return ResponseEntity.ok(cajaService.registrarMovimientoManual(req, auth.getName()));
    }
}
