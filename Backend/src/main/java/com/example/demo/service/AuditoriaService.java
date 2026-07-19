package com.example.demo.service;

import com.example.demo.model.Auditoria;
import com.example.demo.model.Usuario;
import com.example.demo.repository.AuditoriaRepository;
import com.example.demo.repository.UsuarioRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Registro de auditoría: quién hizo qué, en qué módulo y cuándo.
 * El usuario se toma del contexto de seguridad, así ningún servicio
 * necesita cambiar sus firmas para auditar.
 */
@Service
public class AuditoriaService {

    private final AuditoriaRepository auditoriaRepository;
    private final UsuarioRepository usuarioRepository;

    public AuditoriaService(AuditoriaRepository auditoriaRepository,
                            UsuarioRepository usuarioRepository) {
        this.auditoriaRepository = auditoriaRepository;
        this.usuarioRepository   = usuarioRepository;
    }

    public List<Auditoria> listar() {
        return auditoriaRepository.findTop500ByOrderByCreatedAtDesc();
    }

    /** Best-effort: un fallo del registro de auditoría nunca debe romper la operación. */
    public void registrar(String accion, String modulo, String referenciaId, String descripcion) {
        try {
            Auditoria a = new Auditoria();
            a.setId(UUID.randomUUID().toString());
            a.setAccion(accion);
            a.setModulo(modulo);
            a.setReferenciaId(referenciaId);
            a.setDescripcion(descripcion);
            a.setCreatedAt(LocalDateTime.now());

            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getName() != null) {
                a.setUsuarioNombre(auth.getName());
                Usuario u = usuarioRepository.findByUsername(auth.getName()).orElse(null);
                if (u != null) {
                    a.setUsuarioId(u.getId());
                    a.setUsuarioRol(u.getRol() != null ? u.getRol().name() : null);
                }
            }
            auditoriaRepository.save(a);
        } catch (Exception e) {
            System.err.println("No se pudo registrar auditoría: " + e.getMessage());
        }
    }
}
