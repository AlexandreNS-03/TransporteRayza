import { useEffect, useMemo, useState } from "react";
import { getRutas } from "../services/publicApi";
import DatePicker from "./DatePicker";

const IconPin = () => (
  <svg viewBox="0 0 24 24"><path d="M12 21s-6-5.7-6-10a6 6 0 1112 0c0 4.3-6 10-6 10z"/><circle cx="12" cy="11" r="2.2"/></svg>
);
const IconTicket = () => (
  <svg viewBox="0 0 24 24"><path d="M4 8a2 2 0 012-2h12a2 2 0 012 2 2 2 0 000 4 2 2 0 010 4H6a2 2 0 01-2-2 2 2 0 000-4z"/><path d="M15 6v12"/></svg>
);
const IconBox = () => (
  <svg viewBox="0 0 24 24"><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/></svg>
);

// Buscador de viajes con combos (Origen → Destino) poblados desde la BD.
export default function Buscador({ onBuscar, valorInicial = {} }) {
  const [origen, setOrigen] = useState(valorInicial.origen || "");
  const [destino, setDestino] = useState(valorInicial.destino || "");
  const [fecha, setFecha] = useState(valorInicial.fecha || "");
  const [rutas, setRutas] = useState([]);

  useEffect(() => { getRutas().then(setRutas).catch(() => setRutas([])); }, []);

  const pares = useMemo(() => {
    const set = new Set(); const lista = [];
    const agregar = (o, d) => {
      o = (o || "").trim(); d = (d || "").trim();
      if (!o || !d) return;
      const k = o + "→" + d;
      if (!set.has(k)) { set.add(k); lista.push({ origen: o, destino: d }); }
    };
    for (const r of rutas) {
      agregar(r.origen, r.destino);
      const paradas = (r.paradas || []).slice().sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
      for (let i = 0; i < paradas.length; i++)
        for (let j = i + 1; j < paradas.length; j++) agregar(paradas[i].nombre, paradas[j].nombre);
    }
    return lista;
  }, [rutas]);

  const origenes = useMemo(() => [...new Set(pares.map((p) => p.origen))].sort((a, b) => a.localeCompare(b)), [pares]);
  const destinos = useMemo(
    () => [...new Set(pares.filter((p) => p.origen === origen).map((p) => p.destino))].sort((a, b) => a.localeCompare(b)),
    [pares, origen]);
  const hayCombos = origenes.length > 0;

  const submit = (e) => {
    e.preventDefault();
    const params = { origen, destino, fecha };
    if (onBuscar) return onBuscar(params);
    const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v))).toString();
    window.location.href = "/comprar" + (qs ? "?" + qs : "");
  };

  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <div className="search-tabs">
        <span className="tab active"><IconTicket /> Pasajes</span>
        <span className="tab" title="Próximamente"><IconBox /> Encomiendas</span>
      </div>
      <form className="buscador" onSubmit={submit}>
        <div className="buscador-grid">
          <div className="field">
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
          <div className="field">
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
          <div className="field">
            <label>Fecha de viaje</label>
            <DatePicker value={fecha} onChange={setFecha} min={hoy} />
          </div>
          <button className="btn btn-primary btn-lg" type="submit" style={{ height: 52 }}>Buscar viajes</button>
        </div>
      </form>
    </div>
  );
}
