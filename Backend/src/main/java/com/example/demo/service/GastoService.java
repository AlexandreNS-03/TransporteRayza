package com.example.demo.service;

import com.example.demo.dto.GastoRequest;
import com.example.demo.model.Gasto;
import com.example.demo.model.MovimientoCaja;
import com.example.demo.model.Usuario;
import com.example.demo.repository.GastoRepository;
import com.example.demo.repository.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class GastoService {

    private final GastoRepository gastoRepository;
    private final UsuarioRepository usuarioRepository;
    private final CajaService cajaService;
    private final AuditoriaService auditoriaService;

    public GastoService(GastoRepository gastoRepository,
                        UsuarioRepository usuarioRepository,
                        CajaService cajaService,
                        AuditoriaService auditoriaService) {
        this.gastoRepository   = gastoRepository;
        this.usuarioRepository = usuarioRepository;
        this.cajaService       = cajaService;
        this.auditoriaService  = auditoriaService;
    }

    public List<Gasto> listar() {
        return gastoRepository.findAllByOrderByFechaDesc();
    }

    @Transactional
    public Gasto crear(GastoRequest req, String usuarioNombre) {
        if (req.getMonto() == null || req.getMonto().signum() <= 0)
            throw new RuntimeException("El monto del gasto debe ser mayor a cero");
        if (req.getDescripcion() == null || req.getDescripcion().isBlank())
            throw new RuntimeException("La descripción del gasto es obligatoria");

        Usuario usuario = usuarioRepository.findByUsername(usuarioNombre).orElse(null);

        Gasto g = new Gasto();
        g.setId(UUID.randomUUID().toString());
        g.setFecha(req.getFecha() != null && !req.getFecha().isBlank()
                ? LocalDate.parse(req.getFecha()) : LocalDate.now());
        g.setCategoria(req.getCategoria() != null && !req.getCategoria().isBlank()
                ? req.getCategoria() : "OTROS");
        g.setDescripcion(req.getDescripcion().trim());
        g.setMonto(req.getMonto());
        g.setObservacion(req.getObservacion());
        if (usuario != null) {
            g.setResponsableId(usuario.getId());
            g.setResponsableNombre(usuario.getNombre());
            g.setSucursalId(usuario.getSucursalId());
            g.setSucursalNombre(usuario.getSucursalNombre());
        } else {
            g.setResponsableNombre(usuarioNombre);
        }
        g.setCreatedAt(LocalDateTime.now());
        gastoRepository.save(g);

        // Si el gasto se pagó con dinero de la caja, registrar el egreso
        if (req.isAfectaCaja()) {
            cajaService.registrarMovimientoAutomatico(usuarioNombre,
                    MovimientoCaja.TipoMovimiento.EGRESO,
                    g.getMonto(),
                    "Gasto: " + g.getCategoria() + " — " + g.getDescripcion());
        }

        auditoriaService.registrar("CREAR", "GASTOS", g.getId(),
                g.getCategoria() + " — " + g.getDescripcion() + " (S/ " + g.getMonto() + ")");

        return g;
    }

    @Transactional
    public void eliminar(String id) {
        Gasto g = gastoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Gasto no encontrado"));
        gastoRepository.deleteById(id);

        auditoriaService.registrar("ELIMINAR", "GASTOS", id,
                g.getCategoria() + " — " + g.getDescripcion() + " (S/ " + g.getMonto() + ")");
    }
}
