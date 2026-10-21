import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import QRCode from "react-native-qrcode-svg";
import * as Brightness from "expo-brightness";
import { Texto, Aviso } from "../componentes/Piezas";
import { color, fuente, espacio, radio, sombra, cifras } from "../tema";

/**
 * El pase de abordar.
 *
 * <p><strong>Esta pantalla es la razón de que la app exista.</strong> Todo lo
 * demás se puede hacer en la web; esto no. Embarcar pasa en un muelle, con sol
 * de frente y sin señal, y lo que tiene que funcionar ahí es el código.
 *
 * <p>Por eso:
 *
 * <ul>
 *   <li><strong>El QR se dibuja en el teléfono</strong>, con el código que ya
 *       vino guardado en el viaje. No se baja una imagen: si hiciera falta red
 *       para verlo, no serviría justo cuando hace falta.</li>
 *   <li><strong>La pantalla se pone al máximo de brillo</strong> mientras el
 *       boleto está abierto, y se devuelve como estaba al salir. Un lector de
 *       QR contra una pantalla a medio brillo bajo el sol no lee, y el pasajero
 *       termina buscando el control de brillo con la fila atrás.</li>
 *   <li><strong>El fondo del código es blanco puro</strong>, y no el celeste de
 *       la marca. El contraste del QR es lo único que no se negocia por
 *       identidad.</li>
 * </ul>
 */
export default function Boleto({ viaje, cliente, onVolver }) {
  const [brilloCambiado, setBrilloCambiado] = useState(false);

  useEffect(() => {
    let previo = null;
    let vivo = true;

    (async () => {
      try {
        // En iOS el brillo de la app se maneja solo; en Android hace falta
        // permiso para tocar el del sistema. Si lo niegan, no pasa nada: el
        // boleto se ve igual, apenas un poco más oscuro.
        const { granted } = await Brightness.requestPermissionsAsync();
        if (!granted || !vivo) return;
        previo = await Brightness.getBrightnessAsync();
        await Brightness.setBrightnessAsync(1);
        if (vivo) setBrilloCambiado(true);
      } catch { /* sin brillo automático; no es motivo para romper la pantalla */ }
    })();

    return () => {
      vivo = false;
      if (previo != null) Brightness.setBrightnessAsync(previo).catch(() => {});
    };
  }, []);

  const [origen, destino] = (viaje.ruta ?? " → ").split(" → ");
  const anulado = viaje.estado === "ANULADO";
  const sinPagar = viaje.estado === "RESERVADO";
  const sirve = !anulado && !sinPagar && !!viaje.codigoQr;

  return (
    <SafeAreaView style={s.pantalla} edges={["top", "bottom"]}>
      <View style={s.barra}>
        <Pressable onPress={onVolver} hitSlop={14} accessibilityRole="button"
                   accessibilityLabel="Volver a mis viajes">
          <Text style={s.volver}>‹ Mis viajes</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.pase}>

          {/* Cabecera: la ruta, que es lo que identifica el viaje de un vistazo */}
          <View style={s.cabecera}>
            <Text style={s.etiquetaClara}>PASE DE ABORDAR</Text>
            <View style={s.ruta}>
              <Text style={s.parada} numberOfLines={1} adjustsFontSizeToFit>{origen}</Text>
              <Text style={s.flecha}>→</Text>
              <Text style={s.parada} numberOfLines={1} adjustsFontSizeToFit>{destino}</Text>
            </View>
            <Text style={s.codigoViaje}>{viaje.viajeCodigo ?? ""}</Text>
          </View>

          {/* La perforación horizontal, como en el talón de papel */}
          <View style={s.perforacion}>
            <View style={[s.muesca, s.muescaIzq]} />
            <View style={s.puntitos} />
            <View style={[s.muesca, s.muescaDer]} />
          </View>

          {/* El código */}
          <View style={s.zonaQr}>
            {sirve ? (
              <>
                <View style={s.marcoQr}>
                  <QRCode
                    value={viaje.codigoQr}
                    size={216}
                    backgroundColor="#ffffff"
                    color="#000000"
                  />
                </View>
                <Text style={s.instruccion}>
                  Muéstralo al embarcar. Funciona sin señal.
                </Text>
                {brilloCambiado && (
                  <Text style={s.brillo}>Subimos el brillo para que lo lean mejor</Text>
                )}
              </>
            ) : (
              <View style={s.sinCodigo}>
                <Aviso tono="problema">
                  {anulado
                    ? "Este pasaje está anulado, así que no tiene código para embarcar."
                    : sinPagar
                      ? "Todavía falta pagar este pasaje. Termina el pago desde la web y el código aparece acá."
                      : "Este pasaje no tiene código. Escríbenos y lo revisamos."}
                </Aviso>
              </View>
            )}
          </View>

          {/* Los datos, abajo del código: se miran después, no antes */}
          <View style={s.datos}>
            <Fila>
              <Dato etiqueta="Pasajero" valor={nombreCorto(cliente)} ancho={2} />
              <Dato etiqueta="Asiento" valor={String(viaje.asientoNumero ?? "—")} />
            </Fila>
            <Fila>
              <Dato etiqueta="Fecha" valor={fecha(viaje.fechaSalida)} ancho={2} />
              <Dato etiqueta="Hora" valor={viaje.horaSalida ? viaje.horaSalida.slice(0, 5) : "—"} />
            </Fila>
            <Fila ultima>
              <Dato etiqueta="Clase" valor={viaje.asientoTipo === "VIP" ? "VIP" : "Normal"} ancho={2} />
              <Dato etiqueta="Estado" valor={estado(viaje)} />
            </Fila>
          </View>
        </View>

        <Texto suave style={s.pie}>
          Llega al embarcadero con tiempo. El código es personal: no lo compartas.
        </Texto>
      </ScrollView>
    </SafeAreaView>
  );
}

