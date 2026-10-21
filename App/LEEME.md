# Transportes Rayza — app del pasajero (beta)

App en **Expo / React Native**: un solo código para iPhone y Android. Se eligió así porque
el equipo ya escribe React en `Web/` y `Frontend/`, y porque la app **no estrena API**: usa
los mismos endpoints que la web (`/auth/cliente/*`, `/api/cliente/*`).

## Qué hace hoy

- Entrar con la cuenta de transporterayza.com
- Ver los viajes, próximos y pasados
- **El pase de abordar con QR, que funciona sin señal** — la razón de que exista la app

## Lo que la hace distinta de la web

Embarcar pasa en un muelle, con sol de frente y sin señal:

- Los viajes se **guardan en el teléfono** apenas llegan. La lista se dibuja con lo guardado
  y después refresca; si el refresco falla, no se borra nada y se avisa arriba.
- El **QR se dibuja en el teléfono** con el código que ya vino guardado. No se baja una
  imagen: si hiciera falta red para verlo, no serviría justo cuando hace falta.
- La pantalla del boleto **sube el brillo al máximo** y lo devuelve al salir. Un lector
  contra una pantalla a medio brillo bajo el sol no lee.
- El token va en **SecureStore** (Keychain / Keystore), no en AsyncStorage: es una
  credencial. Al cerrar sesión se borran también los viajes guardados.

## Correrla

```bash
cd App
npm install
npx expo start
```

Y escanear el QR con **Expo Go** desde el teléfono. El teléfono y la máquina tienen que
estar en la misma red.

El backend tiene que estar levantado:

```bash
cd Backend && ./mvnw spring-boot:run -Dspring-boot.run.arguments="--nubefact.enabled=false"
```

La app encuentra sola la IP de la máquina (la saca del servidor de Expo), así que no hay
que configurar nada. Para apuntar a otro servidor: `extra.apiUrl` en `app.json`.

### En el simulador de iOS

Hace falta terminar la instalación de Xcode una vez:

```bash
sudo xcodebuild -runFirstLaunch
xcodebuild -downloadPlatform iOS
```

Después, `npx expo start` y tecla `i`.

## Lo que falta

- Comprar desde la app
- La wallet y las formas de pago guardadas
- Notificaciones (el viaje que sale mañana, el que se reprogramó)
- Yape On File como método guardado, cuando GMoney entregue la API
- Íconos y splash propios: hoy son los de la plantilla
