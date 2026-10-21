import { useCallback, useEffect, useState } from "react";
import {
  View, Text, FlatList, Pressable, StyleSheet, RefreshControl, Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { misViajes, viajesGuardados, esFaltaDeSenal } from "../api";
import { Texto, Aviso, Boton } from "../componentes/Piezas";
import { color, fuente, espacio, radio, sombra, cifras } from "../tema";

/**
 * La lista de viajes: la pantalla donde se abre la app.
 *
 * <p><strong>Dibuja primero lo guardado y después refresca.</strong> No hay
 * pantalla de carga si ya hay algo que mostrar: quien abre la app en el muelle,
 * con una raya de señal, ve su boleto al instante en vez de una ruedita.
 *
 * <p>Si el refresco falla, no se borra nada y se avisa arriba. Un boleto viejo
 * sirve; una lista vacía con un error, no.
 */
export default function MisViajes({ cliente, onVerBoleto, onSalir }) {
  const [viajes, setViajes] = useState(null);
  const [guardadoAt, setGuardadoAt] = useState(null);
  const [sinSenal, setSinSenal] = useState(false);
  const [error, setError] = useState(null);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async (esRefresco) => {
    if (esRefresco) setRefrescando(true);
    try {
      const frescos = await misViajes();
      setViajes(frescos);
      setGuardadoAt(new Date().toISOString());
      setSinSenal(false);
      setError(null);
    } catch (e) {
      if (esFaltaDeSenal(e)) setSinSenal(true);
      else setError(e.message);
    } finally {
      setRefrescando(false);
    }
  }, []);

  useEffect(() => {
    // Lo guardado primero, para que la pantalla no arranque en blanco.
    (async () => {
      const cache = await viajesGuardados();
      if (cache?.viajes) {
        setViajes(cache.viajes);
        setGuardadoAt(cache.guardadoAt);
      }
      cargar(false);
    })();
  }, [cargar]);

  const proximos = (viajes ?? []).filter((v) => v.proximo && v.estado !== "ANULADO");
  const pasados  = (viajes ?? []).filter((v) => !v.proximo || v.estado === "ANULADO");

  return (
    <SafeAreaView style={s.pantalla} edges={["top"]}>
      <View style={s.cabecera}>
        <View style={{ flex: 1 }}>
          <Text style={s.hola}>Hola, {cliente?.nombres ?? "viajero"}</Text>
          <Text style={s.cabeceraSub}>Tus viajes</Text>
        </View>
        <Image
          source={require("../../assets/logo-rayza.png")}
          style={s.logo}
          resizeMode="contain"
          accessibilityLabel="Transportes Rayza"
        />
      </View>

      <FlatList
        data={proximos}
        keyExtractor={(v) => v.ventaId}
        contentContainerStyle={s.lista}
        refreshControl={
          <RefreshControl refreshing={refrescando} onRefresh={() => cargar(true)}
                          tintColor={color.marca700} />
        }
        ListHeaderComponent={
          <>
            {sinSenal && (
              <View style={s.avisoCaja}>
                <Aviso tono="problema">
                  Sin conexión. Te mostramos lo último que guardamos
                  {guardadoAt ? ` (${desdeCuando(guardadoAt)})` : ""}. Tu boleto
                  igual sirve para embarcar.
                </Aviso>
              </View>
            )}
            {error && (
              <View style={s.avisoCaja}><Aviso tono="problema">{error}</Aviso></View>
            )}
          </>
        }
        renderItem={({ item }) => (
          <TarjetaViaje viaje={item} onPress={() => onVerBoleto(item)} />
        )}
        ListEmptyComponent={
          viajes === null ? null : (
            <View style={s.vacio}>
              <Text style={s.vacioTitulo}>Todavía no tienes viajes</Text>
              <Texto suave style={s.vacioTexto}>
                Cuando compres un pasaje va a aparecer acá, con su código para
                embarcar.
              </Texto>
            </View>
          )
        }
        ListFooterComponent={
          <>
            {pasados.length > 0 && (
              <>
                <Text style={s.seccion}>Viajes anteriores</Text>
                {pasados.map((v) => (
                  <TarjetaViaje key={v.ventaId} viaje={v} pasado
                                onPress={() => onVerBoleto(v)} />
                ))}
              </>
            )}
            <Boton secundario onPress={onSalir} style={s.salir}>Cerrar sesión</Boton>
          </>
        }
      />
    </SafeAreaView>
  );
}

