package com.example.demo.controller;

import com.example.demo.dto.LoginRequest;
import com.example.demo.dto.LoginResponse;
import com.example.demo.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.util.Map;


@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<?> handleError(RuntimeException e) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of(
                        "error", "UNAUTHORIZED",
                        "mensaje", e.getMessage()
                ));
    }

    @PostMapping("/login")
    public LoginResponse login(@RequestBody LoginRequest request,
                               HttpServletRequest http) {
        return authService.login(request, ipDe(http));
    }

    /**
     * Segundo paso del login: el código que llegó al correo.
     *
     * Público a propósito: quien está acá todavía no tiene token —justamente
     * porque le falta este paso—, así que exigir sesión sería un círculo.
     */
    @PostMapping("/verificar-codigo")
    public LoginResponse verificarCodigo(@RequestBody Map<String, String> body) {
        return authService.verificarCodigo(body.get("desafioId"), body.get("codigo"));
    }

    /**
     * Dirección real de quien llama. En Railway la aplicación está detrás de un
     * proxy, así que la IP directa siempre sería la del proxy: la del visitante
     * viene en X-Forwarded-For, primera de la lista.
     */
    private String ipDe(HttpServletRequest http) {
        String reenviada = http.getHeader("X-Forwarded-For");
        if (reenviada != null && !reenviada.isBlank())
            return reenviada.split(",")[0].trim();
        return http.getRemoteAddr();
    }
}