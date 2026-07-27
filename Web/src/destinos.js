export const DESTINOS = [
  {
    slug: "iquitos",
    nombre: "Iquitos",
    etiqueta: "La puerta de la Amazonía",
    imagen: "iquits.jpg",
    intro: "Una ciudad viva entre los ríos Amazonas, Nanay e Itaya.",
    descripcion: "Iquitos combina historia, gastronomía amazónica y una vida marcada por el río. Es nuestro principal punto de llegada y una gran puerta para descubrir la selva peruana.",
    ruta: "Conexión fluvial desde Requena y los puertos intermedios.",
    destacados: ["Malecón y paseo ribereño", "Mercados y sabores amazónicos", "Punto de partida para conocer la selva"],
    viaje: "Desde Iquitos puedes conectar con Requena, Nauta y comunidades del río.",
  },
  {
    slug: "requena",
    nombre: "Requena",
    etiqueta: "La Atenas del Ucayali",
    imagen: "Requena2025.jpg",
    intro: "Nuestra central, a orillas del río Ucayali.",
    descripcion: "Requena es una ciudad ribereña con una identidad muy ligada a la navegación. Aquí se encuentra nuestra central y el punto de partida de los viajes que acercan personas, carga y comunidades.",
    ruta: "Central de Transportes Rayza y salida de rutas fluviales.",
    destacados: ["Plaza y vida urbana ribereña", "Puerto y movimiento fluvial", "Hotel, restaurante y servicios Rayza"],
    viaje: "Compra tu pasaje desde Requena y elige el tramo que necesitas recorrer.",
  },
  {
    slug: "nauta",
    nombre: "Nauta",
    etiqueta: "Puerto de conexión",
    imagen: "nauta.jpg",
    intro: "Un punto de encuentro entre ríos, historia y carretera.",
    descripcion: "Nauta es una de las ciudades históricas de Loreto y un puerto clave para moverse por la Amazonía. Su cercanía a Iquitos y a las grandes rutas fluviales la convierte en una parada importante para viajeros y comerciantes.",
    ruta: "Parada de conexión en la ruta fluvial de la región.",
    destacados: ["Laguna Sapi Sapi", "Puerto y malecón", "Acceso por carretera desde Iquitos"],
    viaje: "Consulta las salidas disponibles y reserva con anticipación para tu tramo hacia o desde Nauta.",
  },
  {
    slug: "jenaro-herrera",
    nombre: "Jenaro Herrera",
    etiqueta: "Comunidad del río Ucayali",
    imagen: "jherrera.jpg",
    intro: "Un destino ribereño conectado por la ruta de los pueblos del río.",
    descripcion: "Jenaro Herrera forma parte de los puertos que enlazan las comunidades de la provincia de Requena. El viaje por río es parte de su día a día y una forma especial de conocer la vida amazónica.",
    ruta: "Parada intermedia de las rutas que recorren el Ucayali.",
    destacados: ["Paisaje ribereño", "Vida de comunidad", "Conexión con puertos cercanos"],
    viaje: "Selecciona tu origen y destino al comprar: puedes viajar por tramos, no solo hasta el puerto final.",
  },
];

export function buscarDestino(slug) {
  return DESTINOS.find((destino) => destino.slug === slug);
}
