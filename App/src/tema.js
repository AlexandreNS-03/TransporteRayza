/**
 * La identidad de Rayza, en la app.
 *
 * Son los mismos valores que la web (Web/src/index.css): el celeste turquesa
 * sale del casco del RAYZA II, con blanco y el rojo de la marca. Están copiados
 * a mano y no importados porque no hay cómo compartir un .css con React Native
 * — si se tocan allá, se tocan acá.
 *
 * La estructura de las pantallas se parece a la de una aerolínea porque el
 * problema es el mismo —un viaje, un asiento, un pase que hay que mostrar al
 * embarcar—, pero el color, la tipografía y el tono son nuestros.
 */

export const color = {
  marca:       "#1ea6dd",
  marca600:    "#178cbe",
  marca700:    "#10709c",
  marca800:    "#0b5578",
  marca900:    "#083d57",   // cabecera; más oscuro que la web para ganar la barra de estado
  acento:      "#e01e2a",
  acento600:   "#bd1420",
  cieloSuave:  "#e6f5fc",
  oro:         "#e0a93b",

  fondo:       "#f4f7fc",
  tarjeta:     "#ffffff",
  tinta:       "#0f172a",
  tintaSuave:  "#55617a",
  linea:       "#e6ecf4",
  lineaFuerte: "#d3ddec",

  sobreOscuro: "#ffffff",
  sobreOscuroSuave: "rgba(255,255,255,0.72)",

  ok:          "#15803d",
  okSuave:     "#ecfdf3",
  avisoSuave:  "#fff6e6",
  avisoTinta:  "#7a5300",
};

/** Poppins para títulos, Inter para texto. Las mismas dos de la web. */
export const fuente = {
  titulo:       "Poppins_700Bold",
  tituloFuerte: "Poppins_800ExtraBold",
  texto:        "Inter_400Regular",
  textoMedio:   "Inter_500Medium",
  textoFuerte:  "Inter_600SemiBold",
};

/** Escala de espacio en múltiplos de 4: evita los 13px y los 27px sueltos. */
export const espacio = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radio = { sm: 10, md: 16, lg: 22, pleno: 999 };

export const sombra = {
  tarjeta: {
    shadowColor: "#0b2c5e",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
};

/**
 * Los números de asiento, fecha y precio van con cifras de ancho fijo: si no,
 * una columna de montos queda bailando y cuesta compararlos de un vistazo.
 */
export const cifras = { fontVariant: ["tabular-nums"] };
