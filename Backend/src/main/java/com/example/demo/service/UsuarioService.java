package com.example.demo.service;

import com.example.demo.dto.CambiarRolRequest;
import com.example.demo.dto.ResetPasswordRequest;
import com.example.demo.dto.UsuarioDTO;
import com.example.demo.dto.UsuarioRequest;
import com.example.demo.model.Rol;
import com.example.demo.model.Usuario;
import com.example.demo.repository.UsuarioRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    public UsuarioService(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public List<UsuarioDTO> listarUsuarios() {
        return usuarioRepository.findAll().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public UsuarioDTO crearUsuario(UsuarioRequest req) {
        if (usuarioRepository.findByUsername(req.getUsername()).isPresent()) {
            throw new RuntimeException("El usuario ya existe");
        }

        Usuario usuario = new Usuario();
        usuario.setId(UUID.randomUUID().toString());
        usuario.setUsername(req.getUsername());
        usuario.setPassword(passwordEncoder.encode(req.getPassword()));
        usuario.setNombre(req.getNombre());
        usuario.setEmail(req.getEmail());
        usuario.setRol(Rol.valueOf(req.getRol()));
        usuario.setActivo(true);
        usuario.setCreatedAt(LocalDateTime.now());

        return toDTO(usuarioRepository.save(usuario));
    }

    public UsuarioDTO cambiarRol(String id, CambiarRolRequest req) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        usuario.setRol(Rol.valueOf(req.getRol()));
        return toDTO(usuarioRepository.save(usuario));
    }

    public UsuarioDTO toggleActivo(String id) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        usuario.setActivo(!Boolean.TRUE.equals(usuario.getActivo()));
        return toDTO(usuarioRepository.save(usuario));
    }

    public void resetearPassword(String id, ResetPasswordRequest req) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        if (req.getNuevaPassword() == null || req.getNuevaPassword().length() < 6) {
            throw new RuntimeException("La contraseña debe tener al menos 6 caracteres");
        }

        usuario.setPassword(passwordEncoder.encode(req.getNuevaPassword()));
        usuarioRepository.save(usuario);
    }

    private UsuarioDTO toDTO(Usuario u) {
        return new UsuarioDTO(
                u.getId(),
                u.getUsername(),
                u.getNombre(),
                u.getEmail(),
                u.getRol() != null ? u.getRol().name() : null,
                u.getActivo(),
                u.getUltimoLogin() != null ? u.getUltimoLogin().toString() : null,
                u.getCreatedAt() != null ? u.getCreatedAt().toString() : null
        );
    }
}