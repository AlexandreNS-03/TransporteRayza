package com.example.demo.controller;

import com.example.demo.dto.ClienteAuthResponse;
import com.example.demo.dto.ClienteRegisterRequest;
import com.example.demo.service.ClienteService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** Registro e inicio de sesión de clientes (público, bajo /auth). */
@RestController
@RequestMapping("/auth/cliente")
public class ClienteAuthController {

    private final ClienteService clienteService;

    public ClienteAuthController(ClienteService clienteService) {
        this.clienteService = clienteService;
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<?> handleError(RuntimeException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("message", e.getMessage()));
    }

    @PostMapping("/register")
    public ClienteAuthResponse registrar(@RequestBody ClienteRegisterRequest req) {
        return clienteService.registrar(req);
    }

    @PostMapping("/login")
    public ClienteAuthResponse login(@RequestBody Map<String, String> body) {
        return clienteService.login(body.get("email"), body.get("password"));
    }
}
