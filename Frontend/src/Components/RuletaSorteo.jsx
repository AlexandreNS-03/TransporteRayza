import { useEffect, useMemo, useRef, useState } from "react";

/**
 * La rueda del sorteo, igual a la que ve el público en la web.
 *
 * Es una copia deliberada de Web/src/components/Ruleta.jsx: son dos
 * aplicaciones distintas y no comparten código. Tienen que verse iguales — el
 * operador anuncia lo que la gente está viendo, y dos ruedas distintas para el
 * mismo sorteo se leen como dos sorteos.
 *
 * Si se cambia una, hay que cambiar la otra.
 */

const MAX_SECTORES = 14;   // más que esto y los nombres no se leen

/* El giro va en dos tramos.
 *
 * Con una sola curva de 15 segundos la rueda llega casi al final en los
 * primeros cuatro y después se arrastra imperceptiblemente: se ve rota, no
 * lenta. Así que primero gira parejo, a velocidad constante, y recién el
 * último tramo frena de a poco hasta el sector del ganador — que es como se
 * mueve una ruleta de verdad. */
const PARTE_RAPIDA = 0.6;   // del tiempo total gira a velocidad constante
const VUELTAS_RAPIDAS = 12;
const VUELTAS_FRENADO = 4;

export default function Ruleta({
  participantes = [],
  girando,
  /** A quién hay que apuntar. Se sabe apenas arranca el giro. */
  destino,
  /** El ganador ya revelado, para el centro. Llega recién cuando la rueda frena. */
  ganador,
  duracion = 5200,
  total = 0,
}) {
  const [angulo, setAngulo] = useState(0);
  const [frenando, setFrenando] = useState(false);
  const desde = useRef(0);        // dónde estaba la rueda al arrancar este giro
  const enMarcha = useRef(false);
  const arranque = useRef(0);

  /**
   * Los sectores. Con poca gente, uno por participante; con mucha, una muestra
   * repartida a lo largo de la lista para que no sean siempre los primeros.
   */
  const sectores = useMemo(() => {
    const gente = participantes.length ? participantes : [];
    if (gente.length === 0) return [];
    if (gente.length <= MAX_SECTORES) return gente;

    const paso = gente.length / MAX_SECTORES;
    const muestra = [];
    for (let i = 0; i < MAX_SECTORES; i++) muestra.push(gente[Math.floor(i * paso)]);
    return muestra;
  }, [participantes]);

  /** Los sectores ya con el ganador dentro, esté o no en la muestra. */
  const visibles = useMemo(() => {
    if (!destino) return sectores;
    if (sectores.some((p) => p.codigo === destino.codigo)) return sectores;
    const copia = sectores.slice();
    // Entra en el medio, no al final: al final quedaría siempre en el mismo
    // sector y se notaría que es el puesto del ganador.
    copia[Math.floor(copia.length / 2)] = { codigo: destino.codigo, nombre: destino.nombre };
    return copia;
  }, [sectores, destino]);

  // El giro: se acumula para no retroceder nunca, y frena donde está el ganador.
  //
  // Depende de `destino` y no de `ganador` a propósito: el nombre se revela
  // recién cuando la rueda para, pero para saber DÓNDE parar hay que conocerlo
  // desde el primer instante. Calculándolo con el ganador, la rueda arrancaba
  // hacia un ángulo al azar y frenaba sobre otra persona.
  useEffect(() => {
    if (!girando) { enMarcha.current = false; setFrenando(false); return; }

    // Las vueltas se cuentan una sola vez por giro. Si la lista de
    // participantes termina de cargar con la rueda ya girando, hay que
    // recalcular dónde frenar —el sector del ganador cambió de lugar— pero no
    // volver a acelerar.
    if (!enMarcha.current) {
      desde.current = angulo;
      arranque.current = Date.now();
      enMarcha.current = true;
    }

    const n = visibles.length;
    const i = destino ? visibles.findIndex((p) => p.codigo === destino.codigo) : -1;
    // El centro del sector, medido desde arriba en sentido horario. Dejar la
    // rueda en -centro lo pone justo bajo la aguja.
    const centro = n > 0 && i >= 0 ? (i + 0.5) * (360 / n) : Math.random() * 360;

    const tramoRapido = desde.current + 360 * VUELTAS_RAPIDAS;
    let final = desde.current - (desde.current % 360) + 360 * (VUELTAS_RAPIDAS + VUELTAS_FRENADO) - centro;
    while (final <= tramoRapido) final += 360;

    setFrenando(false);
    setAngulo(tramoRapido);

    // Desde el arranque real y no desde ahora: si esto se recalcula a mitad de
    // giro, la frenada tiene que empezar igual cuando corresponde.
    const resta = Math.max(0, duracion * PARTE_RAPIDA - (Date.now() - arranque.current));
    const t = setTimeout(() => { setFrenando(true); setAngulo(final); }, resta);
    return () => clearTimeout(t);
  }, [girando, destino, visibles.length]);

  // Quien entra cuando el sorteo ya se hizo no ve girar nada: la rueda tiene
  // que aparecer ya frenada sobre el ganador. Sin esto la aguja apuntaba a
  // cualquiera mientras el centro anunciaba a otro, que es justo lo que hace
  // dudar de un sorteo.
  useEffect(() => {
    if (girando || !destino) return;
    const n = visibles.length;
    const i = visibles.findIndex((p) => p.codigo === destino.codigo);
    if (n === 0 || i < 0) return;
    setAngulo(-(i + 0.5) * (360 / n));
  }, [girando, destino, visibles]);

  const n = visibles.length;
  const hayRueda = n >= 2;

  return (
    <div className="ruleta-caja">
      <div className="ruleta-disco">
        <div className="ruleta-aguja" aria-hidden="true">
          <svg viewBox="0 0 24 34" width="26" height="36">
            <path d="M12 33 L3 13 A9 9 0 1 1 21 13 Z" fill="currentColor" />
            <circle cx="12" cy="10" r="3.4" fill="#fff" />
          </svg>
        </div>

        <svg
          viewBox="-105 -105 210 210"
          className="ruleta-svg"
          style={{
            transform: `rotate(${angulo}deg)`,
            transitionDuration: girando
              ? `${duracion * (frenando ? 1 - PARTE_RAPIDA : PARTE_RAPIDA)}ms`
              : "0ms",
            // Parejo mientras gira, y la curva del sistema para la frenada.
            transitionTimingFunction: frenando ? undefined : "linear",
          }}
          aria-hidden="true"
        >
          <defs>
            {/* La luz cae de arriba: sin esto la rueda se ve como un gráfico de
                torta y no como un objeto. */}
            <radialGradient id="ruleta-luz" cx="50%" cy="32%" r="72%">
              <stop offset="0%"  stopColor="#fff" stopOpacity=".28" />
              <stop offset="55%" stopColor="#fff" stopOpacity="0" />
              <stop offset="100%" stopColor="#000" stopOpacity=".22" />
            </radialGradient>
          </defs>

          {hayRueda ? (
            visibles.map((p, i) => (
              <g key={p.codigo}>
                {/* Al frenar, el sector premiado se marca: sin eso hay que
                    creerle al texto del centro que la aguja cayó donde dice. */}
                <path
                  d={sector(i, n, 92)}
                  fill={colorDe(i, n)}
                  className={ganador && ganador.codigo === p.codigo ? "ruleta-sector-ganador" : undefined}
                />
                <text
                  className="ruleta-nombre-sector"
                  transform={textoSector(i, n, 87).transform}
                  textAnchor={textoSector(i, n, 87).ancla}
                  dominantBaseline="middle"
                >
                  {recortar(p.nombre, n)}
                </text>
              </g>
            ))
          ) : (
            // Sin participantes no hay nombres que poner: quedan los colores.
            COLORES.concat(COLORES).map((c, i, todos) => (
              <path key={i} d={sector(i, todos.length, 92)} fill={c} />
            ))
          )}

          {/* Los radios entre sectores, encima de todos para que no se corten */}
          {hayRueda && visibles.map((p, i) => (
            <line key={`r${p.codigo}`} className="ruleta-radio"
                  x1="0" y1="0" {...punta(i, n, 92)} />
          ))}

          <circle r="92" fill="url(#ruleta-luz)" />
          <circle r="92" className="ruleta-borde" />
        </svg>

        {/* El aro con las luces no gira: si girara con la rueda, el movimiento
            se perdería —lo que se ve moverse es el contraste entre ambos. */}
        <svg viewBox="-105 -105 210 210" className="ruleta-aro" aria-hidden="true">
          {Array.from({ length: 24 }, (_, i) => {
            const a = (i / 24) * 2 * Math.PI - Math.PI / 2;
            return (
              <circle key={i} r="3.1"
                      cx={Math.cos(a) * 99} cy={Math.sin(a) * 99}
                      className={`ruleta-luz${i % 2 ? " par" : ""}`} />
            );
          })}
        </svg>

        <div className="ruleta-centro" role="status" aria-live="polite">
          {ganador ? (
            <>
              <span className="ruleta-eti">Ganador</span>
              <strong className="ruleta-ganador">{ganador.nombre}</strong>
              <span className="ruleta-codigo">{ganador.codigo}</span>
            </>
          ) : girando ? (
            <span className="ruleta-eti ruleta-eti-girando">Sorteando…</span>
          ) : (
            <>
              <strong className="ruleta-cifra">{total}</strong>
              <span className="ruleta-eti">
                {total === 1 ? "participante" : "participantes"}
              </span>
            </>
          )}
        </div>
      </div>

      {total > MAX_SECTORES && (
        <p className="ruleta-nota">
          La rueda muestra {MAX_SECTORES} de los {total} códigos registrados; participan todos.
        </p>
      )}
    </div>
  );
}

