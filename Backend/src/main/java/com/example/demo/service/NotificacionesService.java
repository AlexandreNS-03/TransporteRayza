package com.example.demo.service;

import com.example.demo.dto.PreferenciasNotificacionDTO;
import com.example.demo.model.Cliente;
import com.example.demo.model.PreferenciasNotificacion;
import com.example.demo.model.PreferenciasNotificacion.Canal;
import com.example.demo.model.PreferenciasNotificacion.Tipo;
import com.example.demo.repository.ClienteRepository;
import com.example.demo.repository.PreferenciasNotificacionRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Por dónde le escribimos a cada cliente, y para qué.
 *
 * <p><strong>Lo importante de esta clase es {@link #puedeRecibir}.</strong>
 * Guardar preferencias que después nadie consulta es peor que no tenerlas: le
 * dice al cliente que decidió algo cuando en realidad no cambió nada. Cualquier
 * cosa que se mande tiene que pasar por ahí primero.
 *
 * <p><strong>Hoy no hay WhatsApp ni SMS.</strong> La preferencia se guarda y
 * queda lista, pero no existe el canal: la pantalla lo dice en vez de fingir.
 * Lo que sí existe es el correo, y todo lo que se manda hoy es informativo
 * —boleto, comprobante, avisos del viaje—, así que nada cambia de golpe.
 */
@Service
public class NotificacionesService {

    private final PreferenciasNotificacionRepository repositorio;
    private final ClienteRepository clientes;

    @Value("${notificaciones.whatsapp.enabled:false}")
    private boolean whatsappDisponible;

    @Value("${notificaciones.sms.enabled:false}")
    private boolean smsDisponible;

    public NotificacionesService(PreferenciasNotificacionRepository repositorio,
                                 ClienteRepository clientes) {
        this.repositorio = repositorio;
        this.clientes = clientes;
    }

    public PreferenciasNotificacionDTO deCliente(String email) {
        return toDTO(preferenciasDe(buscar(email)));
    }

    /**
     * La pregunta que hay que hacerse antes de mandar cualquier cosa.
     *
     * <p>El correo informativo devuelve true siempre y a propósito: es el
     * servicio que la persona compró, no una suscripción. Apagarlo sería
     * venderle un pasaje que no puede mostrar al embarcar.
     *
     * <p>Un canal apagado en la configuración del sistema devuelve false aunque
     * el cliente lo haya pedido: no existe por dónde mandarlo.
     */
    public boolean puedeRecibir(String email, Tipo tipo, Canal canal) {
        if (canal == Canal.WHATSAPP && !whatsappDisponible) return false;
        if (canal == Canal.SMS && !smsDisponible) return false;

        Cliente c = clientes.findByEmail(normalizar(email)).orElse(null);
        if (c == null) {
            // Sin cuenta no hay preferencias: le llega lo del servicio por
            // correo, que es como compró antes de registrarse, y nada más.
            return tipo == Tipo.INFORMATIVO && canal == Canal.EMAIL;
        }
        return preferenciasDe(c).permite(tipo, canal);
    }

    /**
     * Guarda lo que el cliente eligió.
     *
     * <p>Acá está la parte que importa de verdad: cuando enciende la publicidad
     * por primera vez se anota <em>cuándo</em> y <em>desde dónde</em>. La Ley
     * 29733 pide poder demostrar ese permiso, y un booleano suelto no demuestra
     * nada. Cuando la apaga del todo, también queda anotado.
     */
    @Transactional
    public PreferenciasNotificacionDTO guardar(String email, PreferenciasNotificacionDTO datos) {
        Cliente c = buscar(email);
        PreferenciasNotificacion p = preferenciasDe(c);

        boolean aceptabaAntes = p.aceptaPromociones();

        p.setInfoWhatsapp(datos.isInfoWhatsapp());
        p.setInfoSms(datos.isInfoSms());
        p.setPromoEmail(datos.isPromoEmail());
        p.setPromoWhatsapp(datos.isPromoWhatsapp());
        p.setPromoSms(datos.isPromoSms());

        boolean aceptaAhora = p.aceptaPromociones();
        LocalDateTime ahora = LocalDateTime.now();

        if (aceptaAhora && !aceptabaAntes) {
            p.setPromoAceptadoAt(ahora);
            p.setPromoRevocadoAt(null);
            p.setPromoOrigen("cuenta web");
        } else if (!aceptaAhora && aceptabaAntes) {
            p.setPromoRevocadoAt(ahora);
        }

        p.setUpdatedAt(ahora);
        repositorio.save(p);
        return toDTO(p);
    }

    /** Las del cliente, o unas nuevas con todo apagado si nunca eligió nada. */
    private PreferenciasNotificacion preferenciasDe(Cliente c) {
        return repositorio.findById(c.getId()).orElseGet(() -> {
            PreferenciasNotificacion p = new PreferenciasNotificacion();
            p.setClienteId(c.getId());
            return p;
        });
    }

    private Cliente buscar(String email) {
        return clientes.findByEmail(normalizar(email))
                .orElseThrow(() -> new RuntimeException("Cuenta no encontrada"));
    }

    private PreferenciasNotificacionDTO toDTO(PreferenciasNotificacion p) {
        PreferenciasNotificacionDTO dto = new PreferenciasNotificacionDTO();
        dto.setInfoWhatsapp(Boolean.TRUE.equals(p.getInfoWhatsapp()));
        dto.setInfoSms(Boolean.TRUE.equals(p.getInfoSms()));
        dto.setPromoEmail(Boolean.TRUE.equals(p.getPromoEmail()));
        dto.setPromoWhatsapp(Boolean.TRUE.equals(p.getPromoWhatsapp()));
        dto.setPromoSms(Boolean.TRUE.equals(p.getPromoSms()));
        dto.setPromoAceptadoAt(p.getPromoAceptadoAt() != null ? p.getPromoAceptadoAt().toString() : null);
        dto.setWhatsappDisponible(whatsappDisponible);
        dto.setSmsDisponible(smsDisponible);
        return dto;
    }

    private static String normalizar(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }
}
