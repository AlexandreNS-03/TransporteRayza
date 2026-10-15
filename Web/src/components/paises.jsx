/**
 * Los países, en el orden en que le sirven a quien viaja por acá: primero los
 * de la región y los que más aparecen, después el resto alfabético.
 *
 * Una lista completa de 195 en un desplegable es peor que una corta bien
 * ordenada: el que busca "Perú" no debería pasar por Afganistán.
 */
export const PAISES_FRECUENTES = [
  ["PE", "Perú"], ["BR", "Brasil"], ["CO", "Colombia"], ["EC", "Ecuador"],
  ["BO", "Bolivia"],
];

export const PAISES_RESTO = [
  ["AR", "Argentina"], ["CL", "Chile"], ["CR", "Costa Rica"], ["CU", "Cuba"],
  ["DE", "Alemania"], ["ES", "España"], ["FR", "Francia"], ["GB", "Reino Unido"],
  ["GY", "Guyana"], ["IT", "Italia"], ["JP", "Japón"], ["MX", "México"],
  ["NL", "Países Bajos"], ["PA", "Panamá"], ["PY", "Paraguay"], ["SR", "Surinam"],
  ["US", "Estados Unidos"], ["UY", "Uruguay"], ["VE", "Venezuela"],
];

export const PAISES = [...PAISES_FRECUENTES, ...PAISES_RESTO];

export function nombreDePais(iso) {
  const p = PAISES.find(([v]) => v === iso);
  return p ? p[1] : iso;
}

/** El desplegable, con los de la región arriba y una línea que los separa. */
export function OpcionesDePais() {
  return (
    <>
      {PAISES_FRECUENTES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      <option disabled>──────────</option>
      {PAISES_RESTO.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </>
  );
}