/* Azul, rojo, celeste y dorado de la marca. */
const COLORES = ["#1a68b8", "#e01e2a", "#0e8bc4", "#f0a500"];

/**
 * El color de un sector.
 *
 * Alternar sin más deja al último pegado al primero cuando la cantidad no es
 * múltiplo de cuatro: la rueda queda con una costura de dos colores parecidos
 * justo donde cierra. Acá el último elige otro que no sea el de ninguno de sus
 * dos vecinos —con cuatro colores siempre queda uno libre—.
 */
function colorDe(i, n) {
  const normal = COLORES[i % COLORES.length];
  if (i !== n - 1 || n < 3) return normal;

  const anterior = COLORES[(i - 1) % COLORES.length];
  const primero = COLORES[0];
  if (normal !== anterior && normal !== primero) return normal;
  return COLORES.find((c) => c !== anterior && c !== primero) || normal;
}

/** Un sector como camino SVG, con 0° arriba y avanzando en sentido horario. */
function sector(i, n, r) {
  const a1 = (i / n) * 2 * Math.PI - Math.PI / 2;
  const a2 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2;
  const x1 = Math.cos(a1) * r, y1 = Math.sin(a1) * r;
  const x2 = Math.cos(a2) * r, y2 = Math.sin(a2) * r;
  const grande = a2 - a1 > Math.PI ? 1 : 0;
  return `M 0 0 L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${grande} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
}

function punta(i, n, r) {
  const a = (i / n) * 2 * Math.PI - Math.PI / 2;
  return { x2: (Math.cos(a) * r).toFixed(2), y2: (Math.sin(a) * r).toFixed(2) };
}

/**
 * El nombre, acostado sobre su sector: empieza en el borde y crece hacia el
 * centro. Centrado en el sector se metía debajo del disco del medio.
 */
function textoSector(i, n, r) {
  const medio = ((i + 0.5) / n) * 360 - 90;
  const x = Math.cos((medio * Math.PI) / 180) * r;
  const y = Math.sin((medio * Math.PI) / 180) * r;
  // Del lado izquierdo el texto quedaría cabeza abajo: se voltea, y entonces el
  // borde pasa a ser el principio de la línea en vez del final.
  const voltea = medio > 90 || medio < -90;
  return {
    transform: `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${medio + (voltea ? 180 : 0)})`,
    ancla: voltea ? "start" : "end",
  };
}

/**
 * Entre el borde y el disco del medio hay poco: un nombre largo se metería
 * debajo del centro. Cuantos más sectores, más angosto el hueco.
 */
function recortar(nombre, n) {
  const largo = n <= 8 ? 10 : n <= 11 ? 9 : 8;
  const t = (nombre || "").trim();
  return t.length > largo ? t.slice(0, largo - 1) + "…" : t;
}
