package com.example.demo.controller;

import com.example.demo.dto.ClienteAuthResponse;
import com.example.demo.dto.ClienteRegisterRequest;
import com.example.demo.service.ClienteService;
import com.example.demo.service.RecuperacionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** Registro e inicio de sesión de clientes (público, bajo /auth). */
@RestController
@RequestMapping("/auth/cliente")
public class ClienteAuthController {

    private final ClienteService clienteService;
    private final RecuperacionService recuperacionService;

    public ClienteAuthController(ClienteService clienteService,
                                 RecuperacionService recuperacionService) {
        this.clienteService = clienteService;
        this.recuperacionService = recuperacionService;
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

    /**
     * Pide el enlace para recuperar la contraseña.
     *
     * Responde lo mismo exista o no el correo: decir "ese correo no está
     * registrado" dejaría que cualquiera averigüe quién tiene cuenta.
     */
    @PostMapping("/olvide-mi-clave")
    public ResponseEntity<?> olvideMiClave(@RequestBody Map<String, String> body) {
        recuperacionService.pedirEnlace(body.get("email"));
        return ResponseEntity.ok(Map.of("message",
                "Si ese correo tiene una cuenta, te enviamos un enlace para cambiar tu contraseña."));
    }

    /** Cambia la contraseña con el enlace del correo. */
    @PostMapping("/restablecer")
    public ResponseEntity<?> restablecer(@RequestBody Map<String, String> body) {
        recuperacionService.restablecer(body.get("token"), body.get("password"));
        return ResponseEntity.ok(Map.of("message", "Tu contraseña quedó cambiada. Ya puedes entrar."));
    }
}
