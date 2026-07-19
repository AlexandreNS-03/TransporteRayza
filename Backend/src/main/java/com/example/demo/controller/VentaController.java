package com.example.demo.controller;

import com.example.demo.dto.UsuarioDTO;
import com.example.demo.dto.VentaDTO;
import com.example.demo.dto.VentaEditRequest;
import com.example.demo.dto.VentaRequest;
import com.example.demo.model.Usuario;
import com.example.demo.service.VentaService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ventas")
@CrossOrigin(origins = "${app.frontend.url}")
public class VentaController {

    private final VentaService ventaService;

    public VentaController(VentaService ventaService) {
        this.ventaService = ventaService;
    }

    @GetMapping
    public ResponseEntity<List<VentaDTO>> listar() {
        return ResponseEntity.ok(ventaService.listarVentas());
    }

    @GetMapping("/viaje/{viajeId}")
    public ResponseEntity<List<VentaDTO>> porViaje(@PathVariable String viajeId) {
        return ResponseEntity.ok(ventaService.listarPorViaje(viajeId));
    }

    @GetMapping("/qr/{codigoQr}")
    public ResponseEntity<VentaDTO> porQr(@PathVariable String codigoQr) {
        return ResponseEntity.ok(ventaService.buscarPorQr(codigoQr));
    }

    @GetMapping("/documento/{documento}")
    public ResponseEntity<List<VentaDTO>> porDocumento(@PathVariable String documento) {
        return ResponseEntity.ok(ventaService.buscarPorDocumento(documento));
    }

    @GetMapping("/{id}")
    public ResponseEntity<VentaDTO> detalle(@PathVariable String id) {
        return ResponseEntity.ok(ventaService.obtenerDetalle(id));
    }

    @PostMapping
    public ResponseEntity<VentaDTO> crear(@RequestBody VentaRequest req,
                                          Authentication auth) {
        return ResponseEntity.ok(ventaService.crearVenta(req, auth.getName()));
    }

    @PostMapping("/{id}/enviar-comprobante")
    public ResponseEntity<Void> enviarComprobante(@PathVariable String id) {
        ventaService.enviarComprobante(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/mis-embarques-hoy")
    public ResponseEntity<List<VentaDTO>> misEmbarquesHoy(Authentication authentication) {
        String usuarioNombre = authentication.getName();
        return ResponseEntity.ok(ventaService.listarMisEmbarquesHoy(usuarioNombre));
    }

    @PutMapping("/{id}")
    public ResponseEntity<VentaDTO> editar(@PathVariable String id,
                                           @RequestBody VentaEditRequest req,
                                           Authentication auth) {
        return ResponseEntity.ok(ventaService.editarVenta(id, req, auth.getName()));
    }

    @PatchMapping("/{id}/anular")
    public ResponseEntity<VentaDTO> anular(@PathVariable String id, Authentication auth) {
        return ResponseEntity.ok(ventaService.anularVenta(id, auth.getName()));
    }

    @PatchMapping("/{id}/embarcar")
    public ResponseEntity<VentaDTO> embarcar(
            @PathVariable String id,
            Authentication authentication) {

        String usuarioNombre = authentication.getName();
        return ResponseEntity.ok(ventaService.embarcarPasajero(id, usuarioNombre));
    }
}