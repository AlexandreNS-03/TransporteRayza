package com.example.demo.service;

import com.example.demo.dto.ClienteAuthResponse;
import com.example.demo.dto.ClienteDTO;
import com.example.demo.dto.ClienteRegisterRequest;
import com.example.demo.dto.ClienteViajeDTO;
import com.example.demo.model.Cliente;
import com.example.demo.model.Venta;
import com.example.demo.model.Viaje;
import com.example.demo.repository.ClienteRepository;
import com.example.demo.repository.VentaRepository;
import com.example.demo.repository.ViajeRepository;
import com.example.demo.security.JwtUtil;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ClienteService {

    private final ClienteRepository clienteRepository;
    private final VentaRepository ventaRepository;
    private final ViajeRepository viajeRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public ClienteService(ClienteRepository clienteRepository,
                          VentaRepository ventaRepository,
                          ViajeRepository viajeRepository,
                          PasswordEncoder passwordEncoder,
                          JwtUtil jwtUtil) {
        this.clienteRepository = clienteRepository;
        this.ventaRepository = ventaRepository;
        this.viajeRepository = viajeRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    @Transactional
    public ClienteAuthResponse registrar(ClienteRegisterRequest req) {
        String email = normalizarEmail(req.getEmail());
        if (email.isBlank() || req.getPassword() == null || req.getPassword().length() < 6)
            throw new RuntimeException("Correo y contraseña (mín. 6 caracteres) son obligatorios");
        if (clienteRepository.existsByEmail(email))
            throw new RuntimeException("Ya existe una cuenta con ese correo");

        Cliente c = new Cliente();
        c.setId(UUID.randomUUID().toString());
        c.setEmail(email);
        c.setPassword(passwordEncoder.encode(req.getPassword()));
        c.setNombres(req.getNombres());
        c.setApellidos(req.getApellidos());
        c.setTipoDocumento(parseTipoDoc(req.getTipoDocumento()));
        c.setNumeroDocumento(req.getNumeroDocumento());
        c.setPaisDocumento(req.getPaisDocumento() != null ? req.getPaisDocumento() : "PE");
        c.setFechaNacimiento(parseFecha(req.getFechaNacimiento()));
        c.setCodigoPaisTelefono(req.getCodigoPaisTelefono() != null ? req.getCodigoPaisTelefono() : "+51");
        c.setTelefono(req.getTelefono());
        c.setActivo(true);
        c.setCreatedAt(LocalDateTime.now());
        clienteRepository.save(c);

        return construirRespuesta(c);
    }

    @Transactional
    public ClienteAuthResponse login(String email, String password) {
        Cliente c = clienteRepository.findByEmail(normalizarEmail(email))
                .orElseThrow(() -> new RuntimeException("Correo o contraseña incorrectos"));
        if (Boolean.FALSE.equals(c.getActivo()))
            throw new RuntimeException("La cuenta está desactivada");
        if (!passwordEncoder.matches(password, c.getPassword()))
            throw new RuntimeException("Correo o contraseña incorrectos");

        c.setUltimoLogin(LocalDateTime.now());
        clienteRepository.save(c);
        return construirRespuesta(c);
    }

    public Cliente obtenerPorEmail(String email) {
        return clienteRepository.findByEmail(normalizarEmail(email))
                .orElseThrow(() -> new RuntimeException("Cliente no encontrado"));
    }

    public ClienteDTO perfil(String email) { return toDTO(obtenerPorEmail(email)); }

    @Transactional
    public ClienteDTO actualizarPerfil(String email, ClienteDTO datos) {
        Cliente c = obtenerPorEmail(email);
        if (datos.getNombres() != null) c.setNombres(datos.getNombres());
        if (datos.getApellidos() != null) c.setApellidos(datos.getApellidos());
        if (datos.getTipoDocumento() != null) c.setTipoDocumento(parseTipoDoc(datos.getTipoDocumento()));
        if (datos.getNumeroDocumento() != null) c.setNumeroDocumento(datos.getNumeroDocumento());
        if (datos.getPaisDocumento() != null) c.setPaisDocumento(datos.getPaisDocumento());
        if (datos.getFechaNacimiento() != null) c.setFechaNacimiento(parseFecha(datos.getFechaNacimiento()));
        if (datos.getCodigoPaisTelefono() != null) c.setCodigoPaisTelefono(datos.getCodigoPaisTelefono());
        if (datos.getTelefono() != null) c.setTelefono(datos.getTelefono());
        clienteRepository.save(c);
        return toDTO(c);
    }

    public List<ClienteViajeDTO> misViajes(String email) {
        Cliente c = obtenerPorEmail(email);
        LocalDate hoy = LocalDate.now();
        return ventaRepository.findByClienteIdOrderByCreatedAtDesc(c.getId()).stream()
                .map(v -> toViajeDTO(v, hoy))
                .collect(Collectors.toList());
    }

    private ClienteViajeDTO toViajeDTO(Venta v, LocalDate hoy) {
        ClienteViajeDTO dto = new ClienteViajeDTO();
        dto.setVentaId(v.getId());
        dto.setViajeCodigo(v.getViajeCodigo());
        dto.setRuta((v.getParadaOrigen() != null ? v.getParadaOrigen() : "")
                + " → " + (v.getParadaDestino() != null ? v.getParadaDestino() : ""));
        dto.setAsientoNumero(v.getAsientoNumero());
        dto.setAsientoTipo(v.getAsientoTipo() != null ? v.getAsientoTipo().name() : null);
        dto.setPrecio(v.getPrecio());
        dto.setEstado(v.getEstado() != null ? v.getEstado().name() : null);
        dto.setEmbarqueEstado(v.getEmbarqueEstado() != null ? v.getEmbarqueEstado().name() : null);
        dto.setCodigoQr(v.getCodigoQr());

        Viaje viaje = v.getViajeId() != null ? viajeRepository.findById(v.getViajeId()).orElse(null) : null;
        if (viaje != null) {
            dto.setFechaSalida(viaje.getFechaSalida() != null ? viaje.getFechaSalida().toString() : null);
            dto.setHoraSalida(viaje.getHoraSalida() != null ? viaje.getHoraSalida().toString() : null);
            dto.setProximo(viaje.getFechaSalida() != null && !viaje.getFechaSalida().isBefore(hoy));
        }
        return dto;
    }

    private ClienteAuthResponse construirRespuesta(Cliente c) {
        return new ClienteAuthResponse(jwtUtil.generateToken(c.getEmail(), "CLIENTE"), toDTO(c));
    }

    private ClienteDTO toDTO(Cliente c) {
        ClienteDTO dto = new ClienteDTO();
        dto.setId(c.getId());
        dto.setEmail(c.getEmail());
        dto.setNombres(c.getNombres());
        dto.setApellidos(c.getApellidos());
        dto.setTipoDocumento(c.getTipoDocumento() != null ? c.getTipoDocumento().name() : null);
        dto.setNumeroDocumento(c.getNumeroDocumento());
        dto.setPaisDocumento(c.getPaisDocumento());
        dto.setFechaNacimiento(c.getFechaNacimiento() != null ? c.getFechaNacimiento().toString() : null);
        dto.setCodigoPaisTelefono(c.getCodigoPaisTelefono());
        dto.setTelefono(c.getTelefono());
        return dto;
    }

    private String normalizarEmail(String email) { return email == null ? "" : email.trim().toLowerCase(); }

    private Cliente.TipoDocumento parseTipoDoc(String s) {
        try { return Cliente.TipoDocumento.valueOf(s); }
        catch (Exception e) { return Cliente.TipoDocumento.DNI; }
    }

    private LocalDate parseFecha(String s) {
        if (s == null || s.isBlank()) return null;
        try { return LocalDate.parse(s); } catch (Exception e) { return null; }
    }
}
