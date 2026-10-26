import { useEffect, useRef, useState } from "react";
import "./Wallet.css";
import { getWallet, iniciarRecarga, confirmarRecarga } from "../services/authCliente";
import { pagarConIzipay, limpiarIzipay, PagoCancelado } from "../services/izipay";
import { soles } from "../services/publicApi";
import { IconLock } from "./Icons";

/**
 * La Rayza Wallet dentro de la cuenta.
 *
 * Dos cosas que no están y no es que falten: no hay botón de retirar y no hay
 * "montos por vencer". Esta plata no se devuelve en efectivo —hacerlo se parece
 * a emitir dinero electrónico, que regula la SBS— y no caduca, porque hacerla
 * caducar es quedarse con plata del cliente. Las condiciones las manda el
 * servidor en vez de estar escritas acá, así se dicen igual en todas partes.
 *
 * Los movimientos se muestran aunque la wallet esté apagada: el saldo a favor de
 * un viaje cancelado existe desde antes que la wallet, y esconderlo sería
 * esconderle plata suya.
 */

const SUGERIDOS = [50, 100, 200];
const CONTENEDOR = "#izipay-recarga";

export default function Wallet() {
  const [wallet, setWallet] = useState(null);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);

  const [abierto, setAbierto] = useState(false);
  const [monto, setMonto] = useState("");
  const [pagando, setPagando] = useState(false);
  const [formularioVisible, setFormularioVisible] = useState(false);
  const cancelar = useRef(null);

  useEffect(() => {
    getWallet().then(setWallet).catch((e) => setError(e.message));
    return () => limpiarIzipay(CONTENEDOR);
  }, []);

  const recargar = async () => {
    setPagando(true); setError(null); setAviso(null);
    try {
      const r = await iniciarRecarga(monto);
      const respuesta = await pagarConIzipay({
        formToken: r.formToken, publicKey: r.publicKey, simulado: r.simulado,
        contenedor: CONTENEDOR,
        alMostrarFormulario: () => setFormularioVisible(true),
        registrarCancelacion: (fn) => (cancelar.current = fn),
      });
      setFormularioVisible(false);
      limpiarIzipay(CONTENEDOR);

      setWallet(await confirmarRecarga(r.recargaId, respuesta));
      setAbierto(false);
      setMonto("");
      setAviso(`Listo, cargamos ${soles(r.monto)} a tu wallet.`);
    } catch (e) {
      setFormularioVisible(false);
      limpiarIzipay(CONTENEDOR);
      // Arrepentirse no es un error: no hace falta mostrarle nada rojo.
      if (!(e instanceof PagoCancelado)) setError(e.message);
    } finally {
      setPagando(false);
      cancelar.current = null;
    }
  };

  const cerrarRecarga = () => {
    cancelar.current?.();
    setAbierto(false); setFormularioVisible(false); setError(null);
    limpiarIzipay(CONTENEDOR);
  };

  if (!wallet) {
    return (
      <div className="card" style={{ marginTop: 24 }}>
        {error || "Cargando tu wallet…"}
      </div>
    );
  }

  const saldo = Number(wallet.saldo) || 0;
  const valido = Number(monto) >= Number(wallet.recargaMinima)
              && Number(monto) <= Number(wallet.recargaMaxima);

  return (
    <section className="wl" aria-labelledby="tit-wallet">
      <div className="wl-hero">
        <div className="wl-hero-top">
          <div>
            <span className="wl-etiqueta">Rayza Wallet</span>
            <strong className="wl-saldo">{soles(saldo)}</strong>
          </div>
          {wallet.habilitada && !abierto && (
            <button className="btn btn-primary" onClick={() => { setAbierto(true); setAviso(null); }}>
              Abonar dinero
            </button>
          )}
        </div>

        <ul className="wl-condiciones">
          {(wallet.condiciones || []).map((c) => <li key={c}>{c}</li>)}
        </ul>
      </div>

      {aviso && <div className="alert alert-ok wl-msg">{aviso}</div>}
      {error && !abierto && <div className="alert alert-warn wl-msg">{error}</div>}

      {!wallet.habilitada && saldo > 0 && (
        <div className="alert alert-info wl-msg">
          Por ahora este saldo se usa al comprar en agencia: menciónalo y lo descontamos.
          Estamos terminando de habilitarlo para pagar en la web.
        </div>
      )}

      {/* ── Abonar ── */}
      {/* El contenedor del formulario de Izipay se dibuja siempre y en el mismo
          lugar. Si se montara y desmontara según el paso, React tiraría el nodo
          con el formulario que Izipay acababa de dibujar dentro. */}
      <div className={abierto ? "card wl-abonar" : "wl-oculto"}>
        {abierto && !formularioVisible && (
          <>
            <h4 className="wl-abonar-tit" id="tit-wallet">¿Cuánto quieres abonar?</h4>

            <div className="wl-chips">
              {SUGERIDOS.map((s) => (
                <button key={s} type="button" disabled={pagando}
                        className={`wl-chip ${Number(monto) === s ? "activo" : ""}`}
                        onClick={() => setMonto(String(s))}>
                  {soles(s)}
                </button>
              ))}
            </div>

            <label className="wl-otro">
              <span>Otro monto</span>
              <input type="number" inputMode="decimal" step="10"
                     min={wallet.recargaMinima} max={wallet.recargaMaxima}
                     placeholder={String(wallet.recargaMinima)}
                     value={monto} disabled={pagando}
                     onChange={(e) => setMonto(e.target.value)} />
            </label>

            <p className="wl-limites">
              Entre {soles(wallet.recargaMinima)} y {soles(wallet.recargaMaxima)} por recarga.
            </p>

            {error && <div className="alert alert-warn wl-msg">{error}</div>}

            <div className="wl-acciones">
              <button className="btn btn-primary" disabled={!valido || pagando} onClick={recargar}>
                {pagando ? "Abriendo el pago…" : `Pagar ${monto ? soles(monto) : ""}`}
              </button>
              <button className="btn btn-ghost" onClick={cerrarRecarga} disabled={pagando}>
                Mejor no
              </button>
            </div>
          </>
        )}

        {formularioVisible && (
          <div className="wl-cab-pago">
            <p className="wl-cab-tit">Abonar {soles(monto)} a tu wallet</p>
            <button className="btn btn-ghost" onClick={cerrarRecarga}>Cancelar</button>
          </div>
        )}

        <div id="izipay-recarga" />

        {formularioVisible && (
          <p className="wl-seguro">
            <IconLock aria-hidden="true" />
            <span>Tu tarjeta se escribe dentro del formulario de <strong>Izipay</strong>.
            Esos datos no pasan por Transportes Rayza.</span>
          </p>
        )}
      </div>

      {/* ── Movimientos ── */}
      <h4 className="wl-movs-tit">Movimientos</h4>
      {wallet.movimientos.length === 0 ? (
        <p className="wl-vacio">
          Todavía no hay movimientos. Acá va a quedar cada abono y cada pasaje que pagues
          con tu saldo.
        </p>
      ) : (
        <ul className="wl-movs">
          {wallet.movimientos.map((m) => (
            <li key={m.id}>
              <div className="wl-mov-que">
                <strong>{m.motivo || nombreDelTipo(m.tipo)}</strong>
                <small>{fecha(m.fecha)}</small>
              </div>
              <b className={Number(m.monto) >= 0 ? "mas" : "menos"}>
                {Number(m.monto) >= 0 ? "+" : "−"}{soles(Math.abs(Number(m.monto)))}
              </b>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function nombreDelTipo(tipo) {
  if (tipo === "ABONO") return "Abono a tu wallet";
  if (tipo === "CONSUMO") return "Pago con tu saldo";
  if (tipo === "SALDO_FAVOR") return "Saldo a favor";
  return "Ajuste";
}

function fecha(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
}