/**
 * Un viaje, con forma de pase de abordar: el talón de la izquierda separado por
 * una línea de puntos. Es la figura que la gente ya reconoce, y hace que la
 * lista se lea sin leerla.
 */
function TarjetaViaje({ viaje, pasado, onPress }) {
  const [origen, destino] = (viaje.ruta ?? " → ").split(" → ");
  const anulado = viaje.estado === "ANULADO";
  const embarcado = viaje.embarqueEstado === "EMBARCADO";

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Boleto de ${origen} a ${destino}, ${fecha(viaje.fechaSalida)}`}
      style={({ pressed }) => [
        s.pase, pasado && s.paseApagado, pressed && s.paseHundido,
      ]}>

      <View style={s.taloncito}>
        <Text style={s.taloncitoNum}>{viaje.asientoNumero ?? "—"}</Text>
        <Text style={s.taloncitoEti}>ASIENTO</Text>
        {viaje.asientoTipo === "VIP" && <Text style={s.vip}>VIP</Text>}
      </View>

      {/* La perforación: dos muescas y la línea de puntos entre ellas. */}
      <View style={s.perforacion}>
        <View style={[s.muesca, s.muescaArriba]} />
        <View style={s.puntitos} />
        <View style={[s.muesca, s.muescaAbajo]} />
      </View>

      <View style={s.cuerpo}>
        <View style={s.ruta}>
          <Text style={s.parada} numberOfLines={1}>{origen}</Text>
          <Text style={s.flecha}>→</Text>
          <Text style={s.parada} numberOfLines={1}>{destino}</Text>
        </View>

        <Text style={s.cuando}>
          {fecha(viaje.fechaSalida)}
          {viaje.horaSalida ? ` · ${viaje.horaSalida.slice(0, 5)} h` : ""}
        </Text>

        <View style={s.etiquetas}>
          {anulado   && <Etiqueta texto="Anulado" tono="problema" />}
          {embarcado && <Etiqueta texto="Embarcado" tono="ok" />}
          {!anulado && !embarcado && viaje.estado === "PAGADO" &&
            <Etiqueta texto="Listo para embarcar" tono="info" />}
          {viaje.estado === "RESERVADO" && <Etiqueta texto="Falta pagar" tono="problema" />}
        </View>
      </View>
    </Pressable>
  );
}

function Etiqueta({ texto, tono }) {
  return (
    <View style={[s.eti, tono === "ok" && s.etiOk, tono === "problema" && s.etiProblema]}>
      <Text style={[s.etiTexto, tono === "ok" && s.etiTextoOk,
                    tono === "problema" && s.etiTextoProblema]}>{texto}</Text>
    </View>
  );
}

/** "2026-12-15" → "15 dic 2026". Sin Date: el string ya viene del servidor. */
function fecha(iso) {
  if (!iso) return "—";
  const meses = ["ene", "feb", "mar", "abr", "may", "jun",
                 "jul", "ago", "set", "oct", "nov", "dic"];
  const [a, m, d] = iso.split("-");
  return `${d} ${meses[Number(m) - 1] ?? ""} ${a}`;
}

function desdeCuando(iso) {
  const minutos = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutos < 1) return "recién";
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  return `hace ${Math.round(horas / 24)} d`;
}

const s = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: color.fondo },

  cabecera: {
    backgroundColor: color.marca900,
    paddingHorizontal: espacio.xl, paddingTop: espacio.md, paddingBottom: espacio.xl,
    flexDirection: "row", alignItems: "center", gap: espacio.md,
  },
  hola: {
    fontFamily: fuente.tituloFuerte, fontSize: 24, color: color.sobreOscuro,
    letterSpacing: -0.4,
  },
  cabeceraSub: {
    fontFamily: fuente.textoMedio, fontSize: 13, color: color.sobreOscuroSuave,
    marginTop: 2,
  },
  logo: { width: 92, height: 30, opacity: 0.95 },

  lista: { padding: espacio.lg, paddingBottom: espacio.xxl },
  avisoCaja: { marginBottom: espacio.lg },

  seccion: {
    fontFamily: fuente.titulo, fontSize: 15, color: color.tintaSuave,
    marginTop: espacio.xl, marginBottom: espacio.md,
  },

  pase: {
    flexDirection: "row", backgroundColor: color.tarjeta,
    borderRadius: radio.md, marginBottom: espacio.md,
    overflow: "hidden", ...sombra.tarjeta,
  },
  paseApagado: { opacity: 0.62 },
  paseHundido: { transform: [{ scale: 0.99 }] },

  taloncito: {
    width: 86, backgroundColor: color.marca700,
    alignItems: "center", justifyContent: "center", paddingVertical: espacio.lg,
  },
  taloncitoNum: {
    fontFamily: fuente.tituloFuerte, fontSize: 30, color: "#fff", ...cifras,
  },
  taloncitoEti: {
    fontFamily: fuente.textoMedio, fontSize: 9, color: "rgba(255,255,255,0.78)",
    letterSpacing: 1.4, marginTop: 2,
  },
  vip: {
    fontFamily: fuente.textoFuerte, fontSize: 9.5, color: color.marca800,
    backgroundColor: color.oro, letterSpacing: 1,
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: radio.pleno,
    marginTop: espacio.sm, overflow: "hidden",
  },

  perforacion: { width: 14, justifyContent: "center", alignItems: "center" },
  puntitos: {
    flex: 1, width: 1.5, borderLeftWidth: 1.5,
    borderStyle: "dashed", borderColor: color.linea,
    marginVertical: 9,
  },
  muesca: {
    position: "absolute", width: 16, height: 16, borderRadius: 8,
    backgroundColor: color.fondo,
  },
  muescaArriba: { top: -8 },
  muescaAbajo: { bottom: -8 },

  cuerpo: { flex: 1, padding: espacio.lg, justifyContent: "center" },
  ruta: { flexDirection: "row", alignItems: "center", gap: espacio.sm },
  parada: {
    fontFamily: fuente.titulo, fontSize: 17, color: color.tinta,
    flexShrink: 1, letterSpacing: -0.3,
  },
  flecha: { fontFamily: fuente.texto, fontSize: 15, color: color.marca },
  cuando: {
    fontFamily: fuente.textoMedio, fontSize: 13.5, color: color.tintaSuave,
    marginTop: espacio.xs, ...cifras,
  },

  etiquetas: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: espacio.md },
  eti: {
    backgroundColor: color.cieloSuave, borderRadius: radio.pleno,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  etiOk: { backgroundColor: color.okSuave },
  etiProblema: { backgroundColor: color.avisoSuave },
  etiTexto: { fontFamily: fuente.textoFuerte, fontSize: 11.5, color: color.marca800 },
  etiTextoOk: { color: color.ok },
  etiTextoProblema: { color: color.avisoTinta },

  vacio: { alignItems: "center", paddingVertical: espacio.xxl, paddingHorizontal: espacio.lg },
  vacioTitulo: { fontFamily: fuente.titulo, fontSize: 18, color: color.tinta },
  vacioTexto: { textAlign: "center", marginTop: espacio.sm, maxWidth: 300 },

  salir: { marginTop: espacio.xxl },
});
