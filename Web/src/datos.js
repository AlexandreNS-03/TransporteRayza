/**
 * Datos de la empresa en un solo lugar.
 *
 * Antes el teléfono, las direcciones y las redes estaban repetidos entre el pie de
 * página y la sección de contacto, así que cambiar un número obligaba a buscarlo en
 * varios archivos. Acá se edita una vez.
 */

export const EMPRESA = {
  nombre: "Multiservicios Rayza E.I.R.L.",
  nombreCorto: "Transportes Rayza",
  telefono: "947012436",
  correo: "transprayza@gmail.com",

  // Aniversario: 28 de julio. La empresa nació en 2023.
  aniversario: { dia: 28, mes: 7, anioFundacion: 2023 },

  redes: {
    facebook: "https://www.facebook.com/multitrayza/",
    instagram: "https://www.instagram.com/transportes_rayza/",
    instagramUsuario: "Transportes_rayza",
  },

  // La central está en Requena
  oficinas: [
    {
      ciudad: "Requena",
      central: true,
      puntos: [
        { tipo: "Ventas",   direccion: "Calle Manaos S/N" },
        { tipo: "Oficinas", direccion: "Calle San Antonio 270" },
      ],
    },
    {
      ciudad: "Iquitos",
      central: false,
      puntos: [
        { tipo: "Ventas", direccion: "Jr. Fitzcarrald 377" },
      ],
    },
  ],
};

/** Teléfono en formato internacional, para los enlaces de llamada y WhatsApp. */
export const telefonoInternacional = `51${EMPRESA.telefono}`;

/** Formato legible: 947 012 436 */
export const telefonoBonito = EMPRESA.telefono.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3");

/**
 * Años que cumple la empresa. Se calcula, no se escribe a mano: un número fijo
 * envejece mal y termina mintiendo al año siguiente.
 */
export function aniosDeAniversario(hoy = new Date()) {
  const { dia, mes, anioFundacion } = EMPRESA.aniversario;
  const yaCumplio =
    hoy.getMonth() + 1 > mes || (hoy.getMonth() + 1 === mes && hoy.getDate() >= dia);
  return hoy.getFullYear() - anioFundacion + (yaCumplio ? 0 : -1);
}

/** ¿Estamos en el mes del aniversario? Para mostrar el aviso solo cuando toca. */
export function esMesDeAniversario(hoy = new Date()) {
  return hoy.getMonth() + 1 === EMPRESA.aniversario.mes;
}
