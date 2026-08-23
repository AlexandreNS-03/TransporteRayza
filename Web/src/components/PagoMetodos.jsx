/**
 * Elección del medio de pago y formulario de Yape.
 *
 * Vive acá y no dentro de cada página porque la compra nueva (Comprar) y el pago de
 * una reserva guardada (PagarReserva) muestran exactamente lo mismo: tenerlo duplicado
 * hacía que un arreglo entrara en una pantalla y no en la otra.
 */

import { useEffect, useRef } from "react";
import LogoPasarela from "./LogoPasarela";
import { IconCard, IconPhone, IconMenuApp, IconTeclado, IconCheckCircle } from "./Icons";

const LARGO_CODIGO = 6;

/**
 * Tarjeta o Yape. El método elegido se marca con un check además del color, porque
 * el color solo no le sirve a quien no lo distingue.
 */
export function MetodosPago({ metodo, onElegir, deshabilitado }) {
  const opciones = [
    { id: "tarjeta", logo: "izipay.png", alt: "Izipay", respaldo: <IconCard />, nombre: "Tarjeta", detalle: "Débito o crédito" },
    { id: "yape",    logo: "yape.png",   alt: "Yape",   respaldo: <IconPhone />, nombre: "Yape",   detalle: "Con tu celular" },
  ];

  return (
    <div className="metodos-pago" role="radiogroup" aria-label="Medio de pago">
      {opciones.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={metodo === o.id}
          className={`metodo ${metodo === o.id ? "activo" : ""}`}
          onClick={() => onElegir(o.id)}
          disabled={deshabilitado}
        >
          <span className="metodo-check" aria-hidden="true"><IconCheckCircle /></span>
          <LogoPasarela archivo={o.logo} alt={o.alt} respaldo={o.respaldo} />
          <span className="metodo-nombre">{o.nombre}</span>
          <span className="metodo-detalle">{o.detalle}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * El código de aprobación, una casilla por dígito.
 *
 * Con un solo campo de texto no se ve cuántos dígitos faltan y es fácil pegar algo
 * de más sin notarlo. Separado, el avance es visible y el pegado se reparte solo.
 * El valor sigue siendo un string de 6 dígitos: quien lo usa no cambia.
 */
function CodigoAprobacion({ valor, onCambiar, deshabilitado, id }) {
  const refs = useRef([]);
  const digitos = valor.padEnd(LARGO_CODIGO, " ").slice(0, LARGO_CODIGO).split("");

  const escribir = (indice, texto) => {
    const nuevos = texto.replace(/\D/g, "");
    if (!nuevos) return;

    // Se rellena a 6 ANTES de escribir. Sin esto, con el código a medias y el
    // cursor en una casilla más adelante, el array quedaba con huecos vacíos que
    // join() descarta: el dígito aterrizaba corrido a la izquierda ("12" + casilla
    // 5 daba "129" en vez de "12  9").
    const partido = valor.padEnd(LARGO_CODIGO, " ").slice(0, LARGO_CODIGO).split("");
    for (let i = 0; i < nuevos.length && indice + i < LARGO_CODIGO; i++)
      partido[indice + i] = nuevos[i];

    const armado = partido.join("").slice(0, LARGO_CODIGO).trimEnd();
    onCambiar(armado);
    enfocar(Math.min(indice + nuevos.length, LARGO_CODIGO - 1));
  };

  const enfocar = (i) => refs.current[i]?.focus();

  const teclas = (indice) => (e) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const partido = valor.padEnd(LARGO_CODIGO, " ").split("");
      // Con la casilla vacía, borrar retrocede: es lo que espera quien corrige.
      const objetivo = partido[indice].trim() ? indice : Math.max(indice - 1, 0);
      partido[objetivo] = " ";
      onCambiar(partido.join("").trimEnd());
      enfocar(objetivo);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault(); enfocar(Math.max(indice - 1, 0));
    } else if (e.key === "ArrowRight") {
      e.preventDefault(); enfocar(Math.min(indice + 1, LARGO_CODIGO - 1));
    }
  };

  return (
    <div className="codigo-casillas" role="group" aria-labelledby={id}>
      {digitos.map((d, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          className={`codigo-casilla ${d.trim() ? "llena" : ""}`}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={d.trim()}
          disabled={deshabilitado}
          aria-label={`Dígito ${i + 1} de ${LARGO_CODIGO}`}
          onChange={(e) => escribir(i, e.target.value)}
          onKeyDown={teclas(i)}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  );
}

/**
 * Los datos que pide Yape: celular y código de aprobación.
 *
 * Las instrucciones van arriba y no debajo del campo, porque el código hay que
 * generarlo en la app ANTES de escribir nada, y vence en un par de minutos.
 */
export function FormularioYape({ datos, onCambiar, deshabilitado, prueba }) {
  const primerCampo = useRef(null);

  // Al elegir Yape el cursor ya queda en el celular: un paso menos. Con
  // preventScroll porque enfocar arrastraba la página hasta el campo y el
  // pasajero perdía de vista el método que acababa de elegir.
  useEffect(() => { primerCampo.current?.focus({ preventScroll: true }); }, []);

  return (
    <div className="yape-form">
      <div className="yape-guia">
        <div className="yape-guia-texto">
          <p className="yape-guia-tit">Paga con tu <strong>código de aprobación</strong></p>
          <ol className="yape-pasos">
            <li>
              <span className="yape-paso-icono" aria-hidden="true"><IconMenuApp /></span>
              <span>Entra al menú de tu app <strong>Yape</strong> y elige <strong>Aprobar compra por internet</strong>.</span>
            </li>
            <li>
              <span className="yape-paso-icono" aria-hidden="true"><IconTeclado /></span>
              <span>Escribe acá los <strong>6 dígitos</strong> que te muestra. Vencen en pocos minutos.</span>
            </li>
          </ol>
        </div>
        <LogoPasarela archivo="yape.png" alt="Yape" respaldo={<IconPhone />} />
      </div>

      {prueba && (
        <div className="alert alert-warn" style={{ fontSize: 13 }}>
          Modo de prueba: usa el celular <strong>111111111</strong> con el código <strong>123456</strong>.
        </div>
      )}

      <label className="campo-yape">
        <span className="campo-yape-tit">Celular de tu Yape</span>
        <input
          ref={primerCampo}
          type="tel"
          inputMode="numeric"
          maxLength={9}
          placeholder="999 999 999"
          value={datos.phoneNumber}
          disabled={deshabilitado}
          onChange={(e) => onCambiar({ ...datos, phoneNumber: e.target.value.replace(/\D/g, "") })}
        />
      </label>

      <div className="campo-yape">
        <span className="campo-yape-tit" id="tit-codigo-yape">Código de aprobación</span>
        <CodigoAprobacion
          id="tit-codigo-yape"
          valor={datos.otp}
          deshabilitado={deshabilitado}
          onCambiar={(otp) => onCambiar({ ...datos, otp })}
        />
      </div>
    </div>
  );
}
