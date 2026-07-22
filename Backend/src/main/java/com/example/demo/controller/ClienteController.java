package com.example.demo.controller;

import com.example.demo.dto.ClienteDTO;
import com.example.demo.dto.ClienteViajeDTO;
import com.example.demo.service.ClienteService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Cuenta del cliente autenticado (rol CLIENTE): perfil e historial de viajes. */
@RestController
@RequestMapping("/api/cliente")
public class ClienteController {

    private final ClienteService clienteService;

    public ClienteController(ClienteService clienteService) {
        this.clienteService = clienteService;
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<?> handleError(RuntimeException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("message", e.getMessage()));
    }

    // El subject del JWT del cliente es su email.
    @GetMapping("/perfil")
    public ResponseEntity<ClienteDTO> perfil(Authentication auth) {
        return ResponseEntity.ok(clienteService.perfil(auth.getName()));
    }

    @PutMapping("/perfil")
    public ResponseEntity<ClienteDTO> actualizar(@RequestBody ClienteDTO datos, Authentication auth) {
        return ResponseEntity.ok(clienteService.actualizarPerfil(auth.getName(), datos));
    }

    @GetMapping("/viajes")
    public ResponseEntity<List<ClienteViajeDTO>> misViajes(Authentication auth) {
        return ResponseEntity.ok(clienteService.misViajes(auth.getName()));
    }
}
