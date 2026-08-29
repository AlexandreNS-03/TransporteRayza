package com.example.demo.service;

import com.example.demo.dto.ReclamacionDTO;
import com.example.demo.model.Reclamacion;
import com.example.demo.repository.ReclamacionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Libro de Reclamaciones virtual (INDECOPI).
 *
 * El consumidor registra la hoja sin necesidad de tener cuenta: la norma pide que
 * sea de acceso libre desde el mismo medio donde se vende.
 *
 * Nada se borra ni se edita después: solo se agrega la respuesta del proveedor.
 * Las hojas son prueba ante una fiscalización y hay que conservarlas dos años.
 */
@Service
public class ReclamacionService {

    /** Días hábiles que da la norma para responder. */
    public static final int DIAS_HABILES_PARA_RESPONDER = 15;

    private final ReclamacionRepository repositorio;
    private final EmailService emailService;

    public ReclamacionService(ReclamacionRepository repositorio, EmailService emailService) {
        this.repositorio = repositorio;
        this.emailService = emailService;
    }

    /**
     * Registra una hoja y devuelve la copia para el consumidor.
     *
     * Transaccional y con el correlativo calculado dentro: dos personas enviando a
     * la vez no pueden quedarse con el mismo número. Si aun así chocaran, el índice
     * único de la tabla lo impide y se reintenta.
     */
    @Transactional
    public ReclamacionDTO registrar(ReclamacionDTO req) {
        exigir(req.getConsumidorNombre(), "tu nombre");
        exigir(req.getConsumidorDocumento(), "tu número de documento");
        exigir(req.getConsumidorEmail(), "tu correo");
        exigir(req.getDetalle(), "el detalle de lo ocurrido");

        if (req.getConsumidorEmail() != null && !req.getConsumidorEmail().contains("@"))
            throw new RuntimeException("Escribe un correo válido: ahí te llega tu copia.");

        Reclamacion r = new Reclamacion();
        r.setId(UUID.randomUUID().toString());
        r.setNumero(repositorio.ultimoNumero() + 1);
        r.setCreatedAt(LocalDateTime.now());
        r.setEstado(Reclamacion.Estado.PENDIENTE);
        r.setTipo(parseTipo(req.getTipo()));

        r.setConsumidorNombre(limpiar(req.getConsumidorNombre()));
        r.setConsumidorTipoDocumento(limpiar(req.getConsumidorTipoDocumento()));
        r.setConsumidorDocumento(limpiar(req.getConsumidorDocumento()));
        r.setConsumidorDomicilio(limpiar(req.getConsumidorDomicilio()));
        r.setConsumidorEmail(limpiar(req.getConsumidorEmail()));
        r.setConsumidorTelefono(limpiar(req.getConsumidorTelefono()));

        boolean menor = Boolean.TRUE.equals(req.getMenorDeEdad());
        r.setMenorDeEdad(menor);
        if (menor) {
            // La norma pide identificar al padre o representante cuando es menor.
            exigir(req.getApoderadoNombre(), "el nombre de tu padre, madre o apoderado");
            r.setApoderadoNombre(limpiar(req.getApoderadoNombre()));
            r.setApoderadoDocumento(limpiar(req.getApoderadoDocumento()));
        }

        r.setBienTipo(parseBien(req.getBienTipo()));
        r.setBienDescripcion(limpiar(req.getBienDescripcion()));
        r.setMontoReclamado(req.getMontoReclamado());
        r.setDetalle(limpiar(req.getDetalle()));
        r.setPedido(limpiar(req.getPedido()));

        Reclamacion guardada = repositorio.save(r);

        // La copia por correo la exige la norma; si el envío falla no se pierde la
        // hoja, que ya quedó registrada y se puede descargar desde la pantalla.
        try {
            emailService.enviarCopiaReclamacion(guardada);
        } catch (Exception e) {
            System.err.println("[Reclamaciones] no se pudo enviar la copia de la hoja "
                    + guardada.getNumero() + ": " + e.getMessage());
        }

        return toDTO(guardada);
    }

    @Transactional(readOnly = true)
    public List<ReclamacionDTO> listar() {
        return repositorio.findAllByOrderByNumeroDesc().stream()
                .map(this::toDTO).collect(Collectors.toList());
    }

