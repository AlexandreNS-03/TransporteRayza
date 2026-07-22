import { useState } from "react";

// Barra de anuncios superior, descartable (estilo aerolínea).
export default function AnnouncementBar() {
  const [visible, setVisible] = useState(
    () => sessionStorage.getItem("rayza_announce_off") !== "1"
  );
  if (!visible) return null;

  const cerrar = () => {
    sessionStorage.setItem("rayza_announce_off", "1");
    setVisible(false);
  };

  return (
    <div className="announce">
      <div className="wrap">
        <span className="dot" />
        <p><b>Compra 100% en línea:</b> elige tu asiento y paga seguro con tarjeta o Yape. Recibe tu boleto con QR al instante.</p>
        <button onClick={cerrar} aria-label="Cerrar aviso">×</button>
      </div>
    </div>
  );
}
