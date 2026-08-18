/**
 * Datos de la empresa que salen impresos en comprobantes, tickets y manifiestos.
 *
 * Vive en un solo lugar a propósito: el RUC no solo se imprime, también forma
 * parte de la cadena del QR que exige SUNAT (ver `qrSunat` en
 * generarComprobantePDF.jsx). Si estuviera copiado en cada documento, bastaría
 * olvidar uno para emitir con un QR que no valida.
 */
export const RUC_EMPRESA = "20600697928";

export const RAZON_SOCIAL = "TRANSPORTES RAYZA";
