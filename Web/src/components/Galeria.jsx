import { useEffect, useState } from "react";
import { GALERIA } from "../galeria";

/**
 * Galería de fotos del servicio. Cada casillero intenta cargar su imagen; si aún no
 * existe, muestra un marcador con el nombre de archivo que se debe subir. Al hacer clic
 * en una foto real, se abre ampliada (lightbox).
 */
function Foto({ item, onAbrir }) {
  const [ok, setOk] = useState(true);
  const src = `/galeria/${item.archivo}`;

  if (!ok) {
    return (
      <div className="galeria-item galeria-vacio" title={`Sube ${item.archivo}`}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="6" width="18" height="14" rx="2" /><circle cx="12" cy="13" r="3.2" />
          <path d="M8 6l1.5-2h5L16 6" />
        </svg>
        <span>{item.titulo}</span>
        <small>{item.archivo}</small>
      </div>
    );
  }

  return (
    <button type="button" className="galeria-item" onClick={() => onAbrir(src, item.titulo)}>
      <img src={src} alt={item.titulo} loading="lazy" onError={() => setOk(false)} />
      <span className="galeria-cap">{item.titulo}</span>
    </button>
  );
}

export default function Galeria() {
  const [abierta, setAbierta] = useState(null);

  useEffect(() => {
    if (!abierta) return;
    const cerrar = (e) => e.key === "Escape" && setAbierta(null);
    document.addEventListener("keydown", cerrar);
    return () => document.removeEventListener("keydown", cerrar);
  }, [abierta]);

  return (
    <>
      <div className="galeria-grid">
        {GALERIA.map((it) => (
          <Foto key={it.archivo} item={it} onAbrir={(src, titulo) => setAbierta({ src, titulo })} />
        ))}
      </div>

      {abierta && (
        <div className="galeria-lightbox" onClick={() => setAbierta(null)} role="dialog" aria-modal="true">
          <button className="galeria-cerrar" aria-label="Cerrar" onClick={() => setAbierta(null)}>×</button>
          <img src={abierta.src} alt={abierta.titulo} onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}
