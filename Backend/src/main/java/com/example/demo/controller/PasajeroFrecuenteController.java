package com.example.demo.controller;

import com.example.demo.dto.PasajeroFrecuenteDTO;
import com.example.demo.model.Cliente;
import com.example.demo.repository.ClienteRepository;
import com.example.demo.service.WalletService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/**
 * El código de pasajero frecuente, visto desde el mostrador.
 *
 * <p>La persona llega a la ventanilla y dicta {@code RZ-7K3M9Q} en vez de
 * deletrear su documento con el motor de una lancha al lado. Quien atiende lo
 * escribe y la venta se llena sola.
 *
 * <p>Es solo de lectura y devuelve lo justo para llenar una venta: nombre,
 * documento, teléfono, fecha de nacimiento y sexo. Ni el correo ni el saldo ni
 * el historial, que no hacen falta para vender un pasaje.
 */
@RestController
@RequestMapping("/api/pasajeros")
public class PasajeroFrecuenteController {

    private final ClienteRepository clientes;
    private final WalletService wallet;

    public PasajeroFrecuenteController(ClienteRepository clientes, WalletService wallet) {
        this.clientes = clientes;
        this.wallet = wallet;
    }

    @GetMapping("/por-codigo/{codigo}")
    public ResponseEntity<?> porCodigo(@PathVariable String codigo) {
        Optional<Cliente> hallado = clientes.findByCodigoPasajero(normalizar(codigo));

        // Mismo mensaje para un código mal escrito que para uno que no existe:
        // decir "ese código no existe" convierte la ventanilla en una forma de
        // averiguar qué códigos sí existen.
        if (hallado.isEmpty() || !Boolean.TRUE.equals(hallado.get().getActivo()))
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "No encontramos ninguna cuenta con ese código"));

        return ResponseEntity.ok(aDTO(hallado.get()));
    }

    /**
     * Lo que se dicta no viene limpio: llega "rz 7k3m9q", "RZ7K3M9Q" o con el
     * guion cambiado por un espacio. El código guardado es uno solo, así que
     * acá se le devuelve su forma antes de buscarlo.
     */
    private String normalizar(String crudo) {
        if (crudo == null) return "";
        String s = crudo.toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]", "");
        if (s.startsWith("RZ")) s = s.substring(2);
        return "RZ-" + s;
    }

    private PasajeroFrecuenteDTO aDTO(Cliente c) {
        PasajeroFrecuenteDTO d = new PasajeroFrecuenteDTO();
        d.setCodigoPasajero(c.getCodigoPasajero());
        d.setNombreCompleto(
                ((c.getNombres() == null ? "" : c.getNombres()) + " " +
                 (c.getApellidos() == null ? "" : c.getApellidos())).trim());
        d.setTipoDocumento(c.getTipoDocumento() == null ? null : c.getTipoDocumento().name());
        d.setNumeroDocumento(c.getNumeroDocumento());
        d.setTelefono(c.getTelefono());
        d.setFechaNacimiento(c.getFechaNacimiento() == null ? null : c.getFechaNacimiento().toString());
        d.setSexo(sexoDe(c.getGenero()));
        d.setSaldo(wallet.estaHabilitada()
                ? wallet.saldoDe(c.getEmail()) : java.math.BigDecimal.ZERO);
        return d;
    }

    /** El panel escribe el sexo como "Masculino"; la cuenta lo guarda como enum. */
    private String sexoDe(Cliente.Genero g) {
        if (g == null) return null;
        return switch (g) {
            case MASCULINO -> "Masculino";
            case FEMENINO  -> "Femenino";
            case OTRO      -> "Otro";
        };
    }
}
