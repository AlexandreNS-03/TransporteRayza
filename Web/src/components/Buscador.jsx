import { useEffect, useMemo, useState } from "react";
import { getRutas, getReglasVenta } from "../services/publicApi";
import DatePicker from "./DatePicker";

// Clave sin orden para comparar pares: {Nauta,Iquitos} == {Iquitos,Nauta}.
const clavePar = (a, b) => [a.trim().toLowerCase(), b.trim().toLowerCase()].sort().join("|");

const IconPin = () => (
  <svg viewBox="0 0 24 24"><path d="M12 21s-6-5.7-6-10a6 6 0 1112 0c0 4.3-6 10-6 10z"/><circle cx="12" cy="11" r="2.2"/></svg>
);

// Buscador de viajes con combos (Origen → Destino) poblados desde la BD.
export default function Buscador({ onBuscar, valorInicial = {} }) {
  const [origen, setOrigen] = useState(valorInicial.origen || "");
  const [destino, setDestino] = useState(valorInicial.destino || "");
  const [fecha, setFecha] = useState(valorInicial.fecha || "");
  const [fechaRetorno, setFechaRetorno] = useState(valorInicial.fechaRetorno || "");
  const [rutas, setRutas] = useState([]);
  const [bloqueados, setBloqueados] = useState([]);   // pares que no se venden

  useEffect(() => { getRutas().then(setRutas).catch(() => setRutas([])); }, []);
  useEffect(() => { getReglasVenta().then(setBloqueados).catch(() => setBloqueados([])); }, []);

  const pares = useMemo(() => {
    const claves = new Set(bloqueados.map(([a, b]) => clavePar(a, b)));
    const set = new Set(); const lista = [];
    const agregar = (o, d) => {
      o = (o || "").trim(); d = (d || "").trim();
      if (!o || !d) return;
      if (claves.has(clavePar(o, d))) return;   // tramo bloqueado (orden de gerencia)
      const k = o + "→" + d;
      if (!set.has(k)) { set.add(k); lista.push({ origen: o, destino: d }); }
    };
    for (const r of rutas) {
      const paradas = (r.paradas || []).slice().sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
      // Tramos que esta ruta en particular no vende (ej. el que se salta una
      // parada intermedia nueva), además del bloqueo global de `bloqueados`.
      const tramosRuta = new Set(
        (r.tramosBloqueados || []).map((t) => `${t.ordenOrigen}-${t.ordenDestino}`)
      );
      for (let i = 0; i < paradas.length; i++)
        for (let j = i + 1; j < paradas.length; j++) {
          const key = `${paradas[i].orden}-${paradas[j].orden}`;
          if (tramosRuta.has(key)) continue;
          agregar(paradas[i].nombre, paradas[j].nombre);
        }

      // El par suelto origen→destino solo hace falta si la ruta no tiene paradas
      // cargadas; con paradas, los puertos terminales ya están en la lista y
      // agregarlo antes descolocaría el orden del recorrido.
      if (paradas.length < 2) agregar(r.origen, r.destino);
    }
    return lista;
  }, [rutas, bloqueados]);

  // En orden de recorrido, no alfabético: el pasajero busca su puerto como lo pasa
  // el bote (Requena, Yanallpa, Herrera…), no ordenado por nombre. `pares` ya viene
  // recorrido por orden de parada, así que basta con no reordenar.
  const origenes = useMemo(() => [...new Set(pares.map((p) => p.origen))], [pares]);
  const destinos = useMemo(
    () => [...new Set(pares.filter((p) => p.origen === origen).map((p) => p.destino))],
    [pares, origen]);
  const hayCombos = origenes.length > 0;

  const submit = (e) => {
    e.preventDefault();
    const params = { origen, destino, fecha, fechaRetorno };
    if (onBuscar) return onBuscar(params);
    const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v))).toString();
    window.location.href = "/comprar" + (qs ? "?" + qs : "");
  };

  const hoy = new Date().toISOString().slice(0, 10);
  const intercambiar = () => { setOrigen(destino); setDestino(origen); };

  return (
    <form className="buscador buscador-barra" onSubmit={submit}>
      <div className="bus-fields">
        <div className="field bus-field" data-tour="origen">
          <label>Desde</label>
          <div className="control">
            <IconPin />
            {hayCombos ? (
              <select value={origen} onChange={(e) => { setOrigen(e.target.value); setDestino(""); }}>
                <option value="">Elige origen</option>
                {origenes.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input placeholder="Origen" value={origen} onChange={(e) => setOrigen(e.target.value)} />
            )}
          </div>
        </div>

        <button type="button" className="bus-swap" onClick={intercambiar}
                title="Intercambiar" aria-label="Intercambiar origen y destino">
          <svg viewBox="0 0 24 24"><path d="M7 4L4 7l3 3M4 7h13M17 20l3-3-3-3M20 17H7"/></svg>
        </button>

        <div className="field bus-field" data-tour="destino">
          <label>Hacia</label>
          <div className="control">
            <IconPin />
            {hayCombos ? (
              <select value={destino} onChange={(e) => setDestino(e.target.value)} disabled={!origen}>
                <option value="">{origen ? "Elige destino" : "Primero el origen"}</option>
                {destinos.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            ) : (
              <input placeholder="Destino" value={destino} onChange={(e) => setDestino(e.target.value)} />
            )}
          </div>
        </div>

        <div className="field bus-field" data-tour="fecha">
          <label>Ida</label>
          <DatePicker value={fecha} onChange={setFecha} min={hoy} />
        </div>

        <div className="field bus-field">
          <label>Vuelta <span className="op">(opcional)</span></label>
          <DatePicker value={fechaRetorno} onChange={setFechaRetorno} min={fecha || hoy} placeholder="Ida y vuelta" />
        </div>
      </div>

      <button className="btn btn-primary bus-btn" type="submit" data-tour="buscar">Buscar</button>
    </form>
  );
}