function Fila({ children, ultima }) {
  return <View style={[s.fila, !ultima && s.filaConLinea]}>{children}</View>;
}

function Dato({ etiqueta, valor, ancho = 1 }) {
  return (
    <View style={{ flex: ancho }}>
      <Text style={s.etiqueta}>{etiqueta}</Text>
      <Text style={s.valor} numberOfLines={1}>{valor}</Text>
    </View>
  );
}

function estado(v) {
  if (v.estado === "ANULADO") return "Anulado";
  if (v.estado === "RESERVADO") return "Sin pagar";
  return v.embarqueEstado === "EMBARCADO" ? "Embarcado" : "Listo";
}

function nombreCorto(cliente) {
  const n = [cliente?.nombres, cliente?.apellidos].filter(Boolean).join(" ").trim();
  return n || "—";
}

function fecha(iso) {
  if (!iso) return "—";
  const meses = ["ene", "feb", "mar", "abr", "may", "jun",
                 "jul", "ago", "set", "oct", "nov", "dic"];
  const [a, m, d] = iso.split("-");
  return `${d} ${meses[Number(m) - 1] ?? ""} ${a}`;
}

const s = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: color.fondo },

  barra: { paddingHorizontal: espacio.lg, paddingVertical: espacio.md },
  volver: { fontFamily: fuente.textoFuerte, fontSize: 16, color: color.marca700 },

  scroll: { padding: espacio.lg, paddingTop: 0, paddingBottom: espacio.xxl },

  pase: {
    backgroundColor: color.tarjeta, borderRadius: radio.lg,
    overflow: "hidden", ...sombra.tarjeta,
    shadowOpacity: 0.14, shadowRadius: 20,
  },

  cabecera: {
    backgroundColor: color.marca900,
    paddingHorizontal: espacio.xl, paddingVertical: espacio.xl,
  },
  etiquetaClara: {
    fontFamily: fuente.textoMedio, fontSize: 10, color: "rgba(255,255,255,0.7)",
    letterSpacing: 2.2, marginBottom: espacio.md,
  },
  ruta: { flexDirection: "row", alignItems: "center", gap: espacio.md },
  parada: {
    fontFamily: fuente.tituloFuerte, fontSize: 24, color: "#fff",
    flexShrink: 1, letterSpacing: -0.5,
  },
  flecha: { fontFamily: fuente.texto, fontSize: 19, color: color.marca },
  codigoViaje: {
    fontFamily: fuente.textoMedio, fontSize: 11.5, color: "rgba(255,255,255,0.62)",
    marginTop: espacio.sm, letterSpacing: 0.5, ...cifras,
  },

  perforacion: { flexDirection: "row", alignItems: "center", height: 18 },
  puntitos: {
    flex: 1, height: 1.5, borderTopWidth: 1.5,
    borderStyle: "dashed", borderColor: color.linea, marginHorizontal: 10,
  },
  muesca: {
    position: "absolute", width: 18, height: 18, borderRadius: 9,
    backgroundColor: color.fondo,
  },
  muescaIzq: { left: -9 },
  muescaDer: { right: -9 },

  zonaQr: { alignItems: "center", paddingTop: espacio.xl, paddingHorizontal: espacio.xl },
  // Blanco puro y con aire alrededor: un QR sin margen o sobre color no lo lee
  // ningún lector, por lindo que se vea.
  marcoQr: {
    backgroundColor: "#ffffff", padding: espacio.lg, borderRadius: radio.md,
    borderWidth: 1, borderColor: color.linea,
  },
  instruccion: {
    fontFamily: fuente.textoFuerte, fontSize: 14.5, color: color.tinta,
    marginTop: espacio.lg, textAlign: "center",
  },
  brillo: {
    fontFamily: fuente.texto, fontSize: 12, color: color.tintaSuave,
    marginTop: espacio.xs, textAlign: "center",
  },
  sinCodigo: { width: "100%" },

  datos: { padding: espacio.xl, paddingTop: espacio.xl },
  fila: { flexDirection: "row", gap: espacio.lg, paddingBottom: espacio.md },
  filaConLinea: {
    borderBottomWidth: 1, borderBottomColor: color.linea, marginBottom: espacio.md,
  },
  etiqueta: {
    fontFamily: fuente.textoMedio, fontSize: 10, color: color.tintaSuave,
    letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 3,
  },
  valor: { fontFamily: fuente.titulo, fontSize: 16, color: color.tinta, ...cifras },

  pie: { textAlign: "center", marginTop: espacio.xl, paddingHorizontal: espacio.lg },
});
