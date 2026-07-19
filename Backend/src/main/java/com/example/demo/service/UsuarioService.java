package com.example.demo.service;

import com.example.demo.dto.CambiarRolRequest;
import com.example.demo.dto.ResetPasswordRequest;
import com.example.demo.dto.UsuarioDTO;
import com.example.demo.dto.UsuarioRequest;
import com.example.demo.model.Rol;
import com.example.demo.model.Sucursal;
import com.example.demo.model.Usuario;
import com.example.demo.repository.SucursalRepository;
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
    private final SucursalRepository sucursalRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditoriaService auditoriaService;

    public UsuarioService(UsuarioRepository usuarioRepository,
                          SucursalRepository sucursalRepository,
                          PasswordEncoder passwordEncoder,
                          AuditoriaService auditoriaService) {
        this.usuarioRepository = usuarioRepository;
        this.sucursalRepository = sucursalRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditoriaService = auditoriaService;
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
        asignarSucursal(usuario, req.getSucursalId());
        UsuarioDTO creado = toDTO(usuarioRepository.save(usuario));

        auditoriaService.registrar("CREAR", "USUARIOS", usuario.getId(),
                "Usuario " + usuario.getUsername() + " con rol " + usuario.getRol()
                        + (usuario.getSucursalNombre() != null ? " en " + usuario.getSucursalNombre() : ""));
        return creado;
    }

    public UsuarioDTO cambiarSucursal(String id, String sucursalId) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        asignarSucursal(usuario, sucursalId);
        UsuarioDTO dto = toDTO(usuarioRepository.save(usuario));

        auditoriaService.registrar("CAMBIAR_SUCURSAL", "USUARIOS", id,
                "Usuario " + usuario.getUsername() + " → sucursal "
                        + (usuario.getSucursalNombre() != null ? usuario.getSucursalNombre() : "Todas"));
        return dto;
    }

    // sucursalId null o vacío = sin restricción (todas las sucursales)
    private void asignarSucursal(Usuario usuario, String sucursalId) {
        if (sucursalId == null || sucursalId.isBlank()) {
            usuario.setSucursalId(null);
            usuario.setSucursalNombre(null);
            return;
        }
        Sucursal sucursal = sucursalRepository.findById(sucursalId)
                .orElseThrow(() -> new RuntimeException("Sucursal no encontrada"));
        usuario.setSucursalId(sucursal.getId());
        usuario.setSucursalNombre(sucursal.getNombre());
    }

    public UsuarioDTO cambiarRol(String id, CambiarRolRequest req) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        Rol anterior = usuario.getRol();
        usuario.setRol(Rol.valueOf(req.getRol()));
        UsuarioDTO dto = toDTO(usuarioRepository.save(usuario));

        auditoriaService.registrar("CAMBIAR_ROL", "USUARIOS", id,
                "Usuario " + usuario.getUsername() + ": " + anterior + " → " + usuario.getRol());
        return dto;
    }

    public UsuarioDTO toggleActivo(String id) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        usuario.setActivo(!Boolean.TRUE.equals(usuario.getActivo()));
        UsuarioDTO dto = toDTO(usuarioRepository.save(usuario));

        auditoriaService.registrar(Boolean.TRUE.equals(usuario.getActivo()) ? "ACTIVAR" : "DESACTIVAR",
                "USUARIOS", id, "Usuario " + usuario.getUsername());
        return dto;
    }

    public void resetearPassword(String id, ResetPasswordRequest req) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        if (req.getNuevaPassword() == null || req.getNuevaPassword().length() < 6) {
            throw new RuntimeException("La contraseña debe tener al menos 6 caracteres");
        }

        usuario.setPassword(passwordEncoder.encode(req.getNuevaPassword()));
        usuarioRepository.save(usuario);

        auditoriaService.registrar("RESETEAR_PASSWORD", "USUARIOS", id,
                "Usuario " + usuario.getUsername());
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
                u.getCreatedAt() != null ? u.getCreatedAt().toString() : null,
                u.getSucursalId(),
                u.getSucursalNombre()
        );
    }
}