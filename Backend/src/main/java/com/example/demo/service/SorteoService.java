package com.example.demo.service;

import com.example.demo.model.CuponSorteo;
import com.example.demo.model.Sorteo;
import com.example.demo.model.Venta;
import com.example.demo.repository.CuponSorteoRepository;
import com.example.demo.repository.SorteoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Sorteo promocional entre quienes viajaron.
 *
 * Cada pasaje vendido genera un cupón cuyo código va impreso en el ticket. La
 * persona lo registra en la web y recién ahí participa: sin registro no habría
 * a quién avisarle si gana.
 *
 * Un asiento VIP pesa 2, o sea el doble de probabilidad.
 *
 * EL GANADOR SE ELIGE ACÁ, en el servidor, y queda guardado con la fecha y con
 * cuántos cupones participaron. La ruleta del navegador es solo la animación:
 * si el navegador eligiera, cualquiera con la consola abierta podría ganar, y
 * ante un reclamo no habría cómo demostrar que fue limpio.
 */
@Service
public class SorteoService {

    /** Sin I, O, 1 ni 0: se confunden al leerlos de un ticket impreso. */
    private static final String ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int LARGO_CODIGO = 8;

    private final SorteoRepository sorteoRepository;
    private final CuponSorteoRepository cuponRepository;
    private final SorteoVivoService vivo;
    private final SecureRandom aleatorio = new SecureRandom();

    public SorteoService(SorteoRepository sorteoRepository,
                         CuponSorteoRepository cuponRepository,
                         SorteoVivoService vivo) {
        this.sorteoRepository = sorteoRepository;
        this.cuponRepository = cuponRepository;
        this.vivo = vivo;
    }

    // ------------------------------------------------------------ Cupones

    /**
     * Genera el cupón de una venta, si hay un sorteo abierto.
     *
     * No revienta si algo falla: una venta no se puede caer porque el sorteo no
     * esté configurado. Es una promoción, no parte del cobro.
     */
    public void generarCuponDe(Venta venta) {
        try {
            Sorteo abierto = sorteoRepository.findFirstByEstado(Sorteo.Estado.ABIERTO).orElse(null);
            if (abierto == null) return;
            if (venta.getId() == null) return;
            if (cuponRepository.findByVentaId(venta.getId()).isPresent()) return;

            CuponSorteo c = new CuponSorteo();
            c.setId(UUID.randomUUID().toString());
            c.setSorteoId(abierto.getId());
            c.setCodigo(codigoLibre());
            c.setVentaId(venta.getId());
            c.setPasajeroNombre(venta.getPasajeroNombre());
            c.setPasajeroDocumento(venta.getPasajeroDocumento());
            // El VIP vale doble: es parte de lo que se le ofrece a quien paga más.
            c.setPeso(venta.getAsientoTipo() == Venta.AsientoTipo.VIP ? 2 : 1);
            c.setCreatedAt(LocalDateTime.now());
            cuponRepository.save(c);

        } catch (Exception e) {
            System.err.println("[Sorteo] no se pudo generar el cupón de la venta "
                    + venta.getId() + ": " + e.getMessage());
        }
    }

    /** El código impreso en el ticket de una venta, o null si no tiene. */
    public String codigoDeVenta(String ventaId) {
        if (ventaId == null) return null;
        return cuponRepository.findByVentaId(ventaId).map(CuponSorteo::getCodigo).orElse(null);
    }

