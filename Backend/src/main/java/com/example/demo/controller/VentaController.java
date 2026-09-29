package com.example.demo.controller;

import com.example.demo.dto.UsuarioDTO;
import com.example.demo.dto.VentaDTO;
import com.example.demo.dto.VentaEditRequest;
import com.example.demo.dto.VentaGrupoRequest;
import com.example.demo.dto.VentaRequest;
import com.example.demo.model.Usuario;
import com.example.demo.service.VentaService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;

import java.time.LocalDate;
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

    /**
     * Los pasajes de un rango de fechas de venta.
     *
     * Sin rango trae los últimos {@link VentaService#DIAS_POR_DEFECTO} días.
     * Traía todas las ventas de la historia en cada carga, y eso crecía para
     * siempre. Para un pasaje viejo del que se sabe el documento está
     * /api/ventas/documento/{documento}, que no mira fechas.
     */
    @GetMapping
    public ResponseEntity<List<VentaDTO>> listar(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            Authentication auth) {
        return ResponseEntity.ok(ventaService.listarVentas(
                auth != null ? auth.getName() : null, desde, hasta));
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

    /** Varios pasajes en una sola operación (un solo comprobante por todos). */
    @PostMapping("/grupo")
    public ResponseEntity<List<VentaDTO>> crearGrupo(@RequestBody VentaGrupoRequest req,
                                                     Authentication auth) {
        return ResponseEntity.ok(ventaService.crearVentaGrupo(req, auth.getName()));
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

    /** Pre-embarque: el pasajero sube al carro que lo lleva de Iquitos a Nauta. */
    @PatchMapping("/{id}/preembarcar")
    public ResponseEntity<VentaDTO> preembarcar(
            @PathVariable String id,
            Authentication authentication) {

        String usuarioNombre = authentication.getName();
        return ResponseEntity.ok(ventaService.preembarcarPasajero(id, usuarioNombre));
    }

    @PatchMapping("/{id}/embarcar")
    public ResponseEntity<VentaDTO> embarcar(
            @PathVariable String id,
            Authentication authentication) {

        String usuarioNombre = authentication.getName();
        return ResponseEntity.ok(ventaService.embarcarPasajero(id, usuarioNombre));
    }
}