package com.example.demo.service;

import com.example.demo.dto.VentaDTO;
import com.example.demo.dto.VentaRequest;
import com.example.demo.model.*;
import com.example.demo.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class VentaServiceTest {

    @Autowired private VentaService ventaService;
    @Autowired private ViajeRepository viajeRepository;
    @Autowired private ViajeAsientoEstadoRepository asientoEstadoRepository;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private SucursalRepository sucursalRepository;

    private Viaje viaje;

    @BeforeEach
    void prepararDatos() {
        viaje = crearViaje("suc-iquitos", "Sucursal Iquitos");
        crearAsiento(viaje.getId(), 1, ViajeAsientoEstado.TipoAsiento.NORMAL);
        crearAsiento(viaje.getId(), 2, ViajeAsientoEstado.TipoAsiento.NORMAL);
    }

    private Viaje crearViaje(String sucursalId, String sucursalNombre) {
        return crearViaje(sucursalId, sucursalNombre,
                java.time.LocalDateTime.now().plusDays(1).withHour(8).withMinute(0));
    }

    private Viaje crearViaje(String sucursalId, String sucursalNombre, java.time.LocalDateTime salida) {
        Viaje v = new Viaje();
        v.setId(UUID.randomUUID().toString());
        v.setCodigoViaje("V-TEST-" + UUID.randomUUID().toString().substring(0, 8));
        v.setSucursalId(sucursalId);
        v.setSucursalNombre(sucursalNombre);
        v.setRutaNombre("Iquitos - Nauta");
        v.setOrigen("Iquitos");
        v.setDestino("Nauta");
        v.setFechaSalida(salida.toLocalDate());
        v.setHoraSalida(salida.toLocalTime().withNano(0));
        v.setPrecioNormal(new BigDecimal("59.00"));
        v.setPrecioVip(new BigDecimal("118.00"));
        return viajeRepository.save(v);
    }

    private void crearAsiento(String viajeId, int numero, ViajeAsientoEstado.TipoAsiento tipo) {
        ViajeAsientoEstado a = new ViajeAsientoEstado();
        a.setId(UUID.randomUUID().toString());
        a.setViajeId(viajeId);
        a.setNumero(numero);
        a.setTipo(tipo);
        a.setEstado(ViajeAsientoEstado.EstadoAsiento.LIBRE);
        asientoEstadoRepository.save(a);
    }

    private VentaRequest requestBasico(int asiento) {
        VentaRequest req = new VentaRequest();
        req.setViajeId(viaje.getId());
        req.setTipoDocumento("DNI");
        req.setPasajeroNombre("Juan Test");
        req.setPasajeroDocumento("12345678");
        req.setTipoComprobante("TICKET");
        req.setClienteNombre("Juan Test");
        req.setClienteTipoDoc("DNI");
        req.setClienteDocumento("12345678");
        req.setAsientoNumero(asiento);
        req.setAsientoTipo("NORMAL");
        req.setParadaOrigen("Iquitos");
        req.setParadaDestino("Nauta");
        req.setOrdenOrigen(1);
        req.setOrdenDestino(2);
        req.setPrecio(new BigDecimal("59.00"));
        return req;
    }

    @Test
    void crearVentaGeneraCorrelativoIncremental() {
        VentaDTO v1 = ventaService.crearVenta(requestBasico(1), "admin");
        VentaDTO v2 = ventaService.crearVenta(requestBasico(2), "admin");

        assertEquals("PAGADO", v1.getEstado());
        long n1 = Long.parseLong(v1.getNumeroComprobante());
        long n2 = Long.parseLong(v2.getNumeroComprobante());
        assertEquals(n1 + 1, n2, "El correlativo debe incrementar en 1");
    }

    @Test
    void noPermiteVenderDosVecesElMismoAsientoEnElMismoTramo() {
        ventaService.crearVenta(requestBasico(1), "admin");

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> ventaService.crearVenta(requestBasico(1), "admin"));
        assertTrue(ex.getMessage().contains("ya fue vendido"),
                "Debe rechazar la doble venta del asiento: " + ex.getMessage());
    }

    @Test
    void vendedorDeOtraSucursalNoPuedeVender() {
        Sucursal requena = new Sucursal();
        requena.setId("suc-requena");
        requena.setNombre("Sucursal Requena");
        requena.setActivo(true);
        sucursalRepository.save(requena);

        Usuario vendedor = new Usuario();
        vendedor.setId(UUID.randomUUID().toString());
        vendedor.setUsername("vendedor.requena");
        vendedor.setPassword("x");
        vendedor.setNombre("Vendedor Requena");
        vendedor.setRol(Rol.SUPERVISOR);
        vendedor.setActivo(true);
        vendedor.setSucursalId("suc-requena");
        vendedor.setSucursalNombre("Sucursal Requena");
        usuarioRepository.save(vendedor);

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> ventaService.crearVenta(requestBasico(1), "vendedor.requena"));
        assertTrue(ex.getMessage().contains("tu sucursal"),
                "Debe rechazar la venta de un viaje de otra sucursal: " + ex.getMessage());
    }

    @Test
    void anularVentaLiberaElAsiento() {
        VentaDTO venta = ventaService.crearVenta(requestBasico(1), "admin");

        VentaDTO anulada = ventaService.anularVenta(venta.getId(), "admin");
        assertEquals("ANULADO", anulada.getEstado());

        // El asiento queda libre y se puede volver a vender
        VentaDTO reventa = ventaService.crearVenta(requestBasico(1), "admin");
        assertEquals("PAGADO", reventa.getEstado());
    }

    @Test
    void embarqueAntesDeLaVentanaEsRechazado() {
        // El viaje por defecto sale mañana a las 08:00 → aún faltan más de 2 horas
        VentaDTO venta = ventaService.crearVenta(requestBasico(1), "admin");

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> ventaService.embarcarPasajero(venta.getId(), "admin"));
        assertTrue(ex.getMessage().contains("aún no está habilitado"),
                "Debe rechazar el embarque antes de la ventana: " + ex.getMessage());
    }

    @Test
    void embarqueDentroDeLaVentanaFunciona() {
        // Viaje que sale en 1 hora: estamos dentro de la ventana (2h antes → 20min después)
        Viaje proximo = crearViaje("suc-iquitos", "Sucursal Iquitos",
                java.time.LocalDateTime.now().plusHours(1));
        crearAsiento(proximo.getId(), 1, ViajeAsientoEstado.TipoAsiento.NORMAL);

        VentaRequest req = requestBasico(1);
        req.setViajeId(proximo.getId());
        VentaDTO venta = ventaService.crearVenta(req, "admin");

        VentaDTO embarcada = ventaService.embarcarPasajero(venta.getId(), "admin");
        assertEquals("EMBARCADO", embarcada.getEmbarqueEstado());
    }

    @Test
    void embarqueDespuesDelCierreEsRechazado() {
        // Viaje que salió hace 1 hora: la ventana cerró 40 minutos atrás
        Viaje pasado = crearViaje("suc-iquitos", "Sucursal Iquitos",
                java.time.LocalDateTime.now().minusHours(1));
        crearAsiento(pasado.getId(), 1, ViajeAsientoEstado.TipoAsiento.NORMAL);

        VentaRequest req = requestBasico(1);
        req.setViajeId(pasado.getId());
        VentaDTO venta = ventaService.crearVenta(req, "admin");

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> ventaService.embarcarPasajero(venta.getId(), "admin"));
        assertTrue(ex.getMessage().contains("ya cerró"),
                "Debe rechazar el embarque después del cierre: " + ex.getMessage());
    }

    @Test
    void noPermiteAnularDosVeces() {
        VentaDTO venta = ventaService.crearVenta(requestBasico(1), "admin");
        ventaService.anularVenta(venta.getId(), "admin");

        assertThrows(RuntimeException.class,
                () -> ventaService.anularVenta(venta.getId(), "admin"));
    }
}
