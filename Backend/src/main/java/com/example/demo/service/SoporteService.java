package com.example.demo.service;

import com.example.demo.model.Notificacion;
import com.example.demo.model.Usuario;
import com.example.demo.repository.NotificacionRepository;
import com.example.demo.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Reportes de incidentes al administrador: se guardan como notificaciones
 * (modulo SOPORTE) y se intenta avisar por correo (best-effort).
 */
@Service
public class SoporteService {

    private final NotificacionRepository notificacionRepository;
    private final UsuarioRepository usuarioRepository;
    private final JavaMailSender mailSender;
    private final AuditoriaService auditoriaService;

    @Value("${spring.mail.username:}")
    private String correoEmpresa;

    public SoporteService(NotificacionRepository notificacionRepository,
                          UsuarioRepository usuarioRepository,
                          JavaMailSender mailSender,
                          AuditoriaService auditoriaService) {
        this.notificacionRepository = notificacionRepository;
        this.usuarioRepository      = usuarioRepository;
        this.mailSender             = mailSender;
        this.auditoriaService       = auditoriaService;
    }

    public List<Notificacion> listarReportes() {
        return notificacionRepository.findByModuloOrderByCreatedAtDesc("SOPORTE");
    }

    @Transactional
    public Notificacion reportar(String severidad, String asunto, String detalle, String usuarioNombre) {
        if (asunto == null || asunto.isBlank())
            throw new RuntimeException("El asunto es obligatorio");
        if (detalle == null || detalle.isBlank())
            throw new RuntimeException("Describe el problema para poder ayudarte");

        Notificacion.Tipo tipo;
        try { tipo = Notificacion.Tipo.valueOf(severidad); }
        catch (Exception e) { tipo = Notificacion.Tipo.WARNING; }

        Usuario usuario = usuarioRepository.findByUsername(usuarioNombre).orElse(null);
        String sucursal = usuario != null && usuario.getSucursalNombre() != null
                ? usuario.getSucursalNombre() : "Sin sucursal";

        Notificacion n = new Notificacion();
        n.setId(UUID.randomUUID().toString());
        n.setTitulo(asunto.trim());
        n.setMensaje("Reportado por: " + usuarioNombre + " (" + sucursal + ")\n\n" + detalle.trim());
        n.setTipo(tipo);
        n.setModulo("SOPORTE");
        n.setUsuarioDestinoId(usuario != null ? usuario.getId() : null);
        n.setLeido(false);
        n.setCreatedAt(LocalDateTime.now());
        notificacionRepository.save(n);

        auditoriaService.registrar("REPORTE", "SOPORTE", n.getId(),
                "[" + tipo.name() + "] " + asunto.trim());

        // Aviso por correo al administrador (no bloquea si falla)
        try {
            if (correoEmpresa != null && !correoEmpresa.isBlank()) {
                SimpleMailMessage msg = new SimpleMailMessage();
                msg.setTo(correoEmpresa);
                msg.setSubject("[SOPORTE " + tipo.name() + "] " + asunto.trim());
                msg.setText(n.getMensaje() + "\n\n— Sistema Administrativo Transportes Rayza");
                mailSender.send(msg);
            }
        } catch (Exception e) {
            System.err.println("No se pudo enviar el correo de soporte: " + e.getMessage());
        }

        return n;
    }

    @Transactional
    public Notificacion marcarAtendido(String id) {
        Notificacion n = notificacionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Reporte no encontrado"));
        n.setLeido(true);
        n.setLeidoAt(LocalDateTime.now());
        return notificacionRepository.save(n);
    }
}