    /** Registra la respuesta del proveedor. La hoja original no se toca. */
    @Transactional
    public ReclamacionDTO responder(String id, String respuesta, String usuario) {
        exigir(respuesta, "la respuesta");
        Reclamacion r = repositorio.findById(id)
                .orElseThrow(() -> new RuntimeException("Esa hoja no existe"));

        r.setRespuesta(limpiar(respuesta));
        r.setRespondidoAt(LocalDateTime.now());
        r.setRespondidoPor(usuario);
        r.setEstado(Reclamacion.Estado.RESPONDIDO);

        Reclamacion guardada = repositorio.save(r);
        try {
            emailService.enviarRespuestaReclamacion(guardada);
        } catch (Exception e) {
            System.err.println("[Reclamaciones] no se pudo avisar la respuesta de la hoja "
                    + guardada.getNumero() + ": " + e.getMessage());
        }
        return toDTO(guardada);
    }

    /**
     * Fecha límite para responder, contando solo días hábiles.
     *
     * Sábados y domingos no cuentan. Los feriados sí quedan contados: llevar el
     * calendario de feriados sería otra cosa que mantener, y equivocarse hacia el
     * lado corto es lo seguro —se responde antes, no después—.
     */
    public static java.time.LocalDate limiteParaResponder(java.time.LocalDate desde) {
        java.time.LocalDate d = desde;
        int restantes = DIAS_HABILES_PARA_RESPONDER;
        while (restantes > 0) {
            d = d.plusDays(1);
            java.time.DayOfWeek dia = d.getDayOfWeek();
            if (dia != java.time.DayOfWeek.SATURDAY && dia != java.time.DayOfWeek.SUNDAY) restantes--;
        }
        return d;
    }

    private Reclamacion.Tipo parseTipo(String v) {
        if (v == null) throw new RuntimeException("Indica si es un reclamo o una queja");
        try { return Reclamacion.Tipo.valueOf(v.trim().toUpperCase()); }
        catch (IllegalArgumentException e) { throw new RuntimeException("Indica si es un reclamo o una queja"); }
    }

    private Reclamacion.BienTipo parseBien(String v) {
        if (v == null || v.isBlank()) return null;
        try { return Reclamacion.BienTipo.valueOf(v.trim().toUpperCase()); }
        catch (IllegalArgumentException e) { return null; }
    }

    private void exigir(String v, String queFalta) {
        if (v == null || v.trim().isEmpty())
            throw new RuntimeException("Falta " + queFalta + ".");
    }

    private String limpiar(String v) { return v == null ? null : v.trim(); }

    private ReclamacionDTO toDTO(Reclamacion r) {
        ReclamacionDTO d = new ReclamacionDTO();
        d.setId(r.getId());
        d.setNumero(r.getNumero());
        d.setCreatedAt(r.getCreatedAt() != null ? r.getCreatedAt().toString() : null);
        d.setTipo(r.getTipo() != null ? r.getTipo().name() : null);
        d.setConsumidorNombre(r.getConsumidorNombre());
        d.setConsumidorTipoDocumento(r.getConsumidorTipoDocumento());
        d.setConsumidorDocumento(r.getConsumidorDocumento());
        d.setConsumidorDomicilio(r.getConsumidorDomicilio());
        d.setConsumidorEmail(r.getConsumidorEmail());
        d.setConsumidorTelefono(r.getConsumidorTelefono());
        d.setMenorDeEdad(r.getMenorDeEdad());
        d.setApoderadoNombre(r.getApoderadoNombre());
        d.setApoderadoDocumento(r.getApoderadoDocumento());
        d.setBienTipo(r.getBienTipo() != null ? r.getBienTipo().name() : null);
        d.setBienDescripcion(r.getBienDescripcion());
        d.setMontoReclamado(r.getMontoReclamado());
        d.setDetalle(r.getDetalle());
        d.setPedido(r.getPedido());
        d.setEstado(r.getEstado() != null ? r.getEstado().name() : null);
        d.setRespuesta(r.getRespuesta());
        d.setRespondidoAt(r.getRespondidoAt() != null ? r.getRespondidoAt().toString() : null);
        if (r.getCreatedAt() != null)
            d.setLimiteRespuesta(limiteParaResponder(r.getCreatedAt().toLocalDate()).toString());
        return d;
    }
}
