import { iniciarGA } from "./ga";
import { iniciarClarity } from "./clarity";

/**
 * Enciende la analítica (Google Analytics + Microsoft Clarity). Solo debe llamarse
 * cuando el visitante aceptó las cookies. Cada cargador es idempotente y solo actúa
 * en el build de producción.
 */
export function iniciarAnalitica() {
  iniciarGA();
  iniciarClarity();
}
