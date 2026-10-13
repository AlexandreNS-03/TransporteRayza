package com.example.demo.controller;

import com.example.demo.dto.ClienteAuthResponse;
import com.example.demo.dto.ClienteRegisterRequest;
import com.example.demo.service.ClienteService;
import com.example.demo.service.RecuperacionService;
import com.example.demo.service.VerificacionEmailService;
import jakarta.servlet.http.HttpServletRequest;
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
    private final VerificacionEmailService verificacionEmailService;

    public ClienteAuthController(ClienteService clienteService,
                                 RecuperacionService recuperacionService,
                                 VerificacionEmailService verificacionEmailService) {
        this.clienteService = clienteService;
        this.recuperacionService = recuperacionService;
        this.verificacionEmailService = verificacionEmailService;
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
    public ClienteAuthResponse login(@RequestBody Map<String, String> body,
                                     HttpServletRequest http) {
        return clienteService.login(body.get("email"), body.get("password"), ipDe(http));
    }

    /**
     * Detrás de Railway la petición llega por un proxy, así que getRemoteAddr()
     * devuelve siempre la misma: la del proxy. La del visitante viene en
     * X-Forwarded-For, primera de la lista.
     */
    private String ipDe(HttpServletRequest http) {
        String reenviada = http.getHeader("X-Forwarded-For");
        if (reenviada != null && !reenviada.isBlank())
            return reenviada.split(",")[0].trim();
        return http.getRemoteAddr();
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

    /**
     * Confirma el correo con el token del enlace.
     *
     * Es público porque quien hace clic viene desde su bandeja, sin sesión
     * abierta. La única llave es el token: vence en una hora y se quema al
     * usarlo.
     */
    @PostMapping("/verificar-correo")
    public ResponseEntity<?> verificarCorreo(@RequestBody Map<String, String> body) {
        String email = verificacionEmailService.confirmar(body.get("token"));
        return ResponseEntity.ok(Map.of(
                "message", "Listo, confirmamos " + email + ".",
                "email", email));
    }

    /** Cambia la contraseña con el enlace del correo. */
    @PostMapping("/restablecer")
    public ResponseEntity<?> restablecer(@RequestBody Map<String, String> body) {
        recuperacionService.restablecer(body.get("token"), body.get("password"));
        return ResponseEntity.ok(Map.of("message", "Tu contraseña quedó cambiada. Ya puedes entrar."));
    }
}
