package com.example.demo.service;

import com.example.demo.dto.ClienteComprobanteDTO;
import com.example.demo.model.Cliente;
import com.example.demo.model.Comprobante;
import com.example.demo.model.Venta;
import com.example.demo.repository.ClienteRepository;
import com.example.demo.repository.ComprobanteRepository;
import com.example.demo.repository.VentaRepository;
import com.example.demo.security.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Las boletas del cliente, en su cuenta.
 *
 * Lo que de verdad se prueba acá es a quién se le muestran. Un viaje enseña
 * ruta, fecha y asiento; un comprobante enseña a la persona —nombre completo,
 * documento y domicilio del comprador—, así que quién puede verlo no es un
 * detalle.
 */
class ComprobantesDelClienteTest {

    private ClienteRepository clientes;
    private VentaRepository ventas;
    private ComprobanteRepository comprobantes;
    private ClienteService servicio;

    @BeforeEach
    void prepararUnaCompraConSuBoleta() {
        clientes = mock(ClienteRepository.class);
        ventas = mock(VentaRepository.class);
        comprobantes = mock(ComprobanteRepository.class);

        JwtUtil jwt = new JwtUtil();
        ReflectionTestUtils.setField(jwt, "secret", "llave-de-prueba-que-no-se-usa-en-ningun-lado-32+");
        ReflectionTestUtils.setField(jwt, "expiration", 60_000L);

        servicio = new ClienteService(clientes, ventas, comprobantes, null,
                new BCryptPasswordEncoder(), jwt,
                new IntentosLoginService(new AuditoriaMuda()), new CorreoMudo());

        Cliente c = new Cliente();
        c.setId("c-1");
        c.setEmail("nelida@ejemplo.pe");
        c.setNumeroDocumento("05612844");
        when(clientes.findByEmail("nelida@ejemplo.pe")).thenReturn(Optional.of(c));

        Venta suya = venta("v-1", "nelida@ejemplo.pe");
        when(ventas.findByClienteIdOrderByCreatedAtDesc("c-1")).thenReturn(List.of());
        when(ventas.findByClienteEmailIgnoreCaseOrderByCreatedAtDesc("nelida@ejemplo.pe"))
                .thenReturn(List.of(suya));
        when(comprobantes.findByVentaId("v-1")).thenReturn(List.of(boleta("cp-1", 13L, "15.00")));
        when(comprobantes.findByGrupoVentaId(anyString())).thenReturn(List.of());
    }

    @Test
    @DisplayName("Ve la boleta de su propia compra, con el enlace al PDF")
    void veLaSuya() {
        List<ClienteComprobanteDTO> lista = servicio.misComprobantes("nelida@ejemplo.pe");
        assertEquals(1, lista.size());
        ClienteComprobanteDTO b = lista.get(0);
        assertEquals("Boleta", b.getTipo());
        assertEquals("BBB1-00000013", b.getNumero(), "el número se muestra como se reclama");
        assertEquals("https://nubefact.test/cp-1.pdf", b.getEnlacePdf());
    }

    @Test
    @DisplayName("NO busca por número de documento, porque nadie comprueba que sea el suyo")
    void noBuscaPorDocumento() {
        // Al registrarse se escribe el DNI que uno quiera: nadie lo verifica.
        // Si los comprobantes se buscaran por documento, escribir el DNI de otro
        // bastaría para bajarse sus documentos fiscales.
        Venta deOtro = venta("v-ajena", "otro@ejemplo.pe");
        when(ventas.findByPasajeroDocumento("05612844")).thenReturn(List.of(deOtro));
        when(comprobantes.findByVentaId("v-ajena")).thenReturn(List.of(boleta("cp-ajeno", 99L, "80.00")));

        List<ClienteComprobanteDTO> lista = servicio.misComprobantes("nelida@ejemplo.pe");

        assertEquals(1, lista.size(), "solo tenía que salir la suya");
        assertEquals("BBB1-00000013", lista.get(0).getNumero());
        verify(ventas, never()).findByPasajeroDocumento(anyString());
    }

    @Test
    @DisplayName("Una compra de varios pasajes trae su comprobante de grupo una sola vez")
    void noRepiteElDelGrupo() {
        Venta a = venta("v-a", "nelida@ejemplo.pe"); a.setGrupoVentaId("g-1");
        Venta b = venta("v-b", "nelida@ejemplo.pe"); b.setGrupoVentaId("g-1");
        when(ventas.findByClienteEmailIgnoreCaseOrderByCreatedAtDesc("nelida@ejemplo.pe"))
                .thenReturn(List.of(a, b));
        when(comprobantes.findByVentaId(anyString())).thenReturn(List.of());
        Comprobante delGrupo = boleta("cp-grupo", 20L, "180.00");
        when(comprobantes.findByGrupoVentaId("g-1")).thenReturn(List.of(delGrupo));

        assertEquals(1, servicio.misComprobantes("nelida@ejemplo.pe").size(),
                "dos pasajes del mismo grupo comparten un comprobante: tiene que salir uno");
    }

    private static Venta venta(String id, String email) {
        Venta v = new Venta();
        v.setId(id);
        v.setClienteEmail(email);
        v.setEstado(Venta.EstadoVenta.PAGADO);
        v.setCreatedAt(LocalDateTime.now());
        return v;
    }

    private static Comprobante boleta(String id, long numero, String total) {
        Comprobante c = new Comprobante();
        c.setId(id);
        c.setTipoDeComprobante(Comprobante.TipoComprobante.BOLETA);
        c.setSerie("BBB1");
        c.setNumero(numero);
        c.setTotal(new BigDecimal(total));
        c.setEstado(Comprobante.EstadoComprobante.ACEPTADO);
        c.setFechaDeEmision(LocalDate.of(2026, 7, 23));
        c.setEnlacePdf("https://nubefact.test/" + id + ".pdf");
        return c;
    }

    private static class AuditoriaMuda extends AuditoriaService {
        AuditoriaMuda() { super(null, null); }
        @Override
        public void registrar(String accion, String modulo, String referenciaId, String descripcion) { }
    }

    private static class CorreoMudo extends EmailService {
        CorreoMudo() { super(null); }
        @Override
        public void enviarAvisoClaveCambiada(String destinatario, String nombre) { }
    }
}
