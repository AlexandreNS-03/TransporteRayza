/**
 * Set de íconos de línea, mismo trazo que el ícono de cuenta del Header
 * (stroke=currentColor, viewBox 24x24): reemplazan los emoji sueltos por algo
 * que se ve igual en cualquier sistema operativo y hereda el color del texto.
 */
const base = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", "aria-hidden": true };
const trazo = { stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };

export function IconSun(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="4.2" {...trazo} />
      <path d="M12 2.5v2.6M12 18.9v2.6M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2.5 12h2.6M18.9 12h2.6M4.2 19.8L6 18M18 6l1.8-1.8" {...trazo} />
    </svg>
  );
}

export function IconMoon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M20 14.5A8.5 8.5 0 019.5 4 8.5 8.5 0 1020 14.5z" {...trazo} />
    </svg>
  );
}

export function IconPackage(props) {
  return (
    <svg {...base} {...props}>
      <path d="M3.5 8.2L12 3.5l8.5 4.7v8.6L12 21.5l-8.5-4.7V8.2z" {...trazo} />
      <path d="M3.5 8.2L12 12.9l8.5-4.7M12 12.9v8.6" {...trazo} />
    </svg>
  );
}

export function IconCard(props) {
  return (
    <svg {...base} {...props}>
      <rect x="2.5" y="5.5" width="19" height="13" rx="2" {...trazo} />
      <path d="M2.5 9.8h19M6 14.5h4" {...trazo} />
    </svg>
  );
}

export function IconPhone(props) {
  return (
    <svg {...base} {...props}>
      <path d="M6.6 3.5h2.3l1.3 4-2 1.4a11.3 11.3 0 005.9 5.9l1.4-2 4 1.3v2.3c0 1.1-1 2-2.1 1.8A16.6 16.6 0 014.8 5.6c-.2-1.1.7-2.1 1.8-2.1z" {...trazo} />
    </svg>
  );
}

export function IconBoat(props) {
  return (
    <svg {...base} {...props}>
      <path d="M3 14.5h18l-2.2 5H5.2l-2.2-5z" {...trazo} />
      <path d="M6.5 14.5V6.8h9l3.2 7.7M12 6.8V2.8M12 2.8H9M12 4.6h4" {...trazo} />
    </svg>
  );
}

export function IconStar(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.3l2.6 5.5 6 .7-4.4 4.2 1.1 6-5.3-3-5.3 3 1.1-6-4.4-4.2 6-.7L12 3.3z" {...trazo} />
    </svg>
  );
}

export function IconSeat(props) {
  return (
    <svg {...base} {...props}>
      <path d="M6.5 4v9a2 2 0 002 2h7a2 2 0 002-2v-3" {...trazo} />
      <path d="M6.5 13H5a2 2 0 00-2 2v3.5h16.5M9 20.5v-2.5M16 20.5v-2.5" {...trazo} />
    </svg>
  );
}

export function IconHotel(props) {
  return (
    <svg {...base} {...props}>
      <path d="M3.5 20.5V9l8.5-5.5L20.5 9v11.5" {...trazo} />
      <path d="M3.5 20.5h17M9 20.5v-6h6v6" {...trazo} />
    </svg>
  );
}

export function IconTicket(props) {
  return (
    <svg {...base} {...props}>
      <path d="M3.5 9.5a2 2 0 000 5v2a1.5 1.5 0 001.5 1.5h14a1.5 1.5 0 001.5-1.5v-2a2 2 0 000-5v-2A1.5 1.5 0 0019 6H5a1.5 1.5 0 00-1.5 1.5v2z" {...trazo} />
      <path d="M9.5 6v12" strokeDasharray="2.4 2.4" {...trazo} />
    </svg>
  );
}

export function IconLock(props) {
  return (
    <svg {...base} {...props}>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" {...trazo} />
      <path d="M7.5 10.5V7a4.5 4.5 0 019 0v3.5" {...trazo} />
    </svg>
  );
}

export function IconCheckCircle(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" {...trazo} />
      <path d="M8 12.3l2.6 2.6L16.3 9" {...trazo} />
    </svg>
  );
}

export function IconMail(props) {
  return (
    <svg {...base} {...props}>
      <rect x="2.8" y="5.5" width="18.4" height="13" rx="2" {...trazo} />
      <path d="M3.5 6.5l8.5 6.5 8.5-6.5" {...trazo} />
    </svg>
  );
}

export function IconClock(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" {...trazo} />
      <path d="M12 7v5l3.5 2" {...trazo} />
    </svg>
  );
}

export function IconMapPin(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 21.5S5 14.8 5 9.8a7 7 0 1114 0c0 5-7 11.7-7 11.7z" {...trazo} />
      <circle cx="12" cy="9.8" r="2.4" {...trazo} />
    </svg>
  );
}

export function IconConfetti(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 20L14.5 9.5" {...trazo} />
      <path d="M13 4.5l1.2 1.2M17 3l.9 2.4M20.5 7l-2.4.9M20.5 12l-2.4-.9M4.5 15.5l2.4.9" {...trazo} />
    </svg>
  );
}

export function IconMusic(props) {
  return (
    <svg {...base} {...props}>
      <path d="M9 17.5a2.5 2.5 0 11-2.5-2.5A2.5 2.5 0 019 17.5zM19 15.5A2.5 2.5 0 1116.5 13a2.5 2.5 0 012.5 2.5z" {...trazo} />
      <path d="M9 17.5V5.8l10-2v11.7" {...trazo} />
    </svg>
  );
}

export function IconArrowUp(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 19V5M6 11l6-6 6 6" {...trazo} />
    </svg>
  );
}

export function IconArrowDown(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 5v14M6 13l6 6 6-6" {...trazo} />
    </svg>
  );
}

export function IconShare(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="6" cy="12" r="2.6" {...trazo} />
      <circle cx="18" cy="6" r="2.6" {...trazo} />
      <circle cx="18" cy="18" r="2.6" {...trazo} />
      <path d="M8.3 10.7l7.3-3.4M8.3 13.3l7.3 3.4" {...trazo} />
    </svg>
  );
}

/** Menú de la app (las tres líneas), para el paso "entra al menú de tu Yape". */
export function IconMenuApp(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 7h16M4 12h16M4 17h10" {...trazo} />
    </svg>
  );
}

/** Teclado numérico: el paso de escribir el código de aprobación. */
export function IconTeclado(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2.4" {...trazo} />
      <path d="M7.5 9.5h.01M12 9.5h.01M16.5 9.5h.01M7.5 14h.01M16.5 14h.01M11 14h2" {...trazo} />
    </svg>
  );
}

/** Libro abierto: el Libro de Reclamaciones en el pie de página. */
export function IconLibro(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 5.5A1.5 1.5 0 015.5 4H10a2 2 0 012 2v13a2 2 0 00-2-2H5.5A1.5 1.5 0 014 15.5v-10z" {...trazo} />
      <path d="M20 5.5A1.5 1.5 0 0018.5 4H14a2 2 0 00-2 2v13a2 2 0 012-2h4.5a1.5 1.5 0 001.5-1.5v-10z" {...trazo} />
    </svg>
  );
}

export function IconFood(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4.5 11.5a7.5 5.5 0 1115 0z" {...trazo} />
      <path d="M3 17.5h18M12 3v3" {...trazo} />
    </svg>
  );
}
