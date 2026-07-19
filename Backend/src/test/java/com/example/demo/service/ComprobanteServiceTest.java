package com.example.demo.service;

import com.example.demo.dto.ComprobanteDTO;
import com.example.demo.dto.ComprobanteRequest;
import com.example.demo.model.Venta;
import com.example.demo.repository.VentaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ComprobanteServiceTest {

    @Autowired private ComprobanteService comprobanteService;
    @Autowired private VentaRepository ventaRepository;

    private Venta venta;

    @BeforeEach
    void prepararVenta() {
        venta = new Venta();
        venta.setId(UUID.randomUUID().toString());
        venta.setViajeCodigo("V-TEST01");
        venta.setViajeDescripcion("Iquitos - Nauta");
        venta.setTipoDocumento(Venta.TipoDocumento.DNI);
        venta.setPasajeroNombre("Juan Test");
        venta.setPasajeroDocumento("12345678");
        venta.setTipoComprobante(Venta.TipoComprobante.TICKET);
        venta.setSerieComprobante("T001");
        venta.setNumeroComprobante("00000001");
        venta.setAsientoNumero(1);
        venta.setAsientoTipo(Venta.AsientoTipo.NORMAL);
        venta.setParadaOrigen("Iquitos");
        venta.setParadaDestino("Nauta");
        venta.setPrecio(new BigDecimal("118.00"));
        venta.setEstado(Venta.EstadoVenta.PAGADO);
        venta.setFechaVenta(LocalDate.now());
        venta.setCreatedAt(LocalDateTime.now());
        ventaRepository.save(venta);
    }

    private ComprobanteRequest boletaRequest() {
        ComprobanteRequest req = new ComprobanteRequest();
        req.setVentaId(venta.getId());
        req.setTipoDeComprobante("BOLETA");
        req.setClienteTipoDeDocumento("1");
        req.setClienteNumeroDeDocumento("12345678");
        req.setClienteDenominacion("Juan Test");
        return req;
    }

    @Test
    void boletaSeEmiteExoneradaDeIgv() {
        ComprobanteDTO c = comprobanteService.generar(boletaRequest(), "admin");

        // Ley 27037 (Amazonía): monto fijo, todo exonerado, IGV cero
        assertEquals(0, new BigDecimal("118.00").compareTo(c.getTotalExonerada()));
        assertEquals(0, BigDecimal.ZERO.compareTo(c.getTotalIgv()));
        assertEquals(0, new BigDecimal("118.00").compareTo(c.getTotal()));
        assertEquals("B001", c.getSerie());
        assertEquals("ACEPTADO", c.getEstado());
    }

    @Test
    void jsonNubefactLlevaOperacionExonerada() {
        ComprobanteDTO c = comprobanteService.generar(boletaRequest(), "admin");
        Map<String, Object> json = comprobanteService.jsonNubefact(c.getId());

        assertEquals("generar_comprobante", json.get("operacion"));
        assertEquals(2, json.get("tipo_de_comprobante")); // 2 = boleta
        assertEquals(0, BigDecimal.ZERO.compareTo((BigDecimal) json.get("total_igv")));
        assertEquals(0, new BigDecimal("118.00").compareTo((BigDecimal) json.get("total_exonerada")));

        @SuppressWarnings("unchecked")
        Map<String, Object> item = ((java.util.List<Map<String, Object>>) json.get("items")).get(0);
        assertEquals(8, item.get("tipo_de_igv")); // 8 = Exonerado - Operación Onerosa
    }

    @Test
    void noPermiteDosComprobantesParaLaMismaVenta() {
        comprobanteService.generar(boletaRequest(), "admin");

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> comprobanteService.generar(boletaRequest(), "admin"));
        assertTrue(ex.getMessage().contains("ya tiene un comprobante"));
    }

    @Test
    void facturaExigeRucValido() {
        ComprobanteRequest req = boletaRequest();
        req.setTipoDeComprobante("FACTURA");
        req.setClienteTipoDeDocumento("6");
        req.setClienteNumeroDeDocumento("123"); // RUC inválido

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> comprobanteService.generar(req, "admin"));
        assertTrue(ex.getMessage().contains("RUC"));
    }

    @Test
    void anularExigeMotivo() {
        ComprobanteDTO c = comprobanteService.generar(boletaRequest(), "admin");

        assertThrows(RuntimeException.class, () -> comprobanteService.anular(c.getId(), " "));

        ComprobanteDTO anulado = comprobanteService.anular(c.getId(), "Error en datos");
        assertEquals("ANULADO", anulado.getEstado());

        // Anulada dos veces: rechazado
        assertThrows(RuntimeException.class, () -> comprobanteService.anular(c.getId(), "otra vez"));
    }

    @Test
    void notaCreditoAnulaElComprobanteOriginal() {
        ComprobanteDTO boleta = comprobanteService.generar(boletaRequest(), "admin");

        ComprobanteDTO nc = comprobanteService.emitirNotaCredito(boleta.getId(), "Pasajero desistió", "admin");

        assertEquals("NOTA_CREDITO", nc.getTipoDeComprobante());
        assertEquals("BC01", nc.getSerie());
        assertEquals(boleta.getSerie(), nc.getRefSerie());
        assertEquals(boleta.getNumero(), nc.getRefNumero());
        assertEquals(0, new BigDecimal("118.00").compareTo(nc.getTotal()));

        // El original queda anulado y la venta puede recibir un nuevo comprobante
        Map<String, Object> jsonNc = comprobanteService.jsonNubefact(nc.getId());
        assertEquals(3, jsonNc.get("tipo_de_comprobante")); // 3 = nota de crédito
        assertEquals(1, jsonNc.get("tipo_de_nota_de_credito")); // anulación de la operación

        ComprobanteDTO nuevaBoleta = comprobanteService.generar(boletaRequest(), "admin");
        assertEquals("ACEPTADO", nuevaBoleta.getEstado());
    }

    @Test
    void notaCreditoDeUnaNotaCreditoEsRechazada() {
        ComprobanteDTO boleta = comprobanteService.generar(boletaRequest(), "admin");
        ComprobanteDTO nc = comprobanteService.emitirNotaCredito(boleta.getId(), "Motivo", "admin");

        assertThrows(RuntimeException.class,
                () -> comprobanteService.emitirNotaCredito(nc.getId(), "Motivo", "admin"));
    }
}
