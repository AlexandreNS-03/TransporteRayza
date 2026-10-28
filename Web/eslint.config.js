import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig, globalIgnores } from "eslint/config";

/**
 * Revisión de la web pública.
 *
 * <p>Existe por un error concreto: una línea leía una variable `conf` que no
 * existía en esa función. Eso es JavaScript válido —Vite no resuelve nombres—,
 * así que el build pasó limpio y el bundle salió bien. Reventaba recién al
 * ejecutar esa línea, o sea cuando un cliente apretaba "Continuar al pago":
 * la venta en línea quedó cerrada en producción hasta que alguien lo vio a
 * mano. `no-undef` lo agarra en un segundo, y por eso esto corre en el
 * `prebuild` y puede tumbar un despliegue.
 *
 * <p><strong>Frena el build solo lo que está roto.</strong> Los consejos de
 * React —cómo acomodar un efecto, qué memorizar— van como aviso: se leen, no
 * cortan. La diferencia no es de gusto, es de para qué sirve esto: si tumbar
 * un despliegue depende de 30 avisos de estilo, lo primero que se hace es
 * sacarlo del build, y entonces no frena nada. Ver el panel, que tiene la
 * configuración de la plantilla de Vite, acumula 77 errores y nadie la corre.
 */

// Los consejos del plugin de hooks, todos a aviso de una vez, sin listarlos:
// así una regla nueva en la próxima versión tampoco va a cortar un despliegue.
const consejosDeHooks = Object.fromEntries(
  Object.keys(reactHooks.configs.flat.recommended.rules ?? {}).map((r) => [r, "warn"]),
);

export default defineConfig([
  globalIgnores(["dist", "scripts"]),
  {
    files: ["**/*.{js,jsx}"],
    extends: [js.configs.recommended, reactHooks.configs.flat.recommended],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      ...consejosDeHooks,
      // Una variable que sobra no rompe nada en producción. Las que empiezan
      // con mayúscula son componentes, que se usan desde el JSX.
      "no-unused-vars": ["warn", { varsIgnorePattern: "^[A-Z_]", args: "none" }],
      // Adjuntar el error original está bien, pero varios `catch` de acá
      // existen justamente para NO filtrar lo que trae adentro: ver
      // `errores-de-red-que-filtran-la-url`.
      "preserve-caught-error": "warn",
    },
  },
]);
