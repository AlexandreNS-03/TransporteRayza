package com.example.demo.service;

import com.example.demo.model.Auditoria;
import com.example.demo.model.Usuario;
import com.example.demo.repository.AuditoriaRepository;
import com.example.demo.repository.UsuarioRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
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

    /**
     * Desde qué equipo se hizo.
     *
     * La columna existía desde el principio y nunca se llenó. Con dos personas
     * compartiendo un turno en el mismo mostrador, el usuario no siempre alcanza
     * para saber quién fue; la máquina ayuda a acotarlo. Se respeta
     * `X-Forwarded-For` porque en Railway la petición llega por un proxy y, sin
     * eso, todas las IP serían la misma.
     */
    private String ipDeQuienPide() {
        try {
            var attrs = (org.springframework.web.context.request.ServletRequestAttributes)
                    org.springframework.web.context.request.RequestContextHolder.getRequestAttributes();
            if (attrs == null) return null;   // tareas programadas, sin petición detrás
            var req = attrs.getRequest();
            String reenviada = req.getHeader("X-Forwarded-For");
            if (reenviada != null && !reenviada.isBlank())
                return reenviada.split(",")[0].trim();
            return req.getRemoteAddr();
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Lo registrado en un rango, con los filtros que se usen en la pantalla.
     *
     * Los filtros van acá y no solo en el navegador porque la pantalla trabaja
     * con los últimos 500 movimientos: buscar "quién movió ese viaje el martes
     * pasado" sobre esos 500 no encuentra nada si desde entonces hubo más.
     */
    public List<Auditoria> buscar(LocalDate desde, LocalDate hasta, String usuario,
                                  String modulo, String accion, String texto) {
        List<Auditoria> base = (desde != null || hasta != null)
                ? auditoriaRepository.findByCreatedAtBetweenOrderByCreatedAtDesc(
                        (desde != null ? desde : LocalDate.of(2000, 1, 1)).atStartOfDay(),
                        (hasta != null ? hasta : LocalDate.now()).atTime(23, 59, 59))
                : auditoriaRepository.findTop500ByOrderByCreatedAtDesc();

        String q = texto == null ? null : texto.trim().toLowerCase();
        return base.stream()
                .filter(a -> vacio(usuario) || usuario.equalsIgnoreCase(a.getUsuarioNombre()))
                .filter(a -> vacio(modulo)  || modulo.equalsIgnoreCase(a.getModulo()))
                .filter(a -> vacio(accion)  || accion.equalsIgnoreCase(a.getAccion()))
                .filter(a -> q == null || q.isBlank()
                        || (a.getDescripcion() != null && a.getDescripcion().toLowerCase().contains(q))
                        || (a.getUsuarioNombre() != null && a.getUsuarioNombre().toLowerCase().contains(q)))
                .toList();
    }

    private static boolean vacio(String s) { return s == null || s.isBlank() || "Todos".equalsIgnoreCase(s); }

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
            a.setIpOrigen(ipDeQuienPide());
            auditoriaRepository.save(a);
        } catch (Exception e) {
            System.err.println("No se pudo registrar auditoría: " + e.getMessage());
        }
    }
}
