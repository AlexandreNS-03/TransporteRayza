package com.example.demo.service;

import com.example.demo.model.Ruta;
import com.example.demo.model.RutaParada;
import com.example.demo.model.RutaTarifaTramo;
import com.example.demo.repository.RutaParadaRepository;
import com.example.demo.repository.RutaRepository;
import com.example.demo.repository.RutaTarifaTramoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Carga masiva de tarifas por tramo con un archivo CSV que se abre y edita en Excel.
 *
 * Con 7 paradas hay 21 combinaciones y cargarlas a mano en el formulario es inviable,
 * así que se descarga una plantilla que YA TRAE todas las combinaciones listadas —con
 * los precios que ya existan— para llenar solo las dos columnas de precio y subirla.
 *
 * Se usa punto y coma como separador y se antepone un BOM porque es lo que espera el
 * Excel en español: con coma abre todo amontonado en una sola columna.
 */
@Service
public class TarifaCsvService {

    private static final String SEP = ";";
    private static final String BOM = "﻿";

    private final RutaRepository rutaRepository;
    private final RutaParadaRepository paradaRepository;
    private final RutaTarifaTramoRepository tarifaRepository;

    public TarifaCsvService(RutaRepository rutaRepository,
                            RutaParadaRepository paradaRepository,
                            RutaTarifaTramoRepository tarifaRepository) {
        this.rutaRepository = rutaRepository;
        this.paradaRepository = paradaRepository;
        this.tarifaRepository = tarifaRepository;
    }

    /** Plantilla con TODOS los pares origen→destino de la ruta y los precios actuales. */
    @Transactional(readOnly = true)
    public String generarPlantilla(String rutaId) {
        Ruta ruta = rutaRepository.findById(rutaId)
                .orElseThrow(() -> new RuntimeException("Ruta no encontrada"));

        List<RutaParada> paradas = paradaRepository.findByRutaIdOrderByOrdenAsc(rutaId);
        if (paradas.size() < 2)
            throw new RuntimeException("La ruta necesita al menos dos paradas para armar la plantilla");

        Map<String, RutaTarifaTramo> actuales = new HashMap<>();
        for (RutaTarifaTramo t : tarifaRepository.findByRutaId(rutaId))
            actuales.put(t.getOrdenOrigen() + "-" + t.getOrdenDestino(), t);

        StringBuilder csv = new StringBuilder(BOM);
        csv.append(String.join(SEP,
                "orden_origen", "origen", "orden_destino", "destino",
                "precio_normal", "precio_vip")).append("\n");

        for (int i = 0; i < paradas.size(); i++) {
            for (int j = i + 1; j < paradas.size(); j++) {
                RutaParada o = paradas.get(i), d = paradas.get(j);
                RutaTarifaTramo actual = actuales.get(o.getOrden() + "-" + d.getOrden());

                csv.append(o.getOrden()).append(SEP)
                   .append(escapar(o.getNombre())).append(SEP)
                   .append(d.getOrden()).append(SEP)
                   .append(escapar(d.getNombre())).append(SEP)
                   .append(actual != null && actual.getPrecioNormal() != null ? actual.getPrecioNormal() : "").append(SEP)
                   .append(actual != null && actual.getPrecioVip() != null ? actual.getPrecioVip() : "")
                   .append("\n");
            }
        }
        return csv.toString();
    }

    /** Resultado de una importación, para poder informarlo en pantalla. */
    public static class ResultadoImportacion {
        public int guardadas;
        public int ignoradas;
        public List<String> errores = new ArrayList<>();

        public int getGuardadas() { return guardadas; }
        public int getIgnoradas() { return ignoradas; }
        public List<String> getErrores() { return errores; }
    }

    /**
     * Importa el CSV. Reemplaza por completo las tarifas de la ruta con las filas que
     * traigan precio: así, borrar una fila en Excel borra esa tarifa, sin sorpresas.
     * Las filas sin precio se ignoran (quedan usando el precio base de la ruta).
     */
    @Transactional
    public ResultadoImportacion importar(String rutaId, InputStream archivo) {
        Ruta ruta = rutaRepository.findById(rutaId)
                .orElseThrow(() -> new RuntimeException("Ruta no encontrada"));

        Map<Integer, String> nombrePorOrden = new HashMap<>();
        for (RutaParada p : paradaRepository.findByRutaIdOrderByOrdenAsc(rutaId))
            nombrePorOrden.put(p.getOrden(), p.getNombre());

        ResultadoImportacion res = new ResultadoImportacion();
        List<RutaTarifaTramo> nuevas = new ArrayList<>();

        try (BufferedReader in = new BufferedReader(
                new InputStreamReader(archivo, StandardCharsets.UTF_8))) {

            String linea;
            int nro = 0;
            while ((linea = in.readLine()) != null) {
                nro++;
                linea = linea.replace(BOM, "").trim();
                if (linea.isEmpty()) continue;
                if (nro == 1 && linea.toLowerCase().startsWith("orden_origen")) continue;   // encabezado

                String[] c = linea.split(SEP.equals(";") && linea.contains(";") ? ";" : ",", -1);
                if (c.length < 6) {
                    res.errores.add("Línea " + nro + ": se esperaban 6 columnas");
                    continue;
                }

                try {
                    int ordenOrigen  = Integer.parseInt(c[0].trim());
                    int ordenDestino = Integer.parseInt(c[2].trim());
                    BigDecimal normal = precio(c[4]);
                    BigDecimal vip    = precio(c[5]);

                    if (normal == null && vip == null) { res.ignoradas++; continue; }

                    if (ordenOrigen >= ordenDestino) {
                        res.errores.add("Línea " + nro + ": el destino debe ir después del origen");
                        continue;
                    }
                    if (!nombrePorOrden.containsKey(ordenOrigen) || !nombrePorOrden.containsKey(ordenDestino)) {
                        res.errores.add("Línea " + nro + ": esa parada no existe en la ruta");
                        continue;
                    }

                    RutaTarifaTramo t = new RutaTarifaTramo();
                    t.setId(UUID.randomUUID().toString());
                    t.setRuta(ruta);
                    t.setOrdenOrigen(ordenOrigen);
                    t.setOrdenDestino(ordenDestino);
                    t.setOrigenTramo(nombrePorOrden.get(ordenOrigen));
                    t.setDestinoTramo(nombrePorOrden.get(ordenDestino));
                    t.setPrecioNormal(normal != null ? normal : vip);
                    t.setPrecioVip(vip != null ? vip : normal);
                    nuevas.add(t);
                } catch (NumberFormatException e) {
                    res.errores.add("Línea " + nro + ": número inválido");
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("No se pudo leer el archivo: " + e.getMessage());
        }

        if (!res.errores.isEmpty())
            throw new RuntimeException("El archivo tiene errores: " + String.join(" · ", res.errores));

        tarifaRepository.deleteByRutaId(rutaId);
        tarifaRepository.saveAll(nuevas);
        res.guardadas = nuevas.size();
        return res;
    }

    /** Acepta 30 / 30.50 / 30,50 y celdas vacías. */
    private BigDecimal precio(String valor) {
        if (valor == null) return null;
        String v = valor.trim().replace("S/", "").replace(" ", "").replace(",", ".");
        if (v.isEmpty()) return null;
        BigDecimal b = new BigDecimal(v);
        return b.signum() <= 0 ? null : b;
    }

    private String escapar(String s) {
        if (s == null) return "";
        return s.contains(SEP) ? "\"" + s + "\"" : s;
    }
}
