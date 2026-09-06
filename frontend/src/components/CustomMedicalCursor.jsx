import { useEffect, useRef, useState } from "react";

export default function CustomMedicalCursor({ active, reducedMotion = false }) {
  const [position, setPosition] = useState({ x: -200, y: -200 });
  const [hoveringLogo, setHoveringLogo] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [pulse, setPulse] = useState({ x: -200, y: -200, active: false });

  const pointerRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef(null);

  useEffect(() => {
    if (!active) {
      setIsVisible(false);
      return undefined;
    }

    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;

    if (coarsePointer) {
      setIsVisible(false);
      return undefined;
    }

    const updatePosition = () => {
      setPosition({ ...pointerRef.current });
      setIsVisible(true);
      rafRef.current = null;
    };

    const handlePointerMove = (event) => {
      pointerRef.current = { x: event.clientX, y: event.clientY };
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(updatePosition);
      }
    };

    const handlePointerDown = (event) => {
      setPulse({ x: event.clientX, y: event.clientY, active: true });
      window.setTimeout(() => {
        setPulse((current) => ({ ...current, active: false }));
      }, 180);
    };

    const handlePointerLeave = () => setIsVisible(false);

    const logoNode = document.querySelector(".landing-logo-button");
    const handleLogoEnter = () => setHoveringLogo(true);
    const handleLogoLeave = () => setHoveringLogo(false);

    if (logoNode) {
      logoNode.addEventListener("mouseenter", handleLogoEnter);
      logoNode.addEventListener("mouseleave", handleLogoLeave);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      if (logoNode) {
        logoNode.removeEventListener("mouseenter", handleLogoEnter);
        logoNode.removeEventListener("mouseleave", handleLogoLeave);
      }
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointerleave", handlePointerLeave);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [active, reducedMotion]);

  if (!active) return null;

  const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;
  if (isTouchDevice) return null;

  return (
    <div
      className={`custom-medical-cursor ${hoveringLogo ? "cursor-hover-logo" : ""} ${isVisible ? "visible" : ""}`}
      style={{
        transform: `translate3d(${position.x + 4}px, ${position.y + 4}px, 0) scale(${hoveringLogo ? 1.18 : 1})`
      }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 120 120" className="cursor-injector" role="presentation">
        <defs>
          <linearGradient id="injectorGradient" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#ffd6dd" />
            <stop offset="22%" stopColor="#ff8ca3" />
            <stop offset="60%" stopColor="#ff365d" />
            <stop offset="100%" stopColor="#8b001b" />
          </linearGradient>
        </defs>

        <g transform="rotate(-30 60 60)">
          <path d="M32 72 L62 46 L86 59 L59 94 L32 84 Z" fill="rgba(255,255,255,0.96)" stroke="rgba(255,255,255,0.22)" strokeWidth="2" />
          <path d="M35 72 L62 52 L79 60 L58 88 L35 82 Z" fill="url(#injectorGradient)" opacity="0.95" />
          <rect x="58" y="12" width="31" height="22" rx="7" fill="rgba(255,255,255,0.96)" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
          <rect x="62" y="4" width="12" height="16" rx="4" fill="rgba(255,255,255,0.9)" />
          <rect x="69" y="26" width="9" height="17" rx="4" fill="#ff425f" opacity="0.88" />
          <path d="M26 78 L10 95" stroke="#f8fafc" strokeWidth="5" strokeLinecap="round" />
          <path d="M10 95 L5 108" stroke="#f8fafc" strokeWidth="4" strokeLinecap="round" />
          <path d="M5 108 L13 112" stroke="#f8fafc" strokeWidth="4" strokeLinecap="round" />
          <path d="M85 60 L103 42" stroke="#ff9cad" strokeWidth="6" strokeLinecap="round" opacity="0.9" />
          <circle cx="106" cy="38" r="8" fill="#ff2a55" opacity="0.95" />
        </g>
      </svg>

      <span className="cursor-glow" aria-hidden="true" />

      {pulse.active && (
        <span
          className="cursor-click-ripple"
          style={{
            left: pulse.x - 30 + "px",
            top: pulse.y - 30 + "px"
          }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
