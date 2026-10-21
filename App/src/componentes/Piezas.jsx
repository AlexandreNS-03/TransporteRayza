import { Text, View, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { color, fuente, espacio, radio, sombra, cifras } from "../tema";

/**
 * Las piezas sueltas que se repiten en todas las pantallas.
 *
 * Están juntas en un archivo porque son cuatro y chicas; el día que una crezca
 * se muda sola. Lo que importa es que el color y la tipografía salgan del tema
 * y no se escriban a mano en cada pantalla: así la identidad se cambia en un
 * solo lugar.
 */

export function Titulo({ children, style }) {
  return <Text style={[e.titulo, style]}>{children}</Text>;
}

export function Texto({ children, suave, fuerte, style, ...props }) {
  return (
    <Text
      style={[e.texto, suave && e.textoSuave, fuerte && e.textoFuerte, style]}
      {...props}>
      {children}
    </Text>
  );
}

/** Para un dato que se lee de un vistazo: el asiento, la hora, el monto. */
export function Dato({ etiqueta, valor, style }) {
  return (
    <View style={style}>
      <Text style={e.etiqueta}>{etiqueta}</Text>
      <Text style={e.valor}>{valor ?? "—"}</Text>
    </View>
  );
}

export function Boton({ children, onPress, cargando, secundario, deshabilitado, style }) {
  const apagado = deshabilitado || cargando;
  return (
    <Pressable
      onPress={apagado ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!apagado, busy: !!cargando }}
      // El botón se hunde al tocarlo. Sin eso no se siente que la app escuchó,
      // y en una pantalla táctil es lo único que confirma el toque.
      style={({ pressed }) => [
        e.boton,
        secundario && e.botonSecundario,
        apagado && e.botonApagado,
        pressed && !apagado && e.botonHundido,
        style,
      ]}>
      {cargando
        ? <ActivityIndicator color={secundario ? color.marca700 : "#fff"} />
        : <Text style={[e.botonTexto, secundario && e.botonTextoSecundario]}>{children}</Text>}
    </Pressable>
  );
}

/** Un aviso. `tono` es "info", "ok" o "problema". */
export function Aviso({ children, tono = "info" }) {
  return (
    <View style={[e.aviso, tono === "ok" && e.avisoOk, tono === "problema" && e.avisoProblema]}>
      <Text style={[e.avisoTexto, tono === "ok" && e.avisoTextoOk,
                    tono === "problema" && e.avisoTextoProblema]}>
        {children}
      </Text>
    </View>
  );
}

export function Tarjeta({ children, style }) {
  return <View style={[e.tarjeta, style]}>{children}</View>;
}

const e = StyleSheet.create({
  titulo: {
    fontFamily: fuente.titulo, fontSize: 26, color: color.tinta,
    letterSpacing: -0.5, lineHeight: 32,
  },
  texto: { fontFamily: fuente.texto, fontSize: 15, color: color.tinta, lineHeight: 22 },
  textoSuave: { color: color.tintaSuave, fontSize: 13.5 },
  textoFuerte: { fontFamily: fuente.textoFuerte },

  etiqueta: {
    fontFamily: fuente.textoMedio, fontSize: 10.5, color: color.tintaSuave,
    letterSpacing: 1.1, textTransform: "uppercase", marginBottom: 3,
  },
  valor: {
    fontFamily: fuente.titulo, fontSize: 17, color: color.tinta, ...cifras,
  },

  boton: {
    backgroundColor: color.acento, borderRadius: radio.sm,
    paddingVertical: 15, paddingHorizontal: espacio.xl,
    alignItems: "center", justifyContent: "center", minHeight: 52,
  },
  botonSecundario: {
    backgroundColor: "transparent", borderWidth: 1.5, borderColor: color.lineaFuerte,
  },
  botonApagado: { opacity: 0.45 },
  botonHundido: { transform: [{ scale: 0.985 }], backgroundColor: color.acento600 },
  botonTexto: { fontFamily: fuente.textoFuerte, fontSize: 16, color: "#fff" },
  botonTextoSecundario: { color: color.marca700 },

  aviso: {
    backgroundColor: color.cieloSuave, borderRadius: radio.sm,
    paddingVertical: espacio.md, paddingHorizontal: espacio.lg,
    borderWidth: 1, borderColor: "#bfe0f4",
  },
  avisoOk: { backgroundColor: color.okSuave, borderColor: "#a7e3bf" },
  avisoProblema: { backgroundColor: color.avisoSuave, borderColor: "#f0d38a" },
  avisoTexto: { fontFamily: fuente.texto, fontSize: 14, color: "#0b4a72", lineHeight: 20 },
  avisoTextoOk: { color: color.ok },
  avisoTextoProblema: { color: color.avisoTinta },

  tarjeta: {
    backgroundColor: color.tarjeta, borderRadius: radio.md,
    padding: espacio.lg, ...sombra.tarjeta,
  },
});
