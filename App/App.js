import { useCallback, useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
// Cada peso por su propia ruta y no desde el índice del paquete: importando
// "@expo-google-fonts/poppins" entero, el empaquetador se lleva las 18
// variantes —todas las itálicas incluidas—, que acá no se usa ninguna. Son
// megas de más en un teléfono que descarga la app con una raya de señal.
import { Poppins_700Bold } from "@expo-google-fonts/poppins/700Bold";
import { Poppins_800ExtraBold } from "@expo-google-fonts/poppins/800ExtraBold";
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";

import Ingresar from "./src/pantallas/Ingresar";
import MisViajes from "./src/pantallas/MisViajes";
import Boleto from "./src/pantallas/Boleto";
import { token, clienteGuardado, cerrarSesion } from "./src/sesion";
import { color } from "./src/tema";

/**
 * Transportes Rayza — app del pasajero (beta).
 *
 * La navegación es un estado y no una librería a propósito: hay tres pantallas
 * y dos caminos entre ellas. Una pila de navegación acá sería andamiaje para
 * sostener una repisa. El día que entren comprar, la wallet y la cuenta, se
 * cambia por react-navigation —ya está instalado— sin tocar las pantallas.
 */
export default function App() {
  const [listo, setListo] = useState(false);
  const [cliente, setCliente] = useState(null);
  const [viajeAbierto, setViajeAbierto] = useState(null);

  const [fuentesListas] = useFonts({
    Poppins_700Bold, Poppins_800ExtraBold,
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold,
  });

  useEffect(() => {
    // La sesión se recuerda: un pasajero no debería escribir su contraseña en
    // el muelle, con una mano ocupada y el bote por salir.
    (async () => {
      const t = await token();
      if (t) setCliente((await clienteGuardado()) ?? {});
      setListo(true);
    })();
  }, []);

  const salir = useCallback(async () => {
    await cerrarSesion();
    setViajeAbierto(null);
    setCliente(null);
  }, []);

  if (!listo || !fuentesListas) {
    return (
      <View style={e.cargando}>
        <ActivityIndicator size="large" color={color.marca700} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      {/* Sobre la cabecera azul oscuro el texto de la barra va claro; sobre el
          blanco del ingreso, oscuro. */}
      <StatusBar style={cliente ? "light" : "dark"} />

      {!cliente ? (
        <Ingresar onEntro={setCliente} />
      ) : viajeAbierto ? (
        <Boleto
          viaje={viajeAbierto}
          cliente={cliente}
          onVolver={() => setViajeAbierto(null)}
        />
      ) : (
        <MisViajes
          cliente={cliente}
          onVerBoleto={setViajeAbierto}
          onSalir={salir}
        />
      )}
    </SafeAreaProvider>
  );
}

const e = StyleSheet.create({
  cargando: {
    flex: 1, alignItems: "center", justifyContent: "center",
    backgroundColor: color.fondo,
  },
});
