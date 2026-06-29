package com.example.demo.service;

import com.example.demo.dto.LoginRequest;
import com.example.demo.dto.LoginResponse;
import com.example.demo.model.Usuario;
import com.example.demo.repository.UsuarioRepository;
import com.example.demo.security.JwtUtil;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final JwtUtil jwtUtil;


    public AuthService(UsuarioRepository usuarioRepository, JwtUtil jwtUtil) {

        this.usuarioRepository = usuarioRepository;
        this.jwtUtil = jwtUtil;
    }

    public LoginResponse login(LoginRequest request) {

        Usuario usuario = usuarioRepository
                .findByUsername(request.getUsername())
                .orElse(null);

        if (usuario == null) {
            throw new RuntimeException("Usuario no encontrado");
        }

        if (!usuario.getPassword().equals(request.getPassword())) {
            throw new RuntimeException("Contraseña incorrecta");
        }

        if (!usuario.getActivo()) {
            throw new RuntimeException("Usuario inactivo");
        }

        String token = jwtUtil.generateToken(
                usuario.getUsername(),
                usuario.getRol().name()
        );

        return new LoginResponse(
                token,
                usuario.getUsername(),
                usuario.getNombre(),
                usuario.getRol().name()
        );
    }
}