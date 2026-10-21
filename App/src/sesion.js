import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * La sesión del cliente.
 *
 * <p><strong>El token va en SecureStore y no en AsyncStorage.</strong> Son dos
 * cosas distintas: AsyncStorage es un archivo sin cifrar dentro del sandbox de
 * la app, y SecureStore es el llavero del sistema (Keychain en iOS, Keystore en
 * Android). Un JWT es una credencial — con él se entra a la cuenta, se ven las
 * boletas y se gasta el saldo de la wallet —, así que va donde va una
 * credencial.
 *
 * <p>Los datos del perfil, en cambio, sí van en AsyncStorage: son para saludar
 * por el nombre mientras carga, y el llavero es lento para eso.
 */

const LLAVE_TOKEN = "rayza_token";
const LLAVE_CLIENTE = "rayza_cliente";

export async function guardarSesion({ token, cliente }) {
  await SecureStore.setItemAsync(LLAVE_TOKEN, token);
  await AsyncStorage.setItem(LLAVE_CLIENTE, JSON.stringify(cliente ?? {}));
}

export async function token() {
  try { return await SecureStore.getItemAsync(LLAVE_TOKEN); }
  catch { return null; }
}

export async function clienteGuardado() {
  try {
    const crudo = await AsyncStorage.getItem(LLAVE_CLIENTE);
    return crudo ? JSON.parse(crudo) : null;
  } catch { return null; }
}

/**
 * Cierra la sesión.
 *
 * <p>Borra también los viajes guardados: quedan en el teléfono para poder
 * mostrar el boleto sin señal, y son de la persona que se está yendo. Si
 * alguien presta el teléfono, lo que no se borró es lo que después se ve.
 */
export async function cerrarSesion() {
  await SecureStore.deleteItemAsync(LLAVE_TOKEN).catch(() => {});
  await AsyncStorage.multiRemove([LLAVE_CLIENTE, "rayza_viajes"]).catch(() => {});
}
