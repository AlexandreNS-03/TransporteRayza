import { useState } from "react";
import {
  View, Image, TextInput, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ingresar } from "../api";
import { guardarSesion } from "../sesion";
import { Titulo, Texto, Boton, Aviso } from "../componentes/Piezas";
import { color, fuente, espacio, radio } from "../tema";

/**
 * Entrar a la cuenta.
 *
 * <p>Es la misma cuenta de la web: no hay registro acá a propósito. Quien no
 * tiene cuenta compra como invitado en la web, y mandarlo a crear una desde una
 * pantalla chica, con el teclado tapando medio formulario, es la forma más
 * rápida de perderlo.
 *
 * <p><strong>No se dice si el correo existe.</strong> El backend contesta
 * "correo o contraseña incorrectos" para los dos casos, y acá se muestra tal
 * cual: distinguirlos dejaría averiguar quién tiene cuenta probando correos.
 */
export default function Ingresar({ onEntro }) {
  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const puede = email.trim().length > 3 && clave.length > 0;

  const entrar = async () => {
    setCargando(true);
    setError(null);
    try {
      const datos = await ingresar(email.trim(), clave);
      await guardarSesion(datos);
      onEntro(datos.cliente);
    } catch (e) {
      setError(e.message);
      setCargando(false);
    }
  };

  return (
    <SafeAreaView style={s.pantalla} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled">

          <View style={s.marca}>
            <Image
              source={require("../../assets/logo-rayza.png")}
              style={s.logo}
              resizeMode="contain"
              accessibilityLabel="Transportes Rayza"
            />
            <Text style={s.bajada}>AMAZONÍA · PERÚ</Text>
          </View>

          <Titulo style={s.titulo}>Tu viaje, a la mano</Titulo>
          <Texto suave style={s.sub}>
            Entra con la misma cuenta de transporterayza.com. Tus boletos quedan
            guardados en el teléfono y se muestran aunque no tengas señal.
          </Texto>

          <View style={s.campo}>
            <Text style={s.etiqueta}>Correo</Text>
            <TextInput
              style={s.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              placeholder="tucorreo@ejemplo.com"
              placeholderTextColor={color.tintaSuave}
              editable={!cargando}
            />
          </View>

          <View style={s.campo}>
            <Text style={s.etiqueta}>Contraseña</Text>
            <TextInput
              style={s.input}
              value={clave}
              onChangeText={setClave}
              secureTextEntry
              textContentType="password"
              placeholder="••••••••"
              placeholderTextColor={color.tintaSuave}
              editable={!cargando}
              onSubmitEditing={puede ? entrar : undefined}
              returnKeyType="go"
            />
          </View>

          {error && <View style={s.error}><Aviso tono="problema">{error}</Aviso></View>}

          <Boton onPress={entrar} cargando={cargando} deshabilitado={!puede} style={s.boton}>
            Entrar
          </Boton>

          <Texto suave style={s.pie}>
            ¿Olvidaste tu contraseña? Puedes recuperarla desde la web.
          </Texto>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: color.tarjeta },
  scroll: { padding: espacio.xl, paddingTop: espacio.xxl, flexGrow: 1 },

  marca: { alignItems: "center", marginBottom: espacio.xxl },
  logo: { width: 190, height: 56 },
  bajada: {
    fontFamily: fuente.textoMedio, fontSize: 10, color: color.tintaSuave,
    letterSpacing: 3, marginTop: espacio.xs,
  },

  titulo: { marginBottom: espacio.sm },
  sub: { marginBottom: espacio.xl, maxWidth: 420 },

  campo: { marginBottom: espacio.lg },
  etiqueta: {
    fontFamily: fuente.textoMedio, fontSize: 13, color: color.tintaSuave,
    marginBottom: espacio.sm,
  },
  input: {
    borderWidth: 1.5, borderColor: color.lineaFuerte, borderRadius: radio.sm,
    paddingHorizontal: espacio.lg, paddingVertical: 14,
    fontFamily: fuente.texto, fontSize: 16, color: color.tinta,
    backgroundColor: color.tarjeta, minHeight: 52,
  },

  error: { marginBottom: espacio.lg },
  boton: { marginTop: espacio.xs },
  pie: { marginTop: espacio.xl, textAlign: "center" },
});
