import { Link } from "react-router-dom";

// Logomark SVG propio (lancha fluvial + oleaje) + wordmark.
export function LogoMark({ size = 42 }) {
  return (
    <svg className="mark" width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="ray-badge" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0f3a78" />
          <stop offset="1" stopColor="#08234a" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="13" fill="url(#ray-badge)" />
      <circle cx="33" cy="15" r="4.4" fill="#e0a93b" opacity="0.9" />
      <path d="M9 26h30l-3.6 6.2c-.5.9-1.5 1.4-2.5 1.4H15.1c-1 0-2-.5-2.5-1.4L9 26z" fill="#ffffff" />
      <path d="M15 26v-4.2c0-.8.6-1.4 1.4-1.4h9.2l4 5.6H15z" fill="#e11d2a" />
      <path d="M8 38c2.2 0 2.2-1.6 4.4-1.6S14.6 38 16.8 38s2.2-1.6 4.4-1.6S23.4 38 25.6 38s2.2-1.6 4.4-1.6S32.2 38 34.4 38s2.2-1.6 4.4-1.6"
            stroke="#7fd0ff" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export default function Logo({ to = "/" }) {
  return (
    <Link className="logo" to={to} aria-label="Transportes Rayza — inicio">
      <LogoMark />
      <span className="txt">
        <b>Transportes <span>Rayza</span></b>
        <small>Amazonía · Perú</small>
      </span>
    </Link>
  );
}
