import { useEffect, useMemo, useRef, useState } from "react";

const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const MES_CORTO = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const DOW = ["L","M","X","J","V","S","D"];

const hoyStr = () => { const d = new Date(); return aISO(d); };
const aISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const deISO = (s) => { if (!s) return null; const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };

// Selector de fecha con calendario propio. Bloquea días anteriores a `min` (por defecto hoy).
export default function DatePicker({ value, onChange, min, placeholder = "Elige la fecha" }) {
  const [abierto, setAbierto] = useState(false);
  const minStr = min || hoyStr();
  const minDate = deISO(minStr);
  const sel = deISO(value);
  const [cursor, setCursor] = useState(() => sel || minDate || new Date());
  const ref = useRef(null);

  useEffect(() => {
    const fuera = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false); };
    if (abierto) document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, [abierto]);

  const dias = useMemo(() => {
    const y = cursor.getFullYear(), m = cursor.getMonth();
    const offset = (new Date(y, m, 1).getDay() + 6) % 7; // lunes = 0
    const total = new Date(y, m + 1, 0).getDate();
    const celdas = [];
    for (let i = 0; i < offset; i++) celdas.push(null);
    for (let d = 1; d <= total; d++) celdas.push(new Date(y, m, d));
    return celdas;
  }, [cursor]);

  const label = sel ? `${sel.getDate()} ${MES_CORTO[sel.getMonth()]} ${sel.getFullYear()}` : placeholder;
  const mismaFecha = (a, b) => a && b && a.getTime() === b.getTime();
  const hoy = deISO(hoyStr());
  const deshabilitado = (d) => minDate && d < minDate;

  const elegir = (d) => { onChange(aISO(d)); setAbierto(false); };
  const mover = (n) => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + n, 1));
  const puedeRetroceder = new Date(cursor.getFullYear(), cursor.getMonth(), 1) > (minDate || new Date(0));

  return (
    <div className="dp" ref={ref}>
      <button type="button" className={`dp-trigger${sel ? " has" : ""}`} onClick={() => setAbierto((v) => !v)}>
        <svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="16" rx="2.5"/><path d="M8 3v4M16 3v4M3.5 10h17"/></svg>
        <span>{label}</span>
        <svg className="chev" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
      </button>

      {abierto && (
        <div className="dp-pop" role="dialog">
          <div className="dp-head">
            <button type="button" className="dp-nav" onClick={() => mover(-1)} disabled={!puedeRetroceder} aria-label="Mes anterior">
              <svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>
            </button>
            <b>{MESES[cursor.getMonth()]} {cursor.getFullYear()}</b>
            <button type="button" className="dp-nav" onClick={() => mover(1)} aria-label="Mes siguiente">
              <svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>
            </button>
          </div>
          <div className="dp-grid dp-dows">{DOW.map((d, i) => <span key={i} className="dp-dow">{d}</span>)}</div>
          <div className="dp-grid">
            {dias.map((d, i) => d ? (
              <button key={i} type="button"
                className={`dp-day${mismaFecha(d, sel) ? " sel" : ""}${mismaFecha(d, hoy) ? " hoy" : ""}`}
                disabled={deshabilitado(d)} onClick={() => elegir(d)}>{d.getDate()}</button>
            ) : <span key={i} />)}
          </div>
        </div>
      )}
    </div>
  );
}
