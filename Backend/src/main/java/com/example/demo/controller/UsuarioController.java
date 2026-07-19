package com.example.demo.controller;

import com.example.demo.dto.CambiarRolRequest;
import com.example.demo.dto.ResetPasswordRequest;
import com.example.demo.dto.UsuarioDTO;
import com.example.demo.dto.UsuarioRequest;
import com.example.demo.service.UsuarioService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/usuarios")
public class UsuarioController {

    private final UsuarioService usuarioService;

    public UsuarioController(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    @GetMapping
    public List<UsuarioDTO> listar() {
        return usuarioService.listarUsuarios();
    }

    @PostMapping
    public ResponseEntity<?> crear(@RequestBody UsuarioRequest req) {
        try {
            return ResponseEntity.ok(usuarioService.crearUsuario(req));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PatchMapping("/{id}/rol")
    public ResponseEntity<?> cambiarRol(@PathVariable String id, @RequestBody CambiarRolRequest req) {
        try {
            return ResponseEntity.ok(usuarioService.cambiarRol(id, req));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PatchMapping("/{id}/activo")
    public ResponseEntity<?> toggleActivo(@PathVariable String id) {
        try {
            return ResponseEntity.ok(usuarioService.toggleActivo(id));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PatchMapping("/{id}/sucursal")
    public ResponseEntity<?> cambiarSucursal(@PathVariable String id, @RequestBody Map<String, String> body) {
        try {
            return ResponseEntity.ok(usuarioService.cambiarSucursal(id, body.get("sucursalId")));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PatchMapping("/{id}/password")
    public ResponseEntity<?> resetearPassword(@PathVariable String id, @RequestBody ResetPasswordRequest req) {
        try {
            usuarioService.resetearPassword(id, req);
            return ResponseEntity.ok(Map.of("mensaje", "Contraseña actualizada"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}