    /**
     * Registra un cupón para que participe.
     *
     * Pide cómo ubicar a la persona: sin eso, ganar no serviría de nada.
     */
    @Transactional
    public CuponSorteo registrar(String codigo, String email, String telefono) {
        if (codigo == null || codigo.isBlank())
            throw new RuntimeException("Escribe el código que está en tu ticket.");

        String limpio = codigo.trim().toUpperCase().replace(" ", "").replace("-", "");
        CuponSorteo c = cuponRepository.findByCodigo(limpio)
                .orElseThrow(() -> new RuntimeException(
                        "Ese código no existe. Revísalo: está en tu ticket de embarque."));

        Sorteo s = sorteoRepository.findById(c.getSorteoId())
                .orElseThrow(() -> new RuntimeException("Ese sorteo ya no existe"));

        if (s.getEstado() == Sorteo.Estado.SORTEADO)
            throw new RuntimeException("Este sorteo ya se realizó.");
        if (s.getEstado() != Sorteo.Estado.ABIERTO)
            throw new RuntimeException("El registro para este sorteo está cerrado.");

        if (c.estaRegistrado())
            throw new RuntimeException("Ese código ya estaba registrado. Ya estás participando.");

        if (email == null || !email.contains("@"))
            throw new RuntimeException("Escribe un correo válido: por ahí te avisamos si ganas.");

        c.setEmail(email.trim().toLowerCase());
        c.setTelefono(telefono != null ? telefono.trim() : null);
        c.setRegistradoAt(LocalDateTime.now());
        CuponSorteo guardado = cuponRepository.save(c);

        vivo.avisarNuevoParticipante(s.getId(), cuponRepository.participantesDe(s.getId()).size(), guardado);
        return guardado;
    }

    // ------------------------------------------------------------ El sorteo

    /**
     * Elige al ganador. Una sola vez y sin vuelta atrás.
     *
     * El peso se respeta repartiendo un número al azar sobre la suma total: un
     * cupón VIP ocupa el doble de espacio que uno normal, así que sale el doble
     * de veces. Es más simple y más justo que duplicar filas.
     */
    @Transactional
    public Sorteo ejecutar(String sorteoId, String usuario) {
        Sorteo s = sorteoRepository.findById(sorteoId)
                .orElseThrow(() -> new RuntimeException("Ese sorteo no existe"));

        // Sin esto, alguien podría volver a sortear hasta que salga quien quiere.
        if (s.getEstado() == Sorteo.Estado.SORTEADO)
            throw new RuntimeException("Este sorteo ya tiene ganador. No se puede repetir.");

        List<CuponSorteo> participantes = cuponRepository.participantesDe(sorteoId);
        if (participantes.isEmpty())
            throw new RuntimeException("Todavía nadie registró su código: no hay entre quiénes sortear.");

        CuponSorteo ganador = elegirPonderado(participantes);

        s.setCuponGanadorId(ganador.getId());
        s.setSorteadoAt(LocalDateTime.now());
        s.setSorteadoPor(usuario);
        s.setCuponesParticipantes(participantes.size());
        s.setEstado(Sorteo.Estado.SORTEADO);
        Sorteo guardado = sorteoRepository.save(s);

        vivo.avisarGanador(sorteoId, ganador, participantes.size());
        return guardado;
    }

    /**
     * Uno al azar, respetando el peso. Visible para poder probarlo.
     *
     * `aleatorio` es SecureRandom y no Math.random: en un sorteo con premio, un
     * generador predecible es una puerta abierta.
     */
    CuponSorteo elegirPonderado(List<CuponSorteo> cupones) {
        int total = cupones.stream().mapToInt(c -> Math.max(1, c.getPeso() == null ? 1 : c.getPeso())).sum();
        int punto = aleatorio.nextInt(total);

        int acumulado = 0;
        for (CuponSorteo c : cupones) {
            acumulado += Math.max(1, c.getPeso() == null ? 1 : c.getPeso());
            if (punto < acumulado) return c;
        }
        return cupones.get(cupones.size() - 1);   // por redondeo; no debería llegar
    }

    private String codigoLibre() {
        for (int intento = 0; intento < 20; intento++) {
            String c = generarCodigo();
            if (cuponRepository.findByCodigo(c).isEmpty()) return c;
        }
        throw new RuntimeException("No se pudo generar un código libre");
    }

    private String generarCodigo() {
        StringBuilder sb = new StringBuilder(LARGO_CODIGO);
        for (int i = 0; i < LARGO_CODIGO; i++)
            sb.append(ALFABETO.charAt(aleatorio.nextInt(ALFABETO.length())));
        return sb.toString();
    }
}
