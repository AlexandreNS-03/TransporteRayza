import { useEffect, useRef, useState } from "react";

// Anima el contenido cuando entra en pantalla (scroll reveal).
export default function Reveal({ children, delay = 0, as: Tag = "div", className = "", ...rest }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const d = delay ? ` d${delay}` : "";
  return <Tag ref={ref} className={`reveal${visible ? " in" : ""}${d} ${className}`} {...rest}>{children}</Tag>;
}
