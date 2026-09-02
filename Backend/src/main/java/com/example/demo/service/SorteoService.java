package com.example.demo.service;

import com.example.demo.model.CuponSorteo;
import com.example.demo.model.PremioSorteo;
import com.example.demo.model.Sorteo;
import com.example.demo.model.Venta;
import com.example.demo.repository.CuponSorteoRepository;
import com.example.demo.repository.PremioSorteoRepository;
import com.example.demo.repository.SorteoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
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
    private final PremioSorteoRepository premioRepository;
    private final com.example.demo.repository.VentaRepository ventaRepository;
    private final SorteoVivoService vivo;
    private final SecureRandom aleatorio = new SecureRandom();

    public SorteoService(SorteoRepository sorteoRepository,
                         CuponSorteoRepository cuponRepository,
                         PremioSorteoRepository premioRepository,
                         com.example.demo.repository.VentaRepository ventaRepository,
                         SorteoVivoService vivo) {
        this.sorteoRepository = sorteoRepository;
        this.cuponRepository = cuponRepository;
        this.premioRepository = premioRepository;
        this.ventaRepository = ventaRepository;
        this.vivo = vivo;
    }

    // ------------------------------------------------------------ Cupones

    /**
     * Genera el cupón de una venta, si hay un sorteo abierto.
     *
     * No revienta si algo falla: una venta no se puede caer porque el sorteo no
     * esté configurado. Es una promoción, no parte del cobro.
     *
     * Y por eso corre en su PROPIA transacción. Atrapar la excepción no alcanza:
     * si el fallo ocurre dentro de la transacción del pago —un código repetido,
     * por ejemplo—, esa transacción queda marcada para deshacerse y el cobro
     * entero se cae al confirmar, con el dinero ya cobrado en la pasarela.
     * Como se llama desde otros beans, el proxy de Spring aplica esta anotación.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
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

    /**
     * Emite los códigos que falten del sorteo abierto.
     *
     * Existe porque un pasaje pagado se puede quedar sin su código: pasó cuando
     * la generación no estaba conectada a todos los caminos de pago, y puede
     * volver a pasar si un cobro se cierra por una vía nueva. Sin esto, esos
     * pasajeros se quedarían fuera del sorteo por un error nuestro.
     *
     * Solo alcanza a las ventas pagadas DESDE que se abrió el sorteo: las
     * anteriores no participan, y darles código cambiaría las bases publicadas.
     *
     * @return cuántos códigos se emitieron
     */
    public Map<String, Integer> emitirFaltantes(String sorteoId) {
        Sorteo s = sorteoRepository.findById(sorteoId)
                .orElseThrow(() -> new RuntimeException("Ese sorteo no existe"));
        if (s.getEstado() != Sorteo.Estado.ABIERTO)
            throw new RuntimeException("Solo se pueden emitir códigos con el sorteo abierto.");

        LocalDateTime desde = s.getCreatedAt() != null ? s.getCreatedAt() : LocalDateTime.now();
        int web = 0, mostrador = 0;
        for (Venta v : ventaRepository.findByEstadoAndCreatedAtGreaterThanEqual(
                Venta.EstadoVenta.PAGADO, desde)) {
            if (cuponRepository.findByVentaId(v.getId()).isPresent()) continue;
            generarCuponDe(v);
            if (cuponRepository.findByVentaId(v.getId()).isEmpty()) continue;
            // Se cuentan por separado para poder ver de un vistazo si el que
            // falla es un canal en particular y no los dos.
            if ("WEB".equals(v.getCanal())) web++; else mostrador++;
        }
        return Map.of("web", web, "mostrador", mostrador, "total", web + mostrador);
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

    /**
     * Abre un sorteo que estaba preparado.
     *
     * Abrir es publicar una promoción: desde ese momento cada pasaje vendido
     * lleva su código impreso. Por eso lo aprieta una persona y nunca una tarea
     * automática — un sorteo sin bases ni autorización publicadas es lo que
     * puede costar una sanción.
     */
    @Transactional
    public Sorteo abrir(String sorteoId) {
        Sorteo s = sorteoRepository.findById(sorteoId)
                .orElseThrow(() -> new RuntimeException("Ese sorteo no existe"));
        if (s.getEstado() != Sorteo.Estado.BORRADOR)
            throw new RuntimeException("Este sorteo ya no está en preparación.");

        // Con dos abiertos, un pasaje no sabría a cuál pertenece su código.
        if (sorteoRepository.findFirstByEstado(Sorteo.Estado.ABIERTO).isPresent())
            throw new RuntimeException("Ya hay un sorteo abierto. Ciérralo antes de abrir este.");

        if (premioRepository.countBySorteoId(s.getId()) == 0
                && (s.getPremio() == null || s.getPremio().isBlank()))
            throw new RuntimeException("Este sorteo no tiene ningún premio: agrégalo antes de abrirlo.");

        s.setEstado(Sorteo.Estado.ABIERTO);
        return sorteoRepository.save(s);
    }

    /**
     * Cierra el registro de los sorteos cuya hora anunciada ya pasó.
     *
     * Las bases dicen a qué hora cierra el registro, y hasta ahora eso dependía
     * de que alguien se acordara de apretar el botón: si nadie estaba, se seguían
     * aceptando códigos después de la hora publicada. Cerrar no sortea nada —el
     * ganador lo sigue eligiendo una persona, en vivo—.
     *
     * @return cuántos se cerraron
     */
    @Transactional
    public int cerrarLosQueYaVencieron() {
        int cerrados = 0;
        for (Sorteo s : sorteoRepository.findByEstado(Sorteo.Estado.ABIERTO)) {
            if (s.getFechaSorteo() == null) continue;          // sin hora anunciada, no hay qué cumplir
            if (LocalDateTime.now().isBefore(s.getFechaSorteo())) continue;
            s.setEstado(Sorteo.Estado.CERRADO);
            sorteoRepository.save(s);
            cerrados++;
            System.out.println("[Sorteo] registro cerrado solo: " + s.getNombre()
                    + " (anunciado para " + s.getFechaSorteo() + ")");
        }
        return cerrados;
    }

    // ------------------------------------------------------------ El sorteo

    /**
     * Sortea el siguiente premio pendiente. Una sola vez cada uno y sin vuelta atrás.
     *
     * Los premios se sortean del último al primero —tercero, segundo, primero—
     * porque anunciar el grande al final es lo que sostiene la atención.
     *
     * El peso se respeta repartiendo un número al azar sobre la suma total: un
     * cupón VIP ocupa el doble de espacio que uno normal, así que sale el doble
     * de veces. Es más simple y más justo que duplicar filas.
     *
     * Quien ya ganó queda fuera de los premios que faltan, y se excluye por
     * DOCUMENTO, no por cupón: quien compró cinco pasajes tiene más chances de
     * ganar algo, pero no se lleva dos premios. Es lo que la gente espera y
     * evita el reclamo de "esa persona ganó dos veces".
     */
    @Transactional
    public PremioSorteo ejecutar(String sorteoId, String usuario) {
        Sorteo s = sorteoRepository.findById(sorteoId)
                .orElseThrow(() -> new RuntimeException("Ese sorteo no existe"));

        // Sin esto, alguien podría volver a sortear hasta que salga quien quiere.
        if (s.getEstado() == Sorteo.Estado.SORTEADO)
            throw new RuntimeException("Este sorteo ya repartió todos sus premios. No se puede repetir.");

        List<PremioSorteo> premios = premiosDe(s);
        PremioSorteo premio = premios.stream()
                .filter(p -> !p.estaSorteado())
                .max(java.util.Comparator.comparing(PremioSorteo::getOrden))   // el último primero
                .orElseThrow(() -> new RuntimeException("Este sorteo no tiene premios pendientes."));

        List<CuponSorteo> participantes = cuponRepository.participantesDe(sorteoId);
        if (participantes.isEmpty())
            throw new RuntimeException("Todavía nadie registró su código: no hay entre quiénes sortear.");

        // Los documentos que ya se llevaron un premio de este sorteo.
        java.util.Set<String> yaGanaron = premios.stream()
                .filter(PremioSorteo::estaSorteado)
                .map(p -> cuponRepository.findById(p.getCuponGanadorId()).orElse(null))
                .filter(java.util.Objects::nonNull)
                .map(CuponSorteo::getPasajeroDocumento)
                .filter(d -> d != null && !d.isBlank())
                .collect(java.util.stream.Collectors.toSet());

        List<CuponSorteo> elegibles = participantes.stream()
                .filter(c -> c.getPasajeroDocumento() == null || !yaGanaron.contains(c.getPasajeroDocumento()))
                .toList();

        // Con menos gente que premios se acaban los elegibles. Antes que dejar el
        // premio sin dueño o repetir persona, se avisa: lo resuelve quien organiza.
        if (elegibles.isEmpty())
            throw new RuntimeException("Ya no queda nadie sin premio: todos los que participaron ganaron algo.");

        CuponSorteo ganador = elegirPonderado(elegibles);

        premio.setCuponGanadorId(ganador.getId());
        premio.setSorteadoAt(LocalDateTime.now());
        premio.setSorteadoPor(usuario);
        premioRepository.save(premio);

        // El primer premio sorteado deja también su marca en el sorteo: el
        // historial público y las pantallas viejas lo leen de ahí.
        if (s.getCuponGanadorId() == null) {
            s.setCuponGanadorId(ganador.getId());
            s.setSorteadoAt(premio.getSorteadoAt());
            s.setSorteadoPor(usuario);
        }
        s.setCuponesParticipantes(participantes.size());

        boolean quedan = premios.stream().anyMatch(p -> !p.estaSorteado() && !p.getId().equals(premio.getId()));
        if (!quedan) s.setEstado(Sorteo.Estado.SORTEADO);
        sorteoRepository.save(s);

        vivo.avisarGanador(sorteoId, ganador, participantes.size(), premio, quedan);
        return premio;
    }

    /**
     * Los premios del sorteo.
     *
     * Un sorteo creado antes de que existieran los premios múltiples no tiene
     * ninguno: se le arma uno al vuelo con lo que guardaba, para que siga
     * funcionando igual sin tocar sus datos.
     */
    public List<PremioSorteo> premiosDe(Sorteo s) {
        List<PremioSorteo> premios = premioRepository.findBySorteoIdOrderByOrdenAsc(s.getId());
        if (!premios.isEmpty()) return premios;

        PremioSorteo unico = new PremioSorteo();
        unico.setId(UUID.randomUUID().toString());
        unico.setSorteoId(s.getId());
        unico.setOrden(1);
        unico.setDescripcion(s.getPremio());
        unico.setValor(s.getPremioValor());
        unico.setCuponGanadorId(s.getCuponGanadorId());
        unico.setSorteadoAt(s.getSorteadoAt());
        unico.setSorteadoPor(s.getSorteadoPor());
        return List.of(premioRepository.save(unico));
    }

    /** Guarda los premios de un sorteo nuevo. El orden 1 es el premio mayor. */
    public void guardarPremios(String sorteoId, List<java.util.Map<String, Object>> premios) {
        int orden = 1;
        for (var p : premios) {
            String desc = p.get("descripcion") == null ? null : p.get("descripcion").toString().trim();
            if (desc == null || desc.isBlank()) continue;
            PremioSorteo x = new PremioSorteo();
            x.setId(UUID.randomUUID().toString());
            x.setSorteoId(sorteoId);
            x.setOrden(orden++);
            x.setDescripcion(desc);
            if (p.get("valor") != null && !p.get("valor").toString().isBlank())
                x.setValor(new java.math.BigDecimal(p.get("valor").toString()));
            premioRepository.save(x);
        }
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
