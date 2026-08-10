package com.example.demo.service;

import com.example.demo.dto.LoginRequest;
import com.example.demo.dto.LoginResponse;
import com.example.demo.model.Usuario;
import com.example.demo.repository.UsuarioRepository;
import com.example.demo.security.JwtUtil;
import org.springframework.stereotype.Service;
import org.springframework.security.crypto.password.PasswordEncoder;

@Service
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;
    private final IntentosLoginService intentosLoginService;

    public AuthService(UsuarioRepository usuarioRepository, JwtUtil jwtUtil,
                       PasswordEncoder passwordEncoder,
                       IntentosLoginService intentosLoginService) {
        this.usuarioRepository = usuarioRepository;
        this.jwtUtil = jwtUtil;
        this.passwordEncoder = passwordEncoder;
        this.intentosLoginService = intentosLoginService;
    }

    public LoginResponse login(LoginRequest request, String ip) {
        // Antes de mirar nada: si vienen de fallar muchas veces, ni se intenta.
        intentosLoginService.verificar(request.getUsername(), ip);

        Usuario usuario = usuarioRepository.findByUsername(request.getUsername())
                .orElse(null);

        // Mismo mensaje para usuario inexistente que para contraseña equivocada: si
        // fueran distintos, probando nombres se averigua quiénes tienen cuenta.
        if (usuario == null || !passwordEncoder.matches(request.getPassword(), usuario.getPassword())) {
            intentosLoginService.registrarFallo(request.getUsername(), ip);
            throw new RuntimeException("Usuario o contraseña incorrectos");
        }

        // Recién con la contraseña correcta tiene sentido explicar que está inactivo:
        // así el aviso le sirve al empleado sin revelarle nada a un extraño.
        if (!usuario.getActivo()) {
            throw new RuntimeException("Usuario inactivo");
        }

        intentosLoginService.registrarExito(request.getUsername(), ip);

        String token = jwtUtil.generateToken(usuario.getUsername(), usuario.getRol().name());

        return new LoginResponse(token, usuario.getUsername(), usuario.getNombre(), usuario.getRol().name(),
                usuario.getSucursalId(), usuario.getSucursalNombre());
    }
}