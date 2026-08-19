import { useEffect, useMemo, useState } from "react";
import { preciosPorFecha } from "../services/publicApi";

/**
 * Tira de fechas del buscador: los días vecinos al elegido, con el precio más
 * bajo de cada uno. Resuelve la pregunta que el pasajero ya se hacía ("¿y si
 * viajo un día antes?") sin obligarlo a repetir la búsqueda por cada fecha.
 *
 * El precio que muestra sale del mismo cálculo que la búsqueda, así que lo que
 * anuncia acá es lo que verá al elegir ese día.
 */

const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MESES = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

// Fechas ISO sin pasar por Date(): evita el corrimiento de un día por zona horaria.
const aPartes = (iso) => {
  const [a, m, d] = String(iso || "").split("-").map(Number);
  return { a, m, d };
};
const sumarDias = (iso, n) => {
  const { a, m, d } = aPartes(iso);
  const f = new Date(Date.UTC(a, m - 1, d));
  f.setUTCDate(f.getUTCDate() + n);
  return f.toISOString().slice(0, 10);
};
const diaSemana = (iso) => {
  const { a, m, d } = aPartes(iso);
  return DIAS[new Date(Date.UTC(a, m - 1, d)).getUTCDay()];
};
const etiquetaCorta = (iso) => {
  const { m, d } = aPartes(iso);
  return `${String(d).padStart(2, "0")}/${MESES[m - 1]}`;
};
const hoyISO = () => new Date().toISOString().slice(0, 10);

const VISIBLES = 7;

/**
 * Aviso sobre los resultados. Solo dice algo cuando es cierto: o la fecha
 * elegida es la más barata de la ventana, o hay otra que sí lo es y conviene
 * ofrecerla. Si todos los días valen igual, o solo hay uno con viajes, no
 * aparece: no hay nada que comparar.
 */
function AvisoPrecio({ precios, fecha, onElegirFecha }) {
  const [cerrado, setCerrado] = useState(null);   // fecha para la que se cerró

  const aviso = useMemo(() => {
    const conPrecio = (precios || []).filter((p) => p.precioDesde != null);
    if (conPrecio.length < 2) return null;
    const elegido = conPrecio.find((p) => p.fecha === fecha);
    if (!elegido) return null;
    if (new Set(conPrecio.map((p) => Number(p.precioDesde))).size === 1) return null;
    const menor = conPrecio.reduce((a, b) => (Number(b.precioDesde) < Number(a.precioDesde) ? b : a));
    if (Number(elegido.precioDesde) > Number(menor.precioDesde))
      return { tipo: "hay-mejor", fecha: menor.fecha, precio: Number(menor.precioDesde) };
    return { tipo: "es-el-mejor" };
  }, [precios, fecha]);

  if (!aviso || cerrado === fecha) return null;

  const esElMejor = aviso.tipo === "es-el-mejor";

  return (
    <div className="aviso-precio" role="status">
      <span className="aviso-ico">
        {esElMejor ? (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
            <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.2"
                  strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
            <rect x="3.5" y="5" width="17" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.9" />
            <path d="M8 3v4M16 3v4M3.5 10h17" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
          </svg>
        )}
      </span>

      {esElMejor ? (
        <p>Es el día más barato de esta semana.</p>
      ) : (
        <p>
          El <strong>{diaSemana(aviso.fecha)} {etiquetaCorta(aviso.fecha)}</strong> el pasaje
          cuesta <strong>S/ {Math.round(aviso.precio)}</strong>.
        </p>
      )}

      {!esElMejor && (
        <button type="button" className="aviso-accion" onClick={() => onElegirFecha(aviso.fecha)}>
          Ver ese día
        </button>
      )}

      <button
        type="button"
        className="aviso-cerrar"
        onClick={() => setCerrado(fecha)}
        aria-label="Cerrar aviso"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

export default function TiraFechas({ origen, destino, fecha, onElegirFecha }) {
  // Primer día de la ventana. Arranca 3 días antes del elegido, sin bajar de hoy.
  const [inicio, setInicio] = useState("");
  const [precios, setPrecios] = useState(null);   // null = aún cargando

  useEffect(() => {
    if (!fecha) return;
    const propuesto = sumarDias(fecha, -3);
    setInicio(propuesto < hoyISO() ? hoyISO() : propuesto);
  }, [fecha]);

  const dias = useMemo(() => {
    if (!inicio) return [];
    return Array.from({ length: VISIBLES }, (_, i) => sumarDias(inicio, i));
  }, [inicio]);

  useEffect(() => {
    if (!dias.length || !origen || !destino) return;
    let vigente = true;
    setPrecios(null);
    preciosPorFecha({ origen, destino, desde: dias[0], hasta: dias[dias.length - 1] })
      .then((lista) => { if (vigente) setPrecios(lista); });
    return () => { vigente = false; };
  }, [dias, origen, destino]);

  const porFecha = useMemo(() => {
    const m = new Map();
    (precios || []).forEach((p) => m.set(p.fecha, p));
    return m;
  }, [precios]);

  // El más barato de la ventana: solo entre días que sí tienen viajes.
  const menor = useMemo(() => {
    const conPrecio = (precios || []).filter((p) => p.precioDesde != null);
    if (!conPrecio.length) return null;
    return conPrecio.reduce((a, b) => (Number(b.precioDesde) < Number(a.precioDesde) ? b : a));
  }, [precios]);

  if (!fecha || !origen || !destino) return null;

  const puedeRetroceder = dias.length > 0 && dias[0] > hoyISO();
  const mover = (n) => {
    const nuevo = sumarDias(inicio, n);
    setInicio(nuevo < hoyISO() ? hoyISO() : nuevo);
  };

  return (
    <>
      <AvisoPrecio precios={precios} fecha={fecha} onElegirFecha={onElegirFecha} />

      <div className="tira-fechas" role="group" aria-label="Elegir otra fecha de viaje">
      <button
        type="button"
        className="tira-nav"
        onClick={() => mover(-VISIBLES)}
        disabled={!puedeRetroceder}
        aria-label="Ver días anteriores"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <ul className="tira-dias">
        {dias.map((d) => {
          const info = porFecha.get(d);
          const activo = d === fecha;
          const cargando = precios === null;
          const sinViajes = !cargando && (!info || info.precioDesde == null);
          const esMenor = !!menor && menor.fecha === d && !activo;

          return (
            <li key={d}>
              <button
                type="button"
                className={
                  "tira-dia" +
                  (activo ? " activo" : "") +
                  (sinViajes ? " sin-viajes" : "") +
                  (esMenor ? " menor" : "")
                }
                onClick={() => onElegirFecha(d)}
                aria-current={activo ? "date" : undefined}
                aria-label={
                  `${diaSemana(d)} ${etiquetaCorta(d)}` +
                  (sinViajes ? ", sin viajes"
                    : info?.precioDesde != null ? `, desde S/ ${Number(info.precioDesde).toFixed(2)}` : "")
                }
              >
                <span className="tira-dia-nombre">{diaSemana(d)}</span>
                <span className="tira-dia-fecha">{etiquetaCorta(d)}</span>
                <span className="tira-dia-precio">
                  {cargando
                    ? <span className="tira-skel" aria-hidden="true" />
                    : sinViajes
                      ? <span className="tira-sin">Sin viajes</span>
                      : `S/ ${Math.round(Number(info.precioDesde))}`}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        className="tira-nav"
        onClick={() => mover(VISIBLES)}
        aria-label="Ver días siguientes"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
          <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      </div>
    </>
  );
}
