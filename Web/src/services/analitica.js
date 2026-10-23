import { iniciarGA } from "./ga";
import { iniciarClarity } from "./clarity";
import { iniciarPixeles } from "./marketing";

/**
 * Enciende la medición: analítica (Google Analytics, Microsoft Clarity) y los
 * píxeles de publicidad (Meta, TikTok). Solo debe llamarse cuando el visitante
 * aceptó las cookies. Cada cargador es idempotente, solo actúa en el build de
 * producción, y los píxeles además quedan apagados mientras no haya un id
 * configurado.
 *
 * Son dos cosas distintas aunque se enciendan juntas: la analítica mide cómo se
 * usa la web, y los píxeles le cuentan a una plataforma de publicidad qué pasó
 * para que pueda cobrar y optimizar. Si algún día hace falta separar los dos
 * permisos en el banner, se separan acá.
 */
export function iniciarAnalitica() {
  iniciarGA();
  iniciarClarity();
  iniciarPixeles();
}
