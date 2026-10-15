package com.example.demo.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

/**
 * El envío de SMS por Twilio.
 *
 * Lo que se prueba acá es el número, porque es donde se pierden los mensajes:
 * Twilio pide E.164 estricto y, cuando el número viene mal, el error que
 * devuelve no dice cuál era el problema. Un SMS que no llega con el código de
 * verificación adentro es una cuenta que no se puede verificar.
 */
class SmsTest {

    @Test
    @DisplayName("Deja el número como lo quiere Twilio: + y dígitos, nada más")
    void limpiaElNumero() {
        assertEquals("+51965123456", SmsService.aE164("+51 965 123 456"));
        assertEquals("+51965123456", SmsService.aE164("+51-965-123-456"));
        assertEquals("+51965123456", SmsService.aE164("51965123456"));
    }

    @Test
    @DisplayName("Le saca el 0 de larga distancia, que acá se escribe por costumbre")
    void sacaElCeroDeLargaDistancia() {
        // Con ese cero el mensaje no llega y Twilio no explica por qué.
        assertEquals("+51965123456", SmsService.aE164("+510965123456"));
    }

    @Test
    @DisplayName("Un número que no puede ser, no se manda")
    void rechazaLoQueNoEsUnNumero() {
        assertNull(SmsService.aE164(null));
        assertNull(SmsService.aE164("+51"));
        assertNull(SmsService.aE164("965123"));                  // muy corto
        assertNull(SmsService.aE164("+5196512345678901234"));    // pasa E.164
    }

    @Test
    @DisplayName("Sin credenciales no está activo, aunque el flag esté encendido")
    void elFlagSoloNoAlcanza() {
        SmsService s = new SmsService();
        ReflectionTestUtils.setField(s, "habilitado", true);
        ReflectionTestUtils.setField(s, "accountSid", "");
        ReflectionTestUtils.setField(s, "authToken", "");
        ReflectionTestUtils.setField(s, "from", "");
        assertFalse(s.estaActivo(), "encender el flag sin Twilio sería un botón que falla");

        ReflectionTestUtils.setField(s, "accountSid", "AC123");
        ReflectionTestUtils.setField(s, "authToken", "token");
        ReflectionTestUtils.setField(s, "from", "+15550000000");
        assertTrue(s.estaActivo());

        ReflectionTestUtils.setField(s, "habilitado", false);
        assertFalse(s.estaActivo(), "con el flag apagado no se manda nada");
    }

    @Test
    @DisplayName("Si Twilio no responde, el aviso no lleva la URL ni el SID de la cuenta")
    void noFiltraLaUrlNiElSid() {
        // Las excepciones de RestTemplate son RuntimeException, así que pasaban
        // de largo y el cliente veía "I/O error on POST request for
        // http://.../Accounts/ACxxxx/Messages.json" en una pantalla pública.
        SmsService s = new SmsService();
        ReflectionTestUtils.setField(s, "habilitado", true);
        ReflectionTestUtils.setField(s, "accountSid", "ACsecreto123");
        ReflectionTestUtils.setField(s, "authToken", "token-secreto");
        ReflectionTestUtils.setField(s, "from", "+15550000000");
        // Un puerto donde no hay nadie escuchando.
        ReflectionTestUtils.setField(s, "endpoint", "http://127.0.0.1:1");

        RuntimeException e = assertThrows(RuntimeException.class,
                () -> s.enviar("+51965123456", "hola"));

        assertFalse(e.getMessage().contains("ACsecreto123"), "no puede salir el SID");
        assertFalse(e.getMessage().contains("token-secreto"), "menos todavía el token");
        assertFalse(e.getMessage().contains("127.0.0.1"), "ni la URL interna");
        assertTrue(e.getMessage().toLowerCase().contains("no se pudo conectar"));
    }

    @Test
    @DisplayName("Apagado, mandar explota en vez de hacer de cuenta que mandó")
    void apagadoNoFingeQueMando() {
        SmsService s = new SmsService();
        ReflectionTestUtils.setField(s, "habilitado", false);
        ReflectionTestUtils.setField(s, "accountSid", "");
        ReflectionTestUtils.setField(s, "authToken", "");
        ReflectionTestUtils.setField(s, "from", "");

        assertThrows(RuntimeException.class, () -> s.enviar("+51965123456", "hola"));
    }
}
