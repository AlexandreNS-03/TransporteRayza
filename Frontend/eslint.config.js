import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

/**
 * Revisión del panel. Mismo criterio que la web (`Web/eslint.config.js`), y a
 * propósito: dos listados con reglas distintas se leen como dos opiniones, y
 * entonces no se lee ninguno.
 *
 * <p><strong>Frena el build solo lo que está roto.</strong> Lo demás avisa.
 * Esto no es comodidad: era la configuración que trae la plantilla de Vite,
 * daba 96 avisos —77 de ellos como error— y no estaba en el build. Nadie
 * corría `npm run lint`, así que no frenaba nada. Un listado que nadie lee
 * sirve lo mismo que no tenerlo.
 *
 * <p>Lo que sí frena es que se use algo que no existe. En la web eso cerró la
 * venta en línea un día entero: `no-undef` lo marca en un segundo, y el build
 * se detiene antes de publicar una pantalla rota.
 */

// Los consejos de React, todos a aviso de una vez y tomados de la lista de
// cada plugin en vez de escritos a mano: así una regla nueva en la próxima
// versión tampoco corta un despliegue.
const consejos = (config) =>
  Object.fromEntries(Object.keys(config.rules ?? {}).map((r) => [r, 'warn']))

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      ...consejos(reactHooks.configs.flat.recommended),
      ...consejos(reactRefresh.configs.vite),
      // Las funciones que arman pantallas se llaman en español (`usarPaleta`),
      // y la regla las juzga por el nombre: no puede saber que son hooks.
      'react-hooks/rules-of-hooks': 'off',
      // Avisa, no frena: una variable que sobra no rompe nada en producción.
      // Las que empiezan con mayúscula son componentes, usados desde el JSX.
      'no-unused-vars': ['warn', { varsIgnorePattern: '^[A-Z_]', args: 'none' }],
      // Adjuntar el error original está bien, pero varios `catch` de acá
      // existen justamente para NO filtrar lo que traen adentro.
      'preserve-caught-error': 'warn',
    },
  },
])
